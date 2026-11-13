import "server-only";

import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatDate, formatNaira, percent } from "@/lib/format";
import { searchCoursesForAgent } from "@/lib/agent/knowledge";
import type { SessionUser } from "@/lib/auth";

export type AgentToolContext = {
  user: SessionUser | null;
  conversationId: string;
  name?: string;
  email?: string;
};

export type AgentToolResult = {
  ok: boolean;
  data?: unknown;
  error?: string;
  summary: string;
  ticketReference?: string;
};

const requireUser = (context: AgentToolContext) => {
  if (!context.user) {
    return {
      ok: false,
      summary: "The student needs to sign in before I can check private account, payment or learning records.",
      error: "AUTH_REQUIRED",
    } satisfies AgentToolResult;
  }
  return null;
};

export async function getAcademyInfo(topic?: string): Promise<AgentToolResult> {
  const settings = await getSettings();
  return {
    ok: true,
    summary: `Brave Skill is a skill acquisition academy operated by Emyphill-Tech Global Solutions Limited. Contact ${settings["site.email"]} or ${settings["site.phone"]}.`,
    data: {
      site: "https://academy.emyphilltech.com.ng",
      email: settings["site.email"],
      phone: settings["site.phone"],
      whatsapp: settings["site.whatsapp"],
      address: settings["site.address"],
      supportHours: "Monday to Friday, 9:00–17:00 WAT",
      topic: topic || "general",
    },
  };
}

export async function searchCourses(input: { query?: string; category?: string; maxPriceNaira?: number }) {
  const courses = await searchCoursesForAgent({
    query: input.query,
    category: input.category,
    maxPriceKobo: input.maxPriceNaira ? Math.round(input.maxPriceNaira * 100) : undefined,
  });
  return {
    ok: true,
    summary: courses.length
      ? `Found ${courses.length} published ${courses.length === 1 ? "programme" : "programmes"}.`
      : "No published programmes matched that search.",
    data: courses,
  } satisfies AgentToolResult;
}

export async function getCourseDetails(input: { slug?: string; title?: string }) {
  const courses = await searchCoursesForAgent({ slug: input.slug, query: input.title });
  const course = courses[0];
  if (!course) return { ok: false, summary: "I could not find that programme in the current catalogue.", error: "NOT_FOUND" } satisfies AgentToolResult;
  const full = await db.course.findUnique({
    where: { id: course.id },
    include: {
      category: true,
      modules: { orderBy: { position: "asc" }, include: { lessons: { where: { isPublished: true }, orderBy: { position: "asc" } } } },
      quizzes: { where: { isPublished: true }, select: { title: true, type: true, passMark: true } },
    },
  });
  if (!full) return { ok: false, summary: "I could not load that programme.", error: "NOT_FOUND" } satisfies AgentToolResult;
  return {
    ok: true,
    summary: `${full.title} costs ${full.priceKobo === 0 ? "nothing" : formatNaira(full.priceKobo)} and runs for ${full.durationLabel || "a self-paced schedule"}.`,
    data: {
      ...course,
      description: full.description.slice(0, 1200),
      outcomes: full.outcomes.split("\n").filter(Boolean),
      requirements: full.requirements.split("\n").filter(Boolean),
      modules: full.modules.map((module) => ({ title: module.title, lessons: module.lessons.length })),
      assessments: full.quizzes.map((quiz) => ({ title: quiz.title, type: quiz.type, passMark: quiz.passMark })),
      certificate: full.certificateEnabled,
      examRequired: full.examRequired,
      passMark: full.passMark,
    },
  } satisfies AgentToolResult;
}

export async function getFaqs(input: { query?: string }) {
  const faqs = await db.faq.findMany({ where: { isPublished: true }, orderBy: { position: "asc" }, take: 40 });
  const query = (input.query || "").toLowerCase();
  const selected = query
    ? faqs.filter((faq) => `${faq.question} ${faq.answer}`.toLowerCase().includes(query)).slice(0, 5)
    : faqs.slice(0, 8);
  return {
    ok: true,
    summary: `Loaded ${selected.length} FAQ ${selected.length === 1 ? "entry" : "entries"}.`,
    data: selected.map((faq) => ({ question: faq.question, answer: faq.answer, category: faq.category })),
  } satisfies AgentToolResult;
}

