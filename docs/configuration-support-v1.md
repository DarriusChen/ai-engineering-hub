# MVP 配置支援表

查核日期：2026-11-11。對應 [Product Specification v1](product-specification-v1.md)。

狀態：v1 讀取目標與限制已由使用者確認（2026-11-11）；文件來源已查核，目前僅 Codex project Skills parser 已實作並用 fixtures 驗證；其餘來源尚未實作。下列「納入」代表 MVP 設計範圍，不代表現有產品已支援。所有讀取限於使用者選定範圍。

## 本機檔案讀取目標

`~` 代表目前使用者的 home directory；專案相對路徑以選定專案為起點。巢狀設定須保留所在子目錄，不推導執行時是否生效。

| Agent | 類型 | 使用者層級來源 | 專案來源 | 讀取邊界 |
| --- | --- | --- | --- | --- |
| Cursor | Skills | `~/.cursor/skills/`、`~/.agents/skills/` | `.cursor/skills/`、`.agents/skills/` | 讀取 `SKILL.md` 與 metadata；其他相容目錄依下方限制處理 [C1] |
| Cursor | MCP | `~/.cursor/mcp.json` | `.cursor/mcp.json` | 讀取 `mcpServers` 配置，不呼叫 Extension API 或連線測試 [C2] |
| Cursor | Rules／指令 | UI User Rules 不納入自動讀取 | `.cursor/rules/` 中的 `.mdc`、`AGENTS.md` | User Rules 顯示未支援讀取，不顯示為零；Team Rules 不納入 [C3] |
| Codex | Skills | `~/.agents/skills/` | `.agents/skills/`，包含選定範圍內的子目錄 | 讀取 `SKILL.md`；系統與 plugin 來源不承諾完整探索 [O1] |
| Codex | MCP | `~/.codex/config.toml` | `.codex/config.toml` | 僅整理 `mcp_servers`；不把找到配置等同專案已受信任或已載入 [O2] |
| Codex | Rules／指令 | `~/.codex/AGENTS.md`、`AGENTS.override.md` | `AGENTS.md`、`AGENTS.override.md` | 各自呈現來源與內容，不計算最終指令；自訂 fallback 檔名留待驗證 [O3] |
| Claude Code | Skills | `~/.claude/skills/` | `.claude/skills/`，包含選定範圍內的子目錄 | 讀取 `SKILL.md`，不執行動態內容 [A1] |
| Claude Code | MCP | `~/.claude.json` 的使用者 MCP 條目 | `.mcp.json`；以及 `~/.claude.json` 中對應選定專案的 MCP 條目 | 區分 user、project、local 原始 scope；不收集未選專案的配置或整份檔案的無關資料 [A2] |
| Claude Code | Rules／指令 | `~/.claude/CLAUDE.md`、`~/.claude/rules/` | `CLAUDE.md`、`.claude/CLAUDE.md`、`CLAUDE.local.md`、`.claude/rules/`；`AGENTS.md`、`.claude/AGENTS.md` | 保留原始名稱；AGENTS.md 支援依版本而異，不推定載入；不自動展開越界 imports [A3] |

## 必須揭露的限制

- **來源位置不等於作用範圍**：Claude Code 的 local MCP 條目位於 home directory，但只對應特定專案。介面同時保存來源路徑、原始 scope 與專案關聯。[A2]
- **共用來源不等於重複安裝**：Cursor 與 Codex 都有文件化的 `.agents/skills/` 來源。保留 agent 關聯，避免把同一實體檔案標成多份安裝；跨來源內容去重仍不在 MVP。[C1][O1]
- **無法讀取不等於不存在**：Cursor 的 UI User Rules 沒有在本次文件查核中建立可供 Hub 使用的穩定檔案讀取契約，不讀取私有應用資料庫來補足。[C3]
- **不模擬 agent 執行環境**：不解析最終優先序、不展開秘密環境變數、不執行 MCP 指令或 Skill 腳本；本機 MCP 配置即使指向遠端 URL，也可列出配置，但不連線。
- **選定範圍優先**：父目錄、symlink 或指令 imports 指向範圍外時，不自動擴大掃描。顯示未讀取來源，使用者可調整範圍後重新掃描。
- **其他配置來源需個別驗證**：Cursor 相容的其他 agent Skills 目錄、舊版 `.cursorrules`、Codex 自訂 home／fallback、plugin cache 與動態註冊來源，會在個別驗證後才納入自動探索。使用者仍可手動指定已支援格式的檔案，但 Hub 找到該檔案，不代表 agent 已載入它。
- **分類保留語意**：Hub 的 Rules／指令是展示分類。Codex 的執行政策規則、hooks、subagents、一般設定全集與自動記憶不因此成為本次讀取目標。

## 實作前需完成的相容性驗證

記錄三個 agents 的測試版本、macOS 版本、處理器架構與瀏覽器版本；以合成配置驗證上表各類型、巢狀來源、相同檔案關聯、無效格式、權限失敗與憑證遮蔽。若官方文件與實際版本有差異，標示差異，不默默擴大或縮減產品承諾。

## 官方來源

- [C1：Cursor Skills](https://cursor.com/docs/skills)
- [C2：Cursor MCP](https://cursor.com/docs/mcp)
- [C3：Cursor Rules](https://cursor.com/docs/rules)
- [O1：OpenAI Skills](https://learn.chatgpt.com/docs/build-skills)
- [O2：OpenAI MCP](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)
- [O3：OpenAI AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- [A1：Claude Code Skills](https://code.claude.com/docs/en/skills)
- [A2：Claude Code MCP](https://code.claude.com/docs/en/mcp)
- [A3：Claude Code Memory／Instructions](https://code.claude.com/docs/en/memory)
