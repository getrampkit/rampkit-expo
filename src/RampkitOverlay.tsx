import React, { useMemo, useRef, useState } from "react";
import { View, StyleSheet, BackHandler, Animated, Easing, Linking, Platform } from "react-native";
import RootSiblings from "react-native-root-siblings";
import PagerView, {
  PagerViewOnPageSelectedEvent,
} from "react-native-pager-view";
import { WebView } from "react-native-webview";
import { Haptics, StoreReview, Notifications } from "./RampKitNative";
import { RampKitContext } from "./types";

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

// Button tap animation script - handles spring animations for interactive elements
// Triggers on touchstart (not click) for immediate feedback
export const injectedButtonAnimations = `
(function(){
  try {
    if (window.__rkButtonAnimApplied) return true;
    window.__rkButtonAnimApplied = true;
    
    // Add styles for button animations
    var style = document.createElement('style');
    style.id = 'rk-button-anim-style';
    style.textContent = 
      '*.rk-pressed, .rk-pressed, [class*="rk-pressed"] {' +
      '  transform: scale(0.97) !important;' +
      '  -webkit-transform: scale(0.97) !important;' +
      '  opacity: 0.8 !important;' +
      '  transform-origin: center center !important;' +
      '  -webkit-transform-origin: center center !important;' +
      '  transition: transform 80ms cubic-bezier(0.25, 0.1, 0.25, 1), opacity 80ms cubic-bezier(0.25, 0.1, 0.25, 1), -webkit-transform 80ms cubic-bezier(0.25, 0.1, 0.25, 1) !important;' +
      '  -webkit-transition: -webkit-transform 80ms cubic-bezier(0.25, 0.1, 0.25, 1), opacity 80ms cubic-bezier(0.25, 0.1, 0.25, 1) !important;' +
      '}' +
      '*.rk-released, .rk-released, [class*="rk-released"] {' +
      '  transform: scale(1) !important;' +
      '  -webkit-transform: scale(1) !important;' +
      '  opacity: 1 !important;' +
      '  transform-origin: center center !important;' +
      '  -webkit-transform-origin: center center !important;' +
      '  transition: transform 280ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 280ms cubic-bezier(0.34, 1.56, 0.64, 1), -webkit-transform 280ms cubic-bezier(0.34, 1.56, 0.64, 1) !important;' +
      '  -webkit-transition: -webkit-transform 280ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 280ms cubic-bezier(0.34, 1.56, 0.64, 1) !important;' +
      '}';
    document.head.appendChild(style);
    
    // Find any interactive element in the parent chain
    function findInteractive(el) {
      var current = el;
      for (var i = 0; i < 15 && current; i++) {
        if (!current.tagName) { current = current.parentElement; continue; }
        var tag = current.tagName.toLowerCase();
        // Match common interactive elements
        if (tag === 'button' || tag === 'a' || tag === 'input' || tag === 'select') return current;
        // Match elements with click handlers or data attributes
        if (current.onclick || current.hasAttribute('onclick')) return current;
        if (current.hasAttribute('data-rampkit-action')) return current;
        if (current.hasAttribute('data-rampkit-navigate')) return current;
        if (current.hasAttribute('data-rampkit-tap')) return current;
        // Match elements with role="button" or tabindex
        if (current.getAttribute('role') === 'button') return current;
        if (current.hasAttribute('tabindex')) return current;
        // Match common button classes
        if (current.className && typeof current.className === 'string') {
          var cls = current.className.toLowerCase();
          if (cls.indexOf('btn') !== -1 || cls.indexOf('button') !== -1 || cls.indexOf('cta') !== -1 || cls.indexOf('interactive') !== -1) return current;
        }
        // Match elements with cursor pointer style
        try {
          var computed = window.getComputedStyle(current);
          if (computed && computed.cursor === 'pointer') return current;
        } catch(e) {}
        current = current.parentElement;
      }
      return null;
    }
    
    var pressed = null;
    var releaseTimer = null;
    
    function onStart(e) {
      try {
        var target = findInteractive(e.target);
        if (!target) return;
        if (releaseTimer) { clearTimeout(releaseTimer); releaseTimer = null; }
        target.classList.remove('rk-released');
        target.classList.add('rk-pressed');
        pressed = target;
      } catch(err) { console.log('[RK] touch error:', err); }
    }
    
    function onEnd(e) {
      try {
        if (!pressed) return;
        var t = pressed;
        t.classList.remove('rk-pressed');
        t.classList.add('rk-released');
        releaseTimer = setTimeout(function() {
          t.classList.remove('rk-released');
          releaseTimer = null;
        }, 300);
        pressed = null;
      } catch(err) {}
    }
    
    function onCancel(e) {
      try {
        if (!pressed) return;
        pressed.classList.remove('rk-pressed', 'rk-released');
        pressed = null;
        if (releaseTimer) { clearTimeout(releaseTimer); releaseTimer = null; }
      } catch(err) {}
    }
    
    // Capture phase for immediate response
    document.addEventListener('touchstart', onStart, { passive: true, capture: true });
    document.addEventListener('touchend', onEnd, { passive: true, capture: true });
    document.addEventListener('touchcancel', onCancel, { passive: true, capture: true });
    document.addEventListener('mousedown', onStart, { passive: true, capture: true });
    document.addEventListener('mouseup', onEnd, { passive: true, capture: true });
    
    console.log('[RK] Button animations initialized');
  } catch (err) { console.log('[RK] Button anim error:', err); }
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
  if (!event || event.action !== "haptic") {
    // Backwards compatible default
    try {
      Haptics.impactAsync("medium").catch(() => {});
    } catch (_) {}
    return;
  }

  const hapticType = event.hapticType;

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
  onClose?: () => void;
  onOnboardingFinished?: (payload?: any) => void;
  onShowPaywall?: (payload?: any) => void;
  // Event tracking callbacks
  onScreenChange?: (screenIndex: number, screenId: string) => void;
  onOnboardingAbandoned?: (reason: string, lastScreenIndex: number, lastScreenId: string) => void;
  onNotificationPermissionRequested?: () => void;
  onNotificationPermissionResult?: (granted: boolean) => void;
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
          injectedJavaScriptBeforeContentLoaded={injectedHardening}
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
 * Resolve device/user templates in a string
 * Replaces ${device.xxx} and ${user.xxx} with actual values from context
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

  // Replace ${varName} patterns
  return text.replace(/\$\{([A-Za-z_][A-Za-z0-9_.]*)\}/g, (match, varName) => {
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
}) {
  const pagerRef = useRef(null as any);
  const [index, setIndex] = useState(0);
  const [loadedCount, setLoadedCount] = useState(0);
  const [firstPageLoaded, setFirstPageLoaded] = useState(false);
  const [visible, setVisible] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const fadeOpacity = useRef(new Animated.Value(0)).current;
  
  // slideFade animation values - animates the PagerView container
  const pagerOpacity = useRef(new Animated.Value(1)).current;
  const pagerTranslateX = useRef(new Animated.Value(0)).current;
  
  const allLoaded = loadedCount >= props.screens.length;
  const hasTrackedInitialScreen = useRef(false);
  // shared vars across all webviews
  const varsRef = useRef({} as Record<string, any>);
  // hold refs for injection
  const webviewsRef = useRef([] as any[]);
  // Track when we last SENT vars to each page (for stale value filtering)
  // This helps filter out default/cached values that pages send back after receiving updates
  const lastVarsSendTimeRef = useRef([] as number[]);
  // Stale value window in milliseconds - matches iOS SDK (600ms)
  const STALE_VALUE_WINDOW_MS = 600;

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

  // Android hardware back goes to previous page, then closes
  const navigateToIndex = (nextIndex: number, animation: string = "fade") => {
    if (
      nextIndex === index ||
      nextIndex < 0 ||
      nextIndex >= props.screens.length
    )
      return;
    if (isTransitioning) return;

    // Parse animation type case-insensitively
    const animationType = animation?.toLowerCase() || "fade";

    // Slide animation: use PagerView's built-in animated page change
    // and skip the fade curtain overlay.
    if (animationType === "slide") {
      // @ts-ignore: methods exist on PagerView instance
      const pager = pagerRef.current as any;
      if (!pager) return;
      if (typeof pager.setPage === "function") {
        pager.setPage(nextIndex);
      } else if (typeof pager.setPageWithoutAnimation === "function") {
        pager.setPageWithoutAnimation(nextIndex);
      }
      // Explicitly send vars to the new page after setting it
      // This ensures the webview receives the latest state
      requestAnimationFrame(() => {
        sendVarsToWebView(nextIndex);
      });
      return;
    }

    // slideFade animation: smooth slide + fade transition
    // Animates the PagerView container out, switches page, then animates back in
    if (animationType === "slidefade") {
      setIsTransitioning(true);
      
      // Determine direction: forward (nextIndex > index) or backward
      const isForward = nextIndex > index;
      const direction = isForward ? 1 : -1;
      
      const halfDuration = SLIDE_FADE_DURATION / 2;
      const timingConfig = {
        duration: halfDuration,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      };
      
      // Phase 1: Fade out and slide the current page in exit direction
      Animated.parallel([
        Animated.timing(pagerOpacity, {
          toValue: 0,
          ...timingConfig,
        }),
        Animated.timing(pagerTranslateX, {
          toValue: -SLIDE_FADE_OFFSET * direction * 0.5, // Slide out in opposite direction
          ...timingConfig,
        }),
      ]).start(() => {
        // Switch page instantly while invisible
        // @ts-ignore: method exists on PagerView instance
        pagerRef.current?.setPageWithoutAnimation?.(nextIndex) ??
          pagerRef.current?.setPage(nextIndex);
        
        // Set up for incoming animation - start from the direction we're navigating from
        pagerTranslateX.setValue(SLIDE_FADE_OFFSET * direction * 0.5);
        
        // Phase 2: Fade in and slide the new page to center
        Animated.parallel([
          Animated.timing(pagerOpacity, {
            toValue: 1,
            duration: halfDuration,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pagerTranslateX, {
            toValue: 0,
            duration: halfDuration,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]).start(() => {
          // Send vars to the new page
          sendVarsToWebView(nextIndex);
          setIsTransitioning(false);
        });
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
      // switch page without built-in slide animation
      // @ts-ignore: method exists on PagerView instance
      pagerRef.current?.setPageWithoutAnimation?.(nextIndex) ??
        pagerRef.current?.setPage(nextIndex);
      requestAnimationFrame(() => {
        // Explicitly send vars to the new page after the page switch completes
        // This ensures the webview receives the latest state even if onPageSelected
        // timing was off during the transition
        sendVarsToWebView(nextIndex);
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
        // Directly update the global variables object
        window.__rampkitVariables = newVars;
        // Call the handler if available
        if (typeof window.__rkHandleVarsUpdate === 'function') {
          window.__rkHandleVarsUpdate(newVars);
        }
        // Dispatch MessageEvent (matches iOS SDK format) - this is what the page's JS listens for
        try {
          document.dispatchEvent(new MessageEvent('message', {data: payload}));
        } catch(e) {}
        // Also dispatch on window for compatibility
        try {
          window.dispatchEvent(new MessageEvent('message', {data: payload}));
        } catch(e) {}
        // Also dispatch custom event for any listeners
        try {
          document.dispatchEvent(new CustomEvent('rampkit:vars-updated', {detail: newVars}));
        } catch(e) {}
        // Call global callback if defined
        if (typeof window.onRampkitVarsUpdate === 'function') {
          window.onRampkitVarsUpdate(newVars);
        }
      } catch(e) {
        console.log('[Rampkit] buildDirectVarsScript error:', e);
      }
    })();`;
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
  }

  /**
   * Broadcast variables to all WebViews, optionally excluding one.
   * This mirrors the iOS SDK's broadcastVariables(excluding:) pattern.
   * @param excludeIndex - Optional index of WebView to skip (typically the source of the update)
   */
  function broadcastVars(excludeIndex?: number) {
    if (__DEV__)
      console.log("[Rampkit] broadcastVars", {
        recipients: webviewsRef.current.length,
        excludeIndex,
        vars: varsRef.current,
      });
    const script = buildDirectVarsScript(varsRef.current);
    const now = Date.now();
    for (let i = 0; i < webviewsRef.current.length; i++) {
      // Skip the source WebView to prevent echo loops
      if (excludeIndex !== undefined && i === excludeIndex) {
        continue;
      }
      const wv = webviewsRef.current[i];
      if (wv) {
        // Track send time for stale value filtering
        lastVarsSendTimeRef.current[i] = now;
        // @ts-ignore: injectJavaScript exists on WebView instance
        wv.injectJavaScript(script);
      }
    }
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

  const onPageSelected = (e: any) => {
    const pos = e.nativeEvent.position;
    setIndex(pos);
    // ensure current page is synced with latest vars when selected
    if (__DEV__) console.log("[Rampkit] onPageSelected", pos);
    // Send vars multiple times with increasing delays to ensure the webview
    // receives them. The first send might fail if the webview isn't fully ready,
    // so we retry a few times.
    requestAnimationFrame(() => {
      sendVarsToWebView(pos);
    });
    // Retry after a short delay in case the first send didn't work
    setTimeout(() => {
      sendVarsToWebView(pos);
    }, 50);
    // Final retry to catch any edge cases
    setTimeout(() => {
      sendVarsToWebView(pos);
    }, 150);
    
    // Track screen change event
    if (props.onScreenChange && props.screens[pos]) {
      props.onScreenChange(pos, props.screens[pos].id);
    }
  };

  const handleAdvance = (i: number, animation: string = "fade") => {
    const last = props.screens.length - 1;
    if (i < last) {
      navigateToIndex(i + 1, animation);
      Haptics.impactAsync("light").catch(() => {});
    } else {
      // finish - mark as completed before closing
      setOnboardingCompleted(true);
      Haptics.notificationAsync("success").catch(() => {});
      handleRequestClose({ completed: true });
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

    // Save to shared vars and broadcast to all pages
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
      broadcastVars();
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
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: pagerOpacity,
            transform: [{ translateX: pagerTranslateX }],
          },
        ]}
      >
        <PagerView
          ref={pagerRef}
          style={StyleSheet.absoluteFill}
          scrollEnabled={false}
          initialPage={0}
          onPageSelected={onPageSelected}
          offscreenPageLimit={props.screens.length}
          overScrollMode="never"
        >
        {docs.map((doc: any, i: number) => (
          <View
            key={props.screens[i].id}
            style={styles.page}
            renderToHardwareTextureAndroid
          >
            <WebView
              ref={(r: any) => (webviewsRef.current[i] = r)}
              style={styles.webview}
              originWhitelist={["*"]}
              source={{ html: doc }}
              injectedJavaScriptBeforeContentLoaded={injectedHardening}
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
                setLoadedCount((c: number) => c + 1);
                if (i === 0) {
                  setFirstPageLoaded(true);
                  // Track initial screen view
                  if (!hasTrackedInitialScreen.current && props.onScreenChange && props.screens[0]) {
                    hasTrackedInitialScreen.current = true;
                    props.onScreenChange(0, props.screens[0].id);
                  }
                }
                // Initialize this page with current vars (isInitialLoad=true to enable stale filter)
                if (__DEV__)
                  console.log("[Rampkit] onLoadEnd init send vars", i);
                sendVarsToWebView(i, true);
              }}
              onMessage={(ev: any) => {
                const raw = ev.nativeEvent.data;
                console.log("raw", raw);
                // Accept either raw strings or JSON payloads from your editor
                try {
                  // JSON path
                  const data = JSON.parse(raw);
                  // 1) Variables from a page → update shared + broadcast to OTHER pages
                  // This mirrors the iOS SDK pattern with stale value filtering.
                  if (
                    data?.type === "rampkit:variables" &&
                    data?.vars &&
                    typeof data.vars === "object"
                  ) {
                    if (__DEV__)
                      console.log(
                        "[Rampkit] received variables from page",
                        i,
                        data.vars
                      );
                    
                    // Check if this page is within the stale value window
                    // (we recently sent vars to it and it may be echoing back defaults)
                    const now = Date.now();
                    const lastSendTime = lastVarsSendTimeRef.current[i] || 0;
                    const timeSinceSend = now - lastSendTime;
                    const isWithinStaleWindow = timeSinceSend < STALE_VALUE_WINDOW_MS;
                    
                    if (__DEV__) {
                      console.log("[Rampkit] stale check:", {
                        pageIndex: i,
                        isWithinStaleWindow,
                        timeSinceSend,
                      });
                    }
                    
                    let changed = false;
                    const newVars: Record<string, any> = {};
                    
                    for (const [key, value] of Object.entries<any>(data.vars)) {
                      const hasHostVal = Object.prototype.hasOwnProperty.call(
                        varsRef.current,
                        key
                      );
                      const hostVal = (varsRef.current as any)[key];
                      
                      // Stale value filtering (matches iOS SDK behavior):
                      // If we're within the stale window, don't let empty/default values
                      // overwrite existing non-empty host values.
                      // This prevents pages from clobbering user input with cached defaults
                      // when they first become active/visible.
                      if (isWithinStaleWindow && hasHostVal) {
                        const hostIsNonEmpty = hostVal !== "" && hostVal !== null && hostVal !== undefined;
                        const incomingIsEmpty = value === "" || value === null || value === undefined;
                        if (hostIsNonEmpty && incomingIsEmpty) {
                          if (__DEV__) {
                            console.log(`[Rampkit] filtering stale empty value for key "${key}": keeping "${hostVal}"`);
                          }
                          continue; // Skip this key, keep host value
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
                      // Broadcast to all WebViews EXCEPT the source (index i)
                      // This prevents echo loops and matches iOS SDK behavior
                      broadcastVars(i);
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
                    (async () => {
                      try {
                        const available = await StoreReview.isAvailableAsync();
                        if (available) {
                          await StoreReview.requestReview();
                        }
                      } catch (_) {}
                    })();
                    return;
                  }
                  // 4) A page requested notification permission
                  if (data?.type === "rampkit:request-notification-permission") {
                    handleNotificationPermissionRequest({
                      ios: data?.ios,
                      android: data?.android,
                      behavior: data?.behavior,
                    });
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
                      if (i > 0) {
                        navigateToIndex(i - 1, data?.animation || "fade");
                      } else {
                        handleRequestClose();
                      }
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
                    if (i > 0) {
                      navigateToIndex(i - 1, data?.animation || "fade");
                    } else {
                      handleRequestClose();
                    }
                    return;
                  }
                  if (data?.type === "rampkit:close") {
                    handleRequestClose();
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
                    (async () => {
                      try {
                        const available = await StoreReview.isAvailableAsync();
                        if (available) {
                          await StoreReview.requestReview();
                        }
                      } catch (_) {}
                    })();
                    return;
                  }
                  if (raw === "rampkit:request-notification-permission") {
                    handleNotificationPermissionRequest(undefined);
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
                    if (i > 0) {
                      navigateToIndex(i - 1);
                    } else {
                      handleRequestClose();
                    }
                    return;
                  }
                  if (raw.startsWith("rampkit:navigate:")) {
                    const target = raw.slice("rampkit:navigate:".length);
                    if (target === "__goBack__") {
                      if (i > 0) {
                        navigateToIndex(i - 1);
                      } else {
                        handleRequestClose();
                      }
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
                    handleRequestClose();
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
          </View>
        ))}
        </PagerView>
      </Animated.View>
      
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
