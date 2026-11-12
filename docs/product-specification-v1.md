# AI Engineering Hub — Product Specification v1

狀態：v1 已定稿（2026-11-11）。產品範圍、配置支援限制與驗收條件均已由使用者確認；第一個 Codex project Skills 里程碑已於 2026-11-12 實作；完整 MVP 尚未完成。
更新日期：2026-11-12

## 文件流程與決策狀態

依序確認每章，再將使用者確認的內容寫入。明確區分已確認原則、待確認提案及尚未討論的範圍。過往對話中的助手建議不自動構成產品承諾。

| 順序 | 章節 | 狀態 |
| --- | --- | --- |
| 1 | Product Vision & Positioning | 已確認 |
| 2 | Target Users & Core Problems | 已確認 |
| 3 | User Journey & Onboarding | 已確認 |
| 4 | Information Architecture | 已確認 |
| 5 | MVP Scope & Non-goals | 已確認 |
| 6 | 全文整合與一致性檢查 | 已完成並確認 |

## 文件用語

說明文字以繁體中文為主；技術術語優先保留慣用英文，例如 symlink、scope、metadata、cache、parser、runtime、fallback、plugin、hooks 與 subagents。Scope 指配置的作用範圍；掃描範圍、產品範圍等一般描述仍使用中文。保留各 agent 的官方名稱與原始欄位，不以翻譯掩蓋語意差異。

## 已確認的核心原則

以下依據本次使用者指示記錄：

- 核心為 local-first、跨 coding agent 的環境探索、可視化與配置洞察。
- 開發順序以呈現環境 Dashboard 為先，先讓使用者看清既有環境，再逐步評估管理能力。
- Personal Toolkit 為附屬功能，不主導產品定位；已確認延後至 MVP 之後評估。
- 公開 Skills Registry 為獨立產品；本規格不將其建置納入 Hub。
- Read before write：先可靠理解既有環境，再評估修改能力；管理、部署或同步不因願景描述而自動納入 MVP。
- 避免 feature creep：先釐清願景，每項功能必須對應核心使用問題，逐章確認後才形成規格。
- 本文件定義產品範圍；實作依另行確認的 Technical Architecture 與里程碑進行。

## 1. Product Vision & Positioning

狀態：已確認（2026-11-11）。使用者確認產品定位符合開發順序，並明確指定優先呈現環境 Dashboard。

> AI Engineering Hub 是一個開源、local-first 的跨 AI coding agent 環境探索與配置洞察工具，協助開發者從既有本機設定中，看清資源分布、來源及配置差異，理解自己的 AI coding 環境。

核心價值：

- **Visibility**：看見不同 agent 與專案中的資源及設定來源。
- **Clarity**：理解資源的配置 scope、關聯與差異，並清楚標示無法確認的資訊。
- **Control（長期方向）**：以可信的環境理解為基礎，逐步評估可預覽、由使用者控制的操作。

開發優先順序：先呈現環境 Dashboard，建立對既有環境的可視性與理解；統一管理保留為長期方向。Dashboard 的資訊與互動範圍見第 3–5 章，願景不構成所有分析或管理功能的承諾。

Local-first 資料邊界、首批 agents、平台與 MVP 能力見第 5 章；配置格式與 scope 支援目標見配置支援表，實際相容性待技術驗證。

## 2. Target Users & Core Problems

狀態：已確認（2026-11-11）。使用者認同以已有使用經驗的個人開發者為優先，並指出使用這些配置前應具備 agent 的基本認識。

優先服務已使用 AI coding agent、且已有本機設定與專案的個人開發者；以跨 agent 或跨專案的環境理解需求為優先，同時讓單一 agent 使用者也能從 Dashboard 得到價值。

使用前提：使用者具備 agent 的基本認識，能理解自己正在查看的設定與使用情境。第一版以理解既有環境為主要任務，新手從零建立第一套 agent 環境並非主要使用情境。

優先解決的問題：

- 我目前配置了哪些資源？
- 這些資源來自哪裡，配置在哪個 agent、專案或範圍？
- 不同環境的配置有哪些差異，哪些資訊尚無法確認？

上述問題由第 3–5 章的資源探索、篩選與來源追溯回應；自動差異分析不納入 MVP。

