import "server-only";

import { formatNaira } from "@/lib/format";
import { retrieveKnowledge, searchCoursesForAgent, type KnowledgeSnippet } from "@/lib/agent/knowledge";
import { getAcademyInfo, getCourseDetails, searchCourses, checkEnrollment, checkPaymentStatus, getLearningProgress, checkCertificate, createSupportTicket, getFaqs, getActiveDiscounts, type AgentToolContext, type AgentToolResult } from "@/lib/agent/tools";
import type { SessionUser } from "@/lib/auth";

export type LocalAgentContext = {
  lastIntent?: string;
  lastCourseId?: string;
  lastCourseTitle?: string;
  pendingTicket?: { subject: string; message: string; name?: string; email?: string };
  awaitingEmailForTicket?: boolean;
};

export type LocalAgentResult = {
  reply: string;
  intent: string;
  suggestions: string[];
  toolsUsed: string[];
  ticketReference?: string;
  context: LocalAgentContext;
  escalated?: boolean;
};

const REGEX = {
  greeting: /^(hi|hello|hey|good (morning|afternoon|evening)|how are you)\b/i,
  thanks: /(thank you|thanks|thank u|appreciate)/i,
  bye: /(bye|goodbye|see you|that.s all|no more questions)/i,
  human: /(human|real person|speak to (someone|a person)|talk to (someone|an agent)|escalate|complain|supervisor|manager)/i,
  price: /(price|cost|how much|fee|fees|naira|₦|afford|cheap|expensive)/i,
  duration: /(duration|how long|weeks?|hours?|months?|time to complete)/i,
  requirements: /(requirement|prerequisite|what do i need|tools?|qualification|experience)/i,
  outcomes: /(what will i learn|outcome|curriculum|modules?|syllabus|cover)/i,
  recommend: /(recommend|which (course|programme|program)|best (course|programme|program)|what should i (learn|study)|career|job|business|start with|beginner)/i,
  list: /(courses?|programmes?|programs?|catalogue|catalog|available|what do you (offer|teach))/i,
  enroll: /(enrol|enroll|register|sign up|signup|admission|how do i (join|start|buy)|purchase)/i,
  payment: /(pay|payment|paystack|transaction|reference|receipt|charged|debited|declined|failed payment|refund)/i,
  status: /(my (course|enrol|payment|progress|certificate|account)|check my|status|have i (paid|enrolled)|am i enrolled|how far)/i,
  certificate: /(certificate|credential|verify|verification)/i,
  exam: /(exam|examination|quiz|assessment|test|pass mark|passmark|attempt)/i,
  android: /(android|app|apk|play store|download|phone|mobile)/i,
  account: /(password|login|log in|sign in|signin|reset|account|email change|otp)/i,
  contact: /(contact|email address|phone number|whatsapp|support hours|where are you|location)/i,
  refund: /(refund|money back|cancel.*(purchase|order)|reversed)/i,
  discount: /(discount|coupon|promo code|voucher|offer|promotion)/i,
  compare: /(compare|difference between|versus| vs )/i,
  courseFocus: /(tell me about|details? (of|on|about)|about (the )?(solar|cctv|electrical|network|access)|course details?|programme details?|what is (the )?(solar|cctv|electrical|network|access))/i,
  paymentReference: /\bBS-[A-Z0-9-]{6,}\b/i,
  email: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
};

const CATEGORY_HINTS: { slug: string; words: RegExp; label: string }[] = [
  { slug: "solar", words: /(solar|inverter|battery|panel|renewable|power|electricity bill|nepa|gen)/i, label: "Solar & Inverter" },
  { slug: "cctv", words: /(cctv|camera|surveillance|security camera|nvr|dvr|monitor)/i, label: "CCTV & Surveillance" },
  { slug: "electrical", words: /(electrical|wiring|electrician|distribution board|breaker|socket|lighting)/i, label: "Electrical Installation" },
  { slug: "networking", words: /(network|networking|fiber|fibre|wifi|wi-fi|cat6|router|switch|internet|cabling)/i, label: "Networking & Fiber" },
  { slug: "access", words: /(access control|intercom|gate|door lock|biometric|fingerprint|card reader|smart home)/i, label: "Intercom & Access Control" },
];

