/**
 * RampKit Expo SDK
 * Main entry point for the SDK
 */
import { RampKitCore } from "./RampKit";
export declare const RampKit: RampKitCore;
export { getRampKitUserId } from "./userId";
export { eventManager } from "./EventManager";
export { collectDeviceInfo, getSessionDurationSeconds, getSessionStartTime, buildRampKitContext, } from "./DeviceInfoCollector";
export { default as RampKitNative } from "./RampKitNative";
export type { NativeDeviceInfo, NativeLaunchData } from "./RampKitNative";
export { Haptics, StoreReview, Notifications, TransactionObserver, isNativeModuleAvailable } from "./RampKitNative";
export type { ImpactStyle, NotificationType, NotificationOptions, NotificationPermissionResult, TransactionObserverResult, SentEventResult, TrackedTransactionDetail, EntitlementCheckResult } from "./RampKitNative";
export type { DeviceInfo, RampKitEvent, EventDevice, EventContext, RampKitConfig, RampKitEventName, RampKitContext, RampKitDeviceContext, RampKitUserContext, NavigationData, ScreenPosition, AppSessionStartedProperties, OnboardingStartedProperties, OnboardingCompletedProperties, OnboardingAbandonedProperties, OptionSelectedProperties, NotificationsResponseProperties, PaywallShownProperties, PurchaseStartedProperties, PurchaseCompletedProperties, PurchaseFailedProperties, PurchaseRestoredProperties, } from "./types";
export type { OnboardingState } from "./OnboardingResponseStorage";
export { SDK_VERSION, CAPABILITIES } from "./constants";
