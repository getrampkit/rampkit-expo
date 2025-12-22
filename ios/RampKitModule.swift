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
  private let trackedTransactionsKey = "rk_tracked_transactions"

  // Transaction observer task
  private var transactionObserverTask: Task<Void, Never>?
  private var appId: String?
  private var userId: String?
  private var isConfigured = false

  // Set of already-tracked originalTransactionIds to prevent duplicates
  private var trackedTransactionIds: Set<String> = []

  public func definition() -> ModuleDefinition {
    Name("RampKit")

    // OnCreate runs when JS first requires the module - may be too late for some transactions
    OnCreate {
      print("[RampKit] ⚡ OnCreate called - module being initialized")
      self.loadTrackedTransactions()
      self.userId = self.getOrCreateUserId()
      print("[RampKit] ⚡ OnCreate complete, userId: \(self.userId ?? "nil")")
    }
    
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

    AsyncFunction("startTransactionObserver") { (appId: String) -> [String: Any] in
      return await self.startTransactionObserver(appId: appId)
    }

    AsyncFunction("stopTransactionObserver") { () in
      self.stopTransactionObserver()
    }

    AsyncFunction("clearTrackedTransactions") { () -> Int in
      let count = self.trackedTransactionIds.count
      self.trackedTransactionIds.removeAll()
      self.saveTrackedTransactions()
      print("[RampKit] 🗑️ Cleared \(count) tracked transaction IDs")
      return count
    }

    AsyncFunction("recheckEntitlements") { () -> [String: Any] in
      print("[RampKit] 🔄 Re-checking entitlements (called from JS)...")
      if #available(iOS 15.0, *) {
        return await self.checkAndTrackCurrentEntitlements()
      } else {
        return ["error": "iOS 15+ required"]
      }
    }

    // ============================================================================
    // Manual Purchase Tracking (Fallback for Superwall/RevenueCat)
    // ============================================================================

    AsyncFunction("trackPurchaseCompleted") { (productId: String, transactionId: String?, originalTransactionId: String?) in
      await self.trackPurchaseCompletedManually(
        productId: productId,
        transactionId: transactionId,
        originalTransactionId: originalTransactionId
      )
    }

    AsyncFunction("trackPurchaseFromProduct") { (productId: String) in
      await self.trackPurchaseFromProductId(productId: productId)
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
    
    let newId = "rk_" + UUID().uuidString.lowercased()
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
  
  // MARK: - Tracked Transactions (Deduplication)

  private func loadTrackedTransactions() {
    if let stored = UserDefaults.standard.array(forKey: trackedTransactionsKey) as? [String] {
      trackedTransactionIds = Set(stored)
      print("[RampKit] 📚 Loaded \(trackedTransactionIds.count) tracked transaction IDs")
    }
  }

  private func saveTrackedTransactions() {
    let array = Array(trackedTransactionIds)
    UserDefaults.standard.set(array, forKey: trackedTransactionsKey)
    print("[RampKit] 💾 Saved \(trackedTransactionIds.count) tracked transaction IDs")
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

  /// Called from JavaScript - sets appId and IMMEDIATELY checks for purchases we may have missed
  /// Returns debug info for JavaScript logging
  private func startTransactionObserver(appId: String) async -> [String: Any] {
    self.appId = appId
    self.userId = getOrCreateUserId()
    self.isConfigured = true

    print("[RampKit] ✅ Transaction observer configured with appId: \(appId)")
    print("[RampKit] 📊 Already tracked \(trackedTransactionIds.count) transactions")

    var result: [String: Any] = [
      "configured": true,
      "appId": appId,
      "userId": self.userId ?? "unknown",
      "previouslyTrackedCount": trackedTransactionIds.count,
      "iOSVersion": UIDevice.current.systemVersion
    ]

    if #available(iOS 15.0, *) {
      // CRITICAL: Check current entitlements for any purchases we missed
      // This is the KEY mechanism for catching Superwall/RevenueCat purchases
      let entitlementResult = await self.checkAndTrackCurrentEntitlements()
      result["entitlementCheck"] = entitlementResult

      // Also start listening for future transactions
      await self.startTransactionUpdatesListener()
      result["listenerStarted"] = true
    } else {
      result["error"] = "iOS 15+ required for StoreKit 2"
      result["listenerStarted"] = false
    }

    return result
  }

  /// Check all current entitlements and track any we haven't seen before
  /// This catches purchases made by Superwall/RevenueCat before our observer started
  /// Returns a dictionary with the results for JavaScript logging
  ///
  /// IMPORTANT: "Already sent" means we previously sent this transaction to the backend
  /// and received a successful HTTP 2xx response. The originalTransactionId is stored
  /// in UserDefaults ONLY after a successful send.
  @available(iOS 15.0, *)
  private func checkAndTrackCurrentEntitlements() async -> [String: Any] {
    print("[RampKit] ")
    print("[RampKit] ════════════════════════════════════════════════════════════")
    print("[RampKit] 🔍 CHECKING ENTITLEMENTS FOR UNSENT PURCHASES")
    print("[RampKit] ════════════════════════════════════════════════════════════")
    print("[RampKit] ")
    print("[RampKit] 📚 Tracked transaction IDs in storage: \(trackedTransactionIds.count)")
    if !trackedTransactionIds.isEmpty {
      print("[RampKit]    These IDs were SUCCESSFULLY sent to backend (HTTP 2xx):")
      for id in trackedTransactionIds {
        print("[RampKit]    - \(id)")
      }
    }
    print("[RampKit] ")

    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

    var foundCount = 0
    var trackedCount = 0
    var newCount = 0
    var productIds: [String] = []
    var newProductIds: [String] = []
    var sentEvents: [[String: Any]] = []
    var skippedReasons: [[String: Any]] = []
    var alreadyTrackedDetails: [[String: Any]] = []  // NEW: Details of already-tracked transactions

    for await result in Transaction.currentEntitlements {
      foundCount += 1

      guard case .verified(let transaction) = result else {
        print("[RampKit] ⚠️ Unverified entitlement skipped")
        skippedReasons.append(["productId": "unknown", "reason": "unverified"])
        continue
      }

      let originalId = String(transaction.originalID)
      let transactionId = String(transaction.id)
      productIds.append(transaction.productID)

      // Build transaction details for logging
      var txDetails: [String: Any] = [
        "productId": transaction.productID,
        "transactionId": transactionId,
        "originalTransactionId": originalId,
        "purchaseDate": formatter.string(from: transaction.purchaseDate)
      ]
      if let expirationDate = transaction.expirationDate {
        txDetails["expirationDate"] = formatter.string(from: expirationDate)
      }
      if #available(iOS 16.0, *) {
        txDetails["environment"] = transaction.environment.rawValue
      }

      print("[RampKit] 📦 Found entitlement:")
      print("[RampKit]    - productId: \(transaction.productID)")
      print("[RampKit]    - transactionId: \(transactionId)")
      print("[RampKit]    - originalTransactionId: \(originalId)")
      print("[RampKit]    - purchaseDate: \(formatter.string(from: transaction.purchaseDate))")

      // Check if we've already tracked this transaction
      // "Tracked" means we successfully sent a purchase_completed event to the backend
      // and received an HTTP 2xx response. We store the transactionId after success.
      // NOTE: We track by transactionId (not originalTransactionId) so renewals are also sent.
      if trackedTransactionIds.contains(transactionId) {
        trackedCount += 1
        txDetails["status"] = "already_sent"
        alreadyTrackedDetails.append(txDetails)
        print("[RampKit]    ✅ STATUS: ALREADY SENT TO BACKEND")
        print("[RampKit]       (transactionId \(transactionId) is in our sent-transactions storage)")
        print("[RampKit]       This means we previously sent a purchase_completed event")
        print("[RampKit]       and received a successful HTTP 2xx response.")
        print("[RampKit] ")
        continue
      }

      // Skip revocations only (NOT renewals - we want to track renewals too!)
      if transaction.revocationDate != nil {
        txDetails["status"] = "skipped"
        txDetails["reason"] = "revoked"
        skippedReasons.append(txDetails)
        print("[RampKit] ⏭️ STATUS: Skipped (revoked)")
        continue
      }

      // Log if this is a renewal
      if transaction.originalID != transaction.id {
        print("[RampKit]    ℹ️  This is a RENEWAL (originalID != transactionID)")
      }

      // NEW transaction we haven't seen!
      newCount += 1
      newProductIds.append(transaction.productID)
      print("[RampKit] 🆕 STATUS: NEW purchase - will send to backend now...")

      // Track it and get the result
      let sendResult = await self.handleTransactionWithResult(transaction)
      sentEvents.append(sendResult)

      // Only mark as tracked if send succeeded
      if let status = sendResult["status"] as? String, status == "sent" {
        trackedTransactionIds.insert(transactionId)
        saveTrackedTransactions()
        print("[RampKit] ✅ Event sent successfully! HTTP status: \(sendResult["httpStatus"] ?? "unknown")")
        print("[RampKit] ✅ Marked transactionId \(transactionId) as tracked")
      } else {
        print("[RampKit] ❌ Send failed: \(sendResult["error"] ?? "unknown error")")
        print("[RampKit] ⚠️ Will retry on next app launch")
      }
    }

    print("[RampKit] ")
    print("[RampKit] ════════════════════════════════════════════════════════════")
    print("[RampKit] 📊 ENTITLEMENT CHECK SUMMARY")
    print("[RampKit] ════════════════════════════════════════════════════════════")
    print("[RampKit]    Total entitlements found:     \(foundCount)")
    print("[RampKit]    Already sent (HTTP 2xx):      \(trackedCount) (no action needed)")
    print("[RampKit]    Skipped (renewal/revoked):    \(skippedReasons.count) (backend gets via S2S)")
    print("[RampKit]    NEW events sent this session: \(newCount)")
    print("[RampKit]    Total tracked IDs in storage: \(trackedTransactionIds.count)")
    if newCount == 0 && foundCount > 0 {
      print("[RampKit] ")
      print("[RampKit]    ℹ️  All purchases already sent or skipped - nothing new to send")
    }
    print("[RampKit] ════════════════════════════════════════════════════════════")

    return [
      "totalFound": foundCount,
      "alreadyTracked": trackedCount,
      "newPurchases": newCount,
      "productIds": productIds,
      "newProductIds": newProductIds,
      "sentEvents": sentEvents,
      "skippedReasons": skippedReasons,
      "alreadyTrackedDetails": alreadyTrackedDetails,  // NEW
      "trackedIdsCount": trackedTransactionIds.count
    ]
  }

  /// Start listening for Transaction.updates (for future purchases)
  @available(iOS 15.0, *)
  private func startTransactionUpdatesListener() async {
    guard transactionObserverTask == nil else {
      print("[RampKit] Transaction updates listener already running")
      return
    }

    print("[RampKit] 👂 Starting Transaction.updates listener...")

    transactionObserverTask = Task {
      for await result in Transaction.updates {
        print("[RampKit] 🎉 Transaction.updates received!")

        guard case .verified(let transaction) = result else {
          print("[RampKit] ⚠️ Unverified transaction update")
          continue
        }

        let transactionId = String(transaction.id)
        let originalId = String(transaction.originalID)

        // Skip if already tracked (by transactionId, not originalId - so renewals are tracked)
        if self.trackedTransactionIds.contains(transactionId) {
          print("[RampKit] ✓ Transaction.updates: Already tracked \(transaction.productID) (txId: \(transactionId))")
          await transaction.finish()
          continue
        }

        // Skip revocations only (NOT renewals - we want to track renewals!)
        if transaction.revocationDate != nil {
          print("[RampKit] ⏭️ Transaction.updates: skipped (revoked) \(transaction.productID)")
          await transaction.finish()
          continue
        }

        // Log if this is a renewal
        if transaction.originalID != transaction.id {
          print("[RampKit] 🔄 Transaction.updates: RENEWAL detected for \(transaction.productID)")
        }

        print("[RampKit] 🆕 Transaction.updates: NEW transaction \(transaction.productID) (txId: \(transactionId))")

        // Track it and check result
        let sendResult = await self.handleTransactionWithResult(transaction)

        // Only mark as tracked if send succeeded (use transactionId for renewals support)
        if let status = sendResult["status"] as? String, status == "sent" {
          self.trackedTransactionIds.insert(transactionId)
          self.saveTrackedTransactions()
          print("[RampKit] ✅ Transaction.updates: Sent and tracked \(transaction.productID) (txId: \(transactionId))")
        } else {
          print("[RampKit] ⚠️ Transaction.updates: Send failed, will retry \(transaction.productID)")
        }

        // Finish the transaction
        await transaction.finish()
      }
    }
  }

  private func stopTransactionObserver() {
    transactionObserverTask?.cancel()
    transactionObserverTask = nil
    isConfigured = false
    print("[RampKit] Transaction observer stopped")
  }

  @available(iOS 15.0, *)
  private func handleTransaction(_ transaction: Transaction) async {
    print("[RampKit] 🔄 handleTransaction called for: \(transaction.productID)")
    print("[RampKit]    - id: \(transaction.id)")
    print("[RampKit]    - originalID: \(transaction.originalID)")
    print("[RampKit]    - purchaseDate: \(transaction.purchaseDate)")

    guard let appId = self.appId, let userId = self.userId else {
      print("[RampKit] ❌ handleTransaction failed: appId=\(self.appId ?? "nil"), userId=\(self.userId ?? "nil")")
      return
    }

    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

    // Skip renewals - backend gets these from App Store Server-to-Server notifications
    if transaction.originalID != transaction.id {
      print("[RampKit] ⏭️ Transaction skipped (renewal): \(transaction.productID)")
      return
    }

    // Skip revocations/cancellations - backend gets these from S2S notifications
    if transaction.revocationDate != nil {
      print("[RampKit] ⏭️ Transaction skipped (revoked): \(transaction.productID)")
      return
    }

    print("[RampKit] ✅ Transaction is a new purchase, will send event")

    // All new purchases (including trials) are tracked as purchase_completed
    // The isTrial and offerType properties indicate trial status
    let eventName = "purchase_completed"
    var properties: [String: Any] = [:]

    // Build properties (matching iOS SDK PurchaseEventDetails)
    properties["productId"] = transaction.productID
    properties["transactionId"] = String(transaction.id)
    properties["originalTransactionId"] = String(transaction.originalID)
    properties["purchaseDate"] = formatter.string(from: transaction.purchaseDate)
    properties["quantity"] = transaction.purchasedQuantity
    properties["productType"] = mapProductType(transaction.productType)

    // Expiration date
    if let expirationDate = transaction.expirationDate {
      properties["expirationDate"] = formatter.string(from: expirationDate)
    }

    // Trial/intro offer detection
    if let offerType = transaction.offerType {
      properties["isTrial"] = offerType == .introductory
      properties["isIntroOffer"] = offerType == .introductory
      properties["offerType"] = formatOfferType(offerType)
    }

    // Offer ID
    if let offerId = transaction.offerID {
      properties["offerId"] = offerId
    }

    // Storefront country
    properties["storefront"] = transaction.storefrontCountryCode

    // Web order line item ID
    if let webOrderLineItemID = transaction.webOrderLineItemID {
      properties["webOrderLineItemId"] = webOrderLineItemID
    }

    // Environment (iOS 16+)
    if #available(iOS 16.0, *) {
      properties["environment"] = transaction.environment.rawValue
    }

    // Get price info from product if available
    if let product = await getProduct(for: transaction.productID) {
      properties["amount"] = product.price
      properties["currency"] = product.priceFormatStyle.currencyCode
      properties["priceFormatted"] = product.displayPrice

      // Subscription-specific info
      if let subscription = product.subscription {
        properties["subscriptionPeriod"] = formatSubscriptionPeriod(subscription.subscriptionPeriod)
        properties["subscriptionGroupId"] = subscription.subscriptionGroupID
      }
    }

    // Send event to backend
    await sendPurchaseEvent(
      appId: appId,
      userId: userId,
      eventName: eventName,
      properties: properties
    )
  }

  /// Handle transaction and return result for JS logging
  @available(iOS 15.0, *)
  private func handleTransactionWithResult(_ transaction: Transaction) async -> [String: Any] {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

    var result: [String: Any] = [
      "productId": transaction.productID,
      "transactionId": String(transaction.id),
      "originalTransactionId": String(transaction.originalID),
      "purchaseDate": formatter.string(from: transaction.purchaseDate)
    ]

    guard let appId = self.appId, let userId = self.userId else {
      result["status"] = "error"
      result["error"] = "appId or userId missing"
      return result
    }

    // Check if this is a renewal (originalID != id)
    if transaction.originalID != transaction.id {
      result["status"] = "skipped"
      result["reason"] = "renewal (originalID != id)"
      return result
    }

    // Check if revoked
    if transaction.revocationDate != nil {
      result["status"] = "skipped"
      result["reason"] = "revoked"
      return result
    }

    // Build properties
    var properties: [String: Any] = [:]
    properties["productId"] = transaction.productID
    properties["transactionId"] = String(transaction.id)
    properties["originalTransactionId"] = String(transaction.originalID)
    properties["purchaseDate"] = formatter.string(from: transaction.purchaseDate)
    properties["quantity"] = transaction.purchasedQuantity
    properties["productType"] = mapProductType(transaction.productType)

    if let expirationDate = transaction.expirationDate {
      properties["expirationDate"] = formatter.string(from: expirationDate)
    }

    if let offerType = transaction.offerType {
      properties["isTrial"] = offerType == .introductory
      properties["isIntroOffer"] = offerType == .introductory
      properties["offerType"] = formatOfferType(offerType)
    }

    if let offerId = transaction.offerID {
      properties["offerId"] = offerId
    }

    properties["storefront"] = transaction.storefrontCountryCode

    if #available(iOS 16.0, *) {
      properties["environment"] = transaction.environment.rawValue
      result["environment"] = transaction.environment.rawValue
    }

    // Get price info
    if let product = await getProduct(for: transaction.productID) {
      properties["amount"] = product.price
      properties["currency"] = product.priceFormatStyle.currencyCode
      properties["priceFormatted"] = product.displayPrice
      result["amount"] = "\(product.price)"
      result["currency"] = product.priceFormatStyle.currencyCode

      if let subscription = product.subscription {
        properties["subscriptionPeriod"] = formatSubscriptionPeriod(subscription.subscriptionPeriod)
        properties["subscriptionGroupId"] = subscription.subscriptionGroupID
      }
    }

    // Send event
    let sendResult = await sendPurchaseEventWithResult(
      appId: appId,
      userId: userId,
      eventName: "purchase_completed",
      properties: properties
    )

    result["status"] = sendResult.success ? "sent" : "failed"
    result["httpStatus"] = sendResult.statusCode
    if let error = sendResult.error {
      result["error"] = error
    }

    return result
  }

  @available(iOS 15.0, *)
  private func formatOfferType(_ offerType: Transaction.OfferType) -> String {
    if offerType == .introductory {
      return "introductory"
    } else if offerType == .promotional {
      return "promotional"
    } else if offerType == .code {
      return "code"
    } else {
      return "unknown"
    }
  }

  @available(iOS 15.0, *)
  private func formatSubscriptionPeriod(_ period: Product.SubscriptionPeriod) -> String {
    // ISO 8601 duration format
    let unit = period.unit
    if unit == .day {
      return "P\(period.value)D"
    } else if unit == .week {
      return "P\(period.value)W"
    } else if unit == .month {
      return "P\(period.value)M"
    } else if unit == .year {
      return "P\(period.value)Y"
    } else {
      return "P\(period.value)D"
    }
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
    // Use if-else to avoid switch exhaustiveness issues with resilient enums
    if type == .consumable {
      return "consumable"
    } else if type == .nonConsumable {
      return "non_consumable"
    } else if type == .autoRenewable {
      return "auto_renewable"
    } else if type == .nonRenewable {
      return "non_renewable"
    } else {
      return "unknown"
    }
  }
  
  private func sendPurchaseEvent(appId: String, userId: String, eventName: String, properties: [String: Any], paywallId: String? = nil) async {
    let _ = await sendPurchaseEventWithResult(appId: appId, userId: userId, eventName: eventName, properties: properties, paywallId: paywallId)
  }

  private struct SendEventResult {
    let success: Bool
    let statusCode: Int
    let error: String?
  }

  private func sendPurchaseEventWithResult(appId: String, userId: String, eventName: String, properties: [String: Any], paywallId: String? = nil) async -> SendEventResult {
    // Build context with optional paywallId for attribution
    var context: [String: Any] = [
      "locale": Locale.current.identifier,
      "regionCode": Locale.current.regionCode as Any
    ]
    if let paywallId = paywallId {
      context["paywallId"] = paywallId
    }

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
        "appVersion": Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "unknown",
        "buildNumber": Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "unknown"
      ],
      "context": context,
      "properties": properties
    ]

    // DETAILED LOGGING: Log the full request body
    print("[RampKit] ")
    print("[RampKit] ════════════════════════════════════════════════════════════")
    print("[RampKit] 📤 SENDING PURCHASE EVENT TO BACKEND")
    print("[RampKit] ════════════════════════════════════════════════════════════")
    print("[RampKit] URL: https://uustlzuvjmochxkxatfx.supabase.co/functions/v1/app-user-events")
    print("[RampKit] Method: POST")
    print("[RampKit] ")
    print("[RampKit] 📋 REQUEST BODY:")
    print("[RampKit]    appId: \(appId)")
    print("[RampKit]    appUserId: \(userId)")
    print("[RampKit]    eventName: \(eventName)")
    if let originalTxId = properties["originalTransactionId"] {
      print("[RampKit]    properties.originalTransactionId: \(originalTxId) ✓ (CRITICAL for attribution)")
    } else {
      print("[RampKit]    ⚠️ WARNING: properties.originalTransactionId is MISSING!")
    }
    if let productId = properties["productId"] {
      print("[RampKit]    properties.productId: \(productId)")
    }
    if let amount = properties["amount"], let currency = properties["currency"] {
      print("[RampKit]    properties.amount: \(amount) \(currency)")
    }
    if let paywallId = paywallId {
      print("[RampKit]    context.paywallId: \(paywallId) ✓")
    }

    // Log full JSON for debugging
    if let jsonData = try? JSONSerialization.data(withJSONObject: event, options: .prettyPrinted),
       let jsonString = String(data: jsonData, encoding: .utf8) {
      print("[RampKit] ")
      print("[RampKit] 📄 FULL JSON PAYLOAD:")
      for line in jsonString.components(separatedBy: "\n") {
        print("[RampKit]    \(line)")
      }
    }
    print("[RampKit] ════════════════════════════════════════════════════════════")

    guard let url = URL(string: "https://uustlzuvjmochxkxatfx.supabase.co/functions/v1/app-user-events") else {
      print("[RampKit] ❌ SEND FAILED: Invalid URL")
      return SendEventResult(success: false, statusCode: 0, error: "Invalid URL")
    }

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1c3RsenV2am1vY2h4a3hhdGZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxMDM2NTUsImV4cCI6MjA3NzY3OTY1NX0.d5XsIMGnia4n9Pou0IidipyyEfSlwpXFoeDBufMOEwE", forHTTPHeaderField: "apikey")
    request.setValue("Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1c3RsenV2am1vY2h4a3hhdGZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxMDM2NTUsImV4cCI6MjA3NzY3OTY1NX0.d5XsIMGnia4n9Pou0IidipyyEfSlwpXFoeDBufMOEwE", forHTTPHeaderField: "Authorization")

    do {
      request.httpBody = try JSONSerialization.data(withJSONObject: event)
      let (data, response) = try await URLSession.shared.data(for: request)

      if let httpResponse = response as? HTTPURLResponse {
        let success = httpResponse.statusCode >= 200 && httpResponse.statusCode < 300
        let responseBody = String(data: data, encoding: .utf8) ?? "(empty)"

        // DETAILED LOGGING: Log the response
        print("[RampKit] ")
        print("[RampKit] 📥 RESPONSE FROM BACKEND:")
        print("[RampKit]    HTTP Status: \(httpResponse.statusCode)")
        print("[RampKit]    Success: \(success ? "✅ YES" : "❌ NO")")
        print("[RampKit]    Response Body: \(responseBody)")

        if success {
          print("[RampKit] ")
          print("[RampKit] ✅ EVENT SENT SUCCESSFULLY!")
          print("[RampKit]    originalTransactionId \(properties["originalTransactionId"] ?? "unknown") will be marked as SENT")
          print("[RampKit] ════════════════════════════════════════════════════════════")
        } else {
          print("[RampKit] ")
          print("[RampKit] ❌ EVENT SEND FAILED!")
          print("[RampKit]    Will retry on next app launch")
          print("[RampKit] ════════════════════════════════════════════════════════════")
        }

        return SendEventResult(success: success, statusCode: httpResponse.statusCode, error: success ? nil : "HTTP \(httpResponse.statusCode): \(responseBody)")
      }
      print("[RampKit] ❌ SEND FAILED: No HTTP response")
      return SendEventResult(success: false, statusCode: 0, error: "No HTTP response")
    } catch {
      print("[RampKit] ")
      print("[RampKit] ❌ SEND FAILED: Network error")
      print("[RampKit]    Error: \(error.localizedDescription)")
      print("[RampKit] ════════════════════════════════════════════════════════════")
      return SendEventResult(success: false, statusCode: 0, error: error.localizedDescription)
    }
  }

  // MARK: - Manual Purchase Tracking (Fallback for Superwall/RevenueCat)

  /// Track a purchase manually when you have the transaction IDs
  /// Use this when Superwall or RevenueCat provides the transaction info
  @available(iOS 15.0, *)
  private func trackPurchaseCompletedManually(
    productId: String,
    transactionId: String?,
    originalTransactionId: String?
  ) async {
    print("[RampKit] 📲 Manual purchase tracking called for: \(productId)")

    guard let appId = self.appId, let userId = self.userId else {
      print("[RampKit] ❌ Manual tracking failed: SDK not initialized (appId or userId missing)")
      return
    }

    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

    var properties: [String: Any] = [
      "productId": productId,
      "purchaseDate": formatter.string(from: Date()),
      "source": "manual" // Mark as manually tracked
    ]

    // Add transaction IDs if available
    if let transactionId = transactionId {
      properties["transactionId"] = transactionId
    }
    if let originalTransactionId = originalTransactionId {
      properties["originalTransactionId"] = originalTransactionId
    } else if let transactionId = transactionId {
      // Use transactionId as originalTransactionId if not provided (first purchase)
      properties["originalTransactionId"] = transactionId
    }

    // Try to get product info from StoreKit
    if let product = await getProduct(for: productId) {
      properties["amount"] = product.price
      properties["currency"] = product.priceFormatStyle.currencyCode
      properties["priceFormatted"] = product.displayPrice
      properties["productType"] = mapProductType(product.type)

      if let subscription = product.subscription {
        properties["subscriptionPeriod"] = formatSubscriptionPeriod(subscription.subscriptionPeriod)
        properties["subscriptionGroupId"] = subscription.subscriptionGroupID
      }
    }

    // Get storefront
    if let storefront = await Storefront.current {
      properties["storefront"] = storefront.countryCode
    }

    print("[RampKit] 📤 Sending manual purchase_completed event...")
    await sendPurchaseEvent(
      appId: appId,
      userId: userId,
      eventName: "purchase_completed",
      properties: properties
    )
  }

  /// Track a purchase by looking up the latest transaction for a product
  /// Use this when you only know the productId (Superwall doesn't always provide transaction IDs)
  @available(iOS 15.0, *)
  private func trackPurchaseFromProductId(productId: String) async {
    print("[RampKit] 🔍 Looking up transaction for product: \(productId)")

    // Try to find the latest transaction for this product
    var latestTransaction: Transaction?

    for await result in Transaction.currentEntitlements {
      if case .verified(let transaction) = result {
        if transaction.productID == productId {
          if latestTransaction == nil || transaction.purchaseDate > latestTransaction!.purchaseDate {
            latestTransaction = transaction
          }
        }
      }
    }

    if let transaction = latestTransaction {
      print("[RampKit] ✅ Found transaction for product: \(productId)")
      await handleTransaction(transaction)
    } else {
      print("[RampKit] ⚠️ No transaction found for product, tracking manually: \(productId)")
      // Fall back to manual tracking without transaction IDs
      await trackPurchaseCompletedManually(
        productId: productId,
        transactionId: nil,
        originalTransactionId: nil
      )
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
