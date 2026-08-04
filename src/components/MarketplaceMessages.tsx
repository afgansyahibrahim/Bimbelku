import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCheck,
  FileText,
  Loader2,
  MessageCircle,
  Paperclip,
  RefreshCw,
  Search,
  Send,
  UserRound,
  WifiOff,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { openProtectedFile } from "@/components/ProtectedImage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import http, { getApiError } from "@/lib/http";
import { validateUpload } from "@/lib/validation";

type Conversation = {
  booking_id: number;
  subject: string;
  title: string;
  counterpart_name: string;
  counterpart_avatar?: string | null;
  class_type: "private" | "group";
  status: string;
  start_at: string;
  unread_count: number;
  latest_message?: {
    body: string;
    sender_name: string;
    created_at: string;
    has_attachment: boolean;
  } | null;
};

type Message = {
  id: number;
  body: string;
  sender_name: string;
  sender_role: string;
  message_type?: "user" | "system";
  system_event_key?: string | null;
  metadata?: { title?: string; action_label?: string; action_url?: string; [key: string]: unknown };
  is_mine: boolean;
  is_read: boolean;
  attachment?: { name: string; mime: string; size: number; url: string } | null;
  created_at: string;
};

type ChatData = {
  booking: { id: number; subject: string; status: string; start_at: string; end_at: string };
  messages: Message[];
  permissions: { can_chat: boolean };
};

type PendingMessage = {
  token: string;
  body: string;
  file: File | null;
};

const dateTime = (value?: string) => value
  ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
  : "-";

const timeOnly = (value?: string) => value
  ? new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" }).format(new Date(value))
  : "";

