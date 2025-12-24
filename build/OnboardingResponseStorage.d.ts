/**
 * OnboardingResponseStorage
 * Manages persistent storage of onboarding state variables
 */
/**
 * Represents the stored onboarding state
 */
export interface OnboardingState {
    /** The state variables as key-value pairs */
    variables: Record<string, any>;
    /** ISO 8601 timestamp when the state was last updated */
    updatedAt: string;
}
/**
 * Manages persistent storage of onboarding state variables
 */
export declare const OnboardingResponseStorage: {
    /**
     * Initialize the state with initial values from onboarding config
     * This should be called when onboarding starts
     */
    initializeState(initialVariables: Record<string, any>): Promise<void>;
    /**
     * Update state with new variable values (merges with existing)
     */
    updateState(newVariables: Record<string, any>): Promise<void>;
    /**
     * Retrieve the stored state
     * @returns OnboardingState object with variables and timestamp
     */
    retrieveState(): Promise<OnboardingState>;
    /**
     * Retrieve just the variables (convenience method)
     * @returns Record of variable name to value
     */
    retrieveVariables(): Promise<Record<string, any>>;
    /**
     * Clear all stored state
     */
    clearState(): Promise<void>;
    clearResponses(): Promise<void>;
};
