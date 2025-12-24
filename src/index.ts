/**
 * RampKit Expo SDK
 * Main entry point for the SDK
 */

import { RampKitCore } from "./RampKit";
import { eventManager } from "./EventManager";

// Main SDK singleton instance
export const RampKit = RampKitCore.instance;

// Export user ID utility
export { getRampKitUserId } from "./userId";

// Export event manager for direct access
export { eventManager } from "./EventManager";

// Export device info collector utilities
export {
  collectDeviceInfo,
  getSessionDurationSeconds,
  getSessionStartTime,
  buildRampKitContext,
} from "./DeviceInfoCollector";

// Export native module for direct access
export { default as RampKitNative } from "./RampKitNative";
export type { NativeDeviceInfo, NativeLaunchData } from "./RampKitNative";

// Export native APIs (replacing expo-haptics, expo-store-review, expo-notifications)
export { Haptics, StoreReview, Notifications, TransactionObserver, isNativeModuleAvailable } from "./RampKitNative";
export type { ImpactStyle, NotificationType, NotificationOptions, NotificationPermissionResult, TransactionObserverResult, SentEventResult, TrackedTransactionDetail, EntitlementCheckResult } from "./RampKitNative";

// Export types for TypeScript users
export type {
  DeviceInfo,
  RampKitEvent,
  EventDevice,
  EventContext,
  RampKitConfig,
  RampKitEventName,
  // Context types for WebView template resolution
  RampKitContext,
  RampKitDeviceContext,
  RampKitUserContext,
  // Navigation types for spatial layout-based navigation
  NavigationData,
  ScreenPosition,
  // Event property types
  AppSessionStartedProperties,
  OnboardingStartedProperties,
  OnboardingCompletedProperties,
  OnboardingAbandonedProperties,
  OptionSelectedProperties,
  NotificationsResponseProperties,
  PaywallShownProperties,
  PurchaseStartedProperties,
  PurchaseCompletedProperties,
  PurchaseFailedProperties,
  PurchaseRestoredProperties,
} from "./types";

// Export constants
export { SDK_VERSION, CAPABILITIES } from "./constants";
