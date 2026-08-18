import { notify } from "@/lib/notify";
import { API_BASE_URL } from "@/lib/http";
import React, { useEffect, useRef, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import axios from "axios";
import { useConfirmDialog } from "@/components/ConfirmDialogProvider";
import { 
  Save, Loader2, Plus, Trash2, MapPin, Phone, Mail, 
  Link as LinkIcon, UploadCloud, Globe, LayoutTemplate 
} from "lucide-react";
import { isValidHttpUrl, isValidPhone, sanitizePhoneInput, validateUpload } from "@/lib/validation";

/* ================= TYPES ================= */
type SocialItem = {
  id: number;
  name: string;
  link: string;
  icon_url: string;
};

type FooterForm = {
  footer_address: string;
  footer_phone: string;
  footer_email: string;
};

/* ================= COMPONENT ================= */
export default function EditFooter() {
  const confirmDialog = useConfirmDialog();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Form Data Utama (Settings)
  const [formData, setFormData] = useState<FooterForm>({
    footer_address: "",
    footer_phone: "",
    footer_email: "",
  });

  // Data Sosmed
  const [socials, setSocials] = useState<SocialItem[]>([]);
  
  // Input Baru
  const [newName, setNewName] = useState("");
  const [newLink, setNewLink] = useState("");
  const [newFile, setNewFile] = useState<File | null>(null);
  const [previewFile, setPreviewFile] = useState<string | null>(null);
  const previewObjectUrlRef = useRef<string | null>(null);

  const replacePreviewFile = (nextUrl: string | null) => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
    }
    previewObjectUrlRef.current = nextUrl;
    setPreviewFile(nextUrl);
  };

  // --- LOAD DATA ---
  const fetchSocials = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/socials`);
      setSocials(res.data);
    } catch (error) {
      console.error("Gagal load sosmed");
    }
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // 1. Ambil Settings (Alamat dll)
        const res = await axios.get(`${API_BASE_URL}/settings/footer`);
        setFormData({
          footer_address: res.data.footer_address ?? "",
          footer_phone: sanitizePhoneInput(res.data.footer_phone ?? ""),
          footer_email: res.data.footer_email ?? "",
        });

        // 2. Ambil Sosmed
        await fetchSocials();

      } catch {
        notify.error("Gagal memuat data");
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => () => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
  }, []);

  // --- HANDLER SIMPAN SETTINGS ---
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidPhone(formData.footer_phone)) {
      notify.error("Nomor telepon atau WhatsApp harus berisi 8–15 angka.");
      return;
    }
    setIsSaving(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API_BASE_URL}/admin/settings/footer`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      notify.success("Informasi kontak berhasil diperbarui!");
    } catch {
      notify.error("Gagal menyimpan kontak.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- HANDLER PREVIEW IMAGE ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const error = validateUpload(file, {
          label: "Ikon media sosial",
          maxSizeMb: 2,
          extensions: ["jpg", "jpeg", "png", "webp"],
        });
        if (error) {
          notify.error(error);
          e.target.value = "";
          return;
        }
        setNewFile(file);
        // Buat preview URL sementara
        const objectUrl = URL.createObjectURL(file);
        replacePreviewFile(objectUrl);
    }
  };

  // --- HANDLER TAMBAH SOSMED ---
  const handleAddSocial = async () => {
    if (!newName || !newLink || !newFile) {
      return notify.error("Nama, Link, dan Icon wajib diisi!");
    }
    if (!isValidHttpUrl(newLink)) {
      return notify.error("Tautan media sosial harus diawali http:// atau https://.");
    }

    setIsUploading(true);
    try {
      const token = localStorage.getItem("token");
      
      const data = new FormData();
      data.append("name", newName);
      data.append("link", newLink);
      data.append("icon", newFile);

      await axios.post(`${API_BASE_URL}/admin/socials`, data, {
        headers: { 
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data"
        }
      });

      notify.success("Sosial media berhasil ditambahkan!");
      
      // Reset Form
      setNewName("");
      setNewLink("");
      setNewFile(null);
      replacePreviewFile(null);
      fetchSocials(); 

    } catch (error) {
      console.error(error);
      notify.error("Gagal upload data.");
    } finally {
      setIsUploading(false);
    }
  };

  // --- HANDLER HAPUS SOSMED ---
  const handleDeleteSocial = async (id: number) => {
    const approved = await confirmDialog({
      title: "Hapus media sosial?",
      description: "Tautan dan ikon ini akan dihapus dari footer website.",
      confirmText: "Hapus",
      tone: "danger",
    });
    if (!approved) return;
    
    try {
        const token = localStorage.getItem("token");
        await axios.delete(`${API_BASE_URL}/admin/socials/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        notify.success("Berhasil dihapus.");
        fetchSocials();
    } catch {
        notify.error("Gagal menghapus.");
    }
  };

  return (
    <AdminLayout title="Edit Footer">
      <div className="max-w-6xl mx-auto pb-20 animate-in fade-in duration-500">
        
        {/* HEADER SECTION */}
        <div className="relative mb-10 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[2rem] p-8 text-white shadow-xl overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight mb-2">Pengaturan Footer</h2>
                    <p className="text-blue-100 max-w-xl">Kelola informasi kontak, alamat, dan tautan sosial media yang tampil di bagian bawah website.</p>
                </div>
                <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                    <LayoutTemplate size={32} className="text-white"/>
                </div>
            </div>
            {/* Dekorasi Background */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-white opacity-5 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>
        </div>

        {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="animate-spin text-indigo-600 mb-2" size={40}/>
                <p className="text-slate-500 font-medium">Memuat data...</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* --- KOLOM KIRI: FORM KONTAK --- */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm sticky top-6">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-50">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                                <Globe size={20}/>
                            </div>
                            <h3 className="font-bold text-slate-800">Informasi Kontak</h3>
                        </div>

                        <form onSubmit={handleSaveSettings} className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Alamat Kantor</label>
                                <div className="relative group">
                                    <MapPin size={18} className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors"/>
                                    <textarea 
                                        rows={4} 
                                        value={formData.footer_address} 
                                        onChange={(e) => setFormData({...formData, footer_address: e.target.value})} 
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition resize-none leading-relaxed"
                                        placeholder="Masukkan alamat lengkap..."
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">No. Telepon / WA</label>
                                <div className="relative group">
                                    <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors"/>
                                    <input 
                                        value={formData.footer_phone} 
                                        inputMode="tel"
                                        maxLength={16}
                                        onChange={(e) => setFormData({...formData, footer_phone: sanitizePhoneInput(e.target.value)})} 
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition"
                                        placeholder="+62..."
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Email Resmi</label>
                                <div className="relative group">
                                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors"/>
                                    <input 
                                        type="email"
                                        value={formData.footer_email} 
                                        onChange={(e) => setFormData({...formData, footer_email: e.target.value})} 
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition"
                                        placeholder="email@bimbel.com"
                                    />
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                disabled={isSaving} 
                                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-slate-200 disabled:opacity-70 flex items-center justify-center gap-2 mt-4"
                            >
                                {isSaving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
                                Simpan Kontak
                            </button>
                        </form>
                    </div>
                </div>

                {/* --- KOLOM KANAN: SOSIAL MEDIA --- */}
                <div className="lg:col-span-2 space-y-8">
                    
                    {/* LIST GRID */}
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                    <Globe size={20}/>
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">Daftar Sosial Media</h3>
                                    <p className="text-xs text-slate-400 mt-0.5">Icon yang tampil di footer.</p>
                                </div>
                            </div>
                            <div className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">
                                {socials.length} Item
                            </div>
                        </div>

                        {socials.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-slate-300">
                                    <Globe size={24}/>
                                </div>
                                <p className="text-slate-500 font-medium">Belum ada sosial media ditambahkan.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                                {socials.map((item) => (
                                    <div key={item.id} className="group relative bg-white border border-slate-200 hover:border-indigo-200 p-4 rounded-2xl transition-all hover-shadow-lg flex flex-col items-center text-center">
                                        <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mb-3 group-hover-scale-110 transition-transform overflow-hidden p-2 border border-slate-100">
                                            <img src={item.icon_url} alt={item.name} loading="lazy" decoding="async" className="w-full h-full object-contain"/>
                                        </div>
                                        <h4 className="font-bold text-slate-800 text-sm truncate w-full">{item.name}</h4>
                                        <a href={item.link} target="_blank" rel="noreferrer" className="text-[10px] text-slate-400 hover:text-indigo-500 truncate w-full block mt-1">
                                            {item.link}
                                        </a>
                                        
                                        <button 
                                            onClick={() => handleDeleteSocial(item.id)}
                                            className="absolute top-2 right-2 p-1.5 bg-white text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg shadow-sm border border-slate-100 opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100"
                                            title="Hapus"
                                        >
                                            <Trash2 size={14}/>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* FORM UPLOAD BARU */}
                    <div className="bg-slate-900 rounded-[2rem] p-8 shadow-xl text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 opacity-20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                        
                        <div className="relative z-10">
                            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                <Plus className="bg-white/20 p-1 rounded-lg w-7 h-7"/> 
                                Tambah Sosial Media Baru
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                {/* Input Text */}
                                <div className="md:col-span-8 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nama Platform</label>
                                            <input 
                                                value={newName} 
                                                onChange={e => setNewName(e.target.value)} 
                                                className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-sm font-medium text-white placeholder-white/30 focus:outline-none focus:bg-white/20 focus:border-white/30 transition"
                                                placeholder="Contoh: Instagram"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Link URL</label>
                                            <div className="relative">
                                                <LinkIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/>
                                                <input 
                                                    value={newLink} 
                                                    onChange={e => setNewLink(e.target.value)} 
                                                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/10 rounded-xl text-sm font-medium text-white placeholder-white/30 focus:outline-none focus:bg-white/20 focus:border-white/30 transition"
                                                    placeholder="https://..."
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <button 
                                        onClick={handleAddSocial} 
                                        disabled={isUploading}
                                        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-900/50 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        {isUploading ? <Loader2 className="animate-spin" size={18}/> : <Plus size={18}/>}
                                        Tambahkan Sekarang
                                    </button>
                                </div>

                                {/* Input Upload Image */}
                                <div className="md:col-span-4">
                                    <label className="cursor-pointer group flex flex-col items-center justify-center w-full h-full min-h-[140px] border-2 border-dashed border-white/20 rounded-2xl bg-white/5 hover:bg-white/10 transition-all relative overflow-hidden">
                                        
                                        {previewFile ? (
                                            <div className="relative w-full h-full flex items-center justify-center p-4">
                                                <img src={previewFile} alt="Preview" loading="lazy" decoding="async" className="max-w-full max-h-[100px] object-contain drop-shadow-md"/>
                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <p className="text-xs font-bold text-white">Ganti Gambar</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center pt-5 pb-6 text-slate-400 group-hover:text-white transition-colors">
                                                <UploadCloud size={32} className="mb-3"/>
                                                <p className="text-xs font-bold mb-1">Klik untuk Upload Icon</p>
                                                <p className="text-[10px] opacity-70">PNG, JPG, atau WebP (maks. 2 MB)</p>
                                            </div>
                                        )}
                                        
                                        <input 
                                            type="file" 
                                            accept=".jpg,.jpeg,.png,.webp"
                                            onChange={handleFileChange} 
                                            className="hidden" 
                                        />
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        )}
      </div>
    </AdminLayout>
  );
}
