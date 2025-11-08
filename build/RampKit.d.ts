export declare class RampKitCore {
    private static _instance;
    private config;
    private onboardingData;
    private static readonly ONBOARDING_URL;
    static get instance(): RampKitCore;
    init(config: {
        apiKey: string;
        environment?: string;
        autoShowOnboarding?: boolean;
    }): Promise<void>;
    getOnboardingData(): any;
    showOnboarding(): void;
}
