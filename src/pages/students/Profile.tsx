import { API_BASE_URL } from "@/lib/http";
import { useState, useEffect, useRef } from "react";
import StudentLayout from "../../components/StudentLayout";
import axios from "axios";
import { toast } from "sonner";
import { 
  User, Mail, Lock, Save, Loader2, Camera, ShieldCheck, ImagePlus,
} from "lucide-react";
import ChangePasswordDialog from "@/components/ChangePasswordDialog";
import { formatAccountDate } from "@/lib/date";
import { isValidPhone, validateUpload } from "@/lib/validation";

export default function Profile() {
  // State User Data
  const [user, setUser] = useState({
    name: "",
    email: "",
    phone: "",
    avatar_url: "" as string | null,
    profile_cover_url: "" as string | null,
    password_updated_at: "" as string | null,
  });
  
  // State File Foto (Untuk Upload)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCover, setSelectedCover] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarPreviewUrlRef = useRef<string | null>(null);
  const coverPreviewUrlRef = useRef<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 1. FETCH DATA USER
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`${API_BASE_URL}/user`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Asumsi response backend mengembalikan { name, email, avatar_url }
        // Jika backend mengirim 'photo' atau 'avatar', sesuaikan di sini
        const userData = response.data;
        setUser({
            name: userData.name,
            email: userData.email,
            phone: userData.phone || "",
            avatar_url: userData.avatar_url || userData.photo_url || null,
            profile_cover_url: userData.profile_cover_url || null,
            password_updated_at: userData.password_updated_at || null,
        });

      } catch (error) {
        console.error("Gagal load profile:", error);
        toast.error("Gagal memuat data profil.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();

    return () => {
      if (avatarPreviewUrlRef.current) URL.revokeObjectURL(avatarPreviewUrlRef.current);
      if (coverPreviewUrlRef.current) URL.revokeObjectURL(coverPreviewUrlRef.current);
    };
  }, []);

  // 2. HANDLER GANTI FOTO (PREVIEW)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const error = validateUpload(file, {
        label: "Foto profil",
        maxSizeMb: 2,
        extensions: ["jpg", "jpeg", "png", "webp"],
      });
      if (error) {
        toast.error(error);
        e.target.value = "";
        return;
      }

      setSelectedFile(file);
      
      // Buat URL preview sementara
      if (avatarPreviewUrlRef.current) URL.revokeObjectURL(avatarPreviewUrlRef.current);
      const previewUrl = URL.createObjectURL(file);
      avatarPreviewUrlRef.current = previewUrl;
      setUser(prev => ({ ...prev, avatar_url: previewUrl }));
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const error = validateUpload(file, {
      label: "Sampul profil",
      maxSizeMb: 5,
      extensions: ["jpg", "jpeg", "png", "webp"],
    });
    if (error) {
      toast.error(error);
      e.target.value = "";
      return;
    }
    if (!file) return;

    setSelectedCover(file);
    if (coverPreviewUrlRef.current) URL.revokeObjectURL(coverPreviewUrlRef.current);
    const previewUrl = URL.createObjectURL(file);
    coverPreviewUrlRef.current = previewUrl;
    setUser((current) => ({ ...current, profile_cover_url: previewUrl }));
  };

  // 3. HANDLER SIMPAN PERUBAHAN
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidPhone(user.phone)) {
      toast.error("Nomor WhatsApp/telepon belum valid.");
      return;
    }

    setIsSaving(true);

    try {
      const token = localStorage.getItem("token");
      
      // Gunakan FormData untuk kirim File + Text
      const formData = new FormData();
      formData.append("name", user.name);
      formData.append("phone", user.phone);
      
      // Trik Laravel: Gunakan POST tapi simulasi PUT agar file terbaca
      formData.append("_method", "PUT"); 

      if (selectedFile) {
        formData.append("avatar", selectedFile);
      }
      if (selectedCover) {
        formData.append("profile_cover", selectedCover);
      }

      const response = await axios.post(`${API_BASE_URL}/user`, formData, {
        headers: { 
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data" 
        }
      });

      toast.success("Profil berhasil diperbarui!");
      
      setSelectedFile(null);
      setSelectedCover(null);
      setUser((current) => ({
        ...current,
        name: response.data?.data?.name ?? current.name,
        phone: response.data?.data?.phone ?? current.phone,
        avatar_url: response.data?.data?.avatar_url ?? current.avatar_url,
        profile_cover_url: response.data?.data?.profile_cover_url ?? current.profile_cover_url,
      }));
      if (avatarPreviewUrlRef.current) {
        URL.revokeObjectURL(avatarPreviewUrlRef.current);
        avatarPreviewUrlRef.current = null;
      }
      if (coverPreviewUrlRef.current) {
        URL.revokeObjectURL(coverPreviewUrlRef.current);
        coverPreviewUrlRef.current = null;
      }

    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || "Gagal memperbarui profil.";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return (
    <StudentLayout title="Profil Saya">
        <div className="h-[70vh] flex flex-col items-center justify-center gap-4">
            <Loader2 className="animate-spin text-blue-600" size={40}/>
            <p className="text-slate-400 font-medium animate-pulse">Memuat profil...</p>
        </div>
    </StudentLayout>
  );

  return (
    <StudentLayout title="Profil Saya">
      <div className="max-w-5xl mx-auto pb-20">
        
        <form onSubmit={handleUpdateProfile} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* === 1. HEADER & AVATAR === */}
            <div className="relative bg-white rounded-[2.5rem] p-8 md:p-10 shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <div
                  className="absolute left-0 top-0 h-32 w-full bg-gradient-to-r from-blue-600 to-indigo-700 bg-cover bg-center"
                  style={user.profile_cover_url ? {
                    backgroundImage: `linear-gradient(90deg, rgba(37,99,235,.48), rgba(67,56,202,.56)), url("${user.profile_cover_url}")`,
                  } : undefined}
                />
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="absolute right-5 top-5 z-20 inline-flex items-center gap-2 rounded-xl border border-white/30 bg-slate-950/55 px-3 py-2 text-xs font-bold text-white shadow-lg backdrop-blur transition hover:bg-slate-950/75"
                >
                  <ImagePlus size={15} />
                  Ubah sampul
                </button>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={handleCoverChange}
                  className="hidden"
                />

                <div className="relative z-10 flex flex-col md:flex-row items-end md:items-center gap-8 mt-12">
                    {/* Avatar Circle */}
                    <div className="relative group shrink-0 mx-auto md:mx-0">
                        <div className="w-36 h-36 rounded-full bg-white p-1.5 shadow-2xl ring-4 ring-blue-50/50">
                            <div className="w-full h-full rounded-full bg-slate-100 overflow-hidden relative">
                                {user.avatar_url ? (
                                    <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover"/>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-50">
                                        <User size={64} />
                                    </div>
                                )}
                                
                                {/* Overlay Upload */}
                                <div 
                                    className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all cursor-pointer backdrop-blur-[2px]"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Camera size={24} className="mb-1"/>
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Ubah Foto</span>
                                </div>
                            </div>
                        </div>
                        {/* Hidden Input File */}
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            className="hidden" 
                            accept=".jpg,.jpeg,.png,.webp"
                        />
                        <button 
                            type="button"
                            aria-label="Ubah foto profil"
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute bottom-2 right-2 p-2.5 bg-slate-900 text-white rounded-full shadow-lg hover:bg-indigo-600 transition-all md:hidden"
                        >
                            <Camera size={16}/>
                        </button>
                    </div>

                    {/* Text Info */}
                    <div className="flex-1 text-center md:text-left mb-2 md:mb-0">
                        <h1 className="text-3xl font-black text-slate-900 mb-1">{user.name}</h1>
                        <p className="text-slate-500 font-medium mb-4 flex items-center justify-center md:justify-start gap-2">
                            <Mail size={16}/> {user.email}
                        </p>
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-100 shadow-sm">
                            <ShieldCheck size={14}/> Akun murid aktif
                        </div>
                    </div>

                    {/* Tombol Simpan Desktop */}
                    <div className="hidden md:block">
                        <button 
                            type="submit" 
                            disabled={isSaving}
                            className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-xl hover:bg-indigo-700 hover:shadow-indigo-200 hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isSaving ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>}
                            Simpan Perubahan
                        </button>
                    </div>
                </div>
            </div>

            {/* === 2. GRID FORM === */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Kolom Kiri: Info Dasar */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-lg shadow-slate-200/40">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                            <User size={24}/>
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-800">Biodata Diri</h3>
                            <p className="text-xs text-slate-400 font-medium">Informasi dasar akun Anda</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Nama Lengkap</label>
                            <input 
                                type="text" 
                                value={user.name}
                                onChange={(e) => setUser({...user, name: e.target.value})}
                                className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:bg-white focus:ring-4 focus:ring-blue-50 border border-transparent focus:border-blue-200 transition-all placeholder:text-slate-300"
                                placeholder="Masukkan nama lengkap"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Nomor WhatsApp/telepon</label>
                            <input
                                type="tel"
                                value={user.phone}
                                onChange={(e) => setUser({...user, phone: e.target.value})}
                                className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:bg-white focus:ring-4 focus:ring-blue-50 border border-transparent focus:border-blue-200 transition-all placeholder:text-slate-300"
                                placeholder="Nomor yang dapat dihubungi saat kelas offline"
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Alamat Email</label>
                            <div className="relative group cursor-not-allowed">
                                <input 
                                    type="email" 
                                    value={user.email}
                                    disabled
                                    className="w-full p-4 pl-12 bg-slate-100 rounded-2xl font-bold text-slate-500 border border-transparent cursor-not-allowed"
                                />
                                <Mail size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
                                <div className="absolute inset-0 bg-white/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold text-slate-500 transition-opacity rounded-2xl backdrop-blur-[1px]">
                                    Hubungi Admin untuk ubah email
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Kolom Kanan: Keamanan */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-lg shadow-slate-200/40">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
                            <Lock size={24}/>
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-800">Keamanan</h3>
                            <p className="text-xs text-slate-400 font-medium">Kelola akses akun secara terpisah</p>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                        <p className="font-black text-slate-800">Kata sandi</p>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          Kata sandi tidak ditampilkan pada formulir biodata.
                        </p>
                        <p className="mt-3 text-xs font-medium text-slate-400">
                          Terakhir diperbarui: {formatAccountDate(user.password_updated_at)}
                        </p>
                        <div className="mt-5">
                          <ChangePasswordDialog
                            passwordUpdatedAt={user.password_updated_at}
                            onUpdated={(timestamp) => setUser((current) => ({
                              ...current,
                              password_updated_at: timestamp,
                            }))}
                          />
                        </div>
                    </div>
                </div>
            </div>

            {/* Tombol Simpan Mobile */}
            <div className="md:hidden pt-4">
                <button 
                    type="submit" 
                    disabled={isSaving}
                    className="w-full flex justify-center items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-xl active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                >
                    {isSaving ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>}
                    Simpan Perubahan
                </button>
            </div>

        </form>
      </div>
    </StudentLayout>
  );
}
