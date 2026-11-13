const required = (key: string, fallback?: string): string => {
  const value = process.env[key] ?? fallback;
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
};

export const env = {
  get databaseUrl() {
    return required("DATABASE_URL");
  },
  get authSecret() {
    const value = required("AUTH_SECRET");
    if (value.length < 32) throw new Error("AUTH_SECRET must be at least 32 characters.");
    return value;
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
    const explicitlyAllowed = process.env.ALLOW_DEMO_PAYMENTS === "true";
    const noGatewayKeys = !process.env.PAYSTACK_SECRET_KEY?.trim();
    const localHost = /localhost|127\.0\.0\.1/i.test(this.siteUrl);
    // Never allow the test fulfilment path on a real production host, even if
    // the flag was left enabled by mistake.
    return explicitlyAllowed && noGatewayKeys && (!this.isProduction || localHost);
  },
  get storageDir() {
    return process.env.STORAGE_DIR || "./storage";
  },
  get backupDir() {
    return process.env.BACKUP_DIR || "./backups";
  },
  get adminAlertEmails() {
    return (process.env.ADMIN_ALERT_EMAILS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  },
};

export const isPaystackConfigured = () => Boolean(env.paystackSecret && env.paystackPublic);
