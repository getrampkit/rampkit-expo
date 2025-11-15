export declare class RampKitCore {
    private static _instance;
    private config;
    private onboardingData;
    private userId;
    private onOnboardingFinished?;
    private onShowPaywall?;
    private static readonly ONBOARDING_URL;
    static get instance(): RampKitCore;
    init(config: {
        apiKey: string;
        environment?: string;
        autoShowOnboarding?: boolean;
        onOnboardingFinished?: (payload?: any) => void;
        showPaywall?: (payload?: any) => void;
    }): Promise<void>;
    getOnboardingData(): any;
    getUserId(): string | null;
    showOnboarding(opts?: {
        showPaywall?: (payload?: any) => void;
    }): void;
}
