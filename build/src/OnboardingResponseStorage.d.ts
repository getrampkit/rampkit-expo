/**
 * OnboardingResponseStorage
 * Manages persistent storage of onboarding variables
 */
/**
 * Manages persistent storage of onboarding variables
 */
export declare const OnboardingResponseStorage: {
    /**
     * Initialize with initial values from onboarding config
     */
    initializeVariables(initialVariables: Record<string, any>): Promise<void>;
    /**
     * Update variables (merges with existing)
     */
    updateVariables(newVariables: Record<string, any>): Promise<void>;
    /**
     * Get stored variables
     */
    getVariables(): Promise<Record<string, any>>;
    /**
     * Clear all stored variables
     */
    clearVariables(): Promise<void>;
};
