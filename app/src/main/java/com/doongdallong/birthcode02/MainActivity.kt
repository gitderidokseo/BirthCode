package com.doongdallong.birthcode02

import android.os.Bundle
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.ConsumeParams
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.PurchasesUpdatedListener
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams
import com.google.firebase.FirebaseApp
import com.google.firebase.appcheck.FirebaseAppCheck
import com.google.firebase.appcheck.playintegrity.PlayIntegrityAppCheckProviderFactory

import com.google.firebase.auth.FirebaseAuth

class MainActivity : AppCompatActivity(), PurchasesUpdatedListener {

    private lateinit var billingClient: BillingClient
    private lateinit var webView: WebView
    private lateinit var auth: FirebaseAuth
    private var productDetails: ProductDetails? = null
    private var isConnecting = false
    private var isQuerying = false
    private var hasQueried = false

    // Product ID (This must match the ID registered in the Play Console)
    private val SKU_AI_INTERPRETATION = "basic"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // Initialize Firebase, Auth and App Check
        FirebaseApp.initializeApp(this)
        auth = FirebaseAuth.getInstance()
        signInAnonymously()
        
        val firebaseAppCheck = FirebaseAppCheck.getInstance()
        firebaseAppCheck.installAppCheckProviderFactory(
            PlayIntegrityAppCheckProviderFactory.getInstance()
        )

