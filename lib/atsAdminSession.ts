export const ATS_ADMIN_TOKEN_KEY = "hotcol_ats_admin_token";
export const ATS_ADMIN_META_KEY = "hotcol_ats_admin_meta";

export type AtsAdminMeta = {
  displayName?: string;
  role?: string;
  tinNumber?: string;
  logoUrl?: string | null;
  mustChangeOtp?: boolean;
};

export function readAtsAdminMeta(): AtsAdminMeta {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(ATS_ADMIN_META_KEY) || "{}");
  } catch {
    return {};
  }
}

export function writeAtsAdminMeta(meta: AtsAdminMeta) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ATS_ADMIN_META_KEY, JSON.stringify(meta));
}

export function clearAtsAdminSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ATS_ADMIN_TOKEN_KEY);
  localStorage.removeItem(ATS_ADMIN_META_KEY);
}
