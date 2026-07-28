import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const routesPath = path.join(projectRoot, "bimbelku-backend", "routes", "api.php");
const controllerRoot = path.join(
  projectRoot,
  "bimbelku-backend",
  "app",
  "Http",
  "Controllers",
  "Api",
);
const routesSource = fs.readFileSync(routesPath, "utf8");

const imports = new Map(
  [...routesSource.matchAll(
    /use\s+App\\Http\\Controllers\\Api\\([A-Za-z0-9_]+);/g,
  )].map((match) => [match[1], path.join(controllerRoot, `${match[1]}.php`)]),
);

const actionPattern =
  /Route::(?:get|post|put|patch|delete)\(\s*['"][^'"]+['"]\s*,\s*\[\s*([A-Za-z0-9_]+)::class\s*,\s*['"]([A-Za-z0-9_]+)['"]\s*\]/g;
const actions = [...routesSource.matchAll(actionPattern)].map((match) => ({
  controller: match[1],
  method: match[2],
}));

const missing = [];
for (const action of actions) {
  const controllerPath = imports.get(action.controller);
  if (!controllerPath || !fs.existsSync(controllerPath)) {
    missing.push(`${action.controller}::${action.method} — controller tidak ditemukan`);
    continue;
  }

  const controllerSource = fs.readFileSync(controllerPath, "utf8");
  const methodPattern = new RegExp(
    `public\\s+function\\s+${action.method.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\(`,
  );
  if (!methodPattern.test(controllerSource)) {
    missing.push(`${action.controller}::${action.method} — method tidak ditemukan`);
  }
}

if (missing.length > 0) {
  console.error("Kontrak route-controller gagal:");
  missing.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}

console.log(`${actions.length} action API memiliki controller dan method yang sesuai.`);
