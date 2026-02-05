/**
 * Component Expander for RampKit
 * Expands <ramp-component/> tags in HTML to their component definitions
 */

import { SDKComponent } from "./types";

/**
 * Override properties for component elements
 */
interface ComponentOverride {
  text?: string;
  src?: string;
  style?: string;
}

/**
 * Check if HTML contains unexpanded component tags
 */
function hasComponentTags(html: string): boolean {
  return /<ramp-component\s/i.test(html);
}

/**
 * Extract attribute value from attribute string
 */
function extractAttribute(name: string, attributes: string): string | null {
  const regex = new RegExp(`${name}\\s*=\\s*"([^"]+)"`);
  const match = attributes.match(regex);
  return match ? match[1] : null;
}

/**
 * Parse overrides JSON from attributes
 */
function parseOverrides(attributes: string): Record<string, ComponentOverride> {
  const regex = /overrides\s*=\s*'([^']+)'/;
  const match = attributes.match(regex);
  if (!match) return {};

  try {
    return JSON.parse(match[1]);
  } catch {
    return {};
  }
}

/**
 * Expand a single component
 */
function expandComponent(
  component: SDKComponent,
  instance: string,
  overrides: Record<string, ComponentOverride>
): string {
  let expanded = component.html;

  // 1. Prefix all data-ramp-id with instance
  expanded = expanded.replace(
    /data-ramp-id="([^"]+)"/g,
    `data-ramp-id="${instance}:$1"`
  );

  // 2. Apply overrides
  for (const [elementId, override] of Object.entries(overrides)) {
    const fullId = `${instance}:${elementId}`;

    if (override.text) {
      const pattern = new RegExp(
        `(<[^>]*data-ramp-id="${fullId}"[^>]*>)([\\s\\S]*?)(</[^>]+>)`,
        "g"
      );
      expanded = expanded.replace(pattern, `$1${override.text}$3`);
    }

    if (override.src) {
      const pattern = new RegExp(
        `(<[^>]*data-ramp-id="${fullId}"[^>]*)\\ssrc="[^"]*"`,
        "g"
      );
      expanded = expanded.replace(pattern, `$1 src="${override.src}"`);
    }
  }

  // 3. Wrap with component marker
  return `<div data-ramp-component="${component.key}:${instance}">${expanded}</div>`;
}

/**
 * Expand all <ramp-component/> tags in HTML
 */
export function expandHTML(
  html: string,
  components?: Record<string, SDKComponent>
): string {
  if (!components || Object.keys(components).length === 0) return html;
  if (!hasComponentTags(html)) return html;

  const pattern = /<ramp-component\s+([^>]*?)\/?>(?:<\/ramp-component>)?/gi;

  return html.replace(pattern, (match, attributes) => {
    const key = extractAttribute("key", attributes);
    const instance = extractAttribute("instance", attributes);

    if (!key || !instance) return match;

    const component = components[key];
    if (!component) return `<!-- Component "${key}" not found -->`;

    const overrides = parseOverrides(attributes);
    return expandComponent(component, instance, overrides);
  });
}
