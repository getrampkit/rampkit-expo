/**
 * RampKit Targeting Context
 * Builds targeting context from DeviceInfo for rule evaluation
 */
import { DeviceInfo, TargetingContext } from "./types";
/**
 * Build targeting context from DeviceInfo
 * Maps SDK device info to the attribute structure used by targeting rules
 */
export declare function buildTargetingContext(deviceInfo: DeviceInfo | null): TargetingContext;
