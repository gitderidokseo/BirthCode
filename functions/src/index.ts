import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { OpenAI } from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { google } from "googleapis";
import { verifyApplePurchase } from "./appleVerification";

admin.initializeApp();
const db = admin.firestore();

// Google Play Developer API Auth
const googleAuth = new google.auth.GoogleAuth({
  scopes: ["https://www.googleapis.com/auth/androidpublisher"],
});
const androidPublisher = google.androidpublisher({
  version: "v3",
  auth: googleAuth,
});

interface SajuRequest {
  birthDate: string;
  aiModel: string;
  language: string;
  purchaseToken: string;
  // Absent on older Android clients (predates the iOS port) — treated as "android".
  platform?: "ios" | "android";
}

interface SajuResponse {
  overall: string;
  parent: string;
  marriage: string;
  child: string;
  money: string;
  laterLife: string;
}

// ... SAJU_PROMPT_TEMPLATE and SYSTEM_PROMPT remain the same ...
// (Omitting them for brevity in replacement, but I will include them in the actual call)
const SAJU_PROMPT_TEMPLATE = (birthDate: string, language: string) => `
당신은 30년 경력의 정통 사주명리학 전문가입니다.
자평명리학(子平命理學)의 원리에 따라 체계적으로 사주를 분석합니다.

## 입력 정보
생년월일시(양력): ${birthDate}

※ 위 날짜는 양력(그레고리력)입니다. 사주 분석 시 반드시 절기를 기준으로 년주와 월주를 세워야 합니다.
- 년주: 입춘(2월 4일경) 이전 출생이면 전년도 년주 적용
- 월주: 각 월의 절입일(節入日) 기준으로 판단 (예: 입춘~경칩은 인월)

## 분석 절차 (반드시 순서대로 수행)

### 1단계: 사주 원국(四柱原局) 도출
만세력을 기준으로 다음을 정확히 계산하세요:
- 년주(年柱): 천간 + 지지 (절기 기준으로 입춘 이후부터 새해)
- 월주(月柱): 천간 + 지지 (절기 기준, 예: 입춘~경칩은 인월)
- 일주(日柱): 천간 + 지지 (60갑자 순환)
- 시주(時柱): 천간 + 지지 (일간 기준 시간 계산)

### 2단계: 오행(五行) 분석
- 각 천간과 지지의 오행 배속 (목/화/토/금/수)
- 지장간(支藏干) 분석: 각 지지 속 여기·중기·정기 확인
- 오행 분포표 작성: 목(_개), 화(_개), 토(_개), 금(_개), 수(_개)
- 과다/부족 오행 판별

### 3단계: 일간(日干) 분석 - 가장 중요
- 일간 = 나 자신 (사주 해석의 기준점)
- 월지(月支)를 기준으로 일간의 득령(得令) 여부 판단
- 신강(身强) / 신약(身弱) 판별
  - 신강: 일간과 같은 오행 또는 생해주는 오행이 많음
  - 신약: 일간을 극하거나 설기하는 오행이 많음

### 4단계: 십신(十神/十星) 배속
일간을 기준으로 각 글자에 십신 부여:
- 비견(比肩): 일간과 같은 오행, 같은 음양
- 겁재(劫財): 일간과 같은 오행, 다른 음양
- 식신(食神): 일간이 생하는 오행, 같은 음양
- 상관(傷官): 일간이 생하는 오행, 다른 음양
- 편재(偏財): 일간이 극하는 오행, 같은 음양
- 정재(正財): 일간이 극하는 오행, 다른 음양
- 편관(偏官/칠살): 일간을 극하는 오행, 같은 음양
- 정관(正官): 일간을 극하는 오행, 다른 음양
- 편인(偏印): 일간을 생하는 오행, 같은 음양
- 정인(正印): 일간을 생하는 오행, 다른 음양

### 5단계: 용신(用神)과 기신(忌神) 선정
사주 균형을 위해 필요한 오행 결정:
- 억부법(抑扶法): 신강하면 억제, 신약하면 부조
- 조후법(調후法): 계절에 따른 한난조습 조절
- 통관법(通關法): 상극 오행 사이 소통 역할
- 용신 = 사주에 가장 필요한 오행
- 기신 = 사주에 해로운 오행

### 6단계: 합충형파(合沖刑破) 분석
- 천간합: 갑기합토, 을경합금, 병신합수, 정임합목, 무계합화
- 지지합: 육합, 삼합, 방합
- 지지충: 자오충, 축미충, 인신충, 묘유충, 진술충, 사해충
- 형(刑), 파(破), 해(害) 관계 확인

### 7단계: 육친(六親) 궁위 분석
각 기둥이 나타내는 육친과 시기:
- 년주: 조상궁, 초년운(1-15세), 사회적 환경
- 월주: 부모궁, 청년운(16-30세), 형제·사회활동
- 일주: 본인궁(천간=나, 지지=배우자), 중년운(31-45세)
- 시주: 자녀궁, 말년운(46세 이후), 노후·결과

### 8단계: 격국(格局) 판단 (월지 정기 기준)
정격: 정관격, 편관격, 정인격, 편인격, 정재격, 편재격, 식신격, 상관격
특수격: 종격(종아격, 종살격 등), 화격(化格) 여부

## 최종 운세 해석 및 언어 설정
위 분석을 바탕으로 다음 6가지 운세를 해석하세요.
언어 설정: 모든 답변은 반드시 "${language}" 언어로 작성해야 합니다.

각 운세은 반드시 사주 원국의 구체적 근거(어떤 글자, 어떤 십신, 어떤 오행 관계)를 명시하여 설명하세요.

1. **전체운**: 일간의 특성, 격국, 용신을 바탕으로 종합적 인생 흐름과 성격, 적성 분석
2. **부모운**: 년주·월주의 인성(정인/편인) 상태, 부모궁 합충 여부로 부모 인연 분석
3. **결혼운**: 일지(배우자궁)와 재성(남)/관성(여)의 상태, 합충 관계로 배우자 인연 분석
4. **자녀운**: 시주와 식상(식신/상관)의 상태로 자녀 복과 인연 분석
5. **금전운**: 재성(정재/편재)의 강약과 위치, 식상생재 여부로 재물운 분석
6. **말년운**: 시주 상태와 대운 후반부 흐름으로 노년 건강·재물·가족 관계 분석

## 출력 형식
반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트 없이 JSON만 출력하세요.
각 항목은 사주 근거를 포함하여 4-6문장으로 구체적으로 작성하세요.
반드시 "${language}" 언어로 작성해야 함을 잊지 마세요.

{
  "overall": "전체운 해석...",
  "parent": "부모운 해석...",
  "marriage": "결혼운 해석...",
  "child": "자녀운 해석...",
  "money": "금전운 해석...",
  "laterLife": "말년운 해석..."
}
`;

