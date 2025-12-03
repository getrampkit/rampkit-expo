/**
 * RampKit Native Module Bridge
 * TypeScript interface to the native iOS/Android module
 */

import { requireNativeModule } from "expo-modules-core";
import { Platform } from "react-native";

// Define the native module interface
interface RampKitNativeModule {
  // Device Info
  getDeviceInfo(): Promise<NativeDeviceInfo>;
  getUserId(): Promise<string>;
  getStoredValue(key: string): Promise<string | null>;
  setStoredValue(key: string, value: string): Promise<void>;
  getLaunchTrackingData(): Promise<NativeLaunchData>;
  
  // Haptics
  impactAsync(style: string): Promise<void>;
  notificationAsync(type: string): Promise<void>;
  selectionAsync(): Promise<void>;
  
  // Store Review
  requestReview(): Promise<boolean | void>;
  isReviewAvailable(): Promise<boolean>;
  getStoreUrl(): Promise<string | null>;
  
  // Notifications
  requestNotificationPermissions(options?: NotificationOptions): Promise<NotificationPermissionResult>;
  getNotificationPermissions(): Promise<NotificationPermissionResult>;
}

// Native device info shape
export interface NativeDeviceInfo {
  appUserId: string;
  vendorId: string | null;
  appSessionId: string;
  installDate: string;
  isFirstLaunch: boolean;
  launchCount: number;
  lastLaunchAt: string | null;
  bundleId: string | null;
  appName: string | null;
  appVersion: string | null;
  buildNumber: string | null;
  platform: string;
  platformVersion: string;
  deviceModel: string;
  deviceName: string;
  isSimulator: boolean;
  deviceLanguageCode: string | null;
  deviceLocale: string;
  regionCode: string | null;
  preferredLanguage: string | null;
  preferredLanguages: string[];
  deviceCurrencyCode: string | null;
  deviceCurrencySymbol: string | null;
  timezoneIdentifier: string;
  timezoneOffsetSeconds: number;
  interfaceStyle: string;
  screenWidth: number;
  screenHeight: number;
  screenScale: number;
  isLowPowerMode: boolean;
  totalMemoryBytes: number;
  collectedAt: string;
}

export interface NativeLaunchData {
  installDate: string;
  isFirstLaunch: boolean;
  launchCount: number;
  lastLaunchAt: string | null;
}

export interface NotificationOptions {
  ios?: {
    allowAlert?: boolean;
    allowBadge?: boolean;
    allowSound?: boolean;
  };
  android?: {
    channelId?: string;
    name?: string;
    importance?: "MAX" | "HIGH" | "DEFAULT" | "LOW" | "MIN";
  };
}

export interface NotificationPermissionResult {
  granted: boolean;
  status: "undetermined" | "denied" | "granted" | "provisional" | "ephemeral";
  canAskAgain: boolean;
  ios?: {
    alertSetting?: string;
    badgeSetting?: string;
    soundSetting?: string;
    lockScreenSetting?: string;
    notificationCenterSetting?: string;
  };
  error?: string;
}

// Impact feedback styles
export type ImpactStyle = "light" | "medium" | "heavy" | "rigid" | "soft";

// Notification feedback types
export type NotificationType = "success" | "warning" | "error";

// Get the native module
let RampKitNativeModule: RampKitNativeModule;

try {
  RampKitNativeModule = requireNativeModule("RampKit");
} catch (e) {
  console.warn(
    "[RampKit] Native module not available. Using JavaScript fallback."
  );
  RampKitNativeModule = createFallbackModule();
}

// Fallback module for when native module is not available
function createFallbackModule(): RampKitNativeModule {
  return {
    async getDeviceInfo(): Promise<NativeDeviceInfo> {
      return getFallbackDeviceInfo();
    },
    async getUserId(): Promise<string> {
      return generateFallbackUserId();
    },
    async getStoredValue(_key: string): Promise<string | null> {
      return null;
    },
    async setStoredValue(_key: string, _value: string): Promise<void> {},
    async getLaunchTrackingData(): Promise<NativeLaunchData> {
      return {
        installDate: new Date().toISOString(),
        isFirstLaunch: true,
        launchCount: 1,
        lastLaunchAt: null,
      };
    },
    async impactAsync(_style: string): Promise<void> {},
    async notificationAsync(_type: string): Promise<void> {},
    async selectionAsync(): Promise<void> {},
    async requestReview(): Promise<boolean> {
      return false;
    },
    async isReviewAvailable(): Promise<boolean> {
      return false;
    },
    async getStoreUrl(): Promise<string | null> {
      return null;
    },
    async requestNotificationPermissions(_options?: NotificationOptions): Promise<NotificationPermissionResult> {
      return { granted: false, status: "denied", canAskAgain: false };
    },
    async getNotificationPermissions(): Promise<NotificationPermissionResult> {
      return { granted: false, status: "denied", canAskAgain: false };
    },
  };
}

