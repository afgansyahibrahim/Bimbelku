import { notify } from "@/lib/notify";
import { API_BASE_URL } from "@/lib/http";
import { useState, useEffect } from "react";
import AdminLayout from "../../components/AdminLayout"; // Sesuaikan path import
import axios from "axios";
import { 
  Search, Send, User, CheckCircle2, X, MessageSquare, Loader2
} from "lucide-react";
import { useConfirmDialog } from "@/components/ConfirmDialogProvider";

export default function SendMessage() {
  const confirm = useConfirmDialog();
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [messageTitle, setMessageTitle] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const lower = search.toLowerCase();
    const filtered = users.filter(u => 
        u.name.toLowerCase().includes(lower) || 
        u.email.toLowerCase().includes(lower)
    );
    setFilteredUsers(filtered);
  }, [search, users]);

  const fetchUsers = async () => {
    try {
        const token = localStorage.getItem("token");
        // Kita pakai endpoint getUsers yang sudah ada di AdminController
        // Asumsi: endpoint ini mengembalikan semua user (student & teacher)
        // Kita panggil 2 kali untuk student dan teacher lalu gabung, atau buat endpoint khusus 'all-users'
        // Di sini saya pakai trik panggil endpoint user yang sudah ada
        const resStudent = await axios.get(`${API_BASE_URL}/admin/users?role=student`, { headers: { Authorization: `Bearer ${token}` }});
        const resTeacher = await axios.get(`${API_BASE_URL}/admin/users?role=teacher`, { headers: { Authorization: `Bearer ${token}` }});
        
        const allUsers = [...resTeacher.data, ...resStudent.data];
        setUsers(allUsers);
        setFilteredUsers(allUsers);
    } catch (error) {
        notify.error("Daftar pengguna gagal dimuat.");
    } finally {
        setIsLoading(false);
    }
  };

  const openModal = (user: any) => {
      setSelectedUser(user);
      setMessageTitle("");
      setMessageBody("");
      setIsModalOpen(true);
  };

  const handleSend = async () => {
      if(!selectedUser || !messageTitle.trim() || !messageBody.trim()) {
          notify.error("Judul dan pesan wajib diisi.");
          return;
      }
      const approved = await confirm({
        title: `Kirim notifikasi ke ${selectedUser.name}?`,
        description: "Pesan akan langsung muncul pada dashboard pengguna dan tidak dapat ditarik kembali dari halaman ini.",
        confirmText: "Ya, kirim",
        cancelText: "Periksa lagi",
        tone: "primary",
      });
      if (!approved) return;

      setIsSending(true);
      try {
          const token = localStorage.getItem("token");
          await axios.post(`${API_BASE_URL}/admin/notifications/send`, {
              user_id: selectedUser.id,
              title: messageTitle.trim(),
              message: messageBody.trim(),
              type: 'info'
          }, {
              headers: { Authorization: `Bearer ${token}` }
          });
          
          notify.success(`Pesan terkirim ke ${selectedUser.name}`);
          setIsModalOpen(false);
      } catch (error) {
          console.error(error);
          notify.error("Gagal mengirim pesan.");
      } finally {
          setIsSending(false);
      }
  };

  return (
    <AdminLayout title="Kirim Pesan Notifikasi">
      <div className="space-y-6 animate-in fade-in duration-500">
        
        {/* SEARCH BAR */}
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center">
            <div>
                <h2 className="text-lg font-bold text-slate-800">Daftar Pengguna</h2>
                <p className="text-slate-500 text-sm">Cari tutor atau murid untuk dikirimi pesan.</p>
            </div>
            <div className="relative w-full md:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20}/>
                <input 
                    type="text" 
                    placeholder="Cari nama atau email..." 
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
        </div>

        {/* LIST USER */}
        {isLoading ? (
            <div className="text-center py-20"><Loader2 className="animate-spin mx-auto text-indigo-600"/></div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredUsers.map((user) => (
                    <div key={user.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm hover-shadow-md transition-all flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white shadow-md ${user.role === 'teacher' ? 'bg-indigo-600' : 'bg-orange-500'}`}>
                                {user.photo_url ? (
                                    <img src={user.photo_url} alt={`Foto ${user.name}`} loading="lazy" decoding="async" className="w-full h-full rounded-full object-cover"/>
                                ) : (
                                    user.name.charAt(0).toUpperCase()
                                )}
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 line-clamp-1">{user.name}</h4>
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${user.role === 'teacher' ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600'}`}>
                                    {user.role === 'teacher' ? 'Tutor' : 'Murid'}
                                </span>
                            </div>
                        </div>
                        
                        <button 
                            onClick={() => openModal(user)}
                            className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-95"
                            title="Kirim Pesan"
                        >
                            <Send size={18} />
                        </button>
                    </div>
                ))}
                {filteredUsers.length === 0 && (
                    <div className="col-span-full text-center py-10 text-slate-400 italic">User tidak ditemukan.</div>
                )}
            </div>
        )}

        {/* MODAL KIRIM PESAN */}
        {isModalOpen && selectedUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-8 relative animate-in zoom-in-95 duration-200">
                    <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 p-2 bg-slate-50 rounded-full hover:bg-slate-100 transition"><X size={20}/></button>
                    
                    <div className="mb-6">
                        <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-4 shadow-sm">
                            <MessageSquare size={28}/>
                        </div>
                        <h3 className="text-2xl font-black text-slate-900">Kirim Notifikasi</h3>
                        <p className="text-slate-500 text-sm mt-1">
                            Pesan ini akan muncul di dashboard <span className="font-bold text-indigo-600">{selectedUser.name}</span>.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase ml-1">Judul Pesan</label>
                            <input 
                                type="text" 
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="Contoh: Pengingat Jadwal"
                                value={messageTitle}
                                onChange={(e) => setMessageTitle(e.target.value)}
                                maxLength={180}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase ml-1">Isi Pesan</label>
                            <textarea 
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 h-32 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="Tulis pesan Anda di sini..."
                                value={messageBody}
                                onChange={(e) => setMessageBody(e.target.value)}
                                maxLength={2000}
                            ></textarea>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end gap-3">
                        <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition">Batal</button>
                        <button 
                            onClick={handleSend} 
                            disabled={isSending}
                            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center gap-2"
                        >
                            {isSending ? <Loader2 className="animate-spin" size={20}/> : <Send size={20}/>}
                            Kirim Sekarang
                        </button>
                    </div>
                </div>
            </div>
        )}

      </div>
    </AdminLayout>
  );
}
