import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backendRoot = path.join(projectRoot, "bimbelku-backend");

const phpFiles = [];
const walk = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (["vendor", "storage", "bootstrap/cache"].includes(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.isFile() && entry.name.endsWith(".php")) {
      phpFiles.push(fullPath);
    }
  }
};
walk(backendRoot);

const opening = new Map([["(", ")"], ["[", "]"], ["{", "}"]]);
const closing = new Set(opening.values());
const failures = [];

for (const file of phpFiles) {
  const source = fs.readFileSync(file, "utf8");
  const relative = path.relative(projectRoot, file);
  if (!file.endsWith(".blade.php") && !source.startsWith("<?php")) {
    failures.push(`${relative}: tag pembuka <?php tidak ditemukan`);
  }
  if (/^(<<<<<<<|=======|>>>>>>>)/m.test(source)) {
    failures.push(`${relative}: penanda konflik merge ditemukan`);
  }

  const stack = [];
  let state = "code";
  let escaped = false;
  let line = 1;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (character === "\n") line += 1;

    if (state === "line-comment") {
      if (character === "\n") state = "code";
      continue;
    }
    if (state === "block-comment") {
      if (character === "*" && next === "/") {
        state = "code";
        index += 1;
      }
      continue;
    }
    if (["single", "double", "backtick"].includes(state)) {
      const delimiter = state === "single" ? "'" : state === "double" ? "\"" : "`";
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === delimiter) {
        state = "code";
      }
      continue;
    }

    if (character === "/" && next === "/") {
      state = "line-comment";
      index += 1;
      continue;
    }
    if (character === "#") {
      state = "line-comment";
      continue;
    }
    if (character === "/" && next === "*") {
      state = "block-comment";
      index += 1;
      continue;
    }
    if (character === "'") {
      state = "single";
      escaped = false;
      continue;
    }
    if (character === "\"") {
      state = "double";
      escaped = false;
      continue;
    }
    if (character === "`") {
      state = "backtick";
      escaped = false;
      continue;
    }

    if (opening.has(character)) {
      stack.push({ character, line });
    } else if (closing.has(character)) {
      const latest = stack.pop();
      if (!latest || opening.get(latest.character) !== character) {
        failures.push(`${relative}:${line}: pasangan tanda ${character} tidak valid`);
        break;
      }
    }
  }

  if (state === "block-comment" || ["single", "double", "backtick"].includes(state)) {
    failures.push(`${relative}: komentar atau string tidak ditutup`);
  }
  if (stack.length) {
    const latest = stack.at(-1);
    failures.push(`${relative}:${latest.line}: tanda ${latest.character} tidak ditutup`);
  }
}

if (failures.length) {
  console.error("Pemeriksaan struktur PHP gagal:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  `${phpFiles.length} berkas PHP lulus pemeriksaan struktur, string, komentar, dan konflik merge.`,
);
