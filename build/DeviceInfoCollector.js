"use strict";
/**
 * RampKit Device Info Collector
 * Collects device information using native modules for the /app-users endpoint
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSessionStartTime = getSessionStartTime;
exports.getSessionDurationSeconds = getSessionDurationSeconds;
exports.collectDeviceInfo = collectDeviceInfo;
exports.resetSession = resetSession;
exports.buildRampKitContext = buildRampKitContext;
const react_native_1 = require("react-native");
const RampKitNative_1 = __importDefault(require("./RampKitNative"));
const constants_1 = require("./constants");
// Session-level data (regenerated each app launch)
let sessionId = null;
let sessionStartTime = null;
/**
 * Get session start time
 */
function getSessionStartTime() {
    return sessionStartTime;
}
/**
 * Get the current session duration in seconds
 */
function getSessionDurationSeconds() {
    if (!sessionStartTime)
        return 0;
    return Math.floor((Date.now() - sessionStartTime.getTime()) / 1000);
}
/**
 * Collect all device information using native module
 */
async function collectDeviceInfo() {
    try {
        // Get device info from native module
        const nativeInfo = await RampKitNative_1.default.getDeviceInfo();
        // Initialize session
        sessionId = nativeInfo.appSessionId;
        sessionStartTime = new Date();
        // Map native info to DeviceInfo type
        const deviceInfo = {
            // User & Session Identifiers
            appUserId: nativeInfo.appUserId,
            vendorId: nativeInfo.vendorId,
            appSessionId: nativeInfo.appSessionId,
            // Launch Tracking
            installDate: nativeInfo.installDate,
            isFirstLaunch: nativeInfo.isFirstLaunch,
            launchCount: nativeInfo.launchCount,
            lastLaunchAt: nativeInfo.lastLaunchAt,
            // App Info
            bundleId: nativeInfo.bundleId,
            appName: nativeInfo.appName,
            appVersion: nativeInfo.appVersion,
            buildNumber: nativeInfo.buildNumber,
            sdkVersion: constants_1.SDK_VERSION,
            // Platform Info
            platform: mapPlatform(nativeInfo.platform),
            platformVersion: nativeInfo.platformVersion,
            platformWrapper: "Expo",
            // Device Info
            deviceModel: nativeInfo.deviceModel,
            deviceName: nativeInfo.deviceName,
            isSimulator: nativeInfo.isSimulator,
            // Locale & Language
            deviceLanguageCode: nativeInfo.deviceLanguageCode,
            deviceLocale: nativeInfo.deviceLocale,
            regionCode: nativeInfo.regionCode,
            preferredLanguage: nativeInfo.preferredLanguage,
            preferredLanguages: nativeInfo.preferredLanguages,
            // Currency
            deviceCurrencyCode: nativeInfo.deviceCurrencyCode,
            deviceCurrencySymbol: nativeInfo.deviceCurrencySymbol,
            // Timezone
            timezoneIdentifier: nativeInfo.timezoneIdentifier,
            timezoneOffsetSeconds: nativeInfo.timezoneOffsetSeconds,
            // UI
            interfaceStyle: mapInterfaceStyle(nativeInfo.interfaceStyle),
            // Screen
            screenWidth: nativeInfo.screenWidth,
            screenHeight: nativeInfo.screenHeight,
            screenScale: nativeInfo.screenScale,
            // Device Status
            isLowPowerMode: nativeInfo.isLowPowerMode,
            // Storage (skip for performance)
            freeStorageBytes: null,
            totalStorageBytes: null,
            // Memory
            totalMemoryBytes: nativeInfo.totalMemoryBytes,
            // Apple Search Ads (skip for performance)
            isAppleSearchAdsAttribution: false,
            appleSearchAdsToken: null,
            // SDK Capabilities
            capabilities: [...constants_1.CAPABILITIES],
            // Network (could add later)
            connectionType: null,
            // Timestamp
            collectedAt: nativeInfo.collectedAt,
        };
        console.log("[RampKit] DeviceInfo: Collected from native module");
        return deviceInfo;
    }
    catch (error) {
        console.warn("[RampKit] DeviceInfo: Failed to collect from native module", error);
        // Return minimal fallback
        return getFallbackDeviceInfo();
    }
}
/**
 * Map platform string to typed platform
 */
