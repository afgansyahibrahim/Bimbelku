import { API_BASE_URL } from "@/lib/http";
import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Lock, CheckCircle2 } from "lucide-react";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Ambil token & email dari URL
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  useEffect(() => {
    if (!token || !email) {
      toast.error("Link tidak valid.");
      navigate("/login");
    }
  }, [token, email, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== passwordConfirmation) {
      toast.error("Konfirmasi password tidak cocok!");
      return;
    }

    setIsLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/reset-password`, {
        token,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });
      toast.success("Password berhasil diubah! Silakan login.");
      navigate("/login");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Gagal mereset password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock size={32} />
          </div>
          <h1 className="text-2xl font-black text-slate-800">Buat Password Baru</h1>
          <p className="text-slate-500 text-sm mt-2">
            Silakan masukkan password baru untuk akun {email}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Password Baru</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              placeholder="Minimal 8 karakter"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Konfirmasi Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              placeholder="Ulangi password baru"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all flex justify-center items-center gap-2"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={18}/> Simpan Password</>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;