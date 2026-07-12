# iOS 앱 (BirthCode)

Xcode 없이(맥 없이) [Codemagic](https://codemagic.io)에서 빌드하도록 구성되어 있습니다.
`ios/*.xcodeproj`는 저장소에 커밋하지 않고, 매 빌드마다 `project.yml`로부터
[XcodeGen](https://github.com/yonaskolb/XcodeGen)이 새로 생성합니다.

## 구조
- `project.yml` — XcodeGen 스펙 (타겟, 의존성, Info.plist 설정)
- `Sources/` — Swift 소스 (AppDelegate, SceneDelegate, ViewController, StoreManager)
- `Resources/` — Localizable.strings, GoogleService-Info.plist, Info.plist(자동 생성)
- `Resources/Web/` — **커밋하지 않음.** 빌드 시 `app/src/main/assets/*`(안드로이드 웹 자산)를 복사해서 채움. 웹 UI의 원본은 항상 안드로이드 쪽 `assets/`.

## 시작 전 필요한 것 (Codemagic 빌드 전 준비)
1. **App Store Connect에 5개 소모성 인앱 구매 상품** 등록: `basic`, `saju_haiku`, `saju_sonnet`, `saju_opus`, `saju_fable`
2. **Firebase 콘솔에 iOS 앱 추가** (프로젝트 `birthcode02`, 번들 ID `com.doongdallong.birthcode02`) → 다운로드한 `GoogleService-Info.plist`로 `Resources/GoogleService-Info.plist`의 placeholder를 교체. App Check에서 **App Attest** provider 활성화.
3. **App Store Connect API 키** 생성 후 Codemagic 팀 설정(웹 UI)에 `birthcode02_asc_key`라는 이름으로 등록 (`codemagic.yaml`의 `integrations.app_store_connect` 값과 일치해야 함).
4. **Apple 서버 API 키**(별도 In-App Purchase 용 `.p8`, Key ID, Issuer ID) → Firebase Functions 환경변수 `APPLE_ISSUER_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`, `APPLE_BUNDLE_ID`로 등록.
5. **Apple 루트 인증서**를 `functions/certs/`에 배치 (`functions/certs/README.md` 참고) — 서버가 iOS 결제 서명을 검증하는 데 필요.
6. Codemagic에 이 GitHub 저장소(`doongdallong/BirthCodeMansereok`) 연결.

## 로컬에서 확인하고 싶다면 (선택, macOS 필요)
```
brew install xcodegen
cp -R ../app/src/main/assets/* Resources/Web/
xcodegen generate
open BirthCode.xcodeproj
```
