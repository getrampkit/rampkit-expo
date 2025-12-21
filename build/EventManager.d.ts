/**
 * RampKit Event Manager
 * Handles event tracking for the /app-user-events endpoint
 */
import { DeviceInfo, EventContext, RampKitEventName, PurchaseCompletedProperties, PurchaseStartedProperties, PurchaseRestoredProperties } from "./types";
declare class EventManager {
    private static _instance;
    private appId;
    private appUserId;
    private sessionId;
    private device;
    private baseContext;
    private currentScreenName;
    private currentFlowId;
    private currentVariantId;
    private currentPaywallId;
    private currentPlacement;
    private onboardingStartTime;
    private currentOnboardingId;
    private initialized;
    static get instance(): EventManager;
    /**
     * Initialize the event manager with device info
     */
    initialize(appId: string, deviceInfo: DeviceInfo): void;
    /**
     * Check if the event manager is initialized
     */
    isInitialized(): boolean;
    /**
     * Set current screen context
     */
    setCurrentScreen(screenName: string | null): void;
    /**
     * Set current flow context (e.g., onboarding flow ID)
     */
    setCurrentFlow(flowId: string | null, variantId?: string | null): void;
    /**
     * Set current paywall context
     */
    setCurrentPaywall(paywallId: string | null, placement?: string | null): void;
    /**
     * Start onboarding tracking
     */
    startOnboardingTracking(onboardingId: string): void;
    /**
     * Get onboarding duration in seconds
     */
    getOnboardingDurationSeconds(): number;
    /**
     * End onboarding tracking
     */
    endOnboardingTracking(): void;
    /**
     * Get current onboarding ID
     */
    getCurrentOnboardingId(): string | null;
    /**
     * Track an event
     */
    track(eventName: RampKitEventName | string, properties?: Record<string, any>, contextOverrides?: Partial<EventContext>): Promise<void>;
    /**
     * Send event to backend (fire and forget)
     */
    private sendEvent;
    /**
     * Track app session started
     */
    trackAppSessionStarted(isFirstLaunch: boolean, launchCount: number): void;
    /**
     * Track onboarding started
     */
    trackOnboardingStarted(onboardingId: string, totalSteps?: number): void;
    /**
     * Track onboarding abandoned
     */
    trackOnboardingAbandoned(reason: string, lastScreenName?: string, onboardingId?: string): void;
    /**
     * Check if onboarding has already been marked as completed
     */
    hasOnboardingBeenCompleted(): Promise<boolean>;
    /**
     * Mark onboarding as completed in persistent storage
     */
    private markOnboardingAsCompleted;
    /**
     * Reset onboarding completion status (useful for testing or user reset)
     */
    resetOnboardingCompletionStatus(): Promise<void>;
    /**
     * Track onboarding completed event - fires ONCE per user
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
    trackOnboardingCompletedOnce(trigger: string, completedSteps?: number, totalSteps?: number, onboardingId?: string): Promise<void>;
    /**
     * Track notification response
     */
    trackNotificationsResponse(status: "granted" | "denied" | "provisional"): void;
    /**
     * Track option selected (interaction event)
     */
    trackOptionSelected(optionId: string, optionValue: any, questionId?: string): void;
    /**
     * Track paywall shown
     */
    trackPaywallShown(paywallId: string, placement?: string, products?: Array<{
        productId: string;
        price?: number;
        currency?: string;
    }>): void;
    /**
     * Track purchase started
     * Call this when user initiates a purchase from a paywall
     */
    trackPurchaseStarted(properties: PurchaseStartedProperties): void;
    /**
     * Track purchase completed
     * CRITICAL: originalTransactionId is required for attribution
     * Context (paywallId, screenName, flowId) is automatically included
     */
    trackPurchaseCompleted(properties: PurchaseCompletedProperties): void;
    /**
     * Track purchase failed
     */
    trackPurchaseFailed(productId: string, errorCode: string, errorMessage: string): void;
    /**
     * Track purchase restored
     */
    trackPurchaseRestored(properties: PurchaseRestoredProperties): void;
    /**
     * Reset the event manager (e.g., on logout)
     */
    reset(): void;
}
export declare const eventManager: EventManager;
export { EventManager };
