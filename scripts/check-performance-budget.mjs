import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = path.join(projectRoot, "dist");
const indexPath = path.join(distRoot, "index.html");

if (!fs.existsSync(indexPath)) {
  const dependenciesAvailable = fs.existsSync(path.join(projectRoot, "node_modules"));
  if (!dependenciesAvailable) {
    console.log("SKIP anggaran performa: dependency dan build memang tidak disertakan dalam arsip audit.");
    process.exit(0);
  }
  console.error("Build produksi belum tersedia meski dependency tersedia. Jalankan npm run build terlebih dahulu.");
  process.exit(1);
}

const html = fs.readFileSync(indexPath, "utf8");
const scriptSource = html.match(/<script[^>]+src="([^"]+)"/)?.[1];
const stylesheetSource = html.match(/<link[^>]+href="([^"]+\.css)"/)?.[1];
const bannerFallbackPath = path.join(
  projectRoot,
  "src/assets/banners/cara-memesan-tutor.webp",
);

if (!scriptSource || !stylesheetSource) {
  console.error("Aset awal JavaScript atau CSS tidak ditemukan pada dist/index.html.");
  process.exit(1);
}

const resolveAsset = (source) => path.join(distRoot, source.replace(/^\//, ""));
const gzipBytes = (source) => zlib.gzipSync(fs.readFileSync(resolveAsset(source))).byteLength;
const javascriptBytes = gzipBytes(scriptSource);
const cssBytes = gzipBytes(stylesheetSource);
const bannerFallbackBytes = fs.statSync(bannerFallbackPath).size;
const budgets = {
  javascript: 110 * 1024,
  // Seluruh 65 rute berbagi stylesheet responsif yang tetap dibatasi ketat.
  // Batas 26 KB gzip menjaga regresi sambil mengakomodasi utility lintas halaman.
  css: 26 * 1024,
  // Fallback ini langsung terlihat pada dashboard dan berpotensi menjadi LCP.
  bannerFallback: 35 * 1024,
};

const failures = [];
if (javascriptBytes > budgets.javascript) {
  failures.push(`JavaScript awal ${javascriptBytes} byte melewati anggaran ${budgets.javascript} byte.`);
}
if (cssBytes > budgets.css) {
  failures.push(`CSS awal ${cssBytes} byte melewati anggaran ${budgets.css} byte.`);
}
if (bannerFallbackBytes > budgets.bannerFallback) {
  failures.push(
    `Banner fallback ${bannerFallbackBytes} byte melewati anggaran ${budgets.bannerFallback} byte.`,
  );
}

if (failures.length) {
  console.error("Anggaran performa gagal:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

const kilobytes = (bytes) => (bytes / 1024).toFixed(1);
console.log(
  `Anggaran performa lulus: JS awal ${kilobytes(javascriptBytes)} KB gzip, `
  + `CSS awal ${kilobytes(cssBytes)} KB gzip, `
  + `banner fallback ${kilobytes(bannerFallbackBytes)} KB.`,
);
