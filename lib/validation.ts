import { z } from "zod";

const email = z.string().trim().toLowerCase().email("Enter a valid email address").max(190);
const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password is too long")
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/[0-9]/, "Include at least one number");

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(100),
  email,
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  password,
  acceptTerms: z.literal(true, { message: "Please accept the terms and privacy policy" }),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password"),
  next: z.string().max(300).optional(),
});

export const forgotPasswordSchema = z.object({ email });
export const resetPasswordSchema = z.object({
  token: z.string().min(20),
  password,
});

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email,
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  subject: z.string().trim().min(3).max(160),
  message: z.string().trim().min(10, "Tell us a little more").max(4000),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  headline: z.string().trim().max(120).optional().or(z.literal("")),
  bio: z.string().trim().max(1200).optional().or(z.literal("")),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: password,
});

export const courseSchema = z.object({
  title: z.string().trim().min(4).max(160),
  slug: z.string().trim().max(90).optional(),
  subtitle: z.string().trim().max(180).optional().or(z.literal("")),
  summary: z.string().trim().min(20).max(400),
  description: z.string().trim().min(20).max(20000),
  outcomes: z.string().trim().max(6000).optional().or(z.literal("")),
  requirements: z.string().trim().max(4000).optional().or(z.literal("")),
  categoryId: z.string().min(1, "Choose a category"),
  instructorId: z.string().optional().or(z.literal("")),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  priceNaira: z.coerce.number().min(0).max(50_000_000),
  compareAtNaira: z.coerce.number().min(0).max(50_000_000).optional(),
  thumbnailUrl: z.string().trim().max(500).optional().or(z.literal("")),
  promoVideoUrl: z.string().trim().max(500).optional().or(z.literal("")),
  durationLabel: z.string().trim().max(60).optional().or(z.literal("")),
  certificateEnabled: z.boolean().optional(),
  examRequired: z.boolean().optional(),
  passMark: z.coerce.number().int().min(0).max(100).optional(),
  isPublished: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().max(90).optional().or(z.literal("")),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  icon: z.string().trim().max(40).optional().or(z.literal("")),
  accent: z.string().trim().max(20).optional().or(z.literal("")),
  position: z.coerce.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
});

export const moduleSchema = z.object({
  courseId: z.string().min(1),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  position: z.coerce.number().int().min(0).optional(),
  isPublished: z.boolean().optional(),
});

export const lessonSchema = z.object({
  moduleId: z.string().min(1),
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  type: z.enum(["VIDEO", "PDF", "TEXT"]),
  durationSeconds: z.coerce.number().int().min(0).max(60 * 60 * 12).optional(),
  videoAssetId: z.string().optional().or(z.literal("")),
  pdfAssetId: z.string().optional().or(z.literal("")),
  videoUrl: z.string().trim().max(500).optional().or(z.literal("")),
  content: z.string().trim().max(200000).optional().or(z.literal("")),
  position: z.coerce.number().int().min(0).optional(),
  isPreview: z.boolean().optional(),
  isPublished: z.boolean().optional(),
});

export const quizSchema = z.object({
  courseId: z.string().min(1),
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  type: z.enum(["QUIZ", "EXAM"]),
  passMark: z.coerce.number().int().min(0).max(100),
  timeLimitMinutes: z.coerce.number().int().min(0).max(480).optional(),
  maxAttempts: z.coerce.number().int().min(0).max(50).optional(),
  isPublished: z.boolean().optional(),
});

export const questionSchema = z.object({
  quizId: z.string().min(1),
  prompt: z.string().trim().min(4).max(2000),
  options: z.array(z.string().trim().min(1).max(500)).min(2, "Provide at least two options").max(8),
  correctIndex: z.coerce.number().int().min(0),
  explanation: z.string().trim().max(1000).optional().or(z.literal("")),
  points: z.coerce.number().int().min(1).max(100).optional(),
  position: z.coerce.number().int().min(0).optional(),
});

export const couponSchema = z.object({
  code: z.string().trim().min(3).max(32).regex(/^[A-Za-z0-9_-]+$/, "Letters, numbers, - and _ only"),
  description: z.string().trim().max(200).optional().or(z.literal("")),
  type: z.enum(["PERCENT", "FIXED"]),
  percentOff: z.coerce.number().int().min(0).max(100).optional(),
  amountOffNaira: z.coerce.number().min(0).max(10_000_000).optional(),
  courseId: z.string().optional().or(z.literal("")),
  maxUses: z.coerce.number().int().min(0).max(1_000_000).optional(),
  minAmountNaira: z.coerce.number().min(0).max(10_000_000).optional(),
  startsAt: z.string().optional().or(z.literal("")),
  expiresAt: z.string().optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});

export const announcementSchema = z.object({
  title: z.string().trim().min(3).max(160),
  body: z.string().trim().min(5).max(5000),
  audience: z.enum(["ALL", "STUDENTS", "COURSE"]),
  courseId: z.string().optional().or(z.literal("")),
  isPublished: z.boolean().optional(),
});

export const testimonialSchema = z.object({
  name: z.string().trim().min(2).max(100),
  role: z.string().trim().max(120).optional().or(z.literal("")),
  quote: z.string().trim().min(10).max(1000),
  courseTitle: z.string().trim().max(160).optional().or(z.literal("")),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  isPublished: z.boolean().optional(),
  position: z.coerce.number().int().min(0).optional(),
});

export const faqSchema = z.object({
  question: z.string().trim().min(5).max(300),
  answer: z.string().trim().min(5).max(3000),
  category: z.string().trim().max(60).optional().or(z.literal("")),
  position: z.coerce.number().int().min(0).optional(),
  isPublished: z.boolean().optional(),
});

export const settingsSchema = z.record(z.string(), z.string().max(4000));

export const apkSchema = z.object({
  version: z.string().trim().min(1).max(30),
  versionCode: z.coerce.number().int().min(1),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  assetId: z.string().optional().or(z.literal("")),
  downloadUrl: z.string().url().optional().or(z.literal("")),
  minAndroid: z.string().trim().max(20).optional(),
  isActive: z.boolean().optional(),
});

export const refundSchema = z.object({
  reason: z.string().trim().min(4).max(500),
  amountNaira: z.coerce.number().min(0).optional(),
});

export const progressSchema = z.object({
  lessonId: z.string().min(1),
  completed: z.boolean().optional(),
  watchedSeconds: z.coerce.number().int().min(0).max(60 * 60 * 12).optional(),
});

export const submitAttemptSchema = z.object({
  answers: z.array(z.number().int().min(-1).max(20)),
});

export const adminUserSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email,
  role: z.enum(["MASTER_ADMIN", "ADMIN", "INSTRUCTOR", "STUDENT"]),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  password: z.string().optional().or(z.literal("")),
  headline: z.string().trim().max(120).optional().or(z.literal("")),
  expertise: z.string().trim().max(240).optional().or(z.literal("")),
});

export const entitlementSchema = z.object({
  courseId: z.string().min(1),
  userId: z.string().min(1),
});