const SYSTEM_PROMPT = (language: string) => `당신은 30년 경력의 정통 사주명리학 전문가입니다.
모든 답변은 반드시 "${language}" 언어로 작성해야 합니다.

핵심 원칙:
1. 만세력 기준으로 사주 원국(년주, 월주, 일주, 시주)을 정확히 계산해야 합니다.
2. 일간(日干)을 기준으로 십신을 배속하고, 신강/신약을 판단합니다.
3. 모든 운세 해석은 반드시 사주 원국의 구체적 근거(글자, 십신, 오행, 합충)를 명시해야 합니다.
4. 추상적이고 일반적인 운세가 아닌, 해당 사주에만 적용되는 구체적 해석을 제공합니다.

천간: 갑(甲/목), 을(乙/목), 병(丙/화), 정(丁/화), 무(戊/토), 기(己/토), 경(庚/금), 신(辛/금), 임(壬/수), 계(癸/수)
지지: 자(子/수), 축(丑/토), 인(寅/목), 묘(묘/목), 진(辰/토), 사(巳/화), 오(午/화), 미(未/토), 신(申/금), 유(酉/금), 술(戌/토), 해(亥/수)

JSON 형식으로만 응답하세요.`;

// ... analyze functions remain largely the same ...
async function analyzeWithChatGPT(birthDate: string, language: string): Promise<SajuResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OpenAI API key not configured");
  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT(language) },
      { role: "user", content: SAJU_PROMPT_TEMPLATE(birthDate, language) },
    ],
    temperature: 0.5,
    response_format: { type: "json_object" },
  });
  const content = completion.choices[0].message.content;
  if (!content) throw new Error("Empty response from ChatGPT");
  return JSON.parse(content);
}

interface ModelTierConfig {
  claudeModel: string;
  productId: string; // Play Console에 등록된 인앱 상품 ID (등급별로 가격이 다름)
}

// "Claude"는 구버전 앱(스토어 배포본)이 여전히 보내는 값이라 하위 호환을 위해 "basic" 상품과 함께 남겨둠
const MODEL_TIER_CONFIG: Record<string, ModelTierConfig> = {
  Claude: { claudeModel: "claude-opus-4-8", productId: "basic" },
  Haiku: { claudeModel: "claude-haiku-4-5-20251001", productId: "saju_haiku" },
  Sonnet: { claudeModel: "claude-sonnet-5", productId: "saju_sonnet" },
  Opus: { claudeModel: "claude-opus-4-8", productId: "saju_opus" },
  Fable: { claudeModel: "claude-fable-5", productId: "saju_fable" },
};

async function analyzeWithClaude(birthDate: string, language: string, model: string): Promise<SajuResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Anthropic API key not configured");
  const anthropic = new Anthropic({ apiKey });
  const message = await anthropic.messages.create({
    model,
    max_tokens: 4000,
    system: SYSTEM_PROMPT(language),
    messages: [{ role: "user", content: SAJU_PROMPT_TEMPLATE(birthDate, language) }],
  });
  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type from Claude");
  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in Claude response");
  return JSON.parse(jsonMatch[0]);
}

