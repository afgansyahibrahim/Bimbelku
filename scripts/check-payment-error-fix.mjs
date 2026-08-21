import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const expect = (condition, message) => {
  if (!condition) throw new Error(`Payment fix gagal: ${message}`);
};

const routes = read("bimbelku-backend/routes/api.php");
const provider = read("bimbelku-backend/app/Providers/AppServiceProvider.php");
const order = read("bimbelku-backend/app/Http/Controllers/Api/OrderController.php");
const packages = read("bimbelku-backend/app/Http/Controllers/Api/StudentPackageController.php");
const paymentPage = read("src/pages/pembayaran/PaymentPage.tsx");
const http = read("src/lib/http.ts");

expect(routes.includes("throttle:student-package-quote"), "quote wajib memakai bucket tersendiri");
expect(routes.includes("throttle:student-package-create"), "pembuatan paket wajib memakai bucket tersendiri");
expect(routes.includes("throttle:student-payment-submit"), "submit pembayaran wajib memakai bucket tersendiri");
expect(provider.includes("'student-package-quote',"), "named limiter quote belum terdaftar");
expect(provider.includes("'student-package-create',"), "named limiter create belum terdaftar");
expect(provider.includes("'student-payment-submit',"), "named limiter payment belum terdaftar");
expect(provider.includes("payment_rate_limited") && provider.includes("retry_after_seconds"), "429 pembayaran wajib memiliki kode dan retry time");
expect(order.includes("findPackagePaymentConflict") && order.includes("findBookingPaymentConflict"), "jadwal wajib dicek ulang saat pembayaran");
expect(order.includes("schedule_conflict"), "backend wajib mengirim kode konflik jadwal");
expect(packages.includes("Pilih hari atau jam lain"), "konflik saat membuat paket wajib memberi arahan");
expect(paymentPage.includes("describePaymentIssue") && paymentPage.includes("submitIssue"), "halaman pembayaran wajib memberi penjelasan persisten");
expect(paymentPage.includes("Jadwal bertabrakan") && paymentPage.includes("Tunggu sebentar"), "notifikasi pembayaran belum membedakan jenis masalah");
expect(http.includes("getApiErrorDetails") && http.includes("status === 429"), "HTTP helper wajib menerjemahkan 429 secara manusiawi");
expect(!paymentPage.includes("orderId: number, notify = true"), "parameter checkStatus tidak boleh menimpa notifier");

console.log("Payment rate-limit, schedule conflict, dan contextual error handling lulus pemeriksaan source-level.");
