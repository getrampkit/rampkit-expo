/**
 * RampKit Native Module Bridge
 * TypeScript interface to the native iOS/Android module
 */

import { requireNativeModule } from "expo-modules-core";
import { Platform } from "react-native";
import { Logger, isVerboseLogging } from "./Logger";

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
  
  // Transaction Observer (StoreKit 2 / Google Play Billing)
  startTransactionObserver(appId: string): Promise<TransactionObserverResult>;
  stopTransactionObserver(): Promise<void>;
  clearTrackedTransactions(): Promise<number>;
  recheckEntitlements(): Promise<EntitlementCheckResult>;

  // Manual Purchase Tracking (Fallback for Superwall/RevenueCat)
  trackPurchaseCompleted(productId: string, transactionId?: string, originalTransactionId?: string): Promise<void>;
  trackPurchaseFromProduct(productId: string): Promise<void>;
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

// Sent event result
export interface SentEventResult {
  productId: string;
  transactionId: string;
  originalTransactionId: string;
  purchaseDate: string;
  status: "sent" | "skipped" | "failed" | "error";
  httpStatus?: number;
  error?: string;
  reason?: string;
  amount?: string;
  currency?: string;
  environment?: string;
}

// Already tracked transaction details
export interface TrackedTransactionDetail {
  productId: string;
  transactionId: string;
  originalTransactionId: string;
  purchaseDate: string;
  expirationDate?: string;
  environment?: string;
  status: "already_sent" | "skipped";
  reason?: string;
}

// Entitlement check result (returned by recheckEntitlements)
export interface EntitlementCheckResult {
  totalFound: number;
  alreadyTracked: number;
  newPurchases: number;
  productIds: string[];
  newProductIds: string[];
  sentEvents?: SentEventResult[];
  skippedReasons?: TrackedTransactionDetail[];
  alreadyTrackedDetails?: TrackedTransactionDetail[];
  trackedIdsCount: number;
  error?: string;
}

// Transaction observer result for debugging
export interface TransactionObserverResult {
  configured: boolean;
  appId: string;
  userId: string;
  previouslyTrackedCount: number;
  iOSVersion: string;
  listenerStarted: boolean;
  entitlementCheck?: EntitlementCheckResult;
  error?: string;
}

// Impact feedback styles
export type ImpactStyle = "light" | "medium" | "heavy" | "rigid" | "soft";

// Notification feedback types
export type NotificationType = "success" | "warning" | "error";

// Get the native module
let RampKitNativeModule: RampKitNativeModule;
let isNativeModuleLoaded = false;

try {
  RampKitNativeModule = requireNativeModule("RampKit");
  isNativeModuleLoaded = true;
  // Don't log on success - too noisy
} catch (e) {
  Logger.warn("Native module not available. Using JavaScript fallback.");
  RampKitNativeModule = createFallbackModule();
}

// Export for debugging
export function isNativeModuleAvailable(): boolean {
  return isNativeModuleLoaded;
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
    async startTransactionObserver(_appId: string): Promise<TransactionObserverResult> {
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
    async stopTransactionObserver(): Promise<void> {},
    async clearTrackedTransactions(): Promise<number> { return 0; },
    async recheckEntitlements(): Promise<EntitlementCheckResult> {
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
    async trackPurchaseCompleted(_productId: string, _transactionId?: string, _originalTransactionId?: string): Promise<void> {},
    async trackPurchaseFromProduct(_productId: string): Promise<void> {},
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
      Logger.warn("Failed to request review:", e);
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

// ============================================================================
// Transaction Observer API (StoreKit 2 / Google Play Billing)
// ============================================================================

/**
 * Helper function to log entitlement check results (only in verbose mode)
 */
function logEntitlementCheckResult(result: EntitlementCheckResult, context: string): void {
  if (!isVerboseLogging()) {
    return;
  }

  Logger.verbose(`Entitlement check (${context}): found=${result.totalFound}, new=${result.newPurchases}, tracked=${result.alreadyTracked}`);

  if (result.newPurchases > 0 && result.sentEvents) {
    for (const event of result.sentEvents) {
      Logger.verbose(`  New purchase: ${event.productId} (${event.status})`);
    }
  }

  if (result.error) {
    Logger.warn(`Entitlement check error: ${result.error}`);
  }
}

export const TransactionObserver = {
  /**
   * Start listening for purchase transactions
   * Automatically tracks purchases to the RampKit backend
   * @param appId - The RampKit app ID
   */
  async start(appId: string): Promise<TransactionObserverResult | null> {
    Logger.verbose("Starting transaction observer...");

    try {
      const result = await RampKitNativeModule.startTransactionObserver(appId);

      Logger.verbose(`Transaction observer started: configured=${result.configured}, tracked=${result.previouslyTrackedCount}`);

      if (result.entitlementCheck) {
        logEntitlementCheckResult(result.entitlementCheck, "STARTUP");
      }

      if (result.error) {
        Logger.warn("Transaction observer error:", result.error);
      }

      return result;
    } catch (e) {
      Logger.warn("Failed to start transaction observer:", e);
      return null;
    }
  },

  /**
   * Stop listening for purchase transactions
   */
  async stop(): Promise<void> {
    try {
      await RampKitNativeModule.stopTransactionObserver();
      Logger.verbose("Transaction observer stopped");
    } catch (e) {
      Logger.warn("Failed to stop transaction observer:", e);
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
  async trackPurchase(
    productId: string,
    transactionId?: string,
    originalTransactionId?: string
  ): Promise<void> {
    try {
      Logger.verbose("Tracking purchase:", productId);
      await RampKitNativeModule.trackPurchaseCompleted(
        productId,
        transactionId,
        originalTransactionId
      );
      Logger.verbose("Purchase tracked:", productId);
    } catch (e) {
      Logger.warn("Failed to track purchase:", e);
    }
  },

  /**
   * Track a purchase by looking up the product's latest transaction
   * Use this when you only have the productId (common with Superwall)
   *
   * @param productId - The product ID to look up and track
   */
  async trackPurchaseByProductId(productId: string): Promise<void> {
    try {
      Logger.verbose("Looking up purchase for:", productId);
      await RampKitNativeModule.trackPurchaseFromProduct(productId);
      Logger.verbose("Purchase tracked:", productId);
    } catch (e) {
      Logger.warn("Failed to track purchase by product:", e);
    }
  },

  /**
   * Clear all tracked transaction IDs from storage
   * Use this for testing to re-trigger tracking of existing purchases
   *
   * @returns The number of tracked transactions that were cleared
   */
  async clearTracked(): Promise<number> {
    try {
      Logger.verbose("Clearing tracked transaction IDs...");
      const count = await RampKitNativeModule.clearTrackedTransactions();
      Logger.verbose("Cleared", count, "tracked transaction IDs");
      return count;
    } catch (e) {
      Logger.warn("Failed to clear tracked transactions:", e);
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
  async recheck(): Promise<EntitlementCheckResult | null> {
    Logger.verbose("Re-checking entitlements...");
    try {
      const result = await RampKitNativeModule.recheckEntitlements();
      logEntitlementCheckResult(result, "RECHECK");
      return result;
    } catch (e) {
      Logger.warn("Failed to recheck entitlements:", e);
      return null;
    }
  },
};
