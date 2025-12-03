/**
 * RampKit Device Info Collector
 * Collects device information using native modules for the /app-users endpoint
 */
import { DeviceInfo } from "./types";
/**
 * Get session start time
 */
export declare function getSessionStartTime(): Date | null;
/**
 * Get the current session duration in seconds
 */
export declare function getSessionDurationSeconds(): number;
/**
 * Collect all device information using native module
 */
export declare function collectDeviceInfo(): Promise<DeviceInfo>;
/**
 * Reset session (call when app is fully restarted)
 */
export declare function resetSession(): void;
