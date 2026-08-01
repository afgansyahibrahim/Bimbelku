import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const builder = read("src/pages/students/PackageBuilder.tsx");
const review = read("src/components/PackageCheckoutReview.tsx");
const guide = read("src/components/PackageBuilderGuide.tsx");
const controller = read("bimbelku-backend/app/Http/Controllers/Api/StudentPackageController.php");
const routes = read("bimbelku-backend/routes/api.php");
const tests = read("bimbelku-backend/tests/Feature/StageFivePackageExperienceTest.php");

const checks = [
  [builder.includes("setSubjects([createSubject(selected.session_count, defaultSlotTime)])"), "Ganti paket belum mereset alokasi sesi."],
  [builder.includes("selectedSessions === plan.session_count"), "Jumlah sesi frontend belum wajib sama dengan paket."],
  [builder.includes("duplicateScheduleKeys.size === 0"), "Jadwal ganda belum memblokir pengiriman."],
  [builder.includes("tooEarlySchedules.length === 0"), "Batas jadwal 72 jam belum divalidasi di frontend."],
  [builder.includes("scheduleRangeInvalid"), "Masa berlaku paket belum divalidasi di frontend."],
  [builder.includes("Ringkasan pembagian sesi"), "Ringkasan mapel dan jadwal belum tersedia."],
  [builder.includes("Bagi merata"), "Pembagian sesi otomatis belum tersedia."],
  [builder.includes("Tidak ada sesi yang dapat dipindahkan"), "Tambah mapel masih berisiko menambah total sesi."],
  [builder.includes("min={minimumDate}"), "Pemilih tanggal belum membatasi jadwal terlalu dini."],
  [builder.includes("Estimasi mulai") && builder.includes("estimated_total_amount"), "Harga paket belum terlihat sejak pemilihan awal."],
  [builder.includes("onClick={openReview}") && !builder.includes("onClick={submit} className=\"mt-6"), "Cari tutor masih langsung membuat paket tanpa pengecekan akhir."],
  [review.includes("Pengecekan terakhir") && review.includes("Batal") && review.includes("Bayar"), "Modal pengecekan akhir belum menyediakan Bayar dan Batal."],
  [review.includes("Total pembayaran") && review.includes("Jadwal seluruh sesi"), "Modal belum menampilkan harga total dan seluruh jadwal."],
  [guide.includes("Panduan paket multi-mapel") && builder.includes("Tambah mapel") && builder.includes("Lihat panduan"), "Tutorial bubble multi-mapel belum tersedia."],
  [builder.includes("bimbelku_package_guide_seen") && builder.includes("show_multi_subject_guide"), "Tutorial belum dibatasi per login dan riwayat pembelian."],
  [routes.includes("/student/package-builder-context"), "Endpoint konteks tutorial paket belum didaftarkan."],
  [controller.includes("has_purchased_package_over_two_subjects") && controller.includes("->has('subjects', '>=', 3)"), "Backend belum memeriksa riwayat paket di atas dua mapel."],
  [controller.includes("estimated_total_amount") && controller.includes("estimated_unit_price"), "Backend belum menyediakan estimasi harga pada kartu paket."],
  [controller.includes("'subjects.*.curriculum_subject_id' => ['required', 'integer', 'distinct'"), "Backend belum menolak mapel duplikat."],
  [controller.includes("Jumlah jadwal harus tepat {$plan->session_count} sesi."), "Backend store belum memaksa jumlah jadwal sesuai paket."],
  [controller.includes("Dua mata pelajaran tidak boleh memakai jadwal yang sama."), "Backend belum menolak jadwal lintas mapel yang sama."],
  [controller.includes("Rentang jadwal melebihi masa penggunaan"), "Backend belum memeriksa masa berlaku paket."],
  [controller.includes("Jumlah sesi harus tepat {$plan->session_count} sesi."), "Backend quote belum memaksa jumlah sesi sesuai paket."],
  [controller.includes("$rateService->resolve("), "Harga final paket belum dihitung ulang oleh backend."],
  [tests.includes("test_package_quote_requires_exact_allocation_and_recalculates_price"), "Tes kontrak quote Revisi 8 belum tersedia."],
  [tests.includes("test_package_cards_expose_price_estimates_and_guide_stops_after_three_subject_purchase"), "Tes estimasi harga dan syarat tutorial belum tersedia."],
];

const failed = checks.filter(([ok]) => !ok);
if (failed.length) {
  for (const [, message] of failed) console.error(`FAIL: ${message}`);
  process.exit(1);
}

console.log(`Revision 8 package-flow checks passed (${checks.length} assertions).`);
