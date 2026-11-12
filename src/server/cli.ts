import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { createApp } from "./app.js";
const args = process.argv.slice(2);
const value = (flag: string) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};
const directory = path.resolve(
  value("--data-dir") ??
    path.join(
      os.homedir(),
      "Library",
      "Application Support",
      "AI Engineering Hub",
    ),
);
try {
  const hub = await createApp({ directory });
  const url = await hub.start(Number(value("--port") ?? 0));
  // Only the interactive launcher displays the one-time bootstrap URL; server logs never do.
  console.log(
    `AI Engineering Hub\n${url}\nLocal access only. Press Ctrl+C to stop Hub.`,
  );
  if (!args.includes("--no-open") && process.platform === "darwin") {
    const child = spawn("open", [url], { stdio: "ignore" });
    child.on("error", () =>
      console.log("Open the link above in your browser."),
    );
    child.unref();
  }
  let closing = false;
  const close = async () => {
    if (closing) return;
    closing = true;
    await hub.app.close();
    process.exit(0);
  };
  process.on("SIGINT", close);
  process.on("SIGTERM", close);
} catch {
  console.error(
    "Hub could not start. Check your Node.js version, make sure the data directory is writable, and check whether another Hub process is using it.",
  );
  process.exitCode = 1;
}