const newToken = () => typeof crypto.randomUUID === "function"
  ? crypto.randomUUID()
  : `message-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function MarketplaceMessages({ role }: { role: "student" | "teacher" }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedBooking = Number(searchParams.get("booking") || 0) || null;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(requestedBooking);
  const [chat, setChat] = useState<ChatData | null>(null);
  const [query, setQuery] = useState("");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState<PendingMessage | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [listError, setListError] = useState(false);
  const [chatError, setChatError] = useState(false);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async (quiet = false) => {
    if (!quiet) setListLoading(true);
    setListError(false);
    try {
      const response = await http.get<{ data: Conversation[] }>("/conversations");
      const items = Array.isArray(response.data.data) ? response.data.data : [];
      setConversations(items);
      if (requestedBooking && items.some((item) => item.booking_id === requestedBooking)) {
        setSelectedId(requestedBooking);
      }
    } catch (error) {
      if (!quiet) {
        setListError(true);
        toast.error(getApiError(error, "Daftar percakapan gagal dimuat."));
      }
    } finally {
      if (!quiet) setListLoading(false);
    }
  }, [requestedBooking]);

  const loadChat = useCallback(async (bookingId: number, quiet = false) => {
    if (!quiet) setChatLoading(true);
    setChatError(false);
    try {
      const response = await http.get<ChatData>(`/bookings/${bookingId}/learning-session`);
      setChat(response.data);
      setConversations((current) => current.map((item) => item.booking_id === bookingId
        ? { ...item, unread_count: 0 }
        : item));
    } catch (error) {
      if (!quiet) {
        setChatError(true);
        toast.error(getApiError(error, "Percakapan gagal dibuka."));
      }
    } finally {
      if (!quiet) setChatLoading(false);
    }
  }, []);

  useEffect(() => { void loadConversations(); }, [loadConversations]);
  useEffect(() => {
    if (!selectedId) {
      setChat(null);
      return;
    }
    void loadChat(selectedId);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadChat(selectedId, true);
        void loadConversations(true);
      }
    }, 15000);
    return () => window.clearInterval(timer);
  }, [selectedId, loadChat, loadConversations]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [chat?.messages.length, selectedId]);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase("id-ID");
    if (!keyword) return conversations;
    return conversations.filter((item) => [item.subject, item.title, item.counterpart_name]
      .some((value) => value.toLocaleLowerCase("id-ID").includes(keyword)));
  }, [conversations, query]);

  const openConversation = (bookingId: number) => {
    setSelectedId(bookingId);
    setSearchParams({ booking: String(bookingId) }, { replace: true });
    setPending(null);
    setFile(null);
    setBody("");
  };

  const closeMobileConversation = () => {
    setSelectedId(null);
    setSearchParams({}, { replace: true });
  };

  const chooseFile = (selected?: File) => {
    const error = validateUpload(selected, {
      label: "Lampiran chat",
      maxSizeMb: 5,
      extensions: ["jpg", "jpeg", "png", "webp", "pdf"],
    });
    if (error) {
      toast.error(error);
      setFile(null);
      return;
    }
    setFile(selected || null);
  };

  const send = async (event?: FormEvent, retry?: PendingMessage) => {
    event?.preventDefault();
    if (!selectedId) return;
    const outgoing = retry || { token: newToken(), body: body.trim(), file };
    if (!outgoing.body && !outgoing.file) return;
    setSending(true);
    setPending(null);
    const payload = new FormData();
    if (outgoing.body) payload.append("body", outgoing.body);
    if (outgoing.file) payload.append("attachment", outgoing.file);
    payload.append("client_token", outgoing.token);
    try {
      await http.post(`/bookings/${selectedId}/messages`, payload);
      setBody("");
      setFile(null);
      await Promise.all([loadChat(selectedId, true), loadConversations(true)]);
    } catch (error) {
      setPending(outgoing);
      toast.error(getApiError(error, "Pesan gagal dikirim. Data tetap disimpan untuk dicoba ulang."));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-[1.65rem] border border-slate-200 bg-white shadow-sm sm:rounded-[2rem]">
      <div className="grid min-h-[72dvh] md:grid-cols-[21rem_minmax(0,1fr)] lg:grid-cols-[23rem_minmax(0,1fr)]">
        <aside className={`${selectedId ? "hidden md:flex" : "flex"} min-w-0 flex-col border-r border-slate-200 bg-slate-50/60`}>
          <div className="border-b border-slate-200 bg-white p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-xs font-black uppercase tracking-[.15em] text-indigo-500">Pesan kelas</p><h1 className="mt-1 text-xl font-black text-slate-900">Percakapan</h1></div>
              <Button type="button" variant="ghost" size="icon" onClick={() => void loadConversations()} aria-label="Muat ulang percakapan" className="rounded-xl"><RefreshCw size={17} /></Button>
            </div>
            <div className="relative mt-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} /><Input value={query} onChange={(event) => setQuery(event.target.value)} className="h-11 rounded-xl bg-slate-50 pl-10" placeholder="Cari kelas atau nama" /></div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2 sm:p-3">
            {listLoading ? (
              <div className="grid min-h-52 place-items-center"><Loader2 className="animate-spin text-indigo-600" /></div>
            ) : listError ? (
              <div className="px-5 py-14 text-center"><WifiOff className="mx-auto text-rose-300" /><p className="mt-3 text-sm font-bold text-slate-700">Percakapan belum dapat dimuat.</p><Button onClick={() => void loadConversations()} className="mt-4 rounded-xl bg-indigo-600">Coba lagi</Button></div>
            ) : filtered.length === 0 ? (
              <div className="px-5 py-14 text-center"><MessageCircle className="mx-auto text-slate-300" size={36} /><p className="mt-3 text-sm font-bold text-slate-700">Belum ada percakapan</p><p className="mt-1 text-xs leading-5 text-slate-500">Chat tersedia setelah pembayaran disetujui dan tutor ditetapkan.</p></div>
            ) : filtered.map((item) => (
              <button key={item.booking_id} type="button" onClick={() => openConversation(item.booking_id)} className={`mb-1 flex w-full min-w-0 items-start gap-3 rounded-2xl p-3 text-left transition sm:p-4 ${selectedId === item.booking_id ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "hover:bg-white"}`}>
                <span className={`grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl ${selectedId === item.booking_id ? "bg-white/15" : "bg-indigo-100 text-indigo-600"}`}>{item.counterpart_avatar ? <img src={item.counterpart_avatar} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" /> : <UserRound size={19} />}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center justify-between gap-2"><span className="truncate text-sm font-black">{item.counterpart_name}</span><span className={`shrink-0 text-[10px] ${selectedId === item.booking_id ? "text-indigo-100" : "text-slate-400"}`}>{timeOnly(item.latest_message?.created_at || item.start_at)}</span></span>
                  <span className={`mt-1 block truncate text-xs font-bold ${selectedId === item.booking_id ? "text-indigo-100" : "text-indigo-600"}`}>{item.subject}</span>
                  <span className="mt-1 flex min-w-0 items-center justify-between gap-2"><span className={`truncate text-xs ${selectedId === item.booking_id ? "text-indigo-100/80" : "text-slate-500"}`}>{item.latest_message?.body || "Mulai percakapan kelas"}</span>{item.unread_count > 0 && <span className={`grid h-5 min-w-5 shrink-0 place-items-center rounded-full px-1 text-[10px] font-black ${selectedId === item.booking_id ? "bg-white text-indigo-700" : "bg-rose-500 text-white"}`}>{item.unread_count > 99 ? "99+" : item.unread_count}</span>}</span>
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className={`${selectedId ? "flex" : "hidden md:flex"} min-w-0 flex-col bg-white`}>
          {!selectedId ? (
            <div className="grid flex-1 place-items-center p-8 text-center"><div><MessageCircle className="mx-auto text-indigo-200" size={52} /><h2 className="mt-5 text-xl font-black text-slate-800">Pilih percakapan</h2><p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">Pesan, lampiran, dan status baca tetap terikat pada kelas yang sah.</p></div></div>
          ) : chatLoading ? (
            <div className="grid flex-1 place-items-center"><Loader2 className="animate-spin text-indigo-600" size={30} /></div>
          ) : chatError || !chat ? (
            <div className="grid flex-1 place-items-center p-8 text-center"><div><WifiOff className="mx-auto text-rose-300" size={38} /><p className="mt-3 font-black text-slate-800">Chat belum dapat dibuka</p><Button onClick={() => void loadChat(selectedId)} className="mt-4 rounded-xl bg-indigo-600">Coba lagi</Button></div></div>
          ) : (
            <>
              <header className="flex min-w-0 items-center gap-3 border-b border-slate-200 px-3 py-3 sm:px-5 sm:py-4">
                <Button type="button" variant="ghost" size="icon" onClick={closeMobileConversation} className="shrink-0 rounded-xl md:hidden" aria-label="Kembali ke daftar percakapan"><ArrowLeft size={20} /></Button>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-indigo-100 text-indigo-600"><UserRound size={18} /></span>
                <div className="min-w-0 flex-1"><h2 className="truncate text-sm font-black text-slate-900 sm:text-base">{chat.booking.subject}</h2><p className="mt-0.5 truncate text-[11px] font-bold text-slate-400">{dateTime(chat.booking.start_at)} · Chat BimbelKu</p></div>
                <Button type="button" variant="ghost" size="icon" onClick={() => void loadChat(selectedId)} className="shrink-0 rounded-xl" aria-label="Muat ulang pesan"><RefreshCw size={17} /></Button>
              </header>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50/70 p-3 sm:p-5">
                {chat.messages.length === 0 ? <div className="grid min-h-60 place-items-center text-center"><div><MessageCircle className="mx-auto text-slate-300" size={34} /><p className="mt-3 text-sm font-bold text-slate-600">Belum ada pesan pada kelas ini.</p></div></div> : chat.messages.map((item) => item.message_type === "system" ? (
                  <div key={item.id} className="flex justify-center py-1">
                    <div className="w-full max-w-xl rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-center shadow-sm">
                      <p className="text-[10px] font-black uppercase tracking-[.16em] text-indigo-500">{item.metadata?.title || "Informasi BimbelKu"}</p>
                      <p className="mt-1 text-xs leading-5 text-indigo-950">{item.body}</p>
                      {item.metadata?.action_url && <a href={String(item.metadata.action_url)} className="mt-2 inline-flex text-xs font-black text-indigo-700 underline underline-offset-4">{item.metadata.action_label || "Lihat detail"}</a>}
                      <p className="mt-2 text-[9px] text-indigo-400">{timeOnly(item.created_at)}</p>
                    </div>
                  </div>
                ) : (
                  <div key={item.id} className={`flex ${item.is_mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm sm:max-w-[72%] sm:px-4 sm:py-3 ${item.is_mine ? "rounded-br-md bg-indigo-600 text-white" : "rounded-bl-md border border-slate-200 bg-white text-slate-800"}`}>
                      {!item.is_mine && <p className="mb-1 text-[10px] font-black text-indigo-500">{item.sender_name}</p>}
                      {item.body && <p className="whitespace-pre-wrap break-words leading-6">{item.body}</p>}
                      {item.attachment && <button type="button" onClick={() => void openProtectedFile(item.attachment!.url, item.attachment!.name).catch(() => toast.error("Lampiran tidak dapat dibuka."))} className={`mt-2 flex w-full items-center gap-3 rounded-xl border p-3 text-left ${item.is_mine ? "border-white/20 bg-white/10" : "border-slate-200 bg-slate-50"}`}><FileText className="shrink-0" size={20} /><span className="min-w-0"><span className="block truncate text-xs font-black">{item.attachment.name}</span><span className={`mt-0.5 block text-[10px] ${item.is_mine ? "text-indigo-100" : "text-slate-400"}`}>{Math.max(1, Math.round(item.attachment.size / 1024))} KB · buka di viewer</span></span></button>}
                      <p className={`mt-1.5 flex items-center justify-end gap-1 text-[9px] ${item.is_mine ? "text-indigo-100" : "text-slate-400"}`}>{timeOnly(item.created_at)}{item.is_mine && <CheckCheck size={12} aria-label={item.is_read ? "Sudah dibaca" : "Terkirim"} className={item.is_read ? "text-sky-200" : "text-indigo-200"} />}</p>
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>

              <form onSubmit={(event) => void send(event)} className="border-t border-slate-200 bg-white p-3 sm:p-4">
                {file && <div className="mb-2 flex items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 p-2.5 text-xs text-indigo-800"><Paperclip size={15} /><span className="min-w-0 flex-1 truncate font-bold">{file.name}</span><button type="button" onClick={() => setFile(null)} aria-label="Hapus lampiran"><X size={15} /></button></div>}
                {pending && <div className="mb-2 flex flex-col gap-2 rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs text-rose-800 sm:flex-row sm:items-center sm:justify-between"><span>Pesan terakhir gagal dikirim.</span><Button type="button" size="sm" variant="outline" onClick={() => void send(undefined, pending)} disabled={sending} className="rounded-lg border-rose-200 text-rose-700">Coba kirim ulang</Button></div>}
                <div className="flex items-end gap-2">
                  <label className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-indigo-200 hover:text-indigo-600" aria-label="Pilih lampiran"><Paperclip size={18} /><input type="file" className="hidden" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={(event) => chooseFile(event.target.files?.[0])} /></label>
                  <Textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={1000} rows={1} className="min-h-11 max-h-28 resize-none rounded-xl" placeholder="Tulis pesan tentang kelas" />
                  <Button type="submit" size="icon" disabled={sending || (!body.trim() && !file) || !chat.permissions.can_chat} className="h-11 w-11 shrink-0 rounded-xl bg-indigo-600"><span className="sr-only">Kirim pesan</span>{sending ? <Loader2 className="animate-spin" size={17} /> : <Send size={17} />}</Button>
                </div>
                <p className="mt-2 text-[10px] leading-4 text-slate-400">Nomor pribadi, media sosial, dan tautan luar ditolak. JPG, PNG, WebP, atau PDF maksimal 5 MB.</p>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
