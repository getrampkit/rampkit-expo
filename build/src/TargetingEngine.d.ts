/**
 * RampKit Targeting Engine
 * Evaluates targeting rules and handles A/B allocation
 */
import { ManifestTarget, TargetRules, TargetRule, TargetOnboarding, TargetingContext } from "./types";
/**
 * Result of target evaluation including metadata for logging/analytics
 */
export interface TargetEvaluationResult {
    onboarding: TargetOnboarding;
    targetId: string;
    targetName: string;
    bucket: number;
    versionId: string | null;
}
/**
 * Evaluate all targets and return the selected onboarding
 * Targets are evaluated in priority order (0 = highest priority)
 * Falls back to lowest priority target if none match
 */
export declare function evaluateTargets(targets: ManifestTarget[], context: TargetingContext, userId: string): TargetEvaluationResult | null;
/**
 * Evaluate a set of rules against the context
 * Empty rules = matches all users
 */
export declare function evaluateRules(rules: TargetRules, context: TargetingContext): boolean;
/**
 * Evaluate a single rule against the context
 */
export declare function evaluateRule(rule: TargetRule, context: TargetingContext): boolean;
/**
 * Select an onboarding based on allocation percentages
 * Uses deterministic hashing for consistent A/B assignment
 */
export declare function selectOnboardingByAllocation(onboardings: TargetOnboarding[], userId: string): {
    onboarding: TargetOnboarding;
    bucket: number;
};