export async function getActiveDiscounts() {
  const now = new Date();
  const coupons = await db.coupon.findMany({
    where: {
      isActive: true,
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }],
    },
    include: { course: { select: { title: true } } },
    orderBy: { createdAt: "desc" },
    take: 8,
  });
  const available = coupons.filter((coupon) => coupon.maxUses === 0 || coupon.uses < coupon.maxUses);
  return {
    ok: true,
    summary: available.length
      ? `There ${available.length === 1 ? "is" : "are"} ${available.length} public discount ${available.length === 1 ? "code" : "codes"}.`
      : "There are no public discount codes at the moment.",
    data: available.map((coupon) => ({
      code: coupon.code,
      description: coupon.description,
      discount: coupon.type === "PERCENT" ? `${coupon.percentOff}% off` : `${formatNaira(coupon.amountOffKobo)} off`,
      appliesTo: coupon.course?.title || "All programmes",
      expires: coupon.expiresAt ? formatDate(coupon.expiresAt) : "No expiry",
    })),
  } satisfies AgentToolResult;
}

export async function listAnnouncements() {
  const announcements = await db.announcement.findMany({
    where: { isPublished: true },
    orderBy: { publishedAt: "desc" },
    take: 5,
  });
  return {
    ok: true,
    summary: `${announcements.length} current academy ${announcements.length === 1 ? "announcement" : "announcements"}.`,
    data: announcements.map((a) => ({ title: a.title, body: a.body, date: formatDate(a.publishedAt) })),
  } satisfies AgentToolResult;
}

export async function checkEnrollment(context: AgentToolContext) {
  const auth = requireUser(context);
  if (auth) return auth;
  const user = context.user!;
  const enrollments = await db.enrollment.findMany({
    where: { userId: user.id },
    orderBy: { enrolledAt: "desc" },
    include: {
      course: { include: { modules: { select: { _count: { select: { lessons: { where: { isPublished: true } } } } } } } },
      progress: { select: { completed: true } },
      certificate: { select: { serial: true } },
    },
  });
  const data = enrollments
    .filter((enrollment) => enrollment.status !== "REVOKED")
    .map((enrollment) => {
      const total = enrollment.course.modules.reduce((sum, module) => sum + module._count.lessons, 0);
      const completed = enrollment.progress.filter((p) => p.completed).length;
      return {
        course: enrollment.course.title,
        status: enrollment.status,
        progress: percent(completed, total),
        completedLessons: completed,
        totalLessons: total,
        enrolledAt: formatDate(enrollment.enrolledAt),
        certificate: enrollment.certificate?.serial || null,
      };
    });
  return {
    ok: true,
    summary: data.length
      ? `${user.name.split(" ")[0]} is enrolled in ${data.length} active ${data.length === 1 ? "programme" : "programmes"}.`
      : `${user.name.split(" ")[0]} does not have an active enrolment yet.`,
    data,
  } satisfies AgentToolResult;
}

export async function checkPaymentStatus(context: AgentToolContext, input: { reference?: string }) {
  const auth = requireUser(context);
  if (auth) return auth;
  const user = context.user!;
  const order = input.reference
    ? await db.order.findFirst({
        where: { userId: user.id, reference: { equals: input.reference.trim().toUpperCase() } },
        include: { course: { select: { title: true } } },
      })
    : null;

  if (input.reference && !order) {
    return { ok: false, summary: "No order with that reference exists on this account.", error: "NOT_FOUND" } satisfies AgentToolResult;
  }

  if (order) {
    return {
      ok: true,
      summary: `Order ${order.reference} is ${order.status}.`,
      data: {
        reference: order.reference,
        status: order.status,
        course: order.course.title,
        amount: formatNaira(order.amountKobo),
        paidAt: formatDate(order.paidAt, true),
        receipt: order.status === "PAID" ? `/api/payments/receipt/${order.id}` : null,
      },
    } satisfies AgentToolResult;
  }

  const orders = await db.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { course: { select: { title: true } } },
  });
  return {
    ok: true,
    summary: orders.length ? `Found ${orders.length} recent orders on this account.` : "There are no orders on this account yet.",
    data: orders.map((o) => ({
      reference: o.reference,
      course: o.course.title,
      amount: formatNaira(o.amountKobo),
      status: o.status,
      created: formatDate(o.createdAt),
      paidAt: o.paidAt ? formatDate(o.paidAt, true) : null,
    })),
  } satisfies AgentToolResult;
}

