import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, Loader2, RefreshCw, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CameraCaptureProps {
  file?: File | null;
  currentAvailable?: boolean;
  required?: boolean;
  onCapture: (file: File) => void;
  label?: string;
  dialogTitle?: string;
  dialogDescription?: string;
  captureButtonLabel?: string;
  facingMode?: "user" | "environment";
  guideShape?: "face" | "frame";
}

function cameraErrorMessage(error: unknown): string {
  if (!window.isSecureContext) {
    return "Kamera hanya dapat dibuka melalui HTTPS atau localhost. Buka halaman versi HTTPS lalu coba lagi.";
  }

  if (!(error instanceof DOMException)) {
    return "Kamera tidak dapat dibuka. Periksa izin kamera pada pengaturan situs lalu coba lagi.";
  }

  switch (error.name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Izin kamera belum diberikan atau sedang diblokir. Pilih Izinkan pada permintaan browser, atau aktifkan Kamera dari pengaturan situs lalu tekan Coba lagi.";
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "Kamera tidak ditemukan pada perangkat ini. Pastikan perangkat memiliki kamera yang aktif.";
    case "NotReadableError":
    case "TrackStartError":
    case "AbortError":
      return "Kamera terdeteksi tetapi tidak dapat digunakan. Tutup aplikasi lain yang memakai kamera; jika tetap gagal, kamera mungkin bermasalah.";
    case "OverconstrainedError":
    case "ConstraintNotSatisfiedError":
      return "Kamera tersedia, tetapi mode kamera yang diminta tidak didukung perangkat ini.";
    default:
      return "Kamera tidak dapat dibuka. Periksa izin kamera pada pengaturan situs lalu coba lagi.";
  }
}

export default function CameraCapture({
  file,
  currentAvailable = false,
  required = false,
  onCapture,
  label = "Foto wajah langsung",
  dialogTitle = "Ambil foto wajah langsung",
  dialogDescription = "Hadapkan wajah ke kamera, gunakan pencahayaan cukup, dan jangan memakai foto dari layar lain.",
  captureButtonLabel = "Ambil foto",
  facingMode = "user",
  guideShape = "face",
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [open, setOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState("");

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setError("");
    setStarting(true);
    try {
      if (!window.isSecureContext) {
        throw new DOMException("Camera requires a secure context", "SecurityError");
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new DOMException("Camera API is unavailable", "NotSupportedError");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (cameraError) {
      setError(cameraErrorMessage(cameraError));
    } finally {
      setStarting(false);
    }
  }, [facingMode, stopCamera]);

  useEffect(() => {
    if (open) void startCamera();
    return stopCamera;
  }, [open, startCamera, stopCamera]);

  const capture = async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setError("Pratinjau kamera belum siap. Tunggu sebentar lalu coba lagi.");
      return;
    }

    setCapturing(true);
    try {
      const maxWidth = 1280;
      const scale = Math.min(1, maxWidth / video.videoWidth);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas unavailable");

      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) => result ? resolve(result) : reject(new Error("Capture failed")),
          "image/jpeg",
          0.88,
        );
      });
      onCapture(new File([blob], `selfie-langsung-${Date.now()}.jpg`, {
        type: "image/jpeg",
        lastModified: Date.now(),
      }));
      setOpen(false);
    } catch {
      setError("Foto gagal diambil. Coba ulangi dengan pencahayaan yang lebih baik.");
    } finally {
      setCapturing(false);
    }
  };

  const status = file
    ? "Foto baru siap dikirim"
    : currentAvailable
      ? "Foto tersimpan · ambil ulang untuk mengganti"
      : "Ketuk untuk membuka kamera dan memberikan izin";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-24 w-full items-center gap-3 rounded-xl border border-dashed border-indigo-200 bg-white p-3 text-left transition hover:border-indigo-400"
      >
        {file || currentAvailable
          ? <CheckCircle2 className="shrink-0 text-emerald-600" size={20} />
          : <Camera className="shrink-0 text-indigo-600" size={20} />}
        <span className="min-w-0">
          <span className="block text-xs font-bold text-slate-700">
            {label}{required ? " *" : ""}
          </span>
          <span className="mt-1 block text-[11px] leading-4 text-slate-400">{status}</span>
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-hidden rounded-[2rem] p-0 sm:max-w-xl">
          <div className="p-6 pb-4">
            <DialogHeader>
              <DialogTitle>{dialogTitle}</DialogTitle>
              <DialogDescription>
                {dialogDescription}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="relative aspect-[4/3] overflow-hidden bg-slate-950">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="h-full w-full scale-x-[-1] object-cover"
            />
            {starting && (
              <div className="absolute inset-0 grid place-items-center bg-slate-950 text-white">
                <div className="text-center">
                  <Loader2 className="mx-auto animate-spin" />
                  <p className="mt-3 text-sm font-bold">Menyalakan kamera…</p>
                </div>
              </div>
            )}
            {error && !starting && (
              <div className="absolute inset-0 grid place-items-center bg-slate-950 p-8 text-white">
                <div className="max-w-sm text-center">
                  <VideoOff className="mx-auto text-rose-300" size={34} />
                  <p className="mt-3 text-sm leading-6 text-slate-200">{error}</p>
                  <Button type="button" variant="secondary" onClick={startCamera} className="mt-5 rounded-xl">
                    <RefreshCw className="mr-2" size={16} /> Coba lagi
                  </Button>
                </div>
              </div>
            )}
            {!error && !starting && (
              <div className={`pointer-events-none absolute inset-[12%] border-2 border-dashed border-white/70 ${guideShape === "face" ? "rounded-[45%]" : "rounded-2xl"}`} />
            )}
          </div>

          <div className="flex gap-3 p-6">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-11 flex-1 rounded-xl">
              Batal
            </Button>
            <Button
              type="button"
              onClick={capture}
              disabled={starting || capturing || Boolean(error)}
              className="h-11 flex-[2] rounded-xl bg-indigo-600 hover:bg-indigo-700"
            >
              {capturing
                ? <Loader2 className="mr-2 animate-spin" size={17} />
                : <Camera className="mr-2" size={17} />}
              {captureButtonLabel}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
