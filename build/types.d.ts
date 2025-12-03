/**
 * RampKit SDK Types
 */
export interface DeviceInfo {
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
    sdkVersion: string;
    platform: "iOS" | "Android" | "iPadOS";
    platformVersion: string;
    platformWrapper: "Expo" | "React Native" | null;
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
    interfaceStyle: "light" | "dark" | "unspecified";
    screenWidth: number;
    screenHeight: number;
    screenScale: number;
    isLowPowerMode: boolean;
    freeStorageBytes: number | null;
    totalStorageBytes: number | null;
    totalMemoryBytes: number;
    isAppleSearchAdsAttribution: boolean;
    appleSearchAdsToken: string | null;
    capabilities: string[];
    connectionType: string | null;
    collectedAt: string;
}
export interface EventDevice {
    platform: string;
    platformVersion: string;
    deviceModel: string;
    sdkVersion: string;
    appVersion: string | null;
    buildNumber: string | null;
}
export interface EventContext {
    screenName: string | null;
    flowId: string | null;
    variantId: string | null;
    paywallId: string | null;
    locale: string | null;
    regionCode: string | null;
    placement: string | null;
}
export interface RampKitEvent {
    appId: string;
    appUserId: string;
    eventId: string;
    eventName: string;
    sessionId: string;
    occurredAt: string;
    device: EventDevice;
    context: EventContext;
    properties: Record<string, any>;
}
export interface AppSessionStartedProperties {
    isFirstLaunch: boolean;
    launchCount: number;
}
export interface AppSessionEndedProperties {
    reason: string;
    sessionDurationSeconds: number;
}
export interface AppBackgroundedProperties {
    sessionDurationSeconds: number;
}
export interface AppForegroundedProperties {
}
export interface OnboardingStartedProperties {
    onboardingId?: string;
    totalSteps?: number;
}
export interface OnboardingScreenViewedProperties {
    onboardingId?: string;
    screenName: string;
    screenIndex: number;
    totalScreens: number;
}
export interface OnboardingQuestionAnsweredProperties {
    onboardingId?: string;
    questionId: string;
    answer: any;
    questionText?: string;
}
export interface OnboardingCompletedProperties {
    onboardingId?: string;
    timeToCompleteSeconds: number;
    completedSteps: number;
    totalSteps: number;
}
export interface OnboardingAbandonedProperties {
    onboardingId?: string;
    reason: string;
    lastScreenName?: string;
    timeSpentSeconds: number;
}
export interface ScreenViewProperties {
    screenName: string;
    referrer?: string;
}
export interface CtaTapProperties {
    buttonId: string;
    buttonText?: string;
}
export interface NotificationsPromptShownProperties {
}
export interface NotificationsResponseProperties {
    status: "granted" | "denied" | "provisional";
}
export interface PaywallShownProperties {
    paywallId: string;
    placement?: string;
    products?: Array<{
        productId: string;
        price?: number;
        currency?: string;
    }>;
}
export interface PaywallPrimaryActionTapProperties {
    paywallId: string;
    productId?: string;
}
export interface PaywallClosedProperties {
    paywallId: string;
    reason: "dismissed" | "purchased" | "backgrounded";
}
export interface PurchaseStartedProperties {
    productId: string;
    amount?: number;
    currency?: string;
}
export interface PurchaseCompletedProperties {
    productId: string;
    amount: number;
    currency: string;
    transactionId: string;
    originalTransactionId?: string;
    purchaseDate?: string;
}
export interface PurchaseFailedProperties {
    productId: string;
    errorCode: string;
    errorMessage: string;
}
export type AppLifecycleEventName = "app_session_started" | "app_session_ended" | "app_backgrounded" | "app_foregrounded";
export type OnboardingEventName = "onboarding_started" | "onboarding_screen_viewed" | "onboarding_question_answered" | "onboarding_completed" | "onboarding_abandoned";
export type NavigationEventName = "screen_view" | "cta_tap";
export type PermissionEventName = "notifications_prompt_shown" | "notifications_response";
export type PaywallEventName = "paywall_shown" | "paywall_primary_action_tap" | "paywall_closed";
export type PurchaseEventName = "purchase_started" | "purchase_completed" | "purchase_failed";
export type RampKitEventName = AppLifecycleEventName | OnboardingEventName | NavigationEventName | PermissionEventName | PaywallEventName | PurchaseEventName;
export interface RampKitConfig {
    appId: string;
    apiKey?: string;
    environment?: "production" | "development";
    autoShowOnboarding?: boolean;
    onOnboardingFinished?: (payload?: any) => void;
    onShowPaywall?: (payload?: any) => void;
    showPaywall?: (payload?: any) => void;
}