## 3. User Journey & Onboarding

狀態：已確認（2026-11-11）。使用者確認以下首次使用與再次開啟流程符合預期。

首次使用的主要成果：使用者能從自己選定的本機環境中，看到可追溯來源的資源概況。

1. **選擇 agents**：呈現已偵測的候選設定來源，讓使用者選擇探索對象；未偵測到時可手動指定路徑。
2. **指定專案範圍**：加入專案母目錄或獨立專案，設定排除路徑。
3. **確認讀取範圍**：預覽將讀取的 agent 設定來源與專案範圍，再開始掃描。
4. **唯讀掃描**：整理既有配置；讀取失敗、未支援或無法判定的來源應明確呈現，不當作不存在或已生效。
5. **進入環境 Dashboard**：查看資源概況，依 agent、專案或配置 scope 縮小查看範圍，進一步查看資源來源與內容。具體分類與頁面結構於第 4 章確認。

再次開啟時，保留已選的探索範圍，直接進入 Dashboard，提供重新掃描與修改範圍的入口；清楚標示資料的掃描時間與結果狀態。依已確認的 MVP 邊界，第一版採手動重新掃描。

已確認主流程：選擇 agents → 指定專案 → 確認讀取範圍 → 唯讀掃描 → Dashboard。

## 4. Information Architecture

狀態：已確認（2026-11-11）。使用者確認以 Dashboard 為主入口、資源詳情向下深入，搭配探索範圍設定的架構。

### 4.1 頁面與入口

| 位置 | 用途 |
| --- | --- |
| 環境 Dashboard（預設首頁） | 同一頁呈現環境概況與資源探索；依 Skills、MCP、Rules 分類，提供搜尋及 Agent、Project、Scope 篩選 |
| 資源詳情（由 Dashboard 進入） | 查看資源內容、來源路徑，以及各個 configuration instance 所屬的 agent、專案與範圍 |
| 探索範圍設定 | 調整選定 agents、設定來源、專案母目錄、獨立專案與排除路徑；範圍變更後可預覽並重新掃描 |

掃描時間、完成或部分失敗狀態及重新掃描入口放在 Dashboard；不另設獨立掃描中心。Agents 與 Projects 先作為篩選維度，不要求使用者先進入 agent 或專案頁才能探索資源。

### 4.2 資訊呈現原則

- Resource Type、Agent、Project、Scope 為不同的結構化屬性；即使視覺上使用標籤呈現，也不混為自由標籤。
- Agent、Project、Scope 與來源路徑描述的是具體 configuration instance。同名資源可能有不同內容或來源，不僅憑名稱合併。
- 找到設定不等於確認 agent 已載入或執行；無法確認的狀態明確標示。
- 資源類型與來源讀取目標見配置支援表；跨實例自動比較與差異分析不納入 MVP。

Personal Toolkit 不納入 MVP，因此第一版不設其導航入口；公開 Skills Registry 維持獨立產品邊界。

已確認架構：Dashboard 為主入口、資源詳情向下深入、探索範圍設定為輔。

## 5. MVP Scope & Non-goals

狀態：MVP 功能邊界、Non-goals、首批 agents、作業系統、交付形式與 local-first 資料邊界已確認（2026-11-11）。第一版以本機 Web UI 加本機掃描服務交付，正式支援 macOS 上的 Cursor、Codex、Claude Code，聚焦唯讀 Dashboard、資源探索與來源追溯。配置支援表的讀取限制與驗收條件亦已確認；本章已定稿；目前實作進度與驗證範圍見 milestone-1-verification.md。

### 5.1 MVP 成果與範圍

第一版成果：使用者能完成範圍設定與唯讀掃描，在 Dashboard 找到真實本機資源，並追溯每筆配置的來源。

| 納入項目 | 最小範圍 |
| --- | --- |
| 首次設定 | 選擇 agents、手動指定來源、加入專案母目錄或獨立專案、排除路徑及掃描前預覽 |
| 唯讀環境掃描 | 讀取明確支援的 Skills、MCP、Rules 配置；只探索選定範圍，不修改 agent 或專案設定 |
| 環境 Dashboard | 資源概況與分類清單、搜尋、Agent / Project / Scope 篩選 |
| 資源詳情 | 內容、來源路徑、configuration instance 及可確認的 agent / 專案 / 範圍資訊 |
| 掃描狀態 | 最近掃描時間、無資源、部分失敗、未支援及無法判定等狀態 |
| 再次使用 | 保存 Hub 的探索範圍與最近掃描結果，直接進入 Dashboard，提供手動重新掃描及範圍調整 |

