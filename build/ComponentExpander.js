"use strict";
/**
 * Component Expander for RampKit
 * Expands <ramp-component/> tags in HTML to their component definitions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.expandHTML = expandHTML;
/**
 * Check if HTML contains unexpanded component tags
 */
function hasComponentTags(html) {
    return /<ramp-component\s/i.test(html);
}
/**
 * Extract attribute value from attribute string
 */
function extractAttribute(name, attributes) {
    const regex = new RegExp(`${name}\\s*=\\s*"([^"]+)"`);
    const match = attributes.match(regex);
    return match ? match[1] : null;
}
/**
 * Parse overrides JSON from attributes
 */
function parseOverrides(attributes) {
    const regex = /overrides\s*=\s*'([^']+)'/;
    const match = attributes.match(regex);
    if (!match)
        return {};
    try {
        return JSON.parse(match[1]);
    }
    catch (_a) {
        return {};
    }
}
/**
 * Expand a single component
 */
function expandComponent(component, instance, overrides) {
    let expanded = component.html;
    // 1. Prefix all data-ramp-id with instance
    expanded = expanded.replace(/data-ramp-id="([^"]+)"/g, `data-ramp-id="${instance}:$1"`);
    // 2. Apply overrides
    for (const [elementId, override] of Object.entries(overrides)) {
        const fullId = `${instance}:${elementId}`;
        if (override.text) {
            const pattern = new RegExp(`(<[^>]*data-ramp-id="${fullId}"[^>]*>)([\\s\\S]*?)(</[^>]+>)`, "g");
            expanded = expanded.replace(pattern, `$1${override.text}$3`);
        }
        if (override.src) {
            const pattern = new RegExp(`(<[^>]*data-ramp-id="${fullId}"[^>]*)\\ssrc="[^"]*"`, "g");
            expanded = expanded.replace(pattern, `$1 src="${override.src}"`);
        }
    }
    // 3. Wrap with component marker
    return `<div data-ramp-component="${component.key}:${instance}">${expanded}</div>`;
}
/**
 * Expand all <ramp-component/> tags in HTML
 */
function expandHTML(html, components) {
    if (!components || Object.keys(components).length === 0)
        return html;
    if (!hasComponentTags(html))
        return html;
    const pattern = /<ramp-component\s+([^>]*?)\/?>(?:<\/ramp-component>)?/gi;
    return html.replace(pattern, (match, attributes) => {
        const key = extractAttribute("key", attributes);
        const instance = extractAttribute("instance", attributes);
        if (!key || !instance)
            return match;
        const component = components[key];
        if (!component)
            return `<!-- Component "${key}" not found -->`;
        const overrides = parseOverrides(attributes);
        return expandComponent(component, instance, overrides);
    });
}
