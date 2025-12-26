/**
 * RampKit Logger
 * Centralized logging with verbose mode support
 *
 * Like RevenueCat, the SDK logs minimal information by default.
 * Enable verbose logging during development to see detailed logs.
 */

let verboseLogging = false;

/**
 * Set verbose logging mode
 * When enabled, additional debug information will be logged
 */
export function setVerboseLogging(enabled: boolean): void {
  verboseLogging = enabled;
}

/**
 * Check if verbose logging is enabled
 */
export function isVerboseLogging(): boolean {
  return verboseLogging;
}

/**
 * RampKit Logger
 * - info(): Always logged - important SDK status messages
 * - verbose(): Only logged when verboseLogging is enabled
 * - warn(): Always logged - warnings that don't break functionality
 * - error(): Always logged - errors that affect functionality
 */
export const Logger = {
  /**
   * Log important status messages (always shown)
   * Use sparingly - only for SDK lifecycle events
   */
  info(message: string, ...args: any[]): void {
    console.log(`[RampKit] ${message}`, ...args);
  },

  /**
   * Log detailed debug information (only when verbose mode enabled)
   * Use for step-by-step progress, variable values, etc.
   */
  verbose(message: string, ...args: any[]): void {
    if (verboseLogging) {
      console.log(`[RampKit] ${message}`, ...args);
    }
  },

  /**
   * Log warnings (always shown)
   * Use for recoverable issues, deprecations, or unexpected states
   */
  warn(message: string, ...args: any[]): void {
    console.warn(`[RampKit] ${message}`, ...args);
  },

  /**
   * Log errors (always shown)
   * Use for failures that affect SDK functionality
   */
  error(message: string, ...args: any[]): void {
    console.error(`[RampKit] ${message}`, ...args);
  },
};
