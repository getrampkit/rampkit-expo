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
const Logger_1 = require("./Logger");
// Get the native module
let RampKitNativeModule;
let isNativeModuleLoaded = false;
try {
    RampKitNativeModule = (0, expo_modules_core_1.requireNativeModule)("RampKit");
    isNativeModuleLoaded = true;
    // Don't log on success - too noisy
}
catch (e) {
    Logger_1.Logger.warn("Native module not available. Using JavaScript fallback.");
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
            Logger_1.Logger.warn("Failed to request review:", e);
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
 * Helper function to log entitlement check results (only in verbose mode)
 */
function logEntitlementCheckResult(result, context) {
    if (!(0, Logger_1.isVerboseLogging)()) {
        return;
    }
    Logger_1.Logger.verbose(`Entitlement check (${context}): found=${result.totalFound}, new=${result.newPurchases}, tracked=${result.alreadyTracked}`);
    if (result.newPurchases > 0 && result.sentEvents) {
        for (const event of result.sentEvents) {
            Logger_1.Logger.verbose(`  New purchase: ${event.productId} (${event.status})`);
        }
    }
    if (result.error) {
        Logger_1.Logger.warn(`Entitlement check error: ${result.error}`);
    }
}
exports.TransactionObserver = {
    /**
     * Start listening for purchase transactions
     * Automatically tracks purchases to the RampKit backend
     * @param appId - The RampKit app ID
     */
    async start(appId) {
        Logger_1.Logger.verbose("Starting transaction observer...");
        try {
            const result = await RampKitNativeModule.startTransactionObserver(appId);
            Logger_1.Logger.verbose(`Transaction observer started: configured=${result.configured}, tracked=${result.previouslyTrackedCount}`);
            if (result.entitlementCheck) {
                logEntitlementCheckResult(result.entitlementCheck, "STARTUP");
            }
            if (result.error) {
                Logger_1.Logger.warn("Transaction observer error:", result.error);
            }
            return result;
        }
        catch (e) {
            Logger_1.Logger.warn("Failed to start transaction observer:", e);
            return null;
        }
    },
    /**
     * Stop listening for purchase transactions
     */
    async stop() {
        try {
            await RampKitNativeModule.stopTransactionObserver();
            Logger_1.Logger.verbose("Transaction observer stopped");
        }
        catch (e) {
            Logger_1.Logger.warn("Failed to stop transaction observer:", e);
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
            Logger_1.Logger.verbose("Tracking purchase:", productId);
            await RampKitNativeModule.trackPurchaseCompleted(productId, transactionId, originalTransactionId);
            Logger_1.Logger.verbose("Purchase tracked:", productId);
        }
        catch (e) {
            Logger_1.Logger.warn("Failed to track purchase:", e);
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
            Logger_1.Logger.verbose("Looking up purchase for:", productId);
            await RampKitNativeModule.trackPurchaseFromProduct(productId);
            Logger_1.Logger.verbose("Purchase tracked:", productId);
        }
        catch (e) {
            Logger_1.Logger.warn("Failed to track purchase by product:", e);
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
            Logger_1.Logger.verbose("Clearing tracked transaction IDs...");
            const count = await RampKitNativeModule.clearTrackedTransactions();
            Logger_1.Logger.verbose("Cleared", count, "tracked transaction IDs");
            return count;
        }
        catch (e) {
            Logger_1.Logger.warn("Failed to clear tracked transactions:", e);
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
        Logger_1.Logger.verbose("Re-checking entitlements...");
        try {
            const result = await RampKitNativeModule.recheckEntitlements();
            logEntitlementCheckResult(result, "RECHECK");
            return result;
        }
        catch (e) {
            Logger_1.Logger.warn("Failed to recheck entitlements:", e);
            return null;
        }
    },
};
