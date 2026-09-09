import { LogOut } from "lucide-react";
import { useLogout } from "@/hooks/useLogout";

interface LogoutButtonProps {
  accent?: "student" | "teacher" | "admin";
  className?: string;
}

export default function LogoutButton({ accent = "student", className = "" }: LogoutButtonProps) {
  const logout = useLogout();

  const focusColor = accent === "teacher"
    ? "focus-visible:ring-indigo-500"
    : accent === "admin"
      ? "focus-visible:ring-orange-500"
      : "focus-visible:ring-blue-500";

  return (
    <section className={`rounded-[1.75rem] border border-slate-100 bg-white p-4 shadow-sm sm:p-5 ${className}`}>
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-rose-50 text-rose-600"><LogOut size={19} /></span>
        <div className="min-w-0"><h2 className="text-sm font-black text-slate-900">Keluar dari akun</h2><p className="mt-1 text-xs font-medium leading-5 text-slate-500">Akhiri sesi pada perangkat ini. Data yang sudah tersimpan tetap aman.</p></div>
      </div>
      <button type="button" onClick={() => void logout()} className={`mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 text-sm font-black text-rose-600 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${focusColor}`}>
        <LogOut size={17} /> Keluar
      </button>
    </section>
  );
}