async function analyzeWithGemini(birthDate: string, language: string): Promise<SajuResponse> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error("Google AI API key not configured");
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
  const fullPrompt = `${SYSTEM_PROMPT(language)}\n\n${SAJU_PROMPT_TEMPLATE(birthDate, language)}`;
  const result = await model.generateContent(fullPrompt);
  const response = result.response;
  const text = response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in Gemini response");
  return JSON.parse(jsonMatch[0]);
}

async function verifyPurchase(purchaseToken: string, productId: string): Promise<boolean> {
  try {
    const res = await androidPublisher.purchases.products.get({
      packageName: "com.doongdallong.birthcode02",
      productId,
      token: purchaseToken,
    });
    // purchaseState: 0 (Purchased), 1 (Cancelled), 2 (Pending)
    console.log("Google Play API Response:", JSON.stringify(res.data));
    return res.data.purchaseState === 0;
  } catch (error) {
    console.error("Google Play verification error details:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }
    return false;
  }
}

export const analyzeSaju = onRequest(
  {
    cors: true,
    timeoutSeconds: 120,
    memory: "512MiB",
  },
  async (request, response) => {
    if (request.method !== "POST") {
      response.status(405).send("Method Not Allowed");
      return;
    }

    try {
      // 0. App Check 토큰 검증 (테스트를 위해 선택 사항으로 완화)
      const appCheckToken = request.header("X-Firebase-AppCheck");
      if (appCheckToken) {
        try {
          await admin.appCheck().verifyToken(appCheckToken);
          console.log("App Check Token verified successfully");
        } catch (err) {
          console.error("Invalid App Check Token:", err);
          response.status(401).json({ error: "Unauthorized: Invalid App Check Token" });
          return;
        }
      } else {
        console.warn("App Check Token missing - Continuing anyway (Check Play Integrity setup)");
      }

      // 1. Firebase Auth ID Token 검증 (필수)
      const authHeader = request.headers.authorization;
      console.log("Auth Header present:", !!authHeader);
      if (!authHeader?.startsWith("Bearer ")) {
        console.warn("Missing or invalid Auth Token header");
        response.status(401).json({ error: "Unauthorized: Missing Auth Token" });
        return;
      }
      const idToken = authHeader.split("Bearer ")[1];
      let decodedToken;
      try {
        decodedToken = await admin.auth().verifyIdToken(idToken);
      } catch (e) {
        console.error("Invalid Auth Token:", e);
        response.status(401).json({ error: "Unauthorized: Invalid Auth Token" });
        return;
      }

      const { birthDate, aiModel, language, purchaseToken, platform }: SajuRequest = request.body;

      if (!birthDate || !aiModel || !language || !purchaseToken) {
        response.status(400).json({ error: "Missing required fields" });
        return;
      }

      const tierConfig = MODEL_TIER_CONFIG[aiModel];
      if (!tierConfig) {
        response.status(400).json({ error: `Unsupported AI model: ${aiModel}` });
        return;
      }

      const isIOS = platform === "ios";

      // 3. 실제 결제 여부 검증 (필수) — 안드로이드는 Google Play API, iOS는 Apple 서명 트랜잭션 검증.
      // productId를 aiModel 등급으로 강제 지정하므로, 저가 상품 토큰으로 고가 등급을 요청하면 검증에서 실패한다.
      // replay 방지용 Firestore 키: 안드로이드는 purchaseToken 그대로, iOS는 검증 과정에서 얻는 transactionId.
      let replayGuardKey = purchaseToken;
      let isValidPurchase: boolean;
      if (isIOS) {
        const result = await verifyApplePurchase(purchaseToken, tierConfig.productId);
        isValidPurchase = result.valid;
        if (result.transactionId) replayGuardKey = result.transactionId;
      } else {
        isValidPurchase = await verifyPurchase(purchaseToken, tierConfig.productId);
      }

      // 2. 토큰 중복 사용(Replay Attack) 방지 (Firestore 연결 실패 시에도 진행되도록 예외 처리)
      const tokenRef = db.collection("used_purchase_tokens").doc(replayGuardKey);
      try {
        const tokenDoc = await tokenRef.get();
        if (tokenDoc.exists) {
          console.warn("Purchase token already used:", replayGuardKey);
          response.status(403).json({ error: "Purchase token already used" });
          return;
        }
      } catch (err) {
        console.error("Firestore Error (Check if API is enabled):", err);
      }

      if (!isValidPurchase) {
        console.warn("Invalid purchase verification for token:", replayGuardKey);
        response.status(402).json({ error: "Invalid or unauthorized purchase" });
        return;
      }
      console.log("Purchase verified successfully");

      // 검증 통과 시 토큰을 '사용됨'으로 기록 (실패해도 분석 진행)
      try {
        await tokenRef.set({
          uid: decodedToken.uid,
          usedAt: admin.firestore.FieldValue.serverTimestamp(),
          birthDate: birthDate,
          platform: isIOS ? "ios" : "android",
        });
      } catch (err) {
        console.error("Firestore Save Error:", err);
      }

      const result = await analyzeWithClaude(birthDate, language, tierConfig.claudeModel);

      response.status(200).json(result);
    } catch (error) {
      console.error("Error analyzing saju:", error);
      response.status(500).json({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);
