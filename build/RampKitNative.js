"use strict";
/**
 * RampKit Native Module Bridge
 * TypeScript interface to the native iOS/Android module
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionObserver = exports.Notifications = exports.StoreReview = exports.Haptics = void 0;
exports.isNativeModuleAvailable = isNativeModuleAvailable;
exports.getDeviceInfo = getDeviceInfo;
exports.getUserId = getUserId;
exports.getStoredValue = getStoredValue;
exports.setStoredValue = setStoredValue;
exports.getLaunchTrackingData = getLaunchTrackingData;
const expo_modules_core_1 = require("expo-modules-core");
const react_native_1 = require("react-native");
// Get the native module
let RampKitNativeModule;
let isNativeModuleLoaded = false;
try {
    RampKitNativeModule = (0, expo_modules_core_1.requireNativeModule)("RampKit");
    isNativeModuleLoaded = true;
    console.log("[RampKit] ✅ Native module loaded successfully");
}
catch (e) {
    console.warn("[RampKit] ⚠️ Native module not available. Using JavaScript fallback.", e);
    RampKitNativeModule = createFallbackModule();
}
// Export for debugging
function isNativeModuleAvailable() {
    return isNativeModuleLoaded;
}
// Fallback module for when native module is not available
function createFallbackModule() {
    return {
        async getDeviceInfo() {
            return getFallbackDeviceInfo();
        },
        async getUserId() {
            return generateFallbackUserId();
        },
        async getStoredValue(_key) {
            return null;
        },
        async setStoredValue(_key, _value) { },
        async getLaunchTrackingData() {
            return {
                installDate: new Date().toISOString(),
                isFirstLaunch: true,
                launchCount: 1,
                lastLaunchAt: null,
            };
        },
        async impactAsync(_style) { },
        async notificationAsync(_type) { },
        async selectionAsync() { },
        async requestReview() {
            return false;
        },
        async isReviewAvailable() {
            return false;
        },
        async getStoreUrl() {
            return null;
        },
        async requestNotificationPermissions(_options) {
            return { granted: false, status: "denied", canAskAgain: false };
        },
        async getNotificationPermissions() {
            return { granted: false, status: "denied", canAskAgain: false };
        },
        async startTransactionObserver(_appId) {
            return {
                configured: false,
                appId: _appId,
                userId: "fallback",
                previouslyTrackedCount: 0,
                iOSVersion: "N/A",
                listenerStarted: false,
                error: "Native module not available - using fallback"
            };
        },
        async stopTransactionObserver() { },
        async clearTrackedTransactions() { return 0; },
        async recheckEntitlements() {
            return {
                totalFound: 0,
                alreadyTracked: 0,
                newPurchases: 0,
                productIds: [],
                newProductIds: [],
                trackedIdsCount: 0,
                error: "Native module not available - using fallback"
            };
        },
        async trackPurchaseCompleted(_productId, _transactionId, _originalTransactionId) { },
        async trackPurchaseFromProduct(_productId) { },
    };
}
function generateFallbackUserId() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
function getFallbackDeviceInfo() {
    const now = new Date().toISOString();
    return {
        appUserId: generateFallbackUserId(),
        vendorId: null,
        appSessionId: generateFallbackUserId(),
        installDate: now,
        isFirstLaunch: true,
        launchCount: 1,
        lastLaunchAt: null,
        bundleId: null,
        appName: null,
        appVersion: null,
        buildNumber: null,
        platform: react_native_1.Platform.OS === "ios" ? "iOS" : "Android",
        platformVersion: String(react_native_1.Platform.Version),
        deviceModel: "unknown",
        deviceName: "unknown",
        isSimulator: false,
        deviceLanguageCode: null,
        deviceLocale: "en_US",
        regionCode: null,
        preferredLanguage: null,
        preferredLanguages: [],
        deviceCurrencyCode: null,
        deviceCurrencySymbol: null,
        timezoneIdentifier: "UTC",
        timezoneOffsetSeconds: 0,
        interfaceStyle: "unspecified",
        screenWidth: 0,
        screenHeight: 0,
        screenScale: 1,
        isLowPowerMode: false,
        totalMemoryBytes: 0,
        collectedAt: now,
    };
}
// Export the native module
exports.default = RampKitNativeModule;
// ============================================================================
// Convenience exports for Device Info
// ============================================================================
async function getDeviceInfo() {
    return RampKitNativeModule.getDeviceInfo();
}
async function getUserId() {
    return RampKitNativeModule.getUserId();
}
async function getStoredValue(key) {
    return RampKitNativeModule.getStoredValue(key);
}
async function setStoredValue(key, value) {
    return RampKitNativeModule.setStoredValue(key, value);
}
async function getLaunchTrackingData() {
    return RampKitNativeModule.getLaunchTrackingData();
}
// ============================================================================
// Haptics API (replaces expo-haptics)
// ============================================================================
exports.Haptics = {
    /**
     * Trigger an impact haptic feedback
     */
    async impactAsync(style = "medium") {
        try {
            await RampKitNativeModule.impactAsync(style);
        }
        catch (e) {
            // Silently fail - haptics are non-critical
        }
    },
    /**
     * Trigger a notification haptic feedback
     */
    async notificationAsync(type = "success") {
        try {
            await RampKitNativeModule.notificationAsync(type);
        }
        catch (e) {
            // Silently fail
        }
    },
    /**
     * Trigger a selection haptic feedback
     */
    async selectionAsync() {
        try {
            await RampKitNativeModule.selectionAsync();
        }
        catch (e) {
            // Silently fail
        }
    },
};
// ============================================================================
// Store Review API (replaces expo-store-review)
// ============================================================================
exports.StoreReview = {
    /**
     * Request an in-app review
     */
    async requestReview() {
        try {
            await RampKitNativeModule.requestReview();
        }
        catch (e) {
            console.warn("[RampKit] Failed to request review:", e);
        }
    },
    /**
     * Check if in-app review is available
     */
    async isAvailableAsync() {
        try {
            return await RampKitNativeModule.isReviewAvailable();
        }
        catch (e) {
            return false;
        }
    },
    /**
     * Check if the review action is available
     */
    async hasAction() {
        return true;
    },
    /**
     * Get the store URL for the app
     */
    storeUrl() {
        // This is synchronous in the original API, so we can't await here
        // Return null and let callers handle it
        return null;
    },
};
// ============================================================================
// Notifications API (replaces expo-notifications)
// ============================================================================
exports.Notifications = {
    /**
     * Request notification permissions
     */
    async requestPermissionsAsync(options) {
        try {
            return await RampKitNativeModule.requestNotificationPermissions(options);
        }
        catch (e) {
            return { granted: false, status: "denied", canAskAgain: false };
        }
    },
    /**
     * Get current notification permissions
     */
    async getPermissionsAsync() {
        try {
            return await RampKitNativeModule.getNotificationPermissions();
        }
        catch (e) {
            return { granted: false, status: "denied", canAskAgain: false };
        }
    },
    /**
     * Set notification handler (no-op in native implementation)
     * The app should handle this separately if needed
     */
    setNotificationHandler(_handler) {
        // No-op - notification handling is done by the app
    },
    /**
     * Android notification channel creation is handled in requestPermissionsAsync
     */
    async setNotificationChannelAsync(_channelId, _options) {
        // No-op - handled in requestPermissionsAsync
    },
    // Android importance constants for compatibility
    AndroidImportance: {
        MAX: 5,
        HIGH: 4,
        DEFAULT: 3,
        LOW: 2,
        MIN: 1,
    },
};
// ============================================================================
// Transaction Observer API (StoreKit 2 / Google Play Billing)
// ============================================================================
/**
 * Helper function to log entitlement check results with full details
 */
