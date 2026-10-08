export type AuthFailure = { at: number; code: string; detail: string };

const KEY = "__bunnyAuthFailure";

export function rememberAuthFailure(code: string, detail: string) {
  (globalThis as unknown as Record<string, AuthFailure>)[KEY] = {
    at: Date.now(),
    code,
    detail: detail.slice(0, 400),
  };
}

export function recentAuthFailure() {
  const failure = (globalThis as unknown as Record<string, AuthFailure | undefined>)[KEY];
  if (!failure || Date.now() - failure.at > 2 * 60 * 1000) return null;
  return failure;
}
