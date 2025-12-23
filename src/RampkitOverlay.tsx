import React, { useMemo, useRef, useState } from "react";
import { View, StyleSheet, BackHandler, Animated, Easing, Linking, Platform, useWindowDimensions } from "react-native";
import RootSiblings from "react-native-root-siblings";
// PagerView removed - we now render all screens in a stack to ensure first paint completes
// before any navigation. This fixes the "glitch on first open" bug.
import { WebView } from "react-native-webview";
import { Haptics, StoreReview, Notifications } from "./RampKitNative";
import { RampKitContext, NavigationData, OnboardingResponse } from "./types";
import { OnboardingResponseStorage } from "./OnboardingResponseStorage";

// Reuse your injected script from App
export const injectedHardening = `
(function(){
  try {
    var meta = document.querySelector('meta[name="viewport"]');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'viewport'; document.head.appendChild(meta); }
    meta.setAttribute('content','width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
    var style = document.createElement('style');
    style.textContent='html,body{overflow-x:hidden!important;} html,body,*{-webkit-user-select:none!important;user-select:none!important;-webkit-touch-callout:none!important;-ms-user-select:none!important;touch-action: pan-y;} *{-webkit-tap-highlight-color: rgba(0,0,0,0)!important;} ::selection{background: transparent!important;} ::-moz-selection{background: transparent!important;} a,img{-webkit-user-drag:none!important;user-drag:none!important;-webkit-touch-callout:none!important} input,textarea{caret-color:transparent!important;-webkit-user-select:none!important;user-select:none!important}';
    document.head.appendChild(style);
    var prevent=function(e){e.preventDefault&&e.preventDefault();};
    document.addEventListener('gesturestart',prevent,{passive:false});
    document.addEventListener('gesturechange',prevent,{passive:false});
    document.addEventListener('gestureend',prevent,{passive:false});
    document.addEventListener('dblclick',prevent,{passive:false});
    document.addEventListener('wheel',function(e){ if(e.ctrlKey) e.preventDefault(); },{passive:false});
    document.addEventListener('touchmove',function(e){ if(e.scale && e.scale !== 1) e.preventDefault(); },{passive:false});
    document.addEventListener('selectstart',prevent,{passive:false,capture:true});
    document.addEventListener('contextmenu',prevent,{passive:false,capture:true});
    document.addEventListener('copy',prevent,{passive:false,capture:true});
    document.addEventListener('cut',prevent,{passive:false,capture:true});
    document.addEventListener('paste',prevent,{passive:false,capture:true});
    document.addEventListener('dragstart',prevent,{passive:false,capture:true});
    // Belt-and-suspenders: aggressively clear any attempted selection
    var clearSel=function(){
      try{var sel=window.getSelection&&window.getSelection(); if(sel&&sel.removeAllRanges) sel.removeAllRanges();}catch(_){} }
    document.addEventListener('selectionchange',clearSel,{passive:true,capture:true});
    document.onselectstart=function(){ clearSel(); return false; };
    try{ document.documentElement.style.webkitUserSelect='none'; document.documentElement.style.userSelect='none'; }catch(_){ }
    try{ document.body.style.webkitUserSelect='none'; document.body.style.userSelect='none'; }catch(_){ }
    var __selTimer = setInterval(clearSel, 160);
    window.addEventListener('pagehide',function(){ try{ clearInterval(__selTimer); }catch(_){} });
    // Continuously enforce no-select on all elements and new nodes
    var enforceNoSelect = function(el){
      try{
        el.style && (el.style.webkitUserSelect='none', el.style.userSelect='none', el.style.webkitTouchCallout='none');
        el.setAttribute && (el.setAttribute('unselectable','on'), el.setAttribute('contenteditable','false'));
      }catch(_){}
    }
    try{
      var all=document.getElementsByTagName('*');
      for(var i=0;i<all.length;i++){ enforceNoSelect(all[i]); }
      var obs = new MutationObserver(function(muts){
        for(var j=0;j<muts.length;j++){
          var m=muts[j];
          if(m.type==='childList'){
            m.addedNodes && m.addedNodes.forEach && m.addedNodes.forEach(function(n){ if(n && n.nodeType===1){ enforceNoSelect(n); var q=n.getElementsByTagName? n.getElementsByTagName('*'): []; for(var k=0;k<q.length;k++){ enforceNoSelect(q[k]); }}});
          } else if(m.type==='attributes'){
            enforceNoSelect(m.target);
          }
        }
      });
      obs.observe(document.documentElement,{ childList:true, subtree:true, attributes:true, attributeFilter:['contenteditable','style'] });
    }catch(_){ }
  } catch(_) {}
})(); true;
`;

// Lightweight, idempotent no-select script per the online pattern
export const injectedNoSelect = `
(function(){
  try {
    if (window.__rkNoSelectApplied) return true;
    window.__rkNoSelectApplied = true;
    var style = document.getElementById('rk-no-select-style');
    if (!style) {
      style = document.createElement('style');
      style.id = 'rk-no-select-style';
      style.innerHTML = "\n        * {\n          user-select: none !important;\n          -webkit-user-select: none !important;\n          -webkit-touch-callout: none !important;\n        }\n        ::selection {\n          background: transparent !important;\n        }\n      ";
      document.head.appendChild(style);
    }
    var prevent = function(e){ if(e && e.preventDefault) e.preventDefault(); return false; };
    document.addEventListener('contextmenu', prevent, { passive: false, capture: true });
    document.addEventListener('selectstart', prevent, { passive: false, capture: true });
  } catch (_) {}
  true;
})();
`;

// Robust variable handler that ensures variables are always received and applied
// This runs after content loads and sets up listeners for incoming variable updates
export const injectedVarsHandler = `
(function(){
  try {
    if (window.__rkVarsHandlerApplied) return true;
    window.__rkVarsHandlerApplied = true;
    
    // Handler function that updates variables and notifies the page
    window.__rkHandleVarsUpdate = function(vars) {
      if (!vars || typeof vars !== 'object') return;
      // Update the global variables object
      window.__rampkitVariables = vars;
      // Dispatch a custom event that the page's JS can listen to for re-rendering
      try {
        document.dispatchEvent(new CustomEvent('rampkit:vars-updated', { detail: vars }));
      } catch(e) {}
      // Also try calling a global handler if the page defined one
      try {
        if (typeof window.onRampkitVarsUpdate === 'function') {
          window.onRampkitVarsUpdate(vars);
        }
      } catch(e) {}
    };
    
    // Listen for message events from React Native
    document.addEventListener('message', function(event) {
      try {
        var data = event.data;
        if (data && data.type === 'rampkit:variables' && data.vars) {
          window.__rkHandleVarsUpdate(data.vars);
        }
      } catch(e) {}
    }, false);
    
    // Also listen on window for compatibility
    window.addEventListener('message', function(event) {
      try {
        var data = event.data;
        if (data && data.type === 'rampkit:variables' && data.vars) {
          window.__rkHandleVarsUpdate(data.vars);
        }
      } catch(e) {}
    }, false);
  } catch (_) {}
  true;
})();
`;