function logEntitlementCheckResult(result, context) {
    console.log("[RampKit] ");
    console.log("[RampKit] ═══════════════════════════════════════════════════════════");
    console.log(`[RampKit] 📊 ENTITLEMENT CHECK RESULT (${context})`);
    console.log("[RampKit] ═══════════════════════════════════════════════════════════");
    console.log("[RampKit]    Total entitlements found:", result.totalFound);
    console.log("[RampKit]    Already sent to backend: ", result.alreadyTracked);
    console.log("[RampKit]    New events sent:         ", result.newPurchases);
    console.log("[RampKit]    Tracked IDs in storage:  ", result.trackedIdsCount);
    console.log("[RampKit]    Product IDs:             ", result.productIds);
    // Log already tracked transactions with full details
    if (result.alreadyTrackedDetails && result.alreadyTrackedDetails.length > 0) {
        console.log("[RampKit] ");
        console.log("[RampKit] ✅ ALREADY SENT TRANSACTIONS:");
        for (const tx of result.alreadyTrackedDetails) {
            console.log("[RampKit]    ────────────────────────────────────────");
            console.log("[RampKit]    📦 Product:", tx.productId);
            console.log("[RampKit]       Transaction ID:", tx.transactionId);
            console.log("[RampKit]       Original Transaction ID:", tx.originalTransactionId);
            console.log("[RampKit]       Purchase Date:", tx.purchaseDate);
            if (tx.expirationDate) {
                console.log("[RampKit]       Expiration Date:", tx.expirationDate);
            }
            if (tx.environment) {
                console.log("[RampKit]       Environment:", tx.environment);
            }
            console.log("[RampKit]       Status: ✅ ALREADY SENT TO BACKEND");
        }
    }
    // Log newly sent events
    if (result.sentEvents && result.sentEvents.length > 0) {
        console.log("[RampKit] ");
        console.log("[RampKit] 📤 NEWLY SENT EVENTS:");
        for (const event of result.sentEvents) {
            console.log("[RampKit]    ────────────────────────────────────────");
            console.log("[RampKit]    📦 Product:", event.productId);
            console.log("[RampKit]       Transaction ID:", event.transactionId);
            console.log("[RampKit]       Original Transaction ID:", event.originalTransactionId);
            console.log("[RampKit]       Purchase Date:", event.purchaseDate);
            console.log("[RampKit]       Status:", event.status === "sent" ? "✅ SENT" : `❌ ${event.status.toUpperCase()}`);
            if (event.httpStatus) {
                console.log("[RampKit]       HTTP Status:", event.httpStatus);
            }
            if (event.error) {
                console.log("[RampKit]       Error:", event.error);
            }
        }
    }
    // Log skipped transactions
    if (result.skippedReasons && result.skippedReasons.length > 0) {
        console.log("[RampKit] ");
        console.log("[RampKit] ⏭️ SKIPPED TRANSACTIONS:");
        for (const skipped of result.skippedReasons) {
            console.log("[RampKit]    - Product:", skipped.productId, "| Reason:", skipped.reason);
        }
    }
    if (result.error) {
        console.log("[RampKit] ");
        console.log("[RampKit] ⚠️ Error:", result.error);
    }
    console.log("[RampKit] ═══════════════════════════════════════════════════════════");
    console.log("[RampKit] ");
}
exports.TransactionObserver = {
    /**
     * Start listening for purchase transactions
     * Automatically tracks purchases to the RampKit backend
     * @param appId - The RampKit app ID
     */
    async start(appId) {
        console.log("[RampKit] 🚀 TransactionObserver.start() called");
        console.log("[RampKit]    - appId:", appId);
        console.log("[RampKit]    - Native module loaded:", isNativeModuleLoaded);
        try {
            console.log("[RampKit] 📡 Calling native startTransactionObserver...");
            const result = await RampKitNativeModule.startTransactionObserver(appId);
            // Log the full result for debugging
            console.log("[RampKit] ✅ Transaction observer result:");
            console.log("[RampKit]    - configured:", result.configured);
            console.log("[RampKit]    - userId:", result.userId);
            console.log("[RampKit]    - iOSVersion:", result.iOSVersion);
            console.log("[RampKit]    - previouslyTrackedCount:", result.previouslyTrackedCount);
            console.log("[RampKit]    - listenerStarted:", result.listenerStarted);
            if (result.entitlementCheck) {
                logEntitlementCheckResult(result.entitlementCheck, "STARTUP");
            }
            if (result.error) {
                console.warn("[RampKit] ⚠️ Error:", result.error);
            }
            return result;
        }
        catch (e) {
            console.warn("[RampKit] ❌ Failed to start transaction observer:", e);
            return null;
        }
    },
    /**
     * Stop listening for purchase transactions
     */
    async stop() {
        try {
            await RampKitNativeModule.stopTransactionObserver();
            console.log("[RampKit] Transaction observer stopped");
        }
        catch (e) {
            console.warn("[RampKit] Failed to stop transaction observer:", e);
        }
    },
    /**
     * Manually track a purchase completion
     * Use this when Superwall/RevenueCat reports a purchase but the automatic
     * observer doesn't catch it (they finish transactions before we see them)
     *
     * @param productId - The product ID (e.g., "com.app.yearly")
     * @param transactionId - Optional transaction ID if available
     * @param originalTransactionId - Optional original transaction ID (for renewals)
     */
    async trackPurchase(productId, transactionId, originalTransactionId) {
        try {
            console.log("[RampKit] Manually tracking purchase:", productId);
            await RampKitNativeModule.trackPurchaseCompleted(productId, transactionId, originalTransactionId);
            console.log("[RampKit] Purchase tracked successfully:", productId);
        }
        catch (e) {
            console.warn("[RampKit] Failed to track purchase:", e);
        }
    },
    /**
     * Track a purchase by looking up the product's latest transaction
     * Use this when you only have the productId (common with Superwall)
     *
     * @param productId - The product ID to look up and track
     */
    async trackPurchaseByProductId(productId) {
        try {
            console.log("[RampKit] Looking up and tracking purchase for:", productId);
            await RampKitNativeModule.trackPurchaseFromProduct(productId);
            console.log("[RampKit] Purchase lookup and tracking complete:", productId);
        }
        catch (e) {
            console.warn("[RampKit] Failed to track purchase by product:", e);
        }
    },
    /**
     * Clear all tracked transaction IDs from storage
     * Use this for testing to re-trigger tracking of existing purchases
     *
     * @returns The number of tracked transactions that were cleared
     */
    async clearTracked() {
        try {
            console.log("[RampKit] 🗑️ Clearing tracked transaction IDs...");
            const count = await RampKitNativeModule.clearTrackedTransactions();
            console.log("[RampKit] ✅ Cleared", count, "tracked transaction IDs");
            return count;
        }
        catch (e) {
            console.warn("[RampKit] ❌ Failed to clear tracked transactions:", e);
            return 0;
        }
    },
    /**
     * Re-check current entitlements for any new purchases
     * Call this after onboarding finishes or after a paywall is shown
     * to catch any purchases that may have been made
     *
     * @returns The entitlement check result with details of all transactions
     */
    async recheck() {
        console.log("[RampKit] 🔄 Re-checking entitlements...");
        try {
            const result = await RampKitNativeModule.recheckEntitlements();
            logEntitlementCheckResult(result, "RECHECK");
            return result;
        }
        catch (e) {
            console.warn("[RampKit] ❌ Failed to recheck entitlements:", e);
            return null;
        }
    },
};
