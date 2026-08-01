import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcRoot = path.join(root, "src");
const appPath = path.join(srcRoot, "App.tsx");
const app = fs.readFileSync(appPath, "utf8");
const failures = [];

const files = [];
const walk = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(fullPath);
    if (entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name)) files.push(fullPath);
  }
};
walk(srcRoot);

const routes = [...app.matchAll(/<Route\s+path="([^"]+)"/g)].map((match) => match[1]);
const routePatterns = routes.map((route) => {
  const escaped = route
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/:([A-Za-z0-9_]+)/g, "[^/]+");
  return new RegExp(`^${escaped}$`);
});

const literalLinks = [];
for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  for (const pattern of [
    /\bto="(\/[^"#]*)"/g,
    /\bto:\s*"(\/[^"#]*)"/g,
    /\bnavigate\(\s*"(\/[^"#]*)"/g,
  ]) {
    for (const match of source.matchAll(pattern)) {
      literalLinks.push({ file, target: match[1].split("?")[0] || "/" });
    }
  }
}

for (const { file, target } of literalLinks) {
  if (!routePatterns.some((pattern) => pattern.test(target))) {
    failures.push(`${path.relative(root, file)}: tautan ${target} tidak memiliki rute`);
  }
}

for (const match of app.matchAll(/lazy\(\(\)\s*=>\s*import\("([^"]+)"\)\)/g)) {
  const importBase = path.resolve(path.dirname(appPath), match[1]);
  const candidates = [`${importBase}.tsx`, `${importBase}.ts`, path.join(importBase, "index.tsx")];
  if (!candidates.some((candidate) => fs.existsSync(candidate))) {
    failures.push(`src/App.tsx: halaman lazy ${match[1]} tidak ditemukan`);
  }
}

for (const route of routes.filter((item) => item !== "*")) {
  const occurrences = routes.filter((item) => item === route).length;
  if (occurrences > 1) failures.push(`src/App.tsx: rute ${route} terdaftar ${occurrences} kali`);
}

if (failures.length) {
  console.error("Audit rute dan halaman gagal:");
  [...new Set(failures)].forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`${routes.length - 1} rute, ${literalLinks.length} tautan literal, dan seluruh modul halaman lazy berhasil dipetakan.`);
