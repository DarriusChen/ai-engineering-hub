// Best-effort detection, not a claim to identify arbitrary secrets in prose.
export function redact(value: string): string {
  return value
    .replace(
      /-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/g,
      "[REDACTED PRIVATE KEY]",
    )
    .replace(
      /\b(?:sk-[A-Za-z0-9_-]{12,}|gh[pousr]_[A-Za-z0-9_]{12,}|github_pat_[A-Za-z0-9_]{12,}|AKIA[A-Z0-9]{16})\b/g,
      "[REDACTED]",
    )
    .replace(/\b(Bearer\s+)[A-Za-z0-9._~+\/-]+=*/gi, "$1[REDACTED]")
    .replace(
      /((?:[\w-]*(?:token|secret|password|api[_-]?key|credential)[\w-]*|authorization)\s*["']?\s*[:=]\s*)([^\r\n]+)/gi,
      (_, prefix: string, rest: string) =>
        `${prefix}${/^\s*["']?\$\{[A-Za-z_][A-Za-z0-9_]*\}["']?\s*$/.test(rest) ? rest : "[REDACTED]"}`,
    )
    .replace(/https?:\/\/[^\s<>"')]+/g, (raw) => {
      try {
        const url = new URL(raw);
        if (url.username || url.password) {
          url.username = "REDACTED";
          url.password = "";
        }
        for (const key of url.searchParams.keys())
          if (/token|secret|password|key|auth|credential/i.test(key))
            url.searchParams.set(key, "REDACTED");
        return url.toString();
      } catch {
        return raw;
      }
    });
}
