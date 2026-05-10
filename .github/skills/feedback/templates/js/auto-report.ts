/**
 * Anonymous client identity + crash-handler installer for Node / Electron.
 *
 * Stores a UUID at <homedir>/.<app>/anon-id on first call. Sent as
 * X-Anon-Id so the relay can rate-limit per client without ever
 * collecting PII.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { randomUUID } from "crypto";
import { submitFeedback, formatExceptionBody, type FeedbackInput } from "./feedback";

export interface AutoReportConfig {
  endpoint: string;
  app: string;
  appVersion?: string;
  /** Default: <homedir>/.<app>/anon-id */
  anonIdPath?: string;
  /** If false, all auto-reporting is disabled. Manual submitFeedback still works. */
  enabled?: boolean;
  /** Dedupe identical errors fired within this many ms (default 10 min). */
  dedupeWindowMs?: number;
}

export function getAnonId(app: string, customPath?: string): string {
  try {
    const idPath = customPath || join(homedir(), `.${app}`, "anon-id");
    if (existsSync(idPath)) {
      const v = readFileSync(idPath, "utf8").trim();
      if (v) return v;
    }
    const id = randomUUID();
    mkdirSync(join(homedir(), `.${app}`), { recursive: true });
    writeFileSync(idPath, id);
    return id;
  } catch {
    return "anon-unknown";
  }
}

/**
 * Install Node / Electron-main process-level crash handlers.
 * Returns an `uninstall()` function.
 */
export function installCrashHandler(config: AutoReportConfig): () => void {
  if (config.enabled === false) return () => {};

  const anonId = getAnonId(config.app, config.anonIdPath);
  const recent = new Map<string, number>();
  const window = config.dedupeWindowMs ?? 10 * 60 * 1000;

  const send = async (err: unknown, kind: string) => {
    try {
      const e = err instanceof Error ? err : new Error(String(err));
      const sig = `${kind}:${e.name}:${e.message}`.slice(0, 200);
      const now = Date.now();
      const last = recent.get(sig);
      if (last && now - last < window) return;
      recent.set(sig, now);

      const { title, body } = formatExceptionBody(e, { kind });
      const input: FeedbackInput = {
        endpoint: config.endpoint,
        anonId,
        app: config.app,
        appVersion: config.appVersion,
        title,
        body,
        kind: "bug",
        source: "auto",
      };
      await submitFeedback(input);
    } catch {
      /* never throw from a crash handler */
    }
  };

  const onUncaught = (err: Error) => { void send(err, "uncaughtException"); };
  const onUnhandled = (reason: any) => { void send(reason, "unhandledRejection"); };

  process.on("uncaughtException", onUncaught);
  process.on("unhandledRejection", onUnhandled);

  return () => {
    process.off("uncaughtException", onUncaught);
    process.off("unhandledRejection", onUnhandled);
  };
}

/**
 * For Electron renderers / web apps, install browser-side handlers.
 * Posts via fetch (no Node imports).
 */
export function installBrowserCrashHandler(config: AutoReportConfig): () => void {
  if (config.enabled === false) return () => {};
  // The `window` global isn't typed in Node; cast as any so this file
  // still compiles for the main-process use case.
  const w: any = (globalThis as any).window;
  if (!w) return () => {};

  const anonId = config.anonIdPath || `anon-${Math.random().toString(36).slice(2, 12)}`;
  const recent = new Map<string, number>();
  const window_ms = config.dedupeWindowMs ?? 10 * 60 * 1000;

  const post = async (err: any, kind: string) => {
    const e = err instanceof Error ? err : new Error(String(err));
    const sig = `${kind}:${e.name}:${e.message}`.slice(0, 200);
    const now = Date.now();
    const last = recent.get(sig);
    if (last && now - last < window_ms) return;
    recent.set(sig, now);

    const { title, body } = formatExceptionBody(e, { kind });
    const labels = ["bug", "from:auto"];
    try {
      await fetch(config.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/vnd.github+json",
          "X-Anon-Id": anonId,
          "X-App": config.app,
          ...(config.appVersion ? { "X-App-Version": config.appVersion } : {}),
        },
        body: JSON.stringify({ title, body, labels }),
      });
    } catch { /* swallow */ }
  };

  const onError = (ev: any) => post(ev?.error || ev?.message || ev, "window.error");
  const onRej   = (ev: any) => post(ev?.reason || ev, "unhandledrejection");

  w.addEventListener("error", onError);
  w.addEventListener("unhandledrejection", onRej);

  return () => {
    w.removeEventListener("error", onError);
    w.removeEventListener("unhandledrejection", onRej);
  };
}
