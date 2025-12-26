"use strict";
/**
 * RampKit Logger
 * Centralized logging with verbose mode support
 *
 * Like RevenueCat, the SDK logs minimal information by default.
 * Enable verbose logging during development to see detailed logs.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
exports.setVerboseLogging = setVerboseLogging;
exports.isVerboseLogging = isVerboseLogging;
let verboseLogging = false;
/**
 * Set verbose logging mode
 * When enabled, additional debug information will be logged
 */
function setVerboseLogging(enabled) {
    verboseLogging = enabled;
}
/**
 * Check if verbose logging is enabled
 */
function isVerboseLogging() {
    return verboseLogging;
}
/**
 * RampKit Logger
 * - info(): Always logged - important SDK status messages
 * - verbose(): Only logged when verboseLogging is enabled
 * - warn(): Always logged - warnings that don't break functionality
 * - error(): Always logged - errors that affect functionality
 */
exports.Logger = {
    /**
     * Log important status messages (always shown)
     * Use sparingly - only for SDK lifecycle events
     */
    info(message, ...args) {
        console.log(`[RampKit] ${message}`, ...args);
    },
    /**
     * Log detailed debug information (only when verbose mode enabled)
     * Use for step-by-step progress, variable values, etc.
     */
    verbose(message, ...args) {
        if (verboseLogging) {
            console.log(`[RampKit] ${message}`, ...args);
        }
    },
    /**
     * Log warnings (always shown)
     * Use for recoverable issues, deprecations, or unexpected states
     */
    warn(message, ...args) {
        console.warn(`[RampKit] ${message}`, ...args);
    },
    /**
     * Log errors (always shown)
     * Use for failures that affect SDK functionality
     */
    error(message, ...args) {
        console.error(`[RampKit] ${message}`, ...args);
    },
};
