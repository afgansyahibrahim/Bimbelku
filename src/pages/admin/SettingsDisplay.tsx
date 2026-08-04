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
  const previewObjectUrlRef = useRef<string | null>(null);

  // Ambil gambar saat ini
  useEffect(() => {
    fetchCurrentCover();
    return () => {
      if (previewObjectUrlRef.current) URL.revokeObjectURL(previewObjectUrlRef.current);
    };
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

  const optimizeCoverImage = async (selected: File): Promise<File> => {
    const sourceUrl = URL.createObjectURL(selected);
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const element = new window.Image();
        element.onload = () => resolve(element);
        element.onerror = () => reject(new Error("Gambar tidak dapat dibaca."));
        element.src = sourceUrl;
      });

      const maxWidth = 1600;
      const maxHeight = 900;
      const ratio = Math.min(1, maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
      const width = Math.max(1, Math.round(image.naturalWidth * ratio));
      const height = Math.max(1, Math.round(image.naturalHeight * ratio));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) return selected;
      context.drawImage(image, 0, 0, width, height);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/webp", 0.82);
      });
      if (!blob || blob.size >= selected.size) return selected;

      return new File([blob], "sampul-tutor.webp", {
        type: "image/webp",
        lastModified: Date.now(),
      });
    } finally {
      URL.revokeObjectURL(sourceUrl);
    }
  };

  // Handle pilih file dan kecilkan gambar sebelum dikirim.
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) return;

    const error = validateUpload(selected, {
      label: "Sampul tutor",
      maxSizeMb: 2,
      extensions: ["jpg", "jpeg", "png", "webp"],
    });
    if (error) {
      toast.error(error);
      event.target.value = "";
      return;
    }

    try {
      const optimized = await optimizeCoverImage(selected);
      setFile(optimized);
      if (previewObjectUrlRef.current) URL.revokeObjectURL(previewObjectUrlRef.current);
      const objectUrl = URL.createObjectURL(optimized);
      previewObjectUrlRef.current = objectUrl;
      setPreview(objectUrl);
      if (optimized.size < selected.size) {
        toast.success("Gambar diperkecil agar halaman tutor lebih ringan.");
      }
    } catch {
      toast.error("Gambar tidak dapat diproses. Pilih file lain.");
      event.target.value = "";
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
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
        previewObjectUrlRef.current = null;
      }
      setPreview(res.data.url); // Update preview dari server
      setFile(null); // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
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
                    <img src={preview} alt="Pratinjau sampul tutor" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                        <Image size={48} className="mb-2 opacity-50"/>
                        <span className="text-sm font-medium">Belum ada gambar</span>
                    </div>
                )}

                {/* Overlay Hover */}
                <button type="button" aria-label="Pilih gambar sampul tutor" className="absolute inset-0 flex items-center justify-center bg-slate-900/50 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                     onClick={() => fileInputRef.current?.click()}>
                    <div className="bg-white/20 backdrop-blur-md text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 border border-white/30">
                        <Upload size={18}/> Ganti Gambar
                    </div>
                </button>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                            type="button"
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
