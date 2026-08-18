import { existsSync, readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

const viewConfigPath = new URL("bimbelku-backend/config/view.php", root);
expect(existsSync(viewConfigPath), "config/view.php wajib tersedia");

if (existsSync(viewConfigPath)) {
  const viewConfig = readFileSync(viewConfigPath, "utf8");
  expect(
    viewConfig.includes("storage_path('framework/views')"),
    "folder kompilasi Blade wajib memakai storage_path yang stabil",
  );
  expect(
    !viewConfig.includes("realpath(storage_path('framework/views'))"),
    "folder kompilasi Blade tidak boleh bergantung pada realpath folder yang belum ada",
  );
}

for (const path of [
  "bimbelku-backend/storage/framework/cache/data/.gitignore",
  "bimbelku-backend/storage/framework/sessions/.gitignore",
  "bimbelku-backend/storage/framework/views/.gitignore",
  "bimbelku-backend/storage/logs/.gitignore",
]) {
  expect(existsSync(new URL(path, root)), `${path} wajib ikut dalam source bersih`);
}

if (failures.length) {
  console.error("Pemeriksaan folder runtime Laravel gagal:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Konfigurasi dan folder runtime Laravel siap untuk pemasangan baru.");
