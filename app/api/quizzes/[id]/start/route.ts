import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { json, route, fail } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getCourseProgression } from "@/lib/progression";

export const runtime = "nodejs";

function shuffle<T>(items: T[]): T[] {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export const POST = route(async (_req: NextRequest, ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;

  const quiz = await db.quiz.findUnique({
    where: { id },
    include: {
      module: { select: { id: true, position: true, title: true } },
      questions: { orderBy: { position: "asc" } },
    },
  });
  if (!quiz || !quiz.isPublished) return fail("Assessment not found.", 404);
  if (quiz.questions.length === 0) return fail("This assessment has no questions yet.", 409);

  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId: quiz.courseId } },
  });
  if (!enrollment || enrollment.status === "REVOKED") return fail("You are not enrolled in this course.", 403);

  const progression = await getCourseProgression({ courseId: quiz.courseId, userId: user.id });
  const moduleState = quiz.moduleId ? progression.modules.find((module) => module.id === quiz.moduleId) : null;

  if (moduleState?.locked) {
    return fail("Complete the previous module and pass its required quiz before taking this assessment.", 409);
  }
  if (moduleState && !moduleState.lessonsComplete) {
    return fail("Complete every lesson in this module before taking its quiz.", 409);
  }
  if (quiz.type === "EXAM" && !progression.examAvailable) {
    return fail("Complete all lessons and pass every required module quiz before the final assessment.", 409);
  }

  const attemptsUsed = await db.quizAttempt.count({ where: { quizId: quiz.id, userId: user.id } });
  if (quiz.maxAttempts > 0 && attemptsUsed >= quiz.maxAttempts) {
    return fail("You have used all available attempts for this assessment.", 409);
  }

  const inProgress = await db.quizAttempt.findFirst({
    where: { quizId: quiz.id, userId: user.id, submittedAt: null },
    orderBy: { startedAt: "desc" },
  });

  if (inProgress?.questionOrder) {
    const questionOrder = JSON.parse(inProgress.questionOrder) as string[];
    const optionOrder = JSON.parse(inProgress.optionOrder || "[]") as number[][];
    const byId = new Map(quiz.questions.map((question) => [question.id, question]));
    const questions = questionOrder
      .map((questionId, index) => {
        const question = byId.get(questionId);
        if (!question) return null;
        const options = JSON.parse(question.options) as string[];
        const order = optionOrder[index] || options.map((_, i) => i);
        return {
          id: question.id,
          prompt: question.prompt,
          options: order.map((originalIndex) => options[originalIndex]),
          points: question.points,
          position: index,
        };
      })
      .filter(Boolean);

    return json({
      ok: true,
      attempt: {
        id: inProgress.id,
        startedAt: inProgress.startedAt,
        attemptNumber: inProgress.attemptNumber,
        maxScore: inProgress.maxScore,
      },
      quiz: {
        id: quiz.id,
        title: quiz.title,
        type: quiz.type,
        passMark: quiz.passMark,
        timeLimitMinutes: quiz.timeLimitMinutes,
        courseId: quiz.courseId,
        moduleId: quiz.moduleId,
      },
      questions,
      resumed: true,
    });
  }

  const selected = quiz.randomizeQuestions
    ? shuffle(quiz.questions).slice(0, quiz.questionCount > 0 ? Math.min(quiz.questionCount, quiz.questions.length) : quiz.questions.length)
    : quiz.questions.slice(0, quiz.questionCount > 0 ? Math.min(quiz.questionCount, quiz.questions.length) : quiz.questions.length);

  const questionOrder = selected.map((question) => question.id);
  const optionOrder = selected.map((question) => {
    const options = JSON.parse(question.options) as string[];
    const indices = options.map((_, index) => index);
    return quiz.randomizeOptions ? shuffle(indices) : indices;
  });
  const maxScore = selected.reduce((sum, question) => sum + question.points, 0);

  const attempt = await db.quizAttempt.create({
    data: {
      quizId: quiz.id,
      userId: user.id,
      attemptNumber: attemptsUsed + 1,
      maxScore,
      questionOrder: JSON.stringify(questionOrder),
      optionOrder: JSON.stringify(optionOrder),
    },
  });

  return json({
    ok: true,
    attempt: {
      id: attempt.id,
      startedAt: attempt.startedAt,
      attemptNumber: attempt.attemptNumber,
      maxScore,
    },
    quiz: {
      id: quiz.id,
      title: quiz.title,
      type: quiz.type,
      passMark: quiz.passMark,
      timeLimitMinutes: quiz.timeLimitMinutes,
      courseId: quiz.courseId,
      moduleId: quiz.moduleId,
    },
    questions: selected.map((question, index) => {
      const options = JSON.parse(question.options) as string[];
      return {
        id: question.id,
        prompt: question.prompt,
        options: optionOrder[index].map((originalIndex) => options[originalIndex]),
        points: question.points,
        position: index,
      };
    }),
    resumed: false,
  });
});
