import * as fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import lockfile from "proper-lockfile";
import {
  PreferencesSchema,
  SnapshotSchema,
  type Scope,
  type Snapshot,
} from "../shared/model.js";
import type { HubMessageCode, Locale } from "../shared/messages.js";
export class Store {
  locale: Locale = "en";
  scope: Scope | null = null;
  snapshot: Snapshot | null = null;
  warning: HubMessageCode | null = null;
  private release: (() => Promise<void>) | undefined;
  constructor(public directory: string) {}
  async init() {
    await fs.mkdir(this.directory, { recursive: true, mode: 0o700 });
    await fs.chmod(this.directory, 0o700);
    this.release = await lockfile.lock(this.directory, {
      realpath: true,
      retries: 0,
      stale: 10000,
      update: 2000,
    });
    try {
      try {
        const locale = JSON.parse(
          await fs.readFile(path.join(this.directory, "locale.json"), "utf8"),
        );
        if (locale === "zh-TW") this.locale = locale;
      } catch {
        // A missing or unreadable language preference defaults to English.
      }
      try {
        this.scope = PreferencesSchema.parse(
          JSON.parse(
            await fs.readFile(
              path.join(this.directory, "preferences.json"),
              "utf8",
            ),
          ),
        ).scope;
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "ENOENT")
          throw new Error(
            "Could not read Hub preferences. Back up the data directory before repairing it. Hub will not overwrite it.",
          );
      }
      try {
        const snapshot = SnapshotSchema.parse(
          JSON.parse(
            await fs.readFile(
              path.join(this.directory, "snapshot.json"),
              "utf8",
            ),
          ),
        );
        if (snapshot.scope.revision === this.scope?.revision)
          this.snapshot = snapshot;
        else {
          this.warning = "scope-changed";
          await fs.rm(path.join(this.directory, "snapshot.json"), {
            force: true,
          });
        }
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "ENOENT")
          this.warning = "snapshot-unreadable";
      }
      // Remove only our own interrupted write files while holding the writer lock.
      for (const name of await fs.readdir(this.directory))
        if (
          /^\.(preferences|snapshot|locale)\.json\.[0-9a-f-]+\.tmp$/.test(name)
        )
          await fs.rm(path.join(this.directory, name), { force: true });
    } catch (err) {
      await this.close();
      throw err;
    }
  }
  async atomic(name: string, value: unknown) {
    const temp = path.join(this.directory, `.${name}.${randomUUID()}.tmp`);
    let renamed = false;
    try {
      const handle = await fs.open(temp, "wx", 0o600);
      try {
        await handle.writeFile(JSON.stringify(value));
        await handle.sync();
      } finally {
        await handle.close();
      }
      await fs.rename(temp, path.join(this.directory, name));
      renamed = true;
      const dir = await fs.open(this.directory, "r");
      try {
        await dir.sync();
      } finally {
        await dir.close();
      }
    } finally {
      if (!renamed) await fs.rm(temp, { force: true });
    }
  }
  async setScope(scope: Scope) {
    await this.atomic("preferences.json", { schemaVersion: 1, scope });
    this.scope = scope;
    this.snapshot = null;
    this.warning = null;
    // Preferences revision is committed first: restart never displays a previous scope.
    await fs.rm(path.join(this.directory, "snapshot.json"), { force: true });
  }
  async saveSnapshot(snapshot: Snapshot) {
    SnapshotSchema.parse(snapshot);
    if (snapshot.scope.revision !== this.scope?.revision)
      throw new Error("scope revision mismatch");
    await this.atomic("snapshot.json", snapshot);
    this.snapshot = snapshot;
    this.warning = null;
  }
  async setLocale(locale: Locale) {
    await this.atomic("locale.json", locale);
    this.locale = locale;
  }
  async close() {
    await this.release?.();
    this.release = undefined;
  }
}
