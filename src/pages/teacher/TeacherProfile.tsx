import { FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Camera,
  Check,
  GraduationCap,
  Loader2,
  LocateFixed,
  MapPin,
  Monitor,
  Save,
  ShieldCheck,
  Sparkles,
  Store,
  User,
  FileCheck2,
  IdCard,
  ImagePlus,
} from "lucide-react";
import { toast } from "sonner";
import TeacherLayout from "@/components/TeacherLayout";
import { useConfirmDialog } from "@/components/ConfirmDialogProvider";
import CameraCapture from "@/components/CameraCapture";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import http, { getApiError, STORAGE_BASE_URL } from "@/lib/http";
import { isValidPhone, validateUpload } from "@/lib/validation";

const levels = ["SD", "SMP", "SMA", "Umum"];

interface ProfileState {
  name: string;
  email: string;
  title: string;
  location: string;
  experience: string;
  bio: string;
  whatsapp_number: string;
  latitude: string;
  longitude: string;
  max_travel_km: string;
  is_accepting_requests: boolean;
  photo: string;
  photoFile: File | null;
  profileCover: string;
  profileCoverFile: File | null;
  points: number;
  userStatus: string;
  documentUrls: Record<string, string>;
  documentFiles: Record<string, File | null>;
  subject: string;
  subjectLevels: string[];
  is_online: boolean;
  is_offline: boolean;
}

const initialState: ProfileState = {
  name: "",
  email: "",
  title: "",
  location: "",
  experience: "",
  bio: "",
  whatsapp_number: "",
  latitude: "",
  longitude: "",
  max_travel_km: "12",
  is_accepting_requests: true,
  photo: "",
  photoFile: null,
  profileCover: "",
  profileCoverFile: null,
  points: 150,
  userStatus: "",
  documentUrls: {},
  documentFiles: {},
  subject: "",
  subjectLevels: [],
  is_online: true,
  is_offline: true,
};

