"use strict";
/**
 * RampKit Targeting Engine
 * Evaluates targeting rules and handles A/B allocation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateTargets = evaluateTargets;
exports.evaluateRules = evaluateRules;
exports.evaluateRule = evaluateRule;
exports.selectOnboardingByAllocation = selectOnboardingByAllocation;
const Logger_1 = require("./Logger");
/**
 * Evaluate all targets and return the selected onboarding
 * Targets are evaluated in priority order (0 = highest priority)
 * Falls back to lowest priority target if none match
 */
function evaluateTargets(targets, context, userId) {
    if (!targets || targets.length === 0) {
        Logger_1.Logger.verbose("TargetingEngine", "No targets in manifest");
        return null;
    }
    // Sort by priority ascending (0 = highest priority, evaluated first)
    const sorted = [...targets].sort((a, b) => a.priority - b.priority);
    Logger_1.Logger.verbose("TargetingEngine", `Evaluating ${sorted.length} targets for user ${userId.substring(0, 8)}...`);
    for (const target of sorted) {
        const matches = evaluateRules(target.rules, context);
        Logger_1.Logger.verbose("TargetingEngine", `Target "${target.name}" (priority ${target.priority}): ${matches ? "MATCHED" : "no match"}`);
        if (matches) {
            const { onboarding, bucket } = selectOnboardingByAllocation(target.onboardings, userId);
            Logger_1.Logger.verbose("TargetingEngine", `Selected onboarding ${onboarding.id} (bucket ${bucket}, allocation ${onboarding.allocation}%)`);
            return {
                onboarding,
                targetId: target.id,
                targetName: target.name,
                bucket,
            };
        }
    }
    // Fallback: use the lowest priority target (last in sorted array)
    const fallbackTarget = sorted[sorted.length - 1];
    Logger_1.Logger.verbose("TargetingEngine", `No targets matched, using fallback target "${fallbackTarget.name}"`);
    const { onboarding, bucket } = selectOnboardingByAllocation(fallbackTarget.onboardings, userId);
    return {
        onboarding,
        targetId: fallbackTarget.id,
        targetName: fallbackTarget.name,
        bucket,
    };
}
/**
 * Evaluate a set of rules against the context
 * Empty rules = matches all users
 */
function evaluateRules(rules, context) {
    // Empty rules array = match all users
    if (!rules.rules || rules.rules.length === 0) {
        return true;
    }
    if (rules.match === "all") {
        // AND logic - all rules must match
        return rules.rules.every((rule) => evaluateRule(rule, context));
    }
    else {
        // OR logic - at least one rule must match
        return rules.rules.some((rule) => evaluateRule(rule, context));
    }
}
/**
 * Evaluate a single rule against the context
 */
function evaluateRule(rule, context) {
    // Parse attribute path (e.g., "device.country" -> ["device", "country"])
    const parts = rule.attribute.split(".");
    if (parts.length !== 2) {
        Logger_1.Logger.verbose("TargetingEngine", `Invalid attribute format: ${rule.attribute}`);
        return false;
    }
    const [category, attr] = parts;
    // Get the actual value from context
    const categoryObj = context[category];
    if (!categoryObj || typeof categoryObj !== "object") {
        Logger_1.Logger.verbose("TargetingEngine", `Unknown category: ${category}`);
        return false;
    }
    const actualValue = categoryObj[attr];
    // Handle null/undefined - rule doesn't match
    if (actualValue === null || actualValue === undefined) {
        Logger_1.Logger.verbose("TargetingEngine", `Attribute ${rule.attribute} is null/undefined, rule does not match`);
        return false;
    }
    // Apply operator
    const result = applyOperator(rule.operator, actualValue, rule.value);
    Logger_1.Logger.verbose("TargetingEngine", `Rule: ${rule.attribute} ${rule.operator} "${rule.value}" => actual: "${actualValue}" => ${result}`);
    return result;
}
/**
 * Apply an operator to compare actual value with expected value
 */
function applyOperator(operator, actualValue, expectedValue) {
    switch (operator) {
        // Text operators
        case "equals":
            return String(actualValue) === expectedValue;
        case "not_equals":
            return String(actualValue) !== expectedValue;
        case "contains":
            return String(actualValue).toLowerCase().includes(expectedValue.toLowerCase());
        case "starts_with":
            return String(actualValue).toLowerCase().startsWith(expectedValue.toLowerCase());
        // Number operators
        case "greater_than":
            return Number(actualValue) > Number(expectedValue);
        case "less_than":
            return Number(actualValue) < Number(expectedValue);
        // Boolean operators
        case "is_true":
            return actualValue === true;
        case "is_false":
            return actualValue === false;
        default:
            Logger_1.Logger.verbose("TargetingEngine", `Unknown operator: ${operator}`);
            return false;
    }
}
/**
 * Select an onboarding based on allocation percentages
 * Uses deterministic hashing for consistent A/B assignment
 */
function selectOnboardingByAllocation(onboardings, userId) {
    if (onboardings.length === 0) {
        throw new Error("No onboardings in target");
    }
    // Single onboarding - no allocation needed
    if (onboardings.length === 1) {
        return { onboarding: onboardings[0], bucket: 0 };
    }
    // Generate deterministic bucket (0-99) from userId
    const bucket = hashUserIdToBucket(userId);
    // Find which allocation bucket the user falls into
    let cumulative = 0;
    for (const onboarding of onboardings) {
        cumulative += onboarding.allocation;
        if (bucket < cumulative) {
            return { onboarding, bucket };
        }
    }
    // Fallback to last onboarding (handles rounding errors or allocation < 100)
    return { onboarding: onboardings[onboardings.length - 1], bucket };
}
/**
 * Hash userId to a bucket 0-99 using djb2 algorithm
 * This is deterministic - same userId always gets same bucket
 */
function hashUserIdToBucket(userId) {
    let hash = 5381;
    for (let i = 0; i < userId.length; i++) {
        const char = userId.charCodeAt(i);
        hash = ((hash << 5) + hash) + char; // hash * 33 + char
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash % 100);
}
