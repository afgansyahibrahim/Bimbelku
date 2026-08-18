import { type ComponentProps, type MouseEvent, useState } from "react";
import { GraduationCap, LayoutDashboard } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type StoredUser = {
  name?: string;
  role?: string;
};

const readStoredUser = (): StoredUser | null => {
  const storedUser = localStorage.getItem("user");
  if (!storedUser) return null;

  try {
    const parsed = JSON.parse(storedUser);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    return null;
  }
};

const dashboardByRole: Record<string, string> = {
  admin: "/admin",
  teacher: "/guru",
};

const dashboardPath = (role?: string) => dashboardByRole[role || ""] || "/";
const roleLabel = (role?: string) => role === "admin" ? "admin" : role === "teacher" ? "tutor" : "akun non-murid";

type StudentPackageLinkProps = ComponentProps<typeof Link> & {
  onNavigate?: () => void;
};

export default function StudentPackageLink({
  onClick,
  onNavigate,
  children,
  ...props
}: StudentPackageLinkProps) {
  const navigate = useNavigate();
  const [blockedUser, setBlockedUser] = useState<StoredUser | null>(null);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;

    const currentUser = readStoredUser();
    if (!currentUser || currentUser.role === "student") {
      onNavigate?.();
      return;
    }

    event.preventDefault();
    setBlockedUser(currentUser);
  };

  const openDashboard = () => {
    const path = dashboardPath(blockedUser?.role);
    setBlockedUser(null);
    onNavigate?.();
    navigate(path);
  };

  return (
    <>
      <Link {...props} onClick={handleClick}>
        {children}
      </Link>

      <Dialog open={Boolean(blockedUser)} onOpenChange={(open) => !open && setBlockedUser(null)}>
        <DialogContent className="rounded-[2rem] border-slate-100 p-6 sm:max-w-md sm:p-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 sm:mx-0">
            <GraduationCap className="h-7 w-7" aria-hidden="true" />
          </div>
          <DialogHeader className="gap-2">
            <DialogTitle className="text-2xl font-black text-slate-900">
              Fitur belajar khusus murid
            </DialogTitle>
            <DialogDescription className="text-sm leading-6 text-slate-600">
              {blockedUser?.name ? `${blockedUser.name} sedang` : "Akun Anda sedang"} login sebagai {roleLabel(blockedUser?.role)}. Halaman belajar dan pembuatan paket hanya tersedia untuk akun murid.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2 gap-2 sm:space-x-0">
            <Button type="button" variant="outline" onClick={() => setBlockedUser(null)}>
              Tutup
            </Button>
            <Button type="button" onClick={openDashboard}>
              <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
              Buka Dashboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
