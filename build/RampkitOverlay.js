"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.injectedVarsHandler = exports.injectedNoSelect = exports.injectedHardening = void 0;
exports.showRampkitOverlay = showRampkitOverlay;
exports.hideRampkitOverlay = hideRampkitOverlay;
exports.closeRampkitOverlay = closeRampkitOverlay;
exports.preloadRampkitOverlay = preloadRampkitOverlay;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const react_native_root_siblings_1 = __importDefault(require("react-native-root-siblings"));
const react_native_pager_view_1 = __importDefault(require("react-native-pager-view"));
const react_native_webview_1 = require("react-native-webview");
const RampKitNative_1 = require("./RampKitNative");
// Reuse your injected script from App
exports.injectedHardening = `
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
exports.injectedNoSelect = `
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
exports.injectedVarsHandler = `
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
function performRampkitHaptic(event) {
    if (!event || event.action !== "haptic") {
        // Backwards compatible default
        try {
            RampKitNative_1.Haptics.impactAsync("medium").catch(() => { });
        }
        catch (_) { }
        return;
    }
    const hapticType = event.hapticType;
    try {
        if (hapticType === "impact") {
            const styleMap = {
                Light: "light",
                Medium: "medium",
                Heavy: "heavy",
                Rigid: "rigid",
                Soft: "soft",
            };
            const impactStyle = styleMap[event.impactStyle] || "medium";
            RampKitNative_1.Haptics.impactAsync(impactStyle).catch(() => { });
            return;
        }
        if (hapticType === "notification") {
            const notificationMap = {
                Success: "success",
                Warning: "warning",
                Error: "error",
            };
            const notificationType = notificationMap[event.notificationType] || "success";
            RampKitNative_1.Haptics.notificationAsync(notificationType).catch(() => { });
            return;
        }
        if (hapticType === "selection") {
            RampKitNative_1.Haptics.selectionAsync().catch(() => { });
            return;
        }
        // Fallback for unknown hapticType
        RampKitNative_1.Haptics.impactAsync("medium").catch(() => { });
    }
    catch (_) {
        try {
            RampKitNative_1.Haptics.impactAsync("medium").catch(() => { });
        }
        catch (__) { }
    }
}
let sibling = null;
let preloadSibling = null;
// Cache is now disabled - always rebuild docs to ensure templates are resolved with current context
// const preloadCache = new Map<string, string[]>();
let activeCloseHandler = null;
function showRampkitOverlay(opts) {
    console.log("[RampKit] showRampkitOverlay called, context:", opts.rampkitContext ? "present" : "missing");
    if (sibling)
        return; // already visible
    // Always build fresh docs to ensure templates are resolved with current context
    const prebuiltDocs = undefined;
    sibling = new react_native_root_siblings_1.default(((0, jsx_runtime_1.jsx)(Overlay, { onboardingId: opts.onboardingId, screens: opts.screens, variables: opts.variables, requiredScripts: opts.requiredScripts, rampkitContext: opts.rampkitContext, prebuiltDocs: prebuiltDocs, onRequestClose: () => {
            var _a;
            activeCloseHandler = null;
            hideRampkitOverlay();
            (_a = opts.onClose) === null || _a === void 0 ? void 0 : _a.call(opts);
        }, onOnboardingFinished: opts.onOnboardingFinished, onShowPaywall: opts.onShowPaywall, onRegisterClose: (handler) => {
            activeCloseHandler = handler;
        }, onScreenChange: opts.onScreenChange, onOnboardingAbandoned: opts.onOnboardingAbandoned, onNotificationPermissionRequested: opts.onNotificationPermissionRequested, onNotificationPermissionResult: opts.onNotificationPermissionResult })));
    // Once shown, we can safely discard the preloader sibling if present
    if (preloadSibling) {
        preloadSibling.destroy();
        preloadSibling = null;
    }
}
function hideRampkitOverlay() {
    if (sibling) {
        sibling.destroy();
        sibling = null;
    }
    activeCloseHandler = null;
}
function closeRampkitOverlay() {
    if (activeCloseHandler) {
        activeCloseHandler();
        return;
    }
    hideRampkitOverlay();
}
function preloadRampkitOverlay(opts) {
    // Preloading is now simplified - just warm up the WebView process
    try {
        if (preloadSibling)
            return;
        const docs = opts.screens.map((s) => buildHtmlDocument(s, opts.variables, opts.requiredScripts, opts.rampkitContext));
        const HiddenPreloader = () => ((0, jsx_runtime_1.jsx)(react_native_1.View, { pointerEvents: "none", style: {
                position: "absolute",
                width: 1,
                height: 1,
                opacity: 0,
                top: -1000,
                left: -1000,
            }, children: (0, jsx_runtime_1.jsx)(react_native_webview_1.WebView, { originWhitelist: ["*"], source: { html: docs[0] || "<html></html>" }, injectedJavaScriptBeforeContentLoaded: exports.injectedHardening, injectedJavaScript: exports.injectedNoSelect + exports.injectedVarsHandler, automaticallyAdjustContentInsets: false, contentInsetAdjustmentBehavior: "never", bounces: false, scrollEnabled: false, allowsInlineMediaPlayback: true, mediaPlaybackRequiresUserAction: false, cacheEnabled: true, hideKeyboardAccessoryView: true }) }));
        preloadSibling = new react_native_root_siblings_1.default((0, jsx_runtime_1.jsx)(HiddenPreloader, {}));
    }
    catch (e) {
        // best-effort preloading; ignore errors
    }
}
/**
 * Resolve device/user templates in a string
 * Replaces ${device.xxx} and ${user.xxx} with actual values from context
 */
function resolveContextTemplates(text, context) {
    if (!text || !text.includes("${"))
        return text;
    // Build variable map
    const vars = {};
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
            if (value === undefined || value === null)
                return "";
            if (typeof value === "boolean")
                return value ? "true" : "false";
            if (typeof value === "object")
                return JSON.stringify(value);
            return String(value);
        }
        // Not a device/user var - leave for state variable handling
        return match;
    });
}
function buildHtmlDocument(screen, variables, requiredScripts, rampkitContext) {
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
            const origins = Array.from(new Set((requiredScripts || [])
                .map((s) => {
                try {
                    const u = new URL(s);
                    return {
                        origin: `${u.protocol}//${u.hostname}`,
                        host: u.hostname,
                    };
                }
                catch (_a) {
                    return null;
                }
            })
                .filter(Boolean)));
            const preconnect = origins
                .map((o) => `<link rel="preconnect" href="${o.origin}" crossorigin>`)
                .join("\n");
            const dnsPrefetch = origins
                .map((o) => `<link rel="dns-prefetch" href="//${o.host}">`)
                .join("\n");
            return `${preconnect}\n${dnsPrefetch}`;
        }
        catch (_a) {
            return "";
        }
    })();
    // Default context if not provided
    const context = rampkitContext || {
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
    if (originalHtml !== html) {
        console.log("[RampKit] Templates were resolved in HTML");
    }
    else if (originalHtml.includes("${device.") || originalHtml.includes("${user.")) {
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
function Overlay(props) {
    const pagerRef = (0, react_1.useRef)(null);
    const [index, setIndex] = (0, react_1.useState)(0);
    const [loadedCount, setLoadedCount] = (0, react_1.useState)(0);
    const [firstPageLoaded, setFirstPageLoaded] = (0, react_1.useState)(false);
    const [visible, setVisible] = (0, react_1.useState)(false);
    const [isTransitioning, setIsTransitioning] = (0, react_1.useState)(false);
    const [isClosing, setIsClosing] = (0, react_1.useState)(false);
    const [onboardingCompleted, setOnboardingCompleted] = (0, react_1.useState)(false);
    const overlayOpacity = (0, react_1.useRef)(new react_native_1.Animated.Value(0)).current;
    const fadeOpacity = (0, react_1.useRef)(new react_native_1.Animated.Value(0)).current;
    const allLoaded = loadedCount >= props.screens.length;
    const hasTrackedInitialScreen = (0, react_1.useRef)(false);
    // shared vars across all webviews
    const varsRef = (0, react_1.useRef)({});
    // hold refs for injection
    const webviewsRef = (0, react_1.useRef)([]);
    // Track when we last SENT vars to each page (for stale value filtering)
    // This helps filter out default/cached values that pages send back after receiving updates
    const lastVarsSendTimeRef = (0, react_1.useRef)([]);
    // Stale value window in milliseconds - matches iOS SDK (600ms)
    const STALE_VALUE_WINDOW_MS = 600;
    // Fade-in when overlay becomes visible
    react_1.default.useEffect(() => {
        if (visible && !isClosing) {
            react_native_1.Animated.timing(overlayOpacity, {
                toValue: 1,
                duration: 220,
                easing: react_native_1.Easing.out(react_native_1.Easing.cubic),
                useNativeDriver: true,
            }).start();
        }
    }, [visible, isClosing, overlayOpacity]);
    const handleRequestClose = react_1.default.useCallback((options) => {
        if (isClosing)
            return;
        setIsClosing(true);
        // Track abandonment if not completed
        const isCompleted = (options === null || options === void 0 ? void 0 : options.completed) || onboardingCompleted;
        if (!isCompleted && props.onOnboardingAbandoned && props.screens[index]) {
            props.onOnboardingAbandoned("dismissed", index, props.screens[index].id);
        }
        react_native_1.Animated.sequence([
            react_native_1.Animated.delay(150),
            react_native_1.Animated.timing(overlayOpacity, {
                toValue: 0,
                duration: 320,
                easing: react_native_1.Easing.out(react_native_1.Easing.cubic),
                useNativeDriver: true,
            }),
        ]).start(() => {
            props.onRequestClose();
        });
    }, [isClosing, overlayOpacity, props.onRequestClose, onboardingCompleted, index, props.screens, props.onOnboardingAbandoned]);
    react_1.default.useEffect(() => {
        var _a;
        (_a = props.onRegisterClose) === null || _a === void 0 ? void 0 : _a.call(props, handleRequestClose);
        return () => {
            var _a;
            (_a = props.onRegisterClose) === null || _a === void 0 ? void 0 : _a.call(props, null);
        };
    }, [handleRequestClose, props.onRegisterClose]);
    // Android hardware back goes to previous page, then closes
    const navigateToIndex = (nextIndex, animation = "fade") => {
        if (nextIndex === index ||
            nextIndex < 0 ||
            nextIndex >= props.screens.length)
            return;
        if (isTransitioning)
            return;
        // Slide animation: use PagerView's built-in animated page change
        // and skip the fade curtain overlay.
        if (animation === "slide") {
            // @ts-ignore: methods exist on PagerView instance
            const pager = pagerRef.current;
            if (!pager)
                return;
            if (typeof pager.setPage === "function") {
                pager.setPage(nextIndex);
            }
            else if (typeof pager.setPageWithoutAnimation === "function") {
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
        react_native_1.Animated.timing(fadeOpacity, {
            toValue: 1,
            duration: 160,
            easing: react_native_1.Easing.out(react_native_1.Easing.quad),
            useNativeDriver: true,
        }).start(() => {
            var _a, _b, _c, _d;
            // switch page without built-in slide animation
            // @ts-ignore: method exists on PagerView instance
            (_c = (_b = (_a = pagerRef.current) === null || _a === void 0 ? void 0 : _a.setPageWithoutAnimation) === null || _b === void 0 ? void 0 : _b.call(_a, nextIndex)) !== null && _c !== void 0 ? _c : (_d = pagerRef.current) === null || _d === void 0 ? void 0 : _d.setPage(nextIndex);
            requestAnimationFrame(() => {
                // Explicitly send vars to the new page after the page switch completes
                // This ensures the webview receives the latest state even if onPageSelected
                // timing was off during the transition
                sendVarsToWebView(nextIndex);
                react_native_1.Animated.timing(fadeOpacity, {
                    toValue: 0,
                    duration: 160,
                    easing: react_native_1.Easing.in(react_native_1.Easing.quad),
                    useNativeDriver: true,
                }).start(() => setIsTransitioning(false));
            });
        });
    };
    function buildDispatchScript(payload) {
        const json = JSON.stringify(payload)
            .replace(/\\/g, "\\\\")
            .replace(/`/g, "\\`");
        return `(function(){try{document.dispatchEvent(new MessageEvent('message',{data:${json}}));}catch(e){}})();`;
    }
    // Build a script that directly sets variables and triggers updates
    // This is more reliable than dispatching events which may not be caught
    function buildDirectVarsScript(vars) {
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
    function sendVarsToWebView(i, isInitialLoad = false) {
        const wv = webviewsRef.current[i];
        if (!wv)
            return;
        if (__DEV__)
            console.log("[Rampkit] sendVarsToWebView", i, varsRef.current, { isInitialLoad });
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
    function broadcastVars(excludeIndex) {
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
    react_1.default.useEffect(() => {
        const sub = react_native_1.BackHandler.addEventListener("hardwareBackPress", () => {
            if (index > 0) {
                navigateToIndex(index - 1);
                return true;
            }
            handleRequestClose();
            return true;
        });
        return () => sub.remove();
    }, [index, handleRequestClose]);
    const docs = (0, react_1.useMemo)(() => props.prebuiltDocs ||
        props.screens.map((s) => buildHtmlDocument(s, props.variables, props.requiredScripts, props.rampkitContext)), [props.prebuiltDocs, props.screens, props.variables, props.requiredScripts, props.rampkitContext]);
    react_1.default.useEffect(() => {
        try {
            console.log("[Rampkit] Overlay mounted: docs=", docs.length);
        }
        catch (_) { }
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
            setVisible((v) => {
                if (!v) {
                    try {
                        console.log("[Rampkit] Overlay fallback visible after timeout");
                    }
                    catch (_) { }
                    return true;
                }
                return v;
            });
        }, 600);
        return () => clearTimeout(tid);
    }, [docs.length, firstPageLoaded]);
    const onPageSelected = (e) => {
        const pos = e.nativeEvent.position;
        setIndex(pos);
        // ensure current page is synced with latest vars when selected
        if (__DEV__)
            console.log("[Rampkit] onPageSelected", pos);
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
    const handleAdvance = (i, animation = "fade") => {
        const last = props.screens.length - 1;
        if (i < last) {
            navigateToIndex(i + 1, animation);
            RampKitNative_1.Haptics.impactAsync("light").catch(() => { });
        }
        else {
            // finish - mark as completed before closing
            setOnboardingCompleted(true);
            RampKitNative_1.Haptics.notificationAsync("success").catch(() => { });
            handleRequestClose({ completed: true });
        }
    };
    async function handleNotificationPermissionRequest(payload) {
        var _a, _b;
        // Track that notification permission was requested
        try {
            (_a = props.onNotificationPermissionRequested) === null || _a === void 0 ? void 0 : _a.call(props);
        }
        catch (_) { }
        const iosDefaults = { allowAlert: true, allowBadge: true, allowSound: true };
        const androidDefaults = {
            channelId: "default",
            name: "Default Channel",
            importance: "MAX",
        };
        const iosReq = { ...((payload === null || payload === void 0 ? void 0 : payload.ios) || iosDefaults) };
        const androidCfg = { ...((payload === null || payload === void 0 ? void 0 : payload.android) || androidDefaults) };
        let result = null;
        try {
            result = await RampKitNative_1.Notifications.requestPermissionsAsync({
                ios: iosReq,
                android: {
                    channelId: androidCfg.channelId,
                    name: androidCfg.name,
                    importance: (androidCfg.importance || "MAX"),
                },
            });
        }
        catch (e) {
            result = {
                granted: false,
                status: "denied",
                canAskAgain: false,
                error: true,
            };
        }
        try {
            console.log("[Rampkit] Notification permission status:", result);
        }
        catch (_) { }
        // Track notification permission result
        try {
            (_b = props.onNotificationPermissionResult) === null || _b === void 0 ? void 0 : _b.call(props, !!(result === null || result === void 0 ? void 0 : result.granted));
        }
        catch (_) { }
        // Save to shared vars and broadcast to all pages
        try {
            varsRef.current = {
                ...varsRef.current,
                notificationsPermission: {
                    granted: !!(result === null || result === void 0 ? void 0 : result.granted),
                    status: (result === null || result === void 0 ? void 0 : result.status) || "undetermined",
                    canAskAgain: !!(result === null || result === void 0 ? void 0 : result.canAskAgain),
                    ios: result === null || result === void 0 ? void 0 : result.ios,
                },
            };
            broadcastVars();
        }
        catch (_) { }
    }
    return ((0, jsx_runtime_1.jsxs)(react_native_1.Animated.View, { style: [
            styles.root,
            !visible && styles.invisible,
            visible && { opacity: overlayOpacity },
        ], pointerEvents: visible && !isClosing ? "auto" : "none", children: [(0, jsx_runtime_1.jsx)(react_native_pager_view_1.default, { ref: pagerRef, style: react_native_1.StyleSheet.absoluteFill, scrollEnabled: false, initialPage: 0, onPageSelected: onPageSelected, offscreenPageLimit: props.screens.length, overScrollMode: "never", children: docs.map((doc, i) => ((0, jsx_runtime_1.jsx)(react_native_1.View, { style: styles.page, renderToHardwareTextureAndroid: true, children: (0, jsx_runtime_1.jsx)(react_native_webview_1.WebView, { ref: (r) => (webviewsRef.current[i] = r), style: styles.webview, originWhitelist: ["*"], source: { html: doc }, injectedJavaScriptBeforeContentLoaded: exports.injectedHardening, injectedJavaScript: exports.injectedNoSelect + exports.injectedVarsHandler, automaticallyAdjustContentInsets: false, contentInsetAdjustmentBehavior: "never", bounces: false, scrollEnabled: false, overScrollMode: "never", scalesPageToFit: false, showsHorizontalScrollIndicator: false, dataDetectorTypes: "none", allowsLinkPreview: false, allowsInlineMediaPlayback: true, mediaPlaybackRequiresUserAction: false, cacheEnabled: true, javaScriptEnabled: true, domStorageEnabled: true, hideKeyboardAccessoryView: true, onLoadEnd: () => {
                            setLoadedCount((c) => c + 1);
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
                        }, onMessage: (ev) => {
                            var _a, _b, _c, _d;
                            const raw = ev.nativeEvent.data;
                            console.log("raw", raw);
                            // Accept either raw strings or JSON payloads from your editor
                            try {
                                // JSON path
                                const data = JSON.parse(raw);
                                // 1) Variables from a page → update shared + broadcast to OTHER pages
                                // This mirrors the iOS SDK pattern with stale value filtering.
                                if ((data === null || data === void 0 ? void 0 : data.type) === "rampkit:variables" &&
                                    (data === null || data === void 0 ? void 0 : data.vars) &&
                                    typeof data.vars === "object") {
                                    if (__DEV__)
                                        console.log("[Rampkit] received variables from page", i, data.vars);
                                    // Check if this page is within the stale value window
                                    // (we recently sent vars to it and it's echoing back defaults)
                                    const now = Date.now();
                                    const lastSendTime = lastVarsSendTimeRef.current[i] || 0;
                                    const timeSinceSend = now - lastSendTime;
                                    const isWithinStaleWindow = timeSinceSend < STALE_VALUE_WINDOW_MS;
                                    const isActiveScreen = i === index;
                                    if (__DEV__) {
                                        console.log("[Rampkit] stale check:", {
                                            pageIndex: i,
                                            isActiveScreen,
                                            isWithinStaleWindow,
                                            timeSinceSend,
                                        });
                                    }
                                    let changed = false;
                                    const newVars = {};
                                    for (const [key, value] of Object.entries(data.vars)) {
                                        const hasHostVal = Object.prototype.hasOwnProperty.call(varsRef.current, key);
                                        const hostVal = varsRef.current[key];
                                        // Stale value filtering (matches iOS SDK behavior):
                                        // If we're within the stale window AND this is NOT the active screen,
                                        // don't let empty/default values overwrite existing host values.
                                        // This prevents preloaded pages from clobbering user input with cached defaults.
                                        if (isWithinStaleWindow && !isActiveScreen && hasHostVal) {
                                            // If host has a non-empty value and page is sending empty/default,
                                            // keep the host value (don't overwrite with stale data)
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
                                if ((data === null || data === void 0 ? void 0 : data.type) === "rampkit:request-vars") {
                                    if (__DEV__)
                                        console.log("[Rampkit] request-vars from page", i);
                                    sendVarsToWebView(i);
                                    return;
                                }
                                // 3) A page requested an in-app review prompt
                                if ((data === null || data === void 0 ? void 0 : data.type) === "rampkit:request-review" ||
                                    (data === null || data === void 0 ? void 0 : data.type) === "rampkit:review") {
                                    (async () => {
                                        try {
                                            const available = await RampKitNative_1.StoreReview.isAvailableAsync();
                                            if (available) {
                                                await RampKitNative_1.StoreReview.requestReview();
                                            }
                                        }
                                        catch (_) { }
                                    })();
                                    return;
                                }
                                // 4) A page requested notification permission
                                if ((data === null || data === void 0 ? void 0 : data.type) === "rampkit:request-notification-permission") {
                                    handleNotificationPermissionRequest({
                                        ios: data === null || data === void 0 ? void 0 : data.ios,
                                        android: data === null || data === void 0 ? void 0 : data.android,
                                        behavior: data === null || data === void 0 ? void 0 : data.behavior,
                                    });
                                    return;
                                }
                                // 5) Onboarding finished event from page
                                if ((data === null || data === void 0 ? void 0 : data.type) === "rampkit:onboarding-finished") {
                                    setOnboardingCompleted(true);
                                    try {
                                        (_a = props.onOnboardingFinished) === null || _a === void 0 ? void 0 : _a.call(props, data === null || data === void 0 ? void 0 : data.payload);
                                    }
                                    catch (_) { }
                                    handleRequestClose({ completed: true });
                                    return;
                                }
                                // 6) Request to show paywall
                                if ((data === null || data === void 0 ? void 0 : data.type) === "rampkit:show-paywall") {
                                    try {
                                        (_b = props.onShowPaywall) === null || _b === void 0 ? void 0 : _b.call(props, data === null || data === void 0 ? void 0 : data.payload);
                                    }
                                    catch (_) { }
                                    return;
                                }
                                if ((data === null || data === void 0 ? void 0 : data.type) === "rampkit:continue" ||
                                    (data === null || data === void 0 ? void 0 : data.type) === "continue") {
                                    handleAdvance(i, (data === null || data === void 0 ? void 0 : data.animation) || "fade");
                                    return;
                                }
                                if ((data === null || data === void 0 ? void 0 : data.type) === "rampkit:navigate") {
                                    const target = data === null || data === void 0 ? void 0 : data.targetScreenId;
                                    if (target === "__goBack__") {
                                        if (i > 0) {
                                            navigateToIndex(i - 1, (data === null || data === void 0 ? void 0 : data.animation) || "fade");
                                        }
                                        else {
                                            handleRequestClose();
                                        }
                                        return;
                                    }
                                    if (!target || target === "__continue__") {
                                        handleAdvance(i, (data === null || data === void 0 ? void 0 : data.animation) || "fade");
                                        return;
                                    }
                                    const targetIndex = props.screens.findIndex((s) => s.id === target);
                                    if (targetIndex >= 0) {
                                        navigateToIndex(targetIndex, (data === null || data === void 0 ? void 0 : data.animation) || "fade");
                                    }
                                    else {
                                        handleAdvance(i);
                                    }
                                    return;
                                }
                                if ((data === null || data === void 0 ? void 0 : data.type) === "rampkit:goBack") {
                                    if (i > 0) {
                                        navigateToIndex(i - 1, (data === null || data === void 0 ? void 0 : data.animation) || "fade");
                                    }
                                    else {
                                        handleRequestClose();
                                    }
                                    return;
                                }
                                if ((data === null || data === void 0 ? void 0 : data.type) === "rampkit:close") {
                                    handleRequestClose();
                                    return;
                                }
                                if ((data === null || data === void 0 ? void 0 : data.type) === "rampkit:haptic") {
                                    performRampkitHaptic(data);
                                    return;
                                }
                            }
                            catch (_e) {
                                // String path
                                if (raw === "rampkit:tap" ||
                                    raw === "next" ||
                                    raw === "continue") {
                                    handleAdvance(i);
                                    return;
                                }
                                if (raw === "rampkit:request-review" || raw === "rampkit:review") {
                                    (async () => {
                                        try {
                                            const available = await RampKitNative_1.StoreReview.isAvailableAsync();
                                            if (available) {
                                                await RampKitNative_1.StoreReview.requestReview();
                                            }
                                        }
                                        catch (_) { }
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
                                        (_c = props.onOnboardingFinished) === null || _c === void 0 ? void 0 : _c.call(props, undefined);
                                    }
                                    catch (_) { }
                                    handleRequestClose({ completed: true });
                                    return;
                                }
                                if (raw === "rampkit:show-paywall") {
                                    try {
                                        (_d = props.onShowPaywall) === null || _d === void 0 ? void 0 : _d.call(props);
                                    }
                                    catch (_) { }
                                    return;
                                }
                                if (raw === "rampkit:goBack") {
                                    if (i > 0) {
                                        navigateToIndex(i - 1);
                                    }
                                    else {
                                        handleRequestClose();
                                    }
                                    return;
                                }
                                if (raw.startsWith("rampkit:navigate:")) {
                                    const target = raw.slice("rampkit:navigate:".length);
                                    if (target === "__goBack__") {
                                        if (i > 0) {
                                            navigateToIndex(i - 1);
                                        }
                                        else {
                                            handleRequestClose();
                                        }
                                        return;
                                    }
                                    if (!target || target === "__continue__") {
                                        handleAdvance(i);
                                        return;
                                    }
                                    const targetIndex = props.screens.findIndex((s) => s.id === target);
                                    if (targetIndex >= 0) {
                                        navigateToIndex(targetIndex);
                                    }
                                    else {
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
                                    });
                                    return;
                                }
                            }
                            // No-op for other messages, but useful to log while testing
                            // console.log("WebView message:", raw);
                        }, onError: (e) => {
                            // You can surface an inline error UI here if you want
                            console.warn("WebView error:", e.nativeEvent);
                        } }) }, props.screens[i].id))) }), (0, jsx_runtime_1.jsx)(react_native_1.Animated.View, { pointerEvents: isTransitioning ? "auto" : "none", style: [
                    react_native_1.StyleSheet.absoluteFillObject,
                    styles.curtain,
                    { opacity: fadeOpacity },
                ] })] }));
}
const styles = react_native_1.StyleSheet.create({
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
exports.default = Overlay;
