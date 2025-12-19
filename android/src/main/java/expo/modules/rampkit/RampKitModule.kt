package expo.modules.rampkit

import android.Manifest
import android.app.ActivityManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.content.res.Configuration
import android.os.Build
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.provider.Settings
import android.util.DisplayMetrics
import android.util.Log
import android.view.WindowManager
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.android.billingclient.api.*
import com.google.android.play.core.review.ReviewManagerFactory
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.*
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.UUID

class RampKitModule : Module(), PurchasesUpdatedListener {
  private val TAG = "RampKit"
  private val PREFS_NAME = "rampkit_prefs"
  private val USER_ID_KEY = "rk_user_id"
  private val INSTALL_DATE_KEY = "rk_install_date"
  private val LAUNCH_COUNT_KEY = "rk_launch_count"
  private val LAST_LAUNCH_KEY = "rk_last_launch"
  private val ORIGINAL_TXN_PREFIX = "rk_orig_txn_"

  private var billingClient: BillingClient? = null
  private var appId: String? = null
  private var userId: String? = null
  private val coroutineScope = CoroutineScope(Dispatchers.IO + SupervisorJob())

  private val context: Context
    get() = requireNotNull(appContext.reactContext)

  private val prefs: SharedPreferences
    get() = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

  override fun definition() = ModuleDefinition {
    Name("RampKit")

    // ============================================================================
    // Device Info
    // ============================================================================

    AsyncFunction("getDeviceInfo") {
      collectDeviceInfo()
    }

    AsyncFunction("getUserId") {
      getOrCreateUserId()
    }

    AsyncFunction("getStoredValue") { key: String ->
      prefs.getString(key, null)
    }

    AsyncFunction("setStoredValue") { key: String, value: String ->
      prefs.edit().putString(key, value).apply()
    }

    AsyncFunction("getLaunchTrackingData") {
      getLaunchTrackingData()
    }

    // ============================================================================
    // Haptics
    // ============================================================================

    AsyncFunction("impactAsync") { style: String ->
      performImpactHaptic(style)
    }

    AsyncFunction("notificationAsync") { type: String ->
      performNotificationHaptic(type)
    }

    AsyncFunction("selectionAsync") {
      performSelectionHaptic()
    }

    // ============================================================================
    // Store Review
    // ============================================================================

    AsyncFunction("requestReview") { promise: Promise ->
      requestStoreReview(promise)
    }

    AsyncFunction("isReviewAvailable") {
      true
    }

    AsyncFunction("getStoreUrl") {
      "https://play.google.com/store/apps/details?id=${context.packageName}"
    }

    // ============================================================================
    // Notifications
    // ============================================================================

    AsyncFunction("requestNotificationPermissions") { options: Map<String, Any>? ->
      requestNotificationPermissions(options)
    }

    AsyncFunction("getNotificationPermissions") {
      getNotificationPermissions()
    }

    // ============================================================================
    // Transaction Observer (Google Play Billing)
    // ============================================================================

    AsyncFunction("startTransactionObserver") { appId: String ->
      startTransactionObserver(appId)
    }

    AsyncFunction("stopTransactionObserver") {
      stopTransactionObserver()
    }

    OnDestroy {
      stopTransactionObserver()
      coroutineScope.cancel()
    }
  }

  // ============================================================================
  // PurchasesUpdatedListener Implementation
  // ============================================================================

  override fun onPurchasesUpdated(billingResult: BillingResult, purchases: MutableList<Purchase>?) {
    if (billingResult.responseCode == BillingClient.BillingResponseCode.OK && purchases != null) {
      for (purchase in purchases) {
        handlePurchase(purchase)
      }
    } else if (billingResult.responseCode == BillingClient.BillingResponseCode.USER_CANCELED) {
      Log.d(TAG, "User cancelled the purchase")
    } else {
      Log.e(TAG, "Purchase failed: ${billingResult.debugMessage}")
    }
  }

  // ============================================================================
  // Transaction Observer
  // ============================================================================

