import { API_BASE_URL } from "@/lib/http";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

export default function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // State untuk menampung input user
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 1. Tembak API Login Laravel
      const response = await axios.post(`${API_BASE_URL}/login`, formData);
      const { access_token, user } = response.data;

      // 2. Simpan Token & Data User
      localStorage.setItem("token", access_token);
      localStorage.setItem("user", JSON.stringify(user));

      // 3. LOGIKA REDIRECT
      const dashboardByRole: Record<string, string> = {
        admin: "/admin",
        teacher: "/guru",
        student: "/student/dashboard",
      };
      const dashboard = dashboardByRole[user.role];

      if (!dashboard) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        toast.error("Peran akun tidak dikenali. Hubungi admin BimbelKu.");
        return;
      }

      toast.success(`Selamat datang, ${user.name}!`);
      navigate(dashboard, { replace: true });

    } catch (error: unknown) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      const message = axios.isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
          || "Gagal masuk. Periksa email/password."
        : "Gagal masuk. Silakan coba lagi.";

      if (status === 403) {
        toast.warning("Akun Belum Aktif", {
          description: message,
          icon: <AlertCircle className="text-orange-600" />
        });
      } else {
        toast.error("Gagal Masuk", { description: message });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-orange-50/50 relative overflow-hidden font-sans">
      
      {/* Dekorasi Background Blob */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-orange-200/40 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-red-200/40 rounded-full blur-3xl" />

      {/* Login Card */}
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 backdrop-blur-sm p-8 sm:p-10 animate-in fade-in zoom-in-95 duration-500">
        
        {/* Header */}
        <div className="text-center mb-8">
           <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white border border-orange-100 shadow-sm mb-4 overflow-hidden">
            {/* Placeholder Logo jika gambar tidak ada */}
            <span className="text-3xl">🎓</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
            Selamat Datang
          </h2>
          <p className="text-sm text-gray-500 mt-2">
            Masuk untuk melanjutkan belajar
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-4">
            {/* Email Input */}
             <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
              </div>
              <input
                name="email"
                type="email"
                required
                onChange={handleChange}
                className="block w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-sm font-medium"
                placeholder="Alamat Email"
              />
            </div>

            {/* Password Input */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
              </div>
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                required
                onChange={handleChange}
                className="block w-full pl-11 pr-11 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-sm font-medium"
                placeholder="Password"
              />
              <button
                type="button"
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                className="absolute inset-y-0 right-0 pr-4 flex items-center cursor-pointer text-gray-400 hover:text-gray-600 transition-colors"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex justify-end text-sm">
            <Link to="/forgot-password" className="font-medium text-orange-600 hover:text-orange-500 hover:underline">
              Lupa password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full relative flex justify-center items-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 shadow-lg shadow-orange-500/20 transition-all duration-200 hover:-translate-y-0.5"
          >
            {isLoading ? (
               <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memproses...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                Masuk Sekarang <ArrowRight size={18} />
              </div>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Belum punya akun?{" "}
            <Link to="/register" className="font-medium text-orange-600 hover:text-orange-500 hover:underline transition-all">
              Daftar Gratis
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
