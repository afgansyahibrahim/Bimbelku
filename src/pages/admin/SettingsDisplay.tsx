import { API_BASE_URL } from "@/lib/http";
import { useState, useEffect, useRef } from "react";
import AdminLayout from "../../components/AdminLayout";
import axios from "axios";
import { toast } from "sonner";
import { Image, Upload, Save, Loader2, Info } from "lucide-react";
import { useConfirmDialog } from "@/components/ConfirmDialogProvider";
import { validateUpload } from "@/lib/validation";

export default function SettingsDisplay() {
  const confirm = useConfirmDialog();
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ambil gambar saat ini
  useEffect(() => {
    fetchCurrentCover();
  }, []);

  const fetchCurrentCover = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/settings/teacher-cover`);
      setPreview(res.data.url);
    } catch (error) {
      console.error(error);
    } finally {
      setIsFetching(false);
    }
  };

  // Handle pilih file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      const error = validateUpload(selected, {
        label: "Sampul tutor",
        maxSizeMb: 2,
        extensions: ["jpg", "jpeg", "png", "webp"],
      });
      if (error) {
        toast.error(error);
        e.target.value = "";
        return;
      }
      setFile(selected);
      // Buat preview lokal
      const objectUrl = URL.createObjectURL(selected);
      setPreview(objectUrl);
    }
  };

  // Handle Upload
  const handleSave = async () => {
    if (!file) return toast.error("Pilih gambar baru dulu.");

    const approved = await confirm({
      title: "Ganti sampul global tutor?",
      description: "Gambar ini akan menjadi latar header profil untuk seluruh tutor.",
      confirmText: "Ya, ganti sampul",
      tone: "primary",
    });
    if (!approved) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`${API_BASE_URL}/admin/settings/teacher-cover`, formData, {
        headers: { 
            "Authorization": `Bearer ${token}`,
            "Content-Type": "multipart/form-data"
        }
      });
      toast.success("Sampul tutor berhasil diperbarui.");
      setPreview(res.data.url); // Update preview dari server
      setFile(null); // Reset file input
    } catch (error) {
      toast.error("Gagal mengupload gambar.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AdminLayout title="Tampilan Tutor">
      <div className="max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Card Upload */}
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl p-8">
            
            <div className="flex items-start gap-4 mb-8">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
                    <Image size={24}/>
                </div>
                <div>
                    <h3 className="text-xl font-bold text-slate-900">Sampul Profil Tutor (Global)</h3>
                    <p className="text-slate-500 text-sm mt-1">
                        Gambar yang diunggah menjadi <strong>latar header</strong> untuk semua halaman profil tutor.
                    </p>
                </div>
            </div>

            {/* Preview Area */}
            <div className="relative w-full h-64 bg-slate-100 rounded-3xl overflow-hidden border-2 border-dashed border-slate-200 group mb-6">
                {isFetching ? (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <Loader2 className="animate-spin" />
                    </div>
                ) : preview ? (
                    <img src={preview} alt="Cover Preview" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                        <Image size={48} className="mb-2 opacity-50"/>
                        <span className="text-sm font-medium">Belum ada gambar</span>
                    </div>
                )}

                {/* Overlay Hover */}
                <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                     onClick={() => fileInputRef.current?.click()}>
                    <div className="bg-white/20 backdrop-blur-md text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 border border-white/30">
                        <Upload size={18}/> Ganti Gambar
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-xs text-slate-400 font-medium bg-slate-50 px-3 py-2 rounded-lg">
                    <Info size={14}/> Rekomendasi: 1200 x 400 pixel (JPG/PNG)
                </div>

                <div className="flex gap-3">
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept=".jpg,.jpeg,.png,.webp"
                        onChange={handleFileChange}
                    />
                    
                    {file && (
                         <button 
                            onClick={handleSave} 
                            disabled={isLoading}
                            className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition shadow-lg shadow-slate-200 disabled:opacity-50 flex items-center gap-2"
                        >
                            {isLoading ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
                            Simpan Perubahan
                        </button>
                    )}
                </div>
            </div>

        </div>
      </div>
    </AdminLayout>
  );
}