export async function getLearningProgress(context: AgentToolContext, input: { courseTitle?: string }) {
  const auth = requireUser(context);
  if (auth) return auth;
  const user = context.user!;
  const enrollments = await db.enrollment.findMany({
    where: {
      userId: user.id,
      status: { not: "REVOKED" },
      ...(input.courseTitle ? { course: { title: { contains: input.courseTitle, mode: "insensitive" } } } : {}),
    },
    include: {
      course: {
        include: {
          modules: {
            select: {
              title: true,
              lessons: { where: { isPublished: true }, orderBy: { position: "asc" }, select: { id: true, title: true } },
            },
          },
        },
      },
      progress: true,
      certificate: true,
    },
  });
  if (!enrollments.length) {
    return { ok: true, summary: "No matching active enrolment was found.", data: [] } satisfies AgentToolResult;
  }
  const data = enrollments.map((enrollment) => {
    const lessons = enrollment.course.modules.flatMap((module) => module.lessons);
    const completedIds = new Set(enrollment.progress.filter((p) => p.completed).map((p) => p.lessonId));
    const nextLesson = lessons.find((lesson) => !completedIds.has(lesson.id));
    return {
      course: enrollment.course.title,
      progress: percent(completedIds.size, lessons.length),
      completedLessons: completedIds.size,
      totalLessons: lessons.length,
      nextLesson: nextLesson?.title || "All lessons complete",
      certificate: enrollment.certificate?.serial || null,
      status: enrollment.status,
    };
  });
  return { ok: true, summary: `Loaded progress for ${data.length} programme${data.length === 1 ? "" : "s"}.`, data } satisfies AgentToolResult;
}

export async function checkCertificate(context: AgentToolContext, input: { courseTitle?: string }) {
  const auth = requireUser(context);
  if (auth) return auth;
  const user = context.user!;
  const [certificates, enrollments] = await Promise.all([
    db.certificate.findMany({
      where: { userId: user.id, revokedAt: null },
      orderBy: { issuedAt: "desc" },
      include: { course: { select: { title: true } } },
    }),
    db.enrollment.findMany({
      where: { userId: user.id, status: { not: "REVOKED" } },
      include: {
        course: {
          select: {
            title: true,
            certificateEnabled: true,
            examRequired: true,
            modules: { select: { lessons: { where: { isPublished: true }, select: { id: true } } } },
            quizzes: { where: { type: "EXAM", isPublished: true }, select: { id: true } },
          },
        },
        progress: { where: { completed: true }, select: { lessonId: true } },
      },
    }),
  ]);

  const examAttempts = await db.quizAttempt.findMany({
    where: { userId: user.id, passed: true, quiz: { type: "EXAM" } },
    select: { quizId: true },
  });
  const passedExams = new Set(examAttempts.map((a) => a.quizId));

  const eligibility = enrollments
    .filter((e) => !input.courseTitle || e.course.title.toLowerCase().includes(input.courseTitle.toLowerCase()))
    .map((e) => {
      const total = e.course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
      const completed = e.progress.length;
      const issued = certificates.find((c) => c.course.title === e.course.title);
      const examPassed = e.course.quizzes.some((q) => passedExams.has(q.id));
      return {
        course: e.course.title,
        certificate: issued ? { serial: issued.serial, issuedAt: formatDate(issued.issuedAt) } : null,
        lessonsComplete: completed >= total && total > 0,
        examRequired: e.course.examRequired,
        examPassed,
        eligible: e.course.certificateEnabled && completed >= total && (!e.course.examRequired || examPassed),
        completedLessons: completed,
        totalLessons: total,
      };
    });

  return {
    ok: true,
    summary: certificates.length
      ? `${user.name.split(" ")[0]} has ${certificates.length} active certificate${certificates.length === 1 ? "" : "s"}.`
      : "No active certificates on this account yet.",
    data: {
      certificates: certificates.map((c) => ({ serial: c.serial, course: c.course.title, issued: formatDate(c.issuedAt) })),
      eligibility,
    },
  } satisfies AgentToolResult;
}