function generateFallbackUserId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getFallbackDeviceInfo(): NativeDeviceInfo {
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
    platform: Platform.OS === "ios" ? "iOS" : "Android",
    platformVersion: String(Platform.Version),
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
export default RampKitNativeModule;

// ============================================================================
// Convenience exports for Device Info
// ============================================================================

export async function getDeviceInfo(): Promise<NativeDeviceInfo> {
  return RampKitNativeModule.getDeviceInfo();
}

export async function getUserId(): Promise<string> {
  return RampKitNativeModule.getUserId();
}

export async function getStoredValue(key: string): Promise<string | null> {
  return RampKitNativeModule.getStoredValue(key);
}

export async function setStoredValue(key: string, value: string): Promise<void> {
  return RampKitNativeModule.setStoredValue(key, value);
}

export async function getLaunchTrackingData(): Promise<NativeLaunchData> {
  return RampKitNativeModule.getLaunchTrackingData();
}

// ============================================================================
// Haptics API (replaces expo-haptics)
// ============================================================================

export const Haptics = {
  /**
   * Trigger an impact haptic feedback
   */
  async impactAsync(style: ImpactStyle = "medium"): Promise<void> {
    try {
      await RampKitNativeModule.impactAsync(style);
    } catch (e) {
      // Silently fail - haptics are non-critical
    }
  },

  /**
   * Trigger a notification haptic feedback
   */
  async notificationAsync(type: NotificationType = "success"): Promise<void> {
    try {
      await RampKitNativeModule.notificationAsync(type);
    } catch (e) {
      // Silently fail
    }
  },

  /**
   * Trigger a selection haptic feedback
   */
  async selectionAsync(): Promise<void> {
    try {
      await RampKitNativeModule.selectionAsync();
    } catch (e) {
      // Silently fail
    }
  },
};

// ============================================================================
// Store Review API (replaces expo-store-review)
// ============================================================================

export const StoreReview = {
  /**
   * Request an in-app review
   */
  async requestReview(): Promise<void> {
    try {
      await RampKitNativeModule.requestReview();
    } catch (e) {
      console.warn("[RampKit] Failed to request review:", e);
    }
  },

  /**
   * Check if in-app review is available
   */
  async isAvailableAsync(): Promise<boolean> {
    try {
      return await RampKitNativeModule.isReviewAvailable();
    } catch (e) {
      return false;
    }
  },

  /**
   * Check if the review action is available
   */
  async hasAction(): Promise<boolean> {
    return true;
  },

  /**
   * Get the store URL for the app
   */
  storeUrl(): string | null {
    // This is synchronous in the original API, so we can't await here
    // Return null and let callers handle it
    return null;
  },
};

// ============================================================================
// Notifications API (replaces expo-notifications)
// ============================================================================

export const Notifications = {
  /**
   * Request notification permissions
   */
  async requestPermissionsAsync(options?: NotificationOptions): Promise<NotificationPermissionResult> {
    try {
      return await RampKitNativeModule.requestNotificationPermissions(options);
    } catch (e) {
      return { granted: false, status: "denied", canAskAgain: false };
    }
  },

  /**
   * Get current notification permissions
   */
  async getPermissionsAsync(): Promise<NotificationPermissionResult> {
    try {
      return await RampKitNativeModule.getNotificationPermissions();
    } catch (e) {
      return { granted: false, status: "denied", canAskAgain: false };
    }
  },

  /**
   * Set notification handler (no-op in native implementation)
   * The app should handle this separately if needed
   */
  setNotificationHandler(_handler: any): void {
    // No-op - notification handling is done by the app
  },

  /**
   * Android notification channel creation is handled in requestPermissionsAsync
   */
  async setNotificationChannelAsync(_channelId: string, _options: any): Promise<void> {
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