// Dynamic tap behavior handler - intercepts clicks and evaluates conditions
// Must run BEFORE content loads to capture all clicks
export const injectedDynamicTapHandler = `
(function() {
    if (window.__rampkitClickInterceptorInstalled) return;
    window.__rampkitClickInterceptorInstalled = true;
    
    // Decode HTML entities
    function decodeHtml(str) {
        if (!str) return str;
        return str.replace(/&quot;/g, '"').replace(/&#34;/g, '"').replace(/&#x22;/g, '"')
                  .replace(/&apos;/g, "'").replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
                  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    }
    
    // Find dynamic tap config on element or ancestors
    function findDynamicTap(el) {
        var current = el;
        var depth = 0;
        var attrNames = ['data-tap-dynamic', 'data-tapdynamic', 'tapDynamic', 'data-dynamic-tap'];
        while (current && current !== document.body && current !== document.documentElement && depth < 20) {
            if (current.getAttribute) {
                for (var i = 0; i < attrNames.length; i++) {
                    var attr = current.getAttribute(attrNames[i]);
                    if (attr && attr.length > 2) {
                        return { element: current, config: attr };
                    }
                }
                if (current.dataset && current.dataset.tapDynamic) {
                    return { element: current, config: current.dataset.tapDynamic };
                }
            }
            current = current.parentElement;
            depth++;
        }
        return null;
    }
    
    // Get variables for condition evaluation - check ALL possible sources
    function getVars() {
        var vars = {};
        if (window.__rampkitVariables) {
            Object.keys(window.__rampkitVariables).forEach(function(k) {
                vars[k] = window.__rampkitVariables[k];
            });
        }
        if (window.__rampkitVars) {
            Object.keys(window.__rampkitVars).forEach(function(k) {
                vars[k] = window.__rampkitVars[k];
            });
        }
        if (window.RK_VARS) {
            Object.keys(window.RK_VARS).forEach(function(k) {
                vars[k] = window.RK_VARS[k];
            });
        }
        return vars;
    }
    
    // Evaluate a single rule
    function evalRule(rule, vars) {
        if (!rule || !rule.key) return false;
        var left = vars[rule.key];
        var right = rule.value;
        var op = rule.op || '=';
        if (left === undefined || left === null) left = '';
        if (right === undefined || right === null) right = '';
        var leftStr = String(left);
        var rightStr = String(right);
        var result = false;
        switch (op) {
            case '=': case '==': result = leftStr === rightStr; break;
            case '!=': case '<>': result = leftStr !== rightStr; break;
            case '>': result = parseFloat(left) > parseFloat(right); break;
            case '<': result = parseFloat(left) < parseFloat(right); break;
            case '>=': result = parseFloat(left) >= parseFloat(right); break;
            case '<=': result = parseFloat(left) <= parseFloat(right); break;
            default: result = false;
        }
        return result;
    }
    
    // Evaluate all rules (AND logic)
    function evalRules(rules, vars) {
        if (!rules || !rules.length) return true;
        for (var i = 0; i < rules.length; i++) {
            if (!evalRule(rules[i], vars)) return false;
        }
        return true;
    }
    
    // Execute an action
    function execAction(action) {
        if (!action || !action.type) return;
        var msg = null;
        var actionType = action.type.toLowerCase();
        
        switch (actionType) {
            case 'navigate':
                msg = { type: 'rampkit:navigate', targetScreenId: action.targetScreenId || '__continue__', animation: action.animation || 'fade' };
                break;
            case 'continue':
                msg = { type: 'rampkit:navigate', targetScreenId: '__continue__', animation: action.animation || 'fade' };
                break;
            case 'goback':
                msg = { type: 'rampkit:goBack', animation: action.animation || 'fade' };
                break;
            case 'close':
                msg = { type: 'rampkit:close' };
                break;
            case 'haptic':
                msg = { type: 'rampkit:haptic', hapticType: action.hapticType || 'impact', impactStyle: action.impactStyle || 'Medium', notificationType: action.notificationType };
                break;
            case 'showpaywall':
                msg = { type: 'rampkit:show-paywall', payload: action.payload || { paywallId: action.paywallId } };
                break;
            case 'requestreview':
                msg = { type: 'rampkit:request-review' };
                break;
            case 'requestnotificationpermission':
                msg = { type: 'rampkit:request-notification-permission' };
                break;
            case 'onboardingfinished':
                msg = { type: 'rampkit:onboarding-finished', payload: action.payload };
                break;
            case 'setvariable':
            case 'setstate':
            case 'updatevariable':
            case 'set':
            case 'assign':
                var varKey = action.key || action.variableName || action.name || action.variable;
                var varValue = action.variableValue !== undefined ? action.variableValue :
                               action.value !== undefined ? action.value :
                               action.newValue !== undefined ? action.newValue : undefined;
                if (varKey && varValue !== undefined) {
                    if (window.__rampkitVariables) window.__rampkitVariables[varKey] = varValue;
                    if (window.__rampkitVars) window.__rampkitVars[varKey] = varValue;
                    var updateVars = {};
                    updateVars[varKey] = varValue;
                    msg = { type: 'rampkit:variables', vars: updateVars };
                }
                break;
        }
        if (msg) {
            try {
                if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                    window.ReactNativeWebView.postMessage(JSON.stringify(msg));
                }
            } catch(e) {}
        }
    }
    
    // Evaluate dynamic tap config
    function evalDynamicTap(config) {
        if (!config || !config.values) return false;
        var vars = getVars();
        var conditions = config.values;
        for (var i = 0; i < conditions.length; i++) {
            var cond = conditions[i];
            var condType = cond.conditionType || 'if';
            var rules = cond.rules || [];
            var actions = cond.actions || [];
            if (condType === 'else' || evalRules(rules, vars)) {
                for (var j = 0; j < actions.length; j++) {
                    execAction(actions[j]);
                }
                return true;
            }
        }
        return false;
    }
    
    // Click interceptor - capture phase, runs BEFORE onclick handlers
    function interceptClick(event) {
        var result = findDynamicTap(event.target);
        if (!result) return;
        
        try {
            var configStr = decodeHtml(result.config);
            var config = JSON.parse(configStr);
            var handled = evalDynamicTap(config);
            if (handled) {
                event.stopImmediatePropagation();
                event.preventDefault();
                return false;
            }
        } catch (e) {
            console.log('[RampKit] Dynamic tap error:', e);
        }
    }
    
    // Install interceptor on window in capture phase
    window.addEventListener('click', interceptClick, true);
})();
`;

// Button tap animation script - handles spring animations for interactive elements
// Triggers on touchstart (not click) for immediate feedback
// Uses inline styles for maximum compatibility
export const injectedButtonAnimations = `
(function(){
  try {
    if (window.__rkButtonAnimApplied) return true;
    window.__rkButtonAnimApplied = true;
    
    var pressed = null;
    var pressedOriginalTransform = '';
    var pressedOriginalOpacity = '';
    var pressedOriginalTransition = '';
    var releaseTimer = null;
    
    // Find interactive element - very permissive, looks for any clickable-looking element
    function findInteractive(el) {
      var current = el;
      for (var i = 0; i < 20 && current && current !== document.body && current !== document.documentElement; i++) {
        if (!current || !current.tagName) { current = current.parentElement; continue; }
        var tag = current.tagName.toLowerCase();
        
        // Skip tiny elements (likely icons inside buttons)
        var rect = current.getBoundingClientRect();
        if (rect.width < 20 || rect.height < 20) { current = current.parentElement; continue; }
        
        // Match standard interactive elements
        if (tag === 'button' || tag === 'a' || tag === 'input' || tag === 'select') return current;
        
        // Match elements with any data attribute containing action/navigate/tap/click
        var attrs = current.attributes;
        if (attrs) {
          for (var j = 0; j < attrs.length; j++) {
            var attrName = attrs[j].name.toLowerCase();
            if (attrName.indexOf('click') !== -1 || attrName.indexOf('tap') !== -1 || 
                attrName.indexOf('action') !== -1 || attrName.indexOf('navigate') !== -1 ||
                attrName.indexOf('press') !== -1) {
              return current;
            }
          }
        }
        
        // Match elements with onclick
        if (current.onclick || current.hasAttribute('onclick')) return current;
        
        // Match elements with role="button" or tabindex
        if (current.getAttribute('role') === 'button') return current;
        
        // Match any element with an ID containing button/btn/cta
        var id = current.id || '';
        if (id && (id.toLowerCase().indexOf('button') !== -1 || id.toLowerCase().indexOf('btn') !== -1 || id.toLowerCase().indexOf('cta') !== -1)) return current;
        
        // Match elements with button-like classes
        var className = current.className;
        if (className && typeof className === 'string') {
          var cls = className.toLowerCase();
          if (cls.indexOf('btn') !== -1 || cls.indexOf('button') !== -1 || cls.indexOf('cta') !== -1 || 
              cls.indexOf('clickable') !== -1 || cls.indexOf('tappable') !== -1 || cls.indexOf('pressable') !== -1) {
            return current;
          }
        }
        
        // Match elements with cursor pointer
        try {
          var computed = window.getComputedStyle(current);
          if (computed && computed.cursor === 'pointer') return current;
        } catch(e) {}
        
        current = current.parentElement;
      }
      return null;
    }
    
    function applyPressedStyle(el) {
      if (!el || !el.style) return;
      // Save original styles
      pressedOriginalTransform = el.style.transform || '';
      pressedOriginalOpacity = el.style.opacity || '';
      pressedOriginalTransition = el.style.transition || '';
      // Apply pressed style with inline styles for maximum specificity
      el.style.transition = 'transform 80ms cubic-bezier(0.25, 0.1, 0.25, 1), opacity 80ms cubic-bezier(0.25, 0.1, 0.25, 1)';
      el.style.transform = 'scale(0.97)';
      el.style.opacity = '0.8';
    }
    
    function applyReleasedStyle(el) {
      if (!el || !el.style) return;
      // Apply spring-back animation
      el.style.transition = 'transform 280ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 280ms cubic-bezier(0.34, 1.56, 0.64, 1)';
      el.style.transform = pressedOriginalTransform || 'scale(1)';
      el.style.opacity = pressedOriginalOpacity || '1';
    }
    
    function resetStyle(el) {
      if (!el || !el.style) return;
      el.style.transform = pressedOriginalTransform;
      el.style.opacity = pressedOriginalOpacity;
      el.style.transition = pressedOriginalTransition;
    }
    
    function onTouchStart(e) {
      try {
        var target = findInteractive(e.target);
        if (!target) return;
        if (releaseTimer) { clearTimeout(releaseTimer); releaseTimer = null; }
        if (pressed && pressed !== target) { resetStyle(pressed); }
        applyPressedStyle(target);
        pressed = target;
      } catch(err) {}
    }
    
    function onTouchEnd(e) {
      try {
        if (!pressed) return;
        var t = pressed;
        applyReleasedStyle(t);
        releaseTimer = setTimeout(function() {
          resetStyle(t);
          releaseTimer = null;
        }, 300);
        pressed = null;
      } catch(err) {}
    }
    
    function onTouchCancel(e) {
      try {
        if (!pressed) return;
        resetStyle(pressed);
        pressed = null;
        if (releaseTimer) { clearTimeout(releaseTimer); releaseTimer = null; }
      } catch(err) {}
    }
    
    // Use capture phase for immediate response before any other handlers
    document.addEventListener('touchstart', onTouchStart, { passive: true, capture: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true, capture: true });
    document.addEventListener('touchcancel', onTouchCancel, { passive: true, capture: true });
    // Mouse events for testing
    document.addEventListener('mousedown', onTouchStart, { passive: true, capture: true });
    document.addEventListener('mouseup', onTouchEnd, { passive: true, capture: true });
    
  } catch (err) {}
  true;
})();
`;

export type ScreenPayload = {
  id: string;
  html: string;
  css?: string;
  js?: string;
};

type RampkitHapticEvent = {
  type: "rampkit:haptic";
  nodeId: string | null;
  nodeType: string | null;
  animation: string; // "none" | "fade" | "spring" | "shrink"...
  action: "haptic";
  hapticType: "impact" | "notification" | "selection";
  impactStyle: "Light" | "Medium" | "Heavy" | "Rigid" | "Soft" | null;
  notificationType: "Success" | "Warning" | "Error" | null;
  timestamp: number;
};

