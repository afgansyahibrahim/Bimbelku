import { API_BASE_URL } from "@/lib/http";
import { useCallback, useState, useEffect } from "react";
import AdminLayout from "../../components/AdminLayout";
import { 
  Users, Search, Ban, Unlock, GraduationCap, School, 
  Eye, X, Mail, Calendar, Building2, BookOpen, Linkedin, FileText, CheckCircle, Loader2, ExternalLink, Wifi, MapPin,
  Phone, UserRoundCheck,
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { useConfirmDialog } from "@/components/ConfirmDialogProvider";
import { openProtectedFile } from "@/components/ProtectedImage";

export default function UserManagement() {
  const confirmDialog = useConfirmDialog();
  const [users, setUsers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"student" | "teacher">("student");
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // State Modal Detail
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // 1. FETCH DATA DARI API
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      // Request ke: /api/admin/users?role=student ATAU ?role=teacher
      const response = await axios.get(`${API_BASE_URL}/admin/users?role=${activeTab}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      console.error(error);
      toast.error("Gagal memuat data pengguna.");
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  // 2. FUNGSI BLOKIR / AKTIFKAN
  const toggleStatus = async (user: any) => {
    const newStatus = user.status === 'active' ? 'banned' : 'active';
    const confirmMessage = newStatus === 'banned' 
      ? `Yakin ingin memblokir ${user.name}? Mereka tidak akan bisa login.` 
      : `Aktifkan kembali akun ${user.name}?`;

    const approved = await confirmDialog({
      title: newStatus === "banned" ? "Blokir akun?" : "Aktifkan kembali akun?",
      description: confirmMessage,
      confirmText: newStatus === "banned" ? "Blokir" : "Aktifkan",
      tone: newStatus === "banned" ? "danger" : "primary",
    });
    if (!approved) return;

    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API_BASE_URL}/admin/users/status`, {
        user_id: user.id,
        status: newStatus
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success(newStatus === 'banned' ? "User berhasil diblokir" : "User berhasil diaktifkan");
      fetchUsers(); 

    } catch (error: any) {
      toast.error(error.response?.data?.message || "Gagal mengubah status pengguna.");
    }
  };

  const openModal = (user: any) => {
    setSelectedUser(user);
    setModalOpen(true);
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout title="Manajemen Akun Pengguna">
      
      {/* MODAL POPUP LIHAT DATA */}
      {modalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 relative">
            
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                {selectedUser.role === "student" ? <School size={20} className="text-blue-500"/> : <GraduationCap size={20} className="text-orange-500"/>}
                Detail {selectedUser.role === 'student' ? 'Murid' : 'Tutor'}
              </h3>
              <button onClick={() => setModalOpen(false)}><X size={24} className="text-gray-400 hover:text-gray-600" /></button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[80vh]">
               {/* HEADER PROFIL */}
               <div className="flex items-center gap-4 mb-6">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold border-2 border-white shadow-sm ${selectedUser.role === 'teacher' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                    {selectedUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-900">{selectedUser.name}</h4>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                       <Mail size={14} /> {selectedUser.email}
                    </div>
                    <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-bold ${selectedUser.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        Status: {selectedUser.status.toUpperCase()}
                    </span>
                  </div>
               </div>

               <div className="border-t border-gray-100 pt-4 space-y-4">
                  
                  {/* --- TAMPILAN KHUSUS MURID (LENGKAP) --- */}
                  {selectedUser.role === "student" && (
                    <div className="grid grid-cols-1 gap-4">
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                            <label className="text-xs text-blue-500 uppercase font-bold flex items-center gap-1 mb-1">
                                <Building2 size={14} /> Asal Sekolah
                            </label>
                            <p className="font-bold text-gray-900">{selectedUser.school_name || "-"}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <label className="text-xs text-gray-500 uppercase font-bold flex items-center gap-1 mb-1">
                                <CheckCircle size={14} /> Jenjang / Kelas
                            </label>
                            <p className="font-bold text-gray-900">{selectedUser.grade || "-"}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <label className="text-xs text-gray-500 uppercase font-bold flex items-center gap-1 mb-1">
                                <Calendar size={14} /> Tanggal Lahir
                            </label>
                            <p className="font-bold text-gray-900">{selectedUser.student_birth_date || "Data lama belum dilengkapi"}</p>
                        </div>
                        {selectedUser.guardian && (
                          <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                            <label className="mb-2 flex items-center gap-1 text-xs font-bold uppercase text-amber-700">
                              <UserRoundCheck size={14} /> Orang Tua / Wali
                            </label>
                            <p className="font-bold text-gray-900">{selectedUser.guardian.name}</p>
                            <p className="mt-1 text-sm text-gray-600">{guardianRelationship(selectedUser.guardian.relationship)}</p>
                            <p className="mt-2 flex items-center gap-2 text-sm text-gray-700">
                              <Phone size={14} /> {selectedUser.guardian.phone}
                            </p>
                            <p className="mt-2 text-xs font-semibold text-emerald-700">Persetujuan wali telah tercatat.</p>
                          </div>
                        )}
                    </div>
                  )}

                  {/* --- TAMPILAN KHUSUS GURU (LENGKAP) --- */}
                  {selectedUser.role === "teacher" && selectedUser.teacher_profile && (
                    <div className="space-y-4">
                      {/* Grid Keahlian & Metode */}
                      <div className="grid grid-cols-2 gap-4">
                          <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                             <label className="text-xs text-gray-500 uppercase font-bold flex items-center gap-1 mb-1">
                                <BookOpen size={14} /> Keahlian
                             </label>
                             <p className="font-bold text-gray-900 text-sm">{selectedUser.teacher_profile.expertise || "-"}</p>
                          </div>
                          <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                             <label className="text-xs text-blue-500 uppercase font-bold flex items-center gap-1 mb-1">
                                {selectedUser.teacher_profile.teaching_method === 'Online' ? <Wifi size={14}/> : <MapPin size={14}/>} Metode
                             </label>
                             <p className="font-bold text-blue-900 text-sm capitalize">{selectedUser.teacher_profile.teaching_method || "-"}</p>
                          </div>
                      </div>
                      
                      {/* LinkedIn */}
                      {selectedUser.teacher_profile.linkedin && (
                        <div>
                            <label className="text-xs text-gray-500 uppercase font-bold flex items-center gap-1 mb-1.5"><Linkedin size={14}/> LinkedIn</label>
                            <a href={selectedUser.teacher_profile.linkedin} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm truncate block bg-gray-50 p-2 rounded-lg border border-gray-200">
                                {selectedUser.teacher_profile.linkedin}
                            </a>
                        </div>
                      )}

                      {/* Preview CV */}
                      <div>
                        <label className="text-xs text-gray-500 uppercase font-bold flex items-center gap-1 mb-2">
                          <FileText size={14} /> Dokumen CV
                        </label>
                        {selectedUser.teacher_profile.cv_url ? (
                             <button
                                type="button"
                                onClick={() => void openProtectedFile(
                                  selectedUser.teacher_profile.cv_url,
                                  `cv-${selectedUser.name}.pdf`,
                                ).catch(() => toast.error("CV gagal dibuka."))}
                                className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:bg-orange-50 hover:border-orange-200 transition group cursor-pointer bg-white"
                             >
                                <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                                    <FileText size={20} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-gray-900">Lihat CV</p>
                                    <p className="text-xs text-gray-500">Buka pratinjau PDF tanpa mengunduh</p>
                                </div>
                                <ExternalLink size={18} className="text-gray-400 group-hover:text-orange-600"/>
                             </button>
                        ) : (
                            <div className="p-3 bg-gray-100 rounded-xl text-sm text-gray-500 italic">Tidak ada file CV.</div>
                        )}
                      </div>
                    </div>
                  )}
               </div>

               <div className="pt-4 mt-4 border-t border-gray-100">
                 <button onClick={() => setModalOpen(false)} className="w-full py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors">
                   Tutup
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TABEL UTAMA --- */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        
        {/* HEADER & FILTER */}
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
           {/* TAB SWITCHER */}
           <div className="flex bg-gray-100/80 p-1 rounded-xl w-full sm:w-auto">
              <button 
                onClick={() => setActiveTab("student")}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "student" ? "bg-white text-orange-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                <School size={16} /> Data Murid
              </button>
              <button 
                onClick={() => setActiveTab("teacher")}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "teacher" ? "bg-white text-orange-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                <GraduationCap size={16} /> Data Tutor
              </button>
           </div>

           {/* SEARCH BOX */}
           <div className="relative w-full sm:w-64">
             <input 
               type="text" 
               placeholder={activeTab === 'student' ? "Cari murid..." : "Cari tutor..."} 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all" 
             />
             <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
           </div>
        </div>

        {/* TABEL */}
        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full text-left">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold">
              <tr>
                <th className="px-6 py-4">Nama Lengkap</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Detail</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                  <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-500"><Loader2 className="animate-spin inline mr-2"/> Memuat data...</td></tr>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((u) => (
                  <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${u.status === 'banned' ? 'bg-red-50/50' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border border-white shadow-sm ${u.role === 'teacher' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{u.email}</td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-full w-fit ${u.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'active' ? 'bg-green-600' : 'bg-red-600'}`}></span>
                        {u.status === 'active' ? 'Aktif' : 'Blokir'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => openModal(u)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold hover:bg-orange-100 hover:text-orange-700 transition-colors"
                      >
                        <Eye size={14} /> Lihat
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {u.status === 'active' ? (
                        <button 
                          onClick={() => toggleStatus(u)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs font-bold hover:bg-red-50 transition-colors"
                        >
                          <Ban size={14} /> Blokir
                        </button>
                      ) : (
                        <button 
                          onClick={() => toggleStatus(u)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 border border-green-200 text-green-600 rounded-lg text-xs font-bold hover:bg-green-50 transition-colors"
                        >
                          <Unlock size={14} /> Aktifkan
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                    Tidak ditemukan data {activeTab === 'student' ? 'murid' : 'tutor'} yang cocok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}

function guardianRelationship(value?: string) {
  return {
    orang_tua: "Orang tua",
    wali_keluarga: "Wali keluarga",
    wali_resmi: "Wali resmi lainnya",
  }[value || ""] || "Wali";
}
