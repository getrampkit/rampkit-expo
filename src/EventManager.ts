/**
 * RampKit Event Manager
 * Handles event tracking for the /app-user-events endpoint
 */

import {
  DeviceInfo,
  EventDevice,
  EventContext,
  RampKitEvent,
  RampKitEventName,
} from "./types";
import { ENDPOINTS, SUPABASE_ANON_KEY } from "./constants";

/**
 * Generate a UUID v4 using Math.random
 * This is sufficient for event IDs - no crypto dependency needed
 */
function generateEventId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

class EventManager {
  private static _instance: EventManager;

  private appId: string | null = null;
  private appUserId: string | null = null;
  private sessionId: string | null = null;
  private device: EventDevice | null = null;
  private baseContext: Partial<EventContext> = {};

  // Current context tracking
  private currentScreenName: string | null = null;
  private currentFlowId: string | null = null;
  private currentVariantId: string | null = null;
  private currentPaywallId: string | null = null;
  private currentPlacement: string | null = null;

  // Onboarding tracking
  private onboardingStartTime: Date | null = null;
  private currentOnboardingId: string | null = null;

  // Initialization state
  private initialized: boolean = false;

  static get instance(): EventManager {
    if (!this._instance) {
      this._instance = new EventManager();
    }
    return this._instance;
  }

  /**
   * Initialize the event manager with device info
   */
  initialize(appId: string, deviceInfo: DeviceInfo): void {
    this.appId = appId;
    this.appUserId = deviceInfo.appUserId;
    this.sessionId = deviceInfo.appSessionId;

    this.device = {
      platform: deviceInfo.platform,
      platformVersion: deviceInfo.platformVersion,
      deviceModel: deviceInfo.deviceModel,
      sdkVersion: deviceInfo.sdkVersion,
      appVersion: deviceInfo.appVersion,
      buildNumber: deviceInfo.buildNumber,
    };

    this.baseContext = {
      locale: deviceInfo.deviceLocale,
      regionCode: deviceInfo.regionCode,
    };

    this.initialized = true;

    console.log("[RampKit] EventManager: Initialized");
  }

  /**
   * Check if the event manager is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Set current screen context
   */
  setCurrentScreen(screenName: string | null): void {
    this.currentScreenName = screenName;
  }

  /**
   * Set current flow context (e.g., onboarding flow ID)
   */
  setCurrentFlow(flowId: string | null, variantId?: string | null): void {
    this.currentFlowId = flowId;
    if (variantId !== undefined) {
      this.currentVariantId = variantId;
    }
  }

  /**
   * Set current paywall context
   */
  setCurrentPaywall(paywallId: string | null, placement?: string | null): void {
    this.currentPaywallId = paywallId;
    if (placement !== undefined) {
      this.currentPlacement = placement;
    }
  }

  /**
   * Start onboarding tracking
   */
  startOnboardingTracking(onboardingId: string): void {
    this.currentOnboardingId = onboardingId;
    this.onboardingStartTime = new Date();
    this.currentFlowId = onboardingId;
  }

  /**
   * Get onboarding duration in seconds
   */
  getOnboardingDurationSeconds(): number {
    if (!this.onboardingStartTime) return 0;
    return Math.floor((Date.now() - this.onboardingStartTime.getTime()) / 1000);
  }

  /**
   * End onboarding tracking
   */
  endOnboardingTracking(): void {
    this.currentOnboardingId = null;
    this.onboardingStartTime = null;
    this.currentFlowId = null;
  }

  /**
   * Get current onboarding ID
   */
  getCurrentOnboardingId(): string | null {
    return this.currentOnboardingId;
  }

  /**
   * Track an event
   */
  async track(
    eventName: RampKitEventName | string,
    properties: Record<string, any> = {},
    contextOverrides?: Partial<EventContext>
  ): Promise<void> {
    if (!this.initialized || !this.appId || !this.appUserId || !this.sessionId || !this.device) {
      console.warn("[RampKit] EventManager: Not initialized, skipping event:", eventName);
      return;
    }

    const eventId = generateEventId();
    const occurredAt = new Date().toISOString();

    const context: EventContext = {
      screenName: contextOverrides?.screenName ?? this.currentScreenName,
      flowId: contextOverrides?.flowId ?? this.currentFlowId,
      variantId: contextOverrides?.variantId ?? this.currentVariantId,
      paywallId: contextOverrides?.paywallId ?? this.currentPaywallId,
      locale: contextOverrides?.locale ?? this.baseContext.locale ?? null,
      regionCode: contextOverrides?.regionCode ?? this.baseContext.regionCode ?? null,
      placement: contextOverrides?.placement ?? this.currentPlacement,
    };

    const event: RampKitEvent = {
      appId: this.appId,
      appUserId: this.appUserId,
      eventId,
      eventName,
      sessionId: this.sessionId,
      occurredAt,
      device: this.device,
      context,
      properties,
    };

    // Fire and forget - don't await
    this.sendEvent(event);
  }