const price = (kobo: number) => (kobo === 0 ? "free" : formatNaira(kobo));

function findCourse(message: string, courses: Awaited<ReturnType<typeof searchCoursesForAgent>>) {
  const lower = message.toLowerCase();
  let best: (typeof courses)[number] | undefined;
  let bestScore = 0;
  for (const course of courses) {
    const words = `${course.title} ${course.category}`.toLowerCase();
    let score = 0;
    for (const token of lower.split(/\s+/)) {
      if (token.length > 3 && words.includes(token)) score += 1;
    }
    if (lower.includes(course.category.toLowerCase())) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = course;
    }
  }
  return bestScore >= 1 ? best : undefined;
}

function courseSummary(course: Awaited<ReturnType<typeof searchCoursesForAgent>>[number]) {
  return `${course.title} (${course.category}, ${course.level.toLowerCase()}) — ${price(course.priceKobo)}, ${course.duration}, ${course.lessons} lessons`;
}

function suggestionsFor(intent: string, courses: Awaited<ReturnType<typeof searchCoursesForAgent>>) {
  switch (intent) {
    case "course_list":
    case "recommendation":
      return ["How much is the solar course?", "Which course suits a beginner?", "How do I enrol?"];
    case "pricing":
      return ["What does the price include?", "Can I use a discount code?", "How do I pay?"];
    case "enrollment":
      return ["How do I create an account?", "What payment methods work?", "Is there a payment plan?"];
    case "payment":
      return ["My payment succeeded but my course is locked", "How do refunds work?", "Talk to a human"];
    case "certificate":
      return ["How do I pass the final exam?", "Where can I verify a certificate?", "Check my progress"];
    case "android":
      return ["How do I install the APK?", "Is it on Google Play?", "Does it work offline?"];
    case "exam":
      return ["What is the pass mark?", "How many attempts do I get?", "What happens after I pass?"];
    default:
      return ["Browse courses", "Check course prices", "Talk to a human"];
  }
}

async function toolReply(result: AgentToolResult): Promise<string> {
  if (!result.ok) return result.summary;
  const data = result.data as Record<string, unknown> | undefined;
  if (!data) return result.summary;

  if (Array.isArray(data)) {
    if (data[0] && "nextLesson" in data[0]) {
      return data
        .map((item) => {
          const row = item as Record<string, unknown>;
          return `${row.course}: ${row.progress}% complete, ${row.completedLessons} of ${row.totalLessons} lessons. Next lesson: ${row.nextLesson}.`;
        })
        .join(" ");
    }
    if (data[0] && "enrolledAt" in data[0] && "progress" in data[0]) {
      return data
        .map((item) => {
          const row = item as Record<string, unknown>;
          return `${row.course}: ${row.progress}% complete, enrolled ${row.enrolledAt}${row.certificate ? `, certificate ${row.certificate}` : ""}.`;
        })
        .join(" ");
    }
    if ("reference" in (data[0] || {})) {
      return data
        .map((order) => {
          const o = order as Record<string, unknown>;
          return `${o.course || "Course"} — ${o.status}${o.paidAt ? `, paid ${o.paidAt}` : ""} (${o.reference})`;
        })
        .join("\n");
    }
    if ("question" in (data[0] || {})) {
      return data
        .slice(0, 3)
        .map((faq) => `${(faq as Record<string, string>).question} ${(faq as Record<string, string>).answer}`)
        .join("\n\n");
    }
    return result.summary;
  }

  if ("progress" in data) {
    return `You are ${data.progress}% through ${data.course}, with ${data.completedLessons} of ${data.totalLessons} lessons complete. Your next lesson is “${data.nextLesson}”.`;
  }
  if ("status" in data && "reference" in data) {
    return `Transaction ${data.reference} is ${data.status}. ${data.status === "PAID" ? "The payment is verified and access is active." : "Access is only granted after server-side verification."}`;
  }
  if ("certificates" in data) {
    const certs = data.certificates as { serial: string; course: string }[];
    if (certs.length) return `You have ${certs.length} active certificate${certs.length === 1 ? "" : "s"}: ${certs.map((c) => `${c.course} (${c.serial})`).join(", ")}.`;
  }
  return result.summary;
}