export async function createSupportTicket(context: AgentToolContext, input: { subject: string; message: string; email?: string; name?: string; phone?: string; priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT" }) {
  const email = input.email || context.user?.email || context.email;
  const name = input.name || context.user?.name || context.name;
  if (!email) {
    return { ok: false, summary: "I need an email address to create a support ticket.", error: "EMAIL_REQUIRED" } satisfies AgentToolResult;
  }
  const reference = `BS-TKT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const ticket = await db.supportTicket.create({
    data: {
      reference,
      userId: context.user?.id,
      conversationId: context.conversationId,
      name: name || "Prospective student",
      email,
      phone: input.phone,
      subject: input.subject.slice(0, 160),
      message: input.message.slice(0, 4000),
      priority: input.priority || "NORMAL",
    },
  });
  await db.agentConversation.update({
    where: { id: context.conversationId },
    data: { escalated: true },
  }).catch(() => {});
  return {
    ok: true,
    summary: `Support ticket ${ticket.reference} created for ${email}.`,
    ticketReference: ticket.reference,
    data: { reference: ticket.reference, status: ticket.status, email },
  } satisfies AgentToolResult;
}

/* ── Tool declarations exposed to LLM providers ─────────────────────────── */

export const AGENT_TOOL_DECLARATIONS = [
  {
    name: "search_courses",
    description: "Search the live published course catalogue. Use for available courses, prices, categories and recommendations.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Keywords, title or skill area" },
        category: { type: "string", description: "Category slug such as solar, cctv, electrical, networking or access" },
        maxPriceNaira: { type: "number", description: "Maximum price in Nigerian Naira" },
      },
    },
  },
  {
    name: "get_course_details",
    description: "Get full details of one course: price, duration, outcomes, requirements, modules and assessments.",
    parameters: {
      type: "object",
      properties: {
        slug: { type: "string" },
        title: { type: "string" },
      },
    },
  },
  {
    name: "get_active_discounts",
    description: "List current active public discount codes and what they apply to.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "get_faqs",
    description: "Search approved academy FAQs and help documentation.",
    parameters: { type: "object", properties: { query: { type: "string" } } },
  },
  {
    name: "get_academy_info",
    description: "Get academy contact details, support hours and general information.",
    parameters: { type: "object", properties: { topic: { type: "string" } } },
  },
  {
    name: "check_enrollment",
    description: "Check the signed-in student's active enrolments. Requires authentication.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "check_payment_status",
    description: "Check the signed-in student's order or transaction status. Never use for another person's account.",
    parameters: { type: "object", properties: { reference: { type: "string", description: "Optional transaction reference" } } },
  },
  {
    name: "get_learning_progress",
    description: "Check the signed-in student's lesson progress and next lesson.",
    parameters: { type: "object", properties: { courseTitle: { type: "string" } } },
  },
  {
    name: "check_certificate",
    description: "Check the signed-in student's certificates and certificate eligibility.",
    parameters: { type: "object", properties: { courseTitle: { type: "string" } } },
  },
  {
    name: "create_support_ticket",
    description: "Escalate to a human by creating a support ticket. Use when the user asks for a human or the issue cannot be resolved.",
    parameters: {
      type: "object",
      properties: {
        subject: { type: "string" },
        message: { type: "string" },
        email: { type: "string" },
        name: { type: "string" },
        phone: { type: "string" },
        priority: { type: "string", enum: ["LOW", "NORMAL", "HIGH", "URGENT"] },
      },
      required: ["subject", "message"],
    },
  },
] as const;

export async function executeAgentTool(name: string, args: Record<string, unknown>, context: AgentToolContext): Promise<AgentToolResult> {
  switch (name) {
    case "search_courses":
      return searchCourses({ query: args.query as string, category: args.category as string, maxPriceNaira: args.maxPriceNaira as number });
    case "get_course_details":
      return getCourseDetails({ slug: args.slug as string, title: args.title as string });
    case "get_faqs":
      return getFaqs({ query: args.query as string });
    case "get_active_discounts":
      return getActiveDiscounts();
    case "get_academy_info":
      return getAcademyInfo(args.topic as string);
    case "check_enrollment":
      return checkEnrollment(context);
    case "check_payment_status":
      return checkPaymentStatus(context, { reference: args.reference as string });
    case "get_learning_progress":
      return getLearningProgress(context, { courseTitle: args.courseTitle as string });
    case "check_certificate":
      return checkCertificate(context, { courseTitle: args.courseTitle as string });
    case "create_support_ticket":
      return createSupportTicket(context, {
        subject: (args.subject as string) || "Brave AI Assistant escalation",
        message: (args.message as string) || "Student requested human assistance.",
        email: args.email as string,
        name: args.name as string,
        phone: args.phone as string,
        priority: args.priority as "LOW" | "NORMAL" | "HIGH" | "URGENT",
      });
    default:
      return { ok: false, summary: `Unknown tool: ${name}`, error: "UNKNOWN_TOOL" };
  }
}
