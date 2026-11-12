# AI Engineering Hub

[English](README.md) · **繁體中文**

開源、local-first 的跨 AI coding agent 環境探索、可視化與配置洞察工具。

目前已完成第一個內部里程碑：**macOS 本機 Web UI，唯讀探索 Codex project Skills**。Cursor、Claude Code、MCP 與 Rules 仍依產品規格逐步實作，尚未發布完整 MVP。

## 本機啟動

需要 Node.js 24 LTS（本次驗證為 24.14.1）與 npm。在 repo 根目錄執行：

```sh
npm ci
npm run build
npm start
```

Hub 在 loopback 啟動，使用可用的本機 port，自動開啟瀏覽器。若瀏覽器沒有開啟，使用終端機顯示的一次性連結。保持終端機運作，按 Ctrl+C 停止；關閉分頁不會停止服務。

安裝與 build 完成後，啟動與核心掃描不需帳號或外部網路。這個版本不提供公開 npm package。

介面預設為英文。可在右上角切換成「繁體中文」，Hub 會將選擇保存在本機資料目錄，下次啟動時自動套用。

## 第一次探索

1. 在「探索範圍」輸入專案絕對路徑，可加入專案內的排除路徑。
2. 預覽實際路徑與 `.agents/skills` 來源，確認後開始掃描。
3. 在 Dashboard 搜尋 Skills，查看來源路徑、配置關聯與原始文字。
4. 外部配置變更後手動重新掃描；重啟會保留最近 snapshot。

Repo 的 `fixtures/project` 有兩個示範 Skills，可用來測試。輸入它的絕對路徑即可，不需要使用真實個人配置。

## 本機資料與限制

- 預設資料目錄：`~/Library/Application Support/AI Engineering Hub`。
- 保存 `preferences.json` 、語言偏好 `locale.json`，以及經遮蔽處理的 `snapshot.json`；不寫入 agent 或 project 配置。
- 一次選定一個 project，只讀取其中（含巢狀目錄）的 `.agents/skills/**/SKILL.md`。不探索 user scope 或其他 agents。
- 每個 Skill 需要有效 YAML frontmatter，包含非空的 `name` 與 `description`。
- 將內容作為純文字顯示，不執行 Markdown 中的 HTML、script 或遠端圖片。
- 越界 symlink、無效格式與讀取失敗會顯示 diagnostics。Partial snapshot 不混入失敗來源的舊 entries。
- Scanner 上限：單檔 1 MiB、10,000 個探索 entries、24 層深度；略過 `.git`、`node_modules`、`dist`、`.hub-data`。這是初始限制，尚未完成大型專案效能驗證。
- Redaction 是 best-effort，不保證識別任意文字中的所有秘密；請勿把 snapshot 當成可公開分享的資料。

可指定獨立的測試資料目錄或固定 port：

```sh
npm start -- --data-dir /tmp/ai-hub-demo --port 4318 --no-open
```

資料目錄必須位於被掃描專案之外。同一個資料目錄只能由一個 Hub process 寫入。啟動連結五分鐘內有效且僅能交換一次 session；服務重啟後請使用新連結。

## 開發與驗證

```sh
npm run typecheck
npm test
npm run build
```

`npm run dev` 目前是 build 後啟動，尚未提供 HMR。測試在 temporary directories 建立配置，不掃描開發者的 home directory。

詳見 [第一個里程碑驗證報告](docs/milestone-1-verification.md)。

## 規格與設計

- [Product Specification v1](docs/product-specification-v1.md)：已定稿的產品範圍。
- [MVP 配置支援表](docs/configuration-support-v1.md)：完整 MVP 的來源目標與限制，並非目前所有項目都已實作。
- [Technical Architecture v1](docs/technical-architecture-v1.md)：已定稿的系統結構、資料模型、掃描策略與實作順序。