function performRampkitHaptic(event: RampkitHapticEvent | any) {
  if (!event) {
    // Backwards compatible default
    try {
      Haptics.impactAsync("medium").catch(() => {});
    } catch (_) {}
    return;
  }

  // Accept messages with action: "haptic" OR just type: "rampkit:haptic"
  const hapticType = event.hapticType || "impact";

  try {
    if (hapticType === "impact") {
      const styleMap: Record<string, "light" | "medium" | "heavy" | "rigid" | "soft"> = {
        Light: "light",
        Medium: "medium",
        Heavy: "heavy",
        Rigid: "rigid",
        Soft: "soft",
      };
      const impactStyle = styleMap[event.impactStyle] || "medium";
      Haptics.impactAsync(impactStyle).catch(() => {});
      return;
    }

    if (hapticType === "notification") {
      const notificationMap: Record<string, "success" | "warning" | "error"> = {
        Success: "success",
        Warning: "warning",
        Error: "error",
      };
      const notificationType = notificationMap[event.notificationType] || "success";
      Haptics.notificationAsync(notificationType).catch(() => {});
      return;
    }

    if (hapticType === "selection") {
      Haptics.selectionAsync().catch(() => {});
      return;
    }

    // Fallback for unknown hapticType
    Haptics.impactAsync("medium").catch(() => {});
  } catch (_) {
    try {
      Haptics.impactAsync("medium").catch(() => {});
    } catch (__ ) {}
  }
}

let sibling: any | null = null;
let preloadSibling: any | null = null;
// Cache is now disabled - always rebuild docs to ensure templates are resolved with current context
// const preloadCache = new Map<string, string[]>();
let activeCloseHandler: (() => void) | null = null;

export function showRampkitOverlay(opts: {
  onboardingId: string;
  screens: ScreenPayload[];
  variables?: Record<string, any>;
  requiredScripts?: string[];
  rampkitContext?: RampKitContext;
  navigation?: NavigationData;
  onClose?: () => void;
  onOnboardingFinished?: (payload?: any) => void;
  onShowPaywall?: (payload?: any) => void;
  // Event tracking callbacks
  onScreenChange?: (screenIndex: number, screenId: string) => void;
  onOnboardingAbandoned?: (reason: string, lastScreenIndex: number, lastScreenId: string) => void;
  onNotificationPermissionRequested?: () => void;
  onNotificationPermissionResult?: (granted: boolean) => void;
  // Called when close action is explicitly triggered (rampkit:close)
  onCloseAction?: (screenIndex: number, screenId: string) => void;
}) {
  console.log("[RampKit] showRampkitOverlay called, context:", opts.rampkitContext ? "present" : "missing");
  if (sibling) return; // already visible
  // Always build fresh docs to ensure templates are resolved with current context
  const prebuiltDocs: string[] | undefined = undefined;
  sibling = new RootSiblings(
    (
      <Overlay
        onboardingId={opts.onboardingId}
        screens={opts.screens}
        variables={opts.variables}
        requiredScripts={opts.requiredScripts}
        rampkitContext={opts.rampkitContext}
        navigation={opts.navigation}
        prebuiltDocs={prebuiltDocs}
        onRequestClose={() => {
          activeCloseHandler = null;
          hideRampkitOverlay();
          opts.onClose?.();
        }}
        onOnboardingFinished={opts.onOnboardingFinished}
        onShowPaywall={opts.onShowPaywall}
        onRegisterClose={(handler) => {
          activeCloseHandler = handler;
        }}
        onScreenChange={opts.onScreenChange}
        onOnboardingAbandoned={opts.onOnboardingAbandoned}
        onNotificationPermissionRequested={opts.onNotificationPermissionRequested}
        onNotificationPermissionResult={opts.onNotificationPermissionResult}
        onCloseAction={opts.onCloseAction}
      />
    )
  );
  // Once shown, we can safely discard the preloader sibling if present
  if (preloadSibling) {
    preloadSibling.destroy();
    preloadSibling = null;
  }
}

export function hideRampkitOverlay() {
  if (sibling) {
    sibling.destroy();
    sibling = null;
  }
  activeCloseHandler = null;
}

export function closeRampkitOverlay() {
  if (activeCloseHandler) {
    activeCloseHandler();
    return;
  }
  hideRampkitOverlay();
}

export function preloadRampkitOverlay(opts: {
  onboardingId: string;
  screens: ScreenPayload[];
  variables?: Record<string, any>;
  requiredScripts?: string[];
  rampkitContext?: RampKitContext;
}) {
  // Preloading is now simplified - just warm up the WebView process
  try {
    if (preloadSibling) return;
    const docs = opts.screens.map((s) =>
      buildHtmlDocument(s, opts.variables, opts.requiredScripts, opts.rampkitContext)
    );
    const HiddenPreloader = () => (
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          opacity: 0,
          top: -1000,
          left: -1000,
        }}
      >
        <WebView
          originWhitelist={["*"]}
          source={{ html: docs[0] || "<html></html>" }}
          injectedJavaScriptBeforeContentLoaded={injectedHardening + injectedButtonAnimations}
          injectedJavaScript={injectedNoSelect + injectedVarsHandler + injectedButtonAnimations}
          automaticallyAdjustContentInsets={false}
          contentInsetAdjustmentBehavior="never"
          bounces={false}
          scrollEnabled={false}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          cacheEnabled
          hideKeyboardAccessoryView={true}
        />
      </View>
    );
    preloadSibling = new RootSiblings(<HiddenPreloader />);
  } catch (e) {
    // best-effort preloading; ignore errors
  }
}

/**
 * Decode HTML entities in a string
 */
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#x22;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/**
 * Strip surrounding quotes from a string value
 * Handles: "value", 'value', \"value\", \'value\', "value", 'value' (unicode curly quotes)
 * Also handles multiple layers and escaped quotes
 */
function stripQuotes(str: string): string {
  let value = str.trim();
  
  // Handle backslash-escaped quotes at start/end: \"value\" -> value
  if (value.startsWith('\\"') && value.endsWith('\\"') && value.length >= 4) {
    value = value.slice(2, -2);
  } else if (value.startsWith("\\'") && value.endsWith("\\'") && value.length >= 4) {
    value = value.slice(2, -2);
  }
  // Handle regular double quotes: "value" -> value
  else if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
    value = value.slice(1, -1);
  }
  // Handle regular single quotes: 'value' -> value
  else if (value.startsWith("'") && value.endsWith("'") && value.length >= 2) {
    value = value.slice(1, -1);
  }
  // Handle unicode left/right double quotes: "value" -> value
  else if (value.startsWith('\u201C') && value.endsWith('\u201D') && value.length >= 2) {
    value = value.slice(1, -1);
  }
  // Handle unicode left/right single quotes: 'value' -> value
  else if (value.startsWith('\u2018') && value.endsWith('\u2019') && value.length >= 2) {
    value = value.slice(1, -1);
  }
  
  // Check if there's still another layer of quotes (handles double-quoted values)
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length >= 2) ||
    (trimmed.startsWith('\\"') && trimmed.endsWith('\\"') && trimmed.length >= 4) ||
    (trimmed.startsWith("\\'") && trimmed.endsWith("\\'") && trimmed.length >= 4)
  ) {
    return stripQuotes(trimmed);
  }
  
  return value;
}

/**
 * Evaluate a comparison condition against variables
 * Supports: ==, !=, >, <, >=, <=, and truthy checks
 */
function evaluateCondition(
  condition: string,
  vars: Record<string, any>
): boolean {
  condition = decodeHtmlEntities(condition.trim());

  // Match comparison operators: ==, !=, >=, <=, >, <
  const comparisonMatch = condition.match(
    /^([A-Za-z_][A-Za-z0-9_.]*)\s*(==|!=|>=|<=|>|<)\s*(.+)$/
  );

  if (comparisonMatch) {
    const [, varName, operator, rawRight] = comparisonMatch;
    const leftValue = vars.hasOwnProperty(varName) ? vars[varName] : undefined;
    let rightValue: any = decodeHtmlEntities(rawRight.trim());

    // Check if right side looks like a quoted string
    const looksLikeQuotedString = 
      (rightValue.startsWith('"') || rightValue.startsWith("'") || 
       rightValue.startsWith('\\"') || rightValue.startsWith("\\'") ||
       rightValue.startsWith('\u201C') || rightValue.startsWith('\u2018'));

    if (looksLikeQuotedString) {
      // Quoted string literal - strip the quotes
      rightValue = stripQuotes(rightValue);
    } else if (!isNaN(Number(rightValue)) && rightValue !== '') {
      // Numeric literal
      rightValue = Number(rightValue);
    } else if (rightValue === "true") {
      rightValue = true;
    } else if (rightValue === "false") {
      rightValue = false;
    } else if (rightValue === "null") {
      rightValue = null;
    } else if (vars.hasOwnProperty(rightValue)) {
      // Variable reference
      rightValue = vars[rightValue];
    }

    // Perform comparison
    switch (operator) {
      case "==":
        return leftValue == rightValue;
      case "!=":
        return leftValue != rightValue;
      case ">":
        return Number(leftValue) > Number(rightValue);
      case "<":
        return Number(leftValue) < Number(rightValue);
      case ">=":
        return Number(leftValue) >= Number(rightValue);
      case "<=":
        return Number(leftValue) <= Number(rightValue);
      default:
        return false;
    }
  }

  // Truthy check - just the variable name
  const varName = condition.trim();
  if (vars.hasOwnProperty(varName)) {
    const value = vars[varName];
    // Consider empty string as falsy
    if (value === "") return false;
    return !!value;
  }

  // Unknown variable - treat as falsy
  return false;
}

/**
 * Parse a ternary value (the part after ? or after :)
 * Returns the resolved value, handling both quoted strings and variable references
 */
function parseTernaryValue(
  value: string,
  vars: Record<string, any>
): string {
  let decoded = decodeHtmlEntities(value.trim());
  
  // Check if this looks like a quoted string
  const looksLikeQuotedString = 
    (decoded.startsWith('"') || decoded.startsWith("'") || 
     decoded.startsWith('\\"') || decoded.startsWith("\\'") ||
     decoded.startsWith('\u201C') || decoded.startsWith('\u2018'));
  
  if (looksLikeQuotedString) {
    // Strip quotes and return the inner value
    return stripQuotes(decoded);
  }

  // Otherwise treat as a variable reference
  if (vars.hasOwnProperty(decoded)) {
    const varValue = vars[decoded];
    if (varValue === undefined || varValue === null) return "";
    if (typeof varValue === "boolean") return varValue ? "true" : "false";
    if (typeof varValue === "object") return JSON.stringify(varValue);
    return String(varValue);
  }

  // Return as-is if not found (could be a literal like a number)
  return decoded;
}