配置洞察先做到分布、來源與範圍可查，讓使用者查看各實例內容；自動判定差異、重複或衝突留待後續。

首批 agents 已確認（2026-11-11）：Cursor、Codex、Claude Code。此決策定義產品支援對象，不代表所有版本、資源格式、執行環境均已驗證；各 agent 的資源類型及 scope 支援目標見已確認的配置支援表。未以市場占有率作為已驗證事實。

Local-first 資料邊界已確認（2026-11-11）：

- 不需帳號，核心掃描與查看流程可離線使用。
- 配置內容與掃描結果留在本機，不上傳。
- Hub 保存自己的探索範圍與最近掃描結果，不修改被探索的 agent 或專案設定。
- 只讀取配置，不執行其中的指令或啟動 MCP server；已辨識的憑證欄位遮蔽顯示。具體辨識與遮蔽方式在技術設計階段界定，不承諾能自動識別所有任意文字中的秘密。

### 5.2 第一版 Non-goals

- 編輯、安裝、部署、停用或刪除資源；跨 agent 自動同步與批次套用。
- 自動去重、文字 Diff、語意衝突判定與設定優先序推導。
- 即時監看、自動背景重新掃描、工具實際呼叫次數或執行狀態監控。
- Personal Toolkit 收藏與整理、匯出功能；保留為後續候選，不承諾版本時程。
- 公開 Skills Registry 的搜尋、投稿、審核與市場功能；Registry 維持獨立產品。
- 雲端同步、團隊權限與協作、從零安裝或教學設定 agent。
- Linux / Windows / WSL 的正式支援與桌面 App 發行；列為後續候選，不承諾版本時程。

### 5.3 Acceptance Criteria（已確認）

以下 Acceptance Criteria 已由使用者確認（2026-11-11）；第一個里程碑已完成部分驗證，整份 MVP 驗收尚未完成。

| ID | 情境 | 通過條件 |
| --- | --- | --- |
| AC-01 | 首次使用 | 可選擇三個 agents 的來源、加入專案及排除路徑，在預覽範圍後啟動掃描 |
| AC-02 | 探索資源 | 配置支援表涵蓋的有效測試檔案出現在正確分類，可搜尋與依 Agent / Project / Scope 篩選，詳情能核對來源與內容 |
| AC-03 | 範圍與唯讀 | 排除路徑及未選範圍不被掃描；原始設定內容不變，不執行配置指令、不啟動 MCP server |
| AC-04 | 部分失敗 | 無效格式或無權限的來源有清楚狀態，其餘結果仍可查看；沒有資源、未支援與讀取失敗可區分 |
| AC-05 | 再次使用 | 重新開啟保留探索範圍與最近結果，顯示掃描時間；外部修改後手動重掃能反映新增、修改與刪除 |
| AC-06 | Local-first | 已安裝 Hub 後，無帳號且離線仍可完成核心流程；配置及結果不外傳，已辨識的憑證欄位不以明文顯示 |
| AC-07 | 資訊可信度 | 不以配置存在宣稱已生效；Claude Code local MCP 正確關聯選定專案；共用檔案不誤報為多份安裝 |

### 5.4 配置探索範圍（已確認）

使用者於 2026-11-11 確認以下產品邊界：

- 優先讀取目前使用者層級與選定專案內的本機 Skills、MCP、Rules／指令文件，保留各 agent 的原始類型名稱與來源資訊。
- 允許手動指定同類本機設定來源；不因此承諾能解析任意格式。
- 遠端 SSH、容器內環境及企業集中管理來源的完整探索留待後續。
- 呈現已讀取的配置，不推導最終生效順序或執行狀態，不假定三者一一對應。

具體來源、原始 scope、格式與限制見 [MVP 配置支援表](configuration-support-v1.md)。該表已對照官方文件，尚未實作或實機驗證；其中 Cursor UI User Rules 等不可按一般檔案讀取的項目，須在產品中明示未支援。

