import { z } from "zod";
import type { HubMessageCode, Locale } from "./messages.js";
export const ScopeSchema = z.object({
  root: z.string().min(1),
  canonicalRoot: z.string().min(1),
  excluded: z.array(z.string()),
  revision: z.string().min(1),
});
export type Scope = z.infer<typeof ScopeSchema>;
export const DiagnosticSchema = z.object({
  path: z.string(),
  code: z.string(),
  message: z.string(),
});
export type Diagnostic = z.infer<typeof DiagnosticSchema>;
export const SourceSchema = z.object({
  id: z.string(),
  canonicalPath: z.string(),
  observedAt: z.string(),
});
export const ResourceSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  type: z.literal("skill"),
  name: z.string(),
  description: z.string(),
  content: z.string(),
});
export type Resource = z.infer<typeof ResourceSchema>;
export const InstanceSchema = z.object({
  id: z.string(),
  resourceId: z.string(),
  agentId: z.literal("codex"),
  scopeKind: z.literal("project"),
  nativeScope: z.literal("repo"),
  projectId: z.string(),
  discoveryPath: z.string(),
  baseDirectory: z.string(),
});
export const SnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string(),
  scope: ScopeSchema,
  startedAt: z.string(),
  finishedAt: z.string(),
  status: z.enum(["complete", "partial"]),
  sources: z.array(SourceSchema),
  resources: z.array(ResourceSchema),
  instances: z.array(InstanceSchema),
  diagnostics: z.array(DiagnosticSchema),
  coverage: z.array(
    z.object({
      path: z.string(),
      status: z.enum(["read", "missing", "excluded", "failed"]),
    }),
  ),
});
export type Snapshot = z.infer<typeof SnapshotSchema>;
export const PreferencesSchema = z.object({
  schemaVersion: z.literal(1),
  scope: ScopeSchema.nullable(),
});
export interface HubState {
  locale: Locale;
  scope: Scope | null;
  snapshot: Snapshot | null;
  scanning: boolean;
  error: string | null;
  errorCode?: HubMessageCode | null;
  warning: string | null;
  warningCode?: HubMessageCode | null;
  csrf: string;
}
export interface Preview {
  id: string;
  scope: Scope;
  skillRoot: string;
  expiresAt: number;
}
