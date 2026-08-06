import { ChevronRight, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useConfirmDialog } from "@/components/ConfirmDialogProvider";
import http from "@/lib/http";

interface LogoutButtonProps {
  accent?: "student" | "teacher" | "admin";
}

export default function LogoutButton({ accent = "student" }: LogoutButtonProps) {
  const navigate = useNavigate();
  const confirm = useConfirmDialog();

  const handleLogout = async () => {
    const approved = await confirm({
      title: "Keluar dari akun?",
      description: "Sesi pada perangkat ini akan ditutup. Data yang sudah tersimpan tetap aman.",
      confirmText: "Ya, keluar",
      cancelText: "Tetap masuk",
      tone: "danger",
    });

    if (!approved) return;

    try {
      await http.post("/logout");
    } catch {
      // Token lokal tetap harus dihapus ketika sesi server sudah kedaluwarsa.
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      toast.success("Anda telah keluar dari akun.");
      navigate("/", { replace: true });
    }
  };

  const activeColor = accent === "teacher"
    ? "group-hover:text-indigo-600"
    : accent === "admin"
      ? "group-hover:text-orange-600"
      : "group-hover:text-blue-600";

  return (
    <button
      type="button"
      onClick={handleLogout}
      className={`flex w-full items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-5 py-3.5 text-sm font-bold text-slate-600 transition-all duration-300 hover:border-rose-100 hover:bg-rose-50 hover:text-rose-600 ${activeColor}`}
    >
      <span className="flex items-center gap-3">
        <LogOut size={18} className="text-slate-400 transition-colors group-hover:text-rose-500" />
        <span>Keluar</span>
      </span>
      <ChevronRight size={16} className="text-slate-300" />
    </button>
  );
}
