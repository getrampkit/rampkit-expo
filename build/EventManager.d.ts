/**
 * RampKit Event Manager
 * Handles event tracking for the /app-user-events endpoint
 */
import { DeviceInfo, EventContext, RampKitEventName } from "./types";
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
     * Track app backgrounded
     */
    trackAppBackgrounded(sessionDurationSeconds: number): void;
    /**
     * Track app foregrounded
     */
    trackAppForegrounded(): void;
    /**
     * Track screen view
     */
    trackScreenView(screenName: string, referrer?: string): void;
    /**
     * Track CTA tap
     */
    trackCtaTap(buttonId: string, buttonText?: string): void;
    /**
     * Track onboarding started
     */
    trackOnboardingStarted(onboardingId: string, totalSteps?: number): void;
    /**
     * Track onboarding screen viewed
     */
    trackOnboardingScreenViewed(screenName: string, screenIndex: number, totalScreens: number, onboardingId?: string): void;
    /**
     * Track onboarding question answered
     */
    trackOnboardingQuestionAnswered(questionId: string, answer: any, questionText?: string, onboardingId?: string): void;
    /**
     * Track onboarding completed
     */
    trackOnboardingCompleted(completedSteps: number, totalSteps: number, onboardingId?: string): void;
    /**
     * Track onboarding abandoned
     */
    trackOnboardingAbandoned(reason: string, lastScreenName?: string, onboardingId?: string): void;
    /**
     * Track notification prompt shown
     */
    trackNotificationsPromptShown(): void;
    /**
     * Track notification response
     */
    trackNotificationsResponse(status: "granted" | "denied" | "provisional"): void;
    /**
     * Track paywall shown
     */
    trackPaywallShown(paywallId: string, placement?: string, products?: Array<{
        productId: string;
        price?: number;
        currency?: string;
    }>): void;
    /**
     * Track paywall primary action tap
     */
    trackPaywallPrimaryActionTap(paywallId: string, productId?: string): void;
    /**
     * Track paywall closed
     */
    trackPaywallClosed(paywallId: string, reason: "dismissed" | "purchased" | "backgrounded"): void;
    /**
     * Track purchase started
     */
    trackPurchaseStarted(productId: string, amount?: number, currency?: string): void;
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
    }): void;
    /**
     * Track purchase failed
     */
    trackPurchaseFailed(productId: string, errorCode: string, errorMessage: string): void;
    /**
     * Reset the event manager (e.g., on logout)
     */
    reset(): void;
}
export declare const eventManager: EventManager;
export { EventManager };
