import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

type ToastKind = "ok" | "error";
type ToastItem = { id: number; text: string; kind: ToastKind };
type Push = (text: string, kind?: ToastKind) => void;

const ToastContext = createContext<Push>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);
  const push = useCallback<Push>((text, kind = "ok") => {
    const id = ++counter.current;
    setItems((current) => [...current.slice(-2), { id, text, kind }]);
    window.setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), 4200);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toasts" aria-live="polite">
        {items.map((item) => <div key={item.id} className={`toast glass toast--${item.kind}`} role={item.kind === "error" ? "alert" : "status"}>{item.text}</div>)}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): Push { return useContext(ToastContext); }
