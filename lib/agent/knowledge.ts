import "server-only";

import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatNaira } from "@/lib/format";

export type KnowledgeSnippet = {
  id: string;
  title: string;
  source: string;
  content: string;
  score: number;
};

const STOP = new Set([
  "the","a","an","and","or","but","is","are","was","were","be","been","being","to","of","in","on","for","with","at","by","from","as","it","its","this","that","these","those","i","me","my","we","our","you","your","he","she","they","them","do","does","did","can","could","would","should","will","what","how","when","where","who","which","please","tell","about","want","need","have","has","had","if","then","than","so","very","just","also","not","no","yes",
]);

export function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9₦\s-]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 2 && !STOP.has(t));
}

/** Lightweight lexical relevance, tuned for short conversational queries. */
function scoreDocument(queryTokens: string[], title: string, content: string) {
  const titleTokens = new Set(tokenize(title));
  const contentTokens = tokenize(content);
  const counts = new Map<string, number>();
  for (const token of contentTokens) counts.set(token, (counts.get(token) || 0) + 1);
  let score = 0;
  for (const token of queryTokens) {
    if (titleTokens.has(token)) score += 4;
    const count = counts.get(token) || 0;
    if (count > 0) score += 1 + Math.min(2, Math.log2(count));
    // Prefix matches catch plurals and inflections (course/courses, pay/payment).
    if (!count && token.length > 4) {
      for (const candidate of counts.keys()) {
        if (candidate.startsWith(token.slice(0, Math.max(4, token.length - 2))) || token.startsWith(candidate.slice(0, Math.max(4, candidate.length - 2)))) {
          score += 0.5;
          break;
        }
      }
    }
  }
  return score;
}

export async function retrieveKnowledge(query: string, limit = 6): Promise<KnowledgeSnippet[]> {
  const tokens = tokenize(query);
  if (!tokens.length) return [];

  const [courses, faqs, docs, announcements, settings] = await Promise.all([
    db.course.findMany({
      where: { isPublished: true },
      include: { category: true },
      orderBy: { publishedAt: "desc" },
    }),
    db.faq.findMany({ where: { isPublished: true } }),
    db.agentKnowledge.findMany({ where: { isPublished: true } }),
    db.announcement.findMany({ where: { isPublished: true }, orderBy: { publishedAt: "desc" }, take: 10 }),
    getSettings(),
  ]);

  const snippets: KnowledgeSnippet[] = [];

  for (const course of courses) {
    const content = [
      `${course.title} is a ${course.level.toLowerCase()} programme in ${course.category.name}.`,
      course.summary,
      course.description.slice(0, 900),
      `Price: ${course.priceKobo === 0 ? "free" : formatNaira(course.priceKobo)}.`,
      `Duration: ${course.durationLabel || "self-paced"}.`,
      course.outcomes ? `Outcomes: ${course.outcomes.split("\n").slice(0, 4).join("; ")}.` : "",
      course.requirements ? `Requirements: ${course.requirements.split("\n").slice(0, 3).join("; ")}.` : "",
    ]
      .filter(Boolean)
      .join(" ");
    snippets.push({
      id: `course-${course.id}`,
      title: course.title,
      source: "Course catalogue",
      content,
      score: scoreDocument(tokens, `${course.title} ${course.category.name}`, `${course.summary} ${course.description}`) + 2,
    });
  }

  for (const faq of faqs) {
    snippets.push({
      id: `faq-${faq.id}`,
      title: faq.question,
      source: "FAQs",
      content: `${faq.question} ${faq.answer}`,
      score: scoreDocument(tokens, faq.question, faq.answer),
    });
  }

  for (const doc of docs) {
    snippets.push({
      id: `doc-${doc.id}`,
      title: doc.title,
      source: `Knowledge · ${doc.category}`,
      content: `# ${doc.title}\n${doc.content}`,
      score: scoreDocument(tokens, `${doc.title} ${doc.category}`, doc.content) + 1,
    });
  }

  for (const announcement of announcements) {
    snippets.push({
      id: `ann-${announcement.id}`,
      title: announcement.title,
      source: "Announcement",
      content: `${announcement.title}: ${announcement.body}`,
      score: scoreDocument(tokens, announcement.title, announcement.body),
    });
  }

  snippets.push({
    id: "contact",
    title: "Contact and support",
    source: "Academy",
    content: `Email ${settings["site.email"]}. Phone ${settings["site.phone"]}. WhatsApp ${settings["site.whatsapp"]}. Support hours Monday to Friday, 9am to 5pm West Africa Time. Address ${settings["site.address"]}.`,
    score: scoreDocument(tokens, "contact support email phone whatsapp", settings["site.email"]),
  });

  return snippets
    .filter((snippet) => snippet.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function snippetsToContext(snippets: KnowledgeSnippet[]) {
  return snippets
    .map((snippet, index) => `[${index + 1}] ${snippet.title} (${snippet.source})\n${snippet.content.slice(0, 1400)}`)
    .join("\n\n");
}

export async function searchCoursesForAgent(input: { query?: string; category?: string; slug?: string; maxPriceKobo?: number }) {
  const where: Record<string, unknown> = { isPublished: true };
  if (input.slug) where.slug = input.slug;
  if (input.category) where.category = { slug: input.category };
  if (input.maxPriceKobo !== undefined) where.priceKobo = { lte: input.maxPriceKobo };

  const courses = await db.course.findMany({
    where,
    include: {
      category: true,
      instructor: { select: { name: true } },
      modules: { select: { _count: { select: { lessons: { where: { isPublished: true } } } } } },
    },
    orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }],
    take: 20,
  });

  const query = (input.query || "").toLowerCase();
  const filtered = query
    ? courses.filter((course) =>
        `${course.title} ${course.summary} ${course.description} ${course.category.name}`.toLowerCase().includes(query),
      )
    : courses;

  return (filtered.length ? filtered : courses).slice(0, 8).map((course) => ({
    id: course.id,
    slug: course.slug,
    title: course.title,
    category: course.category.name,
    level: course.level,
    summary: course.summary,
    priceKobo: course.priceKobo,
    priceLabel: course.priceKobo === 0 ? "Free" : formatNaira(course.priceKobo),
    duration: course.durationLabel || "Self-paced",
    lessons: course.modules.reduce((sum, module) => sum + module._count.lessons, 0),
    instructor: course.instructor?.name || "Brave Skill Faculty",
    certificate: course.certificateEnabled,
    outcomes: course.outcomes.split("\n").filter(Boolean).slice(0, 5),
    requirements: course.requirements.split("\n").filter(Boolean).slice(0, 4),
  }));
}
