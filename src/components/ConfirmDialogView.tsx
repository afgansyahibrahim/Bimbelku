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

export type ConfirmTone = "danger" | "warning" | "primary";

export interface ConfirmDialogViewProps {
  open: boolean;
  title: string;
  description: string;
  confirmText: string;
  cancelText: string;
  tone: ConfirmTone;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialogView({
  open,
  title,
  description,
  confirmText,
  cancelText,
  tone,
  onConfirm,
  onCancel,
}: ConfirmDialogViewProps) {
  const actionClassName = tone === "danger"
    ? "bg-rose-600 text-white hover:bg-rose-700"
    : tone === "warning"
      ? "bg-amber-500 text-white hover:bg-amber-600"
      : "bg-indigo-600 text-white hover:bg-indigo-700";

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && open) onCancel();
      }}
    >
      <AlertDialogContent className="rounded-[2rem] border-slate-100 sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-black text-slate-900">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="leading-6 text-slate-500">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel
            className="rounded-xl"
            onClick={(event) => {
              event.preventDefault();
              onCancel();
            }}
          >
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            className={`rounded-xl ${actionClassName}`}
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
