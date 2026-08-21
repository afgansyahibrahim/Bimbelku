import { notify } from "@/lib/notify";
import { FormEvent, lazy, Suspense, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  Eye,
  EyeOff,
  FileBadge,
  FileCheck2,
  GraduationCap,
  Loader2,
  Lock,
  Mail,
  MapPin,
  ShieldCheck,
  Upload,
  User,
  UserRoundCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import DateOfBirthInput from "@/components/DateOfBirthInput";

const CameraCapture = lazy(() => import("@/components/CameraCapture"));
const SubjectCombobox = lazy(() => import("@/components/SubjectCombobox"));
import type { SubjectOption } from "@/components/SubjectCombobox";
import { EDUCATION_LEVELS, GRADES_BY_EDUCATION_LEVEL } from "@/lib/educationCatalog";
import http, { getApiError, getCached } from "@/lib/http";
import {
  isValidHttpUrl,
  isValidPersonName,
  isValidPhone,
  sanitizePersonName,
  sanitizePhoneInput,
  validateUpload,
} from "@/lib/validation";

type Role = "student" | "teacher";
type FileKey = "identity_document" | "live_selfie" | "qualification_document" | "certification_document";

const fallbackSubjects: SubjectOption[] = [
  "Matematika", "Bahasa Indonesia", "Bahasa Inggris", "IPA", "IPS",
  "Fisika", "Kimia", "Biologi", "Ekonomi", "Akuntansi",
].map((name, index) => ({ id: -(index + 1), name }));

const initialForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  password_confirmation: "",
  school_name: "",
  student_education_level: "",
  grade: "",
  date_of_birth: "",
  guardian_name: "",
  guardian_phone: "",
  guardian_relationship: "",
  address: "",
  maps_link: "",
  expertise: "",
  linkedin: "",
  teaching_method: "hybrid",
};

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedRedirect = searchParams.get("redirect");
  const loginHref = requestedRedirect
    ? `/login?redirect=${encodeURIComponent(requestedRedirect)}`
    : "/login";
  const [role, setRole] = useState<Role>("student");
  const [form, setForm] = useState(initialForm);
  const [levels, setLevels] = useState<string[]>([]);
  const [files, setFiles] = useState<Partial<Record<FileKey, File>>>({});
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [guardianConsent, setGuardianConsent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [subjects, setSubjects] = useState<SubjectOption[]>(fallbackSubjects);
  const isMinorStudent = role === "student" && isUnderEighteen(form.date_of_birth);
  const today = localDateInputValue(new Date());

  useEffect(() => {
    let active = true;
    void getCached<{ subject_options?: SubjectOption[] }>("/learning-catalog", {
      params: { compact: 1 },
      maxAgeMs: 5 * 60_000,
    })
      .then((response) => {
        const available = response.data.subject_options?.filter((item) => item.name);
        if (active && available?.length) setSubjects(available);
      })
      .catch(() => {
        // Daftar bawaan tetap dapat dipakai saat API katalog belum aktif.
      });

    return () => {
      active = false;
    };
  }, []);

  const setValue = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const setFile = (key: FileKey, file?: File) => {
    const isLiveSelfie = key === "live_selfie";
    const error = validateUpload(file, {
      label: isLiveSelfie ? "Foto wajah langsung" : "Dokumen verifikasi",
      maxSizeMb: 5,
      extensions: isLiveSelfie ? ["jpg", "jpeg", "png", "webp"] : ["jpg", "jpeg", "png", "webp", "pdf"],
    });
    if (error) {
      notify.error(error);
      setFiles((current) => ({ ...current, [key]: undefined }));
      return;
    }
    setFiles((current) => ({ ...current, [key]: file }));
  };

  const toggleLevel = (level: string) => {
    setLevels((current) => current.includes(level) ? current.filter((item) => item !== level) : [...current, level]);
  };

  const switchRole = (nextRole: Role) => {
    setRole(nextRole);
    setFiles({});
    setLevels([]);
    setGuardianConsent(false);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isValidPersonName(form.name)) return notify.error("Nama lengkap harus berisi huruf dan tidak boleh memuat angka.");
    if (!isValidPhone(form.phone)) return notify.error("Nomor WhatsApp/telepon harus berisi 8–15 angka.");
    if (form.password !== form.password_confirmation) return notify.error("Konfirmasi kata sandi belum sama.");
    if (!isValidHttpUrl(form.linkedin)) return notify.error("Tautan LinkedIn atau portofolio belum valid.");
    if (role === "student" && !form.student_education_level) return notify.error("Pilih jenjang pendidikan murid.");
    if (role === "student" && !form.grade) return notify.error("Pilih kelas atau tingkat murid.");
    if (role === "student" && !form.date_of_birth) return notify.error("Tanggal lahir murid wajib diisi.");
    if (isMinorStudent && !isValidPersonName(form.guardian_name)) return notify.error("Nama orang tua atau wali harus berisi huruf dan tidak boleh memuat angka.");
    if (isMinorStudent && !isValidPhone(form.guardian_phone)) return notify.error("Nomor orang tua atau wali harus berisi 8–15 angka.");
    if (
      isMinorStudent
      && (!form.guardian_name.trim() || !form.guardian_relationship || !guardianConsent)
    ) {
      return notify.error("Data dan persetujuan orang tua atau wali wajib dilengkapi.");
    }
    if (role === "teacher" && !form.expertise) return notify.error("Pilih satu mata pelajaran utama.");
    if (role === "teacher" && levels.length === 0) return notify.error("Pilih minimal satu jenjang yang dapat diajar.");
    if (
      role === "teacher"
      && (!files.identity_document || !files.live_selfie || !files.qualification_document)
    ) {
      return notify.error("Kartu identitas, foto wajah langsung, dan ijazah/kualifikasi wajib dilengkapi.");
    }

    const payload = new FormData();
    payload.append("role", role);
    payload.append("terms_accepted", terms ? "1" : "0");
    payload.append("privacy_accepted", privacy ? "1" : "0");
    if (isMinorStudent) payload.append("guardian_consent", guardianConsent ? "1" : "0");
    Object.entries(form).forEach(([key, value]) => payload.append(key, value));
    if (role === "teacher") {
      levels.forEach((level, index) => payload.append(`levels[${index}]`, level));
      Object.entries(files).forEach(([key, file]) => file && payload.append(key, file));
    }

    setSubmitting(true);
    try {
      const response = await http.post("/register", payload);
      notify.success(response.data.message);
      navigate(loginHref, { replace: true });
    } catch (error) {
      notify.error(getApiError(error, "Pendaftaran gagal. Periksa kembali data Anda."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-indigo-50 px-3 py-4 sm:px-4 sm:py-10">
      <div className="mx-auto grid max-w-6xl overflow-hidden rounded-[1.75rem] border border-white bg-white shadow-2xl sm:rounded-[2.5rem] shadow-slate-200/60 lg:grid-cols-[.82fr_1.18fr]">
        <aside className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-6 text-white sm:p-8 lg:p-12">
          <div className="absolute -right-20 -top-16 h-64 w-64 rounded-full bg-orange-400/20 blur-3xl" />
          <div className="relative">
            <Link to="/" className="inline-flex items-center gap-2 text-xl font-black"><span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-500">B</span>BimbelKu</Link>
            <h1 className="mt-8 text-3xl font-black leading-tight sm:mt-14 sm:text-4xl">Belajar tepat waktu, bersama tutor yang tepat.</h1>
            <p className="mt-4 leading-7 text-indigo-100/75">Satu akun untuk pencocokan otomatis, jadwal pasti, pembayaran yang tercatat, dan penyelesaian yang dapat diperiksa.</p>
            <div className="mt-7 hidden space-y-4 sm:block sm:mt-10">
              {[
                "Tutor melewati verifikasi identitas dan kualifikasi",
                "Harga ditentukan sistem, bukan profil tutor",
                "Pembayaran masuk ke admin sebelum sesi",
              ].map((item) => <div key={item} className="flex gap-3 text-sm text-indigo-50"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-400/20 text-emerald-300"><Check size={14} /></span>{item}</div>)}
            </div>
          </div>
        </aside>

        <section className="p-5 sm:p-10 lg:p-12">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-xs font-black uppercase tracking-[.2em] text-orange-500">Buat akun</p><h2 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">Mulai bersama BimbelKu</h2><p className="mt-2 text-sm text-slate-500">Sudah terdaftar? <Link to={loginHref} className="font-bold text-indigo-600">Masuk</Link></p></div>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5">
            <RoleButton active={role === "student"} onClick={() => switchRole("student")} icon={User} label="Murid" />
            <RoleButton active={role === "teacher"} onClick={() => switchRole("teacher")} icon={BriefcaseBusiness} label="Tutor" />
          </div>

          <form onSubmit={submit} className="mt-7 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Nama lengkap" icon={User}><Input required className="h-12 rounded-xl" value={form.name} onChange={(event) => setValue("name", sanitizePersonName(event.target.value))} /></FormField>
              <FormField label="Email aktif" icon={Mail}><Input required type="email" className="h-12 rounded-xl" value={form.email} onChange={(event) => setValue("email", event.target.value)} /></FormField>
            </div>
            <FormField label="Nomor WhatsApp/telepon aktif" icon={User}>
              <Input required inputMode="tel" autoComplete="tel" maxLength={16} className="h-12 rounded-xl" value={form.phone} onChange={(event) => setValue("phone", sanitizePhoneInput(event.target.value))} placeholder="Contoh: 0812 3456 7890" />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Kata sandi" icon={Lock}>
                <div className="relative"><Input required minLength={8} autoComplete="new-password" type={showPassword ? "text" : "password"} className="h-12 rounded-xl pr-12" value={form.password} onChange={(event) => setValue("password", event.target.value)} placeholder="Minimal 8 karakter" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute inset-y-0 right-0 px-4 text-slate-400" aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
              </FormField>
              <FormField label="Ulangi kata sandi" icon={Lock}>
                <Input required minLength={8} autoComplete="new-password" type={showPassword ? "text" : "password"} className="h-12 rounded-xl" value={form.password_confirmation} onChange={(event) => setValue("password_confirmation", event.target.value)} placeholder="Harus sama" />
              </FormField>
            </div>

            {role === "student" ? (
              <div className="space-y-5 rounded-2xl border border-orange-100 bg-orange-50/40 p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Sekolah" icon={GraduationCap}><Input className="h-12 rounded-xl bg-white" value={form.school_name} onChange={(event) => setValue("school_name", event.target.value)} placeholder="Opsional" /></FormField>
                  <FormField label="Jenjang" icon={BookOpen}>
                    <Select
                      value={form.student_education_level}
                      onValueChange={(value) => setForm((current) => ({
                        ...current,
                        student_education_level: value,
                        grade: GRADES_BY_EDUCATION_LEVEL[value]?.[0] || "",
                      }))}
                    >
                      <SelectTrigger className="h-12 rounded-xl bg-white"><SelectValue placeholder="Pilih jenjang" /></SelectTrigger>
                      <SelectContent>{EDUCATION_LEVELS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                    </Select>
                  </FormField>
                  <FormField label={form.student_education_level === "Umum" ? "Tingkat" : "Kelas"} icon={GraduationCap}>
                    <Select value={form.grade} onValueChange={(value) => setValue("grade", value)} disabled={!form.student_education_level}>
                      <SelectTrigger className="h-12 rounded-xl bg-white"><SelectValue placeholder={form.student_education_level ? "Pilih kelas/tingkat" : "Pilih jenjang dulu"} /></SelectTrigger>
                      <SelectContent>{(GRADES_BY_EDUCATION_LEVEL[form.student_education_level] || []).map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                    </Select>
                  </FormField>
                </div>
                <FormField label="Tanggal lahir murid" icon={CalendarDays}>
                  <DateOfBirthInput
                    value={form.date_of_birth}
                    max={today}
                    onChange={(value) => setValue("date_of_birth", value)}
                    className="h-12 rounded-xl bg-white font-bold tracking-wide"
                  />
                </FormField>
                {isMinorStudent && (
                  <div className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex gap-3 text-sm leading-6 text-amber-900">
                      <UserRoundCheck className="mt-0.5 shrink-0" size={20} />
                      <p>Murid di bawah 18 tahun memerlukan data dan persetujuan orang tua atau wali.</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField label="Nama orang tua/wali" icon={User}>
                        <Input required className="h-12 rounded-xl bg-white" value={form.guardian_name} onChange={(event) => setValue("guardian_name", sanitizePersonName(event.target.value))} />
                      </FormField>
                      <FormField label="Nomor orang tua/wali" icon={UserRoundCheck}>
                        <Input required inputMode="tel" autoComplete="tel" maxLength={16} className="h-12 rounded-xl bg-white" value={form.guardian_phone} onChange={(event) => setValue("guardian_phone", sanitizePhoneInput(event.target.value))} placeholder="Contoh: 0812 3456 7890" />
                      </FormField>
                    </div>
                    <FormField label="Hubungan dengan murid" icon={UserRoundCheck}>
                      <Select value={form.guardian_relationship} onValueChange={(value) => setValue("guardian_relationship", value)}>
                        <SelectTrigger className="h-12 rounded-xl bg-white"><SelectValue placeholder="Pilih hubungan" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="orang_tua">Orang tua</SelectItem>
                          <SelectItem value="wali_keluarga">Wali keluarga</SelectItem>
                          <SelectItem value="wali_resmi">Wali resmi lainnya</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                    <Consent checked={guardianConsent} onChange={setGuardianConsent}>
                      Saya menyatakan orang tua atau wali telah menyetujui pendaftaran dan penggunaan layanan BimbelKu.
                    </Consent>
                  </div>
                )}
                <FormField label="Alamat rumah" icon={MapPin}><Textarea className="min-h-20 rounded-xl bg-white" value={form.address} onChange={(event) => setValue("address", event.target.value)} placeholder="Opsional saat daftar, wajib ketika memilih kelas offline" /></FormField>
              </div>
            ) : (
              <div className="space-y-5 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5">
                <div className="flex gap-3 rounded-xl border border-indigo-100 bg-white p-4 text-sm leading-6 text-indigo-800"><ShieldCheck className="shrink-0" size={20} /><p>Semua tutor memakai standar yang sama. Admin memeriksa identitas, foto langsung, dan bukti kualifikasi sebelum akun aktif.</p></div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Satu mata pelajaran" icon={BookOpen}>
                    <Suspense fallback={<div className="h-12 rounded-xl bg-white" aria-hidden="true" />}>
                      <SubjectCombobox
                        options={subjects}
                        value={form.expertise}
                        onChange={(value) => setValue("expertise", value)}
                        placeholder="Cari mapel utama"
                        className="bg-white"
                      />
                    </Suspense>
                  </FormField>
                  <FormField label="Metode mengajar" icon={BriefcaseBusiness}><Select value={form.teaching_method} onValueChange={(value) => setValue("teaching_method", value)}><SelectTrigger className="h-12 rounded-xl bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="online">Online</SelectItem><SelectItem value="offline">Offline</SelectItem><SelectItem value="hybrid">Online & offline</SelectItem></SelectContent></Select></FormField>
                </div>
                <div><Label className="font-bold text-slate-700">Jenjang yang dapat diajar</Label><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">{EDUCATION_LEVELS.map((level) => <button type="button" key={level} onClick={() => toggleLevel(level)} className={`rounded-xl border px-3 py-2 text-sm font-bold transition ${levels.includes(level) ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 bg-white text-slate-600"}`}>{level}</button>)}</div></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FileInput required label="Kartu identitas" icon={FileCheck2} file={files.identity_document} accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={(file) => setFile("identity_document", file)} />
                  <Suspense fallback={<div className="h-24 rounded-xl bg-white" aria-hidden="true" />}><CameraCapture required file={files.live_selfie} onCapture={(file) => setFile("live_selfie", file)} /></Suspense>
                  <FileInput required label="Ijazah/kualifikasi" icon={GraduationCap} file={files.qualification_document} accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={(file) => setFile("qualification_document", file)} />
                  <FileInput label="Sertifikat pendukung" icon={FileBadge} file={files.certification_document} accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={(file) => setFile("certification_document", file)} />
                </div>
                <Input type="url" className="h-12 rounded-xl bg-white" value={form.linkedin} onChange={(event) => setValue("linkedin", event.target.value)} placeholder="LinkedIn atau portofolio, opsional" />
              </div>
            )}

            <div className="space-y-3">
              <Consent checked={terms} onChange={setTerms}>Saya menyetujui <Link to="/terms" state={{ from: "/register" }} className="font-bold text-indigo-600">Syarat dan Ketentuan</Link>.</Consent>
              <Consent checked={privacy} onChange={setPrivacy}>Saya menyetujui <Link to="/privacy" state={{ from: "/register" }} className="font-bold text-indigo-600">Kebijakan Privasi</Link>.</Consent>
            </div>

            <Button disabled={submitting || !terms || !privacy || (isMinorStudent && !guardianConsent)} className="h-13 w-full rounded-2xl bg-orange-600 py-6 font-black hover:bg-orange-700">
              {submitting ? <Loader2 className="mr-2 animate-spin" size={19} /> : <ArrowRight className="mr-2" size={19} />} {role === "teacher" ? "Kirim untuk verifikasi" : "Buat akun murid"}
            </Button>
          </form>
        </section>
      </div>
    </main>
  );
}

function isUnderEighteen(value: string) {
  if (!value) return false;
  const birthDate = new Date(`${value}T00:00:00`);
  if (Number.isNaN(birthDate.getTime())) return false;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) age -= 1;
  return age < 18;
}

function localDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function RoleButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof User; label: string }) {
  return <button type="button" onClick={onClick} className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-black transition ${active ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500"}`}><Icon size={17} />{label}</button>;
}

function FormField({ label, icon: Icon, children }: { label: string; icon: typeof User; children: React.ReactNode }) {
  return <div><Label className="mb-2 flex items-center gap-2 font-bold text-slate-700"><Icon size={16} />{label}</Label>{children}</div>;
}

function FileInput({ label, icon: Icon, file, accept, capture, required, onChange }: { label: string; icon: typeof Upload; file?: File; accept: string; capture?: "user" | "environment"; required?: boolean; onChange: (file?: File) => void }) {
  return <label className="flex min-h-24 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-indigo-200 bg-white p-3 hover:border-indigo-400"><Icon className="shrink-0 text-indigo-600" size={20} /><span className="min-w-0"><span className="block text-xs font-bold text-slate-700">{label}{required ? " *" : ""}</span><span className="mt-1 block truncate text-[11px] text-slate-400">{file?.name || "Pilih berkas · maks. 5 MB"}</span></span><Input type="file" accept={accept} capture={capture} className="hidden" onChange={(event) => onChange(event.target.files?.[0])} /></label>;
}

function Consent({ checked, onChange, children }: { checked: boolean; onChange: (value: boolean) => void; children: React.ReactNode }) {
  return <label className="flex cursor-pointer items-start gap-3 text-xs leading-5 text-slate-600"><Checkbox checked={checked} onCheckedChange={(value) => onChange(Boolean(value))} className="mt-0.5" />{children}</label>;
}
