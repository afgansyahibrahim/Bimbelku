import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const stage = read('src/pages/admin/StageFiveManagement.tsx');
const dialog = read('src/components/ui/dialog.tsx');
const backend = read('bimbelku-backend/app/Http/Controllers/Api/AdminStageFiveController.php');
const css = read('src/index.css');

const checks = [
  ['promo editor tetap memakai ResponsiveMultiSelect', stage.includes('<ResponsiveMultiSelect values={item.target_subjects || []}')],
  ['editor promo memakai layer modal global', stage.includes('fixed inset-0 z-[var(--layer-modal)]')],
  ['dialog overlay memakai layer modal global', dialog.includes('z-[var(--layer-modal)]')],
  ['dialog content mendukung layer detail', dialog.includes('contentLayerClass') && dialog.includes('layer = "modal"')],
  ['select tetap berada di atas dialog detail', read('src/components/ui/select.tsx').includes('!z-[var(--layer-detail-popover)]')],
  ['urutan layer global terdokumentasi', css.includes('--layer-dropdown:') && css.includes('--layer-preview:') && css.includes('--layer-alert:')],
  ['status promo tampil di bagian atas form', stage.includes('return <><PromoStatusControl active={Boolean(item.is_active)}')],
  ['status promo mempunyai role switch', stage.includes('role="switch"') && stage.includes('aria-checked={active}')],
  ['status aktif terlihat jelas', stage.includes('{active ? "AKTIF" : "NONAKTIF"}')],
  ['kontrol promo lama di bawah sudah dihapus', !stage.includes('<Switch label="Promo aktif"')],
  ['backend tetap memvalidasi is_active', backend.includes("'is_active' => ['required', 'boolean']")],
];

let passed = 0;
for (const [label, ok] of checks) {
  if (ok) {
    passed++;
    console.log(`PASS ${label}`);
  } else {
    console.error(`FAIL ${label}`);
  }
}

console.log(`Admin Promotion Editor Fix ${passed}/${checks.length}`);
if (passed !== checks.length) process.exit(1);
