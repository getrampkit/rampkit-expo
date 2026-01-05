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
  PurchaseCompletedProperties,
  PurchaseStartedProperties,
  PurchaseRestoredProperties,
} from "./types";
import { ENDPOINTS, SUPABASE_ANON_KEY } from "./constants";
import { Logger } from "./Logger";

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

  // Targeting tracking (persists for all events after target match)
  private currentTargetId: string | null = null;
  private currentTargetName: string | null = null;
  private currentBucket: number | null = null;
  private currentVersionId: string | null = null;

  // Onboarding tracking
  private onboardingStartTime: Date | null = null;
  private currentOnboardingId: string | null = null;
  private onboardingCompletedForSession: boolean = false;

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

    Logger.verbose("EventManager initialized");
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
   * Set targeting context (called after target evaluation)
   * This persists for all subsequent events
   */
  setTargetingContext(
    targetId: string,
    targetName: string,
    onboardingId: string,
    bucket: number,
    versionId?: string | null
  ): void {
    this.currentTargetId = targetId;
    this.currentTargetName = targetName;
    this.currentOnboardingId = onboardingId;
    this.currentBucket = bucket;
    this.currentVersionId = versionId || null;
    this.currentFlowId = onboardingId;
    Logger.verbose("EventManager: Targeting context set", { targetId, targetName, bucket, versionId });
  }

  /**
   * Get current targeting info (for user profile updates)
   */
  getTargetingInfo(): { targetId: string | null; targetName: string | null; bucket: number | null } {
    return {
      targetId: this.currentTargetId,
      targetName: this.currentTargetName,
      bucket: this.currentBucket,
    };
  }

  /**
   * Start onboarding tracking
   */
  startOnboardingTracking(onboardingId: string): void {
    this.currentOnboardingId = onboardingId;
    this.onboardingStartTime = new Date();
    this.currentFlowId = onboardingId;
    this.onboardingCompletedForSession = false;
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
      Logger.warn("EventManager: Not initialized, skipping event:", eventName);
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

    // Include targeting info in all events if available
    const enrichedProperties: Record<string, any> = {
      ...properties,
    };

    if (this.currentTargetId) {
      enrichedProperties.targetId = this.currentTargetId;
    }
    if (this.currentBucket !== null) {
      enrichedProperties.bucket = this.currentBucket;
    }

    const event: RampKitEvent = {
      appId: this.appId,
      appUserId: this.appUserId,
      eventId,
      eventName,
      sessionId: this.sessionId,
      occurredAt,
      device: this.device,
      context,
      properties: enrichedProperties,
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
        // Try to get error details from response body
        let errorDetails = "";
        try {
          const errorBody = await response.text();
          errorDetails = errorBody ? ` - ${errorBody}` : "";
        } catch {
          // Ignore if we can't read the body
        }

        Logger.warn(`Failed to send event ${event.eventName}: ${response.status}${errorDetails}`);
      } else {
        Logger.verbose("Event sent:", event.eventName);
      }
    } catch (error) {
      Logger.warn(`Network error sending event ${event.eventName}: ${error instanceof Error ? error.message : String(error)}`);
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
   * Track target matched event
   * Called when targeting evaluation completes and a target is selected
   */
  trackTargetMatched(
    targetId: string,
    targetName: string,
    onboardingId: string,
    bucket: number,
    versionId?: string | null
  ): void {
    // Set targeting context for all future events
    this.setTargetingContext(targetId, targetName, onboardingId, bucket, versionId);

    // Track the target_matched event
    this.track("target_matched", {
      targetId,
      targetName,
      onboardingId,
      bucket,
      versionId: versionId || null,
    });
  }

  /**
   * Track onboarding started
   */
  trackOnboardingStarted(onboardingId: string, totalSteps?: number): void {
    this.startOnboardingTracking(onboardingId);
    this.track("onboarding_started", { onboardingId, totalSteps });
  }

  /**
   * Track onboarding abandoned
   */
  trackOnboardingAbandoned(
    reason: string,
    lastScreenName?: string,
    onboardingId?: string
  ): void {
    // Skip if onboarding was already completed this session
    if (this.onboardingCompletedForSession) {
      Logger.verbose("onboarding_abandoned skipped (already completed)");
      return;
    }

    const timeSpentSeconds = this.getOnboardingDurationSeconds();
    this.track("onboarding_abandoned", {
      onboardingId: onboardingId || this.currentOnboardingId,
      reason,
      lastScreenName,
      timeSpentSeconds,
    });
    this.endOnboardingTracking();
  }

  // ============================================================================
  // Onboarding Completion
  // ============================================================================

  /**
   * Track onboarding completed event
   * Called when:
   * 1. User completes the onboarding flow (onboarding-finished action)
   * 2. User closes the onboarding (close action)
   * 3. A paywall is shown (show-paywall action)
   *
   * @param trigger - The reason for completion ("finished", "closed", "paywall_shown")
   * @param completedSteps - Number of steps the user completed
   * @param totalSteps - Total number of steps in the onboarding
   * @param onboardingId - The onboarding ID
   */
  trackOnboardingCompleted(
    trigger: string,
    completedSteps?: number,
    totalSteps?: number,
    onboardingId?: string
  ): void {
    const timeToCompleteSeconds = this.getOnboardingDurationSeconds();
    Logger.verbose(`onboarding_completed: trigger=${trigger}, time=${timeToCompleteSeconds}s`);
    this.track("onboarding_completed", {
      onboardingId: onboardingId || this.currentOnboardingId,
      timeToCompleteSeconds,
      completedSteps,
      totalSteps,
      trigger,
    });

    // Mark as completed so abandoned won't fire for this session
    this.onboardingCompletedForSession = true;
    this.endOnboardingTracking();
  }

  /**
   * Track notification response
   */
  trackNotificationsResponse(status: "granted" | "denied" | "provisional"): void {
    this.track("notifications_response", { status });
  }

  /**
   * Track option selected (interaction event)
   */
  trackOptionSelected(optionId: string, optionValue: any, questionId?: string): void {
    this.track("option_selected", { optionId, optionValue, questionId });
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
   * Track purchase started
   * Call this when user initiates a purchase from a paywall
   */
  trackPurchaseStarted(properties: PurchaseStartedProperties): void {
    // Context (paywallId, placement) is automatically included from current state
    // which was set when trackPaywallShown was called
    Logger.verbose(`purchase_started: ${properties.productId}`);
    this.track("purchase_started", properties);
  }

  /**
   * Track purchase completed
   * CRITICAL: originalTransactionId is required for attribution
   * Context (paywallId, screenName, flowId) is automatically included
   */
  trackPurchaseCompleted(properties: PurchaseCompletedProperties): void {
    // Context is automatically included from current state (paywallId, placement, etc.)
    Logger.verbose(`purchase_completed: ${properties.productId}`);
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
    Logger.verbose(`purchase_failed: ${productId} (${errorCode})`);
    this.track("purchase_failed", { productId, errorCode, errorMessage });
  }

  /**
   * Track purchase restored
   */
  trackPurchaseRestored(properties: PurchaseRestoredProperties): void {
    Logger.verbose(`purchase_restored: ${properties.productId}`);
    this.track("purchase_restored", properties);
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
    this.currentTargetId = null;
    this.currentTargetName = null;
    this.currentBucket = null;
    this.currentVersionId = null;
    this.onboardingStartTime = null;
    this.currentOnboardingId = null;
    this.onboardingCompletedForSession = false;
    this.initialized = false;
  }
}

export const eventManager = EventManager.instance;
export { EventManager };

