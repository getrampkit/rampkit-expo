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

await RampKit.init({
  apiKey: "YOUR_API_KEY",
  environment: "production", // optional
  autoShowOnboarding: false, // optional
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
await RampKit.init({
  apiKey: "abc123",
  environment: "staging", // optional
  autoShowOnboarding: true, // optional (auto-present after init if data is available)
  onOnboardingFinished: (payload) => {
    // optional
  },
});

// Access the generated stable user id (stored securely)
const idFromInit = RampKit.getUserId(); // string | null (available after init)

// Or fetch/generate it directly (always returns a string)
import { getRampKitUserId } from "rampkit-expo-dev";
const userId = await getRampKitUserId();
```

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
    // Initialize once in your app
    RampKit.init({ apiKey: "YOUR_API_KEY" });
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