  /**
   * Send event to backend (fire and forget)
   */
  private async sendEvent(event: RampKitEvent): Promise<void> {
    try {
      const url = `${ENDPOINTS.BASE_URL}${ENDPOINTS.APP_USER_EVENTS}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        console.warn(
          "[RampKit] EventManager: Failed to send event:",
          event.eventName,
          response.status
        );
      } else {
        console.log("[RampKit] EventManager: Event sent:", event.eventName);
      }
    } catch (error) {
      console.warn("[RampKit] EventManager: Error sending event:", event.eventName, error);
    }
  }

  // ============================================================================
  // Convenience methods for specific event types
  // ============================================================================

  /**
   * Track app session started
   */
  trackAppSessionStarted(isFirstLaunch: boolean, launchCount: number): void {
    this.track("app_session_started", { isFirstLaunch, launchCount });
  }

  /**
   * Track app backgrounded
   */
  trackAppBackgrounded(sessionDurationSeconds: number): void {
    this.track("app_backgrounded", { sessionDurationSeconds });
  }

  /**
   * Track app foregrounded
   */
  trackAppForegrounded(): void {
    this.track("app_foregrounded", {});
  }

  /**
   * Track screen view
   */
  trackScreenView(screenName: string, referrer?: string): void {
    this.setCurrentScreen(screenName);
    this.track("screen_view", { screenName, referrer });
  }

  /**
   * Track CTA tap
   */
  trackCtaTap(buttonId: string, buttonText?: string): void {
    this.track("cta_tap", { buttonId, buttonText });
  }

  /**
   * Track onboarding started
   */
  trackOnboardingStarted(onboardingId: string, totalSteps?: number): void {
    this.startOnboardingTracking(onboardingId);
    this.track("onboarding_started", { onboardingId, totalSteps });
  }

  /**
   * Track onboarding screen viewed
   */
  trackOnboardingScreenViewed(
    screenName: string,
    screenIndex: number,
    totalScreens: number,
    onboardingId?: string
  ): void {
    this.setCurrentScreen(screenName);
    this.track("onboarding_screen_viewed", {
      onboardingId: onboardingId || this.currentOnboardingId,
      screenName,
      screenIndex,
      totalScreens,
    });
  }

  /**
   * Track onboarding question answered
   */
  trackOnboardingQuestionAnswered(
    questionId: string,
    answer: any,
    questionText?: string,
    onboardingId?: string
  ): void {
    this.track("onboarding_question_answered", {
      onboardingId: onboardingId || this.currentOnboardingId,
      questionId,
      answer,
      questionText,
    });
  }

  /**
   * Track onboarding completed
   */
  trackOnboardingCompleted(
    completedSteps: number,
    totalSteps: number,
    onboardingId?: string
  ): void {
    const timeToCompleteSeconds = this.getOnboardingDurationSeconds();
    this.track("onboarding_completed", {
      onboardingId: onboardingId || this.currentOnboardingId,
      timeToCompleteSeconds,
      completedSteps,
      totalSteps,
    });
    this.endOnboardingTracking();
  }

  /**
   * Track onboarding abandoned
   */
  trackOnboardingAbandoned(
    reason: string,
    lastScreenName?: string,
    onboardingId?: string
  ): void {
    const timeSpentSeconds = this.getOnboardingDurationSeconds();
    this.track("onboarding_abandoned", {
      onboardingId: onboardingId || this.currentOnboardingId,
      reason,
      lastScreenName,
      timeSpentSeconds,
    });
    this.endOnboardingTracking();
  }

  /**
   * Track notification prompt shown
   */
  trackNotificationsPromptShown(): void {
    this.track("notifications_prompt_shown", {});
  }

  /**
   * Track notification response
   */
  trackNotificationsResponse(status: "granted" | "denied" | "provisional"): void {
    this.track("notifications_response", { status });
  }

  /**
   * Track paywall shown
   */
  trackPaywallShown(
    paywallId: string,
    placement?: string,
    products?: Array<{ productId: string; price?: number; currency?: string }>
  ): void {
    this.setCurrentPaywall(paywallId, placement);
    this.track(
      "paywall_shown",
      { paywallId, placement, products },
      { paywallId, placement }
    );
  }

  /**
   * Track paywall primary action tap
   */
  trackPaywallPrimaryActionTap(paywallId: string, productId?: string): void {
    this.track(
      "paywall_primary_action_tap",
      { paywallId, productId },
      { paywallId }
    );
  }

  /**
   * Track paywall closed
   */
  trackPaywallClosed(
    paywallId: string,
    reason: "dismissed" | "purchased" | "backgrounded"
  ): void {
    this.track("paywall_closed", { paywallId, reason }, { paywallId });
    this.setCurrentPaywall(null);
  }

  /**
   * Track purchase started
   */
  trackPurchaseStarted(
    productId: string,
    amount?: number,
    currency?: string
  ): void {
    this.track("purchase_started", { productId, amount, currency });
  }

  /**
   * Track purchase completed
   */
  trackPurchaseCompleted(properties: {
    productId: string;
    amount: number;
    currency: string;
    transactionId: string;
    originalTransactionId?: string;
    purchaseDate?: string;
  }): void {
    this.track("purchase_completed", properties);
  }

  /**
   * Track purchase failed
   */
  trackPurchaseFailed(
    productId: string,
    errorCode: string,
    errorMessage: string
  ): void {
    this.track("purchase_failed", { productId, errorCode, errorMessage });
  }

  /**
   * Reset the event manager (e.g., on logout)
   */
  reset(): void {
    this.appId = null;
    this.appUserId = null;
    this.sessionId = null;
    this.device = null;
    this.baseContext = {};
    this.currentScreenName = null;
    this.currentFlowId = null;
    this.currentVariantId = null;
    this.currentPaywallId = null;
    this.currentPlacement = null;
    this.onboardingStartTime = null;
    this.currentOnboardingId = null;
    this.initialized = false;
  }
}

export const eventManager = EventManager.instance;
export { EventManager };

