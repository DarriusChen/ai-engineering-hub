# Milestone 1 — Codex project Skills

日期：2026-11-12。狀態：第一條端到端流程已實作與驗證；完整 MVP 尚未完成。

## 已完成

- React / Vite Web UI、Fastify local service、CLI launcher 與共用 TypeScript 資料契約。
- 輸入單一專案與排除路徑、預覽 canonical root、確認後唯讀掃描 Codex project Skills。
- Source / Resource / Configuration Instance 模型；symlink 與 hard link 共用來源、同名獨立資源保留分開。
- Dashboard 搜尋、Resource Detail、來源與 scope、掃描時間、partial diagnostics。
- versioned JSON、scope revision、單一 writer lock、寫入暫存與 rename、重啟還原。
- loopback、bootstrap session、Host / Origin / CSRF 檢查；UI 純文字呈現與 best-effort redaction。

## 驗證環境

- macOS 26.5.2，arm64。
- Node.js 24.14.1，npm 11.19.1。
- React 19.3.1、Vite 7.3.8、Fastify 5.12.8、TypeScript 5.9.3；其餘精確版本見 package-lock.json。
- 瀏覽器：Codex 內建瀏覽器；檢查約 718px 窄版與 1280px 桌面 viewport。未宣稱已驗證 Safari、Chrome 的各個版本。

## 執行結果

| 檢查 | 結果與證據 |
| --- | --- |
| `npm run typecheck` | 通過前端及 server TypeScript 檢查 |
| `npm test` | 6 組測試全部通過；使用 temporary filesystem fixtures |
| `npm run build` | 通過 server compile 與 production UI build |
| 瀏覽器首次流程 | 指定 repo 的 fixtures/project，預覽來源、確認 scan，顯示 code-review 與 test-planning 兩筆真實檔案資源 |
| 搜尋與詳情 | 搜尋 test-planning 剩一筆；詳情顯示對應 SKILL.md 路徑與原始文字 |
| 重新載入 | 清除搜尋後 reload，仍顯示兩筆資源與已保存的 scan timestamp |
| 視覺檢查 | 桌面為列表與詳情雙欄；窄版為上下排列；桌面 scrollWidth 與 viewport 同為 1280，沒有水平溢出 |
| Browser logs | 本次查看的 warning / error logs 為空 |

6 組測試涵蓋：

1. 真實 Skill 解析、同名來源、symlink / hard link、排除、越界、loop 與無效格式。
2. 合成秘密 redaction、內容更新 ID、刪除反映與已 abort 的 scan。
3. storage 重新開啟、writer lock、失敗寫入不覆蓋既有 snapshot、scope revision 與毀損 snapshot。
4. API 未登入、Host / Origin / CSRF 拒絕、一次性 session、preview / confirm、真實 scan 與保存還原。
5. 巢狀專案 base directory、來源缺失、root symlink 與目標變更。
6. partial rescan 不混入舊 entries、毀損 preferences 不靜默覆寫。

## 驗證限制與後續工作

- 驗證僅涵蓋 Codex project Skills；其他 adapters、user scope、MCP、Rules 與多專案 onboarding 尚未實作。
- 未測量大型 repository 的記憶體與延遲。初始上限為 1 MiB / file、10,000 traversal entries、24 層；需後續實測調整。
- 尚未實測所有 OS 權限／ACL 組合、檔案在每個開啟瞬間被惡意替換的 race、process 強制中止／斷電，以及磁碟耗盡後的 durability。
- 有 file metadata、realpath 與 descriptor 檢查，但不宣稱是能對抗同使用者惡意 process 的 filesystem sandbox。
- hard link 的 ID 在同次掃描中共用；跨 scan 代表 path 消失時不保證保持原 ID。
- 讀取中變動目前回報 diagnostic，需手動重掃；尚未加入自動重試。
- 靜態資源隨 build 提供，沒有外部 CDN 或 runtime API 依賴；本次沒有切斷電腦網路進行離線測試。
- 純文字預覽不會渲染 Markdown HTML 或圖片；redaction 不能保證識別任意文字中的所有秘密，snapshot 不應公開分享。
- 尚未測試 npm package 發布／安裝、Intel Mac、其他 macOS 版本與各瀏覽器版本。

下一步依 Technical Architecture 第 4.4 節，加入 Cursor 對同一 `.agents/skills/` 來源的關聯，驗證一個 Resource 與兩個 agents 的呈現。
