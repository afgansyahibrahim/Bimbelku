import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ConfirmTone = "danger" | "warning" | "primary";

interface ConfirmOptions {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  tone?: ConfirmTone;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmDialogContext = createContext<ConfirmFn | null>(null);

const defaultOptions: ConfirmOptions = {
  title: "Konfirmasi tindakan",
  description: "Pastikan tindakan ini memang ingin dilanjutkan.",
  confirmText: "Lanjutkan",
  cancelText: "Kembali",
  tone: "primary",
};

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions>(defaultOptions);
  const [open, setOpen] = useState(false);
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);

  const settle = useCallback((confirmed: boolean) => {
    resolverRef.current?.(confirmed);
    resolverRef.current = null;
    setOpen(false);
  }, []);

  const confirm = useCallback<ConfirmFn>((nextOptions) => {
    if (resolverRef.current) {
      resolverRef.current(false);
    }

    setOptions({ ...defaultOptions, ...nextOptions });
    setOpen(true);

    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const actionClassName = useMemo(() => {
    if (options.tone === "danger") return "bg-rose-600 text-white hover:bg-rose-700";
    if (options.tone === "warning") return "bg-amber-500 text-white hover:bg-amber-600";
    return "bg-indigo-600 text-white hover:bg-indigo-700";
  }, [options.tone]);

  return (
    <ConfirmDialogContext.Provider value={confirm}>
      {children}
      <AlertDialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && open) settle(false);
        }}
      >
        <AlertDialogContent className="rounded-[2rem] border-slate-100 sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black text-slate-900">
              {options.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="leading-6 text-slate-500">
              {options.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel
              className="rounded-xl"
              onClick={(event) => {
                event.preventDefault();
                settle(false);
              }}
            >
              {options.cancelText}
            </AlertDialogCancel>
            <AlertDialogAction
              className={`rounded-xl ${actionClassName}`}
              onClick={(event) => {
                event.preventDefault();
                settle(true);
              }}
            >
              {options.confirmText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
