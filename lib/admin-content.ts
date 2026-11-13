import "server-only";

import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/api";
import type { SessionUser } from "@/lib/auth";
import { slugify } from "@/lib/format";
import {
  announcementSchema,
  apkSchema,
  categorySchema,
  couponSchema,
  faqSchema,
  lessonSchema,
  moduleSchema,
  questionSchema,
  quizSchema,
  testimonialSchema,
} from "@/lib/validation";

type ContentResource = {
  model: "category" | "coupon" | "announcement" | "testimonial" | "faq" | "module" | "lesson" | "quiz" | "question" | "apkRelease";
  schema: z.ZodTypeAny;
  instructorAllowed: boolean;
  transform?: (data: Record<string, unknown>, user: SessionUser) => Record<string, unknown>;
  ownership?: (data: Record<string, unknown>) => Promise<{ courseId: string | null }>;
};

export const CONTENT_RESOURCES: Record<string, ContentResource> = {
  categories: {
    model: "category",
    schema: categorySchema,
    instructorAllowed: false,
    transform: (data) => {
      const clean = { ...data };
      const name = String(data.name || "");
      if (!clean.slug) clean.slug = slugify(name);
      return clean;
    },
  },
  coupons: {
    model: "coupon",
    schema: couponSchema,
    instructorAllowed: false,
    transform: (data, user) => ({
      ...data,
      code: String(data.code || "").toUpperCase(),
      amountOffKobo: Math.round(Number(data.amountOffNaira || 0) * 100),
      minAmountKobo: Math.round(Number(data.minAmountNaira || 0) * 100),
      courseId: data.courseId || null,
      amountOffNaira: undefined,
      minAmountNaira: undefined,
      startsAt: data.startsAt ? new Date(String(data.startsAt)) : null,
      expiresAt: data.expiresAt ? new Date(String(data.expiresAt)) : null,
      createdById: user.id,
    }),
  },
  announcements: {
    model: "announcement",
    schema: announcementSchema,
    instructorAllowed: false,
    transform: (data, user) => ({
      ...data,
      courseId: data.audience === "COURSE" ? data.courseId || null : null,
      createdById: user.id,
      publishedAt: new Date(),
    }),
  },
  testimonials: {
    model: "testimonial",
    schema: testimonialSchema,
    instructorAllowed: false,
  },
  faqs: {
    model: "faq",
    schema: faqSchema,
    instructorAllowed: false,
  },
  apk: {
    model: "apkRelease",
    schema: apkSchema,
    instructorAllowed: false,
    transform: (data) => ({
      ...data,
      assetId: data.assetId || null,
      downloadUrl: data.downloadUrl || null,
      notes: data.notes || null,
    }),
  },
  modules: {
    model: "module",
    schema: moduleSchema,
    instructorAllowed: true,
    ownership: async (data) => ({ courseId: String(data.courseId || "") || null }),
  },
  lessons: {
    model: "lesson",
    schema: lessonSchema,
    instructorAllowed: true,
    transform: (data) => ({
      ...data,
      videoAssetId: data.videoAssetId || null,
      pdfAssetId: data.pdfAssetId || null,
      videoUrl: data.videoUrl || null,
    }),
    ownership: async (data) => {
      if (data.moduleId) {
        const mod = await db.module.findUnique({ where: { id: String(data.moduleId) }, select: { courseId: true } });
        return { courseId: mod?.courseId ?? null };
      }
      return { courseId: null };
    },
  },
  quizzes: {
    model: "quiz",
    schema: quizSchema,
    instructorAllowed: true,
    ownership: async (data) => ({ courseId: String(data.courseId || "") || null }),
  },
  questions: {
    model: "question",
    schema: questionSchema,
    instructorAllowed: true,
    transform: (data) => ({ ...data, options: JSON.stringify(data.options || []) }),
    ownership: async (data) => {
      if (!data.quizId) return { courseId: null };
      const quiz = await db.quiz.findUnique({ where: { id: String(data.quizId) }, select: { courseId: true } });
      return { courseId: quiz?.courseId ?? null };
    },
  },
};

export async function resolveOwnership(resource: string, data: Record<string, unknown>) {
  const config = CONTENT_RESOURCES[resource];
  if (!config) throw new HttpError("Unknown resource.", 404);
  return config.ownership ? config.ownership(data) : { courseId: null };
}

export async function assertCanManageContent(
  user: SessionUser,
  resource: string,
  data: Record<string, unknown>,
) {
  const config = CONTENT_RESOURCES[resource];
  if (!config) throw new HttpError("Unknown resource.", 404);
  if (user.role === "MASTER_ADMIN" || user.role === "ADMIN") return;

  if (user.role !== "INSTRUCTOR" || !config.instructorAllowed) {
    throw new HttpError("You do not have permission to manage this content.", 403);
  }

  const { courseId } = await resolveOwnership(resource, data);
  if (!courseId) throw new HttpError("A course is required.", 422);
  const course = await db.course.findUnique({ where: { id: courseId }, select: { instructorId: true } });
  if (!course || course.instructorId !== user.id) {
    throw new HttpError("You can only manage your own courses.", 403);
  }
}