export async function answerLocally(input: {
  message: string;
  user: SessionUser | null;
  context: LocalAgentContext;
  history: { role: string; content: string }[];
  conversationId: string;
  settings: Record<string, string>;
}): Promise<LocalAgentResult> {
  const { message, user, context, settings, conversationId } = input;
  const toolsUsed: string[] = [];
  const clean = message.trim();
  const lower = clean.toLowerCase();
  const nextContext: LocalAgentContext = { ...context };
  const toolContext: AgentToolContext = { user, conversationId };
  const firstName = user?.name.split(" ")[0];

  // Continue a pending ticket flow.
  if (context.pendingTicket && (context.awaitingEmailForTicket || REGEX.email.test(clean))) {
    const email = clean.match(REGEX.email)?.[0] || context.pendingTicket.email;
    if (!email) {
      return {
        reply: "I still need an email address so the support team can reply. You can type it here — for example, name@example.com.",
        intent: "support",
        suggestions: ["Talk to a human", "How do I contact support?"],
        toolsUsed,
        context: { ...nextContext, awaitingEmailForTicket: true },
      };
    }
    const result = await createSupportTicket(toolContext, {
      subject: context.pendingTicket.subject,
      message: context.pendingTicket.message,
      email,
      name: context.pendingTicket.name,
    });
    toolsUsed.push("create_support_ticket");
    nextContext.pendingTicket = undefined;
    nextContext.awaitingEmailForTicket = false;
    if (result.ok) {
      return {
        reply: `Thank you. I have created support ticket ${result.ticketReference} and sent it to the academy team. They will reply to ${email}, usually within one business day. Is there anything else I can help with while you wait?`,
        intent: "support",
        suggestions: ["How do I enrol?", "Check course prices", "No, thank you"],
        toolsUsed,
        ticketReference: result.ticketReference,
        context: nextContext,
        escalated: true,
      };
    }
    return { reply: "I could not create the ticket just now. Please email support@academy.emyphilltech.com.ng and the team will assist you directly.", intent: "support", suggestions: ["Contact support"], toolsUsed, context: nextContext };
  }

  if (REGEX.greeting.test(clean)) {
    const hour = new Date().getUTCHours() + 1;
    const timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    return {
      reply: `${timeGreeting}${firstName ? `, ${firstName}` : ""}. I'm ${settings["ai.name"] || "Brave AI"}, the academy's learning assistant. I can help you compare programmes, understand prices and enrolment, check your learning progress, or connect you with a human. What would you like to talk about?`,
      intent: "greeting",
      suggestions: ["Show me the courses", "How much is the solar course?", "How do I enrol?"],
      toolsUsed,
      context: { ...nextContext, lastIntent: "greeting" },
    };
  }

  if (REGEX.thanks.test(clean) && !REGEX.human.test(clean)) {
    return {
      reply: "You're very welcome. If you need anything else — a course recommendation, payment help or your certificate status — just ask.",
      intent: "thanks",
      suggestions: ["Browse courses", "Check my progress", "Talk to a human"],
      toolsUsed,
      context: { ...nextContext, lastIntent: "thanks" },
    };
  }

  if (REGEX.bye.test(clean)) {
    return {
      reply: "Thank you for speaking with Brave AI. Learn, practice, build — and I hope to see you inside the academy.",
      intent: "goodbye",
      suggestions: ["Browse courses", "Start registration"],
      toolsUsed,
      context: { ...nextContext, lastIntent: "goodbye" },
    };
  }

  const courses = await searchCoursesForAgent({});
  const matchedCourse = findCourse(clean, courses) ||
    (context.lastCourseId ? courses.find((c) => c.id === context.lastCourseId) : undefined);

  // Follow-up phrases resolve against the course already being discussed.
  const isFollowUp = /^(how much|and (the )?(price|duration)|tell me more|what about (it|that)|how long|requirements|outcomes|is it|does it|can i)\b/i.test(lower);
  const reference = clean.match(REGEX.paymentReference)?.[0];

  if (REGEX.human.test(clean)) {
    if (user) {
      const summary = `Student ${user.name} (${user.email}) requested human assistance in the AI assistant. Recent message: ${clean}`;
      return {
        reply: `Of course. I can connect you with a human. I've prepared a support request for ${user.email}. Tell me briefly what you need help with, or I can create the ticket now with this conversation as context.`,
        intent: "support",
        suggestions: ["Create the ticket", "Just answer my question", "How do I contact support?"],
        toolsUsed,
        context: {
          ...nextContext,
          lastIntent: "support",
          pendingTicket: {
            subject: "Student requested human assistance",
            message: summary,
            name: user.name,
            email: user.email,
          },
          awaitingEmailForTicket: false,
        },
      };
    }
    return {
      reply: `I can arrange that. The academy team can be reached at ${settings["site.email"]} or ${settings["site.phone"]} during business hours. If you would like me to create a support ticket, share the best email address and a short description of the issue, and I'll escalate it with a reference number.`,
      intent: "support",
      suggestions: ["Create a support ticket", "What are your support hours?", "No, keep helping me"],
      toolsUsed,
      context: {
        ...nextContext,
        lastIntent: "support",
        pendingTicket: { subject: "Student requested human assistance", message: `Visitor requested human assistance: ${clean}` },
        awaitingEmailForTicket: true,
      },
    };
  }

  if (context.pendingTicket && context.lastIntent === "support" && user && clean.length > 12 && !/^(yes|no|create|please|go ahead|do it|submit)$/i.test(lower) && !REGEX.email.test(clean)) {
    const result = await createSupportTicket(toolContext, {
      subject: context.pendingTicket.subject,
      message: `${context.pendingTicket.message}\n\nStudent added: ${clean}`,
      name: user.name,
      email: user.email,
    });
    toolsUsed.push("create_support_ticket");
    nextContext.pendingTicket = undefined;
    if (result.ok) {
      return {
        reply: `I've created ticket ${result.ticketReference} for you and included what you just told me. The academy team will reply at ${user.email}, usually within one business day. Is there anything I can clarify while you wait?`,
        intent: "support",
        suggestions: ["Check course prices", "How do I enrol?", "No, thank you"],
        toolsUsed,
        ticketReference: result.ticketReference,
        context: { ...nextContext, lastIntent: "support" },
        escalated: true,
      };
    }
  }

  if (context.pendingTicket && /(yes|create|please|go ahead|do it|submit)/i.test(lower)) {
    const result = await createSupportTicket(toolContext, {
      subject: context.pendingTicket.subject,
      message: `${context.pendingTicket.message}\n\nConversation: ${clean}`,
      name: context.pendingTicket.name,
      email: context.pendingTicket.email,
    });
    toolsUsed.push("create_support_ticket");
    if (result.ok) {
      nextContext.pendingTicket = undefined;
      return {
        reply: `Done. Your support ticket is ${result.ticketReference}. The academy team will follow up${user ? ` at ${user.email}` : ""}, usually within one business day.`,
        intent: "support",
        suggestions: ["Browse courses", "Check payment status", "No, thank you"],
        toolsUsed,
        ticketReference: result.ticketReference,
        context: nextContext,
        escalated: true,
      };
    }
    return { reply: "I couldn't create the ticket automatically. Please email support@academy.emyphilltech.com.ng and reference this conversation.", intent: "support", suggestions: ["Contact support"], toolsUsed, context: nextContext };
  }

  if (REGEX.status.test(lower) || (REGEX.payment.test(lower) && (reference || user))) {
    if (!user) {
      return {
        reply: "I can check that for you, but private account and payment records are only available after sign-in. Please sign in at academy.emyphilltech.com.ng/login, then ask me again and I'll verify the exact status. I will never ask for your password, PIN or OTP.",
        intent: "payment",
        suggestions: ["How do I reset my password?", "Talk to a human"],
        toolsUsed,
        context: { ...nextContext, lastIntent: "payment" },
      };
    }
    if (reference) {
      const result = await checkPaymentStatus(toolContext, { reference });
      toolsUsed.push("check_payment_status");
      return {
        reply: await toolReply(result),
        intent: "payment",
        suggestions: ["Download my receipt", "My course is still locked", "Talk to a human"],
        toolsUsed,
        context: { ...nextContext, lastIntent: "payment" },
      };
    }
    if (/(progress|learning|lesson)/i.test(lower)) {
      const result = await getLearningProgress(toolContext, { courseTitle: matchedCourse?.title });
      toolsUsed.push("get_learning_progress");
      return {
        reply: await toolReply(result),
        intent: "progress",
        suggestions: ["Continue my course", "How do certificates work?", "Talk to a human"],
        toolsUsed,
        context: { ...nextContext, lastIntent: "progress" },
      };
    }
    if (REGEX.certificate.test(lower)) {
      const result = await checkCertificate(toolContext, { courseTitle: matchedCourse?.title });
      toolsUsed.push("check_certificate");
      const base = await toolReply(result);
      return {
        reply: `${base} ${summariseEligibility(result)}`.trim(),
        intent: "certificate",
        suggestions: ["Download my certificate", "How do I pass the final exam?", "Talk to a human"],
        toolsUsed,
        context: { ...nextContext, lastIntent: "certificate" },
      };
    }
    if (/(enrol|course|paid|access|locked)/i.test(lower) && !reference) {
      const result = await checkEnrollment(toolContext);
      toolsUsed.push("check_enrollment");
      const base = await toolReply(result);
      return {
        reply: `${base} If a payment shows as confirmed but a course is still locked, ask me to check the transaction reference and I'll verify it against the payment record.`,
        intent: "enrollment_status",
        suggestions: ["Check my latest payment", "Continue learning", "Talk to a human"],
        toolsUsed,
        context: { ...nextContext, lastIntent: "enrollment_status" },
      };
    }
    const result = await checkPaymentStatus(toolContext, {});
    toolsUsed.push("check_payment_status");
    return {
      reply: `${await toolReply(result)} I can look up a specific reference if you have one.`,
      intent: "payment",
      suggestions: ["Check a payment reference", "How do refunds work?", "Talk to a human"],
      toolsUsed,
      context: { ...nextContext, lastIntent: "payment" },
    };
  }

  if (REGEX.discount.test(lower)) {
    const result = await getActiveDiscounts();
    toolsUsed.push("get_active_discounts");
    const rows = (result.data as { code: string; discount: string; appliesTo: string; expires: string }[]) || [];
    return {
      reply: rows.length
        ? `These public codes are active right now: ${rows.map((row) => `${row.code} for ${row.discount}${row.appliesTo === "All programmes" ? " on any programme" : ` on ${row.appliesTo}`}`).join("; ")}. Enter the code in the discount field on the course page before checkout. Codes are validated on the server, and expired or fully used codes will be rejected.`
        : "There are no public discount codes active at the moment. Any code shared by the academy will be validated on the course page at checkout; please don't use codes from unofficial sources.",
      intent: "discount",
      suggestions: ["How much is the solar course?", "How do I enrol?", "Talk to a human"],
      toolsUsed,
      context: { ...nextContext, lastIntent: "discount" },
    };
  }

  if (REGEX.compare.test(lower) && matchedCourse) {
    const others = courses.filter((c) => c.id !== matchedCourse.id).slice(0, 3);
    return {
      reply: `Here's the practical difference. ${courseSummary(matchedCourse)}. ${others.map(courseSummary).join("; ")}. Choose based on the work you want to do: solar for power systems, CCTV for surveillance, electrical for building wiring, networking for connectivity, and access control for entry systems. Tell me your goal and I'll narrow it down.`,
      intent: "comparison",
      suggestions: ["I want to install solar systems", "I want to work in security", "Which is best for beginners?"],
      toolsUsed,
      context: { ...nextContext, lastIntent: "comparison", lastCourseId: matchedCourse.id, lastCourseTitle: matchedCourse.title },
    };
  }

  if (REGEX.recommend.test(lower)) {
    const hint = CATEGORY_HINTS.find((c) => c.words.test(lower));
    const categoryCourses = hint ? courses.filter((c) => c.category.toLowerCase().includes(hint.label.split(" ")[0].toLowerCase())) : [];
    const picks = (categoryCourses.length ? categoryCourses : courses).slice(0, 2);
    const goal = hint ? `for ${hint.label.toLowerCase()}` : "based on the current catalogue";
    return {
      reply: picks.length
        ? `For a practical start ${goal}, I'd look at ${picks.map((c) => `${c.title} at ${price(c.priceKobo)}`).join(" and ")}. Both are hands-on and include assessments. Tell me whether you want employment, freelance work or your own business, and I'll recommend one.`
        : "I can recommend a programme once the catalogue is published. In the meantime, tell me the kind of work you want to do — solar, security, electrical, networking or access control.",
      intent: "recommendation",
      suggestions: hint ? [`Tell me about ${hint.label}`, "How do I enrol?", "Compare the options"] : ["Solar installation", "CCTV installation", "Networking and fiber"],
      toolsUsed,
      context: { ...nextContext, lastIntent: "recommendation", lastCourseId: picks[0]?.id, lastCourseTitle: picks[0]?.title },
    };
  }

  if (REGEX.price.test(lower) || (isFollowUp && context.lastCourseId)) {
    if (matchedCourse) {
      const details = await getCourseDetails({ slug: matchedCourse.slug });
      toolsUsed.push("get_course_details");
      const data = details.data as Record<string, unknown> | undefined;
      const compare = data?.compareAtKobo as number | undefined;
      const priceLine = matchedCourse.priceKobo === 0 ? "it is free to enrol" : `it costs ${price(matchedCourse.priceKobo)}${compare && compare > matchedCourse.priceKobo ? ` (normally ${formatNaira(compare)})` : ""}`;
      const durationNote = REGEX.duration.test(lower) ? ` It runs for ${matchedCourse.duration}.` : "";
      return {
        reply: `${matchedCourse.title}: ${priceLine}.${durationNote} That is a one-time payment with lifetime access to the published lessons, PDF guides, assessments and updates. Enrolment is completed on the website through Paystack, and access unlocks only after the payment is verified on our server.`,
        intent: "pricing",
        suggestions: ["What does it include?", "How do I enrol?", "Do you have a discount code?"],
        toolsUsed,
        context: { ...nextContext, lastIntent: "pricing", lastCourseId: matchedCourse.id, lastCourseTitle: matchedCourse.title },
      };
    }
    return {
      reply: `Current programmes are ${courses.map((c) => `${c.title} at ${price(c.priceKobo)}`).join("; ")}. Tell me which one interests you and I'll give you the full details, including duration and requirements.`,
      intent: "pricing",
      suggestions: ["Solar course details", "CCTV course details", "How do I get a discount?"],
      toolsUsed,
      context: { ...nextContext, lastIntent: "pricing" },
    };
  }

  if (REGEX.courseFocus.test(lower) || REGEX.outcomes.test(lower) || REGEX.duration.test(lower) || REGEX.requirements.test(lower) || isFollowUp) {
    const course = matchedCourse;
    if (course) {
      const details = await getCourseDetails({ slug: course.slug });
      toolsUsed.push("get_course_details");
      const data = details.data as Record<string, unknown> | undefined;
      const outcomes = (data?.outcomes as string[]) || [];
      const requirements = (data?.requirements as string[]) || [];
      const modules = (data?.modules as { title: string; lessons: number }[]) || [];
      const article = /^[aeiou]/i.test(course.level) ? "an" : "a";
      const parts = [
        `${course.title} is ${article} ${course.level.toLowerCase()} programme in ${course.category}, lasting ${course.duration} across ${course.lessons} lessons.`,
        outcomes.length ? `The programme covers ${outcomes.slice(0, 3).map((o) => o.replace(/\.$/, "")).join("; ")}.` : "",
        requirements.length ? `Requirements include ${requirements.slice(0, 3).join(", ")}.` : "No prior experience is required.",
        modules.length ? `The curriculum starts with ${modules.slice(0, 2).map((m) => m.title).join(" and ")}, then moves into practical installation and assessment.` : "",
      ].filter(Boolean);
      return {
        reply: parts.join(" "),
        intent: "course_details",
        suggestions: [`How much is ${course.title.split(" ")[0]}?`, "How do I enrol?", "What certificate do I get?"],
        toolsUsed,
        context: { ...nextContext, lastIntent: "course_details", lastCourseId: course.id, lastCourseTitle: course.title },
      };
    }
  }

  if (REGEX.list.test(lower) || lower.includes("course")) {
    return {
      reply: courses.length
        ? `We currently have ${courses.length} published programmes: ${courses.slice(0, 5).map(courseSummary).join("; ")}. Prices are in Naira and include lifetime access. Which one would you like me to explain?`
        : "The catalogue is being updated at the moment. Please check academy.emyphilltech.com.ng/courses shortly, or I can create a support ticket for you.",
      intent: "course_list",
      suggestions: courses.slice(0, 3).map((c) => `Tell me about ${c.title}`).concat(["How do I enrol?"]),
      toolsUsed,
      context: { ...nextContext, lastIntent: "course_list", lastCourseId: courses[0]?.id, lastCourseTitle: courses[0]?.title },
    };
  }

  if (REGEX.enroll.test(lower)) {
    return {
      reply: `Enrolment takes four steps. Create a free account at academy.emyphilltech.com.ng/register, choose your programme, complete checkout through Paystack, and your course unlocks automatically once the server verifies the payment. The same account works on the Android app.${user ? "" : " If you'd like, I can walk you through registration."} Which programme are you considering?`,
      intent: "enrollment",
      suggestions: ["What payment methods work?", "Can I use a discount code?", "How much is the solar course?"],
      toolsUsed,
      context: { ...nextContext, lastIntent: "enrollment" },
    };
  }

  if (REGEX.refund.test(lower) || (REGEX.payment.test(lower) && !user)) {
    return {
      reply: `Our refund policy allows a request within seven days of purchase if you have completed less than 20% of the course. Approved refunds are returned through Paystack, and the related enrolment and certificate are revoked. To request one, email ${settings["site.email"]} with your transaction reference, or I can create a support ticket and have the team review it.`,
      intent: "refund",
      suggestions: ["Create a support ticket", "How long do refunds take?", "Talk to a human"],
      toolsUsed,
      context: {
        ...nextContext,
        lastIntent: "refund",
        pendingTicket: {
          subject: "Refund enquiry",
          message: `Student asked about a refund: ${clean}`,
          name: user?.name,
          email: user?.email,
        },
        awaitingEmailForTicket: !user,
      },
    };
  }

  if (REGEX.exam.test(lower)) {
    return {
      reply: "Each programme has module quizzes and a final assessment. The final exam unlocks only after every lesson is marked complete, is graded on the server, and requires the pass mark shown on the course — usually 70%. Time limits and attempt limits are enforced by the platform. Passing the exam issues your certificate automatically, provided the course includes certification.",
      intent: "exam",
      suggestions: ["What is the pass mark?", "How many attempts do I get?", "Check my progress"],
      toolsUsed,
      context: { ...nextContext, lastIntent: "exam" },
    };
  }

  if (REGEX.certificate.test(lower)) {
    if (user) {
      const result = await checkCertificate(toolContext, { courseTitle: matchedCourse?.title });
      toolsUsed.push("check_certificate");
      return {
        reply: `${await toolReply(result)} ${summariseEligibility(result)}`.trim(),
        intent: "certificate",
        suggestions: ["Download my certificate", "How do I claim my certificate?", "Talk to a human"],
        toolsUsed,
        context: { ...nextContext, lastIntent: "certificate" },
      };
    }
    return {
      reply: "Certificates are issued after you complete every lesson and pass the final assessment. Each one has a unique serial number and a public verification page, so clients and employers can confirm it. If you already have one, you can verify it at academy.emyphilltech.com.ng/verify.",
      intent: "certificate",
      suggestions: ["How do I pass the final exam?", "Where do I verify a certificate?", "Talk to a human"],
      toolsUsed,
      context: { ...nextContext, lastIntent: "certificate" },
    };
  }

  if (REGEX.android.test(lower)) {
    return {
      reply: "The Brave Skill Academy Android app uses the same account as this website. Download the APK from academy.emyphilltech.com.ng/download, open it, allow installs from your browser if Android asks, and sign in with your existing details. Your purchased courses, progress and certificates sync automatically. The Google Play listing is being prepared; the direct APK is the current install method.",
      intent: "android",
      suggestions: ["How do I install the APK?", "Is it on Google Play?", "Does the app work offline?"],
      toolsUsed,
      context: { ...nextContext, lastIntent: "android" },
    };
  }

  if (REGEX.account.test(lower)) {
    return {
      reply: "For sign-in problems, use the “Forgot password” link on the login page and we'll email you a secure reset link valid for 60 minutes. If you don't receive it, check spam or ask me to create a support ticket. I will never ask for your password, PIN or an OTP.",
      intent: "account",
      suggestions: ["Create a support ticket", "How do I register?", "Talk to a human"],
      toolsUsed,
      context: { ...nextContext, lastIntent: "account" },
    };
  }

  if (REGEX.contact.test(lower)) {
    const info = await getAcademyInfo();
    toolsUsed.push("get_academy_info");
    const data = info.data as Record<string, string>;
    return {
      reply: `You can reach the academy at ${data.email} or ${data.phone}. Support hours are ${data.supportHours}. WhatsApp is also available from the contact page. Would you like me to create a support ticket instead?`,
      intent: "contact",
      suggestions: ["Create a support ticket", "Where are you located?", "What courses do you offer?"],
      toolsUsed,
      context: { ...nextContext, lastIntent: "contact" },
    };
  }

  // Retrieval fallback: answer from approved knowledge, then offer escalation.
  const snippets = await retrieveKnowledge(clean, 4);
  const best = snippets[0];
  if (best && best.score >= 3) {
    const condensed = digestSnippet(best);
    return {
      reply: `${condensed}${snippets.length > 1 ? ` I can also help with ${snippets[1].title.toLowerCase()}.` : ""} Would you like more detail, or should I connect you with a human?`,
      intent: "knowledge",
      suggestions: ["Tell me more", "Create a support ticket", "Browse courses"],
      toolsUsed,
      context: { ...nextContext, lastIntent: "knowledge" },
    };
  }

  if (context.lastCourseId) {
    const last = courses.find((c) => c.id === context.lastCourseId);
    if (last) {
      return {
        reply: `I want to make sure I answer accurately. Are you asking about ${last.title} — its price, duration, requirements or enrolment — or about something else in the academy?`,
        intent: "clarification",
        suggestions: [`${last.title} price`, `${last.title} duration`, "Talk to a human"],
        toolsUsed,
        context: { ...nextContext, lastIntent: "clarification" },
      };
    }
  }

  return {
    reply: "I want to give you an accurate answer rather than guess. Could you tell me whether your question is about a course, enrolment, a payment, your learning progress, a certificate, or the Android app? If it needs a person, I can also create a support ticket for the academy team.",
    intent: "clarification",
    suggestions: ["Course prices", "Enrolment steps", "Payment issue", "Talk to a human"],
    toolsUsed,
    context: { ...nextContext, lastIntent: "clarification" },
  };
}

