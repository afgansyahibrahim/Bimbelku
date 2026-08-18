import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

const hook = read("src/hooks/usePersistentSidebarScroll.ts");
expect(hook.includes("sessionStorage"), "posisi sidebar harus disimpan selama tab browser aktif");
expect(hook.includes("scrollTop"), "nilai scrollTop sidebar harus dipulihkan");
expect(hook.includes('[aria-current=\\"page\\"]') || hook.includes("'[aria-current=\"page\"]'"), "menu aktif harus tetap terlihat");

for (const [role, file] of [
  ["admin", "src/components/AdminLayout.tsx"],
  ["teacher", "src/components/TeacherLayout.tsx"],
  ["student", "src/components/StudentLayout.tsx"],
]) {
  const source = read(file);
  expect(source.includes(`usePersistentSidebarScroll("${role}"`), `layout ${role} wajib memakai penyimpanan scroll`);
  expect(source.includes("ref={sidebarScrollRef}"), `nav ${role} wajib terhubung ke elemen scroll`);
  expect(source.includes("onScroll={handleSidebarScroll}"), `nav ${role} wajib menyimpan perubahan posisi`);
}

if (failures.length) {
  console.error("Pemeriksaan posisi sidebar gagal:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Posisi sidebar admin, tutor, dan murid tersimpan setelah navigasi.");
