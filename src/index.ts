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
} from "./DeviceInfoCollector";

// Export native module for direct access
export { default as RampKitNative } from "./RampKitNative";
export type { NativeDeviceInfo, NativeLaunchData } from "./RampKitNative";

// Export native APIs (replacing expo-haptics, expo-store-review, expo-notifications)
export { Haptics, StoreReview, Notifications, TransactionObserver } from "./RampKitNative";
export type { ImpactStyle, NotificationType, NotificationOptions, NotificationPermissionResult } from "./RampKitNative";

// Export types for TypeScript users
export type {
  DeviceInfo,
  RampKitEvent,
  EventDevice,
  EventContext,
  RampKitConfig,
  RampKitEventName,
  // Event property types
  AppSessionStartedProperties,
  AppSessionEndedProperties,
  AppBackgroundedProperties,
  AppForegroundedProperties,
  OnboardingStartedProperties,
  OnboardingScreenViewedProperties,
  OnboardingQuestionAnsweredProperties,
  OnboardingCompletedProperties,
  OnboardingAbandonedProperties,
  ScreenViewProperties,
  CtaTapProperties,
  NotificationsPromptShownProperties,
  NotificationsResponseProperties,
  PaywallShownProperties,
  PaywallPrimaryActionTapProperties,
  PaywallClosedProperties,
  PurchaseStartedProperties,
  PurchaseCompletedProperties,
  PurchaseFailedProperties,
} from "./types";

// Export constants
export { SDK_VERSION, CAPABILITIES } from "./constants";
