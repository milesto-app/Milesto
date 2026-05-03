export interface AdminHealthCheck {
  status: "healthy" | "unhealthy";
  responseTimeMs: number;
}

export interface AdminHealthReport {
  backend: AdminHealthCheck;
  supabase: AdminHealthCheck;
  queueDepth: number | null;
}

export interface AdminLlmProbe {
  status: "healthy" | "unhealthy";
  latencyMs: number;
  model?: string;
  error?: string;
}

export interface AdminLlmHealthReport {
  openrouter: AdminLlmProbe;
  cohere: AdminLlmProbe;
}

export interface AdminSystemLog {
  id: string;
  level: string;
  context: string | null;
  message: string;
  stack: string | null;
  metadata: unknown;
  loggedAt: string;
}
