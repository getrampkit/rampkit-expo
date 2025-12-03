import ExpoModulesCore
import UIKit
import Security
import StoreKit

public class RampKitModule: Module {
  // Storage keys
  private let userIdKey = "rk_user_id"
  private let installDateKey = "rk_install_date"
  private let launchCountKey = "rk_launch_count"
  private let lastLaunchKey = "rk_last_launch"
  
  public func definition() -> ModuleDefinition {
    Name("RampKit")
    
    // ============================================================================
    // Device Info
    // ============================================================================
    
    AsyncFunction("getDeviceInfo") { () -> [String: Any?] in
      return self.collectDeviceInfo()
    }
    
    AsyncFunction("getUserId") { () -> String in
      return self.getOrCreateUserId()
    }
    
    AsyncFunction("getStoredValue") { (key: String) -> String? in
      return UserDefaults.standard.string(forKey: key)
    }
    
    AsyncFunction("setStoredValue") { (key: String, value: String) in
      UserDefaults.standard.set(value, forKey: key)
    }
    
    AsyncFunction("getLaunchTrackingData") { () -> [String: Any?] in
      return self.getLaunchTrackingData()
    }
    
    // ============================================================================
    // Haptics
    // ============================================================================
    
    AsyncFunction("impactAsync") { (style: String) in
      self.performImpactHaptic(style: style)
    }
    
    AsyncFunction("notificationAsync") { (type: String) in
      self.performNotificationHaptic(type: type)
    }
    
    AsyncFunction("selectionAsync") { () in
      self.performSelectionHaptic()
    }
    
    // ============================================================================
    // Store Review
    // ============================================================================
    
    AsyncFunction("requestReview") { () in
      self.requestStoreReview()
    }
    
    AsyncFunction("isReviewAvailable") { () -> Bool in
      return true // Always available on iOS
    }
    
    AsyncFunction("getStoreUrl") { () -> String? in
      // Return nil - app should provide its own store URL
      return nil
    }
    
    // ============================================================================
    // Notifications
    // ============================================================================
    
    AsyncFunction("requestNotificationPermissions") { (options: [String: Any]?) -> [String: Any] in
      return await self.requestNotificationPermissions(options: options)
    }
    
    AsyncFunction("getNotificationPermissions") { () -> [String: Any] in
      return await self.getNotificationPermissions()
    }
  }
  
  // MARK: - Device Info Collection
  
  private func collectDeviceInfo() -> [String: Any?] {
    let device = UIDevice.current
    let screen = UIScreen.main
    let bundle = Bundle.main
    let locale = Locale.current
    let timezone = TimeZone.current
    
    let userId = getOrCreateUserId()
    let launchData = getLaunchTrackingData()
    let locales = Locale.preferredLanguages
    
    return [
      // User & Session
      "appUserId": userId,
      "vendorId": device.identifierForVendor?.uuidString,
      "appSessionId": UUID().uuidString.lowercased(),
      
      // Launch tracking
      "installDate": launchData["installDate"],
      "isFirstLaunch": launchData["isFirstLaunch"],
      "launchCount": launchData["launchCount"],
      "lastLaunchAt": launchData["lastLaunchAt"],
      
      // App info
      "bundleId": bundle.bundleIdentifier,
      "appName": bundle.infoDictionary?["CFBundleDisplayName"] as? String 
        ?? bundle.infoDictionary?["CFBundleName"] as? String,
      "appVersion": bundle.infoDictionary?["CFBundleShortVersionString"] as? String,
      "buildNumber": bundle.infoDictionary?["CFBundleVersion"] as? String,
      
      // Platform
      "platform": isPad() ? "iPadOS" : "iOS",
      "platformVersion": device.systemVersion,
      
      // Device
      "deviceModel": getDeviceModelIdentifier(),
      "deviceName": device.model,
      "isSimulator": isSimulator(),
      
      // Locale (using legacy APIs for iOS 13+ compatibility)
      "deviceLanguageCode": locale.languageCode,
      "deviceLocale": locale.identifier,
      "regionCode": locale.regionCode,
      "preferredLanguage": locales.first,
      "preferredLanguages": locales,
      
      // Currency
      "deviceCurrencyCode": locale.currencyCode,
      "deviceCurrencySymbol": locale.currencySymbol,
      
      // Timezone
      "timezoneIdentifier": timezone.identifier,
      "timezoneOffsetSeconds": timezone.secondsFromGMT(),
      
      // UI
      "interfaceStyle": getInterfaceStyle(),
      
      // Screen
      "screenWidth": screen.bounds.width,
      "screenHeight": screen.bounds.height,
      "screenScale": screen.scale,
      
      // Device status
      "isLowPowerMode": ProcessInfo.processInfo.isLowPowerModeEnabled,
      
      // Memory
      "totalMemoryBytes": ProcessInfo.processInfo.physicalMemory,
      
      // Timestamp
      "collectedAt": ISO8601DateFormatter().string(from: Date())
    ]
  }
  
