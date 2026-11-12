import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { HubState, Preview } from "../shared/model";
import { hubMessage, hubMessages, type Locale } from "../shared/messages";
import { copy } from "./copy";
import "./style.css";

class RequestError extends Error {
  constructor(
    public code?: string,
    message?: string,
  ) {
    super(message);
  }
}

async function readResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) throw new RequestError(data.code, data.message);
  return data;
}

function App() {
  const [locale, setLocale] = useState<Locale>("en");
  const [savingLocale, setSavingLocale] = useState(false);
  const t = copy[locale];
  const [state, setState] = useState<HubState | null>(null),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false);
  const [root, setRoot] = useState(""),
    [excluded, setExcluded] = useState(""),
    [preview, setPreview] = useState<Preview | null>(null),
    [settings, setSettings] = useState(false);
  const [query, setQuery] = useState(""),
    [selected, setSelected] = useState<string | null>(null);
  async function request<T>(url: string, body?: unknown): Promise<T> {
    const response = await fetch(`/api/${url}`, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        "Content-Type": "application/json",
        ...(state ? { "X-Hub-CSRF": state.csrf } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return readResponse<T>(response);
  }
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  useEffect(() => {
    let active = true;
    const hash = new URLSearchParams(location.hash.slice(1)),
      token = hash.get("token");
    if (token) history.replaceState(null, "", location.pathname);
    const load = async () => {
      try {
        let response: Response;
        if (token) {
          response = await fetch("/api/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          });
        } else response = await fetch("/api/state");
        const data = await readResponse<HubState>(response);
        if (active) {
          setState(data);
          setLocale(data.locale);
          setRoot(data.scope?.root ?? "");
          setExcluded(data.scope?.excluded.join("\n") ?? "");
          setSettings(!data.scope);
        }
      } catch (e) {
        if (active) setError(e);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!state?.scanning) return;
    const timer = setInterval(() => {
      void request<HubState>("state").then(setState).catch(setError);
    }, 400);
    return () => clearInterval(timer);
  }, [state?.scanning]);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };
  const changeLocale = async (next: Locale) => {
    if (next === locale || savingLocale) return;
    if (!state) {
      setLocale(next);
      return;
    }
    setSavingLocale(true);
    try {
      await request("locale", { locale: next });
      setLocale(next);
    } catch (e) {
      setError(e);
    } finally {
      setSavingLocale(false);
    }
  };
  const previewScope = () =>
    run(async () => {
      setPreview(
        await request<Preview>("preview", {
          root: root.trim(),
          excluded: excluded
            .split("\n")
            .map((x) => x.trim())
            .filter(Boolean),
        }),
      );
    });
  const scan = () =>
    run(async () => {
      await request("scans", {});
      setState(await request<HubState>("state"));
    });
  const accept = () =>
    run(async () => {
      await request("scope", { id: preview!.id });
      setPreview(null);
      setSettings(false);
      setSelected(null);
      await request("scans", {});
      setState(await request<HubState>("state"));
    });
  const snapshot = state?.snapshot;
  const resources =
    snapshot?.resources.filter((r) =>
      `${r.name} ${r.description}`
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase()),
    ) ?? [];
  const detail = resources.find((r) => r.id === selected) ?? resources[0];
  const instances =
    snapshot?.instances.filter((i) => i.resourceId === detail?.id) ?? [];
  const timestamp = snapshot
    ? new Date(snapshot.finishedAt).toLocaleString(locale)
    : null;
  const errorMessage = error
    ? (error instanceof RequestError
        ? hubMessage(error.code, locale) || error.message
        : undefined) || hubMessages["operation-failed"][locale]
    : null;
  const scanError =
    hubMessage(state?.errorCode ?? undefined, locale) ?? state?.error;
  const warning =
    hubMessage(state?.warningCode ?? undefined, locale) ?? state?.warning;
  return (
    <div className="app">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label={t.home}>
          <span className="brand-mark">h</span>
          <span>
            AI Engineering
            <br />
            <strong>Hub</strong>
          </span>
        </a>
        <div className="workspace-tag">
          <span className="status-dot" />
          {t.localWorkspace}
        </div>
        <nav aria-label={t.mainNavigation}>
          <button
            className={!settings ? "nav-item active" : "nav-item"}
            onClick={() => setSettings(false)}
          >
            ▦ <span>{t.dashboard}</span>
          </button>
          <button
            className={settings ? "nav-item active" : "nav-item"}
            onClick={() => {
              setSettings(true);
              setPreview(null);
            }}
          >
            ⌘ <span>{t.scope}</span>
          </button>
        </nav>
        <div className="side-note">
          <span className="small-symbol">◉</span>
          <strong>{t.sideTitle}</strong>
          <p>
            {t.localData}
            <br />
            {t.readOnlyAccess}
          </p>
        </div>
        <footer>
          {t.milestone}
          <br />
          <b>Codex · Project Skills</b>
        </footer>
      </aside>
      <main>
        <header className="topbar">
          <span>
            {t.workspace} / {settings ? t.scope : t.explore}
          </span>
          <div className="topbar-actions">
            <span className="local-badge">
              <span className="status-dot" />
              {t.localConnection}
            </span>
            <div
              className="language-switch"
              role="group"
              aria-label={t.language}
            >
              <button
                type="button"
                lang="en"
                aria-pressed={locale === "en"}
                disabled={savingLocale || (!state && !errorMessage)}
                onClick={() => void changeLocale("en")}
              >
                English
              </button>
              <button
                type="button"
                lang="zh-TW"
                aria-pressed={locale === "zh-TW"}
                disabled={savingLocale || (!state && !errorMessage)}
                onClick={() => void changeLocale("zh-TW")}
              >
                繁體中文
              </button>
            </div>
          </div>
        </header>
        {errorMessage && (
          <div role="alert" className="notice danger">
            {errorMessage}
          </div>
        )}
        {!state ? (
          <section className="loading">
            <h1>{errorMessage ? t.connectionFailed : t.loading}</h1>
            <p>{t.startupLink}</p>
          </section>
        ) : (
          <>
            <div className="page-heading">
              <div>
                <h1>{settings ? t.chooseScope : t.dashboard}</h1>
                <p>{settings ? t.scopeIntro : t.dashboardIntro}</p>
              </div>
              {!settings && state.scope && (
                <button
                  className="primary"
                  disabled={busy || state.scanning}
                  onClick={scan}
                >
                  {state.scanning ? t.scanning : t.rescan}
                  <span aria-hidden="true">↻</span>
                </button>
              )}
            </div>
            {scanError && (
              <div className="notice danger" role="alert">
                {scanError}
              </div>
            )}
            {warning && <div className="notice">{warning}</div>}
            {settings ? (
              <section className="setup-panel">
                <div className="setup-intro">
                  <span className="agent-icon">C</span>
                  <div>
                    <h2>Codex project Skills</h2>
                    <p>{t.skillDirectory}</p>
                  </div>
                </div>
                <label htmlFor="project-path">{t.projectPath}</label>
                <input
                  id="project-path"
                  value={root}
                  onChange={(e) => {
                    setRoot(e.target.value);
                    setPreview(null);
                  }}
                  placeholder="/Users/you/Developer/my-project"
                  disabled={state.scanning || busy}
                />
                <p className="hint">{t.absolutePath}</p>
                <label htmlFor="excluded">
                  {t.exclusions} <span>{t.optionalLines}</span>
                </label>
                <textarea
                  id="excluded"
                  value={excluded}
                  onChange={(e) => {
                    setExcluded(e.target.value);
                    setPreview(null);
                  }}
                  placeholder="archive&#10;private"
                  rows={3}
                  disabled={state.scanning || busy}
                />
                <p className="hint">{t.exclusionsHint}</p>
                <button
                  className="primary"
                  disabled={!root.trim() || busy || state.scanning}
                  onClick={previewScope}
                >
                  {t.previewScope}
                </button>
                {preview && (
                  <div className="preview" aria-live="polite">
                    <h3>{t.confirmPreview}</h3>
                    <dl>
                      <dt>{t.agentScope}</dt>
                      <dd>Codex / {t.project}</dd>
                      <dt>{t.project}</dt>
                      <dd>{preview.scope.root}</dd>
                      <dt>{t.resolvedPath}</dt>
                      <dd>{preview.scope.canonicalRoot}</dd>
                      <dt>{t.source}</dt>
                      <dd>{preview.skillRoot}</dd>
                      <dt>{t.exclusions}</dt>
                      <dd>
                        {preview.scope.excluded.join("\n") || t.noExclusions}
                      </dd>
                    </dl>
                    <p>{t.previewNotice}</p>
                    <button
                      className="primary"
                      onClick={accept}
                      disabled={busy}
                    >
                      {t.confirmScan}
                    </button>
                  </div>
                )}
              </section>
            ) : !state.scope ? (
              <section className="empty">
                <span className="empty-icon">⌘</span>
                <h2>{t.firstProject}</h2>
                <p>{t.firstProjectHint}</p>
                <button className="primary" onClick={() => setSettings(true)}>
                  {t.setScope}
                </button>
              </section>
            ) : (
              <>
                <section className="scope-strip">
                  <div>
                    <span className="folder-icon">▱</span>
                    <div>
                      <strong>{state.scope.root.split("/").pop()}</strong>
                      <p title={state.scope.root}>{state.scope.root}</p>
                    </div>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => setSettings(true)}
                  >
                    {t.editScope}
                  </button>
                </section>
                <div className="inventory-heading">
                  <h2>
                    {t.inventory}{" "}
                    <span>{snapshot?.resources.length ?? "—"}</span>
                  </h2>
                  <p aria-live="polite">
                    {state.scanning
                      ? t.previousResults
                      : timestamp
                        ? t.lastScan(timestamp)
                        : t.notScanned}
                    {snapshot?.status === "partial" ? t.partial : ""}
                  </p>
                </div>
                <div className="categories">
                  <div className="category selected">
                    <strong>Skills</strong>
                    <span>{snapshot?.resources.length ?? "—"}</span>
                  </div>
                  <div className="category unavailable">
                    <strong>MCP</strong>
                    <small>{t.futureMilestone}</small>
                  </div>
                  <div className="category unavailable">
                    <strong>Rules</strong>
                    <small>{t.futureMilestone}</small>
                  </div>
                </div>
                <div className="toolbar">
                  <label className="search">
                    <span aria-hidden="true">⌕</span>
                    <input
                      aria-label={t.searchSkills}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={t.searchPlaceholder}
                    />
                  </label>
                  <span className="chip">Codex</span>
                  <span className="chip">{t.project}</span>
                  <span className="result-count">
                    {t.resourceCount(resources.length)}
                  </span>
                </div>
                {!snapshot ? (
                  <section className="empty">
                    <h2>{t.scopeReady}</h2>
                    <p>{t.scopeReadyHint}</p>
                  </section>
                ) : resources.length === 0 ? (
                  <section className="empty">
                    <h2>{query ? t.noMatches : t.noSkills}</h2>
                    <p>{query ? t.trySearch : t.checkDiagnostics}</p>
                    {query && (
                      <button onClick={() => setQuery("")}>
                        {t.clearSearch}
                      </button>
                    )}
                  </section>
                ) : (
                  <div className="explorer">
                    <section
                      className="resource-list"
                      aria-label={t.skillsList}
                    >
                      {resources.map((r) => (
                        <button
                          key={r.id}
                          className={`resource-row ${r.id === detail?.id ? "selected" : ""}`}
                          onClick={() => setSelected(r.id)}
                        >
                          <span className="resource-glyph">◇</span>
                          <span>
                            <strong>{r.name}</strong>
                            <p>{r.description}</p>
                            <small>
                              {t.configurationCount(
                                snapshot.instances.filter(
                                  (i) => i.resourceId === r.id,
                                ).length,
                              )}
                            </small>
                          </span>
                          <span aria-hidden="true" className="chevron">
                            ›
                          </span>
                        </button>
                      ))}
                    </section>
                    <section className="detail" aria-label={t.resourceDetail}>
                      <div className="detail-title">
                        <span className="chip">Skill</span>
                        <span className="readonly">{t.readOnly}</span>
                      </div>
                      <h2>{detail?.name}</h2>
                      <p className="description">{detail?.description}</p>
                      <h3>{t.configurationSources}</h3>
                      {instances.map((i) => (
                        <div className="instance" key={i.id}>
                          <div>
                            <b>Codex</b>
                            <span>{t.project}</span>
                          </div>
                          <code>{i.discoveryPath}</code>
                        </div>
                      ))}
                      <p className="hint">{t.agentLoadingHint}</p>
                      <h3>
                        SKILL.md <span>{t.contentPreview}</span>
                      </h3>
                      <pre tabIndex={0}>{detail?.content}</pre>
                    </section>
                  </div>
                )}
                {snapshot && (
                  <details
                    className="diagnostics"
                    open={snapshot.diagnostics.length > 0}
                  >
                    <summary>
                      {t.diagnostics}{" "}
                      <span>
                        {t.diagnosticCount(snapshot.diagnostics.length)}
                      </span>
                    </summary>
                    {snapshot.diagnostics.length ? (
                      snapshot.diagnostics.map((d, i) => (
                        <div className="diagnostic" key={i}>
                          <strong>{d.code}</strong>
                          <p>{hubMessage(d.code, locale) ?? d.message}</p>
                          <code>{d.path}</code>
                        </div>
                      ))
                    ) : (
                      <p>{t.diagnosticsEmpty}</p>
                    )}
                  </details>
                )}
              </>
            )}
          </>
        )}
        <div className="bottom-note">
          AI Engineering Hub <span>{t.footerNote}</span>
        </div>
      </main>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
