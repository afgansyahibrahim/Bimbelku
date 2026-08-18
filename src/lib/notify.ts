type SonnerModule = typeof import("sonner");
type ToastMethod = "success" | "error" | "warning";
type ToastMessage = Parameters<SonnerModule["toast"]["success"]>[0];
type ToastOptions = Parameters<SonnerModule["toast"]["success"]>[1];

let modulePromise: Promise<SonnerModule> | null = null;

const loadSonner = () => {
  window.dispatchEvent(new Event("bimbelku:toast-needed"));
  modulePromise ??= import("sonner");
  return modulePromise;
};

const call = (
  kind: ToastMethod,
  message: ToastMessage,
  options?: ToastOptions,
) => {
  void loadSonner().then(({ toast }) => {
    toast[kind](message, options);
  });
};

export const notify = {
  success: (message: ToastMessage, options?: ToastOptions) => call("success", message, options),
  error: (message: ToastMessage, options?: ToastOptions) => call("error", message, options),
  warning: (message: ToastMessage, options?: ToastOptions) => call("warning", message, options),
};

export const loadToastModule = loadSonner;
