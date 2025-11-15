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
exports.injectedNoSelect = exports.injectedHardening = void 0;
exports.showRampkitOverlay = showRampkitOverlay;
exports.hideRampkitOverlay = hideRampkitOverlay;
exports.preloadRampkitOverlay = preloadRampkitOverlay;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const react_native_root_siblings_1 = __importDefault(require("react-native-root-siblings"));
const react_native_pager_view_1 = __importDefault(require("react-native-pager-view"));
const react_native_webview_1 = require("react-native-webview");
const Haptics = __importStar(require("expo-haptics"));
const StoreReview = __importStar(require("expo-store-review"));
const Notifications = __importStar(require("expo-notifications"));
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
let sibling = null;
let preloadSibling = null;
const preloadCache = new Map();
function showRampkitOverlay(opts) {
    console.log("showRampkitOverlay");
    if (sibling)
        return; // already visible
    const prebuiltDocs = preloadCache.get(opts.onboardingId);
    sibling = new react_native_root_siblings_1.default(((0, jsx_runtime_1.jsx)(Overlay, { onboardingId: opts.onboardingId, screens: opts.screens, variables: opts.variables, requiredScripts: opts.requiredScripts, prebuiltDocs: prebuiltDocs, onRequestClose: () => {
            var _a;
            hideRampkitOverlay();
            (_a = opts.onClose) === null || _a === void 0 ? void 0 : _a.call(opts);
        }, onOnboardingFinished: opts.onOnboardingFinished, onShowPaywall: opts.onShowPaywall })));
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
}
function preloadRampkitOverlay(opts) {
    try {
        if (preloadCache.has(opts.onboardingId))
            return;
        const docs = opts.screens.map((s) => buildHtmlDocument(s, opts.variables, opts.requiredScripts));
        preloadCache.set(opts.onboardingId, docs);
        // Mount a hidden WebView to warm up the WebView process and cache
        if (preloadSibling)
            return;
        const HiddenPreloader = () => ((0, jsx_runtime_1.jsx)(react_native_1.View, { pointerEvents: "none", style: {
                position: "absolute",
                width: 1,
                height: 1,
                opacity: 0,
                top: -1000,
                left: -1000,
            }, children: (0, jsx_runtime_1.jsx)(react_native_webview_1.WebView, { originWhitelist: ["*"], source: { html: docs[0] || "<html></html>" }, injectedJavaScriptBeforeContentLoaded: exports.injectedHardening, injectedJavaScript: exports.injectedNoSelect, automaticallyAdjustContentInsets: false, contentInsetAdjustmentBehavior: "never", bounces: false, scrollEnabled: false, allowsInlineMediaPlayback: true, mediaPlaybackRequiresUserAction: false, cacheEnabled: true }) }));
        preloadSibling = new react_native_root_siblings_1.default((0, jsx_runtime_1.jsx)(HiddenPreloader, {}));
    }
    catch (e) {
        // best-effort preloading; ignore errors
    }
}
function buildHtmlDocument(screen, variables, requiredScripts) {
    const css = screen.css || "";
    const html = screen.html || "";
    const js = screen.js || "";
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
    const overlayOpacity = (0, react_1.useRef)(new react_native_1.Animated.Value(0)).current;
    const fadeOpacity = (0, react_1.useRef)(new react_native_1.Animated.Value(0)).current;
    const allLoaded = loadedCount >= props.screens.length;
    // shared vars across all webviews
    const varsRef = (0, react_1.useRef)({});
    // hold refs for injection
    const webviewsRef = (0, react_1.useRef)([]);
    // track when we last initialized a given page with host vars (to filter stale defaults)
    const lastInitSendRef = (0, react_1.useRef)([]);
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
    const handleRequestClose = react_1.default.useCallback(() => {
        if (isClosing)
            return;
        setIsClosing(true);
        react_native_1.Animated.timing(overlayOpacity, {
            toValue: 0,
            duration: 220,
            easing: react_native_1.Easing.out(react_native_1.Easing.cubic),
            useNativeDriver: true,
        }).start(() => {
            props.onRequestClose();
        });
    }, [isClosing, overlayOpacity, props.onRequestClose]);
    // Android hardware back goes to previous page, then closes
    const navigateToIndex = (nextIndex) => {
        if (nextIndex === index ||
            nextIndex < 0 ||
            nextIndex >= props.screens.length)
            return;
        if (isTransitioning)
            return;
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
    function sendVarsToWebView(i) {
        const wv = webviewsRef.current[i];
        if (!wv)
            return;
        const payload = { type: "rampkit:variables", vars: varsRef.current };
        if (__DEV__)
            console.log("[Rampkit] sendVarsToWebView", i, varsRef.current);
        lastInitSendRef.current[i] = Date.now();
        // @ts-ignore: injectJavaScript exists on WebView instance
        wv.injectJavaScript(buildDispatchScript(payload));
    }
    function broadcastVars() {
        if (__DEV__)
            console.log("[Rampkit] broadcastVars", {
                recipients: webviewsRef.current.length,
                vars: varsRef.current,
            });
        for (let i = 0; i < webviewsRef.current.length; i++) {
            const wv = webviewsRef.current[i];
            if (wv) {
                // @ts-ignore: injectJavaScript exists on WebView instance
                wv.injectJavaScript(buildDispatchScript({
                    type: "rampkit:variables",
                    vars: varsRef.current,
                }));
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
        props.screens.map((s) => buildHtmlDocument(s, props.variables, props.requiredScripts)), [props.prebuiltDocs, props.screens, props.variables, props.requiredScripts]);
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
        sendVarsToWebView(pos);
    };
    const handleAdvance = (i) => {
        const last = props.screens.length - 1;
        if (i < last) {
            navigateToIndex(i + 1);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
        }
        else {
            // finish
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
            handleRequestClose();
        }
    };
    async function handleNotificationPermissionRequest(payload) {
        const iosDefaults = { allowAlert: true, allowBadge: true, allowSound: true };
        const androidDefaults = {
            channelId: "default",
            name: "Default Channel",
            importance: "MAX",
        };
        const behaviorDefaults = { shouldShowBanner: true, shouldPlaySound: false };
        const iosReq = { ...((payload === null || payload === void 0 ? void 0 : payload.ios) || iosDefaults) };
        const androidCfg = { ...((payload === null || payload === void 0 ? void 0 : payload.android) || androidDefaults) };
        const behavior = { ...((payload === null || payload === void 0 ? void 0 : payload.behavior) || behaviorDefaults) };
        try {
            // Set foreground behavior
            Notifications.setNotificationHandler({
                handleNotification: async () => ({
                    shouldShowAlert: !!behavior.shouldShowBanner,
                    shouldPlaySound: !!behavior.shouldPlaySound,
                    shouldSetBadge: false,
                }),
            });
        }
        catch (_) { }
        try {
            // Minimal Android 13+ permission + channel config
            if (react_native_1.Platform.OS === "android") {
                const importanceMap = {
                    MAX: Notifications.AndroidImportance.MAX,
                    HIGH: Notifications.AndroidImportance.HIGH,
                    DEFAULT: Notifications.AndroidImportance.DEFAULT,
                    LOW: Notifications.AndroidImportance.LOW,
                    MIN: Notifications.AndroidImportance.MIN,
                };
                const mappedImportance = importanceMap[String(androidCfg.importance || "MAX").toUpperCase()] ||
                    Notifications.AndroidImportance.MAX;
                if (androidCfg.channelId && androidCfg.name) {
                    try {
                        await Notifications.setNotificationChannelAsync(androidCfg.channelId, {
                            name: androidCfg.name,
                            importance: mappedImportance,
                        });
                    }
                    catch (_) { }
                }
            }
        }
        catch (_) { }
        let result = null;
        try {
            if (react_native_1.Platform.OS === "ios") {
                result = await Notifications.requestPermissionsAsync({ ios: iosReq });
            }
            else {
                result = await Notifications.requestPermissionsAsync();
            }
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
        // Save to shared vars and broadcast to all pages
        try {
            varsRef.current = {
                ...varsRef.current,
                notificationsPermission: {
                    granted: !!(result === null || result === void 0 ? void 0 : result.granted),
                    status: (result === null || result === void 0 ? void 0 : result.status) || "undetermined",
                    canAskAgain: !!(result === null || result === void 0 ? void 0 : result.canAskAgain),
                    expires: (result === null || result === void 0 ? void 0 : result.expires) || "never",
                    ios: result === null || result === void 0 ? void 0 : result.ios,
                    android: result === null || result === void 0 ? void 0 : result.android,
                },
            };
            broadcastVars();
        }
        catch (_) { }
    }
    return ((0, jsx_runtime_1.jsxs)(react_native_1.View, { style: [
            styles.root,
            !visible && styles.invisible,
            visible && { opacity: overlayOpacity },
        ], pointerEvents: visible && !isClosing ? "auto" : "none", children: [(0, jsx_runtime_1.jsx)(react_native_pager_view_1.default, { ref: pagerRef, style: react_native_1.StyleSheet.absoluteFill, scrollEnabled: false, initialPage: 0, onPageSelected: onPageSelected, offscreenPageLimit: props.screens.length, overScrollMode: "never", children: docs.map((doc, i) => ((0, jsx_runtime_1.jsx)(react_native_1.View, { style: styles.page, renderToHardwareTextureAndroid: true, children: (0, jsx_runtime_1.jsx)(react_native_webview_1.WebView, { ref: (r) => (webviewsRef.current[i] = r), style: styles.webview, originWhitelist: ["*"], source: { html: doc }, injectedJavaScriptBeforeContentLoaded: exports.injectedHardening, injectedJavaScript: exports.injectedNoSelect, automaticallyAdjustContentInsets: false, contentInsetAdjustmentBehavior: "never", bounces: false, scrollEnabled: false, overScrollMode: "never", scalesPageToFit: false, showsHorizontalScrollIndicator: false, dataDetectorTypes: "none", allowsLinkPreview: false, allowsInlineMediaPlayback: true, mediaPlaybackRequiresUserAction: false, cacheEnabled: true, javaScriptEnabled: true, domStorageEnabled: true, onLoadEnd: () => {
                            setLoadedCount((c) => c + 1);
                            if (i === 0)
                                setFirstPageLoaded(true);
                            // Initialize this page with current vars
                            if (__DEV__)
                                console.log("[Rampkit] onLoadEnd init send vars", i);
                            sendVarsToWebView(i);
                        }, onMessage: (ev) => {
                            var _a, _b, _c, _d;
                            const raw = ev.nativeEvent.data;
                            console.log("raw", raw);
                            // Accept either raw strings or JSON payloads from your editor
                            try {
                                // JSON path
                                const data = JSON.parse(raw);
                                // 1) Variables from a page → update shared + broadcast
                                if ((data === null || data === void 0 ? void 0 : data.type) === "rampkit:variables" &&
                                    (data === null || data === void 0 ? void 0 : data.vars) &&
                                    typeof data.vars === "object") {
                                    if (__DEV__)
                                        console.log("[Rampkit] received variables from page", i, data.vars);
                                    const now = Date.now();
                                    const lastInit = lastInitSendRef.current[i] || 0;
                                    const filtered = {};
                                    let changed = false;
                                    for (const [key, value] of Object.entries(data.vars)) {
                                        const hasHostVal = Object.prototype.hasOwnProperty.call(varsRef.current, key);
                                        const hostVal = varsRef.current[key];
                                        if (now - lastInit < 600 &&
                                            hasHostVal &&
                                            hostVal !== undefined &&
                                            value !== hostVal) {
                                            if (__DEV__)
                                                console.log("[Rampkit] ignore stale var from page", i, key, value, "kept", hostVal);
                                            continue;
                                        }
                                        if (!hasHostVal || hostVal !== value) {
                                            filtered[key] = value;
                                            changed = true;
                                        }
                                    }
                                    if (changed) {
                                        varsRef.current = { ...varsRef.current, ...filtered };
                                        broadcastVars();
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
                                            const available = await StoreReview.isAvailableAsync();
                                            if (available && (await StoreReview.hasAction())) {
                                                await StoreReview.requestReview();
                                                return;
                                            }
                                            const url = StoreReview.storeUrl();
                                            if (url) {
                                                const writeUrl = react_native_1.Platform.OS === "ios"
                                                    ? `${url}${url.includes("?") ? "&" : "?"}action=write-review`
                                                    : url;
                                                await react_native_1.Linking.openURL(writeUrl);
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
                                    try {
                                        (_a = props.onOnboardingFinished) === null || _a === void 0 ? void 0 : _a.call(props, data === null || data === void 0 ? void 0 : data.payload);
                                    }
                                    catch (_) { }
                                    handleRequestClose();
                                    return;
                                }
                                // 6) Request to show paywall
                                if ((data === null || data === void 0 ? void 0 : data.type) === "rampkit:show-paywall") {
                                    try {
                                        (_b = props.onShowPaywall) === null || _b === void 0 ? void 0 : _b.call(props);
                                    }
                                    catch (_) { }
                                    return;
                                }
                                if ((data === null || data === void 0 ? void 0 : data.type) === "rampkit:continue" ||
                                    (data === null || data === void 0 ? void 0 : data.type) === "continue") {
                                    handleAdvance(i);
                                    return;
                                }
                                if ((data === null || data === void 0 ? void 0 : data.type) === "rampkit:navigate") {
                                    const target = data === null || data === void 0 ? void 0 : data.targetScreenId;
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
                                if ((data === null || data === void 0 ? void 0 : data.type) === "rampkit:goBack") {
                                    if (i > 0) {
                                        navigateToIndex(i - 1);
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
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
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
                                            const available = await StoreReview.isAvailableAsync();
                                            if (available && (await StoreReview.hasAction())) {
                                                await StoreReview.requestReview();
                                                return;
                                            }
                                            const url = StoreReview.storeUrl();
                                            if (url) {
                                                const writeUrl = react_native_1.Platform.OS === "ios"
                                                    ? `${url}${url.includes("?") ? "&" : "?"}action=write-review`
                                                    : url;
                                                await react_native_1.Linking.openURL(writeUrl);
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
                                    try {
                                        (_c = props.onOnboardingFinished) === null || _c === void 0 ? void 0 : _c.call(props, undefined);
                                    }
                                    catch (_) { }
                                    handleRequestClose();
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
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
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
