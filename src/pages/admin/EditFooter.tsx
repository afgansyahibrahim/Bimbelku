import { notify } from "@/lib/notify";
import { API_BASE_URL, clearApiCache } from "@/lib/http";
import React, { useCallback, useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import SocialLogo from "@/components/SocialLogo";
import axios from "axios";
import { useConfirmDialog } from "@/components/ConfirmDialogProvider";
import {
  Save,
  Loader2,
  Plus,
  Trash2,
  Pencil,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  MapPin,
  Phone,
  Mail,
  Globe,
} from "lucide-react";
import {
  isValidHttpUrl,
  isValidPhone,
  sanitizePhoneInput,
} from "@/lib/validation";

type SocialItem = {
  id: number;
  name: string;
  link: string;
  icon_url?: string | null;
  icon_key?: string | null;
  is_active?: boolean;
  sort_order?: number;
};
const ICONS = [
  "instagram",
  "facebook",
  "youtube",
  "tiktok",
  "whatsapp",
  "linkedin",
  "x",
];
const SOCIAL_ICON_COLORS: Record<string, string> = {
  instagram: "E4405F",
  facebook: "1877F2",
  youtube: "FF0000",
  tiktok: "000000",
  whatsapp: "25D366",
  linkedin: "0A66C2",
  x: "000000",
};

const refreshPublicSocials = () => {
  sessionStorage.setItem("bimbelku:socials-version", String(Date.now()));
  clearApiCache("/socials");
  window.dispatchEvent(new Event("bimbelku:socials-changed"));
};

function IconPicker({
  value,
  onChange,
  dark = false,
}: {
  value: string;
  onChange: (value: string) => void;
  dark?: boolean;
}) {
  return (
    <fieldset className="min-w-0 max-w-full overflow-hidden">
      <legend
        className={`mb-2 text-xs font-bold ${dark ? "text-slate-300" : "text-slate-600"}`}
      >
        Pilih logo
      </legend>
      <div className="grid min-w-0 grid-cols-4 gap-2">
        {ICONS.map((icon) => {
          const active = value === icon;
          return (
            <button
              key={icon}
              type="button"
              aria-pressed={active}
              aria-label={`Pilih logo ${icon}`}
              onClick={() => onChange(icon)}
              className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2 text-[9px] font-bold capitalize transition ${active ? "border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-200" : dark ? "border-white/15 bg-white/10 text-slate-200 hover:bg-white/15" : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200"}`}
            >
              <SocialLogo
                iconKey={icon}
                iconUrl={`https://cdn.simpleicons.org/${icon}/${SOCIAL_ICON_COLORS[icon]}`}
                className="h-6 w-6 shrink-0 rounded-md bg-white p-0.5 object-contain"
              />
              <span className="w-full truncate text-center">{icon}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export default function EditFooter() {
  const confirmDialog = useConfirmDialog();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [socials, setSocials] = useState<SocialItem[]>([]);
  const [form, setForm] = useState({
    footer_address: "",
    footer_phone: "",
    footer_email: "",
  });
  const [name, setName] = useState("");
  const [link, setLink] = useState("");
  const [iconKey, setIconKey] = useState("instagram");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editLink, setEditLink] = useState("");
  const [editIcon, setEditIcon] = useState("instagram");
  const token = () => localStorage.getItem("token");
  const fetchSocials = useCallback(async () => {
    const res = await axios.get(API_BASE_URL + "/admin/admin-socials", {
      params: { _: Date.now() },
      headers: { Authorization: "Bearer " + localStorage.getItem("token") },
    });
    const rows = Array.isArray(res.data)
      ? res.data
      : Array.isArray(res.data?.data)
        ? res.data.data
        : [];
    setSocials(rows);
  }, []);
  useEffect(() => {
    (async () => {
      try {
        const [settings] = await Promise.all([
          axios.get(API_BASE_URL + "/settings/footer", {
            params: { _: Date.now() },
          }),
          fetchSocials(),
        ]);
        setForm({
          footer_address: settings.data.footer_address ?? "",
          footer_phone: sanitizePhoneInput(settings.data.footer_phone ?? ""),
          footer_email: settings.data.footer_email ?? "",
        });
      } catch {
        notify.error("Gagal memuat data footer.");
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchSocials]);
  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidPhone(form.footer_phone))
      return notify.error("Nomor telepon harus berisi 8–15 angka.");
    setSaving(true);
    try {
      await axios.post(API_BASE_URL + "/admin/settings/footer", form, {
        headers: { Authorization: "Bearer " + token() },
      });
      notify.success("Informasi kontak berhasil disimpan.");
    } catch {
      notify.error("Gagal menyimpan kontak.");
    } finally {
      setSaving(false);
    }
  };
  const addSocial = async () => {
    if (!name.trim() || !isValidHttpUrl(link))
      return notify.error("Nama dan tautan http/https wajib diisi.");
    try {
      const data = new FormData();
      data.append("name", name.trim());
      data.append("link", link.trim());
      data.append("icon_key", iconKey);
      const response = await axios.post(API_BASE_URL + "/admin/socials", data, {
        headers: { Authorization: "Bearer " + token() },
      });
      const saved = response.data?.data as SocialItem | undefined;
      if (saved) setSocials((current) => [...current, saved]);
      setName("");
      setLink("");
      refreshPublicSocials();
      try {
        await fetchSocials();
      } catch {
        /* keep saved item visible if refresh fails */
      }
      notify.success("Sosial media ditambahkan.");
    } catch {
      notify.error("Gagal menambah sosial media.");
    }
  };
  const beginEdit = (item: SocialItem) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditLink(item.link);
    setEditIcon(item.icon_key || "instagram");
  };
  const updateSocial = async (item: SocialItem) => {
    if (!editName.trim() || !isValidHttpUrl(editLink))
      return notify.error("Nama dan tautan tidak valid.");
    try {
      await axios.put(
        API_BASE_URL + "/admin/socials/" + item.id,
        { name: editName.trim(), link: editLink.trim(), icon_key: editIcon },
        { headers: { Authorization: "Bearer " + token() } },
      );
      refreshPublicSocials();
      setEditingId(null);
      await fetchSocials();
      notify.success("Sosial media diperbarui.");
    } catch {
      notify.error("Gagal memperbarui sosial media.");
    }
  };
  const toggleSocial = async (item: SocialItem) => {
    try {
      const response = await axios.put(
        API_BASE_URL + "/admin/socials/" + item.id,
        {
          name: item.name,
          link: item.link,
          is_active: item.is_active === false,
        },
        { headers: { Authorization: "Bearer " + token() } },
      );
      const saved = response.data?.data as SocialItem | undefined;
      setSocials((current) =>
        current.map((social) =>
          social.id === item.id
            ? saved || { ...social, is_active: item.is_active === false }
            : social,
        ),
      );
      refreshPublicSocials();
      notify.success(
        item.is_active === false
          ? "Sosial media ditampilkan kembali."
          : "Sosial media disembunyikan.",
      );
    } catch {
      notify.error("Gagal mengubah status sosial media.");
    }
  };
  const moveSocial = async (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= socials.length) return;
    const next = [...socials];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    setSocials(next);
    try {
      await axios.post(
        API_BASE_URL + "/admin/socials/reorder",
        { items: next.map((item, i) => ({ id: item.id, sort_order: i })) },
        { headers: { Authorization: "Bearer " + token() } },
      );
      refreshPublicSocials();
    } catch {
      notify.error("Urutan gagal disimpan.");
      await fetchSocials();
    }
  };
  const deleteSocial = async (id: number) => {
    if (
      !(await confirmDialog({
        title: "Hapus media sosial?",
        description: "Tautan ini akan dihapus dari footer.",
        confirmText: "Hapus",
        tone: "danger",
      }))
    )
      return;
    try {
      await axios.delete(API_BASE_URL + "/admin/socials/" + id, {
        headers: { Authorization: "Bearer " + token() },
      });
      refreshPublicSocials();
      await fetchSocials();
      notify.success("Sosial media dihapus.");
    } catch {
      notify.error("Gagal menghapus sosial media.");
    }
  };
  if (loading)
    return (
      <AdminLayout title="Edit Footer">
        <div className="p-10 text-center">
          <Loader2 className="mx-auto animate-spin" />
        </div>
      </AdminLayout>
    );
  return (
    <AdminLayout title="Edit Footer">
      <div className="mx-auto max-w-6xl space-y-6 pb-20">
        <div className="rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white">
          <h1 className="text-3xl font-black">Pengaturan Footer</h1>
          <p className="mt-2 text-blue-100">
            Kelola kontak dan tautan sosial media yang tampil di footer.
          </p>
        </div>
        <div className="grid min-w-0 gap-6 lg:grid-cols-3">
          <form
            onSubmit={saveSettings}
            className="min-w-0 space-y-4 rounded-3xl border bg-white p-6 shadow-sm"
          >
            <h2 className="flex items-center gap-2 font-black">
              <Globe size={20} /> Informasi Kontak
            </h2>
            <label className="block text-sm font-bold">
              Alamat
              <textarea
                value={form.footer_address}
                onChange={(e) =>
                  setForm({ ...form, footer_address: e.target.value })
                }
                rows={4}
                className="mt-1 w-full rounded-xl border p-3"
              />
            </label>
            <label className="block text-sm font-bold">
              Telepon
              <input
                value={form.footer_phone}
                onChange={(e) =>
                  setForm({
                    ...form,
                    footer_phone: sanitizePhoneInput(e.target.value),
                  })
                }
                className="mt-1 w-full rounded-xl border p-3"
              />
            </label>
            <label className="block text-sm font-bold">
              Email
              <input
                type="email"
                value={form.footer_email}
                onChange={(e) =>
                  setForm({ ...form, footer_email: e.target.value })
                }
                className="mt-1 w-full rounded-xl border p-3"
              />
            </label>
            <button
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 font-bold text-white"
            >
              {saving ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <Save size={18} />
              )}{" "}
              Simpan Kontak
            </button>
          </form>
          <div className="min-w-0 space-y-6 lg:col-span-2">
            <section className="min-w-0 overflow-hidden rounded-3xl border bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-black">Daftar Sosial Media</h2>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">
                  {socials.length} item
                </span>
              </div>
              <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                {socials.length === 0 && (
                  <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-slate-500 sm:col-span-2">
                    Belum ada sosial media tersimpan.
                  </p>
                )}
                {socials.map((item, index) => (
                  <article
                    key={item.id}
                    className={`min-w-0 rounded-2xl border p-4 ${item.is_active === false ? "border-dashed bg-slate-50 opacity-70" : ""}`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <SocialLogo
                        iconKey={item.icon_key}
                        iconUrl={item.icon_url}
                        className="h-10 w-10 shrink-0 rounded-lg bg-white p-1 object-contain text-slate-950"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="break-words font-black">{item.name}</p>
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noreferrer"
                          className="block break-all text-xs text-slate-500"
                        >
                          {item.link}
                        </a>
                        <p className="mt-1 text-[10px] font-bold">
                          {item.is_active === false
                            ? "Tidak tampil"
                            : "Tampil di footer"}
                        </p>
                      </div>
                    </div>
                    {editingId === item.id && (
                      <div className="mt-3 min-w-0 space-y-2 overflow-hidden">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full min-w-0 rounded-lg border p-2 text-sm"
                        />
                        <input
                          value={editLink}
                          onChange={(e) => setEditLink(e.target.value)}
                          className="w-full min-w-0 rounded-lg border p-2 text-sm"
                        />
                        <IconPicker
                          value={editIcon}
                          onChange={setEditIcon}
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => void updateSocial(item)}
                            className="flex-1 rounded-lg bg-indigo-600 p-2 text-xs font-bold text-white"
                          >
                            Simpan
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="rounded-lg bg-slate-100 p-2 text-xs font-bold"
                          >
                            Batal
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => beginEdit(item)}
                        className="rounded-lg border border-indigo-200 p-2 text-indigo-600"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void toggleSocial(item)}
                        className="rounded-lg border p-2"
                        title="Tampilkan/sembunyikan"
                      >
                        {item.is_active === false ? (
                          <Eye size={14} />
                        ) : (
                          <EyeOff size={14} />
                        )}
                      </button>
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => void moveSocial(index, -1)}
                        className="rounded-lg border p-2 disabled:opacity-30"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={index === socials.length - 1}
                        onClick={() => void moveSocial(index, 1)}
                        className="rounded-lg border p-2 disabled:opacity-30"
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteSocial(item.id)}
                        className="ml-auto rounded-lg border border-red-200 p-2 text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
            <section className="min-w-0 overflow-hidden rounded-3xl bg-slate-900 p-4 text-white sm:p-6">
              <h2 className="mb-4 flex items-center gap-2 font-black">
                <Plus size={20} /> Tambah Sosial Media
              </h2>
              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama platform"
                  className="min-w-0 w-full max-w-full rounded-xl bg-white/10 p-3 text-sm"
                />
                <input
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://..."
                  className="min-w-0 w-full max-w-full rounded-xl bg-white/10 p-3 text-sm"
                />
                <div className="min-w-0 sm:col-span-2">
                  <IconPicker
                    value={iconKey}
                    onChange={setIconKey}
                    dark
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => void addSocial()}
                className="mt-3 w-full rounded-xl bg-indigo-600 p-3 font-bold"
              >
                Tambahkan
              </button>
            </section>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