### 5.5 作業系統與交付形式（已確認）

決策（2026-11-11）：第一版正式支援 macOS，採本機 Web UI 加本機掃描服務。使用者啟動 Hub 後，在同一部電腦的瀏覽器探索環境。Linux、Windows、WSL 與桌面 App 留待後續評估。

以下保留選型理由與比較作為決策背景。

平台支援與介面形式分開決策。Web UI 若搭配本機掃描服務，仍需處理各作業系統的檔案路徑、權限與安裝；桌面 App 也可以使用 Web UI。純瀏覽器頁面的檔案讀取受使用者選取與授權限制，不適合直接承擔既定的自動發現體驗。

| 方案 | 主要取捨 |
| --- | --- |
| macOS 優先驗證 | 縮小實機測試、安裝與問題排查範圍；需明示其他平台尚未正式支援，並將路徑與平台整合集中處理以利後續移植 |
| 同時支援 macOS / Linux / Windows | 擴大可用族群；需驗證三種 agent 在各平台的來源、路徑、權限及安裝流程，另定義 Windows 原生與 WSL 的邊界 |
| 本機 Web UI + 本機服務 | 使用者啟動工具後在瀏覽器查看；適合先驗證 Dashboard，仍須處理服務生命週期、連接埠、僅本機存取與請求驗證 |
| 桌面 App | 安裝與啟動體驗可整合，方便原生目錄選擇；增加打包、簽署、發布與平台測試工作 |

設計方向：掃描與介面分離，將平台相關的路徑處理集中設計，保留後續跨平台與桌面包裝的空間。這不代表預先實作多套交付方式，也不保證後續封裝完全不需修改；具體框架與安裝方式在技術設計階段決定。

參考依據：

- [瀏覽器 File System Access API](https://developer.chrome.com/docs/capabilities/web-apis/file-system-access)：檔案選取與授權限制。
- [Electron](https://www.electronjs.org/docs/latest)：以 Chromium 與 Node.js 提供跨平台桌面應用。
- [Tauri prerequisites](https://tauri.app/start/prerequisites/) 與 [WebView 差異](https://v2.tauri.app/reference/webview-versions/)：不同平台的工具鏈與系統 WebView。
- [Microsoft WSL 檔案系統說明](https://learn.microsoft.com/en-us/windows/wsl/filesystems)：Windows 與 Linux 環境的路徑及檔案系統差異。
- [桌面應用簽署與 notarization](https://github.com/electron/electron/blob/main/docs/tutorial/code-signing.md)：發行桌面 App 時需評估的平台工作。

## 6. 全文整合與一致性檢查

v1 已整合並定稿。已檢查以下一致性：

- 目標使用者的環境理解問題，對應 Dashboard、篩選、資源詳情與來源追溯。
- 首次探索與再次開啟流程，都有 MVP 範圍及驗收條件對應。
- 管理、比較、Personal Toolkit 與公開 Registry 沒有因願景或架構描述而混入 MVP。
- macOS、本機 Web UI、三個 agents 與 local-first 邊界一致。
- 配置支援表區分文件化來源、Hub 讀取目標與尚未驗證的相容性；不將找到配置等同 agent 已載入。

使用者已接受第 5.3 節 Acceptance Criteria 與配置支援表的讀取限制。後續若調整產品範圍，應明確記錄變更原因與決策，不將候選功能直接加入 MVP。

後續技術設計需處理：最低 macOS 版本、處理器與瀏覽器測試範圍、agent 測試版本、安裝方式、解析與路徑邊界、本機服務存取控制、憑證遮蔽及 cache 策略。這些事項不代表現在開始實作，也不擴增產品範圍。

## 來源與 repo 檢查

- [前次討論：開源Toolkit架構設計](chatgpt-conversation://6af41a53-a9cc-83e8-b785-da97d4f01904)：作為討論脈絡；提案與使用者決策分開處理。
- 本次使用者指示：依序確認產品定位、目標使用者、User Journey、Information Architecture、MVP / Non-goals，再逐段建立文件。
- 2026-11-11：本機 repo 無既有檔案與 commits，GitHub Contents API 回覆 repository is empty，無既有產品文件可合併。
- 遠端 repository：https://github.com/DarriusChen/ai-engineering-hub