/**
 * Parse a ternary expression and find the colon that separates true/false values
 * Handles nested quotes properly (including HTML-encoded quotes)
 */
function splitTernary(
  expr: string
): { condition: string; trueValue: string; falseValue: string } | null {
  // First decode HTML entities to normalize the expression
  const decodedExpr = decodeHtmlEntities(expr);
  
  // Find the ? that starts the ternary
  let questionIdx = -1;
  let inQuote = false;
  let quoteChar = "";

  for (let i = 0; i < decodedExpr.length; i++) {
    const char = decodedExpr[i];
    const prevChar = i > 0 ? decodedExpr[i - 1] : "";

    if ((char === '"' || char === "'") && prevChar !== "\\") {
      if (!inQuote) {
        inQuote = true;
        quoteChar = char;
      } else if (char === quoteChar) {
        inQuote = false;
      }
    }

    if (!inQuote && char === "?") {
      questionIdx = i;
      break;
    }
  }

  if (questionIdx === -1) return null;

  const condition = decodedExpr.slice(0, questionIdx).trim();
  const rest = decodedExpr.slice(questionIdx + 1);

  // Find the : that separates true/false values
  let colonIdx = -1;
  inQuote = false;
  quoteChar = "";

  for (let i = 0; i < rest.length; i++) {
    const char = rest[i];
    const prevChar = i > 0 ? rest[i - 1] : "";

    if ((char === '"' || char === "'") && prevChar !== "\\") {
      if (!inQuote) {
        inQuote = true;
        quoteChar = char;
      } else if (char === quoteChar) {
        inQuote = false;
      }
    }

    if (!inQuote && char === ":") {
      colonIdx = i;
      break;
    }
  }

  if (colonIdx === -1) return null;

  const trueValue = rest.slice(0, colonIdx).trim();
  const falseValue = rest.slice(colonIdx + 1).trim();

  return { condition, trueValue, falseValue };
}

/**
 * Resolve device/user templates in a string
 * Supports both simple variables ${varName} and conditional ternary expressions
 * ${condition ? "trueValue" : "falseValue"}
 * 
 * Supported operators in conditions:
 * - == (equals)
 * - != (not equals)
 * - > (greater than)
 * - < (less than)
 * - >= (greater or equal)
 * - <= (less or equal)
 * - Truthy check (just variable name)
 * 
 * Values can be:
 * - Quoted strings: "hello" or 'hello'
 * - Variable references: username
 */
function resolveContextTemplates(
  text: string,
  context: RampKitContext
): string {
  if (!text || !text.includes("${")) return text;

  // Build variable map
  const vars: Record<string, any> = {};

  // Device vars
  if (context.device) {
    Object.entries(context.device).forEach(([key, value]) => {
      vars[`device.${key}`] = value;
    });
  }

  // User vars
  if (context.user) {
    Object.entries(context.user).forEach(([key, value]) => {
      vars[`user.${key}`] = value;
    });
  }

  console.log("[RampKit] Resolving templates with vars:", JSON.stringify(vars));

  // Match ${...} expressions - use a more permissive regex to capture full expressions
  // including ternary operators with quotes
  return text.replace(/\$\{([^}]+)\}/g, (match, innerExpr) => {
    const expr = innerExpr.trim();

    // Check if this is a ternary expression
    const ternary = splitTernary(expr);
    if (ternary) {
      const { condition, trueValue, falseValue } = ternary;
      const result = evaluateCondition(condition, vars);
      const value = result
        ? parseTernaryValue(trueValue, vars)
        : parseTernaryValue(falseValue, vars);
      console.log(
        `[RampKit] Ternary: ${condition} ? ${trueValue} : ${falseValue} => ${result} => "${value}"`
      );
      return value;
    }

    // Simple variable substitution
    const varName = expr;
    if (vars.hasOwnProperty(varName)) {
      const value = vars[varName];
      console.log(`[RampKit] Replacing ${match} with:`, value);
      if (value === undefined || value === null) return "";
      if (typeof value === "boolean") return value ? "true" : "false";
      if (typeof value === "object") return JSON.stringify(value);
      return String(value);
    }

    // Not a device/user var - leave for state variable handling
    return match;
  });
}

