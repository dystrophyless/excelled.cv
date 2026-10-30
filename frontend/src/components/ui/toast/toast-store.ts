import { create } from "zustand";

export type ToastTone = "neutral" | "success" | "error";

export type ToastItem = {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
  /** One inline action, e.g. Undo for a reversible change */
  action?: { label: string; onClick: () => void };
  /** ms before auto-dismiss; 0 keeps it until closed */
  duration: number;
};

type ToastState = {
  toasts: ToastItem[];
  push: (toast: Omit<ToastItem, "id">) => number;
  dismiss: (id: number) => void;
};

let nextId = 1;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (toast) => {
    const id = nextId++;
    // newest first, at most 3 on screen
    set((state) => ({ toasts: [{ ...toast, id }, ...state.toasts].slice(0, 3) }));
    return id;
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

type ToastOptions = { description?: string; duration?: number; action?: ToastItem["action"] };

/** Short confirmation after an action ("Application sent"). Not for errors the user must act on. */
export const toast = Object.assign(
  (title: string, options?: ToastOptions) =>
    useToastStore.getState().push({ title, tone: "neutral", duration: options?.action ? 6000 : 4000, ...options }),
  {
    success: (title: string, options?: ToastOptions) =>
      useToastStore.getState().push({ title, tone: "success", duration: 4000, ...options }),
    error: (title: string, options?: ToastOptions) =>
      useToastStore.getState().push({ title, tone: "error", duration: 6000, ...options }),
    dismiss: (id: number) => useToastStore.getState().dismiss(id),
  },
);
