/**
 * RampKit Device Info Collector
 * Collects device information using native modules for the /app-users endpoint
 */
import { DeviceInfo, RampKitContext } from "./types";
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
/**
 * Build RampKit context from DeviceInfo for WebView template resolution
 * This creates the device/user context that gets injected as window.rampkitContext
 */
export declare function buildRampKitContext(deviceInfo: DeviceInfo): RampKitContext;