function summariseEligibility(result: AgentToolResult) {
  const data = result.data as { eligibility?: { course: string; eligible: boolean; certificate: unknown; lessonsComplete: boolean; examRequired: boolean; examPassed: boolean }[] } | undefined;
  if (!data?.eligibility?.length) return "";
  const ready = data.eligibility.filter((item) => item.eligible && !item.certificate);
  if (ready.length) return `You are eligible for a certificate in ${ready.map((r) => r.course).join(", ")}. Open the Certificates tab to download it.`;
  const pending = data.eligibility.find((item) => !item.certificate);
  if (pending) {
    if (!pending.lessonsComplete) return `For ${pending.course}, complete all lessons first; then ${pending.examRequired ? "pass the final assessment" : "your certificate will be issued automatically"}.`;
    if (pending.examRequired && !pending.examPassed) return `For ${pending.course}, all lessons are complete. You now need to pass the final assessment to unlock the certificate.`;
  }
  return "";
}

function digestSnippet(snippet: KnowledgeSnippet) {
  const text = snippet.content
    .replace(/\s+/g, " ")
    .replace(/^#\s*/, "")
    .trim();
  const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.length > 20);
  const selected = sentences.slice(0, 3).join(" ");
  return selected.length > 60 ? selected : text.slice(0, 420);
}
