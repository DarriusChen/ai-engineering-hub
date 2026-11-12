import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { previewScope, scan } from "../src/server/scanner.js";
import { Store } from "../src/server/storage.js";
import { createApp } from "../src/server/app.js";
const skill = (name = "review", body = "Read before write.") =>
  `---\nname: ${name}\ndescription: Review a change.\n---\n${body}\n`;
async function fixture() {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "hub-test-"));
  const root = path.join(base, "project");
  await fs.mkdir(path.join(root, ".agents/skills"), { recursive: true });
  return {
    base,
    root,
    write: async (name: string, content = skill()) => {
      const file = path.join(root, ".agents/skills", name, "SKILL.md");
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, content);
      return file;
    },
    cleanup: () => fs.rm(base, { recursive: true, force: true }),
  };
}

test("real Skills, same names, symlink aliases, hard links, exclusions and partial failures", async () => {
  const f = await fixture();
  try {
    const original = await f.write("a");
    await f.write("b");
    await fs.symlink("a", path.join(f.root, ".agents/skills/alias"));
    const hard = path.join(f.root, ".agents/skills/hard");
    await fs.mkdir(hard);
    await fs.link(original, path.join(hard, "SKILL.md"));
    await f.write("invalid", "---\nname: [invalid\n---\n");
    const secret = path.join(f.base, "outside");
    await fs.mkdir(secret);
    await fs.writeFile(
      path.join(secret, "SKILL.md"),
      skill("outside", "DO_NOT_READ_OUTSIDE"),
    );
    await fs.symlink(secret, path.join(f.root, ".agents/skills/escape"));
    await f.write("excluded", skill("excluded", "DO_NOT_READ_EXCLUDED"));
    await fs.symlink("../", path.join(f.root, ".agents/skills/loop"));
    const scope = await previewScope(f.root, [".agents/skills/excluded"]);
    const result = await scan(scope);
    assert.equal(result.status, "partial");
    assert.equal(result.resources.length, 2);
    assert.equal(result.instances.length, 4);
    assert.equal(result.sources.length, 2);
    assert(result.diagnostics.some((d) => d.code === "outside-scope"));
    assert(result.diagnostics.some((d) => d.code === "invalid-format"));
    assert(result.diagnostics.some((d) => d.code === "symlink-loop"));
    assert(!JSON.stringify(result).includes("DO_NOT_READ"));
    assert.equal(await fs.readFile(original, "utf8"), skill());
  } finally {
    await f.cleanup();
  }
});

test("redaction, stable IDs, updates and deletes; interrupted scan does not yield a snapshot", async () => {
  const f = await fixture();
  try {
    const secret = "sk-abcdefghijklmnopqrstuvwxyz0123456789";
    const file = await f.write(
      "review",
      skill(
        "review",
        `api_key: ${secret}\n![image](https://example.com/a.png)\n<script>alert(1)</script>`,
      ),
    );
    const scope = await previewScope(f.root, []);
    const first = await scan(scope);
    assert(!JSON.stringify(first).includes(secret));
    await fs.writeFile(file, skill("review", "Updated content"));
    const next = await scan(scope);
    assert.equal(first.resources[0]!.id, next.resources[0]!.id);
    assert(next.resources[0]!.content.includes("Updated"));
    await fs.rm(file);
    assert.equal((await scan(scope)).resources.length, 0);
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(scan(scope, controller.signal));
  } finally {
    await f.cleanup();
  }
});

test("storage restart, writer lock, invalid snapshot, scope revision and interrupted write", async () => {
  const f = await fixture();
  const directory = path.join(f.base, "data");
  let store = new Store(directory);
  try {
    await f.write("review");
    const scope = await previewScope(f.root, []);
    await store.init();
    await store.setScope(scope);
    const snapshot = await scan(scope);
    await store.saveSnapshot(snapshot);
    await assert.rejects(new Store(directory).init());
    await store.close();
    store = new Store(directory);
    await store.init();
    assert.equal(store.snapshot?.resources.length, 1);
    const before = await fs.readFile(
      path.join(directory, "snapshot.json"),
      "utf8",
    );
    await fs.mkdir(path.join(directory, "blocked"));
    await assert.rejects(store.atomic("blocked", { anything: true }));
    assert.equal(
      await fs.readFile(path.join(directory, "snapshot.json"), "utf8"),
      before,
    );
    await store.setScope(await previewScope(f.root, [".agents/skills"]));
    assert.equal(store.snapshot, null);
    await store.close();
    store = new Store(directory);
    await store.init();
    assert.equal(store.snapshot, null);
    await store.close();
    await fs.writeFile(path.join(directory, "snapshot.json"), "{broken");
    store = new Store(directory);
    await store.init();
    assert(store.warning);
    assert.equal(store.snapshot, null);
  } finally {
    await store.close();
    await f.cleanup();
  }
});

