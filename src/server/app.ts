import Fastify from "fastify";
import staticFiles from "@fastify/static";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { realpath } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { Store } from "./storage.js";
import { previewScope, scan, inside } from "./scanner.js";
import { hubMessages, type HubMessageCode } from "../shared/messages.js";
import type { Preview } from "../shared/model.js";
function problem(code: HubMessageCode) {
  return { code, message: hubMessages[code].en };
}

export async function createApp(options: {
  directory: string;
  serveUi?: boolean;
}) {
  const store = new Store(options.directory);
  await store.init();
  const app = Fastify({ logger: false, bodyLimit: 32768 });
  const token = randomBytes(32).toString("hex"),
    tokenExpires = Date.now() + 300000;
  let bootstrapUsed = false,
    origin = "",
    scanning = false,
    mutating = false,
    error: HubMessageCode | null = null;
  let savingLocale = false;
  const sessions = new Map<string, { csrf: string; expires: number }>();
  let preview: Preview | null = null,
    job: Promise<void> | null = null;
  const controller = new AbortController();
  const state = (csrf: string) => ({
    locale: store.locale,
    scope: store.scope,
    snapshot: store.snapshot,
    warning: store.warning ? hubMessages[store.warning].en : null,
    warningCode: store.warning,
    error: error ? hubMessages[error].en : null,
    errorCode: error,
    scanning,
    csrf,
  });
  app.addHook("onRequest", async (req, reply) => {
    reply
      .header("Cache-Control", "no-store")
      .header("X-Content-Type-Options", "nosniff")
      .header("Referrer-Policy", "no-referrer")
      .header(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
      );
    if (!origin || req.headers.host !== new URL(origin).host)
      return reply.code(403).send(problem("invalid-host"));
    if (req.headers.origin && req.headers.origin !== origin)
      return reply.code(403).send(problem("invalid-origin"));
    if (req.url.startsWith("/api/")) {
      if (req.method !== "GET" && req.headers.origin !== origin)
        return reply.code(403).send(problem("missing-origin"));
      if (req.url === "/api/session" && req.method === "POST") return;
      const sid = /\bhub_session=([a-f0-9]+)(?:;|$)/.exec(
        req.headers.cookie ?? "",
      )?.[1];
      const session = sid ? sessions.get(sid) : undefined;
      if (!session || session.expires < Date.now())
        return reply.code(401).send(problem("session-required"));
      if (req.method !== "GET" && req.headers["x-hub-csrf"] !== session.csrf)
        return reply.code(403).send(problem("invalid-session-request"));
    }
  });
  app.setErrorHandler((_err, _req, reply) => {
    reply.code(400).send(problem("operation-failed"));
  });
  app.post("/api/session", async (req, reply) => {
    const body = z.object({ token: z.string() }).safeParse(req.body);
    if (
      !body.success ||
      bootstrapUsed ||
      Date.now() > tokenExpires ||
      body.data.token !== token
    )
      return reply.code(401).send(problem("startup-link-expired"));
    bootstrapUsed = true;
    const sid = randomBytes(32).toString("hex"),
      csrf = randomBytes(32).toString("hex");
    sessions.set(sid, { csrf, expires: Date.now() + 12 * 3600000 });
    reply.header(
      "Set-Cookie",
      `hub_session=${sid}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200`,
    );
    return state(csrf);
  });
  app.get("/api/state", async (req) => {
    const sid = /\bhub_session=([a-f0-9]+)/.exec(req.headers.cookie ?? "")![1]!;
    return state(sessions.get(sid)!.csrf);
  });
  app.post("/api/locale", async (req, reply) => {
    const { locale } = z
      .object({ locale: z.enum(["en", "zh-TW"]) })
      .parse(req.body);
    if (savingLocale)
      return reply.code(409).send(problem("operation-in-progress"));
    savingLocale = true;
    try {
      await store.setLocale(locale);
      return { locale };
    } finally {
      savingLocale = false;
    }
  });
  const Input = z.object({
    root: z.string().min(1).max(4096),
    excluded: z.array(z.string().max(4096)).max(100),
  });
  app.post("/api/preview", async (req, reply) => {
    if (scanning || mutating)
      return reply.code(409).send(problem("scan-or-save-in-progress"));
    const input = Input.parse(req.body);
    const scope = await previewScope(input.root, input.excluded);
    const dataRoot = await realpath(store.directory);
    if (inside(scope.canonicalRoot, dataRoot))
      throw new Error("Hub data directory must be outside the project.");
    preview = {
      id: randomBytes(24).toString("hex"),
      scope,
      skillRoot: path.join(scope.root, ".agents/skills"),
      expiresAt: Date.now() + 300000,
    };
    return preview;
  });
  app.post("/api/scope", async (req, reply) => {
    if (scanning || mutating)
      return reply.code(409).send(problem("operation-in-progress"));
    const { id } = z.object({ id: z.string() }).parse(req.body);
    if (!preview || preview.id !== id || preview.expiresAt < Date.now())
      return reply.code(409).send(problem("preview-expired"));
    mutating = true;
    try {
      const accepted = preview;
      preview = null;
      const refreshed = await previewScope(
        accepted.scope.root,
        accepted.scope.excluded,
      );
      if (refreshed.canonicalRoot !== accepted.scope.canonicalRoot)
        throw new Error("Project target changed.");
      await store.setScope(accepted.scope);
      error = null;
      return { ok: true };
    } finally {
      mutating = false;
    }
  });
  app.post("/api/scans", async (_req, reply) => {
    if (scanning) return reply.code(202).send({ status: "running" });
    if (mutating) return reply.code(409).send(problem("saving-scope"));
    if (!store.scope) return reply.code(409).send(problem("scope-required"));
    scanning = true;
    error = null;
    const scope = store.scope;
    job = (async () => {
      try {
        const snapshot = await scan(scope, controller.signal);
        controller.signal.throwIfAborted();
        await store.saveSnapshot(snapshot);
      } catch {
        error = "scan-failed";
      } finally {
        scanning = false;
      }
    })();
    return reply.code(202).send({ status: "running" });
  });
  if (options.serveUi !== false)
    await app.register(staticFiles, {
      root: fileURLToPath(new URL("../web/", import.meta.url)),
      index: "index.html",
    });
  app.addHook("onClose", async () => {
    controller.abort();
    await job;
    await store.close();
  });
  return {
    app,
    store,
    token,
    setOrigin: (value: string) => {
      origin = value;
    },
    start: async (port = 0) => {
      const address = await app.listen({ host: "127.0.0.1", port });
      origin = address;
      return `${address}/#token=${token}`;
    },
  };
}
