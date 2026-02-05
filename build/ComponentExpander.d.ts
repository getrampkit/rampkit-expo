/**
 * Component Expander for RampKit
 * Expands <ramp-component/> tags in HTML to their component definitions
 */
import { SDKComponent } from "./types";
/**
 * Expand all <ramp-component/> tags in HTML
 */
export declare function expandHTML(html: string, components?: Record<string, SDKComponent>): string;
