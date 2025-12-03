export declare const injectedHardening = "\n(function(){\n  try {\n    var meta = document.querySelector('meta[name=\"viewport\"]');\n    if (!meta) { meta = document.createElement('meta'); meta.name = 'viewport'; document.head.appendChild(meta); }\n    meta.setAttribute('content','width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');\n    var style = document.createElement('style');\n    style.textContent='html,body{overflow-x:hidden!important;} html,body,*{-webkit-user-select:none!important;user-select:none!important;-webkit-touch-callout:none!important;-ms-user-select:none!important;touch-action: pan-y;} *{-webkit-tap-highlight-color: rgba(0,0,0,0)!important;} ::selection{background: transparent!important;} ::-moz-selection{background: transparent!important;} a,img{-webkit-user-drag:none!important;user-drag:none!important;-webkit-touch-callout:none!important} input,textarea{caret-color:transparent!important;-webkit-user-select:none!important;user-select:none!important}';\n    document.head.appendChild(style);\n    var prevent=function(e){e.preventDefault&&e.preventDefault();};\n    document.addEventListener('gesturestart',prevent,{passive:false});\n    document.addEventListener('gesturechange',prevent,{passive:false});\n    document.addEventListener('gestureend',prevent,{passive:false});\n    document.addEventListener('dblclick',prevent,{passive:false});\n    document.addEventListener('wheel',function(e){ if(e.ctrlKey) e.preventDefault(); },{passive:false});\n    document.addEventListener('touchmove',function(e){ if(e.scale && e.scale !== 1) e.preventDefault(); },{passive:false});\n    document.addEventListener('selectstart',prevent,{passive:false,capture:true});\n    document.addEventListener('contextmenu',prevent,{passive:false,capture:true});\n    document.addEventListener('copy',prevent,{passive:false,capture:true});\n    document.addEventListener('cut',prevent,{passive:false,capture:true});\n    document.addEventListener('paste',prevent,{passive:false,capture:true});\n    document.addEventListener('dragstart',prevent,{passive:false,capture:true});\n    // Belt-and-suspenders: aggressively clear any attempted selection\n    var clearSel=function(){\n      try{var sel=window.getSelection&&window.getSelection(); if(sel&&sel.removeAllRanges) sel.removeAllRanges();}catch(_){} }\n    document.addEventListener('selectionchange',clearSel,{passive:true,capture:true});\n    document.onselectstart=function(){ clearSel(); return false; };\n    try{ document.documentElement.style.webkitUserSelect='none'; document.documentElement.style.userSelect='none'; }catch(_){ }\n    try{ document.body.style.webkitUserSelect='none'; document.body.style.userSelect='none'; }catch(_){ }\n    var __selTimer = setInterval(clearSel, 160);\n    window.addEventListener('pagehide',function(){ try{ clearInterval(__selTimer); }catch(_){} });\n    // Continuously enforce no-select on all elements and new nodes\n    var enforceNoSelect = function(el){\n      try{\n        el.style && (el.style.webkitUserSelect='none', el.style.userSelect='none', el.style.webkitTouchCallout='none');\n        el.setAttribute && (el.setAttribute('unselectable','on'), el.setAttribute('contenteditable','false'));\n      }catch(_){}\n    }\n    try{\n      var all=document.getElementsByTagName('*');\n      for(var i=0;i<all.length;i++){ enforceNoSelect(all[i]); }\n      var obs = new MutationObserver(function(muts){\n        for(var j=0;j<muts.length;j++){\n          var m=muts[j];\n          if(m.type==='childList'){\n            m.addedNodes && m.addedNodes.forEach && m.addedNodes.forEach(function(n){ if(n && n.nodeType===1){ enforceNoSelect(n); var q=n.getElementsByTagName? n.getElementsByTagName('*'): []; for(var k=0;k<q.length;k++){ enforceNoSelect(q[k]); }}});\n          } else if(m.type==='attributes'){\n            enforceNoSelect(m.target);\n          }\n        }\n      });\n      obs.observe(document.documentElement,{ childList:true, subtree:true, attributes:true, attributeFilter:['contenteditable','style'] });\n    }catch(_){ }\n  } catch(_) {}\n})(); true;\n";
export declare const injectedNoSelect = "\n(function(){\n  try {\n    if (window.__rkNoSelectApplied) return true;\n    window.__rkNoSelectApplied = true;\n    var style = document.getElementById('rk-no-select-style');\n    if (!style) {\n      style = document.createElement('style');\n      style.id = 'rk-no-select-style';\n      style.innerHTML = \"\n        * {\n          user-select: none !important;\n          -webkit-user-select: none !important;\n          -webkit-touch-callout: none !important;\n        }\n        ::selection {\n          background: transparent !important;\n        }\n      \";\n      document.head.appendChild(style);\n    }\n    var prevent = function(e){ if(e && e.preventDefault) e.preventDefault(); return false; };\n    document.addEventListener('contextmenu', prevent, { passive: false, capture: true });\n    document.addEventListener('selectstart', prevent, { passive: false, capture: true });\n  } catch (_) {}\n  true;\n})();\n";
export type ScreenPayload = {
    id: string;
    html: string;
    css?: string;
    js?: string;
};
export declare function showRampkitOverlay(opts: {
    onboardingId: string;
    screens: ScreenPayload[];
    variables?: Record<string, any>;
    requiredScripts?: string[];
    onClose?: () => void;
    onOnboardingFinished?: (payload?: any) => void;
    onShowPaywall?: (payload?: any) => void;
    onScreenChange?: (screenIndex: number, screenId: string) => void;
    onOnboardingAbandoned?: (reason: string, lastScreenIndex: number, lastScreenId: string) => void;
    onNotificationPermissionRequested?: () => void;
    onNotificationPermissionResult?: (granted: boolean) => void;
}): void;
export declare function hideRampkitOverlay(): void;
export declare function closeRampkitOverlay(): void;
export declare function preloadRampkitOverlay(opts: {
    onboardingId: string;
    screens: ScreenPayload[];
    variables?: Record<string, any>;
    requiredScripts?: string[];
}): void;
declare function Overlay(props: {
    onboardingId: string;
    screens: ScreenPayload[];
    variables?: Record<string, any>;
    requiredScripts?: string[];
    prebuiltDocs?: string[];
    onRequestClose: () => void;
    onOnboardingFinished?: (payload?: any) => void;
    onShowPaywall?: (payload?: any) => void;
    onRegisterClose?: (handler: (() => void) | null) => void;
    onScreenChange?: (screenIndex: number, screenId: string) => void;
    onOnboardingAbandoned?: (reason: string, lastScreenIndex: number, lastScreenId: string) => void;
    onNotificationPermissionRequested?: () => void;
    onNotificationPermissionResult?: (granted: boolean) => void;
}): any;
export default Overlay;
