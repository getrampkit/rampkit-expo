/**
 * OnboardingResponseStorage
 * Manages persistent storage of onboarding responses
 */
import { OnboardingResponse } from "./types";
/**
 * Manages persistent storage of onboarding responses
 */
export declare const OnboardingResponseStorage: {
    /**
     * Save a new response, merging with existing responses
     * If a response with the same questionId exists, it will be updated
     */
    saveResponse(response: OnboardingResponse): Promise<void>;
    /**
     * Retrieve all stored responses
     * @returns Array of OnboardingResponse objects, empty array if none found
     */
    retrieveResponses(): Promise<OnboardingResponse[]>;
    /**
     * Clear all stored responses
     */
    clearResponses(): Promise<void>;
};
