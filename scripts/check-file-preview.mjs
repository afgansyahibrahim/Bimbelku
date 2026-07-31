import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const sourceRoot = path.resolve("src");
const forcedDownloadPattern = /(?:\.\s*download\s*=|\bdownload\s*=)/;
const detachedWindowPattern = /\bwindow\.open\s*\(/;

async function collectSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(fullPath);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [fullPath] : [];
  }));

  return nested.flat();
}

const sourceFiles = await collectSourceFiles(sourceRoot);
const violations = [];

for (const file of sourceFiles) {
  const content = await readFile(file, "utf8");
  if (forcedDownloadPattern.test(content) || detachedWindowPattern.test(content)) {
    violations.push(path.relative(process.cwd(), file));
  }
}

if (violations.length > 0) {
  console.error("Pratinjau berkas masih memuat pemaksaan unduhan:");
  for (const file of violations) console.error(`- ${file}`);
  process.exit(1);
}

const appSource = await readFile(path.resolve("src/App.tsx"), "utf8");
const previewProvider = await readFile(path.resolve("src/components/FilePreviewProvider.tsx"), "utf8");
for (const requirement of [
  ["provider global", appSource.includes("<FilePreviewProvider />")],
  ["kontrol perbesar", previewProvider.includes("ZoomIn")],
  ["kontrol perkecil", previewProvider.includes("ZoomOut")],
  ["kontrol putar", previewProvider.includes("RotateCw")],
  ["pratinjau PDF", previewProvider.includes("<iframe")],
]) {
  if (!requirement[1]) {
    console.error(`Pratinjau berkas belum memenuhi pemeriksaan: ${requirement[0]}.`);
    process.exit(1);
  }
}

console.log(`Pratinjau berkas lulus: ${sourceFiles.length} file sumber memakai viewer internal tanpa pemaksaan unduhan atau tab baru.`);
