# AI Engineering Hub

**English** · [繁體中文](README.zh-TW.md)

A local-first tool for exploring and understanding configuration across AI coding agents.

The first milestone is a **local web UI on macOS for read-only exploration of Codex project Skills**. Support for Cursor, Claude Code, MCP, and Rules is planned for the full MVP.

## Run locally

With Node.js 24 LTS and npm installed, run these commands from the repository root:

```sh
npm ci
npm run build
npm start
```

Hub listens on a local loopback port and opens your browser. If the browser does not open, use the one-time link printed in the terminal. Keep the terminal running and press Ctrl+C to stop Hub. Closing the browser tab leaves Hub running.

Once installed and built, Hub starts and scans without an account or internet access. This version is available from source.

The interface defaults to English. Choose **繁體中文** from the language menu at the top right. Hub saves the choice in its local data directory and restores it on the next launch.

## Explore your first project

1. Open **Scan scope** and enter an absolute project path. You can also exclude paths within the project.
2. Select **Preview scan scope** to review the resolved path and the `.agents/skills` source, then select **Confirm scope and scan**.
3. Use the dashboard to search Skills and inspect their source paths, configuration links, and original text.
4. Select **Rescan** after changing configuration files. Hub restores the latest snapshot when it restarts.

For a quick demo, enter the absolute path to `fixtures/project` in this repository. It contains two example Skills.

## Local data and limits

- Hub stores data in `~/Library/Application Support/AI Engineering Hub` by default.
- It saves `preferences.json`, the language choice in `locale.json`, and a redacted `snapshot.json`. It accesses agent and project configuration in read-only mode.
- Hub scans one project at a time, including nested projects, for `.agents/skills/**/SKILL.md`. User-level configuration and other agents are outside the current milestone.
- Each Skill requires valid YAML frontmatter with a nonempty `name` and `description`.
- The preview displays Skill content as plain text. It does not render embedded HTML, run scripts, or load remote images.
- Diagnostics report out-of-scope symlinks, invalid formats, and read failures. A partial snapshot omits stale entries from sources that failed in the current scan.
- The scanner limits files to 1 MiB, traversal to 10,000 entries, and depth to 24 levels. It skips `.git`, `node_modules`, `dist`, and `.hub-data`. Performance on large projects has yet to be verified.
- Redaction is best effort. Treat snapshots as private because arbitrary text can contain secrets Hub does not detect.

To use a separate data directory or a fixed port:

```sh
npm start -- --data-dir /tmp/ai-hub-demo --port 4318 --no-open
```

Keep the data directory outside the scanned project. Only one Hub process can write to a given data directory at a time. The startup link expires after five minutes and can be exchanged for a session once. Use the new link after restarting Hub.

## Development and verification

```sh
npm run typecheck
npm test
npm run build
```

`npm run dev` builds and launches Hub. Tests create configuration files in temporary directories. See the [milestone 1 verification report](docs/milestone-1-verification.md) in Traditional Chinese.

## Specifications and design

The current design documents are in Traditional Chinese:

- [Product specification v1](docs/product-specification-v1.md)
- [MVP configuration support](docs/configuration-support-v1.md), which lists the sources and limits planned for the full MVP
- [Technical architecture v1](docs/technical-architecture-v1.md), which covers the data model, scan strategy, and implementation order