export default function TeacherProfile() {
  const navigate = useNavigate();
  const confirm = useConfirmDialog();
  const [profile, setProfile] = useState<ProfileState>(initialState);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSubject, setSavingSubject] = useState(false);
  const [locating, setLocating] = useState(false);
  const photoPreviewUrlRef = useRef<string | null>(null);
  const coverPreviewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    void loadProfile();
    return () => {
      if (photoPreviewUrlRef.current) URL.revokeObjectURL(photoPreviewUrlRef.current);
      if (coverPreviewUrlRef.current) URL.revokeObjectURL(coverPreviewUrlRef.current);
    };
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const [response, coverResponse] = await Promise.all([
        http.get("/teacher/profile"),
        http.get("/settings/teacher-cover").catch(() => null),
      ]);
      const { user, profile: teacherProfile } = response.data;
      const subject = teacherProfile.subjects?.[0];
      setProfile({
        name: user.name || "",
        email: user.email || "",
        title: teacherProfile.title || "",
        location: teacherProfile.location || "",
        experience: teacherProfile.experience || "",
        bio: teacherProfile.bio || "",
        whatsapp_number: teacherProfile.whatsapp_number || user.phone || "",
        latitude: teacherProfile.latitude?.toString() || "",
        longitude: teacherProfile.longitude?.toString() || "",
        max_travel_km: teacherProfile.max_travel_km?.toString() || "12",
        is_accepting_requests: teacherProfile.is_accepting_requests ?? true,
        photo: teacherProfile.photo ? `${STORAGE_BASE_URL}/storage/${teacherProfile.photo}` : "",
        photoFile: null,
        profileCover: teacherProfile.profile_cover_url || coverResponse?.data?.url || "",
        profileCoverFile: null,
        points: Number(teacherProfile.points || 150),
        userStatus: user.status || "",
        documentUrls: {
          identity_document: teacherProfile.identity_document_url || "",
          live_selfie: teacherProfile.live_selfie_url || "",
          qualification_document: teacherProfile.qualification_document_url || "",
          certification_document: teacherProfile.certification_document_url || "",
        },
        documentFiles: {},
        subject: subject?.name || "",
        subjectLevels: subject?.levels || [],
        is_online: subject?.is_online ?? true,
        is_offline: subject?.is_offline ?? true,
      });
    } catch (error) {
      toast.error(getApiError(error, "Profil tutor gagal dimuat."));
    } finally {
      setLoading(false);
    }
  };

  const handlePhoto = (file?: File) => {
    if (!file) return;
    const error = validateUpload(file, {
      label: "Foto profil",
      maxSizeMb: 5,
      extensions: ["jpg", "jpeg", "png", "webp"],
    });
    if (error) {
      toast.error(error);
      return;
    }
    if (photoPreviewUrlRef.current) URL.revokeObjectURL(photoPreviewUrlRef.current);
    const previewUrl = URL.createObjectURL(file);
    photoPreviewUrlRef.current = previewUrl;
    setProfile((current) => ({ ...current, photoFile: file, photo: previewUrl }));
  };

  const handleCover = (file?: File) => {
    if (!file) return;
    const error = validateUpload(file, {
      label: "Sampul profil",
      maxSizeMb: 5,
      extensions: ["jpg", "jpeg", "png", "webp"],
    });
    if (error) {
      toast.error(error);
      return;
    }
    if (coverPreviewUrlRef.current) URL.revokeObjectURL(coverPreviewUrlRef.current);
    const previewUrl = URL.createObjectURL(file);
    coverPreviewUrlRef.current = previewUrl;
    setProfile((current) => ({
      ...current,
      profileCoverFile: file,
      profileCover: previewUrl,
    }));
  };

  const setDocument = (
    key: "identity_document" | "live_selfie" | "qualification_document" | "certification_document",
    file: File | null,
  ) => {
    const selfieOnly = key === "live_selfie";
    const error = validateUpload(file, {
      label: selfieOnly ? "Foto wajah langsung" : "Dokumen verifikasi",
      maxSizeMb: 5,
      extensions: selfieOnly ? ["jpg", "jpeg", "png", "webp"] : ["jpg", "jpeg", "png", "webp", "pdf"],
    });
    if (error) {
      toast.error(error);
      return;
    }
    setProfile((current) => ({
      ...current,
      documentFiles: { ...current.documentFiles, [key]: file },
    }));
  };

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (!isValidPhone(profile.whatsapp_number)) {
      toast.error("Nomor WhatsApp/telepon belum valid.");
      return;
    }
    setSavingProfile(true);
    try {
      const formData = new FormData();
      formData.append("name", profile.name);
      formData.append("title", profile.title);
      formData.append("location", profile.location);
      formData.append("experience", profile.experience);
      formData.append("bio", profile.bio);
      formData.append("whatsapp_number", profile.whatsapp_number);
      if (profile.latitude) formData.append("latitude", profile.latitude);
      if (profile.longitude) formData.append("longitude", profile.longitude);
      formData.append("max_travel_km", profile.max_travel_km);
      formData.append("is_accepting_requests", profile.is_accepting_requests ? "1" : "0");
      if (profile.photoFile) formData.append("photo", profile.photoFile);
      if (profile.profileCoverFile) formData.append("profile_cover", profile.profileCoverFile);
      Object.entries(profile.documentFiles).forEach(([key, file]) => {
        if (file) formData.append(key, file);
      });

      const response = await http.post("/teacher/profile", formData);
      toast.success(response.data.message);
      if (response.data.reverification_required) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login", { replace: true });
        return;
      }
      if (photoPreviewUrlRef.current) {
        URL.revokeObjectURL(photoPreviewUrlRef.current);
        photoPreviewUrlRef.current = null;
      }
      if (coverPreviewUrlRef.current) {
        URL.revokeObjectURL(coverPreviewUrlRef.current);
        coverPreviewUrlRef.current = null;
      }
      await loadProfile();
    } catch (error) {
      toast.error(getApiError(error, "Profil gagal disimpan."));
    } finally {
      setSavingProfile(false);
    }
  };

  const saveSubject = async () => {
    if (!profile.subject.trim()) {
      toast.error("Mata pelajaran utama wajib diisi.");
      return;
    }
    if (profile.subjectLevels.length === 0) {
      toast.error("Pilih minimal satu jenjang.");
      return;
    }
    if (!profile.is_online && !profile.is_offline) {
      toast.error("Aktifkan minimal satu mode mengajar.");
      return;
    }

    const approved = await confirm({
      title: "Simpan kompetensi tutor?",
      description: "Perubahan mata pelajaran atau jenjang utama harus diperiksa ulang oleh admin. Jika berubah, sesi login akan ditutup setelah data tersimpan.",
      confirmText: "Ya, simpan",
      tone: "warning",
    });
    if (!approved) return;

    setSavingSubject(true);
    try {
      const response = await http.post("/teacher/subjects", {
        subjects: [{
          name: profile.subject.trim(),
          levels: profile.subjectLevels,
          is_online: profile.is_online,
          is_offline: profile.is_offline,
        }],
      });
      toast.success(response.data.message);
      if (response.data.reverification_required) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login", { replace: true });
        return;
      }
      await loadProfile();
    } catch (error) {
      toast.error(getApiError(error, "Mata pelajaran gagal disimpan."));
    } finally {
      setSavingSubject(false);
    }
  };

  const toggleLevel = (level: string) => {
    setProfile((current) => ({
      ...current,
      subjectLevels: current.subjectLevels.includes(level)
        ? current.subjectLevels.filter((item) => item !== level)
        : [...current.subjectLevels, level],
    }));
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Perangkat ini tidak mendukung deteksi lokasi.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setProfile((current) => ({
          ...current,
          latitude: position.coords.latitude.toFixed(7),
          longitude: position.coords.longitude.toFixed(7),
        }));
        setLocating(false);
        toast.success("Titik lokasi tutor berhasil diisi.");
      },
      () => {
        setLocating(false);
        toast.error("Lokasi tidak dapat dibaca. Aktifkan izin lokasi pada browser.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  };

  if (loading) {
    return (
      <TeacherLayout title="Profil Tutor">
        <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="h-9 w-9 animate-spin text-indigo-600" /></div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout title="Profil Tutor">
      <div className="max-w-7xl mx-auto space-y-7 pb-12">
        <section
          className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 bg-cover bg-center px-7 py-8 text-white shadow-xl animate-in fade-in slide-in-from-bottom-3 duration-500"
          style={profile.profileCover ? {
            backgroundImage: `linear-gradient(120deg, rgba(2,6,23,.88), rgba(49,46,129,.78), rgba(76,29,149,.68)), url("${profile.profileCover}")`,
          } : undefined}
        >
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-indigo-400/20 blur-3xl" />
          <label className="absolute right-5 top-5 z-20 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/20 bg-slate-950/55 px-3 py-2 text-xs font-bold text-white shadow-lg backdrop-blur transition hover:bg-slate-950/75">
            <ImagePlus size={15} />
            Ubah sampul
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={(event) => handleCover(event.target.files?.[0])}
            />
          </label>
          <div className="relative flex flex-col gap-6 md:flex-row md:items-center">
            <label className="group relative h-28 w-28 shrink-0 cursor-pointer overflow-hidden rounded-[2rem] border-4 border-white/15 bg-white/10 shadow-xl">
              {profile.photo ? <img src={profile.photo} alt={profile.name} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center"><User size={38} className="text-indigo-200" /></div>}
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 opacity-0 transition group-hover:opacity-100"><Camera size={24} /></div>
              <input type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={(event) => handlePhoto(event.target.files?.[0])} />
            </label>
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-indigo-100"><Sparkles size={14} /> Profil pencocokan</div>
              <h1 className="mt-4 truncate text-3xl font-black">{profile.name || "Profil Tutor"}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100/80">Data ini dipakai sistem untuk menilai kecocokan mata pelajaran, jenjang, mode, dan jarak kelas offline.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 backdrop-blur">
              <div className="flex items-center gap-3"><ShieldCheck size={22} className="text-emerald-300" /><div><p className="text-sm font-black">{profile.points} / 200 poin</p><p className="text-[10px] uppercase tracking-widest text-indigo-100">{profile.userStatus === "active" ? "Tutor terverifikasi" : "Menunggu pemeriksaan"}</p></div></div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_.9fr] gap-7 items-start">
          <form onSubmit={saveProfile} className="rounded-[2rem] border border-slate-100 bg-white p-6 md:p-8 shadow-sm animate-in fade-in slide-in-from-left-3 duration-500">
            <div className="flex items-start justify-between gap-4"><div><h2 className="text-2xl font-black text-slate-900">Identitas dan wilayah</h2><p className="mt-1 text-sm text-slate-500">Alamat lengkap murid hanya muncul setelah pembayaran dikonfirmasi.</p></div><div className="h-11 w-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><User size={20} /></div></div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Nama lengkap"><Input value={profile.name} onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))} className="h-12 rounded-xl" required /></Field>
              <Field label="Email"><Input value={profile.email} className="h-12 rounded-xl bg-slate-50" disabled /></Field>
              <Field label="Judul profil"><Input value={profile.title} onChange={(event) => setProfile((current) => ({ ...current, title: event.target.value }))} className="h-12 rounded-xl" placeholder="Contoh: Tutor Matematika" /></Field>
              <Field label="Pengalaman"><Input value={profile.experience} onChange={(event) => setProfile((current) => ({ ...current, experience: event.target.value }))} className="h-12 rounded-xl" placeholder="Contoh: 4 tahun" /></Field>
              <div className="md:col-span-2"><Field label="Nomor WhatsApp/telepon"><Input required inputMode="tel" value={profile.whatsapp_number} onChange={(event) => setProfile((current) => ({ ...current, whatsapp_number: event.target.value }))} className="h-12 rounded-xl" placeholder="Contoh: 0812 3456 7890" /></Field></div>
              <div className="md:col-span-2"><Field label="Kota atau wilayah tinggal"><Input value={profile.location} onChange={(event) => setProfile((current) => ({ ...current, location: event.target.value }))} className="h-12 rounded-xl" placeholder="Contoh: Jakarta Selatan" /></Field></div>
              <Field label="Latitude, opsional"><Input type="number" step="any" value={profile.latitude} onChange={(event) => setProfile((current) => ({ ...current, latitude: event.target.value }))} className="h-12 rounded-xl" placeholder="-6.200000" /></Field>
              <Field label="Longitude, opsional"><Input type="number" step="any" value={profile.longitude} onChange={(event) => setProfile((current) => ({ ...current, longitude: event.target.value }))} className="h-12 rounded-xl" placeholder="106.816666" /></Field>
              <div className="md:col-span-2">
                <Button type="button" variant="outline" onClick={detectLocation} disabled={locating} className="h-11 w-full rounded-xl border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800">
                  {locating ? <Loader2 size={17} className="mr-2 animate-spin" /> : <LocateFixed size={17} className="mr-2" />}
                  Gunakan lokasi perangkat
                </Button>
              </div>
              <Field label="Batas perjalanan offline (maks. 12 km)"><Input type="number" min="1" max="12" value={profile.max_travel_km} onChange={(event) => setProfile((current) => ({ ...current, max_travel_km: event.target.value }))} className="h-12 rounded-xl" /></Field>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 flex items-center justify-between gap-4"><div><p className="font-bold text-slate-800">Terima permintaan baru</p><p className="mt-1 text-xs text-slate-500">Matikan saat sedang tidak tersedia.</p></div><Switch checked={profile.is_accepting_requests} onCheckedChange={(checked) => setProfile((current) => ({ ...current, is_accepting_requests: checked }))} /></div>
            </div>

            <div className="mt-5"><Field label="Tentang saya"><Textarea maxLength={3000} value={profile.bio} onChange={(event) => setProfile((current) => ({ ...current, bio: event.target.value }))} className="min-h-32 rounded-xl" placeholder="Jelaskan pendekatan mengajar secara ringkas." /></Field></div>

            <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <div className="flex items-start gap-3"><FileCheck2 className="mt-0.5 shrink-0 text-indigo-600" /><div><p className="font-black text-slate-800">Dokumen verifikasi</p><p className="mt-1 text-xs leading-5 text-slate-500">Mengganti dokumen pada akun aktif memicu pemeriksaan ulang dan menutup sesi login setelah disimpan.</p></div></div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <DocumentInput label="Kartu identitas" icon={IdCard} current={profile.documentUrls.identity_document} accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={(file) => setDocument("identity_document", file)} />
                <CameraCapture
                  file={profile.documentFiles.live_selfie}
                  currentAvailable={Boolean(profile.documentUrls.live_selfie)}
                  onCapture={(file) => setDocument("live_selfie", file)}
                />
                <DocumentInput label="Ijazah / kualifikasi" icon={GraduationCap} current={profile.documentUrls.qualification_document} accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={(file) => setDocument("qualification_document", file)} />
                <DocumentInput label="Sertifikat pendukung" icon={FileCheck2} current={profile.documentUrls.certification_document} accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={(file) => setDocument("certification_document", file)} />
              </div>
            </div>

            <Button type="submit" disabled={savingProfile} className="mt-7 h-12 w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-200">{savingProfile ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Save size={18} className="mr-2" />} Simpan profil</Button>
          </form>

          <section className="rounded-[2rem] border border-slate-100 bg-white p-6 md:p-8 shadow-sm animate-in fade-in slide-in-from-right-3 duration-500 xl:sticky xl:top-24">
            <div className="flex items-start justify-between gap-4"><div><h2 className="text-2xl font-black text-slate-900">Kompetensi mengajar</h2><p className="mt-1 text-sm text-slate-500">Satu tutor menggunakan satu mata pelajaran utama.</p></div><div className="h-11 w-11 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center"><BookOpen size={20} /></div></div>

            <div className="mt-6 space-y-5">
              <Field label="Mata pelajaran utama"><Input value={profile.subject} onChange={(event) => setProfile((current) => ({ ...current, subject: event.target.value }))} className="h-12 rounded-xl" placeholder="Contoh: Matematika" /></Field>

              <div>
                <Label className="mb-3 flex items-center gap-2 font-bold text-slate-700"><GraduationCap size={16} /> Jenjang yang dikuasai</Label>
                <div className="grid grid-cols-2 gap-3">
                  {levels.map((level) => {
                    const active = profile.subjectLevels.includes(level);
                    return <button type="button" key={level} onClick={() => toggleLevel(level)} className={`h-12 rounded-xl border font-bold transition ${active ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm" : "border-slate-200 bg-white text-slate-500 hover:border-indigo-200"}`}>{active && <Check size={15} className="mr-2 inline" />}{level}</button>;
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <ModeRow icon={Monitor} title="Mengajar online" description="Kelas menggunakan ruang pertemuan daring." checked={profile.is_online} onChange={(checked) => setProfile((current) => ({ ...current, is_online: checked }))} />
                <ModeRow icon={Store} title="Mengajar offline" description="Tutor mendatangi alamat murid tanpa biaya perjalanan." checked={profile.is_offline} onChange={(checked) => setProfile((current) => ({ ...current, is_offline: checked }))} />
              </div>

              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 flex items-start gap-3 text-amber-900"><MapPin size={18} className="mt-0.5 shrink-0" /><p className="text-sm leading-6">Sistem mengutamakan jarak dekat. Permintaan offline dapat ditolak ketika perjalanan dianggap terlalu berat.</p></div>

              <Button type="button" onClick={saveSubject} disabled={savingSubject} className="h-12 w-full rounded-xl bg-slate-950 hover:bg-violet-700 font-bold">{savingSubject ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Save size={18} className="mr-2" />} Simpan kompetensi</Button>
            </div>
          </section>
        </div>
      </div>
    </TeacherLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="mb-2 block font-bold text-slate-700">{label}</Label>{children}</div>;
}

function ModeRow({ icon: Icon, title, description, checked, onChange }: { icon: typeof Monitor; title: string; description: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 flex items-center justify-between gap-4"><div className="flex items-start gap-3"><div className="h-10 w-10 shrink-0 rounded-xl bg-white text-indigo-600 flex items-center justify-center"><Icon size={19} /></div><div><p className="font-bold text-slate-800">{title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{description}</p></div></div><Switch checked={checked} onCheckedChange={onChange} /></div>;
}

function DocumentInput({ label, icon: Icon, current, accept, capture, onChange }: { label: string; icon: typeof IdCard; current?: string; accept: string; capture?: "user" | "environment"; onChange: (file: File | null) => void }) {
  return <label className="cursor-pointer rounded-xl border border-dashed border-slate-200 bg-white p-3 hover:border-indigo-300"><div className="flex items-center gap-3"><Icon size={18} className="text-indigo-600" /><div className="min-w-0"><p className="text-xs font-bold text-slate-700">{label}</p><p className="truncate text-[11px] text-slate-400">{current ? "Tersedia · klik untuk mengganti" : "Belum ada · pilih berkas"}</p></div></div><Input type="file" accept={accept} capture={capture} className="hidden" onChange={(event) => onChange(event.target.files?.[0] || null)} /></label>;
}
