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

// Template resolution script that replaces ${device.xxx} and ${user.xxx} with actual values
// This runs on DOMContentLoaded and can be re-triggered via window.rampkitResolveTemplates()
export const injectedTemplateResolver = `
(function(){
  try {
    if (window.__rkTemplateResolverApplied) return true;
    window.__rkTemplateResolverApplied = true;
    
    // Build variable map from context
    function buildVarMap() {
      var vars = {};
      var ctx = window.rampkitContext || { device: {}, user: {} };
      var state = window.__rampkitVariables || {};
      
      // Device vars (device.xxx)
      if (ctx.device) {
        Object.keys(ctx.device).forEach(function(key) {
          vars['device.' + key] = ctx.device[key];
        });
      }
      
      // User vars (user.xxx)
      if (ctx.user) {
        Object.keys(ctx.user).forEach(function(key) {
          vars['user.' + key] = ctx.user[key];
        });
      }
      
      // State vars (varName - no prefix)
      Object.keys(state).forEach(function(key) {
        vars[key] = state[key];
      });
      
      return vars;
    }
    
    // Format a value for display
    function formatValue(value) {
      if (value === undefined || value === null) return '';
      if (typeof value === 'boolean') return value ? 'true' : 'false';
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
    }
    
    // Resolve templates in a single text node
    function resolveTextNode(node, vars) {
      var text = node.textContent;
      if (!text || text.indexOf('\${') === -1) return;
      
      var resolved = text.replace(/\\$\\{([A-Za-z_][A-Za-z0-9_\\.]*)\\}/g, function(match, varName) {
        if (vars.hasOwnProperty(varName)) {
          return formatValue(vars[varName]);
        }
        return match; // Keep original if var not found
      });
      
      if (resolved !== text) {
        node.textContent = resolved;
      }
    }
    
    // Resolve templates in all text nodes
    function resolveAllTemplates() {
      var vars = buildVarMap();
      var walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      
      var node;
      while (node = walker.nextNode()) {
        resolveTextNode(node, vars);
      }
      
      // Also resolve in attribute values that might contain templates
      var allElements = document.body.getElementsByTagName('*');
      for (var i = 0; i < allElements.length; i++) {
        var el = allElements[i];
        for (var j = 0; j < el.attributes.length; j++) {
          var attr = el.attributes[j];
          if (attr.value && attr.value.indexOf('\${') !== -1) {
            var resolvedAttr = attr.value.replace(/\\$\\{([A-Za-z_][A-Za-z0-9_\\.]*)\\}/g, function(match, varName) {
              if (vars.hasOwnProperty(varName)) {
                return formatValue(vars[varName]);
              }
              return match;
            });
            if (resolvedAttr !== attr.value) {
              el.setAttribute(attr.name, resolvedAttr);
            }
          }
        }
      }
    }
    
    // Run on DOMContentLoaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', resolveAllTemplates);
    } else {
      // DOM already ready, run immediately
      resolveAllTemplates();
    }
    
    // Also run after a short delay to catch dynamically added content
    setTimeout(resolveAllTemplates, 100);
    
    // Expose for manual re-resolution
    window.rampkitResolveTemplates = resolveAllTemplates;
    
    // Re-resolve when variables update
    document.addEventListener('rampkit:vars-updated', function() {
      setTimeout(resolveAllTemplates, 0);
    });
    
  } catch(e) {
    console.log('[Rampkit] Template resolver error:', e);
  }
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
const preloadCache = new Map<string, string[]>();
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
  console.log("showRampkitOverlay");
  if (sibling) return; // already visible
  const prebuiltDocs = preloadCache.get(opts.onboardingId);
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
  try {
    if (preloadCache.has(opts.onboardingId)) return;
    const docs = opts.screens.map((s) =>
      buildHtmlDocument(s, opts.variables, opts.requiredScripts, opts.rampkitContext)
    );
    preloadCache.set(opts.onboardingId, docs);
    // Mount a hidden WebView to warm up the WebView process and cache
    if (preloadSibling) return;
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
          injectedJavaScript={injectedNoSelect + injectedVarsHandler + injectedTemplateResolver}
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

function buildHtmlDocument(
  screen: ScreenPayload,
  variables?: Record<string, any>,
  requiredScripts?: string[],
  rampkitContext?: RampKitContext
) {
  const css = screen.css || "";
  const html = screen.html || "";
  const js = screen.js || "";
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
  
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"/>
${preconnectTags}
${scripts}
<style>${css}</style>
<style>html,body{margin:0;padding:0;overflow-x:hidden} *{-webkit-tap-highlight-color: rgba(0,0,0,0);} ::selection{background:transparent}::-moz-selection{background:transparent}</style>
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
  const allLoaded = loadedCount >= props.screens.length;
  const hasTrackedInitialScreen = useRef(false);
  // shared vars across all webviews
  const varsRef = useRef({} as Record<string, any>);
  // hold refs for injection
  const webviewsRef = useRef([] as any[]);
  // track when we last initialized a given page with host vars (to filter stale defaults)
  const lastInitSendRef = useRef([] as number[]);

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

    // Slide animation: use PagerView's built-in animated page change
    // and skip the fade curtain overlay.
    if (animation === "slide") {
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
  // This is more reliable than dispatching events which may not be caught
  function buildDirectVarsScript(vars: Record<string, any>): string {
    const json = JSON.stringify(vars)
      .replace(/\\/g, "\\\\")
      .replace(/`/g, "\\`");
    return `(function(){
      try {
        var newVars = ${json};
        // Directly update the global variables object
        window.__rampkitVariables = newVars;
        // Call the handler if available
        if (typeof window.__rkHandleVarsUpdate === 'function') {
          window.__rkHandleVarsUpdate(newVars);
        }
        // Dispatch custom event for any listeners
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
    // Only update the stale filter timestamp during initial page load,
    // not when syncing vars on page selection. This prevents the filter
    // from incorrectly rejecting legitimate user interactions that happen
    // immediately after navigating to a screen.
    if (isInitialLoad) {
      lastInitSendRef.current[i] = Date.now();
    }
    // Use direct variable setting instead of MessageEvent dispatch
    // This is more reliable as it doesn't depend on event listeners being set up
    // @ts-ignore: injectJavaScript exists on WebView instance
    wv.injectJavaScript(buildDirectVarsScript(varsRef.current));
  }

  function broadcastVars() {
    if (__DEV__)
      console.log("[Rampkit] broadcastVars", {
        recipients: webviewsRef.current.length,
        vars: varsRef.current,
      });
    const script = buildDirectVarsScript(varsRef.current);
    for (let i = 0; i < webviewsRef.current.length; i++) {
      const wv = webviewsRef.current[i];
      if (wv) {
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
              injectedJavaScript={injectedNoSelect + injectedVarsHandler + injectedTemplateResolver}
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
                  // 1) Variables from a page → update shared + broadcast
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
                    // Accept all variable updates from pages without filtering.
                    // The previous filter was too aggressive and blocked legitimate
                    // user interactions that happened within 600ms of page load.
                    // We now trust that pages send correct variable updates.
                    let changed = false;
                    const newVars: Record<string, any> = {};
                    for (const [key, value] of Object.entries<any>(data.vars)) {
                      const hasHostVal = Object.prototype.hasOwnProperty.call(
                        varsRef.current,
                        key
                      );
                      const hostVal = (varsRef.current as any)[key];
                      if (!hasHostVal || hostVal !== value) {
                        newVars[key] = value;
                        changed = true;
                      }
                    }
                    if (changed) {
                      varsRef.current = { ...varsRef.current, ...newVars };
                      broadcastVars();
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
