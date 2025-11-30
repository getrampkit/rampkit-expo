export declare class RampKitCore {
    private static _instance;
    private config;
    private onboardingData;
    private userId;
    private appId;
    private onOnboardingFinished?;
    private onShowPaywall?;
    private static readonly MANIFEST_BASE_URL;
    static get instance(): RampKitCore;
    init(config: {
        appId: string;
        apiKey?: string;
        environment?: string;
        autoShowOnboarding?: boolean;
        onOnboardingFinished?: (payload?: any) => void;
        onShowPaywall?: (payload?: any) => void;
        showPaywall?: (payload?: any) => void;
    }): Promise<void>;
    getOnboardingData(): any;
    getUserId(): string | null;
    showOnboarding(opts?: {
        onShowPaywall?: (payload?: any) => void;
        showPaywall?: (payload?: any) => void;
    }): void;
    closeOnboarding(): void;
}
