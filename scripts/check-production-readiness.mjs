import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const checks = [];
const expect = (condition, label) => checks.push([Boolean(condition), label]);

const seeder = read("bimbelku-backend/database/seeders/DatabaseSeeder.php");
const productionEnv = read("bimbelku-backend/production.env.example");
const backendEnvExample = read("bimbelku-backend/.env.example");
const rootGitignore = read(".gitignore");
const backendGitignore = read("bimbelku-backend/.gitignore");

expect(
  seeder.includes("app()->environment('production')")
    && seeder.includes("SEED_DEMO_USERS diabaikan"),
  "production environment blocks demo user seeding",
);
expect(
  /^APP_ENV=production$/m.test(productionEnv),
  "production template uses APP_ENV=production",
);
expect(
  /^APP_DEBUG=false$/m.test(productionEnv),
  "production template disables debug mode",
);
expect(
  /^SEED_DEMO_USERS=false$/m.test(productionEnv),
  "production template disables demo users",
);
expect(
  /^SEED_ADMIN_PASSWORD=$/m.test(productionEnv),
  "production template contains no default admin password",
);
expect(
  /^SESSION_SECURE_COOKIE=true$/m.test(productionEnv),
  "production template requires secure session cookies",
);
expect(
  /^LOG_LEVEL=warning$/m.test(productionEnv),
  "production template avoids debug logging",
);
expect(
  /^SEED_DEMO_USERS=false$/m.test(backendEnvExample),
  "development template defaults demo seeding to false",
);
expect(
  !backendEnvExample.includes("PRIMARY_ADMIN_EMAIL=admin@bimbelku.com"),
  "development template does not advertise a fixed admin login",
);
expect(
  rootGitignore.includes(".env") && backendGitignore.includes(".env"),
  "environment files remain ignored by Git",
);

for (const file of [
  "DemoSessionReminder.php",
  "DemoCheapClass.php",
  "DemoPackageRenewal.php",
  "DemoTeacherReplacement.php",
]) {
  const command = read(`bimbelku-backend/app/Console/Commands/${file}`);
  expect(
    command.includes("environment(['local', 'testing'])"),
    `${file} is restricted to local/testing`,
  );
}

for (const [ok, label] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
}

const failed = checks.filter(([ok]) => !ok);
console.log(`\n${checks.length - failed.length}/${checks.length} production readiness checks PASS`);
if (failed.length) process.exit(1);
