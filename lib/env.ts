const required = (key: string, fallback?: string): string => {
  const value = process.env[key] ?? fallback;
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
};

export const env = {
  get authSecret() {
    return required("AUTH_SECRET");
  },
  get siteUrl() {
    return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  },
  get siteName() {
    return process.env.NEXT_PUBLIC_SITE_NAME || "Brave Skill";
  },
  get supportEmail() {
    return process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@academy.emyphilltech.com.ng";
  },
  get supportPhone() {
    return process.env.NEXT_PUBLIC_SUPPORT_PHONE || "";
  },
  get whatsapp() {
    return process.env.NEXT_PUBLIC_WHATSAPP || "";
  },
  get paystackSecret() {
    return process.env.PAYSTACK_SECRET_KEY?.trim() || "";
  },
  get paystackPublic() {
    return process.env.PAYSTACK_PUBLIC_KEY?.trim() || "";
  },
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
  get demoPaymentsEnabled() {
    return process.env.ALLOW_DEMO_PAYMENTS === "true" && !process.env.PAYSTACK_SECRET_KEY?.trim();
  },
  get storageDir() {
    return process.env.STORAGE_DIR || "./storage";
  },
  get adminAlertEmails() {
    return (process.env.ADMIN_ALERT_EMAILS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  },
};

export const isPaystackConfigured = () => Boolean(env.paystackSecret && env.paystackPublic);
