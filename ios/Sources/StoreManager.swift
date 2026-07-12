import Foundation
import StoreKit

/// Mirrors MainActivity.kt's BillingClient integration (app/src/main/java/.../MainActivity.kt)
/// using StoreKit 2. Product IDs must match the Android Play Console SKUs exactly:
/// basic, saju_haiku, saju_sonnet, saju_opus, saju_fable.
@MainActor
final class StoreManager {

    static let productIDs: [String] = ["basic", "saju_haiku", "saju_sonnet", "saju_opus", "saju_fable"]

    private(set) var productsByID: [String: Product] = [:]
    private var updateListenerTask: Task<Void, Error>?

    /// Called once a purchase is verified, with the signed transaction (JWS) string
    /// that plays the same role as Android's Play Store purchaseToken.
    var onPurchaseSuccess: ((String) -> Void)?
    var onPricesUpdated: (([String: String]) -> Void)?

    enum StoreError: Error {
        case failedVerification
        case productNotFound
    }

    init() {
        updateListenerTask = listenForTransactionUpdates()
    }

    deinit {
        updateListenerTask?.cancel()
    }

    func start() async {
        await loadProducts()
    }

    func loadProducts() async {
        do {
            let products = try await Product.products(for: Self.productIDs)
            for product in products {
                productsByID[product.id] = product
            }
            var prices: [String: String] = [:]
            for (id, product) in productsByID {
                prices[id] = product.displayPrice
            }
            onPricesUpdated?(prices)
        } catch {
            print("StoreManager: failed to load products: \(error)")
        }
    }

    /// Returns the signed transaction JWS string on success (sent to the backend
    /// exactly like Android sends purchase.purchaseToken).
    func purchase(productId: String) async throws -> String {
        guard let product = productsByID[productId] else {
            await loadProducts()
            guard let retried = productsByID[productId] else {
                throw StoreError.productNotFound
            }
            return try await purchase(product: retried)
        }
        return try await purchase(product: product)
    }

    private func purchase(product: Product) async throws -> String {
        let result = try await product.purchase()

        switch result {
        case .success(let verification):
            let transaction = try checkVerified(verification)
            // Consumable product: finish immediately, mirrors Android's consumeAsync.
            await transaction.finish()
            return verification.jwsRepresentation
        case .userCancelled:
            throw StoreKitError.userCancelled
        case .pending:
            throw StoreKitError.notAvailableInStorefront
        @unknown default:
            throw StoreError.failedVerification
        }
    }

    private func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .unverified:
            throw StoreError.failedVerification
        case .verified(let safe):
            return safe
        }
    }

    /// Mirrors Android's queryPurchases() — catches transactions completed
    /// outside the direct purchase() call (e.g. interrupted flows).
    private func listenForTransactionUpdates() -> Task<Void, Error> {
        Task.detached { [weak self] in
            for await update in Transaction.updates {
                guard let self else { continue }
                do {
                    let transaction = try await self.checkVerified(update)
                    await transaction.finish()
                    await MainActor.run {
                        self.onPurchaseSuccess?(update.jwsRepresentation)
                    }
                } catch {
                    print("StoreManager: transaction update verification failed: \(error)")
                }
            }
        }
    }
}
