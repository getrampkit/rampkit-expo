/**
 * RampKit Device Info Collector
 * Collects device information using native modules for the /app-users endpoint
 */

import { Platform } from "react-native";
import RampKitNative, { NativeDeviceInfo } from "./RampKitNative";
import { DeviceInfo, RampKitContext, RampKitDeviceContext, RampKitUserContext } from "./types";
import { SDK_VERSION, CAPABILITIES } from "./constants";

// Session-level data (regenerated each app launch)
let sessionId: string | null = null;
let sessionStartTime: Date | null = null;

/**
 * Get session start time
 */
export function getSessionStartTime(): Date | null {
  return sessionStartTime;
}

/**
 * Get the current session duration in seconds
 */
export function getSessionDurationSeconds(): number {
  if (!sessionStartTime) return 0;
  return Math.floor((Date.now() - sessionStartTime.getTime()) / 1000);
}

/**
 * Collect all device information using native module
 */
export async function collectDeviceInfo(): Promise<DeviceInfo> {
  try {
    // Get device info from native module
    const nativeInfo: NativeDeviceInfo = await RampKitNative.getDeviceInfo();

    // Initialize session
    sessionId = nativeInfo.appSessionId;
    sessionStartTime = new Date();

    // Map native info to DeviceInfo type
    const deviceInfo: DeviceInfo = {
      // User & Session Identifiers
      appUserId: nativeInfo.appUserId,
      appUserID: null, // Custom app user ID is set separately via config or setAppUserID()
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
      sdkVersion: SDK_VERSION,

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
      capabilities: [...CAPABILITIES],

      // Network (could add later)
      connectionType: null,

      // Timestamp
      collectedAt: nativeInfo.collectedAt,
    };

    console.log("[RampKit] DeviceInfo: Collected from native module");
    return deviceInfo;
  } catch (error) {
    console.warn("[RampKit] DeviceInfo: Failed to collect from native module", error);
    // Return minimal fallback
    return getFallbackDeviceInfo();
  }
}

/**
 * Map platform string to typed platform
 */
function mapPlatform(platform: string): "iOS" | "Android" | "iPadOS" {
  if (platform === "iPadOS") return "iPadOS";
  if (platform === "iOS") return "iOS";
  return "Android";
}

/**
 * Map interface style string to typed style
 */
function mapInterfaceStyle(style: string): "light" | "dark" | "unspecified" {
  if (style === "light") return "light";
  if (style === "dark") return "dark";
  return "unspecified";
}

/**
 * Get fallback device info when native module fails
 */
function getFallbackDeviceInfo(): DeviceInfo {
  const now = new Date().toISOString();
  const fallbackUserId = generateFallbackUuid();

  sessionId = generateFallbackUuid();
  sessionStartTime = new Date();

  return {
    appUserId: fallbackUserId,
    appUserID: null, // Custom app user ID is set separately via config or setAppUserID()
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
    sdkVersion: SDK_VERSION,
    platform: Platform.OS === "ios" ? "iOS" : "Android",
    platformVersion: String(Platform.Version),
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
    capabilities: [...CAPABILITIES],
    connectionType: null,
    collectedAt: now,
  };
}

/**
 * Generate a fallback UUID
 */
function generateFallbackUuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Reset session (call when app is fully restarted)
 */
export function resetSession(): void {
  sessionId = null;
  sessionStartTime = null;
}

/**
 * Build RampKit context from DeviceInfo for WebView template resolution
 * This creates the device/user context that gets injected as window.rampkitContext
 */
export function buildRampKitContext(deviceInfo: DeviceInfo): RampKitContext {
  // Calculate days since install
  const daysSinceInstall = calculateDaysSinceInstall(deviceInfo.installDate);

  const device: RampKitDeviceContext = {
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

  const user: RampKitUserContext = {
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
function calculateDaysSinceInstall(installDateString: string): number {
  try {
    const installDate = new Date(installDateString);
    const now = new Date();
    const diffMs = now.getTime() - installDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  } catch {
    return 0;
  }
}