function mapPlatform(platform) {
    if (platform === "iPadOS")
        return "iPadOS";
    if (platform === "iOS")
        return "iOS";
    return "Android";
}
/**
 * Map interface style string to typed style
 */
function mapInterfaceStyle(style) {
    if (style === "light")
        return "light";
    if (style === "dark")
        return "dark";
    return "unspecified";
}
/**
 * Get fallback device info when native module fails
 */
function getFallbackDeviceInfo() {
    const now = new Date().toISOString();
    const fallbackUserId = generateFallbackUuid();
    sessionId = generateFallbackUuid();
    sessionStartTime = new Date();
    return {
        appUserId: fallbackUserId,
        vendorId: null,
        appSessionId: sessionId,
        installDate: now,
        isFirstLaunch: true,
        launchCount: 1,
        lastLaunchAt: null,
        bundleId: null,
        appName: null,
        appVersion: null,
        buildNumber: null,
        sdkVersion: constants_1.SDK_VERSION,
        platform: react_native_1.Platform.OS === "ios" ? "iOS" : "Android",
        platformVersion: String(react_native_1.Platform.Version),
        platformWrapper: "Expo",
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
        timezoneOffsetSeconds: new Date().getTimezoneOffset() * -60,
        interfaceStyle: "unspecified",
        screenWidth: 0,
        screenHeight: 0,
        screenScale: 1,
        isLowPowerMode: false,
        freeStorageBytes: null,
        totalStorageBytes: null,
        totalMemoryBytes: 0,
        isAppleSearchAdsAttribution: false,
        appleSearchAdsToken: null,
        capabilities: [...constants_1.CAPABILITIES],
        connectionType: null,
        collectedAt: now,
    };
}
/**
 * Generate a fallback UUID
 */
function generateFallbackUuid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
/**
 * Reset session (call when app is fully restarted)
 */
function resetSession() {
    sessionId = null;
    sessionStartTime = null;
}
/**
 * Build RampKit context from DeviceInfo for WebView template resolution
 * This creates the device/user context that gets injected as window.rampkitContext
 */
function buildRampKitContext(deviceInfo) {
    // Calculate days since install
    const daysSinceInstall = calculateDaysSinceInstall(deviceInfo.installDate);
    const device = {
        platform: deviceInfo.platform,
        model: deviceInfo.deviceModel,
        locale: deviceInfo.deviceLocale,
        language: deviceInfo.deviceLanguageCode || deviceInfo.deviceLocale.split("_")[0] || "en",
        country: deviceInfo.regionCode || deviceInfo.deviceLocale.split("_")[1] || "US",
        currencyCode: deviceInfo.deviceCurrencyCode || "USD",
        currencySymbol: deviceInfo.deviceCurrencySymbol || "$",
        appVersion: deviceInfo.appVersion || "1.0.0",
        buildNumber: deviceInfo.buildNumber || "1",
        bundleId: deviceInfo.bundleId || "",
        interfaceStyle: deviceInfo.interfaceStyle,
        timezone: deviceInfo.timezoneOffsetSeconds,
        daysSinceInstall,
    };
    const user = {
        id: deviceInfo.appUserId,
        isNewUser: deviceInfo.isFirstLaunch,
        hasAppleSearchAdsAttribution: deviceInfo.isAppleSearchAdsAttribution,
        sessionId: deviceInfo.appSessionId,
        installedAt: deviceInfo.installDate,
    };
    return { device, user };
}
/**
 * Calculate days since install from install date string
 */
function calculateDaysSinceInstall(installDateString) {
    try {
        const installDate = new Date(installDateString);
        const now = new Date();
        const diffMs = now.getTime() - installDate.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        return Math.max(0, diffDays);
    }
    catch (_a) {
        return 0;
    }
}
