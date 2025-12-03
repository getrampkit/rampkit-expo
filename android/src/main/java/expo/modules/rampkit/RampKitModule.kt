package expo.modules.rampkit

import android.Manifest
import android.app.Activity
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
import android.view.WindowManager
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.google.android.play.core.review.ReviewManagerFactory
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.UUID

class RampKitModule : Module() {
  private val PREFS_NAME = "rampkit_prefs"
  private val USER_ID_KEY = "rk_user_id"
  private val INSTALL_DATE_KEY = "rk_install_date"
  private val LAUNCH_COUNT_KEY = "rk_launch_count"
  private val LAST_LAUNCH_KEY = "rk_last_launch"

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
      true // Google Play In-App Review is generally available
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
      "buildNumber" to getBuildNumber(packageInfo),
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
    val newId = UUID.randomUUID().toString().lowercase()
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
    // Create notification channel for Android 8+
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

    // For Android 13+, check POST_NOTIFICATIONS permission
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      val granted = ContextCompat.checkSelfPermission(
        context,
        Manifest.permission.POST_NOTIFICATIONS
      ) == PackageManager.PERMISSION_GRANTED

      if (!granted) {
        // Request permission - this will be handled by the app
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

    // For older Android versions, notifications are allowed by default
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

  private fun getBuildNumber(packageInfo: android.content.pm.PackageInfo?): String? {
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
}
