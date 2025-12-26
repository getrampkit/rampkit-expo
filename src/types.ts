/**
 * RampKit SDK Types
 */

// ============================================================================
// Device Info Types (for /app-users endpoint)
// ============================================================================

export interface DeviceInfo {
  // User & Session Identifiers
  appUserId: string;
  /**
   * Custom App User ID provided by the developer.
   * This is an alias for their own user identification system.
   * Does NOT replace appUserId - RampKit still uses its own generated ID.
   */
  appUserID: string | null;
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

// Onboarding Events
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

// Interaction Events
export interface OptionSelectedProperties {
  optionId: string;
  optionValue: any;
  questionId?: string;
}

// Permission Events
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

// Purchase Events
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

// ============================================================================
// Event Names
// ============================================================================

export type AppLifecycleEventName = "app_session_started";

export type OnboardingEventName =
  | "onboarding_started"
  | "onboarding_completed"
  | "onboarding_abandoned";

export type InteractionEventName = "option_selected";

export type PermissionEventName = "notifications_response" | "tracking_response";

export type PaywallEventName = "paywall_shown";

export type PurchaseEventName =
  | "purchase_started"
  | "purchase_completed"
  | "purchase_failed"
  | "purchase_restored";

export type RampKitEventName =
  | AppLifecycleEventName
  | OnboardingEventName
  | InteractionEventName
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
  /**
   * Enable verbose logging for debugging.
   * When true, additional debug information will be logged to the console.
   * Default is false for minimal logging (like RevenueCat SDK).
   */
  verboseLogging?: boolean;
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

// ============================================================================
// Navigation Data (for resolving __continue__/__goBack__ based on spatial layout)
// ============================================================================

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

// ============================================================================
// Onboarding State Storage
// ============================================================================

// OnboardingState is exported from OnboardingResponseStorage.ts

