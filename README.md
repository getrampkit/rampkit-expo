<p align="center">
  <br />
  <img src="https://dqplcvw3fzili.cloudfront.net/rampkitlogo.png" height="110" />
</p>

<h1 align="center">RampKit Expo SDK</h1>

<p align="center">Build, test, and improve your onboarding experience with instant updates.</p>

---

## What is RampKit?

RampKit lets you create, edit, and deploy onboarding flows from the web. No new releases. No code changes. You design your onboarding in the RampKit dashboard and the Expo SDK handles the rest.

---

## Features

- Visual web builder
- A/B testing
- Personalized onboardings
- Instant updates
- Analytics and insights

---

## Installation

```sh
npx expo install rampkit-expo-dev
```

---

## Setup

```ts
import { RampKit } from "rampkit-expo-dev";

await RampKit.configure({
  appId: "YOUR_APP_ID",
  environment: "production", // optional
  autoShowOnboarding: false, // optional
  appUserID: "your-user-123", // optional - your own user ID for analytics linking
  onOnboardingFinished: (payload) => {
    // optional callback fired when the flow finishes
  },
});
```

Show an onboarding:

```ts
RampKit.showOnboarding();
```

---

## Configuration Options

```ts
await RampKit.configure({
  appId: "YOUR_APP_ID",
  environment: "staging", // optional
  autoShowOnboarding: true, // optional (auto-present after configure if data is available)
  appUserID: "user-123", // optional - link with your own user database
  onOnboardingFinished: (payload) => {
    // optional
  },
});

// Access the generated stable user id (stored securely)
const idFromInit = RampKit.getUserId(); // string | null (available after configure)

// Or fetch/generate it directly (always returns a string)
import { getRampKitUserId } from "rampkit-expo-dev";
const userId = await getRampKitUserId();

// Get stored onboarding responses
const responses = await RampKit.getOnboardingResponses();
```

---

## Custom App User ID

You can associate your own user identifier with RampKit analytics. This is useful for linking RampKit data with your own user database.

**Important:** This is an alias only - RampKit still generates and uses its own internal user ID (`appUserId`) for tracking. Your custom `appUserID` is stored alongside it for your reference.

### Set at Configuration

```ts
await RampKit.configure({
  appId: "YOUR_APP_ID",
  appUserID: "your-user-123", // Set during configuration
});
```

### Set After Configuration

```ts
// Set or update the app user ID at any time
await RampKit.setAppUserID("your-user-123");

// Get the current app user ID
const customId = RampKit.getAppUserID(); // string | null
```

---

## Accessing Onboarding Responses

RampKit automatically stores user responses when questions are answered during onboarding. You can retrieve these responses at any time:

```ts
const responses = await RampKit.getOnboardingResponses();

for (const response of responses) {
  console.log("Question:", response.questionId);
  console.log("Answer:", response.answer);
  console.log("Answered at:", response.answeredAt);
}
```

Each `OnboardingResponse` contains:

| Property | Type | Description |
|----------|------|-------------|
| `questionId` | `string` | Unique identifier for the question |
| `answer` | `any` | The user's answer (any JSON-serializable value) |
| `questionText` | `string?` | Optional question text shown to user |
| `screenName` | `string?` | Screen where question was answered |
| `answeredAt` | `string` | ISO 8601 timestamp |

Responses are automatically cleared when `reset()` is called.

More examples are in the docs:  
https://rampkit.com/docs

---

## Example

```ts
import { useEffect } from "react";
import { RampKit } from "rampkit-expo-dev";
import { Button } from "react-native";

export default function App() {
  useEffect(() => {
    // Configure once in your app
    RampKit.configure({ appId: "YOUR_APP_ID" });
  }, []);

  return (
    <Button title="Show Onboarding" onPress={() => RampKit.showOnboarding()} />
  );
}
```

---

## Links

- Website: https://rampkit.com
- Docs: https://rampkit.com/docs
- GitHub: https://github.com/getrampkit/rampkit-expo
- Issues: https://github.com/getrampkit/rampkit-expo/issues

---

## License

MIT
