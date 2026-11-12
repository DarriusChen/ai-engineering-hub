export type Locale = "en" | "zh-TW";

export const hubMessages = {
  "outside-scope": {
    en: "The source is outside the confirmed scope.",
    "zh-TW": "來源超出已確認的範圍。",
  },
  excluded: {
    en: "The source is excluded from the scan.",
    "zh-TW": "來源在排除範圍內。",
  },
  "invalid-format": {
    en: "SKILL.md requires valid YAML frontmatter with a name and description.",
    "zh-TW": "SKILL.md 需要有效的 YAML frontmatter、name 與 description。",
  },
  "changed-during-scan": {
    en: "The source changed during the scan. Please rescan.",
    "zh-TW": "掃描時來源已變更，請重新掃描。",
  },
  "not-regular-file": {
    en: "Only regular files are supported.",
    "zh-TW": "僅支援一般檔案。",
  },
  "limit-reached": {
    en: "The scan reached a limit. Results may be incomplete.",
    "zh-TW": "已達掃描限制，結果可能不完整。",
  },
  "symlink-loop": {
    en: "A directory symlink loop was detected.",
    "zh-TW": "偵測到目錄連結循環。",
  },
  missing: {
    en: "The source could not be found.",
    "zh-TW": "找不到此來源。",
  },
  "read-failed": {
    en: "Could not read the source. Check its path and permissions.",
    "zh-TW": "無法讀取來源，請檢查路徑與權限。",
  },
  "invalid-host": {
    en: "This local host is not allowed.",
    "zh-TW": "不允許的本機 host。",
  },
  "invalid-origin": {
    en: "This request origin is not allowed.",
    "zh-TW": "不允許的 request origin。",
  },
  "missing-origin": {
    en: "The request is missing a valid origin.",
    "zh-TW": "缺少有效的 origin。",
  },
  "session-required": {
    en: "Reopen Hub using the link from the launcher.",
    "zh-TW": "請從 Hub 啟動網址重新開啟。",
  },
  "invalid-session-request": {
    en: "Invalid session request.",
    "zh-TW": "無效的 session request。",
  },
  "operation-failed": {
    en: "Could not complete the operation. Check your input or the local data directory.",
    "zh-TW": "無法完成操作，請檢查輸入或本機資料目錄。",
  },
  "startup-link-expired": {
    en: "The startup link is no longer valid. Restart Hub for a new link.",
    "zh-TW": "啟動連結已失效，請重新啟動 Hub。",
  },
  "scan-or-save-in-progress": {
    en: "Wait for the current scan or save to finish.",
    "zh-TW": "請等目前掃描或儲存完成。",
  },
  "operation-in-progress": {
    en: "Wait for the current operation to finish.",
    "zh-TW": "請等目前操作完成。",
  },
  "preview-expired": {
    en: "The scope preview expired. Preview the scope again.",
    "zh-TW": "範圍預覽已失效，請重新預覽。",
  },
  "saving-scope": {
    en: "Wait for the scope to finish saving.",
    "zh-TW": "請等範圍儲存完成。",
  },
  "scope-required": {
    en: "Confirm the project scope first.",
    "zh-TW": "請先確認專案範圍。",
  },
  "scan-failed": {
    en: "The scan did not finish. Previous saved results are still available. Check the source and data directory, then try again.",
    "zh-TW":
      "本次掃描未完成，保留先前已保存的結果。請檢查來源與資料目錄後重試。",
  },
  "scope-changed": {
    en: "The scan scope changed. Please rescan.",
    "zh-TW": "探索範圍已變更，請重新掃描。",
  },
  "snapshot-unreadable": {
    en: "Could not read the last scan results. Please rescan.",
    "zh-TW": "最近結果無法讀取，請重新掃描。",
  },
} satisfies Record<string, Record<Locale, string>>;

export type HubMessageCode = keyof typeof hubMessages;

export function hubMessage(code: string | undefined, locale: Locale) {
  return code && Object.hasOwn(hubMessages, code)
    ? hubMessages[code as HubMessageCode][locale]
    : undefined;
}