  private fun startTransactionObserver(appId: String) {
    this.appId = appId
    this.userId = getOrCreateUserId()

    billingClient = BillingClient.newBuilder(context)
      .setListener(this)
      .enablePendingPurchases()
      .build()

    billingClient?.startConnection(object : BillingClientStateListener {
      override fun onBillingSetupFinished(billingResult: BillingResult) {
        if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
          Log.d(TAG, "Billing client connected")
          // Query existing purchases
          queryExistingPurchases()
        } else {
          Log.e(TAG, "Billing setup failed: ${billingResult.debugMessage}")
        }
      }

      override fun onBillingServiceDisconnected() {
        Log.d(TAG, "Billing service disconnected")
        // Try to reconnect
        coroutineScope.launch {
          delay(5000)
          startTransactionObserver(appId)
        }
      }
    })

    Log.d(TAG, "Transaction observer started")
  }

  private fun stopTransactionObserver() {
    billingClient?.endConnection()
    billingClient = null
    Log.d(TAG, "Transaction observer stopped")
  }

  private fun queryExistingPurchases() {
    val client = billingClient ?: return

    // Query in-app purchases
    client.queryPurchasesAsync(
      QueryPurchasesParams.newBuilder()
        .setProductType(BillingClient.ProductType.INAPP)
        .build()
    ) { billingResult, purchases ->
      if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
        for (purchase in purchases) {
          if (purchase.purchaseState == Purchase.PurchaseState.PURCHASED && !purchase.isAcknowledged) {
            handlePurchase(purchase)
          }
        }
      }
    }

    // Query subscriptions
    client.queryPurchasesAsync(
      QueryPurchasesParams.newBuilder()
        .setProductType(BillingClient.ProductType.SUBS)
        .build()
    ) { billingResult, purchases ->
      if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
        for (purchase in purchases) {
          if (purchase.purchaseState == Purchase.PurchaseState.PURCHASED && !purchase.isAcknowledged) {
            handlePurchase(purchase)
          }
        }
      }
    }
  }

  private fun handlePurchase(purchase: Purchase) {
    val appId = this.appId ?: return
    val userId = this.userId ?: return

    when (purchase.purchaseState) {
      Purchase.PurchaseState.PURCHASED -> {
        // Acknowledge the purchase if not already acknowledged
        if (!purchase.isAcknowledged) {
          val acknowledgePurchaseParams = AcknowledgePurchaseParams.newBuilder()
            .setPurchaseToken(purchase.purchaseToken)
            .build()

          billingClient?.acknowledgePurchase(acknowledgePurchaseParams) { result ->
            if (result.responseCode == BillingClient.BillingResponseCode.OK) {
              Log.d(TAG, "Purchase acknowledged")
            }
          }
        }

        // Get product details for price info
        coroutineScope.launch {
          val productId = purchase.products.firstOrNull() ?: ""
          val productDetails = getProductDetails(productId)

          // Determine originalTransactionId for subscription tracking
          // For Android, we store the first orderId for each product as the "original"
          val originalTransactionId = getOrStoreOriginalTransactionId(productId, purchase.orderId)
          val isRenewal = originalTransactionId != purchase.orderId

          // Determine event type (matching iOS SDK logic)
          val eventName: String
          val isTrial: Boolean
          val isIntroOffer: Boolean

          // Check for free trial or intro offer
          val subscriptionOffer = productDetails?.subscriptionOfferDetails?.firstOrNull()
          val firstPricingPhase = subscriptionOffer?.pricingPhases?.pricingPhaseList?.firstOrNull()
          val hasFreeTrial = firstPricingPhase?.priceAmountMicros == 0L

          when {
            // Subscription renewal
            isRenewal && purchase.isAutoRenewing -> {
              eventName = "subscription_renewed"
              isTrial = false
              isIntroOffer = false
            }
            // Trial started (free trial)
            hasFreeTrial && !isRenewal -> {
              eventName = "trial_started"
              isTrial = true
              isIntroOffer = true
            }
            // Regular purchase
            else -> {
              eventName = "purchase_completed"
              isTrial = false
              isIntroOffer = false
            }
          }

          val properties = mutableMapOf<String, Any?>(
            "productId" to productId,
            "transactionId" to purchase.orderId,
            "originalTransactionId" to originalTransactionId,
            "purchaseToken" to purchase.purchaseToken,
            "purchaseDate" to getIso8601Timestamp(purchase.purchaseTime),
            "quantity" to purchase.quantity,
            "isAutoRenewing" to purchase.isAutoRenewing,
            "isTrial" to isTrial,
            "isIntroOffer" to isIntroOffer
          )

          productDetails?.let { details ->
            properties["productType"] = if (details.productType == BillingClient.ProductType.SUBS) "auto_renewable" else "non_consumable"

            // Get pricing info
            val oneTimePurchase = details.oneTimePurchaseOfferDetails
            val subscriptionOfferDetails = details.subscriptionOfferDetails?.firstOrNull()

            if (oneTimePurchase != null) {
              properties["amount"] = oneTimePurchase.priceAmountMicros / 1_000_000.0
              properties["currency"] = oneTimePurchase.priceCurrencyCode
              properties["priceFormatted"] = oneTimePurchase.formattedPrice
            } else if (subscriptionOfferDetails != null) {
              // For subscriptions, get the base pricing phase (not the free trial phase)
              val basePricingPhase = subscriptionOfferDetails.pricingPhases.pricingPhaseList
                .firstOrNull { it.priceAmountMicros > 0 }
                ?: subscriptionOfferDetails.pricingPhases.pricingPhaseList.lastOrNull()

              basePricingPhase?.let { phase ->
                properties["amount"] = phase.priceAmountMicros / 1_000_000.0
                properties["currency"] = phase.priceCurrencyCode
                properties["priceFormatted"] = phase.formattedPrice
                properties["subscriptionPeriod"] = formatBillingPeriod(phase.billingPeriod)
              }

              // Offer type detection
              val freeTrialPhase = subscriptionOfferDetails.pricingPhases.pricingPhaseList
                .firstOrNull { it.priceAmountMicros == 0L }
              if (freeTrialPhase != null) {
                properties["offerType"] = "introductory"
              }
            }

            properties["localizedName"] = details.name
          }

          sendPurchaseEvent(appId, userId, eventName, properties)
        }
      }
      Purchase.PurchaseState.PENDING -> {
        Log.d(TAG, "Purchase pending: ${purchase.products}")
      }
    }
  }

  /**
   * Get or store the original transaction ID for a product.
   * This enables subscription renewal tracking by comparing subsequent orderIds
   * to the original orderId for the same product.
   */
  private fun getOrStoreOriginalTransactionId(productId: String, currentOrderId: String?): String? {
    if (currentOrderId == null) return null

    val key = ORIGINAL_TXN_PREFIX + productId
    val storedOriginal = prefs.getString(key, null)

    return if (storedOriginal != null) {
      // Return the stored original
      storedOriginal
    } else {
      // This is the first purchase for this product, store it as original
      prefs.edit().putString(key, currentOrderId).apply()
      currentOrderId
    }
  }

  /**
   * Format Google Play billing period to ISO 8601 duration format
   * Input format: P1W, P1M, P3M, P6M, P1Y
   */
  private fun formatBillingPeriod(billingPeriod: String): String {
    // Google Play already uses ISO 8601 format, just return it
    return billingPeriod
  }

  private suspend fun getProductDetails(productId: String): ProductDetails? {
    if (productId.isEmpty()) return null
    val client = billingClient ?: return null

    // Try as subscription first
    var result = queryProductDetails(client, productId, BillingClient.ProductType.SUBS)
    if (result == null) {
      // Try as in-app purchase
      result = queryProductDetails(client, productId, BillingClient.ProductType.INAPP)
    }
    return result
  }

  private suspend fun queryProductDetails(
    client: BillingClient,
    productId: String,
    productType: String
  ): ProductDetails? = suspendCancellableCoroutine { continuation ->
    val productList = listOf(
      QueryProductDetailsParams.Product.newBuilder()
        .setProductId(productId)
        .setProductType(productType)
        .build()
    )

    val params = QueryProductDetailsParams.newBuilder()
      .setProductList(productList)
      .build()

    client.queryProductDetailsAsync(params) { billingResult, productDetailsList ->
      if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
        continuation.resume(productDetailsList.firstOrNull()) {}
      } else {
        continuation.resume(null) {}
      }
    }
  }

  private fun sendPurchaseEvent(appId: String, userId: String, eventName: String, properties: Map<String, Any?>) {
    coroutineScope.launch {
      try {
        val event = JSONObject().apply {
          put("appId", appId)
          put("appUserId", userId)
          put("eventId", UUID.randomUUID().toString().lowercase())
          put("eventName", eventName)
          put("sessionId", UUID.randomUUID().toString().lowercase())
          put("occurredAt", getIso8601Timestamp())
          put("device", JSONObject().apply {
            put("platform", "Android")
            put("platformVersion", Build.VERSION.RELEASE)
            put("deviceModel", "${Build.MANUFACTURER} ${Build.MODEL}")
            put("sdkVersion", "1.0.0")
            put("appVersion", getAppVersion())
            put("buildNumber", getBuildNumber())
          })
          put("context", JSONObject().apply {
            put("locale", Locale.getDefault().toLanguageTag())
            put("regionCode", Locale.getDefault().country)
          })
          put("properties", JSONObject(properties.filterValues { it != null }))
        }

        val url = URL("https://uustlzuvjmochxkxatfx.supabase.co/functions/v1/app-user-events")
        val connection = url.openConnection() as HttpURLConnection
        connection.apply {
          requestMethod = "POST"
          setRequestProperty("Content-Type", "application/json")
          setRequestProperty("apikey", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1c3RsenV2am1vY2h4a3hhdGZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1NjQ0NjYsImV4cCI6MjA1MTE0MDQ2Nn0.5cNrph5LHmssNo39UKpULkC9n4OD5n6gsnTEQV-gwQk")
          setRequestProperty("Authorization", "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1c3RsenV2am1vY2h4a3hhdGZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1NjQ0NjYsImV4cCI6MjA1MTE0MDQ2Nn0.5cNrph5LHmssNo39UKpULkC9n4OD5n6gsnTEQV-gwQk")
          doOutput = true
        }

        OutputStreamWriter(connection.outputStream).use { writer ->
          writer.write(event.toString())
        }

        val responseCode = connection.responseCode
        Log.d(TAG, "Purchase event sent: $eventName - Status: $responseCode")
        connection.disconnect()
      } catch (e: Exception) {
        Log.e(TAG, "Failed to send purchase event", e)
      }
    }
  }

  private fun getAppVersion(): String? {
    return try {
      context.packageManager.getPackageInfo(context.packageName, 0).versionName
    } catch (e: Exception) {
      null
    }
  }

  private fun getBuildNumber(): String? {
    return try {
      val packageInfo = context.packageManager.getPackageInfo(context.packageName, 0)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
        packageInfo.longVersionCode.toString()
      } else {
        @Suppress("DEPRECATION")
        packageInfo.versionCode.toString()
      }
    } catch (e: Exception) {
      null
    }
  }

  // Device Info Collection
  private fun collectDeviceInfo(): Map<String, Any?> {
    val userId = getOrCreateUserId()
    val launchData = getLaunchTrackingData()
    val displayMetrics = getDisplayMetrics()
    val locale = Locale.getDefault()
    val timezone = TimeZone.getDefault()
    val packageInfo = try {
      context.packageManager.getPackageInfo(context.packageName, 0)
    } catch (e: Exception) {
      null
    }

    return mapOf(
      "appUserId" to userId,
      "vendorId" to getAndroidId(),
      "appSessionId" to UUID.randomUUID().toString().lowercase(),
      "installDate" to launchData["installDate"],
      "isFirstLaunch" to launchData["isFirstLaunch"],
      "launchCount" to launchData["launchCount"],
      "lastLaunchAt" to launchData["lastLaunchAt"],
      "bundleId" to context.packageName,
      "appName" to getAppName(),
      "appVersion" to packageInfo?.versionName,
      "buildNumber" to getBuildNumberFromPackage(packageInfo),
      "platform" to "Android",
      "platformVersion" to Build.VERSION.RELEASE,
      "deviceModel" to "${Build.MANUFACTURER} ${Build.MODEL}",
      "deviceName" to Build.MODEL,
      "isSimulator" to isEmulator(),
      "deviceLanguageCode" to locale.language,
      "deviceLocale" to locale.toLanguageTag(),
      "regionCode" to locale.country,
      "preferredLanguage" to locale.toLanguageTag(),
      "preferredLanguages" to listOf(locale.toLanguageTag()),
      "deviceCurrencyCode" to try { java.util.Currency.getInstance(locale).currencyCode } catch (e: Exception) { null },
      "deviceCurrencySymbol" to try { java.util.Currency.getInstance(locale).symbol } catch (e: Exception) { null },
      "timezoneIdentifier" to timezone.id,
      "timezoneOffsetSeconds" to timezone.rawOffset / 1000,
      "interfaceStyle" to getInterfaceStyle(),
      "screenWidth" to (displayMetrics.widthPixels / displayMetrics.density),
      "screenHeight" to (displayMetrics.heightPixels / displayMetrics.density),
      "screenScale" to displayMetrics.density,
      "isLowPowerMode" to isLowPowerMode(),
      "totalMemoryBytes" to getTotalMemory(),
      "collectedAt" to getIso8601Timestamp()
    )
  }

  private fun getOrCreateUserId(): String {
    val existingId = prefs.getString(USER_ID_KEY, null)
    if (!existingId.isNullOrEmpty()) {
      return existingId
    }
    val newId = "rk_" + UUID.randomUUID().toString().lowercase()
    prefs.edit().putString(USER_ID_KEY, newId).apply()
    return newId
  }

  private fun getLaunchTrackingData(): Map<String, Any?> {
    val now = getIso8601Timestamp()
    val existingInstallDate = prefs.getString(INSTALL_DATE_KEY, null)
    val isFirstLaunch = existingInstallDate == null
    val installDate = existingInstallDate ?: now
    val lastLaunchAt = prefs.getString(LAST_LAUNCH_KEY, null)
    val launchCount = prefs.getInt(LAUNCH_COUNT_KEY, 0) + 1

    prefs.edit().apply {
      if (isFirstLaunch) {
        putString(INSTALL_DATE_KEY, installDate)
      }
      putInt(LAUNCH_COUNT_KEY, launchCount)
      putString(LAST_LAUNCH_KEY, now)
      apply()
    }

    return mapOf(
      "installDate" to installDate,
      "isFirstLaunch" to isFirstLaunch,
      "launchCount" to launchCount,
      "lastLaunchAt" to lastLaunchAt
    )
  }

  // Haptics
  private fun performImpactHaptic(style: String) {
    val vibrator = getVibrator() ?: return
    
    val duration = when (style.lowercase()) {
      "light" -> 10L
      "medium" -> 20L
      "heavy" -> 30L
      "rigid" -> 15L
      "soft" -> 25L
      else -> 20L
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val amplitude = when (style.lowercase()) {
        "light" -> 50
        "medium" -> 128
        "heavy" -> 255
        "rigid" -> 200
        "soft" -> 80
        else -> 128
      }
      vibrator.vibrate(VibrationEffect.createOneShot(duration, amplitude))
    } else {
      @Suppress("DEPRECATION")
      vibrator.vibrate(duration)
    }
  }

  private fun performNotificationHaptic(type: String) {
    val vibrator = getVibrator() ?: return
    
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val effect = when (type.lowercase()) {
        "success" -> VibrationEffect.createWaveform(longArrayOf(0, 50, 50, 50), -1)
        "warning" -> VibrationEffect.createWaveform(longArrayOf(0, 100, 50, 100), -1)
        "error" -> VibrationEffect.createWaveform(longArrayOf(0, 50, 30, 50, 30, 100), -1)
        else -> VibrationEffect.createOneShot(50, VibrationEffect.DEFAULT_AMPLITUDE)
      }
      vibrator.vibrate(effect)
    } else {
      @Suppress("DEPRECATION")
      vibrator.vibrate(50)
    }
  }

  private fun performSelectionHaptic() {
    val vibrator = getVibrator() ?: return
    
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      vibrator.vibrate(VibrationEffect.createOneShot(10, 50))
    } else {
      @Suppress("DEPRECATION")
      vibrator.vibrate(10)
    }
  }

  private fun getVibrator(): Vibrator? {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      val vibratorManager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
      vibratorManager?.defaultVibrator
    } else {
      @Suppress("DEPRECATION")
      context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
    }
  }

  // Store Review
  private fun requestStoreReview(promise: Promise) {
    try {
      val activity = appContext.currentActivity
      if (activity == null) {
        promise.resolve(false)
        return
      }

      val reviewManager = ReviewManagerFactory.create(context)
      val requestFlow = reviewManager.requestReviewFlow()
      
      requestFlow.addOnCompleteListener { task ->
        if (task.isSuccessful) {
          val reviewInfo = task.result
          val flow = reviewManager.launchReviewFlow(activity, reviewInfo)
          flow.addOnCompleteListener {
            promise.resolve(true)
          }
        } else {
          promise.resolve(false)
        }
      }
    } catch (e: Exception) {
      promise.resolve(false)
    }
  }

  // Notifications
  private fun requestNotificationPermissions(options: Map<String, Any>?): Map<String, Any> {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val androidOptions = options?.get("android") as? Map<*, *>
      val channelId = androidOptions?.get("channelId") as? String ?: "default"
      val channelName = androidOptions?.get("name") as? String ?: "Default"
      val importance = when ((androidOptions?.get("importance") as? String)?.uppercase()) {
        "MAX" -> NotificationManager.IMPORTANCE_HIGH
        "HIGH" -> NotificationManager.IMPORTANCE_HIGH
        "DEFAULT" -> NotificationManager.IMPORTANCE_DEFAULT
        "LOW" -> NotificationManager.IMPORTANCE_LOW
        "MIN" -> NotificationManager.IMPORTANCE_MIN
        else -> NotificationManager.IMPORTANCE_HIGH
      }

      val channel = NotificationChannel(channelId, channelName, importance)
      val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      notificationManager.createNotificationChannel(channel)
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      val granted = ContextCompat.checkSelfPermission(
        context,
        Manifest.permission.POST_NOTIFICATIONS
      ) == PackageManager.PERMISSION_GRANTED

      if (!granted) {
        appContext.currentActivity?.let { activity ->
          ActivityCompat.requestPermissions(
            activity,
            arrayOf(Manifest.permission.POST_NOTIFICATIONS),
            1001
          )
        }
      }

      return mapOf(
        "granted" to granted,
        "status" to if (granted) "granted" else "denied",
        "canAskAgain" to true
      )
    }

    return mapOf(
      "granted" to true,
      "status" to "granted",
      "canAskAgain" to true
    )
  }

  private fun getNotificationPermissions(): Map<String, Any> {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      val granted = ContextCompat.checkSelfPermission(
        context,
        Manifest.permission.POST_NOTIFICATIONS
      ) == PackageManager.PERMISSION_GRANTED

      return mapOf(
        "granted" to granted,
        "status" to if (granted) "granted" else "denied",
        "canAskAgain" to true
      )
    }

    return mapOf(
      "granted" to true,
      "status" to "granted",
      "canAskAgain" to true
    )
  }

  // Helper Functions
  private fun getAndroidId(): String? {
    return try {
      Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID)
    } catch (e: Exception) {
      null
    }
  }

  private fun getAppName(): String? {
    return try {
      val applicationInfo = context.applicationInfo
      val stringId = applicationInfo.labelRes
      if (stringId == 0) applicationInfo.nonLocalizedLabel?.toString()
      else context.getString(stringId)
    } catch (e: Exception) {
      null
    }
  }

  private fun getBuildNumberFromPackage(packageInfo: android.content.pm.PackageInfo?): String? {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      packageInfo?.longVersionCode?.toString()
    } else {
      @Suppress("DEPRECATION")
      packageInfo?.versionCode?.toString()
    }
  }

  private fun isEmulator(): Boolean {
    return (Build.FINGERPRINT.startsWith("generic")
        || Build.FINGERPRINT.startsWith("unknown")
        || Build.MODEL.contains("google_sdk")
        || Build.MODEL.contains("Emulator")
        || Build.MODEL.contains("Android SDK built for x86")
        || Build.MANUFACTURER.contains("Genymotion")
        || (Build.BRAND.startsWith("generic") && Build.DEVICE.startsWith("generic"))
        || Build.PRODUCT == "google_sdk")
  }

  private fun getDisplayMetrics(): DisplayMetrics {
    val windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
    val displayMetrics = DisplayMetrics()
    @Suppress("DEPRECATION")
    windowManager.defaultDisplay.getMetrics(displayMetrics)
    return displayMetrics
  }

  private fun getInterfaceStyle(): String {
    val nightModeFlags = context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK
    return when (nightModeFlags) {
      Configuration.UI_MODE_NIGHT_YES -> "dark"
      Configuration.UI_MODE_NIGHT_NO -> "light"
      else -> "unspecified"
    }
  }

  private fun isLowPowerMode(): Boolean {
    val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
    return powerManager?.isPowerSaveMode ?: false
  }

  private fun getTotalMemory(): Long {
    val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
    val memoryInfo = ActivityManager.MemoryInfo()
    activityManager.getMemoryInfo(memoryInfo)
    return memoryInfo.totalMem
  }

  private fun getIso8601Timestamp(): String {
    val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
    sdf.timeZone = TimeZone.getTimeZone("UTC")
    return sdf.format(Date())
  }

  private fun getIso8601Timestamp(millis: Long): String {
    val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
    sdf.timeZone = TimeZone.getTimeZone("UTC")
    return sdf.format(Date(millis))
  }
}
