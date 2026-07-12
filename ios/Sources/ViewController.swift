import UIKit
import WebKit
import FirebaseAuth
import FirebaseAppCheck

/// Mirrors MainActivity.kt: a single WKWebView loading the shared web assets
/// (Resources/Web, synced at build time from app/src/main/assets), with a JS
/// bridge that polyfills `window.Android` so script.js needs no changes.
final class ViewController: UIViewController, WKScriptMessageHandler, WKNavigationDelegate {

    private var webView: WKWebView!
    private let storeManager = StoreManager()

    private static let bridgePolyfill = """
    window.Android = {
        getPlatform: function() { return 'ios'; },
        startPayment: function(productId) {
            window.webkit.messageHandlers.bridge.postMessage({ action: 'startPayment', productId: productId });
        },
        getModelPrices: function(callbackName) {
            window.webkit.messageHandlers.bridge.postMessage({ action: 'getModelPrices', callback: callbackName });
        },
        getAppCheckToken: function(callbackName) {
            window.webkit.messageHandlers.bridge.postMessage({ action: 'getAppCheckToken', callback: callbackName });
        },
        getAuthToken: function(callbackName) {
            window.webkit.messageHandlers.bridge.postMessage({ action: 'getAuthToken', callback: callbackName });
        }
    };
    """

    override func loadView() {
        let userContentController = WKUserContentController()
        userContentController.add(self, name: "bridge")
        let userScript = WKUserScript(
            source: Self.bridgePolyfill,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )
        userContentController.addUserScript(userScript)

        let configuration = WKWebViewConfiguration()
        configuration.userContentController = userContentController

        webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = self
        view = webView
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        signInAnonymouslyIfNeeded()
        loadWebApp()

        storeManager.onPricesUpdated = { [weak self] prices in
            self?.evaluatePrices(prices)
        }
        storeManager.onPurchaseSuccess = { [weak self] jws in
            self?.callJS("onPaymentSuccess", args: [jws])
        }
        Task {
            await storeManager.start()
        }
    }

    private func signInAnonymouslyIfNeeded() {
        guard Auth.auth().currentUser == nil else { return }
        Auth.auth().signInAnonymously { _, error in
            if let error {
                print("Auth: anonymous sign-in failed: \(error)")
            }
        }
    }

    private func loadWebApp() {
        guard let webRoot = Bundle.main.url(forResource: "Web", withExtension: nil),
              let indexURL = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "Web") else {
            print("ViewController: Web/index.html not found in bundle")
            return
        }
        webView.loadFileURL(indexURL, allowingReadAccessTo: webRoot)
    }

    private func evaluatePrices(_ prices: [String: String]) {
        guard let data = try? JSONSerialization.data(withJSONObject: prices),
              let json = String(data: data, encoding: .utf8) else { return }
        webView.evaluateJavaScript("window.updateModelPrices && window.updateModelPrices(\(json))")
    }

    /// Calls a global JS function with string arguments, matching Android's
    /// webView.evaluateJavascript("javascript:$fn('$arg')", null) pattern.
    private func callJS(_ functionName: String, args: [String]) {
        let quotedArgs = args.map { "'\($0.replacingOccurrences(of: "'", with: "\\'"))'" }.joined(separator: ",")
        webView.evaluateJavaScript("\(functionName)(\(quotedArgs))")
    }

    // MARK: - WKScriptMessageHandler

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any], let action = body["action"] as? String else { return }

        switch action {
        case "startPayment":
            guard let productId = body["productId"] as? String else { return }
            handleStartPayment(productId: productId)
        case "getModelPrices":
            guard let callback = body["callback"] as? String else { return }
            handleGetModelPrices(callback: callback)
        case "getAppCheckToken":
            guard let callback = body["callback"] as? String else { return }
            handleGetAppCheckToken(callback: callback)
        case "getAuthToken":
            guard let callback = body["callback"] as? String else { return }
            handleGetAuthToken(callback: callback)
        default:
            break
        }
    }

    private func handleStartPayment(productId: String) {
        Task {
            do {
                let jws = try await storeManager.purchase(productId: productId)
                callJS("onPaymentSuccess", args: [jws])
            } catch {
                print("StoreManager: purchase failed for \(productId): \(error)")
            }
        }
    }

    private func handleGetModelPrices(callback: String) {
        let prices = storeManager.productsByID.mapValues { $0.displayPrice }
        guard let data = try? JSONSerialization.data(withJSONObject: prices),
              let json = String(data: data, encoding: .utf8) else { return }
        webView.evaluateJavaScript("\(callback)(\(json))")
    }

    private func handleGetAppCheckToken(callback: String) {
        AppCheck.appCheck().token(forcingRefresh: false) { [weak self] token, error in
            let value = token?.token ?? ""
            if let error {
                print("AppCheck: failed to get token: \(error)")
            }
            DispatchQueue.main.async {
                self?.callJS(callback, args: [value])
            }
        }
    }

    private func handleGetAuthToken(callback: String) {
        guard let user = Auth.auth().currentUser else {
            callJS(callback, args: [""])
            return
        }
        user.getIDTokenForcingRefresh(false) { [weak self] token, error in
            let value = token ?? ""
            if let error {
                print("Auth: failed to get ID token: \(error)")
            }
            DispatchQueue.main.async {
                self?.callJS(callback, args: [value])
            }
        }
    }
}