  // MARK: - User ID Management (Keychain)
  
  private func getOrCreateUserId() -> String {
    if let existingId = getKeychainValue(forKey: userIdKey) {
      return existingId
    }
    
    let newId = UUID().uuidString.lowercased()
    setKeychainValue(newId, forKey: userIdKey)
    return newId
  }
  
  private func getKeychainValue(forKey key: String) -> String? {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrAccount as String: key,
      kSecAttrService as String: Bundle.main.bundleIdentifier ?? "com.rampkit.sdk",
      kSecReturnData as String: true,
      kSecMatchLimit as String: kSecMatchLimitOne
    ]
    
    var result: AnyObject?
    let status = SecItemCopyMatching(query as CFDictionary, &result)
    
    if status == errSecSuccess, let data = result as? Data {
      return String(data: data, encoding: .utf8)
    }
    return nil
  }
  
  private func setKeychainValue(_ value: String, forKey key: String) {
    guard let data = value.data(using: .utf8) else { return }
    
    let deleteQuery: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrAccount as String: key,
      kSecAttrService as String: Bundle.main.bundleIdentifier ?? "com.rampkit.sdk"
    ]
    SecItemDelete(deleteQuery as CFDictionary)
    
    let addQuery: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrAccount as String: key,
      kSecAttrService as String: Bundle.main.bundleIdentifier ?? "com.rampkit.sdk",
      kSecValueData as String: data,
      kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
    ]
    SecItemAdd(addQuery as CFDictionary, nil)
  }
  
  // MARK: - Launch Tracking
  
  private func getLaunchTrackingData() -> [String: Any?] {
    let defaults = UserDefaults.standard
    let now = ISO8601DateFormatter().string(from: Date())
    
    let existingInstallDate = defaults.string(forKey: installDateKey)
    let isFirstLaunch = existingInstallDate == nil
    let installDate = existingInstallDate ?? now
    
    let lastLaunchAt = defaults.string(forKey: lastLaunchKey)
    let launchCount = defaults.integer(forKey: launchCountKey) + 1
    
    if isFirstLaunch {
      defaults.set(installDate, forKey: installDateKey)
    }
    defaults.set(launchCount, forKey: launchCountKey)
    defaults.set(now, forKey: lastLaunchKey)
    
    return [
      "installDate": installDate,
      "isFirstLaunch": isFirstLaunch,
      "launchCount": launchCount,
      "lastLaunchAt": lastLaunchAt
    ]
  }
  
  // MARK: - Haptics
  
  private func performImpactHaptic(style: String) {
    let feedbackStyle: UIImpactFeedbackGenerator.FeedbackStyle
    switch style.lowercased() {
    case "light":
      feedbackStyle = .light
    case "medium":
      feedbackStyle = .medium
    case "heavy":
      feedbackStyle = .heavy
    case "rigid":
      feedbackStyle = .rigid
    case "soft":
      feedbackStyle = .soft
    default:
      feedbackStyle = .medium
    }
    
    let generator = UIImpactFeedbackGenerator(style: feedbackStyle)
    generator.prepare()
    generator.impactOccurred()
  }
  
  private func performNotificationHaptic(type: String) {
    let feedbackType: UINotificationFeedbackGenerator.FeedbackType
    switch type.lowercased() {
    case "success":
      feedbackType = .success
    case "warning":
      feedbackType = .warning
    case "error":
      feedbackType = .error
    default:
      feedbackType = .success
    }
    
    let generator = UINotificationFeedbackGenerator()
    generator.prepare()
    generator.notificationOccurred(feedbackType)
  }
  
  private func performSelectionHaptic() {
    let generator = UISelectionFeedbackGenerator()
    generator.prepare()
    generator.selectionChanged()
  }
  
  // MARK: - Store Review
  
  private func requestStoreReview() {
    DispatchQueue.main.async {
      if #available(iOS 14.0, *) {
        if let scene = UIApplication.shared.connectedScenes.first(where: { $0.activationState == .foregroundActive }) as? UIWindowScene {
          SKStoreReviewController.requestReview(in: scene)
        }
      } else {
        SKStoreReviewController.requestReview()
      }
    }
  }
  
  // MARK: - Notifications
  
  private func requestNotificationPermissions(options: [String: Any]?) async -> [String: Any] {
    let center = UNUserNotificationCenter.current()
    
    var authOptions: UNAuthorizationOptions = []
    
    if let ios = options?["ios"] as? [String: Any] {
      if ios["allowAlert"] as? Bool ?? true { authOptions.insert(.alert) }
      if ios["allowBadge"] as? Bool ?? true { authOptions.insert(.badge) }
      if ios["allowSound"] as? Bool ?? true { authOptions.insert(.sound) }
    } else {
      authOptions = [.alert, .badge, .sound]
    }
    
    do {
      let granted = try await center.requestAuthorization(options: authOptions)
      let settings = await center.notificationSettings()
      
      return [
        "granted": granted,
        "status": mapAuthorizationStatus(settings.authorizationStatus),
        "canAskAgain": settings.authorizationStatus != .denied,
        "ios": [
          "alertSetting": mapNotificationSetting(settings.alertSetting),
          "badgeSetting": mapNotificationSetting(settings.badgeSetting),
          "soundSetting": mapNotificationSetting(settings.soundSetting),
          "lockScreenSetting": mapNotificationSetting(settings.lockScreenSetting),
          "notificationCenterSetting": mapNotificationSetting(settings.notificationCenterSetting)
        ]
      ]
    } catch {
      return [
        "granted": false,
        "status": "denied",
        "canAskAgain": false,
        "error": error.localizedDescription
      ]
    }
  }
  
  private func getNotificationPermissions() async -> [String: Any] {
    let center = UNUserNotificationCenter.current()
    let settings = await center.notificationSettings()
    
    return [
      "granted": settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional,
      "status": mapAuthorizationStatus(settings.authorizationStatus),
      "canAskAgain": settings.authorizationStatus != .denied
    ]
  }
  
  private func mapAuthorizationStatus(_ status: UNAuthorizationStatus) -> String {
    switch status {
    case .notDetermined: return "undetermined"
    case .denied: return "denied"
    case .authorized: return "granted"
    case .provisional: return "provisional"
    case .ephemeral: return "ephemeral"
    @unknown default: return "undetermined"
    }
  }
  
  private func mapNotificationSetting(_ setting: UNNotificationSetting) -> String {
    switch setting {
    case .notSupported: return "notSupported"
    case .disabled: return "disabled"
    case .enabled: return "enabled"
    @unknown default: return "disabled"
    }
  }
  
  // MARK: - Device Helpers
  
  private func getDeviceModelIdentifier() -> String {
    var systemInfo = utsname()
    uname(&systemInfo)
    let machineMirror = Mirror(reflecting: systemInfo.machine)
    let identifier = machineMirror.children.reduce("") { identifier, element in
      guard let value = element.value as? Int8, value != 0 else { return identifier }
      return identifier + String(UnicodeScalar(UInt8(value)))
    }
    return identifier
  }
  
  private func isPad() -> Bool {
    return UIDevice.current.userInterfaceIdiom == .pad
  }
  
  private func isSimulator() -> Bool {
    #if targetEnvironment(simulator)
    return true
    #else
    return false
    #endif
  }
  
  private func getInterfaceStyle() -> String {
    if #available(iOS 13.0, *) {
      switch UITraitCollection.current.userInterfaceStyle {
      case .dark: return "dark"
      case .light: return "light"
      default: return "unspecified"
      }
    }
    return "light"
  }
}
