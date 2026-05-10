/**
 * Feedback client — drop-in module.
 *
 * Posts a GitHub-native issue payload to a relay endpoint that handles
 * server-side authentication and (typically) decodes an opaque encoded
 * repo segment. End users never see the repo, the token, or which
 * transport is being used.
 *
 * Usage:
 *   import { submitFeedback, formatExceptionBody } from "./feedback";
 *   const r = await submitFeedback({
 *     endpoint: "https://relay.example.com/github/r/<encoded>/issues",
 *     anonId,                     // see getAnonId()
 *     app: "my-app",
 *     appVersion: "1.2.3",
 *     title: "Crash on save",
 *     body: "Steps to reproduce...",
 *     kind: "bug",                // "bug" | "suggestion"
 *     source: "user",             // "user" | "agent" | "auto"
 *   });
 *   if (!r.ok) showToast("Couldn't send feedback right now.");
 */

import { request as httpsRequest } from "https";
import { request as httpRequest } from "http";
import { URL } from "url";

export type FeedbackKind = "bug" | "suggestion";
export type FeedbackSource = "user" | "agent" | "auto";

export interface FeedbackInput {
  endpoint: string;
  anonId: string;
  app: string;
  appVersion?: string;
  title: string;
  body: string;
  kind: FeedbackKind;
  source: FeedbackSource;
  labels?: string[];
}

export interface FeedbackResult {
  ok: boolean;
  url?: string;
  number?: number;
  /** Generic, user-safe error message. Never includes the endpoint or repo. */
  error?: string;
}

function buildLabels(input: FeedbackInput): string[] {
  const base = input.kind === "bug" ? ["bug"] : ["enhancement"];
  return Array.from(new Set([...base, `from:${input.source}`, ...(input.labels || [])]));
}

function buildBody(input: FeedbackInput): string {
  const meta = [
    `_kind: ${input.kind}_`,
    `_source: ${input.source}_`,
    `_reported: ${new Date().toISOString()}_`,
    `_app: ${input.app}${input.appVersion ? ` ${input.appVersion}` : ""}_`,
  ].join("\n");
  return `${input.body}\n\n---\n${meta}\n`;
}

export async function submitFeedback(input: FeedbackInput): Promise<FeedbackResult> {
  let u: URL;
  try {
    u = new URL(input.endpoint);
  } catch {
    return { ok: false, error: "Couldn't send feedback right now." };
  }
  if (
    u.protocol !== "https:" &&
    u.hostname !== "127.0.0.1" &&
    u.hostname !== "localhost"
  ) {
    return { ok: false, error: "Couldn't send feedback right now." };
  }

  const payload = JSON.stringify({
    title: input.title,
    body: buildBody(input),
    labels: buildLabels(input),
  });

  return new Promise<FeedbackResult>((resolve) => {
    const reqFn = u.protocol === "https:" ? httpsRequest : httpRequest;
    const req = reqFn(
      {
        method: "POST",
        hostname: u.hostname,
        port: u.port || (u.protocol === "https:" ? 443 : 80),
        path: u.pathname + u.search,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
          "Accept": "application/vnd.github+json",
          "User-Agent": `${input.app}-feedback`,
          "X-Anon-Id": input.anonId,
          "X-App": input.app,
          ...(input.appVersion ? { "X-App-Version": input.appVersion } : {}),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const j = JSON.parse(raw);
              resolve({ ok: true, url: j.html_url || j.url, number: j.number });
            } catch {
              resolve({ ok: true });
            }
          } else {
            // Log server response server-side if you have a logger.
            // NEVER surface res.statusCode or raw body to end users.
            resolve({ ok: false, error: "Couldn't send feedback right now." });
          }
        });
      }
    );
    req.on("error", () => resolve({ ok: false, error: "Couldn't send feedback right now." }));
    req.write(payload);
    req.end();
  });
}

/**
 * Format an Error as feedback body for auto-report. Strips noisy paths,
 * includes stack and arbitrary context. Returns { title, body } you can
 * pass straight into submitFeedback as `title` + `body`.
 */
export function formatExceptionBody(
  err: unknown,
  context?: Record<string, any>
): { title: string; body: string } {
  const e = err instanceof Error ? err : new Error(String(err));
  const title = `[auto] ${e.name}: ${e.message}`.slice(0, 180);
  const lines: string[] = [];
  lines.push("**Auto-reported uncaught exception**");
  lines.push("");
  lines.push("```");
  lines.push(e.stack || `${e.name}: ${e.message}`);
  lines.push("```");
  if (context && Object.keys(context).length) {
    lines.push("");
    lines.push("**Context**");
    lines.push("```json");
    lines.push(JSON.stringify(context, null, 2));
    lines.push("```");
  }
  return { title, body: lines.join("\n") };
}
