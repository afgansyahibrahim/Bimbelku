import { Navigate, Outlet } from "react-router-dom";

interface PrivateRouteProps {
  allowedRoles?: string[]; // Daftar role yang boleh masuk (Opsional)
}

export default function PrivateRoute({ allowedRoles }: PrivateRouteProps) {
  // 1. Ambil data user dari LocalStorage
  const token = localStorage.getItem("token");
  const userString = localStorage.getItem("user");
  let user: { role?: string } | null = null;

  try {
    user = userString ? JSON.parse(userString) : null;
  } catch {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }

  // 2. Cek Login: Kalau tidak ada token/user, tendang ke Login
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // 3. Cek Role: Kalau role user tidak ada di daftar yang diizinkan, tendang ke Home
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/access-denied" replace />;
  }

  // 4. Kalau aman, silakan masuk
  return <Outlet />;
}
