export declare class RampKitCore {
    private static _instance;
    private config;
    static get instance(): RampKitCore;
    init(config: {
        apiKey: string;
        environment?: string;
    }): void;
    showOnboarding(): void;
}
