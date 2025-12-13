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
  
  // Transaction observer task
  private var transactionObserverTask: Task<Void, Never>?
  private var appId: String?
  private var userId: String?
  
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
      return true
    }
    
    AsyncFunction("getStoreUrl") { () -> String? in
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
    
    // ============================================================================
    // Transaction Observer (StoreKit 2)
    // ============================================================================
    
    AsyncFunction("startTransactionObserver") { (appId: String) in
      self.startTransactionObserver(appId: appId)
    }
    
    AsyncFunction("stopTransactionObserver") { () in
      self.stopTransactionObserver()
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
  
  // MARK: - StoreKit 2 Transaction Observer
  
  private func startTransactionObserver(appId: String) {
    self.appId = appId
    self.userId = getOrCreateUserId()
    
    // Cancel existing observer if any
    transactionObserverTask?.cancel()
    
    // Start listening for transactions (iOS 15+)
    if #available(iOS 15.0, *) {
      transactionObserverTask = Task {
        await self.listenForTransactions()
      }
      
      // Also check for any unfinished transactions
      Task {
        await self.handleUnfinishedTransactions()
      }
    }
    
    print("[RampKit] Transaction observer started")
  }
  
  private func stopTransactionObserver() {
    transactionObserverTask?.cancel()
    transactionObserverTask = nil
    print("[RampKit] Transaction observer stopped")
  }
  
  @available(iOS 15.0, *)
  private func listenForTransactions() async {
    // Listen for transaction updates
    for await result in Transaction.updates {
      do {
        let transaction = try self.checkVerified(result)
        await self.handleTransaction(transaction)
        await transaction.finish()
      } catch {
        print("[RampKit] Transaction verification failed: \(error)")
      }
    }
  }
  
  @available(iOS 15.0, *)
  private func handleUnfinishedTransactions() async {
    // Handle any transactions that weren't finished
    for await result in Transaction.unfinished {
      do {
        let transaction = try self.checkVerified(result)
        await self.handleTransaction(transaction)
        await transaction.finish()
      } catch {
        print("[RampKit] Unfinished transaction verification failed: \(error)")
      }
    }
  }
  
  @available(iOS 15.0, *)
  private func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
    switch result {
    case .unverified(_, let error):
      throw error
    case .verified(let safe):
      return safe
    @unknown default:
      fatalError("Unknown VerificationResult case")
    }
  }
  
  @available(iOS 15.0, *)
  private func handleTransaction(_ transaction: Transaction) async {
    guard let appId = self.appId, let userId = self.userId else { return }
    
    // Determine event type based on transaction
    let eventName: String
    var properties: [String: Any] = [:]
    
    switch transaction.revocationReason {
    case .some(let reason):
      eventName = "purchase_refunded"
      properties["revocationReason"] = reason == .developerIssue ? "developer_issue" : "other"
    case .none:
      if transaction.isUpgraded {
        eventName = "subscription_upgraded"
      } else {
        switch transaction.productType {
        case .autoRenewable:
          if transaction.originalID == transaction.id {
            eventName = "purchase_completed"
          } else {
            eventName = "subscription_renewed"
          }
        case .consumable, .nonConsumable:
          eventName = "purchase_completed"
        case .nonRenewable:
          eventName = "purchase_completed"
        @unknown default:
          eventName = "purchase_completed"
        }
      }
    }
    
    // Build properties
    properties["productId"] = transaction.productID
    properties["transactionId"] = String(transaction.id)
    properties["originalTransactionId"] = String(transaction.originalID)
    properties["purchaseDate"] = ISO8601DateFormatter().string(from: transaction.purchaseDate)
    
    if let expirationDate = transaction.expirationDate {
      properties["expirationDate"] = ISO8601DateFormatter().string(from: expirationDate)
    }
    
    properties["quantity"] = transaction.purchasedQuantity
    properties["productType"] = mapProductType(transaction.productType)
    
    // environment property is only available in iOS 16.0+
    if #available(iOS 16.0, *) {
      properties["environment"] = transaction.environment.rawValue
    }
    
    if let webOrderLineItemID = transaction.webOrderLineItemID {
      properties["webOrderLineItemId"] = webOrderLineItemID
    }
    
    // Get price info from product if available
    if let product = await getProduct(for: transaction.productID) {
      properties["price"] = product.price
      properties["currency"] = product.priceFormatStyle.currencyCode
      properties["localizedPrice"] = product.displayPrice
      properties["localizedName"] = product.displayName
    }
    
    // Send event to backend
    await sendPurchaseEvent(
      appId: appId,
      userId: userId,
      eventName: eventName,
      properties: properties
    )
  }
  
  @available(iOS 15.0, *)
  private func getProduct(for productId: String) async -> Product? {
    do {
      let products = try await Product.products(for: [productId])
      return products.first
    } catch {
      return nil
    }
  }
  
  @available(iOS 15.0, *)
  private func mapProductType(_ type: Product.ProductType) -> String {
    switch type {
    case .consumable: return "consumable"
    case .nonConsumable: return "non_consumable"
    case .autoRenewable: return "auto_renewable"
    case .nonRenewable: return "non_renewable"
    @unknown default: return "unknown"
    }
  }
  
  private func sendPurchaseEvent(appId: String, userId: String, eventName: String, properties: [String: Any]) async {
    let event: [String: Any] = [
      "appId": appId,
      "appUserId": userId,
      "eventId": UUID().uuidString.lowercased(),
      "eventName": eventName,
      "sessionId": UUID().uuidString.lowercased(),
      "occurredAt": ISO8601DateFormatter().string(from: Date()),
      "device": [
        "platform": isPad() ? "iPadOS" : "iOS",
        "platformVersion": UIDevice.current.systemVersion,
        "deviceModel": getDeviceModelIdentifier(),
        "sdkVersion": "1.0.0",
        "appVersion": Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String,
        "buildNumber": Bundle.main.infoDictionary?["CFBundleVersion"] as? String
      ],
      "context": [
        "locale": Locale.current.identifier,
        "regionCode": Locale.current.regionCode
      ],
      "properties": properties
    ]
    
    guard let url = URL(string: "https://uustlzuvjmochxkxatfx.supabase.co/functions/v1/app-user-events") else { return }
    
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1c3RsenV2am1vY2h4a3hhdGZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1NjQ0NjYsImV4cCI6MjA1MTE0MDQ2Nn0.5cNrph5LHmssNo39UKpULkC9n4OD5n6gsnTEQV-gwQk", forHTTPHeaderField: "apikey")
    request.setValue("Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1c3RsenV2am1vY2h4a3hhdGZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1NjQ0NjYsImV4cCI6MjA1MTE0MDQ2Nn0.5cNrph5LHmssNo39UKpULkC9n4OD5n6gsnTEQV-gwQk", forHTTPHeaderField: "Authorization")
    
    do {
      request.httpBody = try JSONSerialization.data(withJSONObject: event)
      let (_, response) = try await URLSession.shared.data(for: request)
      if let httpResponse = response as? HTTPURLResponse {
        print("[RampKit] Purchase event sent: \(eventName) - Status: \(httpResponse.statusCode)")
      }
    } catch {
      print("[RampKit] Failed to send purchase event: \(error)")
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
      case .unspecified: return "unspecified"
      @unknown default: return "unspecified"
      }
    }
    return "light"
  }
}
