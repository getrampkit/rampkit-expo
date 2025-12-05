"use strict";
/**
 * RampKit Native Module Bridge
 * TypeScript interface to the native iOS/Android module
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionObserver = exports.Notifications = exports.StoreReview = exports.Haptics = void 0;
exports.getDeviceInfo = getDeviceInfo;
exports.getUserId = getUserId;
exports.getStoredValue = getStoredValue;
exports.setStoredValue = setStoredValue;
exports.getLaunchTrackingData = getLaunchTrackingData;
const expo_modules_core_1 = require("expo-modules-core");
const react_native_1 = require("react-native");
// Get the native module
let RampKitNativeModule;
try {
    RampKitNativeModule = (0, expo_modules_core_1.requireNativeModule)("RampKit");
}
catch (e) {
    console.warn("[RampKit] Native module not available. Using JavaScript fallback.");
    RampKitNativeModule = createFallbackModule();
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
        async startTransactionObserver(_appId) { },
        async stopTransactionObserver() { },
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
exports.TransactionObserver = {
    /**
     * Start listening for purchase transactions
     * Automatically tracks purchases to the RampKit backend
     * @param appId - The RampKit app ID
     */
    async start(appId) {
        try {
            await RampKitNativeModule.startTransactionObserver(appId);
            console.log("[RampKit] Transaction observer started");
        }
        catch (e) {
            console.warn("[RampKit] Failed to start transaction observer:", e);
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
};
