"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type ToastVariant = "warning" | "success" | "danger" | "default";

interface ToastRecord {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue["showToast"] {
  const ctx = useContext(ToastContext);

  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  return ctx.showToast;
}

let idCounter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = "warning") => {
      idCounter += 1;
      const id = idCounter;

      setToasts((current) => [...current, { id, message, variant }]);
    },
    [],
  );

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      <div
        className={[
          "pointer-events-none",
          "fixed inset-x-0 bottom-4 z-[100]",
          "flex flex-col items-center gap-1.5",
          "px-4",
        ].join(" ")}
      >
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const variantClasses: Record<ToastVariant, string> = {
  warning: "bg-[var(--warning-bg)] text-[var(--warning-foreground)]",
  success: "bg-[var(--success)] text-white",
  danger: "bg-[var(--danger)] text-white",
  default: "bg-[var(--foreground)] text-[var(--background)]",
};

function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastRecord;
  onDismiss: (id: number) => void;
}) {
  const [phase, setPhase] = useState<"enter" | "visible" | "exit">("enter");

  // Ease in on mount.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setPhase("visible"));
    return () => cancelAnimationFrame(frame);
  }, []);

  // Ease back out after a couple of seconds.
  useEffect(() => {
    if (phase !== "visible") {
      return;
    }

    const timer = setTimeout(() => setPhase("exit"), 2400);
    return () => clearTimeout(timer);
  }, [phase]);

  // Remove from the DOM once the exit transition finishes.
  useEffect(() => {
    if (phase !== "exit") {
      return;
    }

    const timer = setTimeout(() => onDismiss(toast.id), 200);
    return () => clearTimeout(timer);
  }, [phase, onDismiss, toast.id]);

  const shown = phase === "visible";

  return (
    <div
      role="status"
      onClick={() => setPhase("exit")}
      className={[
        "pointer-events-auto",
        "w-fit max-w-[min(22rem,90vw)]",
        "cursor-pointer",
        "rounded-full",
        "px-4 py-2",
        "text-center text-xs font-medium leading-tight",
        "shadow-[0_8px_20px_var(--shadow)]",
        "transition-all duration-200 ease-out",
        shown ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
        variantClasses[toast.variant],
      ].join(" ")}
    >
      {toast.message}
    </div>
  );
}
