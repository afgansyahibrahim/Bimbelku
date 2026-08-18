export const ADMIN_PERMISSIONS = {
  OPERATIONS_DASHBOARD: "operations.dashboard",
  MATCHING_MANAGE: "matching.manage",
  FINANCE_PAYMENTS: "finance.payments",
  FINANCE_PAYOUTS: "finance.payouts",
  FINANCE_REFUNDS: "finance.refunds",
  TEACHERS_MANAGE: "teachers.manage",
  CASES_MANAGE: "cases.manage",
  USERS_MANAGE: "users.manage",
  CLASSES_MANAGE: "classes.manage",
  CONTENT_MANAGE: "content.manage",
  SUPPORT_MANAGE: "support.manage",
  SETTINGS_MANAGE: "settings.manage",
  AUDIT_VIEW: "audit.view",
} as const;

export type AdminPermission = typeof ADMIN_PERMISSIONS[keyof typeof ADMIN_PERMISSIONS];

export type StoredAdminUser = {
  role?: string;
  admin_type?: "super_admin" | "standard_admin" | string | null;
  admin_permissions?: string[];
};

export const isSuperAdmin = (user: StoredAdminUser | null | undefined) =>
  user?.role === "admin";

export const canAdmin = (
  user: StoredAdminUser | null | undefined,
  _permission: AdminPermission | string,
) => user?.role === "admin";

export const permissionForAdminPath = (pathname: string): AdminPermission | null => {
  const path = pathname.replace(/^\/admin\/?/, "");
  if (!path) return ADMIN_PERMISSIONS.OPERATIONS_DASHBOARD;

  const rules: Array<[RegExp, AdminPermission]> = [
    [/^tutor-searches(?:\/|$)/, ADMIN_PERMISSIONS.MATCHING_MANAGE],
    [/^(?:pembayaran|settings-payment)(?:\/|$)/, ADMIN_PERMISSIONS.FINANCE_PAYMENTS],
    [/^refunds(?:\/|$)/, ADMIN_PERMISSIONS.FINANCE_REFUNDS],
    [/^finance-security(?:\/|$)/, ADMIN_PERMISSIONS.FINANCE_PAYMENTS],
    [/^finance(?:\/|$)/, ADMIN_PERMISSIONS.FINANCE_PAYOUTS],
    [/^guru(?:\/|$)/, ADMIN_PERMISSIONS.TEACHERS_MANAGE],
    [/^users(?:\/|$)/, ADMIN_PERMISSIONS.USERS_MANAGE],
    [/^cases(?:\/|$)/, ADMIN_PERMISSIONS.CASES_MANAGE],
    [/^(?:classes|ratings)(?:\/|$)/, ADMIN_PERMISSIONS.CLASSES_MANAGE],
    [/^(?:pesan|notifikasi)(?:\/|$)/, ADMIN_PERMISSIONS.SUPPORT_MANAGE],
    [/^(?:subjects|learning-topics|hourly-rates|stage-five|kelas-murah)(?:\/|$)/, ADMIN_PERMISSIONS.CONTENT_MANAGE],
    [/^(?:settings-display|settings-footer|notes)(?:\/|$)/, ADMIN_PERMISSIONS.SETTINGS_MANAGE],
    [/^access-control(?:\/|$)/, ADMIN_PERMISSIONS.OPERATIONS_DASHBOARD],
    [/^audit-log(?:\/|$)/, ADMIN_PERMISSIONS.AUDIT_VIEW],
  ];

  for (const [pattern, permission] of rules) {
    if (pattern.test(path)) return permission;
  }
  return null;
};
