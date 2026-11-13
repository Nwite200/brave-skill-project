import "server-only";

import crypto from "crypto";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { formatDate, formatNaira } from "@/lib/format";

/** Standard PDF fonts use WinAnsi, which cannot encode the naira glyph. */
const pdfMoney = (kobo: number) => formatNaira(kobo).replace("₦", "NGN ");

export const certificateHash = (serial: string, userId: string, courseId: string) =>
  crypto
    .createHash("sha256")
    .update(`${serial}:${userId}:${courseId}:${env.authSecret}`)
    .digest("hex");

export function newSerial() {
  const year = new Date().getFullYear();
  const random = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `BS-${year}-${random}`;
}

const INK = rgb(0.035, 0.035, 0.06);
const WHITE = rgb(0.96, 0.97, 1);
const MUTED = rgb(0.62, 0.66, 0.75);
const PURPLE = rgb(0.529, 0.231, 1);
const CYAN = rgb(0.125, 0.851, 0.91);
const EMERALD = rgb(0.063, 0.788, 0.604);

export async function issueCertificate(input: {
  userId: string;
  courseId: string;
  enrollmentId: string;
  examAttemptId?: string | null;
  issuedById?: string;
}) {
  const [user, course, enrollment, existing] = await Promise.all([
    db.user.findUnique({ where: { id: input.userId } }),
    db.course.findUnique({ where: { id: input.courseId } }),
    db.enrollment.findUnique({ where: { id: input.enrollmentId } }),
    db.certificate.findUnique({ where: { enrollmentId: input.enrollmentId } }),
  ]);
  if (!user || !course || !enrollment) throw new Error("Cannot issue certificate: records missing.");
  if (existing) return existing;

  const serial = newSerial();
  const certificate = await db.certificate.create({
    data: {
      serial,
      userId: user.id,
      courseId: course.id,
      enrollmentId: enrollment.id,
      examAttemptId: input.examAttemptId ?? undefined,
      recipientName: user.name,
      courseTitle: course.title,
      hash: certificateHash(serial, user.id, course.id),
    },
  });

  if (enrollment.status === "ACTIVE") {
    await db.enrollment.update({
      where: { id: enrollment.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
  }

  await db.notification.create({
    data: {
      userId: user.id,
      type: "CERTIFICATE",
      title: "Your certificate is ready",
      body: `Congratulations! Your certificate for ${course.title} is ready to download. Serial ${serial}.`,
      link: "/dashboard/certificates",
    },
  });

  return certificate;
}

/** Deep-ink landscape certificate with the Brave Skill neon identity. */
export async function renderCertificatePdf(data: {
  recipientName: string;
  courseTitle: string;
  serial: string;
  issuedAt: Date;
  verificationHash: string;
}) {
  const doc = await PDFDocument.create();
  doc.setTitle(`Brave Skill Certificate — ${data.recipientName}`);
  doc.setAuthor("Brave Skill Skill Acquisition Academy");
  doc.setCreator("Brave Skill");
  doc.setSubject(data.courseTitle);

  const page = doc.addPage([842, 595]);
  const { width, height } = page.getSize();
  const helv = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const oblique = await doc.embedFont(StandardFonts.HelveticaOblique);

  page.drawRectangle({ x: 0, y: 0, width, height, color: INK });

  // ambient glows
  page.drawCircle({ x: 90, y: 520, size: 220, color: PURPLE, opacity: 0.16 });
  page.drawCircle({ x: 780, y: 70, size: 240, color: CYAN, opacity: 0.1 });
  page.drawCircle({ x: 700, y: 560, size: 140, color: EMERALD, opacity: 0.07 });

  // frame
  page.drawRectangle({
    x: 26, y: 26, width: width - 52, height: height - 52,
    borderColor: PURPLE, borderWidth: 0.8, opacity: 0, borderOpacity: 0.55,
  });
  page.drawRectangle({
    x: 34, y: 34, width: width - 68, height: height - 68,
    borderColor: rgb(1, 1, 1), borderWidth: 0.4, opacity: 0, borderOpacity: 0.09,
  });

  // brand mark — geometric B with cap
  page.drawRectangle({ x: 26, y: 26, width: width - 52, height: height - 52, borderColor: PURPLE, borderWidth: 0.8, borderOpacity: 0.55 });
  page.drawRectangle({ x: 34, y: 34, width: width - 68, height: height - 68, borderColor: WHITE, borderWidth: 0.4, borderOpacity: 0.09 });

  page.drawRectangle({ x: 66, y: 476, width: 46, height: 46, color: PURPLE, opacity: 0.14, borderColor: PURPLE, borderWidth: 0.7, borderOpacity: 0.5 });
  page.drawText("B", { x: 66 + 13, y: 476 + 11, size: 24, font: bold, color: WHITE });
  page.drawText("BRAVE SKILL", { x: 126, y: 501, size: 13, font: bold, color: WHITE });
  page.drawText("SKILL ACQUISITION ACADEMY", { x: 126, y: 487, size: 6.5, font: helv, color: CYAN });

  page.drawText("CERTIFICATE OF COMPLETION", {
    x: (width - bold.widthOfTextAtSize("CERTIFICATE OF COMPLETION", 10)) / 2,
    y: 448, size: 10, font: bold, color: CYAN,
  });

  page.drawText("This certifies that", {
    x: (width - helv.widthOfTextAtSize("This certifies that", 12)) / 2,
    y: 400, size: 12, font: helv, color: MUTED,
  });

  const nameSize = data.recipientName.length > 28 ? 30 : 38;
  page.drawText(data.recipientName.toUpperCase(), {
    x: (width - bold.widthOfTextAtSize(data.recipientName.toUpperCase(), nameSize)) / 2,
    y: 344, size: nameSize, font: bold, color: WHITE,
  });
  page.drawLine({ start: { x: 220, y: 330 }, end: { x: 622, y: 330 }, thickness: 0.8, color: PURPLE, opacity: 0.6 });

  page.drawText("has successfully completed the programme", {
    x: (width - helv.widthOfTextAtSize("has successfully completed the programme", 11)) / 2,
    y: 304, size: 11, font: helv, color: MUTED,
  });

  const titleText = data.courseTitle;
  const titleSize = titleText.length > 40 ? 18 : 24;
  page.drawText(titleText, {
    x: (width - bold.widthOfTextAtSize(titleText, titleSize)) / 2,
    y: 262, size: titleSize, font: bold, color: rgb(0.85, 0.82, 1),
  });

  page.drawText("LEARN.  PRACTICE.  BUILD.", {
    x: (width - bold.widthOfTextAtSize("LEARN.  PRACTICE.  BUILD.", 8)) / 2,
    y: 208, size: 8, font: bold, color: MUTED, opacity: 0.9,
  });

  // footer details
  page.drawText("ISSUED", { x: 66, y: 150, size: 6.5, font: helv, color: MUTED });
  page.drawText(formatDate(data.issuedAt), { x: 66, y: 136, size: 10, font: bold, color: WHITE });

  page.drawText("CERTIFICATE SERIAL", { x: 66, y: 112, size: 6.5, font: helv, color: MUTED });
  page.drawText(data.serial, { x: 66, y: 98, size: 10, font: bold, color: WHITE });

  // Authorised signature: italic signature line plus printed signatory details.
  page.drawText("Nwabueze Jeremiah", {
    x: width / 2 - 78, y: 112, size: 17, font: oblique, color: rgb(0.96, 0.95, 1), opacity: 0.92,
  });
  page.drawLine({ start: { x: width / 2 - 80, y: 106 }, end: { x: width / 2 + 80, y: 106 }, thickness: 0.6, color: PURPLE, opacity: 0.45 });
  page.drawText("Founder & Academy Director", {
    x: width / 2 - (helv.widthOfTextAtSize("Founder & Academy Director", 6.2)) / 2,
    y: 94, size: 6.2, font: helv, color: MUTED,
  });

  // QR verification — embeds the public registry URL.
  const verifyUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://academy.emyphilltech.com.ng"}/verify?serial=${encodeURIComponent(data.serial)}`;
  const qrPng = await QRCode.toBuffer(verifyUrl, {
    width: 220,
    margin: 1,
    color: { dark: "#050509", light: "#FFFFFF" },
  });
  const qr = await doc.embedPng(qrPng);
  page.drawRectangle({ x: width - 142, y: 58, width: 92, height: 92, color: rgb(1, 1, 1) });
  page.drawImage(qr, { x: width - 138, y: 62, width: 84, height: 84 });
  page.drawText("SCAN TO VERIFY", {
    x: width - 138, y: 152, size: 5.5, font: bold, color: CYAN,
  });

  page.drawText(`Verification hash: ${data.verificationHash.slice(0, 40)}`, {
    x: 66, y: 48, size: 5.4, font: helv, color: MUTED, opacity: 0.8,
  });
  page.drawText("Emyphill-Tech Global Solutions Limited", {
    x: width - 66 - oblique.widthOfTextAtSize("Emyphill-Tech Global Solutions Limited", 7.2),
    y: 48, size: 7.2, font: oblique, color: MUTED,
  });

  return doc.save();
}

export async function renderReceiptPdf(order: {
  reference: string;
  receiptNumber: string | null;
  amountKobo: number;
  discountKobo: number;
  subtotalKobo: number;
  paidAt: Date | null;
  courseTitle: string;
  studentName: string;
  studentEmail: string;
  gateway: string;
}) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const { width, height } = page.getSize();
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const helv = await doc.embedFont(StandardFonts.Helvetica);

  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0.98, 0.98, 1) });
  page.drawRectangle({ x: 0, y: height - 150, width, height: 150, color: INK });
  page.drawCircle({ x: 520, y: 780, size: 150, color: PURPLE, opacity: 0.25 });

  page.drawText("BRAVE SKILL", { x: 48, y: height - 80, size: 20, font: bold, color: WHITE });
  page.drawText("SKILL ACQUISITION ACADEMY", { x: 48, y: height - 98, size: 7, font: helv, color: CYAN });
  page.drawText("PAYMENT RECEIPT", { x: 48, y: height - 128, size: 9, font: bold, color: MUTED });

  const rows: [string, string][] = [
    ["Receipt number", order.receiptNumber || order.reference],
    ["Transaction reference", order.reference],
    ["Student", order.studentName],
    ["Email", order.studentEmail],
    ["Course", order.courseTitle],
    ["Payment method", order.gateway === "PAYSTACK" ? "Paystack" : order.gateway],
    ["Date paid", order.paidAt ? formatDate(order.paidAt, true) : "—"],
  ];
  let y = height - 200;
  for (const [label, value] of rows) {
    page.drawText(label.toUpperCase(), { x: 48, y, size: 7, font: bold, color: rgb(0.45, 0.48, 0.56) });
    page.drawText(value, { x: 48, y: y - 14, size: 10.5, font: helv, color: rgb(0.1, 0.1, 0.16), maxWidth: 500 });
    y -= 44;
  }

  y -= 4;
  page.drawRectangle({ x: 48, y: y - 100, width: width - 96, height: 100, color: rgb(0.945, 0.94, 0.99), borderColor: rgb(0.85, 0.83, 0.95), borderWidth: 0.6 });
  page.drawText("Subtotal", { x: 66, y: y - 30, size: 10, font: helv, color: rgb(0.35, 0.36, 0.45) });
  page.drawText(pdfMoney(order.subtotalKobo), { x: width - 150, y: y - 30, size: 10, font: helv, color: rgb(0.1, 0.1, 0.16) });
  page.drawText("Discount", { x: 66, y: y - 52, size: 10, font: helv, color: rgb(0.35, 0.36, 0.45) });
  page.drawText(`- ${pdfMoney(order.discountKobo)}`, { x: width - 150, y: y - 52, size: 10, font: helv, color: rgb(0.1, 0.6, 0.45) });
  page.drawLine({ start: { x: 66, y: y - 66 }, end: { x: width - 66, y: y - 66 }, thickness: 0.6, color: rgb(0.85, 0.84, 0.92) });
  page.drawText("Total paid", { x: 66, y: y - 88, size: 12, font: bold, color: rgb(0.1, 0.1, 0.16) });
  page.drawText(pdfMoney(order.amountKobo), { x: width - 180, y: y - 88, size: 16, font: bold, color: rgb(0.33, 0.12, 0.75) });

  page.drawText("This receipt is computer generated and valid without a signature.", {
    x: 48, y: 80, size: 8, font: helv, color: rgb(0.5, 0.52, 0.6),
  });
  page.drawText("Brave Skill is operated by Emyphill-Tech Global Solutions Limited.", {
    x: 48, y: 64, size: 8, font: helv, color: rgb(0.5, 0.52, 0.6),
  });

  return doc.save();
}