test("API authorization, preview/confirm, real scan and snapshot restore", async () => {
  const f = await fixture();
  await f.write("review");
  const directory = path.join(f.base, "data");
  const hub = await createApp({ directory, serveUi: false });
  const origin = "http://127.0.0.1:4312";
  hub.setOrigin(origin);
  try {
    const inject = (
      url: string,
      payload?: unknown,
      headers: Record<string, string> = {},
    ) =>
      hub.app.inject({
        method: payload === undefined ? "GET" : "POST",
        url,
        headers: { host: "127.0.0.1:4312", origin, ...headers },
        ...(payload === undefined ? {} : { payload }),
      });
    assert.equal((await inject("/api/state")).statusCode, 401);
    assert.equal(
      (
        await inject(
          "/api/session",
          { token: hub.token },
          { origin: "https://evil.example" },
        )
      ).statusCode,
      403,
    );
    assert.equal(
      (
        await inject(
          "/api/session",
          { token: hub.token },
          { host: "evil.example" },
        )
      ).statusCode,
      403,
    );
    const session = await inject("/api/session", { token: hub.token });
    assert.equal(session.statusCode, 200);
    const cookie = String(session.headers["set-cookie"]).split(";")[0]!;
    const headers = { cookie, "x-hub-csrf": session.json().csrf };
    assert.equal(
      (await inject("/api/session", { token: hub.token })).statusCode,
      401,
    );
    assert.equal(
      (await inject("/api/preview", { root: f.root, excluded: [] }, { cookie }))
        .statusCode,
      403,
    );
    const preview = await inject(
      "/api/preview",
      { root: f.root, excluded: [] },
      headers,
    );
    assert.equal(preview.statusCode, 200);
    assert.equal(
      (await inject("/api/scope", { id: "wrong" }, headers)).statusCode,
      409,
    );
    assert.equal(
      (await inject("/api/scope", { id: preview.json().id }, headers))
        .statusCode,
      200,
    );
    assert.equal((await inject("/api/scans", {}, headers)).statusCode, 202);
    let state;
    for (let i = 0; i < 100; i++) {
      state = (await inject("/api/state", undefined, headers)).json();
      if (!state.scanning) break;
      await new Promise((r) => setTimeout(r, 10));
    }
    assert.equal(state.error, null);
    assert.equal(state.snapshot.resources.length, 1);
    assert.equal(
      (
        await inject("/api/state", undefined, {
          ...headers,
          origin: "https://evil.example",
        })
      ).statusCode,
      403,
    );
  } finally {
    await hub.app.close();
  }
  const store = new Store(directory);
  try {
    await store.init();
    assert.equal(store.snapshot?.resources.length, 1);
  } finally {
    await store.close();
    await f.cleanup();
  }
});

test("nested Skills keep their base directory and missing sources are distinguished", async () => {
  const f = await fixture();
  try {
    const nested = path.join(f.root, "packages/app/.agents/skills/nested");
    await fs.mkdir(nested, { recursive: true });
    await fs.writeFile(path.join(nested, "SKILL.md"), skill("nested"));
    await fs.rm(path.join(f.root, ".agents/skills"), { recursive: true });
    const result = await scan(await previewScope(f.root, []));
    assert.equal(result.resources.length, 1);
    assert.equal(
      result.instances[0]!.baseDirectory,
      path.join(f.root, "packages/app"),
    );
    assert(result.coverage.some((c) => c.status === "missing"));
    const alias = path.join(f.base, "project-alias");
    await fs.symlink(f.root, alias);
    const scope = await previewScope(alias, []);
    assert.equal(scope.canonicalRoot, await fs.realpath(f.root));
    assert.equal((await scan(scope)).resources.length, 1);
    await fs.unlink(alias);
    await fs.mkdir(alias);
    assert.equal((await scan(scope)).status, "partial");
  } finally {
    await f.cleanup();
  }
});

test("partial rescan does not reuse stale entries; malformed preferences are preserved", async () => {
  const f = await fixture();
  const directory = path.join(f.base, "data");
  const store = new Store(directory);
  try {
    const file = await f.write("a");
    await f.write("b");
    const scope = await previewScope(f.root, []);
    await store.init();
    await store.setScope(scope);
    await store.saveSnapshot(await scan(scope));
    assert.equal(store.snapshot!.resources.length, 2);
    await fs.writeFile(file, "not a skill");
    await store.saveSnapshot(await scan(scope));
    assert.equal(store.snapshot!.status, "partial");
    assert.equal(store.snapshot!.resources.length, 1);
    await store.close();
    await fs.writeFile(path.join(directory, "preferences.json"), "{broken");
    await assert.rejects(new Store(directory).init());
    assert.equal(
      await fs.readFile(path.join(directory, "preferences.json"), "utf8"),
      "{broken",
    );
  } finally {
    await store.close();
    await f.cleanup();
  }
});
