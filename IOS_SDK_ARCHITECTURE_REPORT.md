# RampKit iOS SDK - Architecture & Implementation Report

**To:** iOS SDK Engineering Team  
**From:** React Native/Expo SDK Analysis  
**Date:** November 27, 2025  
**Subject:** Comprehensive SDK Structure Analysis for iOS Implementation

---

## Executive Summary

This document provides a complete architectural breakdown of the RampKit Expo/React Native SDK to serve as the reference blueprint for building the native iOS SDK. The iOS SDK should mirror this structure, patterns, and behaviors to ensure consistency across platforms.

**Core Mission:** RampKit enables dynamic, remotely-configurable onboarding flows that update without app releases. The SDK fetches onboarding configurations from a CDN, renders them using native components (WebViews in React Native, should be WKWebView on iOS), and provides rich bi-directional communication between the native host and web content.

---

## Table of Contents

1. [Overall Architecture](#1-overall-architecture)
2. [Module Structure](#2-module-structure)
3. [Public API Surface](#3-public-api-surface)
4. [Initialization Flow](#4-initialization-flow)
5. [Data Models & Schema](#5-data-models--schema)
6. [Presentation Layer](#6-presentation-layer)
7. [Event & Message Protocol](#7-event--message-protocol)
8. [Native Platform Integrations](#8-native-platform-integrations)
9. [State Management & Variables](#9-state-management--variables)
10. [Performance Optimizations](#10-performance-optimizations)
11. [Error Handling Strategy](#11-error-handling-strategy)
12. [Naming Conventions](#12-naming-conventions)
13. [iOS Implementation Guidelines](#13-ios-implementation-guidelines)
14. [File Structure Recommendation](#14-file-structure-recommendation)

---

## 1. Overall Architecture

### 1.1 High-Level Design Pattern

The SDK follows a **Singleton pattern** with a **modular architecture**:

```
┌─────────────────────────────────────────────────┐
│           RampKit (Singleton Instance)          │
│                                                 │
│  ┌────────────┐  ┌────────────┐  ┌──────────┐ │
│  │  RampKit   │  │  UserId    │  │ Overlay  │ │
│  │    Core    │  │  Manager   │  │  Engine  │ │
│  └────────────┘  └────────────┘  └──────────┘ │
└─────────────────────────────────────────────────┘
         ▲                   ▲                ▲
         │                   │                │
    ┌────┴─────┐      ┌──────┴──────┐   ┌────┴─────┐
    │ Network  │      │   Secure    │   │  WebView │
    │ Fetcher  │      │   Storage   │   │  Bridge  │
    └──────────┘      └─────────────┘   └──────────┘
```

### 1.2 Core Principles

1. **Singleton Access**: One global instance accessed via static property
2. **Async Initialization**: Non-blocking init that fetches remote config
3. **Lazy Loading**: Resources loaded on-demand, with optional preloading
4. **Separation of Concerns**: Core logic, UI rendering, and storage are decoupled
5. **Event-Driven Communication**: WebView ↔ Native bridge via message passing

---

## 2. Module Structure

The SDK is composed of **three primary modules**:

### 2.1 RampKitCore (RampKit.ts)

**Purpose:** Central coordinator, API gateway, lifecycle manager

**Responsibilities:**
- Exposes public SDK interface
- Manages configuration state
- Fetches onboarding data from CDN
- Orchestrates overlay presentation
- Handles callbacks (onOnboardingFinished, onShowPaywall)

**Key Properties:**
```typescript
private static _instance: RampKitCore
private config: any = {}
private onboardingData: any = null
private userId: string | null = null
private onOnboardingFinished?: (payload?: any) => void
private onShowPaywall?: (payload?: any) => void
private static readonly ONBOARDING_URL = "https://dqplcvw3fzili.cloudfront.net/labelaiOnboarding.json"
```

**Key Methods:**
```typescript
static get instance(): RampKitCore
async init(config): Promise<void>
getOnboardingData(): any
getUserId(): string | null
showOnboarding(opts?): void
closeOnboarding(): void
```

**iOS Equivalent:**
```swift
// RampKitCore.swift
class RampKitCore {
    static let shared = RampKitCore()
    private var config: RampKitConfig?
    private var onboardingData: OnboardingData?
    private var userId: String?
    private var onOnboardingFinished: ((Any?) -> Void)?
    private var onShowPaywall: ((Any?) -> Void)?
    private static let onboardingURL = "https://dqplcvw3fzili.cloudfront.net/labelaiOnboarding.json"
    
    func initialize(config: RampKitConfig) async
    func getOnboardingData() -> OnboardingData?
    func getUserId() -> String?
    func showOnboarding(options: ShowOnboardingOptions?)
    func closeOnboarding()
}
```

---

### 2.2 UserId Manager (userId.ts)

**Purpose:** Generate and persist a stable, encrypted user identifier

**Responsibilities:**
- Generate UUID v4 using cryptographically secure random bytes
- Store in secure/encrypted storage (Expo SecureStore → iOS Keychain)
- Retrieve existing ID or create new one
- Provide fallback for random generation if crypto fails

**Key Constants:**
```typescript
export const RAMPKIT_USER_ID_KEY = "rk_user_id"
```

**Key Functions:**
```typescript
export async function getRampKitUserId(): Promise<string>
async function generateUuidV4(): Promise<string>
```

**Implementation Details:**
- Uses `expo-crypto` for random bytes (iOS should use `SecRandomCopyBytes`)
- Stores in `expo-secure-store` (iOS should use Keychain)
- UUID v4 format: Sets version bits (0x40) and variant bits (0x80)
- Format: `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`
- Fallback to Math.random if crypto unavailable (should be avoided on iOS)

**iOS Equivalent:**
```swift
// RampKitUserId.swift
class RampKitUserId {
    static let userIdKey = "rk_user_id"
    
    static func getRampKitUserId() async -> String {
        // Check Keychain for existing ID
        // If not found, generate new UUID v4
        // Store in Keychain
        // Return ID
    }
    
    private static func generateUuidV4() -> String {
        // Use SecRandomCopyBytes for cryptographic randomness
        // Format as UUID v4 string
    }
}
```

---

### 2.3 RampkitOverlay (RampkitOverlay.tsx)

**Purpose:** Full-screen overlay UI that renders onboarding screens

**Responsibilities:**
- Render multi-page onboarding using WebViews
- Handle page navigation (forward, back, jump-to)
- Manage animations and transitions
- Bridge messages between WebView content and native code
- Handle hardware back button (Android)
- Inject security hardening scripts
- Manage shared variables across pages
- Handle native integrations (haptics, notifications, store review)

**Key Functions:**
```typescript
export function showRampkitOverlay(opts): void
export function hideRampkitOverlay(): void
export function closeRampkitOverlay(): void
export function preloadRampkitOverlay(opts): void
```

**Component Architecture:**
```typescript
// Main overlay component (internal)
function Overlay(props: {
  onboardingId: string
  screens: ScreenPayload[]
  variables?: Record<string, any>
  requiredScripts?: string[]
  prebuiltDocs?: string[]
  onRequestClose: () => void
  onOnboardingFinished?: (payload?: any) => void
  onShowPaywall?: (payload?: any) => void
  onRegisterClose?: (handler: (() => void) | null) => void
}): JSX.Element
```

**iOS Equivalent:**
```swift
// RampKitOverlayController.swift
class RampKitOverlayController: UIViewController {
    var onboardingId: String
    var screens: [ScreenPayload]
    var variables: [String: Any]
    var requiredScripts: [String]
    var onRequestClose: (() -> Void)?
    var onOnboardingFinished: ((Any?) -> Void)?
    var onShowPaywall: ((Any?) -> Void)?
    
    // Use UIPageViewController or custom paging
    private var pageViewController: UIPageViewController
    private var webViewControllers: [WKWebView]
    private var sharedVariables: [String: Any]
    
    func showOverlay()
    func hideOverlay()
    func closeOverlay()
    static func preloadOverlay(options: PreloadOptions)
}
```

---

## 3. Public API Surface

### 3.1 Main Export (index.ts)

The SDK exports a **singleton instance** and a **utility function**:

```typescript
import { RampKitCore } from "./RampKit"
export const RampKit = RampKitCore.instance
export { getRampKitUserId } from "./userId"
```

**iOS Equivalent:**
```swift
// RampKit.swift (umbrella file)
public let RampKit = RampKitCore.shared

// Re-export utility
public func getRampKitUserId() async -> String {
    return await RampKitUserId.getRampKitUserId()
}
```

### 3.2 Initialization API

```typescript
await RampKit.init({
  apiKey: string,                              // Required
  environment?: string,                        // Optional: "production" | "staging"
  autoShowOnboarding?: boolean,                // Optional: default false
  onOnboardingFinished?: (payload?: any) => void,  // Optional callback
  onShowPaywall?: (payload?: any) => void,     // Optional callback
  showPaywall?: (payload?: any) => void        // Optional alias for onShowPaywall
})
```

**Configuration Object (iOS):**
```swift
public struct RampKitConfig {
    let apiKey: String
    let environment: String?
    let autoShowOnboarding: Bool?
    let onOnboardingFinished: ((Any?) -> Void)?
    let onShowPaywall: ((Any?) -> Void)?
}
```

### 3.3 Display API

```typescript
// Show onboarding
RampKit.showOnboarding(options?: {
  onShowPaywall?: (payload?: any) => void,
  showPaywall?: (payload?: any) => void
})

// Close onboarding programmatically
RampKit.closeOnboarding()

// Get cached onboarding data
RampKit.getOnboardingData()

// Get generated user ID
RampKit.getUserId()
```

**iOS Methods:**
```swift
public func showOnboarding(options: ShowOnboardingOptions? = nil)
public func closeOnboarding()
public func getOnboardingData() -> OnboardingData?
public func getUserId() -> String?
```

---

## 4. Initialization Flow

### 4.1 Sequence Diagram

```
┌──────┐                  ┌──────────┐                ┌──────────┐                ┌─────────┐
│ App  │                  │ RampKit  │                │  UserId  │                │   CDN   │
└──┬───┘                  └────┬─────┘                └────┬─────┘                └────┬────┘
   │                           │                           │                           │
   │ init(config)              │                           │                           │
   ├──────────────────────────>│                           │                           │
   │                           │                           │                           │
   │                           │ getRampKitUserId()        │                           │
   │                           ├──────────────────────────>│                           │
   │                           │                           │                           │
   │                           │                           │ Check Keychain            │
   │                           │                           ├───────────┐               │
   │                           │                           │           │               │
   │                           │                           │<──────────┘               │
   │                           │                           │                           │
   │                           │ userId                    │                           │
   │                           │<──────────────────────────┤                           │
   │                           │                           │                           │
   │                           │ fetch(ONBOARDING_URL)     │                           │
   │                           ├───────────────────────────────────────────────────────>│
   │                           │                           │                           │
   │                           │ onboarding JSON           │                           │
   │                           │<───────────────────────────────────────────────────────┤
   │                           │                           │                           │
   │                           │ [if autoShowOnboarding]   │                           │
   │                           │ showOnboarding()          │                           │
   │                           ├────────────┐              │                           │
   │                           │            │              │                           │
   │                           │<───────────┘              │                           │
   │ init complete             │                           │                           │
   │<──────────────────────────┤                           │                           │
   │                           │                           │                           │
```

### 4.2 Step-by-Step Process

1. **Configuration Storage**: Store config object, extract callbacks
2. **User ID Resolution**: 
   - Call `getRampKitUserId()`
   - Check secure storage for existing ID
   - Generate new UUID v4 if not found
   - Store in secure storage
   - Return and cache in memory
3. **Onboarding Data Fetch**:
   - Perform HTTP GET to CDN URL
   - Parse JSON response
   - Store in `onboardingData` property
   - Log success/failure
4. **Auto-Show Logic**:
   - If `autoShowOnboarding === true` AND data exists
   - Call `showOnboarding()` immediately
5. **Error Handling**:
   - Never throw/crash on failure
   - Log errors with `[RampKit]` prefix
   - Set `onboardingData = null` on failure
   - Continue execution (graceful degradation)

### 4.3 Logging Convention

All logs use the format: `[RampKit] <Context>: <message>`

Examples:
```
[RampKit] Init: userId abc-123-def
[RampKit] Init: starting onboarding load
[RampKit] Init: onboardingId xyz-789
[RampKit] Init: onboarding loaded
[RampKit] Init: finished
[RampKit] Init: failed to resolve user id
[RampKit] Init: onboarding load failed
[RampKit] Init: auto-show onboarding
```

**iOS Implementation:**
```swift
func log(_ context: String, _ message: String) {
    print("[RampKit] \(context): \(message)")
}
```

---

## 5. Data Models & Schema

### 5.1 Onboarding Data Structure

The CDN returns a JSON object with this structure:

```typescript
{
  onboardingId: string,              // Unique identifier for this onboarding
  screens: ScreenPayload[],          // Array of screen definitions
  variables?: {                      // Optional state variables
    state?: Array<{
      name: string,
      initialValue: any
    }>
  },
  requiredScripts?: string[]         // Array of external script URLs
}
```

### 5.2 ScreenPayload Model

```typescript
type ScreenPayload = {
  id: string,           // Unique screen identifier
  label?: string,       // Human-readable label (fallback)
  html: string,         // HTML content
  css?: string,         // Optional CSS styles
  js?: string           // Optional JavaScript code
}
```

**iOS Model:**
```swift
struct ScreenPayload: Codable {
    let id: String
    let label: String?
    let html: String
    let css: String?
    let js: String?
}

struct OnboardingVariable: Codable {
    let name: String
    let initialValue: AnyCodable  // Use custom Codable wrapper for Any
}

struct OnboardingData: Codable {
    let onboardingId: String
    let screens: [ScreenPayload]
    let variables: VariableContainer?
    let requiredScripts: [String]?
    
    struct VariableContainer: Codable {
        let state: [OnboardingVariable]?
    }
}
```

### 5.3 HTML Document Generation

Each screen is transformed into a full HTML document:

```html
<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"/>
<!-- Preconnect/DNS prefetch for required scripts -->
<link rel="preconnect" href="https://example.com" crossorigin>
<link rel="dns-prefetch" href="//example.com">
<!-- Required external scripts -->
<script src="https://cdn.example.com/library.js"></script>
<!-- Screen CSS -->
<style>
/* screen.css content */
</style>
<!-- Base styles -->
<style>
html,body{margin:0;padding:0;overflow-x:hidden}
*{-webkit-tap-highlight-color: rgba(0,0,0,0);}
::selection{background:transparent}
::-moz-selection{background:transparent}
</style>
</head>
<body>
<!-- Screen HTML -->
<script>
window.__rampkitVariables = {"key": "value"};
/* screen.js content */
</script>
</body>
</html>
```

**Key Points:**
- **Viewport Meta Tag**: Prevents zooming, ensures full-width rendering
- **Preconnect**: Performance optimization for external scripts
- **Variables Injection**: `window.__rampkitVariables` is available to screen JS
- **Base Styles**: Prevents text selection, removes default margins

**iOS Implementation:**
```swift
func buildHTMLDocument(
    screen: ScreenPayload,
    variables: [String: Any],
    requiredScripts: [String]
) -> String {
    let css = screen.css ?? ""
    let html = screen.html ?? ""
    let js = screen.js ?? ""
    
    let scriptsHTML = requiredScripts
        .map { "<script src=\"\($0)\"></script>" }
        .joined(separator: "\n")
    
    let preconnectTags = generatePreconnectTags(from: requiredScripts)
    
    let variablesJSON = try? JSONSerialization.data(
        withJSONObject: variables,
        options: []
    )
    let variablesString = String(data: variablesJSON ?? Data(), encoding: .utf8) ?? "{}"
    
    return """
    <!doctype html>
    <html>
    <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"/>
    \(preconnectTags)
    \(scriptsHTML)
    <style>\(css)</style>
    <style>html,body{margin:0;padding:0;overflow-x:hidden} *{-webkit-tap-highlight-color: rgba(0,0,0,0);} ::selection{background:transparent}::-moz-selection{background:transparent}</style>
    </head>
    <body>
    \(html)
    <script>
    window.__rampkitVariables = \(variablesString);
    \(js)
    </script>
    </body>
    </html>
    """
}
```

---

## 6. Presentation Layer

### 6.1 Overlay Architecture

The overlay is a **full-screen, modal presentation** that:
- Renders above all other content (z-index 9999)
- Uses a paging/swipe interface for navigation (disabled by default)
- Contains one WebView per screen (all loaded, offscreen rendering)
- Supports programmatic page transitions with animations
- Fades in on appearance, fades out on dismissal

**React Native Implementation:**
- Uses `react-native-root-siblings` to mount outside React hierarchy
- Uses `react-native-pager-view` for page management
- Uses `react-native-webview` for content rendering

**iOS Equivalent:**
- Present `UIViewController` modally with `.fullScreen` presentation style
- Use `UIPageViewController` or custom paging container
- Embed `WKWebView` instances for each screen
- Set high `zPosition` or present over window

### 6.2 Page Navigation

**Navigation Modes:**

1. **Fade Transition** (default):
   - Fade curtain to white (160ms, ease-out-quad)
   - Switch page instantly (no animation)
   - Fade curtain back to transparent (160ms, ease-in-quad)

2. **Slide Transition**:
   - Use native page controller's animated transition
   - No fade curtain overlay

3. **Programmatic Jump**:
   - Navigate to specific screen by `id`
   - Navigate to next/previous
   - Navigate to special targets: `__continue__`, `__goBack__`

**iOS Implementation:**
```swift
enum NavigationAnimation {
    case fade
    case slide
}

func navigateToIndex(_ index: Int, animation: NavigationAnimation = .fade) {
    guard index != currentIndex,
          index >= 0,
          index < screens.count,
          !isTransitioning else { return }
    
    if animation == .slide {
        pageViewController.setViewControllers(
            [webViewControllers[index]],
            direction: index > currentIndex ? .forward : .reverse,
            animated: true
        )
    } else {
        // Fade logic
        isTransitioning = true
        UIView.animate(withDuration: 0.16, animations: {
            self.fadeCurtain.alpha = 1
        }) { _ in
            self.pageViewController.setViewControllers(
                [self.webViewControllers[index]],
                direction: .forward,
                animated: false
            )
            UIView.animate(withDuration: 0.16) {
                self.fadeCurtain.alpha = 0
            } completion: { _ in
                self.isTransitioning = false
            }
        }
    }
    currentIndex = index
}
```

### 6.3 Animations

**Overlay Appearance:**
- Initial opacity: 0
- Fade in to opacity 1
- Duration: 220ms
- Easing: cubic ease-out
- Uses native driver (GPU acceleration)

**Overlay Dismissal:**
- Delay: 150ms
- Fade to opacity 0
- Duration: 320ms
- Easing: cubic ease-out
- Call `onRequestClose` on completion

**iOS Implementation:**
```swift
func showOverlay() {
    view.alpha = 0
    UIView.animate(
        withDuration: 0.22,
        delay: 0,
        options: [.curveEaseOut],
        animations: { self.view.alpha = 1 }
    )
}

func dismissOverlay(completion: @escaping () -> Void) {
    UIView.animate(
        withDuration: 0.32,
        delay: 0.15,
        options: [.curveEaseOut],
        animations: { self.view.alpha = 0 }
    ) { _ in
        completion()
    }
}
```

### 6.4 Hardware Back Button (Android-specific)

React Native handles Android back button via `BackHandler`:
- If on first screen: close overlay
- Otherwise: go to previous screen

**iOS Note:** Not applicable, but consider swipe gestures or custom back handling

---

## 7. Event & Message Protocol

### 7.1 Communication Bridge

The SDK uses **bidirectional message passing** between native and WebView:

```
┌─────────────┐                            ┌─────────────┐
│   Native    │ ──── postMessage ────────> │   WebView   │
│    Host     │                            │   Content   │
│             │ <─── injectJavaScript ──── │             │
└─────────────┘                            └─────────────┘
```

**WebView → Native:**
- WebView calls `window.ReactNativeWebView.postMessage(data)`
- Native receives via `onMessage` callback
- Data can be string or JSON

**Native → WebView:**
- Native calls `webView.injectJavaScript(script)`
- Script dispatches custom `MessageEvent` to document
- WebView listens via `document.addEventListener('message', handler)`

### 7.2 Message Types (WebView → Native)

All messages follow this pattern:

**1. String Messages (Legacy/Simple):**
```
"rampkit:tap"
"rampkit:close"
"rampkit:goBack"
"rampkit:review"
"rampkit:request-notification-permission"
"rampkit:show-paywall"
"rampkit:onboarding-finished"
"rampkit:navigate:<screenId>"
"haptic:<type>"
"next"
"continue"
```

**2. JSON Messages (Structured):**
```typescript
// Continue to next screen
{
  type: "rampkit:continue" | "continue",
  animation?: "fade" | "slide"
}

// Navigate to specific screen
{
  type: "rampkit:navigate",
  targetScreenId: string | "__continue__" | "__goBack__",
  animation?: "fade" | "slide"
}

// Go back one screen
{
  type: "rampkit:goBack",
  animation?: "fade" | "slide"
}

// Close overlay
{
  type: "rampkit:close"
}

// Trigger haptic feedback
{
  type: "rampkit:haptic",
  action: "haptic",
  hapticType: "impact" | "notification" | "selection",
  impactStyle?: "Light" | "Medium" | "Heavy" | "Rigid" | "Soft",
  notificationType?: "Success" | "Warning" | "Error"
}

// Request in-app review
{
  type: "rampkit:request-review" | "rampkit:review"
}

// Request notification permission
{
  type: "rampkit:request-notification-permission",
  ios?: {
    allowAlert?: boolean,
    allowBadge?: boolean,
    allowSound?: boolean
  },
  android?: {
    channelId?: string,
    name?: string,
    importance?: "MAX" | "HIGH" | "DEFAULT" | "LOW" | "MIN"
  },
  behavior?: {
    shouldShowBanner?: boolean,
    shouldPlaySound?: boolean
  }
}

// Onboarding finished
{
  type: "rampkit:onboarding-finished",
  payload?: any
}

// Show paywall
{
  type: "rampkit:show-paywall",
  payload?: any
}

// Update variables
{
  type: "rampkit:variables",
  vars: Record<string, any>
}

// Request current variables
{
  type: "rampkit:request-vars"
}
```

### 7.3 Message Handling (Native → WebView)

**Sending Variables to WebView:**
```javascript
// Injected script that dispatches to document
(function(){
  try{
    document.dispatchEvent(
      new MessageEvent('message', {
        data: {"type":"rampkit:variables","vars":{"key":"value"}}
      })
    );
  }catch(e){}
})();
```

**WebView Listener (Example):**
```javascript
document.addEventListener('message', (event) => {
  if (event.data.type === 'rampkit:variables') {
    // Update local state
    window.__rampkitVariables = event.data.vars;
    // Trigger re-render or update
  }
});
```

**iOS Implementation:**
```swift
func buildDispatchScript(_ payload: [String: Any]) -> String {
    let jsonData = try? JSONSerialization.data(withJSONObject: payload)
    let jsonString = String(data: jsonData ?? Data(), encoding: .utf8) ?? "{}"
    let escaped = jsonString
        .replacingOccurrences(of: "\\", with: "\\\\")
        .replacingOccurrences(of: "`", with: "\\`")
    return """
    (function(){
        try{
            document.dispatchEvent(new MessageEvent('message',{data:\(escaped)}));
        }catch(e){}
    })();
    """
}

func sendVariablesToWebView(_ webView: WKWebView, index: Int) {
    let payload: [String: Any] = [
        "type": "rampkit:variables",
        "vars": sharedVariables
    ]
    let script = buildDispatchScript(payload)
    webView.evaluateJavaScript(script)
}
```

---

## 8. Native Platform Integrations

### 8.1 Haptic Feedback

**React Native:** Uses `expo-haptics`

**Types:**
1. **Impact**: `Light`, `Medium`, `Heavy`, `Rigid`, `Soft`
2. **Notification**: `Success`, `Warning`, `Error`
3. **Selection**: Single selection tick

**iOS Implementation:**
```swift
import UIKit

func performHaptic(event: HapticEvent) {
    switch event.hapticType {
    case .impact:
        let style: UIImpactFeedbackGenerator.FeedbackStyle
        switch event.impactStyle {
        case .light: style = .light
        case .medium: style = .medium
        case .heavy: style = .heavy
        case .rigid: style = .rigid
        case .soft: style = .soft
        default: style = .medium
        }
        let generator = UIImpactFeedbackGenerator(style: style)
        generator.impactOccurred()
        
    case .notification:
        let type: UINotificationFeedbackGenerator.FeedbackType
        switch event.notificationType {
        case .success: type = .success
        case .warning: type = .warning
        case .error: type = .error
        default: type = .success
        }
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(type)
        
    case .selection:
        let generator = UISelectionFeedbackGenerator()
        generator.selectionChanged()
    }
}
```

### 8.2 In-App Review

**React Native:** Uses `expo-store-review`

**Flow:**
1. Check if review prompt is available (`StoreReview.isAvailableAsync()`)
2. Check if user has action capability (`StoreReview.hasAction()`)
3. If available, show native prompt (`StoreReview.requestReview()`)
4. Otherwise, open App Store URL with review action

**iOS Implementation:**
```swift
import StoreKit

func requestReview() {
    if #available(iOS 14.0, *) {
        if let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene {
            SKStoreReviewController.requestReview(in: scene)
        }
    } else {
        // Fallback: Open App Store URL
        if let appID = "YOUR_APP_ID",
           let url = URL(string: "https://apps.apple.com/app/id\(appID)?action=write-review") {
            UIApplication.shared.open(url)
        }
    }
}
```

### 8.3 Notification Permissions

**React Native:** Uses `expo-notifications`

**Features:**
- Request notification permissions with granular control (iOS)
- Configure notification channels (Android)
- Set foreground notification behavior
- Return permission status to WebView

**iOS Implementation:**
```swift
import UserNotifications

func requestNotificationPermission(
    options: NotificationPermissionOptions,
    completion: @escaping (NotificationPermissionResult) -> Void
) {
    let authOptions: UNAuthorizationOptions = [
        options.allowAlert ? .alert : [],
        options.allowBadge ? .badge : [],
        options.allowSound ? .sound : []
    ].reduce([], { $0.union($1) })
    
    UNUserNotificationCenter.current()
        .requestAuthorization(options: authOptions) { granted, error in
            let result = NotificationPermissionResult(
                granted: granted,
                status: granted ? "granted" : "denied",
                canAskAgain: !granted,
                error: error != nil
            )
            
            // Broadcast to all WebViews
            self.sharedVariables["notificationsPermission"] = [
                "granted": granted,
                "status": result.status,
                "canAskAgain": result.canAskAgain
            ]
            self.broadcastVariables()
            
            completion(result)
        }
}
```

### 8.4 External Link Handling

**React Native:** Uses `Linking.openURL()`

**iOS:** Use `UIApplication.shared.open(url)`

---

## 9. State Management & Variables

### 9.1 Shared Variables System

The SDK maintains a **shared variables dictionary** that:
- Persists across all screens in the onboarding flow
- Is synchronized between WebViews and native code
- Is initialized from the `variables.state` array in onboarding data
- Can be updated by any screen and broadcasts to all screens

**Flow:**
```
Initialize vars from onboardingData.variables.state
          ↓
    Send to WebView on load
          ↓
    WebView sends updates back
          ↓
   Merge into shared vars
          ↓
   Broadcast to all WebViews
```

### 9.2 Variable Initialization

```typescript
const variables = (() => {
  try {
    const stateArr = (data.variables && data.variables.state) || []
    const mapped: Record<string, any> = {}
    stateArr.forEach((v: any) => {
      if (v && v.name) mapped[v.name] = v.initialValue
    })
    return mapped
  } catch (_) {
    return {} as Record<string, any>
  }
})()
```

**iOS Implementation:**
```swift
func initializeVariables(from data: OnboardingData) -> [String: Any] {
    var variables: [String: Any] = [:]
    if let stateArray = data.variables?.state {
        for variable in stateArray {
            variables[variable.name] = variable.initialValue
        }
    }
    return variables
}
```

### 9.3 Variable Update & Broadcast

**Stale Value Filtering:**
- Track timestamp of last initialization send per WebView
- If WebView sends variables within 600ms of init, ignore values that differ from host
- Prevents old default values from overwriting fresh host values

**Broadcasting:**
```swift
func broadcastVariables() {
    let payload: [String: Any] = [
        "type": "rampkit:variables",
        "vars": sharedVariables
    ]
    let script = buildDispatchScript(payload)
    
    for webView in webViewControllers {
        webView.evaluateJavaScript(script)
    }
}
```

### 9.4 Special Variables

**Notification Permission Status:**
After requesting permissions, add to shared vars:
```swift
sharedVariables["notificationsPermission"] = [
    "granted": true/false,
    "status": "granted" | "denied" | "undetermined",
    "canAskAgain": true/false,
    "expires": "never" | timestamp
]
```

---

## 10. Performance Optimizations

### 10.1 Preloading Strategy

**Purpose:** Warm up WebView engine and cache HTML before showing overlay

**Implementation:**
1. **Cache HTML Documents**: Build all HTML strings in advance, store in Map
2. **Hidden WebView Preloader**: Mount invisible 1x1 WebView with first screen HTML
3. **Cache Key**: Use `onboardingId` as cache key
4. **Lifecycle**: Destroy preloader when overlay is shown

**React Native Code:**
```typescript
const preloadCache = new Map<string, string[]>()

export function preloadRampkitOverlay(opts: {
  onboardingId: string
  screens: ScreenPayload[]
  variables?: Record<string, any>
  requiredScripts?: string[]
}) {
  if (preloadCache.has(opts.onboardingId)) return
  
  const docs = opts.screens.map(s => 
    buildHtmlDocument(s, opts.variables, opts.requiredScripts)
  )
  preloadCache.set(opts.onboardingId, docs)
  
  // Mount hidden WebView
  const HiddenPreloader = () => (
    <View style={{position: 'absolute', width: 1, height: 1, opacity: 0, top: -1000}}>
      <WebView source={{html: docs[0]}} ... />
    </View>
  )
  preloadSibling = new RootSiblings(<HiddenPreloader />)
}
```

**iOS Implementation:**
```swift
private static var preloadCache: [String: [String]] = [:]
private static var preloadWebView: WKWebView?

static func preloadOverlay(options: PreloadOptions) {
    guard preloadCache[options.onboardingId] == nil else { return }
    
    let docs = options.screens.map { screen in
        buildHTMLDocument(
            screen: screen,
            variables: options.variables,
            requiredScripts: options.requiredScripts
        )
    }
    preloadCache[options.onboardingId] = docs
    
    // Create hidden WebView
    let config = WKWebViewConfiguration()
    let webView = WKWebView(frame: CGRect(x: -1000, y: -1000, width: 1, height: 1), configuration: config)
    webView.alpha = 0
    webView.loadHTMLString(docs[0], baseURL: nil)
    
    // Add to window (hidden)
    if let window = UIApplication.shared.windows.first {
        window.addSubview(webView)
        preloadWebView = webView
    }
}
```

### 10.2 Preconnect & DNS Prefetch

Extract origins from `requiredScripts` URLs and add to `<head>`:

```html
<link rel="preconnect" href="https://cdn.example.com" crossorigin>
<link rel="dns-prefetch" href="//cdn.example.com">
```

**Purpose:** Resolve DNS and establish connections before scripts are requested

**iOS Implementation:**
```swift
func generatePreconnectTags(from scripts: [String]) -> String {
    let origins = Set(scripts.compactMap { urlString -> (origin: String, host: String)? in
        guard let url = URL(string: urlString),
              let host = url.host else { return nil }
        let origin = "\(url.scheme ?? "https")://\(host)"
        return (origin, host)
    })
    
    let preconnect = origins.map { 
        "<link rel=\"preconnect\" href=\"\($0.origin)\" crossorigin>" 
    }.joined(separator: "\n")
    
    let dnsPrefetch = origins.map { 
        "<link rel=\"dns-prefetch\" href=\"//\($0.host)\">" 
    }.joined(separator: "\n")
    
    return "\(preconnect)\n\(dnsPrefetch)"
}
```

### 10.3 Offscreen WebView Rendering

All WebViews are created upfront but only the current one is visible:

**React Native:** Uses `PagerView` with `offscreenPageLimit={screens.length}`

**iOS:** Create all WKWebView instances, add to page controller's view hierarchy

**Benefits:**
- Instant page switches (already loaded)
- Smooth animations (no loading delay)
- Variables can be sent to all pages simultaneously

**Tradeoff:** Higher initial memory usage, but acceptable for 3-7 screen flows

---

## 11. Error Handling Strategy

### 11.1 Principles

1. **Never Crash**: All errors are caught and logged
2. **Graceful Degradation**: Continue execution even if features fail
3. **Silent Failures**: User-facing errors are logged but not displayed (unless critical)
4. **Defensive Coding**: Check for null/undefined, use optional chaining, wrap in try-catch

### 11.2 Error Handling Patterns

**Initialization:**
```typescript
try {
  this.userId = await getRampKitUserId()
  console.log("[RampKit] Init: userId", this.userId)
} catch (e) {
  console.log("[RampKit] Init: failed to resolve user id", e)
  // Continue without userId
}
```

**Network Fetch:**
```typescript
try {
  const response = await fetch(ONBOARDING_URL)
  const json = await response.json()
  this.onboardingData = json
  console.log("[RampKit] Init: onboarding loaded")
} catch (error) {
  console.log("[RampKit] Init: onboarding load failed", error)
  this.onboardingData = null
  // Continue without data
}
```

**Callback Invocation:**
```typescript
try {
  this.onOnboardingFinished?.(payload)
} catch (_) {
  // Silently ignore callback errors
}
```

**iOS Implementation:**
```swift
do {
    self.userId = try await getRampKitUserId()
    log("Init", "userId \(self.userId ?? "nil")")
} catch {
    log("Init", "failed to resolve user id: \(error)")
}

do {
    let (data, _) = try await URLSession.shared.data(from: onboardingURL)
    self.onboardingData = try JSONDecoder().decode(OnboardingData.self, from: data)
    log("Init", "onboarding loaded")
} catch {
    log("Init", "onboarding load failed: \(error)")
    self.onboardingData = nil
}

do {
    try onOnboardingFinished?(payload)
} catch {
    // Ignore
}
```

### 11.3 WebView Error Handling

**React Native:**
```typescript
onError={(e: any) => {
  console.warn("WebView error:", e.nativeEvent)
  // Don't block UI, just log
}}
```

**iOS:**
```swift
func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
    print("[RampKit] WebView error: \(error)")
}

func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
    print("[RampKit] WebView provisional navigation error: \(error)")
}
```

---

## 12. Naming Conventions

### 12.1 Class & Type Names

**Pattern:** PascalCase with "RampKit" prefix

Examples:
- `RampKitCore`
- `RampKitOverlayController`
- `RampKitUserId`
- `ScreenPayload`
- `OnboardingData`

### 12.2 Function & Method Names

**Pattern:** camelCase, descriptive verbs

Examples:
- `init(config:)`
- `showOnboarding(options:)`
- `closeOnboarding()`
- `getRampKitUserId()`
- `buildHTMLDocument(screen:variables:requiredScripts:)`
- `navigateToIndex(_:animation:)`
- `performHaptic(event:)`

### 12.3 Property Names

**Pattern:** camelCase

Examples:
- `onboardingData`
- `userId`
- `sharedVariables`
- `currentIndex`
- `isTransitioning`

### 12.4 Constants

**Pattern:** SCREAMING_SNAKE_CASE (static/global) or camelCase (local)

Examples:
- `ONBOARDING_URL`
- `RAMPKIT_USER_ID_KEY`

**iOS Preference:** Use `static let` with camelCase for Swift style
```swift
static let onboardingURL = "https://..."
static let userIdKey = "rk_user_id"
```

### 12.5 Message Type Prefixes

All message types use `"rampkit:"` prefix (except legacy aliases):

Examples:
- `"rampkit:navigate"`
- `"rampkit:haptic"`
- `"rampkit:close"`
- `"rampkit:variables"`
- `"rampkit:request-notification-permission"`

### 12.6 Log Format

**Pattern:** `[RampKit] <Context>: <message>`

Examples:
- `[RampKit] Init: starting onboarding load`
- `[Rampkit] ShowOnboarding: no onboarding data available`
- `[Rampkit] Overlay mounted: docs= 3`
- `[Rampkit] sendVarsToWebView 0 {key: value}`

**Note:** Some logs use `[Rampkit]` (lowercase 'k') - standardize to `[RampKit]` in iOS

---

## 13. iOS Implementation Guidelines

### 13.1 Language & Frameworks

- **Language:** Swift 5.9+
- **Minimum iOS Version:** iOS 14.0+ (for StoreKit review APIs)
- **Key Frameworks:**
  - `UIKit` (UIViewController, UIPageViewController)
  - `WebKit` (WKWebView, WKWebViewConfiguration, WKScriptMessageHandler)
  - `Security` (Keychain access for user ID)
  - `UserNotifications` (permission requests)
  - `StoreKit` (in-app review)

### 13.2 Singleton Pattern

```swift
public class RampKitCore {
    public static let shared = RampKitCore()
    
    private init() {
        // Private initializer to enforce singleton
    }
}

// Usage
RampKit.initialize(config: config)
```

### 13.3 Async/Await

Use Swift's modern concurrency:

```swift
public func initialize(config: RampKitConfig) async {
    self.config = config
    self.userId = await RampKitUserId.getRampKitUserId()
    
    do {
        let url = URL(string: Self.onboardingURL)!
        let (data, _) = try await URLSession.shared.data(from: url)
        self.onboardingData = try JSONDecoder().decode(OnboardingData.self, from: data)
    } catch {
        log("Init", "onboarding load failed: \(error)")
    }
    
    if config.autoShowOnboarding == true, onboardingData != nil {
        showOnboarding()
    }
}
```

### 13.4 Keychain Storage

Use iOS Keychain for secure user ID storage:

```swift
import Security

class KeychainHelper {
    static func save(key: String, value: String) throws {
        let data = value.data(using: .utf8)!
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock
        ]
        
        SecItemDelete(query as CFDictionary) // Delete existing
        let status = SecItemAdd(query as CFDictionary, nil)
        guard status == errSecSuccess else {
            throw KeychainError.saveFailed
        }
    }
    
    static func retrieve(key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true
        ]
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess,
              let data = result as? Data,
              let string = String(data: data, encoding: .utf8) else {
            return nil
        }
        return string
    }
}
```

### 13.5 WKWebView Configuration

**Security & Performance:**

```swift
func createWebViewConfiguration() -> WKWebViewConfiguration {
    let config = WKWebViewConfiguration()
    
    // Enable JavaScript
    config.preferences.javaScriptEnabled = true
    
    // Allow inline media playback
    config.allowsInlineMediaPlayback = true
    config.mediaTypesRequiringUserActionForPlayback = []
    
    // Disable data detectors
    config.dataDetectorTypes = []
    
    // Add message handler for postMessage
    config.userContentController.add(self, name: "rampkit")
    
    // Inject hardening script before content loads
    let hardeningScript = WKUserScript(
        source: injectedHardeningScript,
        injectionTime: .atDocumentStart,
        forMainFrameOnly: true
    )
    config.userContentController.addUserScript(hardeningScript)
    
    return config
}
```

### 13.6 Message Handler

```swift
extension RampKitOverlayController: WKScriptMessageHandler {
    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard let webView = message.webView,
              let index = webViewControllers.firstIndex(of: webView) else {
            return
        }
        
        let body = message.body
        
        // Try JSON parsing first
        if let jsonString = body as? String,
           let data = jsonString.data(using: .utf8),
           let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            handleJSONMessage(json, fromIndex: index)
        } else if let string = body as? String {
            handleStringMessage(string, fromIndex: index)
        }
    }
}
```

### 13.7 HTML Injection

**Change postMessage Target:**
Instead of `window.ReactNativeWebView.postMessage()`, use:

```javascript
window.webkit.messageHandlers.rampkit.postMessage(data)
```

**Update Fallback HTML:**
```typescript
// In buildHtmlDocument, change:
`<button onclick=\"window.webkit.messageHandlers.rampkit.postMessage('rampkit:tap')\">Continue</button>`
```

### 13.8 Presentation Style

```swift
func showOverlay() {
    let overlayVC = RampKitOverlayController(
        onboardingId: onboardingData.onboardingId,
        screens: onboardingData.screens,
        variables: variables,
        requiredScripts: onboardingData.requiredScripts ?? []
    )
    
    overlayVC.modalPresentationStyle = .fullScreen
    overlayVC.modalTransitionStyle = .crossDissolve
    
    if let rootVC = UIApplication.shared.windows.first?.rootViewController {
        rootVC.present(overlayVC, animated: true)
    }
}
```

---

## 14. File Structure Recommendation

```
RampKit/
├── RampKit.swift                     // Umbrella/public API, re-exports
├── RampKitCore.swift                 // Core singleton class
├── RampKitUserId.swift               // User ID generation/storage
├── RampKitOverlayController.swift    // Main overlay view controller
├── Models/
│   ├── RampKitConfig.swift           // Configuration struct
│   ├── OnboardingData.swift          // Codable data models
│   ├── ScreenPayload.swift
│   ├── ShowOnboardingOptions.swift
│   └── HapticEvent.swift
├── Utilities/
│   ├── KeychainHelper.swift          // Keychain wrapper
│   ├── HTMLBuilder.swift             // HTML document generation
│   └── Logger.swift                  // Centralized logging
├── WebView/
│   ├── RampKitWebViewController.swift // Individual screen view controller
│   ├── MessageHandler.swift          // WKScriptMessageHandler implementation
│   └── JavaScriptBridge.swift        // Script injection utilities
├── Integrations/
│   ├── HapticManager.swift           // Haptic feedback
│   ├── StoreReviewManager.swift      // In-app review
│   └── NotificationManager.swift     // Permission requests
└── Resources/
    ├── InjectedScripts.swift         // Hardening & no-select scripts
    └── Info.plist                    // Framework metadata
```

---

## 15. Security Hardening Scripts

### 15.1 Injected Hardening Script

**Purpose:** Prevent text selection, zooming, context menus, copy/paste

**React Native Implementation:**
Injected before content loads via `injectedJavaScriptBeforeContentLoaded`

**Full Script (1,700+ characters):**
See `exports.injectedHardening` in RampkitOverlay.tsx (lines 13-68)

**Key Features:**
- Disable user selection (CSS + DOM manipulation)
- Prevent pinch zoom and gestures
- Disable context menu, copy, cut, paste, drag
- Clear any selection every 160ms
- Use MutationObserver to enforce on dynamically added elements
- Set viewport meta tag to prevent zooming

**iOS Implementation:**
```swift
let injectedHardeningScript = """
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
    
    var clearSel=function(){
      try{var sel=window.getSelection&&window.getSelection(); if(sel&&sel.removeAllRanges) sel.removeAllRanges();}catch(_){} };
    document.addEventListener('selectionchange',clearSel,{passive:true,capture:true});
    document.onselectstart=function(){ clearSel(); return false; };
    
    try{ document.documentElement.style.webkitUserSelect='none'; document.documentElement.style.userSelect='none'; }catch(_){ }
    try{ document.body.style.webkitUserSelect='none'; document.body.style.userSelect='none'; }catch(_){ }
    
    var __selTimer = setInterval(clearSel, 160);
    window.addEventListener('pagehide',function(){ try{ clearInterval(__selTimer); }catch(_){} });
    
    var enforceNoSelect = function(el){
      try{
        el.style && (el.style.webkitUserSelect='none', el.style.userSelect='none', el.style.webkitTouchCallout='none');
        el.setAttribute && (el.setAttribute('unselectable','on'), el.setAttribute('contenteditable','false'));
      }catch(_){}
    };
    
    try{
      var all=document.getElementsByTagName('*');
      for(var i=0;i<all.length;i++){ enforceNoSelect(all[i]); }
      
      var obs = new MutationObserver(function(muts){
        for(var j=0;j<muts.length;j++){
          var m=muts[j];
          if(m.type==='childList'){
            m.addedNodes && m.addedNodes.forEach && m.addedNodes.forEach(function(n){ 
              if(n && n.nodeType===1){ 
                enforceNoSelect(n); 
                var q=n.getElementsByTagName? n.getElementsByTagName('*'): []; 
                for(var k=0;k<q.length;k++){ enforceNoSelect(q[k]); }
              }
            });
          } else if(m.type==='attributes'){
            enforceNoSelect(m.target);
          }
        }
      });
      obs.observe(document.documentElement,{ childList:true, subtree:true, attributes:true, attributeFilter:['contenteditable','style'] });
    }catch(_){ }
  } catch(_) {}
})(); true;
"""
```

### 15.2 Injected No-Select Script

**Purpose:** Lightweight, idempotent selection prevention (injected after load)

**React Native Implementation:**
Injected after content loads via `injectedJavaScript`

**Full Script:**
See `exports.injectedNoSelect` in RampkitOverlay.tsx (lines 71-89)

**iOS Implementation:**
```swift
let injectedNoSelectScript = """
(function(){
  try {
    if (window.__rkNoSelectApplied) return true;
    window.__rkNoSelectApplied = true;
    
    var style = document.getElementById('rk-no-select-style');
    if (!style) {
      style = document.createElement('style');
      style.id = 'rk-no-select-style';
      style.innerHTML = "\\n        * {\\n          user-select: none !important;\\n          -webkit-user-select: none !important;\\n          -webkit-touch-callout: none !important;\\n        }\\n        ::selection {\\n          background: transparent !important;\\n        }\\n      ";
      document.head.appendChild(style);
    }
    
    var prevent = function(e){ if(e && e.preventDefault) e.preventDefault(); return false; };
    document.addEventListener('contextmenu', prevent, { passive: false, capture: true });
    document.addEventListener('selectstart', prevent, { passive: false, capture: true });
  } catch (_) {}
  true;
})();
"""
```

---

## 16. Developer Experience Considerations

### 16.1 Console Logging

**Enable detailed logs in debug builds:**
```swift
#if DEBUG
private let debugLoggingEnabled = true
#else
private let debugLoggingEnabled = false
#endif

func log(_ context: String, _ message: String) {
    if debugLoggingEnabled {
        print("[RampKit] \(context): \(message)")
    }
}
```

### 16.2 Testing Utilities

**Provide test mode for debugging:**
```swift
public struct RampKitConfig {
    ...
    let testMode: Bool? // Load mock data instead of CDN
    let customOnboardingURL: String? // Override CDN URL for staging
}
```

### 16.3 SwiftUI Support (Optional)

**Wrapper for SwiftUI:**
```swift
import SwiftUI

struct RampKitView: UIViewControllerRepresentable {
    let onboardingId: String
    let screens: [ScreenPayload]
    let onDismiss: () -> Void
    
    func makeUIViewController(context: Context) -> RampKitOverlayController {
        RampKitOverlayController(
            onboardingId: onboardingId,
            screens: screens,
            onRequestClose: onDismiss
        )
    }
    
    func updateUIViewController(_ uiViewController: RampKitOverlayController, context: Context) {}
}
```

---

## 17. Versioning & Distribution

### 17.1 Semantic Versioning

Follow same versioning as React Native SDK:
- Current: `0.0.18`
- Pattern: `MAJOR.MINOR.PATCH`
- Increment PATCH for bug fixes
- Increment MINOR for new features
- Increment MAJOR for breaking changes

### 17.2 CocoaPods Podspec

```ruby
Pod::Spec.new do |s|
  s.name             = 'RampKit'
  s.version          = '0.0.1'
  s.summary          = 'The iOS SDK for RampKit. Build, test, and personalize app onboardings with instant updates.'
  s.homepage         = 'https://rampkit.com'
  s.license          = { :type => 'MIT', :file => 'LICENSE' }
  s.author           = { 'RampKit' => 'support@rampkit.com' }
  s.source           = { :git => 'https://github.com/getrampkit/rampkit-ios.git', :tag => s.version.to_s }
  s.ios.deployment_target = '14.0'
  s.swift_version = '5.9'
  s.source_files = 'RampKit/**/*.swift'
  s.frameworks = 'UIKit', 'WebKit', 'Security', 'UserNotifications', 'StoreKit'
end
```

### 17.3 Swift Package Manager

```swift
// Package.swift
let package = Package(
    name: "RampKit",
    platforms: [.iOS(.v14)],
    products: [
        .library(name: "RampKit", targets: ["RampKit"])
    ],
    targets: [
        .target(name: "RampKit", dependencies: [])
    ]
)
```

---

## 18. Testing Strategy

### 18.1 Unit Tests

- User ID generation and storage
- HTML document building
- Variable initialization and merging
- Message parsing and routing

### 18.2 Integration Tests

- CDN fetch and JSON parsing
- WebView message bridge
- Native integration callbacks (mocked)

### 18.3 UI Tests

- Overlay presentation and dismissal
- Page navigation (forward, back, jump)
- Animation timing and smoothness
- Hardware back button behavior (if applicable)

---

## 19. Summary & Key Takeaways

### 19.1 Core Architecture

1. **Singleton pattern** for global access
2. **Three-module structure**: Core, UserId, Overlay
3. **Async initialization** with remote config fetch
4. **WebView-based rendering** with native bridge
5. **Event-driven communication** via message passing

### 19.2 Critical Features

1. **Stable User ID**: Generated once, stored securely
2. **Dynamic Content**: Fetched from CDN, no app updates needed
3. **Multi-Screen Flows**: Paged navigation with animations
4. **Shared Variables**: Synchronized state across screens
5. **Native Integrations**: Haptics, notifications, store review
6. **Security Hardening**: Prevent selection, zoom, copy/paste

### 19.3 iOS-Specific Considerations

1. Use **Keychain** for user ID storage (not UserDefaults)
2. Use **WKWebView** with message handlers (not UIWebView)
3. Change `window.ReactNativeWebView.postMessage` to `window.webkit.messageHandlers.rampkit.postMessage`
4. Use **UIPageViewController** or custom paging (not react-native-pager-view)
5. Use **native animations** (UIView.animate, CAAnimation)
6. Follow **Swift conventions** (camelCase, async/await, Result types)

### 19.4 Must-Have Parity

- [ ] Identical initialization API
- [ ] Same onboarding data structure
- [ ] Matching message protocol
- [ ] Equivalent native integrations
- [ ] Similar logging format
- [ ] Consistent error handling (never crash)
- [ ] Same performance optimizations (preloading, caching)
- [ ] Matching animation timings

---

## 20. Reference Implementation Checklist

Use this checklist to ensure iOS SDK matches React Native SDK:

**Core Functionality:**
- [ ] Singleton instance accessible via static property
- [ ] Async `init(config:)` method
- [ ] User ID generation with UUID v4
- [ ] User ID storage in secure/encrypted storage
- [ ] CDN fetch with error handling
- [ ] Auto-show onboarding on init (optional)
- [ ] `showOnboarding()` method
- [ ] `closeOnboarding()` method
- [ ] `getOnboardingData()` method
- [ ] `getUserId()` method

**Overlay & UI:**
- [ ] Full-screen modal presentation
- [ ] Multi-page onboarding with paging
- [ ] One WebView per screen
- [ ] Fade-in animation on show (220ms)
- [ ] Fade-out animation on dismiss (320ms + 150ms delay)
- [ ] Fade curtain for page transitions
- [ ] Slide animation support
- [ ] Hardware back button handling (if applicable)

**Message Protocol:**
- [ ] Parse string messages (legacy)
- [ ] Parse JSON messages (structured)
- [ ] Handle `rampkit:continue`
- [ ] Handle `rampkit:navigate`
- [ ] Handle `rampkit:goBack`
- [ ] Handle `rampkit:close`
- [ ] Handle `rampkit:haptic`
- [ ] Handle `rampkit:request-review`
- [ ] Handle `rampkit:request-notification-permission`
- [ ] Handle `rampkit:onboarding-finished`
- [ ] Handle `rampkit:show-paywall`
- [ ] Handle `rampkit:variables` (receive)
- [ ] Handle `rampkit:request-vars`

**Variable System:**
- [ ] Initialize variables from onboarding data
- [ ] Send variables to WebView on load
- [ ] Receive variable updates from WebView
- [ ] Merge and broadcast variables
- [ ] Filter stale values (600ms window)
- [ ] Inject via `window.__rampkitVariables`

**Native Integrations:**
- [ ] Haptic feedback (impact, notification, selection)
- [ ] In-app store review
- [ ] Notification permission request
- [ ] Store notification status in variables
- [ ] External URL opening

**Performance:**
- [ ] Preload overlay (cache HTML, warm WebView)
- [ ] Preconnect/DNS prefetch for scripts
- [ ] Offscreen WebView rendering
- [ ] Destroy preloader on show

**Security:**
- [ ] Inject hardening script before content load
- [ ] Inject no-select script after content load
- [ ] Disable text selection and zooming
- [ ] Prevent copy/paste and context menu

**Error Handling:**
- [ ] Never throw/crash on init failure
- [ ] Graceful degradation on network errors
- [ ] Silent callback error swallowing
- [ ] Defensive null checks throughout
- [ ] Detailed logging with `[RampKit]` prefix

**Code Quality:**
- [ ] Follow naming conventions (PascalCase classes, camelCase methods)
- [ ] Use modern Swift features (async/await, Result, optionals)
- [ ] Add inline documentation/comments
- [ ] Provide usage examples in README
- [ ] Include CocoaPods/SPM support

---

## 21. Additional Resources

**React Native SDK:**
- GitHub: https://github.com/getrampkit/rampkit-expo
- npm: https://www.npmjs.com/package/rampkit-expo-dev

**RampKit Platform:**
- Website: https://rampkit.com
- Docs: https://rampkit.com/docs

**Dependencies to Study:**
- `expo-secure-store` → iOS Keychain
- `expo-haptics` → UIFeedbackGenerator
- `expo-store-review` → SKStoreReviewController
- `expo-notifications` → UserNotifications framework
- `react-native-webview` → WKWebView
- `react-native-pager-view` → UIPageViewController

---

## Appendix A: Complete Message Type Reference

| Message Type | Format | Purpose | Native Action |
|--------------|--------|---------|---------------|
| `rampkit:continue` | JSON | Advance to next screen | `navigateToIndex(current+1)` |
| `continue` | String | Advance to next screen | `navigateToIndex(current+1)` |
| `next` | String | Advance to next screen | `navigateToIndex(current+1)` |
| `rampkit:navigate` | JSON | Jump to specific screen | `navigateToIndex(findIndex(targetId))` |
| `rampkit:navigate:<id>` | String | Jump to specific screen | `navigateToIndex(findIndex(id))` |
| `rampkit:goBack` | JSON/String | Go to previous screen | `navigateToIndex(current-1)` |
| `rampkit:close` | JSON/String | Dismiss overlay | `handleRequestClose()` |
| `rampkit:haptic` | JSON | Trigger haptic feedback | `performHaptic(event)` |
| `haptic:<type>` | String | Trigger default haptic | `performHaptic(medium impact)` |
| `rampkit:request-review` | JSON/String | Show store review | `requestReview()` |
| `rampkit:review` | JSON/String | Show store review | `requestReview()` |
| `rampkit:request-notification-permission` | JSON/String | Request notification permission | `requestNotificationPermission()` |
| `rampkit:onboarding-finished` | JSON/String | Mark onboarding complete | `onOnboardingFinished(payload)` + close |
| `rampkit:show-paywall` | JSON/String | Show paywall | `onShowPaywall(payload)` |
| `rampkit:variables` | JSON | Update shared variables | Merge into `sharedVariables`, broadcast |
| `rampkit:request-vars` | JSON | Request current variables | Send `rampkit:variables` message to WebView |
| `rampkit:tap` | String | Legacy continue | `navigateToIndex(current+1)` |

---

## Appendix B: Animation Timing Reference

| Animation | Duration | Delay | Easing | Direction |
|-----------|----------|-------|--------|-----------|
| Overlay Fade In | 220ms | 0 | Cubic ease-out | 0 → 1 opacity |
| Overlay Fade Out | 320ms | 150ms | Cubic ease-out | 1 → 0 opacity |
| Page Fade Curtain (out) | 160ms | 0 | Quadratic ease-out | 0 → 1 opacity |
| Page Fade Curtain (in) | 160ms | 0 | Quadratic ease-in | 1 → 0 opacity |
| Slide Transition | ~300ms | 0 | Native (ease-in-out) | Platform default |

---

## Appendix C: Error Messages Reference

| Context | Message Pattern | Example |
|---------|----------------|---------|
| Init | `Init: <step>` | `Init: userId abc-123` |
| Init Error | `Init: failed to <action>` | `Init: failed to resolve user id` |
| Show | `ShowOnboarding: <condition>` | `ShowOnboarding: no onboarding data available` |
| Overlay | `Overlay mounted: docs= <count>` | `Overlay mounted: docs= 3` |
| Variables | `sendVarsToWebView <index> <vars>` | `sendVarsToWebView 0 {key: value}` |
| Variables | `received variables from page <index>` | `received variables from page 1` |
| Variables | `broadcastVars` | `broadcastVars` |
| Page | `onPageSelected <index>` | `onPageSelected 2` |
| WebView | `WebView error: <error>` | `WebView error: Failed to load` |

---

**End of Report**

This document should serve as the complete reference for building the iOS SDK. Any questions or clarifications should reference specific sections by number. Good luck with the iOS implementation! 🚀

