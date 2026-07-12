import * as fs from "fs";
import * as path from "path";
import {
  SignedDataVerifier,
  AppStoreServerAPIClient,
  Environment,
} from "@apple/app-store-server-library";

// Apple's public root CA certificates (G3 chain). These are public certificates,
// not secrets, but must be downloaded manually from
// https://www.apple.com/certificateauthority/ and placed as .cer files in this
// folder — see functions/certs/README.md.
const CERTS_DIR = path.join(__dirname, "..", "certs");

function loadRootCertificates(): Buffer[] {
  if (!fs.existsSync(CERTS_DIR)) return [];
  return fs
    .readdirSync(CERTS_DIR)
    .filter((f) => f.endsWith(".cer"))
    .map((f) => fs.readFileSync(path.join(CERTS_DIR, f)));
}

function getVerifier(environment: Environment): SignedDataVerifier {
  const bundleId = process.env.APPLE_BUNDLE_ID ?? "com.doongdallong.birthcode02";
  return new SignedDataVerifier(loadRootCertificates(), true, environment, bundleId);
}

function getApiClient(environment: Environment): AppStoreServerAPIClient | null {
  const issuerId = process.env.APPLE_ISSUER_ID;
  const keyId = process.env.APPLE_KEY_ID;
  const privateKey = process.env.APPLE_PRIVATE_KEY;
  const bundleId = process.env.APPLE_BUNDLE_ID ?? "com.doongdallong.birthcode02";
  if (!issuerId || !keyId || !privateKey) {
    console.warn("Apple Server API credentials not configured — skipping live re-check");
    return null;
  }
  // Private key is stored in env with literal "\n" escapes; restore real newlines.
  const signingKey = privateKey.replace(/\\n/g, "\n");
  return new AppStoreServerAPIClient(signingKey, keyId, issuerId, bundleId, environment);
}

/**
 * Verifies a StoreKit 2 signed transaction (the JWS string the iOS client
 * sends in place of Android's Play purchaseToken). Plays the same role as
 * verifyPurchase() for Google Play in functions/src/index.ts.
 *
 * Returns the transactionId to use as the Firestore replay-guard key when
 * valid, or null when the purchase could not be verified.
 */
export async function verifyApplePurchase(
  signedTransaction: string,
  expectedProductId: string
): Promise<{ valid: boolean; transactionId?: string }> {
  try {
    // 1. Decode + verify signature offline first (fast, tells us which
    // environment — Sandbox vs Production — this transaction belongs to).
    const sandboxPayload = await getVerifier(Environment.SANDBOX)
      .verifyAndDecodeTransaction(signedTransaction)
      .catch(() => null);
    const productionPayload = sandboxPayload
      ? null
      : await getVerifier(Environment.PRODUCTION).verifyAndDecodeTransaction(signedTransaction);
    const payload = sandboxPayload ?? productionPayload;

    if (!payload || !payload.transactionId) {
      console.error("Apple transaction: signature verification failed");
      return { valid: false };
    }
    if (payload.productId !== expectedProductId) {
      console.error(
        `Apple transaction productId mismatch: expected ${expectedProductId}, got ${payload.productId}`
      );
      return { valid: false };
    }
    if (payload.revocationDate) {
      console.error("Apple transaction was revoked/refunded:", payload.transactionId);
      return { valid: false };
    }

    // 2. Optional live re-check against Apple's servers for the authoritative,
    // up-to-the-minute state (catches refunds issued after the client signed
    // the transaction). Skipped gracefully if Apple API credentials aren't
    // configured yet.
    const environment = sandboxPayload ? Environment.SANDBOX : Environment.PRODUCTION;
    const apiClient = getApiClient(environment);
    if (apiClient) {
      const transactionInfo = await apiClient.getTransactionInfo(payload.transactionId);
      const verified = await getVerifier(environment).verifyAndDecodeTransaction(
        transactionInfo.signedTransactionInfo!
      );
      if (verified.revocationDate) {
        console.error("Apple transaction revoked per live API check:", payload.transactionId);
        return { valid: false };
      }
    }

    console.log("Apple purchase verified successfully:", payload.transactionId);
    return { valid: true, transactionId: payload.transactionId };
  } catch (error) {
    console.error("Apple purchase verification error:", error);
    return { valid: false };
  }
}
