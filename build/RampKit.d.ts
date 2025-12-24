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
    private initialized;
    /** Custom App User ID provided by the developer (alias for their user system) */
    private appUserID;
    static get instance(): RampKitCore;
    /**
     * Configure the RampKit SDK
     * @param config Configuration options including appId, callbacks, and optional appUserID
     */
    configure(config: RampKitConfig): Promise<void>;
    /**
     * @deprecated Use `configure()` instead. This method will be removed in a future version.
     */
    init(config: RampKitConfig): Promise<void>;
    /**
     * Set a custom App User ID to associate with this user.
     * This is an alias for your own user identification system.
     *
     * Note: This does NOT replace the RampKit-generated user ID (appUserId).
     * RampKit will continue to use its own stable UUID for internal tracking.
     * This custom ID is sent to the backend for you to correlate with your own user database.
     *
     * @param appUserID Your custom user identifier
     */
    setAppUserID(appUserID: string): Promise<void>;
    /**
     * Get the custom App User ID if one has been set.
     * @returns The custom App User ID or null if not set
     */
    getAppUserID(): string | null;
    /**
     * Send user/device data to the /app-users endpoint
     */
    private sendUserDataToBackend;
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
     * Get all user answers from onboarding
     */
    getAnswers(): Promise<Record<string, any>>;
    /**
     * Get a single answer by key
     */
    getAnswer(key: string): Promise<any>;
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
     * Reset the SDK state and re-initialize
     * Call this when a user logs out or when you need to clear all cached state
     */
    reset(): Promise<void>;
}
