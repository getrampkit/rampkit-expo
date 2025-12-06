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
export { Haptics, StoreReview, Notifications, TransactionObserver } from "./RampKitNative";
export type { ImpactStyle, NotificationType, NotificationOptions, NotificationPermissionResult } from "./RampKitNative";
export type { DeviceInfo, RampKitEvent, EventDevice, EventContext, RampKitConfig, RampKitEventName, RampKitContext, RampKitDeviceContext, RampKitUserContext, AppSessionStartedProperties, AppSessionEndedProperties, AppBackgroundedProperties, AppForegroundedProperties, OnboardingStartedProperties, OnboardingScreenViewedProperties, OnboardingQuestionAnsweredProperties, OnboardingCompletedProperties, OnboardingAbandonedProperties, ScreenViewProperties, CtaTapProperties, NotificationsPromptShownProperties, NotificationsResponseProperties, PaywallShownProperties, PaywallPrimaryActionTapProperties, PaywallClosedProperties, PurchaseStartedProperties, PurchaseCompletedProperties, PurchaseFailedProperties, } from "./types";
export { SDK_VERSION, CAPABILITIES } from "./constants";
