"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type Kind = "saving" | "saved" | "error";
type Toast = { kind: Kind; message: string };

const StaffToastContext = createContext<{
  push: (kind: Kind, message: string) => void;
} | null>(null);

export function StaffToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const hide = useRef<number>(0);

  const push = useCallback((kind: Kind, message: string) => {
    setToast({ kind, message });
    window.clearTimeout(hide.current);
    if (kind !== "saving") {
      hide.current = window.setTimeout(() => setToast(null), kind === "error" ? 4200 : 2400);
    }
  }, []);

  useEffect(() => () => window.clearTimeout(hide.current), []);

  return (
    <StaffToastContext.Provider value={{ push }}>
      {children}
      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className={`staff-toast staff-toast-${toast.kind}`}
        >
          <span className="staff-toast-dot" aria-hidden />
          {toast.message}
        </div>
      ) : null}
    </StaffToastContext.Provider>
  );
}

export function useStaffToast() {
  const ctx = useContext(StaffToastContext);
  if (!ctx) {
    return {
      saving: () => undefined,
      saved: () => undefined,
      error: () => undefined,
    };
  }
  return {
    saving: (message = "Saving…") => ctx.push("saving", message),
    saved: (message = "Saved") => ctx.push("saved", message),
    error: (message = "Save failed") => ctx.push("error", message),
  };
}
