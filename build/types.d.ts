/**
 * RampKit SDK Types
 */
export interface DeviceInfo {
    appUserId: string;
    /**
     * Custom App User ID provided by the developer.
     * This is an alias for their own user identification system.
     * Does NOT replace appUserId - RampKit still uses its own generated ID.
     */
    appUserID: string | null;
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
export interface OnboardingStartedProperties {
    onboardingId?: string;
    totalSteps?: number;
}
export interface OnboardingCompletedProperties {
    onboardingId?: string;
    timeToCompleteSeconds: number;
    completedSteps: number;
    totalSteps: number;
    trigger: string;
}
export interface OnboardingAbandonedProperties {
    onboardingId?: string;
    reason: string;
    lastScreenName?: string;
    timeSpentSeconds: number;
}
export interface OptionSelectedProperties {
    optionId: string;
    optionValue: any;
    questionId?: string;
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
export interface PurchaseStartedProperties {
    productId: string;
    amount?: number;
    currency?: string;
    priceFormatted?: string;
}
/**
 * Properties for purchase_completed event
 * Critical for attribution: originalTransactionId links renewals to original purchase
 */
export interface PurchaseCompletedProperties {
    /** Product identifier (e.g., "com.app.yearly") */
    productId: string;
    /** Price as number (e.g., 39.99) */
    amount?: number;
    /** Currency code (e.g., "USD") */
    currency?: string;
    /** Formatted price string (e.g., "$39.99") */
    priceFormatted?: string;
    /** Unique transaction ID from App Store/Play Store */
    transactionId: string;
    /** CRITICAL: Original transaction ID - links renewals to original purchase */
    originalTransactionId: string;
    /** ISO 8601 purchase timestamp */
    purchaseDate: string;
    /** ISO 8601 expiration date for subscriptions */
    expirationDate?: string;
    /** Whether this is a free trial */
    isTrial?: boolean;
    /** Whether this is an introductory offer */
    isIntroOffer?: boolean;
    /** Offer type: "introductory", "promotional", "code", or null */
    offerType?: string | null;
    /** Offer ID if applicable */
    offerId?: string;
    /** ISO 8601 duration (e.g., "P1M" for monthly, "P1Y" for yearly) */
    subscriptionPeriod?: string;
    /** Subscription group ID */
    subscriptionGroupId?: string;
    /** App Store storefront country code */
    storefront?: string;
    /** Environment: "Production" or "Sandbox" */
    environment?: string;
    /** Quantity purchased */
    quantity?: number;
}
export interface PurchaseFailedProperties {
    productId: string;
    errorCode: string;
    errorMessage: string;
}
export interface PurchaseRestoredProperties {
    productId: string;
    transactionId?: string;
    originalTransactionId?: string;
}
export type AppLifecycleEventName = "app_session_started";
export type OnboardingEventName = "onboarding_started" | "onboarding_completed" | "onboarding_abandoned";
export type InteractionEventName = "option_selected";
export type PermissionEventName = "notifications_response" | "tracking_response";
export type PaywallEventName = "paywall_shown";
export type PurchaseEventName = "purchase_started" | "purchase_completed" | "purchase_failed" | "purchase_restored";
export type RampKitEventName = AppLifecycleEventName | OnboardingEventName | InteractionEventName | PermissionEventName | PaywallEventName | PurchaseEventName;
export interface RampKitConfig {
    appId: string;
    apiKey?: string;
    environment?: "production" | "development";
    autoShowOnboarding?: boolean;
    onOnboardingFinished?: (payload?: any) => void;
    onShowPaywall?: (payload?: any) => void;
    showPaywall?: (payload?: any) => void;
    /**
     * Optional custom App User ID to associate with this user.
     * This is an alias for your own user identification system - it does NOT replace
     * the RampKit-generated user ID (appUserId). RampKit will continue to generate
     * and use its own stable UUID for internal tracking.
     *
     * Use this to link RampKit analytics with your own user database.
     * Can also be set later via RampKit.setAppUserID().
     */
    appUserID?: string;
}
/**
 * Device context variables available in templates as ${device.xxx}
 */
export interface RampKitDeviceContext {
    /** Platform: "iOS", "Android", or "iPadOS" */
    platform: string;
    /** Device model: "iPhone 15 Pro", "Pixel 7", etc. */
    model: string;
    /** Full locale identifier: "en_US", "fr_FR", etc. */
    locale: string;
    /** Language code: "en", "fr", etc. */
    language: string;
    /** Country/region code: "US", "FR", etc. */
    country: string;
    /** Currency code: "USD", "EUR", etc. */
    currencyCode: string;
    /** Currency symbol: "$", "€", etc. */
    currencySymbol: string;
    /** App version string: "1.0.0" */
    appVersion: string;
    /** Build number: "123" */
    buildNumber: string;
    /** Bundle identifier: "com.example.app" */
    bundleId: string;
    /** Interface style: "light" or "dark" */
    interfaceStyle: string;
    /** Timezone offset in seconds from GMT */
    timezone: number;
    /** Days since app was first installed */
    daysSinceInstall: number;
}
/**
 * User context variables available in templates as ${user.xxx}
 */
export interface RampKitUserContext {
    /** Unique user identifier */
    id: string;
    /** Whether this is the user's first session */
    isNewUser: boolean;
    /** Whether user came from Apple Search Ads */
    hasAppleSearchAdsAttribution: boolean;
    /** Current session identifier */
    sessionId: string;
    /** ISO date string when app was first installed */
    installedAt: string;
}
/**
 * Full context object injected into WebView as window.rampkitContext
 */
export interface RampKitContext {
    device: RampKitDeviceContext;
    user: RampKitUserContext;
}
/**
 * Navigation data structure from the editor's spatial layout
 * This is exported alongside screens to enable proper navigation resolution
 */
export interface NavigationData {
    /** Ordered array of screen IDs in the main flow (sorted by X position, main row only) */
    mainFlow: string[];
    /** Map of screen ID to position information */
    screenPositions?: Record<string, ScreenPosition>;
}
/**
 * Position information for a screen in the editor canvas
 */
export interface ScreenPosition {
    /** X coordinate in the editor canvas */
    x: number;
    /** Y coordinate in the editor canvas */
    y: number;
    /** Row classification: "main" for main row screens, "variant" for screens below */
    row: "main" | "variant";
}
/**
 * Represents a single onboarding question response stored locally
 */
export interface OnboardingResponse {
    /** Unique identifier for the question */
    questionId: string;
    /** The user's answer (can be any JSON-serializable value) */
    answer: any;
    /** Optional text of the question shown to user */
    questionText?: string;
    /** Screen where the question was answered */
    screenName?: string;
    /** ISO 8601 timestamp when the answer was recorded */
    answeredAt: string;
}
