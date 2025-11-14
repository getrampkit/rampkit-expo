<p align="center">
  <img src="https://dqplcvw3fzili.cloudfront.net/rampkitlogo.png" height="80" />
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

RampKit.configure({
  projectId: "YOUR_PROJECT_ID",
});
```

Show an onboarding:

```ts
await RampKit.present();
```

---

## Configuration Options

```ts
RampKit.configure({
  projectId: "abc123",
  userId: "user_42", // optional
  debug: true, // optional
});
```

More examples are in the docs:  
https://rampkit.com/docs

---

## Example

```ts
import { RampKit } from "rampkit-expo-dev";
import { Button } from "react-native";

export default function App() {
  return <Button title="Show Onboarding" onPress={() => RampKit.present()} />;
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
