import * as fs from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { parseDocument } from "yaml";
import type { Scope, Snapshot } from "../shared/model.js";
import { hubMessage, hubMessages } from "../shared/messages.js";
import { redact } from "./redact.js";
export const LIMITS = { fileBytes: 1024 * 1024, entries: 10000, depth: 24 };
export function inside(root: string, target: string) {
  const rel = path.relative(root, target);
  return (
    rel === "" ||
    (!rel.startsWith(`..${path.sep}`) && rel !== ".." && !path.isAbsolute(rel))
  );
}
export const id = (...parts: string[]) =>
  createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 24);
export class ScanFault extends Error {
  constructor(public code: string) {
    super(code);
  }
}
export async function previewScope(
  rootInput: string,
  excludedInput: string[],
): Promise<Scope> {
  if (!path.isAbsolute(rootInput))
    throw new Error("Enter an absolute project path.");
  const root = path.resolve(rootInput),
    canonicalRoot = await fs.realpath(root);
  if (!(await fs.stat(canonicalRoot)).isDirectory())
    throw new Error("The project path must be a directory.");
  const excluded = excludedInput
    .filter(Boolean)
    .map((p) => path.resolve(root, p));
  if (excluded.some((p) => !inside(root, p)))
    throw new Error("Excluded paths must be inside the selected project.");
  return { root, canonicalRoot, excluded, revision: randomUUID() };
}
export async function scan(
  scope: Scope,
  signal?: AbortSignal,
): Promise<Snapshot> {
  const result: Snapshot = {
    schemaVersion: 1,
    id: randomUUID(),
    scope,
    startedAt: new Date().toISOString(),
    finishedAt: "",
    status: "complete",
    sources: [],
    resources: [],
    instances: [],
    diagnostics: [],
    coverage: [],
  };
  const diagnostic = (p: string, code: string) => {
    result.diagnostics.push({
      path: redact(p),
      code,
      message: hubMessage(code, "en") ?? hubMessages["read-failed"].en,
    });
    if (code !== "excluded" && code !== "missing") result.status = "partial";
  };
  const mappedExcludes = scope.excluded.map((p) =>
    path.resolve(scope.canonicalRoot, path.relative(scope.root, p)),
  );
  const realExcludes: string[] = [];
  for (const p of scope.excluded) {
    try {
      realExcludes.push(await fs.realpath(p));
    } catch {
      /* Missing exclusions remain path-based. */
    }
  }
  const isExcluded = (p: string) =>
    [...scope.excluded, ...mappedExcludes, ...realExcludes].some((e) =>
      inside(e, p),
    );
  const check = async (p: string) => {
    signal?.throwIfAborted();
    if (!inside(scope.root, p)) throw new ScanFault("outside-scope");
    if (isExcluded(p)) throw new ScanFault("excluded");
    const real = await fs.realpath(p);
    if (!inside(scope.canonicalRoot, real))
      throw new ScanFault("outside-scope");
    if (isExcluded(real)) throw new ScanFault("excluded");
    if ((await fs.realpath(scope.root)) !== scope.canonicalRoot)
      throw new ScanFault("changed-during-scan");
    return real;
  };
  let visited = 0;
  const identities = new Map<string, string>();
  const readSkill = async (p: string) => {
    const real = await check(p),
      before = await fs.stat(real);
    if (!before.isFile()) throw new ScanFault("not-regular-file");
    if (before.size > LIMITS.fileBytes) throw new ScanFault("limit-reached");
    const handle = await fs.open(
      real,
      constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
    );
    let text: string;
    try {
      const opened = await handle.stat();
      if (
        !opened.isFile() ||
        opened.dev !== before.dev ||
        opened.ino !== before.ino ||
        (await check(p)) !== real
      )
        throw new ScanFault("changed-during-scan");
      // Bounded read prevents a growing file from allocating unbounded memory.
      const buffer = Buffer.alloc(LIMITS.fileBytes + 1);
      let length = 0;
      while (length < buffer.length) {
        const { bytesRead } = await handle.read(
          buffer,
          length,
          buffer.length - length,
          null,
        );
        if (!bytesRead) break;
        length += bytesRead;
      }
      if (length > LIMITS.fileBytes) throw new ScanFault("limit-reached");
      const after = await handle.stat(),
        current = await fs.stat(real);
      if (
        after.size !== opened.size ||
        after.mtimeMs !== opened.mtimeMs ||
        after.ctimeMs !== opened.ctimeMs ||
        current.ino !== opened.ino ||
        current.dev !== opened.dev ||
        (await check(p)) !== real
      )
        throw new ScanFault("changed-during-scan");
      text = buffer.subarray(0, length).toString("utf8");
    } finally {
      await handle.close();
    }
    const match = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
    if (!match) throw new ScanFault("invalid-format");
    let metadata: unknown;
    try {
      const doc = parseDocument(match[1]!, { uniqueKeys: true });
      if (doc.errors.length) throw new Error();
      metadata = doc.toJS({ maxAliasCount: 20 });
    } catch {
      throw new ScanFault("invalid-format");
    }
    if (
      !metadata ||
      typeof metadata !== "object" ||
      !("name" in metadata) ||
      !("description" in metadata) ||
      typeof metadata.name !== "string" ||
      !metadata.name.trim() ||
      typeof metadata.description !== "string" ||
      !metadata.description.trim()
    )
      throw new ScanFault("invalid-format");
    const physical = `${before.dev}:${before.ino}`;
    let sourceId = identities.get(physical);
    if (!sourceId) {
      sourceId = id(real);
      identities.set(physical, sourceId);
      result.sources.push({
        id: sourceId,
        canonicalPath: redact(real),
        observedAt: new Date().toISOString(),
      });
    }
    const resourceId = id(sourceId, "skill", "document");
    if (!result.resources.some((r) => r.id === resourceId))
      result.resources.push({
        id: resourceId,
        sourceId,
        type: "skill",
        name: redact(metadata.name),
        description: redact(metadata.description),
        content: redact(text),
      });
    const relative = path.relative(scope.root, p).split(path.sep),
      index = relative.lastIndexOf(".agents");
    const baseDirectory = path.resolve(scope.root, ...relative.slice(0, index));
    result.instances.push({
      id: id(resourceId, "codex", p),
      resourceId,
      agentId: "codex",
      scopeKind: "project",
      nativeScope: "repo",
      projectId: id(scope.canonicalRoot),
      discoveryPath: redact(p),
      baseDirectory: redact(baseDirectory),
    });
    result.coverage.push({ path: redact(p), status: "read" });
  };
  const handleError = (p: string, error: unknown) => {
    if (signal?.aborted) throw error;
    const code =
      error instanceof ScanFault
        ? error.code
        : (error as NodeJS.ErrnoException).code === "ENOENT"
          ? "missing"
          : "read-failed";
    diagnostic(p, code);
    result.coverage.push({
      path: redact(p),
      status:
        code === "missing"
          ? "missing"
          : code === "excluded"
            ? "excluded"
            : "failed",
    });
  };
  // Search directory names, only read SKILL.md inside .agents/skills roots.
  const walk = async (
    p: string,
    depth: number,
    ancestors: Set<string>,
    inSkills = false,
  ): Promise<void> => {
    signal?.throwIfAborted();
    if (++visited > LIMITS.entries || depth > LIMITS.depth) {
      diagnostic(p, "limit-reached");
      return;
    }
    try {
      const real = await check(p),
        st = await fs.stat(real);
      if (st.isDirectory()) {
        const key = `${st.dev}:${st.ino}`;
        if (ancestors.has(key)) throw new ScanFault("symlink-loop");
        const next = new Set(ancestors).add(key);
        const entries = await fs.readdir(real, { withFileTypes: true });
        if ((await check(p)) !== real)
          throw new ScanFault("changed-during-scan");
        for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
          if (visited >= LIMITS.entries) {
            diagnostic(p, "limit-reached");
            break;
          }
          if ([".git", "node_modules", "dist", ".hub-data"].includes(e.name))
            continue;
          const child = path.join(p, e.name);
          const skillDir =
            inSkills || (e.name === "skills" && path.basename(p) === ".agents");
          if (inSkills && e.name === "SKILL.md") {
            try {
              await readSkill(child);
            } catch (err) {
              handleError(child, err);
            }
          } else if (e.isDirectory() || e.isSymbolicLink())
            await walk(child, depth + 1, next, skillDir);
        }
      }
    } catch (err) {
      handleError(p, err);
    }
  };
  const expectedRoot = path.join(scope.root, ".agents/skills");
  try {
    await check(expectedRoot);
  } catch (err) {
    handleError(expectedRoot, err);
  }
  await walk(scope.root, 0, new Set());
  signal?.throwIfAborted();
  result.finishedAt = new Date().toISOString();
  return result;
}