function buildHtmlDocument(
  screen: ScreenPayload,
  variables?: Record<string, any>,
  requiredScripts?: string[],
  rampkitContext?: RampKitContext
) {
  console.log("[RampKit] buildHtmlDocument called");
  console.log("[RampKit] rampkitContext received:", rampkitContext ? JSON.stringify(rampkitContext).slice(0, 200) : "undefined");
  
  const css = screen.css || "";
  let html = screen.html || "";
  const js = screen.js || "";
  
  // Log if HTML contains device/user templates
  if (html.includes("${device.") || html.includes("${user.")) {
    console.log("[RampKit] HTML contains device/user templates");
  }
  const scripts = (requiredScripts || [])
    .map((src) => `<script src="${src}"></script>`)
    .join("\n");
  const preconnectTags = (() => {
    try {
      const origins = Array.from(
        new Set(
          (requiredScripts || [])
            .map((s) => {
              try {
                const u = new URL(s);
                return {
                  origin: `${u.protocol}//${u.hostname}`,
                  host: u.hostname,
                };
              } catch {
                return null;
              }
            })
            .filter(Boolean) as { origin: string; host: string }[]
        )
      );
      const preconnect = origins
        .map((o) => `<link rel="preconnect" href="${o.origin}" crossorigin>`)
        .join("\n");
      const dnsPrefetch = origins
        .map((o) => `<link rel="dns-prefetch" href="//${o.host}">`)
        .join("\n");
      return `${preconnect}\n${dnsPrefetch}`;
    } catch {
      return "";
    }
  })();
  
  // Default context if not provided
  const context: RampKitContext = rampkitContext || {
    device: {
      platform: "unknown",
      model: "unknown",
      locale: "en_US",
      language: "en",
      country: "US",
      currencyCode: "USD",
      currencySymbol: "$",
      appVersion: "1.0.0",
      buildNumber: "1",
      bundleId: "",
      interfaceStyle: "light",
      timezone: 0,
      daysSinceInstall: 0,
    },
    user: {
      id: "",
      isNewUser: true,
      hasAppleSearchAdsAttribution: false,
      sessionId: "",
      installedAt: new Date().toISOString(),
    },
  };

  // Resolve device/user templates in HTML BEFORE sending to WebView
  const originalHtml = html;
  html = resolveContextTemplates(html, context);
  
  // Convert literal \n escape sequences to actual newlines
  // CSS white-space: pre-line will render them as line breaks
  html = html.replace(/\\n/g, '\n');
  
  if (originalHtml !== html) {
    console.log("[RampKit] Templates were resolved in HTML");
  } else if (originalHtml.includes("${device.") || originalHtml.includes("${user.")) {
    console.log("[RampKit] WARNING: HTML still contains unresolved device/user templates!");
  }
  
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"/>
${preconnectTags}
${scripts}
<style>${css}</style>
<style>html,body{margin:0;padding:0;overflow-x:hidden;white-space:pre-line} *{-webkit-tap-highlight-color: rgba(0,0,0,0);} ::selection{background:transparent}::-moz-selection{background:transparent}</style>
</head>
<body>
${html}
<script>
// Device and user context for template resolution
window.rampkitContext = ${JSON.stringify(context)};
// State variables from onboarding
window.__rampkitVariables = ${JSON.stringify(variables || {})};
${js}
</script>
</body>
</html>`;
}

// slideFade animation constants
const SLIDE_FADE_OFFSET = 200;
const SLIDE_FADE_DURATION = 320;

function Overlay(props: {
  onboardingId: string;
  screens: ScreenPayload[];
  variables?: Record<string, any>;
  requiredScripts?: string[];
  rampkitContext?: RampKitContext;
  navigation?: NavigationData;
  prebuiltDocs?: string[];
  onRequestClose: () => void;
  onOnboardingFinished?: (payload?: any) => void;
  onShowPaywall?: (payload?: any) => void;
  onRegisterClose?: (handler: (() => void) | null) => void;
  // Event tracking callbacks
  onScreenChange?: (screenIndex: number, screenId: string) => void;
  onOnboardingAbandoned?: (reason: string, lastScreenIndex: number, lastScreenId: string) => void;
  onNotificationPermissionRequested?: () => void;
  onNotificationPermissionResult?: (granted: boolean) => void;
  // Called when close action is explicitly triggered (rampkit:close)
  onCloseAction?: (screenIndex: number, screenId: string) => void;
}) {
  // Get explicit window dimensions to prevent flex-based layout recalculations during transitions
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const [index, setIndex] = useState(0);
  const [loadedCount, setLoadedCount] = useState(0);
  const [firstPageLoaded, setFirstPageLoaded] = useState(false);
  const [visible, setVisible] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const fadeOpacity = useRef(new Animated.Value(0)).current;

  // Per-screen animation values - each screen has its own opacity and translateX
  // This replaces PagerView and ensures ALL screens are rendered (forcing first paint)
  // First screen starts visible (opacity: 1), others start hidden (opacity: 0)
  const screenAnimsRef = useRef(
    props.screens.map((_, i) => ({
      opacity: new Animated.Value(i === 0 ? 1 : 0),
      translateX: new Animated.Value(0),
    }))
  );
  const screenAnims = screenAnimsRef.current;
  
  const allLoaded = loadedCount >= props.screens.length;
  const hasTrackedInitialScreen = useRef(false);
  // shared vars across all webviews - INITIALIZE from props.variables!
  const varsRef = useRef(props.variables || {} as Record<string, any>);
  // hold refs for injection
  const webviewsRef = useRef([] as any[]);
  // Track when we last SENT vars to each page (for stale value filtering)
  // This helps filter out default/cached values that pages send back after receiving updates
  const lastVarsSendTimeRef = useRef([] as number[]);
  // Stale value window in milliseconds - matches iOS SDK (600ms)
  const STALE_VALUE_WINDOW_MS = 600;
  // Track which screens have completed initial setup (to avoid repeated onLoadEnd processing)
  const initializedScreensRef = useRef(new Set<number>());
  // Track the currently active screen index (matches iOS SDK's activeScreenIndex)
  const activeScreenIndexRef = useRef(0);
  // Track when a screen was activated (to filter out stale echoes during settling period)
  const screenActivationTimeRef = useRef({ 0: Date.now() } as Record<number, number>);
  // Settling period - ignore variable updates from a screen for this long after activation
  const SCREEN_SETTLING_MS = 300;

  // Queue of pending actions per screen - actions are queued when screen is inactive
  // and executed when the screen becomes active (matches iOS SDK behavior)
  const pendingActionsRef = useRef({} as Record<number, (() => void)[]>);

  // Check if a screen is currently active
  const isScreenActive = (screenIndex: number): boolean => {
    return screenIndex === activeScreenIndexRef.current;
  };

  // Queue an action to be executed when screen becomes active
  const queueAction = (screenIndex: number, action: () => void) => {
    if (__DEV__) {
      console.log(`[Rampkit] 📥 Queuing action for screen ${screenIndex}`);
    }
    if (!pendingActionsRef.current[screenIndex]) {
      pendingActionsRef.current[screenIndex] = [];
    }
    pendingActionsRef.current[screenIndex].push(action);
  };

  // Process any pending actions for a screen
  const processPendingActions = (screenIndex: number) => {
    const actions = pendingActionsRef.current[screenIndex];
    if (!actions || actions.length === 0) return;

    if (__DEV__) {
      console.log(`[Rampkit] ⚡ Processing ${actions.length} pending action(s) for screen ${screenIndex}`);
    }

    for (const action of actions) {
      try {
        action();
      } catch (e) {
        console.warn('[Rampkit] Error executing pending action:', e);
      }
    }

    // Clear the queue
    pendingActionsRef.current[screenIndex] = [];
  };

  // Activate a screen (set visibility flag and dispatch event)
  const activateScreen = (screenIndex: number) => {
    const wv = webviewsRef.current[screenIndex];
    if (!wv) return;

    if (__DEV__) {
      console.log(`[Rampkit] 🔓 Activating screen ${screenIndex}`);
    }

    const screenId = props.screens[screenIndex]?.id || '';
    const activateScript = `(function() {
      window.__rampkitScreenVisible = true;
      window.__rampkitScreenIndex = ${screenIndex};
      console.log('🔓 Screen ${screenIndex} ACTIVATED');

      // Dispatch custom event that HTML can listen to
      try {
        document.dispatchEvent(new CustomEvent('rampkit:screen-visible', {
          detail: { screenIndex: ${screenIndex}, screenId: '${screenId}' }
        }));
      } catch(e) {}
    })();`;

    // @ts-ignore: injectJavaScript exists on WebView instance
    wv.injectJavaScript(activateScript);

    // Process any pending actions for this screen
    processPendingActions(screenIndex);
  };

  // Deactivate a screen (clear visibility flag)
  const deactivateScreen = (screenIndex: number) => {
    const wv = webviewsRef.current[screenIndex];
    if (!wv) return;

    if (__DEV__) {
      console.log(`[Rampkit] 🔒 Deactivating screen ${screenIndex}`);
    }

    const deactivateScript = `(function() {
      window.__rampkitScreenVisible = false;
      console.log('🔒 Screen ${screenIndex} DEACTIVATED');
    })();`;

    // @ts-ignore: injectJavaScript exists on WebView instance
    wv.injectJavaScript(deactivateScript);
  };

  // ============================================================================
  // Navigation Resolution Helpers (matches iOS SDK behavior)
  // ============================================================================

  /**
   * Resolve `__continue__` to the actual target screen ID using navigation data
   * @param fromScreenId - The current screen ID
   * @returns The target screen ID, or null if at the end of the flow or should use fallback
   */
  const resolveContinue = (fromScreenId: string): string | null => {
    const navigation = props.navigation;
    
    // If no navigation data, fall back to array order
    if (!navigation?.mainFlow || navigation.mainFlow.length === 0) {
      console.log("[RampKit] 🧭 No navigation.mainFlow, using array order for __continue__");
      return null; // Will use fallback
    }

    const { mainFlow, screenPositions } = navigation;

    // Check if current screen is in the main flow
    const currentFlowIndex = mainFlow.indexOf(fromScreenId);
    if (currentFlowIndex !== -1) {
      // Navigate to next screen in main flow
      const nextFlowIndex = currentFlowIndex + 1;
      if (nextFlowIndex < mainFlow.length) {
        const nextScreenId = mainFlow[nextFlowIndex];
        console.log(`[RampKit] 🧭 __continue__ resolved via mainFlow: ${fromScreenId} → ${nextScreenId} (flow index ${currentFlowIndex} → ${nextFlowIndex})`);
        return nextScreenId;
      } else {
        console.log(`[RampKit] 🧭 __continue__: at end of mainFlow (index ${currentFlowIndex})`);
        return null;
      }
    }

    // Current screen is NOT in mainFlow (it's a variant screen)
    // Find the appropriate next main screen based on X position
    if (screenPositions) {
      const currentPosition = screenPositions[fromScreenId];
      if (currentPosition) {
        console.log(`[RampKit] 🧭 Current screen '${fromScreenId}' is a variant (row: ${currentPosition.row}, x: ${currentPosition.x})`);

        // Find the main flow screen that comes AFTER this X position
        // (the screen with the smallest X that is > currentPosition.x)
        let bestCandidate: { screenId: string; x: number } | null = null;

        for (const mainScreenId of mainFlow) {
          const mainPos = screenPositions[mainScreenId];
          if (mainPos && mainPos.x > currentPosition.x) {
            if (!bestCandidate || mainPos.x < bestCandidate.x) {
              bestCandidate = { screenId: mainScreenId, x: mainPos.x };
            }
          }
        }

        if (bestCandidate) {
          console.log(`[RampKit] 🧭 __continue__ from variant: ${fromScreenId} → ${bestCandidate.screenId} (next main screen at x:${bestCandidate.x})`);
          return bestCandidate.screenId;
        } else {
          console.log("[RampKit] 🧭 __continue__ from variant: no main screen to the right, end of flow");
          return null;
        }
      }
    }

    // Position data not available for current screen, fall back to array
    console.log(`[RampKit] 🧭 Screen '${fromScreenId}' not found in positions, using array fallback`);
    return null;
  };

  /**
   * Resolve `__goBack__` to the actual target screen ID using navigation data
   * @param fromScreenId - The current screen ID
   * @returns The target screen ID, or null if at the start of the flow or should use fallback
   */
  const resolveGoBack = (fromScreenId: string): string | null => {
    const navigation = props.navigation;
    
    // If no navigation data, fall back to array order
    if (!navigation?.mainFlow || navigation.mainFlow.length === 0) {
      console.log("[RampKit] 🧭 No navigation.mainFlow, using array order for __goBack__");
      return null; // Will use fallback
    }

    const { mainFlow, screenPositions } = navigation;

    // Check if current screen is in the main flow
    const currentFlowIndex = mainFlow.indexOf(fromScreenId);
    if (currentFlowIndex !== -1) {
      // Navigate to previous screen in main flow
      const prevFlowIndex = currentFlowIndex - 1;
      if (prevFlowIndex >= 0) {
        const prevScreenId = mainFlow[prevFlowIndex];
        console.log(`[RampKit] 🧭 __goBack__ resolved via mainFlow: ${fromScreenId} → ${prevScreenId} (flow index ${currentFlowIndex} → ${prevFlowIndex})`);
        return prevScreenId;
      } else {
        console.log(`[RampKit] 🧭 __goBack__: at start of mainFlow (index ${currentFlowIndex})`);
        return null;
      }
    }

    // Current screen is NOT in mainFlow (it's a variant screen)
    // Go back to the main flow screen at or before this X position
    if (screenPositions) {
      const currentPosition = screenPositions[fromScreenId];
      if (currentPosition) {
        console.log(`[RampKit] 🧭 Current screen '${fromScreenId}' is a variant (row: ${currentPosition.row}, x: ${currentPosition.x})`);

        // Find the main flow screen that is at or before this X position
        // (the screen with the largest X that is <= currentPosition.x)
        let bestCandidate: { screenId: string; x: number } | null = null;

        for (const mainScreenId of mainFlow) {
          const mainPos = screenPositions[mainScreenId];
          if (mainPos && mainPos.x <= currentPosition.x) {
            if (!bestCandidate || mainPos.x > bestCandidate.x) {
              bestCandidate = { screenId: mainScreenId, x: mainPos.x };
            }
          }
        }

        if (bestCandidate) {
          console.log(`[RampKit] 🧭 __goBack__ from variant: ${fromScreenId} → ${bestCandidate.screenId} (main screen at x:${bestCandidate.x})`);
          return bestCandidate.screenId;
        } else {
          console.log("[RampKit] 🧭 __goBack__ from variant: no main screen to the left, start of flow");
          return null;
        }
      }
    }

    // Position data not available for current screen, fall back to array
    console.log(`[RampKit] 🧭 Screen '${fromScreenId}' not found in positions, using array fallback`);
    return null;
  };

  /**
   * Get the screen index for a given screen ID
   */
  const getScreenIndex = (screenId: string): number => {
    return props.screens.findIndex((s) => s.id === screenId);
  };

  // Fade-in when overlay becomes visible
  React.useEffect(() => {
    if (visible && !isClosing) {
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [visible, isClosing, overlayOpacity]);

  const handleRequestClose = React.useCallback((options?: { completed?: boolean }) => {
    if (isClosing) return;
    setIsClosing(true);
    
    // Track abandonment if not completed
    const isCompleted = options?.completed || onboardingCompleted;
    if (!isCompleted && props.onOnboardingAbandoned && props.screens[index]) {
      props.onOnboardingAbandoned("dismissed", index, props.screens[index].id);
    }
    
    Animated.sequence([
      Animated.delay(150),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      props.onRequestClose();
    });
  }, [isClosing, overlayOpacity, props.onRequestClose, onboardingCompleted, index, props.screens, props.onOnboardingAbandoned]);

  React.useEffect(() => {
    props.onRegisterClose?.(handleRequestClose);
    return () => {
      props.onRegisterClose?.(null);
    };
  }, [handleRequestClose, props.onRegisterClose]);

  // Helper to complete a screen transition - updates state, activates/deactivates screens, and sends data
  const completeTransition = (nextIndex: number, prevIndex: number) => {
    // Deactivate previous screen and activate new screen (matches iOS SDK behavior)
    // This ensures actions like review/notification requests only fire on the active screen
    if (prevIndex !== nextIndex) {
      deactivateScreen(prevIndex);
      activateScreen(nextIndex);
    }

    setIndex(nextIndex);
    sendVarsToWebView(nextIndex);
    sendOnboardingStateToWebView(nextIndex);

    // Track screen change event
    if (props.onScreenChange && props.screens[nextIndex]) {
      props.onScreenChange(nextIndex, props.screens[nextIndex].id);
    }
  };

  // Android hardware back goes to previous page, then closes
  // NOTE: This function no longer uses PagerView. Instead, all screens are rendered
  // in a stack and we animate individual screen opacity/transform values.
  // This ensures all WebViews complete their first paint before any navigation.
  const navigateToIndex = (nextIndex: number, animation: string = "fade") => {
    if (
      nextIndex === index ||
      nextIndex < 0 ||
      nextIndex >= props.screens.length
    )
      return;
    if (isTransitioning) return;

    // Update active screen index and activation time FIRST
    activeScreenIndexRef.current = nextIndex;
    screenActivationTimeRef.current[nextIndex] = Date.now();

    // Parse animation type case-insensitively
    const animationType = animation?.toLowerCase() || "fade";
    const currentScreenAnim = screenAnims[index];
    const nextScreenAnim = screenAnims[nextIndex];
    const isForward = nextIndex > index;
    const direction = isForward ? 1 : -1;

    // Slide animation: animate both screens simultaneously
    if (animationType === "slide") {
      setIsTransitioning(true);

      // Set up next screen starting position (offscreen in direction of navigation)
      nextScreenAnim.translateX.setValue(SLIDE_FADE_OFFSET * direction);
      nextScreenAnim.opacity.setValue(1);

      // Animate both screens
      Animated.parallel([
        // Current screen slides out
        Animated.timing(currentScreenAnim.translateX, {
          toValue: -SLIDE_FADE_OFFSET * direction,
          duration: SLIDE_FADE_DURATION,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        // Next screen slides in
        Animated.timing(nextScreenAnim.translateX, {
          toValue: 0,
          duration: SLIDE_FADE_DURATION,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Hide old screen and reset its position
        currentScreenAnim.opacity.setValue(0);
        currentScreenAnim.translateX.setValue(0);

        completeTransition(nextIndex, index);
        setIsTransitioning(false);
      });

      return;
    }

    // slideFade animation: smooth slide + fade transition on both screens
    if (animationType === "slidefade") {
      setIsTransitioning(true);

      const halfDuration = SLIDE_FADE_DURATION / 2;

      // Set up next screen starting position
      nextScreenAnim.translateX.setValue(SLIDE_FADE_OFFSET * direction * 0.5);
      nextScreenAnim.opacity.setValue(0);

      // Animate both screens simultaneously with crossfade
      Animated.parallel([
        // Current screen fades out and slides away
        Animated.timing(currentScreenAnim.opacity, {
          toValue: 0,
          duration: halfDuration,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(currentScreenAnim.translateX, {
          toValue: -SLIDE_FADE_OFFSET * direction * 0.5,
          duration: halfDuration,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        // Next screen fades in and slides to center
        Animated.timing(nextScreenAnim.opacity, {
          toValue: 1,
          duration: halfDuration,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(nextScreenAnim.translateX, {
          toValue: 0,
          duration: halfDuration,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Reset old screen position
        currentScreenAnim.translateX.setValue(0);

        completeTransition(nextIndex, index);
        setIsTransitioning(false);
      });

      return;
    }

    // Default fade animation: uses a white curtain overlay
    setIsTransitioning(true);

    Animated.timing(fadeOpacity, {
      toValue: 1,
      duration: 160,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      // Swap screens instantly while curtain is opaque
      currentScreenAnim.opacity.setValue(0);
      nextScreenAnim.opacity.setValue(1);

      requestAnimationFrame(() => {
        completeTransition(nextIndex, index);

        // Fade curtain out to reveal new screen
        Animated.timing(fadeOpacity, {
          toValue: 0,
          duration: 160,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }).start(() => setIsTransitioning(false));
      });
    });
  };

  function buildDispatchScript(payload: any): string {
    const json = JSON.stringify(payload)
      .replace(/\\/g, "\\\\")
      .replace(/`/g, "\\`");
    return `(function(){try{document.dispatchEvent(new MessageEvent('message',{data:${json}}));}catch(e){}})();`;
  }

  // Build a script that directly sets variables and triggers updates
  // This matches the iOS SDK's approach of dispatching a MessageEvent
  function buildDirectVarsScript(vars: Record<string, any>): string {
    const payload = { type: "rampkit:variables", vars };
    const json = JSON.stringify(payload)
      .replace(/\\/g, "\\\\")
      .replace(/`/g, "\\`");
    return `(function(){
      try {
        var payload = ${json};
        var newVars = payload.vars;
        
        // Update ALL variable storage locations for consistency
        // This ensures dynamic tap handlers can find the latest values
        window.__rampkitVariables = Object.assign({}, window.__rampkitVariables || {}, newVars);
        
        // Also update window.__rampkitVars (used by template resolver and dynamic tap)
        if (window.__rampkitVars) {
          Object.keys(newVars).forEach(function(k) {
            window.__rampkitVars[k] = newVars[k];
          });
        } else {
          window.__rampkitVars = Object.assign({}, newVars);
        }
        
        // Also update RK_VARS if it exists (fallback storage)
        if (window.RK_VARS) {
          Object.keys(newVars).forEach(function(k) {
            window.RK_VARS[k] = newVars[k];
          });
        }
        
        // Call the handler if available
        if (typeof window.__rkHandleVarsUpdate === 'function') {
          window.__rkHandleVarsUpdate(newVars);
        }
        
        // Dispatch MessageEvent to trigger template resolver
        try {
          document.dispatchEvent(new MessageEvent('message', {data: payload}));
        } catch(e) {}
        
        // Also dispatch custom event for any listeners
        try {
          document.dispatchEvent(new CustomEvent('rampkit:vars-updated', {detail: newVars}));
        } catch(e) {}
        
        console.log('[RampKit] Variables updated:', Object.keys(newVars).length, 'keys');
      } catch(e) {
        console.log('[RampKit] buildDirectVarsScript error:', e);
      }
    })();`;
  }

  // Build a script that updates the onboarding state
  // This calls window.__rampkitUpdateOnboarding(index, screenId) to update
  // onboarding.currentIndex, onboarding.progress, etc.
  function buildOnboardingStateScript(screenIndex: number, screenId: string, totalScreens: number): string {
    return `(function() {
      try {
        // Set total screens global
        window.RK_TOTAL_SCREENS = ${totalScreens};
        
        // Call the update function if it exists
        if (typeof window.__rampkitUpdateOnboarding === 'function') {
          window.__rampkitUpdateOnboarding(${screenIndex}, '${screenId}');
          console.log('[RampKit] Called __rampkitUpdateOnboarding(${screenIndex}, ${screenId})');
        }
        
        // Also dispatch a message event for any listeners
        var payload = {
          type: 'rampkit:onboarding-state',
          currentIndex: ${screenIndex},
          screenId: '${screenId}',
          totalScreens: ${totalScreens}
        };
        
        try {
          document.dispatchEvent(new MessageEvent('message', { data: payload }));
        } catch(e) {}
        
        // Also dispatch custom event
        try {
          document.dispatchEvent(new CustomEvent('rampkit:onboarding-state', { detail: payload }));
        } catch(e) {}
        
      } catch(e) {
        console.log('[RampKit] sendOnboardingState error:', e);
      }
    })();`;
  }

  // Send onboarding state to a WebView
  function sendOnboardingStateToWebView(i: number) {
    const wv = webviewsRef.current[i];
    if (!wv) return;
    
    const screenId = props.screens[i]?.id || '';
    const totalScreens = props.screens.length;
    
    if (__DEV__) {
      console.log("[Rampkit] sendOnboardingStateToWebView", i, { screenId, totalScreens });
    }
    
    // @ts-ignore: injectJavaScript exists on WebView instance
    wv.injectJavaScript(buildOnboardingStateScript(i, screenId, totalScreens));
  }

  function sendVarsToWebView(i: number, isInitialLoad: boolean = false) {
    const wv = webviewsRef.current[i];
    if (!wv) return;
    if (__DEV__) console.log("[Rampkit] sendVarsToWebView", i, varsRef.current, { isInitialLoad });
    // Track when we send vars to this page for stale value filtering
    // This helps us ignore default/cached values that pages echo back
    lastVarsSendTimeRef.current[i] = Date.now();
    // Use direct variable setting instead of MessageEvent dispatch
    // This is more reliable as it doesn't depend on event listeners being set up
    // @ts-ignore: injectJavaScript exists on WebView instance
    wv.injectJavaScript(buildDirectVarsScript(varsRef.current));
    
    // NOTE: Do NOT call sendOnboardingStateToWebView here - it would cause infinite loops
    // because the WebView echoes back variables which triggers another sendVarsToWebView.
    // Onboarding state is sent separately in onLoadEnd and navigateToIndex.
  }

  React.useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (index > 0) {
        navigateToIndex(index - 1);
        return true;
      }
      handleRequestClose();
      return true;
    });
    return () => sub.remove();
  }, [index, handleRequestClose]);

  const docs = useMemo(
    () =>
      props.prebuiltDocs ||
      props.screens.map((s) =>
        buildHtmlDocument(s, props.variables, props.requiredScripts, props.rampkitContext)
      ),
    [props.prebuiltDocs, props.screens, props.variables, props.requiredScripts, props.rampkitContext]
  );

  React.useEffect(() => {
    try {
      console.log("[Rampkit] Overlay mounted: docs=", docs.length);
    } catch (_) {}
    if (docs.length === 0) {
      setVisible(true);
      return;
    }
    if (firstPageLoaded) {
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }
    // Fallback: force visible after a short delay in case onLoadEnd is delayed
    const tid = setTimeout(() => {
      setVisible((v: boolean) => {
        if (!v) {
          try {
            console.log("[Rampkit] Overlay fallback visible after timeout");
          } catch (_) {}
          return true;
        }
        return v;
      });
    }, 600);
    return () => clearTimeout(tid);
  }, [docs.length, firstPageLoaded]);

  // NOTE: onPageSelected callback removed - we no longer use PagerView.
  // Screen transitions are now handled directly in navigateToIndex via completeTransition().

  const handleAdvance = (i: number, animation: string = "fade") => {
    const currentScreenId = props.screens[i]?.id;
    
    // Try to resolve using navigation data
    if (currentScreenId) {
      const resolvedId = resolveContinue(currentScreenId);
      if (resolvedId) {
        const targetIndex = getScreenIndex(resolvedId);
        if (targetIndex >= 0 && targetIndex < props.screens.length) {
          navigateToIndex(targetIndex, animation);
          Haptics.impactAsync("light").catch(() => {});
          return;
        }
      }
    }
    
    // Fallback to array order
    const last = props.screens.length - 1;
    if (i < last) {
      console.log(`[RampKit] 🧭 __continue__ fallback to array index ${i + 1}`);
      navigateToIndex(i + 1, animation);
      Haptics.impactAsync("light").catch(() => {});
    } else {
      // finish - mark as completed before closing
      setOnboardingCompleted(true);
      Haptics.notificationAsync("success").catch(() => {});
      handleRequestClose({ completed: true });
    }
  };

  const handleGoBack = (i: number, animation: string = "fade") => {
    const currentScreenId = props.screens[i]?.id;
    
    // Try to resolve using navigation data
    if (currentScreenId) {
      const resolvedId = resolveGoBack(currentScreenId);
      if (resolvedId) {
        const targetIndex = getScreenIndex(resolvedId);
        if (targetIndex >= 0 && targetIndex < props.screens.length) {
          navigateToIndex(targetIndex, animation);
          return;
        }
      }
    }
    
    // Fallback to array order
    if (i > 0) {
      console.log(`[RampKit] 🧭 __goBack__ fallback to array index ${i - 1}`);
      navigateToIndex(i - 1, animation);
    } else {
      handleRequestClose();
    }
  };

  async function handleNotificationPermissionRequest(payload?: {
    ios?: {
      allowAlert?: boolean;
      allowBadge?: boolean;
      allowSound?: boolean;
    };
    android?: {
      channelId?: string;
      name?: string;
      importance?: string; // "MAX" | "HIGH" | ...
    };
    behavior?: {
      shouldShowBanner?: boolean;
      shouldPlaySound?: boolean;
    };
  }) {
    // Track that notification permission was requested
    try {
      props.onNotificationPermissionRequested?.();
    } catch (_) {}
    
    const iosDefaults = { allowAlert: true, allowBadge: true, allowSound: true };
    const androidDefaults = {
      channelId: "default",
      name: "Default Channel",
      importance: "MAX" as const,
    };

    const iosReq = { ...(payload?.ios || iosDefaults) };
    const androidCfg = { ...(payload?.android || androidDefaults) };

    let result: any = null;
    try {
      result = await Notifications.requestPermissionsAsync({
        ios: iosReq,
        android: {
          channelId: androidCfg.channelId,
          name: androidCfg.name,
          importance: (androidCfg.importance || "MAX") as any,
        },
      });
    } catch (e) {
      result = {
        granted: false,
        status: "denied",
        canAskAgain: false,
        error: true,
      };
    }

    try {
      console.log("[Rampkit] Notification permission status:", result);
    } catch (_) {}
    
    // Track notification permission result
    try {
      props.onNotificationPermissionResult?.(!!result?.granted);
    } catch (_) {}

    // Save to shared vars and send to active screen only
    try {
      varsRef.current = {
        ...varsRef.current,
        notificationsPermission: {
          granted: !!result?.granted,
          status: result?.status || "undetermined",
          canAskAgain: !!result?.canAskAgain,
          ios: result?.ios,
        },
      };
      // Only send to active screen to avoid broadcast loops
      sendVarsToWebView(activeScreenIndexRef.current);
    } catch (_) {}
  }

  return (
    <Animated.View
      style={[
        styles.root,
        !visible && styles.invisible,
        visible && { opacity: overlayOpacity },
      ]}
      pointerEvents={visible && !isClosing ? "auto" : "none"}
    >
      {/* Screen stack - ALL screens are always rendered to force first paint.
          This matches iOS SDK architecture where all WKWebViews are created and loaded upfront.
          Each screen is wrapped in an Animated.View with its own opacity/transform for transitions.
          This fixes the "glitch on first open" bug caused by PagerView deferring paint for offscreen pages. */}
      <View style={StyleSheet.absoluteFill}>
        {docs.map((doc: any, i: number) => (
          <Animated.View
            key={props.screens[i].id}
            style={[
              StyleSheet.absoluteFill,
              {
                opacity: screenAnims[i]?.opacity,
                transform: [{ translateX: screenAnims[i]?.translateX || 0 }],
                // Active screen renders on top
                zIndex: i === index ? 1 : 0,
              },
            ]}
            // Only the active screen receives touch events
            pointerEvents={i === index ? 'auto' : 'none'}
          >
            <WebView
              ref={(r: any) => (webviewsRef.current[i] = r)}
              style={{ width: windowWidth, height: windowHeight }}
              originWhitelist={["*"]}
              source={{ html: doc }}
              injectedJavaScriptBeforeContentLoaded={
                // CRITICAL: Set visibility flag BEFORE content loads (matches iOS SDK behavior)
                // Only screen 0 starts as visible, others start hidden.
                // This prevents review/notification requests from firing on inactive screens at startup.
                `window.__rampkitScreenVisible = ${i === 0};
                 window.__rampkitScreenIndex = ${i};
                 console.log('[RampKit] Screen ${i} visibility initialized: ' + (${i === 0} ? 'ACTIVE' : 'INACTIVE'));
                ` + injectedHardening + injectedDynamicTapHandler + injectedButtonAnimations
              }
              injectedJavaScript={injectedNoSelect + injectedVarsHandler + injectedButtonAnimations}
              automaticallyAdjustContentInsets={false}
              contentInsetAdjustmentBehavior="never"
              bounces={false}
              scrollEnabled={false}
              overScrollMode="never"
              scalesPageToFit={false}
              showsHorizontalScrollIndicator={false}
              dataDetectorTypes="none"
              allowsLinkPreview={false}
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              cacheEnabled
              javaScriptEnabled
              domStorageEnabled
              hideKeyboardAccessoryView={true}
              onLoadEnd={() => {
                // Only initialize each screen ONCE to avoid repeated processing
                if (initializedScreensRef.current.has(i)) {
                  if (__DEV__) console.log(`[Rampkit] onLoadEnd skipped (already initialized): ${i}`);
                  return;
                }
                initializedScreensRef.current.add(i);
                
                setLoadedCount((c: number) => c + 1);
                if (i === 0) {
                  setFirstPageLoaded(true);
                  // Track initial screen view
                  if (!hasTrackedInitialScreen.current && props.onScreenChange && props.screens[0]) {
                    hasTrackedInitialScreen.current = true;
                    props.onScreenChange(0, props.screens[0].id);
                  }
                }
                // Initialize this page with current vars
                if (__DEV__)
                  console.log("[Rampkit] onLoadEnd initializing screen", i);
                sendVarsToWebView(i, true);
                // Send onboarding state to ALL screens during initial load (matching iOS SDK behavior).
                // This prevents a visual glitch where content shifts on first navigation to each screen.
                // Previously, we only sent state to the active screen (screen 0), which meant screens 1, 2, etc.
                // received their onboarding state for the first time during navigation - causing DOM updates
                // and layout shifts visible during the transition animation.
                // By sending state to all screens upfront, the DOM is already in its final state
                // before any navigation occurs.
                sendOnboardingStateToWebView(i);

                // Visibility flag is already set in injectedJavaScriptBeforeContentLoaded.
                // For screen 0, dispatch the activation event and process any pending actions.
                // Other screens will be activated when navigated to.
                if (i === 0) {
                  activateScreen(i);
                }
              }}
              onMessage={(ev: any) => {
                const raw = ev.nativeEvent.data;
                console.log("raw", raw);
                // Accept either raw strings or JSON payloads from your editor
                try {
                  // JSON path
                  const data = JSON.parse(raw);
                  // 1) Variables from a page → update shared state
                  // CRITICAL: Only accept variable updates from the ACTIVE screen
                  // This prevents inactive screens from causing infinite broadcast loops
                  if (
                    data?.type === "rampkit:variables" &&
                    data?.vars &&
                    typeof data.vars === "object"
                  ) {
                    // CRITICAL: Ignore variable updates from non-active screens
                    // Only the currently visible screen should be able to update variables
                    if (i !== activeScreenIndexRef.current) {
                      if (__DEV__) {
                        console.log(`[Rampkit] ignoring variables from inactive screen ${i} (active: ${activeScreenIndexRef.current})`);
                      }
                      return;
                    }
                    
                    const now = Date.now();
                    
                    // Check if this screen is still in the settling period after activation
                    // During settling, we filter more aggressively to prevent stale echoes
                    const activationTime = screenActivationTimeRef.current[i] || 0;
                    const timeSinceActivation = now - activationTime;
                    const isSettling = timeSinceActivation < SCREEN_SETTLING_MS;
                    
                    // Check if we recently sent vars to this page
                    const lastSendTime = lastVarsSendTimeRef.current[i] || 0;
                    const timeSinceSend = now - lastSendTime;
                    const isWithinStaleWindow = timeSinceSend < STALE_VALUE_WINDOW_MS;
                    
                    if (__DEV__)
                      console.log(
                        "[Rampkit] received variables from ACTIVE page",
                        i,
                        { isSettling, timeSinceActivation, isWithinStaleWindow, timeSinceSend }
                      );
                    
                    let changed = false;
                    const newVars: Record<string, any> = {};
                    
                    for (const [key, value] of Object.entries<any>(data.vars)) {
                      // CRITICAL: Filter out onboarding.* variables
                      // These are read-only from the WebView's perspective
                      if (key.startsWith('onboarding.')) {
                        continue;
                      }
                      
                      const hasHostVal = Object.prototype.hasOwnProperty.call(
                        varsRef.current,
                        key
                      );
                      const hostVal = (varsRef.current as any)[key];
                      
                      // During settling period OR stale window: protect non-empty values
                      // This prevents the screen from clobbering user input with defaults
                      if ((isSettling || isWithinStaleWindow) && hasHostVal) {
                        const hostIsNonEmpty = hostVal !== "" && hostVal !== null && hostVal !== undefined;
                        const incomingIsEmpty = value === "" || value === null || value === undefined;
                        if (hostIsNonEmpty && incomingIsEmpty) {
                          if (__DEV__) {
                            console.log(`[Rampkit] protecting value for "${key}": "${hostVal}" (settling: ${isSettling})`);
                          }
                          continue; // Skip - keep existing non-empty value
                        }
                      }
                      
                      // Accept the update if value is different
                      if (!hasHostVal || hostVal !== value) {
                        newVars[key] = value;
                        changed = true;
                      }
                    }
                    
                    if (changed) {
                      varsRef.current = { ...varsRef.current, ...newVars };
                      if (__DEV__) {
                        console.log("[Rampkit] variables updated:", newVars);
                      }
                      
                      // CRITICAL: Send merged vars back to the active screen
                      // This ensures window.__rampkitVariables has the complete state
                      // which is needed for dynamic tap conditions to evaluate correctly
                      // Only send if there were actual changes to prevent echo loops
                      sendVarsToWebView(i);
                    }
                    return;
                  }
                  // 2) A page asked for current vars → send only to that page
                  if (data?.type === "rampkit:request-vars") {
                    if (__DEV__)
                      console.log("[Rampkit] request-vars from page", i);
                    sendVarsToWebView(i);
                    return;
                  }
                  // 3) A page requested an in-app review prompt
                  if (
                    data?.type === "rampkit:request-review" ||
                    data?.type === "rampkit:review"
                  ) {
                    const executeReview = async () => {
                      try {
                        const available = await StoreReview.isAvailableAsync();
                        if (available) {
                          await StoreReview.requestReview();
                        }
                      } catch (_) {}
                    };

                    // Only execute if screen is active, otherwise queue for later
                    if (isScreenActive(i)) {
                      executeReview();
                    } else {
                      if (__DEV__) console.log(`[Rampkit] Queuing review request from inactive screen ${i}`);
                      queueAction(i, executeReview);
                    }
                    return;
                  }
                  // 4) A page requested notification permission
                  if (data?.type === "rampkit:request-notification-permission") {
                    const executeNotification = () => {
                      handleNotificationPermissionRequest({
                        ios: data?.ios,
                        android: data?.android,
                        behavior: data?.behavior,
                      });
                    };

                    // Only execute if screen is active, otherwise queue for later
                    if (isScreenActive(i)) {
                      executeNotification();
                    } else {
                      if (__DEV__) console.log(`[Rampkit] Queuing notification request from inactive screen ${i}`);
                      queueAction(i, executeNotification);
                    }
                    return;
                  }
                  // 5) Onboarding finished event from page
                  if (data?.type === "rampkit:onboarding-finished") {
                    setOnboardingCompleted(true);
                    try {
                      props.onOnboardingFinished?.(data?.payload);
                    } catch (_) {}
                    handleRequestClose({ completed: true });
                    return;
                  }
                  // 6) Request to show paywall
                  if (data?.type === "rampkit:show-paywall") {
                    try {
                      props.onShowPaywall?.(data?.payload);
                    } catch (_) {}
                    return;
                  }
                  // 7) Question answered - persist response locally
                  if (data?.type === "rampkit:question-answered") {
                    const questionId = data?.questionId;
                    if (questionId) {
                      const response: OnboardingResponse = {
                        questionId,
                        answer: data?.answer ?? "",
                        questionText: data?.questionText,
                        screenName: props.screens[i]?.id,
                        answeredAt: new Date().toISOString(),
                      };
                      OnboardingResponseStorage.saveResponse(response);
                    }
                    return;
                  }
                  if (
                    data?.type === "rampkit:continue" ||
                    data?.type === "continue"
                  ) {
                    handleAdvance(i, data?.animation || "fade");
                    return;
                  }
                  if (data?.type === "rampkit:navigate") {
                    const target = data?.targetScreenId;
                    if (target === "__goBack__") {
                      handleGoBack(i, data?.animation || "fade");
                      return;
                    }
                    if (!target || target === "__continue__") {
                      handleAdvance(i, data?.animation || "fade");
                      return;
                    }
                    const targetIndex = props.screens.findIndex(
                      (s) => s.id === target
                    );
                    if (targetIndex >= 0) {
                      navigateToIndex(targetIndex, data?.animation || "fade");
                    } else {
                      handleAdvance(i);
                    }
                    return;
                  }
                  if (data?.type === "rampkit:goBack") {
                    handleGoBack(i, data?.animation || "fade");
                    return;
                  }
                  if (data?.type === "rampkit:close") {
                    // Track close action for onboarding completion
                    try {
                      props.onCloseAction?.(i, props.screens[i]?.id || "");
                    } catch (_) {}
                    handleRequestClose({ completed: true }); // Mark as completed so abandonment isn't tracked
                    return;
                  }
                  if (data?.type === "rampkit:haptic") {
                    performRampkitHaptic(data as RampkitHapticEvent);
                    return;
                  }
                } catch {
                  // String path
                  if (
                    raw === "rampkit:tap" ||
                    raw === "next" ||
                    raw === "continue"
                  ) {
                    handleAdvance(i);
                    return;
                  }
                  if (raw === "rampkit:request-review" || raw === "rampkit:review") {
                    const executeReview = async () => {
                      try {
                        const available = await StoreReview.isAvailableAsync();
                        if (available) {
                          await StoreReview.requestReview();
                        }
                      } catch (_) {}
                    };

                    // Only execute if screen is active, otherwise queue for later
                    if (isScreenActive(i)) {
                      executeReview();
                    } else {
                      if (__DEV__) console.log(`[Rampkit] Queuing review request (raw) from inactive screen ${i}`);
                      queueAction(i, executeReview);
                    }
                    return;
                  }
                  if (raw === "rampkit:request-notification-permission") {
                    const executeNotification = () => handleNotificationPermissionRequest(undefined);

                    // Only execute if screen is active, otherwise queue for later
                    if (isScreenActive(i)) {
                      executeNotification();
                    } else {
                      if (__DEV__) console.log(`[Rampkit] Queuing notification request (raw) from inactive screen ${i}`);
                      queueAction(i, executeNotification);
                    }
                    return;
                  }
                  if (raw === "rampkit:onboarding-finished") {
                    setOnboardingCompleted(true);
                    try {
                      props.onOnboardingFinished?.(undefined);
                    } catch (_) {}
                    handleRequestClose({ completed: true });
                    return;
                  }
                  if (raw === "rampkit:show-paywall") {
                    try {
                      props.onShowPaywall?.();
                    } catch (_) {}
                    return;
                  }
                  if (raw === "rampkit:goBack") {
                    handleGoBack(i);
                    return;
                  }
                  if (raw.startsWith("rampkit:navigate:")) {
                    const target = raw.slice("rampkit:navigate:".length);
                    if (target === "__goBack__") {
                      handleGoBack(i);
                      return;
                    }
                    if (!target || target === "__continue__") {
                      handleAdvance(i);
                      return;
                    }
                    const targetIndex = props.screens.findIndex(
                      (s) => s.id === target
                    );
                    if (targetIndex >= 0) {
                      navigateToIndex(targetIndex);
                    } else {
                      handleAdvance(i);
                    }
                    return;
                  }
                  if (raw === "rampkit:close") {
                    // Track close action for onboarding completion
                    try {
                      props.onCloseAction?.(i, props.screens[i]?.id || "");
                    } catch (_) {}
                    handleRequestClose({ completed: true }); // Mark as completed so abandonment isn't tracked
                    return;
                  }
                  if (raw.startsWith("haptic:")) {
                    performRampkitHaptic({
                      type: "rampkit:haptic",
                      nodeId: null,
                      nodeType: null,
                      animation: "none",
                      action: "haptic",
                      hapticType: "impact",
                      impactStyle: "Medium",
                      notificationType: null,
                      timestamp: Date.now(),
                    } as RampkitHapticEvent);
                    return;
                  }
                }
                // No-op for other messages, but useful to log while testing
                // console.log("WebView message:", raw);
              }}
              onError={(e: any) => {
                // You can surface an inline error UI here if you want
                console.warn("WebView error:", e.nativeEvent);
              }}
            />
          </Animated.View>
        ))}
      </View>

      {/* Fade curtain overlays above pages to mask page switch */}
      <Animated.View
        pointerEvents={isTransitioning ? "auto" : "none"}
        style={[
          StyleSheet.absoluteFillObject,
          styles.curtain,
          { opacity: fadeOpacity },
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "white",
    zIndex: 9999,
    // @ts-ignore elevation for Android layering
    elevation: 9999,
  },
  invisible: { opacity: 0 },
  page: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  webview: { flex: 1 },
  curtain: { backgroundColor: "white" },
});

export default Overlay;
