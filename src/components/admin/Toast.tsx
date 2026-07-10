"use client";

// Lightweight toast system for the admin panel. Provider lives in AdminShell so
// every admin page can call useToast().success(...) / .error(...) inline.
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { LuCircleCheck, LuCircleAlert, LuInfo, LuX } from "react-icons/lu";
import { cn } from "@/components/ui";

type ToastKind = "success" | "error" | "info";

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  push: (kind: ToastKind, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Safe no-op fallback so a page rendered outside the provider never crashes.
    return {
      push: () => {},
      success: () => {},
      error: () => {},
      info: () => {},
    };
  }
  return ctx;
}

const styles: Record<ToastKind, { cls: string; icon: ReactNode }> = {
  success: {
    cls: "border-accent/30 bg-accent-soft text-accent",
    icon: <LuCircleCheck className="text-lg" />,
  },
  error: {
    cls: "border-coral/30 bg-coral/10 text-coral",
    icon: <LuCircleAlert className="text-lg" />,
  },
  info: {
    cls: "border-primary/30 bg-primary-soft text-primary",
    icon: <LuInfo className="text-lg" />,
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = ++counter.current;
      setToasts((prev) => [...prev, { id, kind, message }]);
      window.setTimeout(() => remove(id), 4000);
    },
    [remove]
  );

  const value: ToastContextValue = {
    push,
    success: (m) => push("success", m),
    error: (m) => push("error", m),
    info: (m) => push("info", m),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(92vw,22rem)] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-card",
              styles[t.kind].cls
            )}
          >
            <span className="mt-0.5 shrink-0">{styles[t.kind].icon}</span>
            <span className="flex-1">{t.message}</span>
            <button
              type="button"
              onClick={() => remove(t.id)}
              className="shrink-0 opacity-70 transition-opacity hover:opacity-100"
              aria-label="Dismiss"
            >
              <LuX className="text-base" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