        webView = findViewById(R.id.webView)
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            allowFileAccessFromFileURLs = true
            allowUniversalAccessFromFileURLs = true
            databaseEnabled = true
            setSupportMultipleWindows(false)
        }

        webView.addJavascriptInterface(WebAppInterface(), "Android")
        webView.webChromeClient = WebChromeClient()
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(
                view: WebView?,
                request: WebResourceRequest?
            ): Boolean {
                return false
            }
        }

        webView.loadUrl("file:///android_asset/index.html")

        initBillingClient()
    }

    private fun signInAnonymously() {
        if (auth.currentUser == null) {
            auth.signInAnonymously()
                .addOnCompleteListener(this) { task ->
                    if (task.isSuccessful) {
                        Log.d("Auth", "signInAnonymously:success")
                    } else {
                        Log.w("Auth", "signInAnonymously:failure", task.exception)
                    }
                }
        }
    }

    private fun initBillingClient() {
        billingClient = BillingClient.newBuilder(this)
            .setListener(this)
            .enablePendingPurchases()
            .build()

        connectToBilling()
    }

    private fun connectToBilling() {
        if (isConnecting) return
        isConnecting = true
        Log.d("Billing", "Connecting to BillingClient...")
        billingClient.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(billingResult: BillingResult) {
                isConnecting = false
                Log.d("Billing", "Setup finished: ${billingResult.responseCode}, ${billingResult.debugMessage}")
                if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                    queryProduct()
                    queryPurchases()
                } else {
                    Log.e("Billing", "Billing setup failed: ${billingResult.debugMessage}")
                }
            }

            override fun onBillingServiceDisconnected() {
                isConnecting = false
                Log.d("Billing", "Service disconnected. Retrying connection in 5s...")
                // Retry with delay to avoid tight loop
                webView.postDelayed({
                    connectToBilling()
                }, 5000)
            }
        })
    }

    private fun queryProduct() {
        if (isQuerying) return
        isQuerying = true
        Log.d("Billing", "Querying product details for: $SKU_AI_INTERPRETATION")
        val productList = listOf(
            QueryProductDetailsParams.Product.newBuilder()
                .setProductId(SKU_AI_INTERPRETATION)
                .setProductType(BillingClient.ProductType.INAPP)
                .build()
        )

        val params = QueryProductDetailsParams.newBuilder()
            .setProductList(productList)
            .build()

        billingClient.queryProductDetailsAsync(params) { billingResult, productDetailsList ->
            isQuerying = false
            hasQueried = true
            Log.d("Billing", "Query result: ${billingResult.responseCode}, ${billingResult.debugMessage}")
            if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                if (productDetailsList.isEmpty()) {
                    Log.e("Billing", "Product details list is empty! Check Product ID ($SKU_AI_INTERPRETATION) in Play Console.")
                } else {
                    productDetails = productDetailsList.find { it.productId == SKU_AI_INTERPRETATION }
                    Log.d("Billing", "Product details found: ${productDetails?.name}")
                }
            } else {
                Log.e("Billing", "Failed to query product details: ${billingResult.debugMessage}")
            }
        }
    }

    private fun queryPurchases() {
        if (!billingClient.isReady) return

        val params = QueryPurchasesParams.newBuilder()
            .setProductType(BillingClient.ProductType.INAPP)
            .build()

        billingClient.queryPurchasesAsync(params) { billingResult, purchases ->
            if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                for (purchase in purchases) {
                    handlePurchase(purchase)
                }
            }
        }
    }

    override fun onPurchasesUpdated(billingResult: BillingResult, purchases: List<Purchase>?) {
        if (billingResult.responseCode == BillingClient.BillingResponseCode.OK && purchases != null) {
            for (purchase in purchases) {
                handlePurchase(purchase)
            }
        } else if (billingResult.responseCode == BillingClient.BillingResponseCode.USER_CANCELED) {
            Toast.makeText(this, getString(R.string.msg_payment_cancelled), Toast.LENGTH_SHORT).show()
        } else {
            Toast.makeText(this, getString(R.string.msg_error_occurred, billingResult.debugMessage), Toast.LENGTH_SHORT).show()
        }
    }

    private fun handlePurchase(purchase: Purchase) {
        if (purchase.purchaseState == Purchase.PurchaseState.PURCHASED) {
            // Consumable product - consume it after purchase
            val consumeParams = ConsumeParams.newBuilder()
                .setPurchaseToken(purchase.purchaseToken)
                .build()

            billingClient.consumeAsync(consumeParams) { billingResult, _ ->
                if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                    runOnUiThread {
                        // Pass the purchase token to JS for server-side verification
                        webView.evaluateJavascript("javascript:onPaymentSuccess('${purchase.purchaseToken}')", null)
                    }
                }
            }
        }
    }

    inner class WebAppInterface {
        @JavascriptInterface
        fun startPayment() {
            if (!billingClient.isReady) {
                Log.w("Billing", "BillingClient is not ready. Trying to connect...")
                connectToBilling()
                runOnUiThread {
                    Toast.makeText(this@MainActivity, getString(R.string.msg_loading_payment), Toast.LENGTH_SHORT).show()
                }
                return
            }

            if (productDetails == null) {
                if (hasQueried && !isQuerying) {
                    // Already tried querying and found nothing
                    runOnUiThread {
                        Toast.makeText(this@MainActivity, getString(R.string.msg_product_not_found, SKU_AI_INTERPRETATION), Toast.LENGTH_LONG).show()
                    }
                } else {
                    Log.w("Billing", "Product details not loaded. Re-querying...")
                    queryProduct()
                    runOnUiThread {
                        Toast.makeText(this@MainActivity, getString(R.string.msg_loading_payment), Toast.LENGTH_SHORT).show()
                    }
                }
                return
            }

            val productDetailsParamsList = listOf(
                BillingFlowParams.ProductDetailsParams.newBuilder()
                    .setProductDetails(productDetails!!)
                    .build()
            )

            val billingFlowParams = BillingFlowParams.newBuilder()
                .setProductDetailsParamsList(productDetailsParamsList)
                .build()

            billingClient.launchBillingFlow(this@MainActivity, billingFlowParams)
        }

        @JavascriptInterface
        fun getAppCheckToken(callbackName: String) {
            FirebaseAppCheck.getInstance()
                .getAppCheckToken(false)
                .addOnSuccessListener { tokenResult ->
                    val token = tokenResult.token
                    Log.d("AppCheck", "Successfully got AppCheck token (length: ${token.length})")
                    runOnUiThread {
                        webView.evaluateJavascript("javascript:$callbackName('$token')", null)
                    }
                }
                .addOnFailureListener { e ->
                    Log.e("AppCheck", "Failed to get AppCheck token", e)
                    runOnUiThread {
                        webView.evaluateJavascript("javascript:$callbackName('')", null)
                    }
                }
        }

        @JavascriptInterface
        fun getAuthToken(callbackName: String) {
            val user = FirebaseAuth.getInstance().currentUser
            if (user != null) {
                user.getIdToken(false).addOnSuccessListener { result ->
                    val token = result.token ?: ""
                    Log.d("Auth", "Successfully got Auth token (length: ${token.length})")
                    runOnUiThread {
                        webView.evaluateJavascript("javascript:$callbackName('$token')", null)
                    }
                }.addOnFailureListener { e ->
                    Log.e("Auth", "Failed to get Auth token", e)
                    runOnUiThread {
                        webView.evaluateJavascript("javascript:$callbackName('')", null)
                    }
                }
            } else {
                Log.w("Auth", "No current user for Auth token")
                runOnUiThread {
                    webView.evaluateJavascript("javascript:$callbackName('')", null)
                }
            }
        }
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            @Suppress("DEPRECATION")
            super.onBackPressed()
        }
    }
}
