import React, { useMemo, useRef, useState } from "react";
import { View, StyleSheet, BackHandler, Animated, Easing, Linking, Platform } from "react-native";
import RootSiblings from "react-native-root-siblings";
import PagerView, {
  PagerViewOnPageSelectedEvent,
} from "react-native-pager-view";
import { WebView } from "react-native-webview";
import * as Haptics from "expo-haptics";
import * as StoreReview from "expo-store-review";
import * as Notifications from "expo-notifications";

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

export type ScreenPayload = {
  id: string;
  html: string;
  css?: string;
  js?: string;
};

let sibling: any | null = null;
let preloadSibling: any | null = null;
const preloadCache = new Map<string, string[]>();
let activeCloseHandler: (() => void) | null = null;

export function showRampkitOverlay(opts: {
  onboardingId: string;
  screens: ScreenPayload[];
  variables?: Record<string, any>;
  requiredScripts?: string[];
  onClose?: () => void;
  onOnboardingFinished?: (payload?: any) => void;
  onShowPaywall?: (payload?: any) => void;
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
}) {
  try {
    if (preloadCache.has(opts.onboardingId)) return;
    const docs = opts.screens.map((s) =>
      buildHtmlDocument(s, opts.variables, opts.requiredScripts)
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
          injectedJavaScript={injectedNoSelect}
          automaticallyAdjustContentInsets={false}
          contentInsetAdjustmentBehavior="never"
          bounces={false}
          scrollEnabled={false}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          cacheEnabled
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
  requiredScripts?: string[]
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

function Overlay(props: {
  onboardingId: string;
  screens: ScreenPayload[];
  variables?: Record<string, any>;
  requiredScripts?: string[];
  prebuiltDocs?: string[];
  onRequestClose: () => void;
  onOnboardingFinished?: (payload?: any) => void;
  onShowPaywall?: (payload?: any) => void;
  onRegisterClose?: (handler: (() => void) | null) => void;
}) {
  const pagerRef = useRef(null as any);
  const [index, setIndex] = useState(0);
  const [loadedCount, setLoadedCount] = useState(0);
  const [firstPageLoaded, setFirstPageLoaded] = useState(false);
  const [visible, setVisible] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const fadeOpacity = useRef(new Animated.Value(0)).current;
  const allLoaded = loadedCount >= props.screens.length;
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

  const handleRequestClose = React.useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    Animated.timing(overlayOpacity, {
      toValue: 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      props.onRequestClose();
    });
  }, [isClosing, overlayOpacity, props.onRequestClose]);

  React.useEffect(() => {
    props.onRegisterClose?.(handleRequestClose);
    return () => {
      props.onRegisterClose?.(null);
    };
  }, [handleRequestClose, props.onRegisterClose]);

  // Android hardware back goes to previous page, then closes
  const navigateToIndex = (nextIndex: number) => {
    if (
      nextIndex === index ||
      nextIndex < 0 ||
      nextIndex >= props.screens.length
    )
      return;
    if (isTransitioning) return;
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

  function sendVarsToWebView(i: number) {
    const wv = webviewsRef.current[i];
    if (!wv) return;
    const payload = { type: "rampkit:variables", vars: varsRef.current };
    if (__DEV__) console.log("[Rampkit] sendVarsToWebView", i, varsRef.current);
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
        wv.injectJavaScript(
          buildDispatchScript({
            type: "rampkit:variables",
            vars: varsRef.current,
          })
        );
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
        buildHtmlDocument(s, props.variables, props.requiredScripts)
      ),
    [props.prebuiltDocs, props.screens, props.variables, props.requiredScripts]
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
    sendVarsToWebView(pos);
  };

  const handleAdvance = (i: number) => {
    const last = props.screens.length - 1;
    if (i < last) {
      navigateToIndex(i + 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } else {
      // finish
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {}
      );
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
    const iosDefaults = { allowAlert: true, allowBadge: true, allowSound: true };
    const androidDefaults = {
      channelId: "default",
      name: "Default Channel",
      importance: "MAX",
    };
    const behaviorDefaults = { shouldShowBanner: true, shouldPlaySound: false };

    const iosReq = { ...(payload?.ios || iosDefaults) };
    const androidCfg = { ...(payload?.android || androidDefaults) };
    const behavior = { ...(payload?.behavior || behaviorDefaults) };

    try {
      // Set foreground behavior
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: !!behavior.shouldShowBanner,
          shouldPlaySound: !!behavior.shouldPlaySound,
          shouldSetBadge: false,
        }),
      });
    } catch (_) {}

    try {
      // Minimal Android 13+ permission + channel config
      if (Platform.OS === "android") {
        const importanceMap: Record<string, number> = {
          MAX: Notifications.AndroidImportance.MAX,
          HIGH: Notifications.AndroidImportance.HIGH,
          DEFAULT: Notifications.AndroidImportance.DEFAULT,
          LOW: Notifications.AndroidImportance.LOW,
          MIN: Notifications.AndroidImportance.MIN,
        };
        const mappedImportance =
          importanceMap[String(androidCfg.importance || "MAX").toUpperCase()] ||
          Notifications.AndroidImportance.MAX;
        if (androidCfg.channelId && androidCfg.name) {
          try {
            await Notifications.setNotificationChannelAsync(androidCfg.channelId, {
              name: androidCfg.name,
              importance: mappedImportance,
            });
          } catch (_) {}
        }
      }
    } catch (_) {}

    let result: any = null;
    try {
      if (Platform.OS === "ios") {
        result = await Notifications.requestPermissionsAsync({ ios: iosReq as any });
      } else {
        result = await Notifications.requestPermissionsAsync();
      }
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

    // Save to shared vars and broadcast to all pages
    try {
      varsRef.current = {
        ...varsRef.current,
        notificationsPermission: {
          granted: !!result?.granted,
          status: result?.status || "undetermined",
          canAskAgain: !!result?.canAskAgain,
          expires: result?.expires || "never",
          ios: result?.ios,
          android: result?.android,
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
              injectedJavaScript={injectedNoSelect}
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
              onLoadEnd={() => {
                setLoadedCount((c: number) => c + 1);
                if (i === 0) setFirstPageLoaded(true);
                // Initialize this page with current vars
                if (__DEV__)
                  console.log("[Rampkit] onLoadEnd init send vars", i);
                sendVarsToWebView(i);
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
                    const now = Date.now();
                    const lastInit = lastInitSendRef.current[i] || 0;
                    const filtered: Record<string, any> = {};
                    let changed = false;
                    for (const [key, value] of Object.entries<any>(data.vars)) {
                      const hasHostVal = Object.prototype.hasOwnProperty.call(
                        varsRef.current,
                        key
                      );
                      const hostVal = (varsRef.current as any)[key];
                      if (
                        now - lastInit < 600 &&
                        hasHostVal &&
                        hostVal !== undefined &&
                        value !== hostVal
                      ) {
                        if (__DEV__)
                          console.log(
                            "[Rampkit] ignore stale var from page",
                            i,
                            key,
                            value,
                            "kept",
                            hostVal
                          );
                        continue;
                      }
                      if (!hasHostVal || hostVal !== value) {
                        (filtered as any)[key] = value;
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
                        if (available && (await StoreReview.hasAction())) {
                          await StoreReview.requestReview();
                          return;
                        }
                        const url = StoreReview.storeUrl();
                        if (url) {
                          const writeUrl =
                            Platform.OS === "ios"
                              ? `${url}${url.includes("?") ? "&" : "?"}action=write-review`
                              : url;
                          await Linking.openURL(writeUrl);
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
                    try {
                      props.onOnboardingFinished?.(data?.payload);
                    } catch (_) {}
                    handleRequestClose();
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
                    handleAdvance(i);
                    return;
                  }
                  if (data?.type === "rampkit:navigate") {
                    const target = data?.targetScreenId;
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
                  if (data?.type === "rampkit:goBack") {
                    if (i > 0) {
                      navigateToIndex(i - 1);
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
                    Haptics.impactAsync(
                      Haptics.ImpactFeedbackStyle.Medium
                    ).catch(() => {});
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
                        if (available && (await StoreReview.hasAction())) {
                          await StoreReview.requestReview();
                          return;
                        }
                        const url = StoreReview.storeUrl();
                        if (url) {
                          const writeUrl =
                            Platform.OS === "ios"
                              ? `${url}${url.includes("?") ? "&" : "?"}action=write-review`
                              : url;
                          await Linking.openURL(writeUrl);
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
                    try {
                      props.onOnboardingFinished?.(undefined);
                    } catch (_) {}
                    handleRequestClose();
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
                    Haptics.impactAsync(
                      Haptics.ImpactFeedbackStyle.Medium
                    ).catch(() => {});
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
