import {
  createContext,
  lazy,
  type ReactNode,
  Suspense,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import type { ConfirmTone } from "@/components/ConfirmDialogView";

const ConfirmDialogView = lazy(() => import("@/components/ConfirmDialogView"));

interface ConfirmOptions {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  tone?: ConfirmTone;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmDialogContext = createContext<ConfirmFn | null>(null);

const defaultOptions: Required<ConfirmOptions> = {
  title: "Konfirmasi tindakan",
  description: "Pastikan tindakan ini memang ingin dilanjutkan.",
  confirmText: "Lanjutkan",
  cancelText: "Kembali",
  tone: "primary",
};

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<Required<ConfirmOptions>>(defaultOptions);
  const [open, setOpen] = useState(false);
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);

  const settle = useCallback((confirmed: boolean) => {
    resolverRef.current?.(confirmed);
    resolverRef.current = null;
    setOpen(false);
  }, []);

  const confirm = useCallback<ConfirmFn>((nextOptions) => {
    resolverRef.current?.(false);
    setOptions({ ...defaultOptions, ...nextOptions });
    setOpen(true);

    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  return (
    <ConfirmDialogContext.Provider value={confirm}>
      {children}
      {open ? (
        <Suspense fallback={null}>
          <ConfirmDialogView
            open={open}
            title={options.title}
            description={options.description}
            confirmText={options.confirmText}
            cancelText={options.cancelText}
            tone={options.tone}
            onConfirm={() => settle(true)}
            onCancel={() => settle(false)}
          />
        </Suspense>
      ) : null}
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirmDialog() {
  const confirm = useContext(ConfirmDialogContext);
  if (!confirm) {
    throw new Error("useConfirmDialog harus digunakan di dalam ConfirmDialogProvider.");
  }
  return confirm;
}
