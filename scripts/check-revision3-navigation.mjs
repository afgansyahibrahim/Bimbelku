import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const navigation = read("src/lib/navigation.ts");
const studentLayout = read("src/components/StudentLayout.tsx");
const mobileNav = read("src/components/MobileBottomNav.tsx");
const adminLayout = read("src/components/AdminLayout.tsx");
const teacherLayout = read("src/components/TeacherLayout.tsx");
const navbar = read("src/components/Navbar.tsx");

const checks = [
  [navigation.includes('exclude: ["/student/packages/new"]'), "Kelas Saya harus mengecualikan halaman pembuatan paket."],
  [navigation.includes('prefixes: ["/student/vouchers", "/student/offers"]'), "Detail promo harus tetap mengaktifkan menu Voucher."],
  [navigation.includes('exact: ["/search", "/student/find"]'), "Rute pencarian lama dan baru harus mengaktifkan Cari Les."],
  [navigation.includes('messages: { prefixes: ["/student/messages"] }'), "Rute Pesan harus memiliki penanda aktif."],
  [studentLayout.includes("isStudentRouteActive(location.pathname, 'packages')"), "Sidebar murid belum memakai matcher terpusat."],
  [mobileNav.includes("isStudentRouteActive(location.pathname, item.activeKey)"), "Navigasi bawah belum memakai matcher terpusat."],
  [adminLayout.includes("isSectionActive(location.pathname, path, exact)"), "Menu admin belum memakai matcher konsisten."],
  [teacherLayout.includes("isSectionActive(location.pathname, path, exact)"), "Menu tutor belum memakai matcher konsisten."],
  [navbar.includes("routeMatches(location.pathname"), "Navbar publik belum memakai matcher konsisten."],
];

const failed = checks.filter(([ok]) => !ok);
if (failed.length) {
  for (const [, message] of failed) console.error(`FAIL: ${message}`);
  process.exit(1);
}

console.log(`Revision 3 navigation checks passed (${checks.length} assertions).`);
