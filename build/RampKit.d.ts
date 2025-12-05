/**
 * RampKit Core SDK
 * Main SDK class for RampKit Expo integration
 */
import { DeviceInfo, RampKitConfig, EventContext } from "./types";
export declare class RampKitCore {
    private static _instance;
    private config;
    private onboardingData;
    private userId;
    private appId;
    private deviceInfo;
    private onOnboardingFinished?;
    private onShowPaywall?;
    private appStateSubscription;
    private lastAppState;
    private initialized;
    static get instance(): RampKitCore;
    /**
     * Initialize the RampKit SDK
     */
    init(config: RampKitConfig): Promise<void>;
    /**
     * Send user/device data to the /app-users endpoint
     */
    private sendUserDataToBackend;
    /**
     * Setup app state listener for background/foreground tracking
     */
    private setupAppStateListener;
    /**
     * Get the onboarding data
     */
    getOnboardingData(): any;
    /**
     * Get the user ID
     */
    getUserId(): string | null;
    /**
     * Get the device info
     */
    getDeviceInfo(): DeviceInfo | null;
    /**
     * Check if SDK is initialized
     */
    isInitialized(): boolean;
    /**
     * Show the onboarding overlay
     */
    showOnboarding(opts?: {
        onShowPaywall?: (payload?: any) => void;
        showPaywall?: (payload?: any) => void;
    }): void;
    /**
     * Close the onboarding overlay
     */
    closeOnboarding(): void;
    /**
     * Track a custom event
     */
    trackEvent(eventName: string, properties?: Record<string, any>, context?: Partial<EventContext>): void;
    /**
     * Track a screen view
     */
    trackScreenView(screenName: string, referrer?: string): void;
    /**
     * Track a CTA tap
     */
    trackCtaTap(buttonId: string, buttonText?: string): void;
    /**
     * Cleanup SDK resources
     */
    cleanup(): Promise<void>;
}
