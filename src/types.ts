/**
 * RampKit SDK Types
 */

// ============================================================================
// Device Info Types (for /app-users endpoint)
// ============================================================================

export interface DeviceInfo {
  // User & Session Identifiers
  appUserId: string;
  vendorId: string | null;
  appSessionId: string;

  // Launch Tracking
  installDate: string;
  isFirstLaunch: boolean;
  launchCount: number;
  lastLaunchAt: string | null;

  // App Info
  bundleId: string | null;
  appName: string | null;
  appVersion: string | null;
  buildNumber: string | null;
  sdkVersion: string;

  // Platform Info
  platform: "iOS" | "Android" | "iPadOS";
  platformVersion: string;
  platformWrapper: "Expo" | "React Native" | null;

  // Device Info
  deviceModel: string;
  deviceName: string;
  isSimulator: boolean;

  // Locale & Language
  deviceLanguageCode: string | null;
  deviceLocale: string;
  regionCode: string | null;
  preferredLanguage: string | null;
  preferredLanguages: string[];

  // Currency
  deviceCurrencyCode: string | null;
  deviceCurrencySymbol: string | null;

  // Timezone
  timezoneIdentifier: string;
  timezoneOffsetSeconds: number;

  // UI
  interfaceStyle: "light" | "dark" | "unspecified";

  // Screen
  screenWidth: number;
  screenHeight: number;
  screenScale: number;

  // Device Status
  isLowPowerMode: boolean;

  // Storage (optional - slow to fetch)
  freeStorageBytes: number | null;
  totalStorageBytes: number | null;

  // Memory
  totalMemoryBytes: number;

  // Apple Search Ads (optional - very slow)
  isAppleSearchAdsAttribution: boolean;
  appleSearchAdsToken: string | null;

  // SDK Capabilities
  capabilities: string[];

  // Network
  connectionType: string | null;

  // Timestamp
  collectedAt: string;
}

// ============================================================================
// Event Types (for /app-user-events endpoint)
// ============================================================================

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

// ============================================================================
// Event Property Types
// ============================================================================

// App Lifecycle Events
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

export interface AppForegroundedProperties {}

// Onboarding Events
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

// Navigation Events
export interface ScreenViewProperties {
  screenName: string;
  referrer?: string;
}

export interface CtaTapProperties {
  buttonId: string;
  buttonText?: string;
}

// Permission Events
export interface NotificationsPromptShownProperties {}

export interface NotificationsResponseProperties {
  status: "granted" | "denied" | "provisional";
}

// Paywall Events
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

// Purchase Events
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

// ============================================================================
// Event Names
// ============================================================================

export type AppLifecycleEventName =
  | "app_session_started"
  | "app_session_ended"
  | "app_backgrounded"
  | "app_foregrounded";

export type OnboardingEventName =
  | "onboarding_started"
  | "onboarding_screen_viewed"
  | "onboarding_question_answered"
  | "onboarding_completed"
  | "onboarding_abandoned";

export type NavigationEventName = "screen_view" | "cta_tap";

export type PermissionEventName =
  | "notifications_prompt_shown"
  | "notifications_response";

export type PaywallEventName =
  | "paywall_shown"
  | "paywall_primary_action_tap"
  | "paywall_closed";

export type PurchaseEventName =
  | "purchase_started"
  | "purchase_completed"
  | "purchase_failed";

export type RampKitEventName =
  | AppLifecycleEventName
  | OnboardingEventName
  | NavigationEventName
  | PermissionEventName
  | PaywallEventName
  | PurchaseEventName;

// ============================================================================
// SDK Configuration
// ============================================================================

export interface RampKitConfig {
  appId: string;
  apiKey?: string;
  environment?: "production" | "development";
  autoShowOnboarding?: boolean;
  onOnboardingFinished?: (payload?: any) => void;
  onShowPaywall?: (payload?: any) => void;
  showPaywall?: (payload?: any) => void;
}

// ============================================================================
// RampKit Context (for WebView template resolution)
// ============================================================================

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

