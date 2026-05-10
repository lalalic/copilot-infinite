# Feedback — JS / TypeScript template

Drop-in client for Node, Electron, or browser. ~250 LoC, no runtime
dependencies.

## Files

- `feedback.ts` — `submitFeedback`, `formatExceptionBody`. Uses Node's
  `https` / `http` modules (works in Electron main + preload).
- `auto-report.ts` — `getAnonId`, `installCrashHandler` (Node /
  Electron-main), `installBrowserCrashHandler` (renderer / web).

## Integrate (Electron main process)

```ts
import { app } from "electron";
import { installCrashHandler } from "./feedback/auto-report";

app.whenReady().then(() => {
  installCrashHandler({
    endpoint: "https://relay.example.com/github/r/<encoded>/issues",
    app: "my-app",
    appVersion: app.getVersion(),
    enabled: settings.crashReports !== false,
  });
});
```

## Integrate (browser / renderer)

```ts
import { installBrowserCrashHandler } from "./feedback/auto-report";

installBrowserCrashHandler({
  endpoint: "/api/feedback",  // proxy through your own backend, or
                              // hit the relay URL directly
  app: "my-app",
  appVersion: "1.2.3",
});
```

## Integrate (manual "Send feedback" UI)

```ts
import { submitFeedback } from "./feedback/feedback";
import { getAnonId } from "./feedback/auto-report";

async function onSubmit(title: string, body: string, kind: "bug" | "suggestion") {
  const r = await submitFeedback({
    endpoint: "https://relay.example.com/github/r/<encoded>/issues",
    anonId:   getAnonId("my-app"),
    app:      "my-app",
    appVersion: "1.2.3",
    title, body, kind,
    source:   "user",
  });
  return r.ok;  // show generic toast either way
}
```

## Encoded-repo URL

```sh
node -e 'const r="OWNER/REPO";\
  console.log(Buffer.from(r).toString("base64")\
    .replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,""))'
```

Concatenate: `https://<your-relay>/github/r/<output>/issues`

## What MUST stay invisible to end users

- The endpoint URL
- The decoded repo (`OWNER/REPO`)
- Any GitHub-specific terminology in error messages
- The `X-Anon-Id` value
