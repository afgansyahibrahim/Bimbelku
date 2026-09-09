import { useNavigate } from "react-router-dom";
import { useConfirmDialog } from "@/components/ConfirmDialogProvider";
import { notify } from "@/lib/notify";

export function useLogout() {
  const navigate = useNavigate();
  const confirm = useConfirmDialog();

  return async () => {
    const approved = await confirm({
      title: "Keluar dari akun?",
      description: "Sesi pada perangkat ini akan ditutup. Data yang sudah tersimpan tetap aman.",
      confirmText: "Ya, keluar",
      cancelText: "Tetap masuk",
      tone: "danger",
    });

    if (!approved) return;

    try {
      const { default: http } = await import("@/lib/http");
      await http.post("/logout");
    } catch {
      // Token lokal tetap harus dihapus ketika sesi server sudah kedaluwarsa.
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      notify.success("Anda telah keluar dari akun.");
      navigate("/", { replace: true });
    }
  };
}
