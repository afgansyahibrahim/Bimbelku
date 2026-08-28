import { GraduationCap, LayoutDashboard } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type BlockedUser = {
  name?: string;
  role?: string;
};

const dashboardByRole: Record<string, string> = {
  admin: "/admin",
  teacher: "/guru",
};

const roleLabel = (role?: string) => role === "admin" ? "admin" : role === "teacher" ? "tutor" : "akun non-murid";

export default function StudentPackageBlockedDialog({
  user,
  onClose,
  onNavigate,
}: {
  user: BlockedUser;
  onClose: () => void;
  onNavigate?: () => void;
}) {
  const navigate = useNavigate();

  const openDashboard = () => {
    const path = dashboardByRole[user.role || ""] || "/";
    onClose();
    onNavigate?.();
    navigate(path);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-[2rem] border-slate-100 p-6 sm:max-w-md sm:p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 sm:mx-0">
          <GraduationCap className="h-7 w-7" aria-hidden="true" />
        </div>
        <DialogHeader className="gap-2">
          <DialogTitle className="text-2xl font-black text-slate-900">
            Fitur belajar khusus murid
          </DialogTitle>
          <DialogDescription className="text-sm leading-6 text-slate-600">
            {user.name ? `${user.name} sedang` : "Akun Anda sedang"} login sebagai {roleLabel(user.role)}. Halaman belajar dan pembuatan paket hanya tersedia untuk akun murid.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-2 gap-2 sm:space-x-0">
          <Button type="button" variant="outline" onClick={onClose}>
            Tutup
          </Button>
          <Button type="button" onClick={openDashboard}>
            <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
            Buka Dashboard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
