import { API_BASE_URL } from "@/lib/http";
import { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { 
  FileCheck, CreditCard, Users, TrendingUp, 
  Calendar, LayoutDashboard, PieChart, Loader2, ArrowUpRight, Activity
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

// Helper Format Rupiah
const formatRupiah = (num: number) => {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num);
};

export default function DashboardOverview() {
  const [stats, setStats] = useState({
    revenue: { today: 0, month: 0, year: 0 },
    counts: { teachers: 0, orders: 0, users: 0 }
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE_URL}/admin/dashboard-stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast.error("Gagal memuat data dashboard.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Dashboard Utama">
        <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
          <Loader2 className="animate-spin text-orange-600" size={40} />
          <p className="text-sm font-medium text-slate-400 animate-pulse">Memuat data real-time...</p>
        </div>
      </AdminLayout>
    );
  }

  // Data Statistik Operasional
  const operationalStats = [
    { 
      label: "Verifikasi Tutor", 
      value: stats.counts.teachers, 
      sub: "Menunggu Persetujuan", 
      icon: FileCheck, 
      color: "text-orange-600",
      bg: "bg-orange-50",
      border: "border-orange-100"
    },
    { 
      label: "Cek Pembayaran", 
      value: stats.counts.orders, 
      sub: "Transaksi Pending", 
      icon: CreditCard, 
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-100"
    },
    { 
      label: "Total Pengguna", 
      value: stats.counts.users, 
      sub: "Akun Aktif", 
      icon: Users, 
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-100"
    },
  ];

  return (
    <AdminLayout title="Dashboard Utama">
      <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
        
        {/* === HERO SECTION: PENDAPATAN HARI INI === */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 p-8 md:p-12 text-white shadow-2xl shadow-slate-900/20">
            {/* Background Pattern */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-orange-500 rounded-full blur-3xl opacity-20 animate-pulse"></div>
            <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 bg-blue-500 rounded-full blur-3xl opacity-20"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-2 opacity-80">
                        <span className="flex h-2 w-2 rounded-full bg-green-400 animate-ping"></span>
                        <p className="text-sm font-bold uppercase tracking-widest text-slate-300">Live Revenue</p>
                    </div>
                    <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-2">
                        {formatRupiah(stats.revenue.today)}
                    </h1>
                    <p className="text-slate-400 font-medium">Total pendapatan masuk hari ini.</p>
                </div>
                
                <div className="flex gap-3">
                    <div className="bg-white/10 backdrop-blur-md border border-white/10 px-5 py-3 rounded-2xl">
                        <p className="text-xs text-slate-300 mb-1">Bulan Ini</p>
                        <p className="font-bold text-lg">{formatRupiah(stats.revenue.month)}</p>
                    </div>
                    <div className="bg-orange-500/20 backdrop-blur-md border border-orange-500/30 px-5 py-3 rounded-2xl text-orange-100">
                        <p className="text-xs opacity-80 mb-1">Tahun Ini</p>
                        <p className="font-bold text-lg">{formatRupiah(stats.revenue.year)}</p>
                    </div>
                </div>
            </div>
        </div>

        {/* === GRID OPERASIONAL === */}
        <div>
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100">
                    <Activity size={20} className="text-slate-800"/>
                </div>
                <h3 className="text-xl font-bold text-slate-800">Status Operasional</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {operationalStats.map((stat, index) => (
                <div key={index} className="group bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-default">
                    <div className="flex justify-between items-start mb-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
                            <stat.icon size={28} />
                        </div>
                        <div className="bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                            <ArrowUpRight size={16} className="text-slate-400 group-hover:text-slate-900 transition-colors"/>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-4xl font-black text-slate-800 mb-1">{stat.value}</h4>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-1">{stat.label}</p>
                        <p className="text-xs font-medium text-slate-400 bg-slate-50 inline-block px-2 py-1 rounded-lg">
                            {stat.sub}
                        </p>
                    </div>
                </div>
            ))}
            </div>
        </div>

        {/* === INFO BANNER === */}
        <div className="bg-gradient-to-r from-orange-50 to-white border border-orange-100 rounded-3xl p-8 flex flex-col md:flex-row items-center gap-6">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
                <LayoutDashboard size={32} className="text-orange-600" />
            </div>
            <div className="text-center md:text-left">
                <h3 className="text-lg font-bold text-slate-800">Halo, Super Admin!</h3>
                <p className="text-slate-600 mt-1 max-w-2xl">
                    Saat ini ada <strong className="text-orange-600">{stats.counts.teachers} tutor</strong> baru yang menunggu verifikasi dan <strong className="text-blue-600">{stats.counts.orders} pembayaran</strong> yang perlu diperiksa.
                </p>
            </div>
        </div>

      </div>
    </AdminLayout>
  );
}
