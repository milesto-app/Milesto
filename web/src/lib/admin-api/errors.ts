export class ApiError extends Error {
  public readonly status: number;
  public readonly code?: string;
  public readonly details?: unknown;

  constructor(
    message: string,
    options: { status: number; code?: string; details?: unknown },
  ) {
    super(message);
    this.name = "ApiError";
    this.status = options.status;
    if (options.code !== undefined) this.code = options.code;
    if (options.details !== undefined) this.details = options.details;
  }
}

export type ActionFailure = {
  ok: false;
  error: { code: string; message: string };
};

export type ActionSuccess<T> = { ok: true; data: T };

export type ActionResult<T> = ActionSuccess<T> | ActionFailure;

export function normalizeError(error: unknown): ActionFailure {
  if (error instanceof ApiError) {
    return {
      ok: false,
      error: {
        code: error.code ?? `http_${error.status}`,
        message: error.message,
      },
    };
  }

  if (error instanceof Error) {
    return {
      ok: false,
      error: { code: "unknown", message: error.message },
    };
  }

  return {
    ok: false,
    error: { code: "unknown", message: "Unexpected error" },
  };
}
