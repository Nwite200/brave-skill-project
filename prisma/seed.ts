import "dotenv/config";
import { PrismaClient, type Role } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";
import { AwsClient } from "aws4fetch";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const d1Token = process.env.CLOUDFLARE_D1_TOKEN || "";
const d1AccountId = process.env.CLOUDFLARE_ACCOUNT_ID || "";
const d1DatabaseId = process.env.CLOUDFLARE_DATABASE_ID || "";
if (!d1Token || !d1AccountId || !d1DatabaseId) {
  throw new Error("Set CLOUDFLARE_D1_TOKEN, CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_DATABASE_ID before seeding.");
}
const db = new PrismaClient({ adapter: new PrismaD1({
  CLOUDFLARE_D1_TOKEN: d1Token,
  CLOUDFLARE_ACCOUNT_ID: d1AccountId,
  CLOUDFLARE_DATABASE_ID: d1DatabaseId,
}) });

const r2AccountId = process.env.R2_ACCOUNT_ID || "";
const r2Bucket = process.env.R2_BUCKET || "brave-skill-media";
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID || "";
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "";
if (!r2AccountId || !r2AccessKeyId || !r2SecretAccessKey) {
  throw new Error("Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY before seeding media.");
}
const r2Client = new AwsClient({ accessKeyId: r2AccessKeyId, secretAccessKey: r2SecretAccessKey, service: "s3", region: "auto" });
async function uploadSeedObject(key: string, body: Uint8Array, contentType: string) {
  const encoded = key.split("/").map((part) => encodeURIComponent(part)).join("/");
  const url = `https://${r2AccountId}.r2.cloudflarestorage.com/${r2Bucket}/${encoded}`;
  const response = await r2Client.fetch(url, { method: "PUT", headers: { "Content-Type": contentType }, body: body as unknown as BodyInit });
  if (!response.ok) throw new Error(`R2 seed upload failed (${response.status}): ${await response.text()}`);
}
const ROOT = process.cwd();
const STORAGE = path.resolve(ROOT, process.env.STORAGE_DIR || "./storage");
const SEED = path.join(STORAGE, "seed");

const demoPassword = "BraveSkill#2026";

const money = (naira: number) => Math.round(naira * 100);

async function copyVideo(file: string) {
  const key = `videos/${crypto.randomUUID()}.mp4`;
  const buffer = await fs.readFile(path.join(SEED, file));
  await uploadSeedObject(key, buffer, "video/mp4");
  return db.asset.create({
    data: {
      kind: "VIDEO",
      storageKey: key,
      originalName: file,
      mimeType: "video/mp4",
      sizeBytes: buffer.length,
    },
  });
}

async function createGuidePdf(title: string, bullets: string[]) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const ink = rgb(0.04, 0.04, 0.07);
  page.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: rgb(0.98, 0.98, 1) });
  page.drawRectangle({ x: 0, y: 702, width: 595, height: 140, color: ink });
  page.drawCircle({ x: 520, y: 800, size: 130, color: rgb(0.53, 0.23, 1), opacity: 0.3 });
  page.drawText("BRAVE SKILL", { x: 44, y: 785, size: 18, font: bold, color: rgb(1, 1, 1) });
  page.drawText("SKILL ACQUISITION ACADEMY", { x: 44, y: 768, size: 6.5, font, color: rgb(0.125, 0.851, 0.91) });
  page.drawText("FIELD GUIDE", { x: 44, y: 732, size: 9, font: bold, color: rgb(0.6, 0.62, 0.72) });
  page.drawText(title, { x: 44, y: 655, size: 20, font: bold, color: ink, maxWidth: 500, lineHeight: 25 });
  page.drawLine({ start: { x: 44, y: 625 }, end: { x: 550, y: 625 }, thickness: 1, color: rgb(0.53, 0.23, 1), opacity: 0.5 });

  let y = 585;
  page.drawText("Practical checklist", { x: 44, y, size: 12, font: bold, color: ink });
  y -= 26;
  for (const bullet of bullets) {
    page.drawText("•", { x: 44, y, size: 11, font: bold, color: rgb(0.53, 0.23, 1) });
    page.drawText(bullet, { x: 58, y, size: 10, font, color: rgb(0.2, 0.22, 0.3), maxWidth: 490, lineHeight: 14 });
    y -= 34;
  }
  page.drawText("Learn. Practice. Build.", { x: 44, y: 54, size: 8, font: bold, color: rgb(0.53, 0.23, 1) });
  page.drawText("© Emyphill-Tech Global Solutions Limited", { x: 350, y: 54, size: 7, font, color: rgb(0.55, 0.57, 0.65) });

  const bytes = await doc.save();
  const key = `pdfs/${crypto.randomUUID()}.pdf`;
  await uploadSeedObject(key, bytes, "application/pdf");
  return db.asset.create({
    data: {
      kind: "PDF",
      storageKey: key,
      originalName: `${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-field-guide.pdf`,
      mimeType: "application/pdf",
      sizeBytes: bytes.length,
    },
  });
}

type LessonSeed = {
  title: string;
  type?: "VIDEO" | "PDF" | "TEXT";
  minutes?: number;
  preview?: boolean;
  content?: string;
  pdf?: boolean;
};

type CourseSeed = {
  title: string;
  slug: string;
  subtitle: string;
  summary: string;
  description: string;
  outcomes: string[];
  requirements: string[];
  categorySlug: string;
  instructorEmail: string;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  price: number;
  compareAt: number;
  duration: string;
  featured: boolean;
  guideBullets: string[];
  modules: { title: string; lessons: LessonSeed[] }[];
  quiz: { title: string; questions: { prompt: string; options: string[]; correct: number; explanation: string }[] };
  exam: { title: string; questions: { prompt: string; options: string[]; correct: number; explanation: string }[] };
};

const coursesSeed: CourseSeed[] = [
  {
    title: "Solar Installation and Inverter Technology",
    slug: "solar-installation-inverter-technology",
    subtitle: "Design, install and maintain reliable solar power systems",
    summary:
      "Go from load audit to commissioning: size arrays and batteries, wire inverters safely, and maintain systems that keep the lights on.",
    description:
      "Solar is no longer a luxury in Nigeria — it is infrastructure. This programme takes you from the fundamentals of PV generation through to designing a complete hybrid system for a home or small business.\n\nYou will learn how to conduct a proper load audit, size panels, batteries and inverters, select protective devices, terminate DC and AC circuits correctly, and commission a system that is safe, efficient and reliable.\n\nThe programme is built around real installations. Every module ends with a field task you can complete on a practice board, a friend's house or a client site. By the end, you will have the confidence to quote, install and maintain systems independently.\n\nWho it is for: aspiring solar technicians, electricians expanding their services, facility managers and entrepreneurs entering the renewable energy market.",
    outcomes: [
      "Conduct a household or business load audit and estimate daily energy demand",
      "Size PV arrays, battery banks and inverters with correct safety margins",
      "Wire DC strings, battery banks and AC distribution safely",
      "Select and install breakers, fuses, surge protection and earthing",
      "Commission, test and troubleshoot hybrid inverter systems",
      "Prepare professional quotes and maintenance schedules for clients",
    ],
    requirements: [
      "No prior solar experience required — basic electrical awareness helps",
      "A phone or laptop for video lessons and PDF guides",
      "Access to a practice multimeter and basic hand tools is recommended",
    ],
    categorySlug: "solar",
    instructorEmail: "instructor@braveskill.ng",
    level: "BEGINNER",
    price: 85000,
    compareAt: 120000,
    duration: "6 weeks · 12 hours of video",
    featured: true,
    guideBullets: [
      "Record every appliance, its wattage and daily run time before sizing anything.",
      "Apply a 1.25 safety factor to continuous loads and a 1.3 depth-of-discharge margin for lithium banks.",
      "Keep DC cable runs short; voltage drop above 3% wastes power and heats terminals.",
      "Install a DC breaker and fuse on every string before combining.",
      "Earth the array frame and inverter chassis to a dedicated earth electrode.",
      "Commission with a load test, then label every isolator and breaker.",
    ],
    modules: [
      {
        title: "Foundations of Solar Power",
        lessons: [
          { title: "How solar energy becomes household power", minutes: 14, preview: true },
          { title: "PV panels, cells and the effect of shading", minutes: 18 },
          { title: "Inverters, charge controllers and system types", minutes: 22 },
          { title: "Safety on a solar site", minutes: 12 },
        ],
      },
      {
        title: "Load Audit and System Design",
        lessons: [
          { title: "Reading appliances and building a load schedule", minutes: 20 },
          { title: "Sizing the battery bank for real autonomy", minutes: 24 },
          { title: "Array sizing, tilt and cable voltage drop", minutes: 26 },
          { title: "System design worksheet", type: "PDF", minutes: 15, pdf: true },
        ],
      },
      {
        title: "Batteries and Storage",
        lessons: [
          { title: "Lead-acid vs lithium: chemistry and trade-offs", minutes: 19 },
          { title: "Series and parallel battery wiring", minutes: 17 },
          { title: "BMS, balancing and safe charging", minutes: 21 },
        ],
      },
      {
        title: "Inverter Installation and Wiring",
        lessons: [
          { title: "Mounting, ventilation and clearances", minutes: 13 },
          { title: "DC protection: breakers, fuses and surge arrestors", minutes: 23 },
          { title: "AC distribution and changeover wiring", minutes: 25 },
          { title: "Earthing and bonding explained", minutes: 18, preview: true },
        ],
      },
      {
        title: "Commissioning and Maintenance",
        lessons: [
          { title: "Pre-commissioning checks and first power-up", minutes: 22 },
          { title: "Testing, monitoring and fault finding", minutes: 27 },
          { title: "Maintenance schedules and client handover", minutes: 15 },
        ],
      },
      {
        title: "The Business of Solar",
        lessons: [
          { title: "Quoting, margins and material take-off", type: "TEXT", minutes: 12, content: "A professional quote is more than a price. It should show the system size, battery autonomy, major components and warranty terms, installation scope, and what is excluded.\n\nPrice for your time and expertise, not only hardware. A typical residential installation should include a site survey, design, installation labour, commissioning, and a first maintenance visit.\n\nAlways document the existing wiring and obtain client sign-off at handover." },
          { title: "Client handover and service contracts", minutes: 14 },
        ],
      },
    ],
    quiz: {
      title: "Solar foundations quiz",
      questions: [
        { prompt: "What is the first step when designing a solar system?", options: ["Buy an inverter", "Conduct a load audit", "Install panels", "Choose a battery brand"], correct: 1, explanation: "Sizing starts with demand: a load audit determines daily energy use." },
        { prompt: "A 24V battery bank made from 12V batteries requires how many batteries in series?", options: ["1", "2", "4", "6"], correct: 1, explanation: "Two 12V batteries in series give 24V; capacity stays the same." },
        { prompt: "Why is shading a serious problem for PV strings?", options: ["It increases voltage", "It reduces the whole string output", "It improves efficiency", "It has no effect"], correct: 1, explanation: "Cells in series are limited by the weakest cell, so shading reduces string output disproportionately." },
        { prompt: "What does a charge controller do?", options: ["Converts AC to DC", "Regulates charging to protect the battery", "Increases panel wattage", "Cools the inverter"], correct: 1, explanation: "It controls charging voltage and current to protect the battery." },
      ],
    },
    exam: {
      title: "Solar installation final assessment",
      questions: [
        { prompt: "A home uses 3.6 kWh per day. With 4 peak sun hours, the minimum array size before losses is approximately:", options: ["600W", "900W", "1,800W", "3,600W"], correct: 1, explanation: "3,600Wh ÷ 4h = 900W before derating." },
        { prompt: "Which protective device must be installed on the DC side of a string?", options: ["RCD only", "DC-rated breaker or fuse", "AC surge arrestor", "Earth leakage relay"], correct: 1, explanation: "DC arcs do not self-extinguish; use DC-rated protection." },
        { prompt: "The purpose of earthing the array frame is to:", options: ["Improve panel efficiency", "Prevent electric shock and dissipate surges", "Increase battery life", "Reduce cable size"], correct: 1, explanation: "Bonding and earthing protect people and equipment." },
        { prompt: "A 5kVA inverter is best described as approximately:", options: ["5,000W continuous (subject to rating)", "500W", "50kW", "5W"], correct: 0, explanation: "VA approximates watts at unity power factor; check the datasheet for continuous rating." },
        { prompt: "Which battery chemistry generally tolerates deeper discharge?", options: ["Flooded lead-acid", "AGM", "Lithium iron phosphate", "Gel"], correct: 2, explanation: "LiFePO4 typically allows 80–90% depth of discharge." },
        { prompt: "Voltage drop on DC cables should generally be kept below:", options: ["10%", "3%", "25%", "50%"], correct: 1, explanation: "Around 3% keeps losses and heating under control." },
        { prompt: "Before first power-up you should:", options: ["Connect all loads", "Verify polarity, torque and insulation", "Disable all breakers permanently", "Remove the earth"], correct: 1, explanation: "Pre-commissioning checks prevent damage and injury." },
        { prompt: "A hybrid inverter differs from a grid-tie inverter because it:", options: ["Cannot use solar", "Supports battery storage and backup", "Only works at night", "Requires no earthing"], correct: 1, explanation: "Hybrid inverters manage solar, battery and grid together." },
      ],
    },
  },
  {
    title: "CCTV Installation and Configuration",
    slug: "cctv-installation-configuration",
    subtitle: "Design and deploy surveillance systems clients trust",
    summary:
      "Site surveys, camera selection, cabling, NVR configuration and remote viewing — the complete CCTV workflow.",
    description:
      "A surveillance system is only as good as its design and installation. This programme covers the full workflow: understanding what the client needs to see, choosing the right cameras and lenses, running cable correctly, configuring the recorder, and securing remote access.\n\nYou will work through analogue and IP systems, learn how to calculate storage, configure motion detection, and troubleshoot the problems that cause callbacks — no video, poor night images, dropped connections and inaccessible footage.\n\nThe final modules cover professional handover, client training and maintenance contracts.",
    outcomes: [
      "Survey a site and produce a camera placement plan",
      "Select camera types, lenses and resolutions for each location",
      "Terminate and test coax and network cabling",
      "Configure NVRs, recording schedules and storage",
      "Set up secure remote viewing on mobile devices",
      "Diagnose common faults and maintain systems",
    ],
    requirements: [
      "Basic computer confidence",
      "A phone or laptop for lessons",
      "Access to a practice camera or NVR is helpful but not required",
    ],
    categorySlug: "cctv",
    instructorEmail: "instructor2@braveskill.ng",
    level: "BEGINNER",
    price: 65000,
    compareAt: 90000,
    duration: "5 weeks · 9 hours of video",
    featured: true,
    guideBullets: [
      "Always survey at the same time of day as the coverage requirement; sunlight changes everything.",
      "Avoid pointing cameras directly at the sun or strong IR sources.",
      "Use baluns correctly and keep coax runs within specification.",
      "For IP systems, separate the camera VLAN from the client network where possible.",
      "Calculate storage from bitrate, not from megapixels alone.",
      "Test remote access from outside the client network before handover.",
    ],
    modules: [
      {
        title: "Surveillance Fundamentals",
        lessons: [
          { title: "How CCTV systems work", minutes: 12, preview: true },
          { title: "Analogue, HD and IP compared", minutes: 16 },
          { title: "Camera types and lens selection", minutes: 18 },
        ],
      },
      {
        title: "Site Survey and Design",
        lessons: [
          { title: "Questions to ask before quoting", minutes: 14 },
          { title: "Camera placement and coverage planning", minutes: 21 },
          { title: "Storage and bandwidth calculations", type: "PDF", minutes: 14, pdf: true },
        ],
      },
      {
        title: "Cabling and Installation",
        lessons: [
          { title: "Coax, baluns and power injection", minutes: 19 },
          { title: "Network cabling and PoE", minutes: 22 },
          { title: "Weatherproofing and cable management", minutes: 13 },
        ],
      },
      {
        title: "Recorder Configuration",
        lessons: [
          { title: "NVR and DVR setup", minutes: 24 },
          { title: "Recording schedules and motion detection", minutes: 18 },
          { title: "Remote viewing done securely", minutes: 20 },
        ],
      },
      {
        title: "Troubleshooting and Handover",
        lessons: [
          { title: "Diagnosing no-video and night-vision faults", minutes: 17 },
          { title: "Client handover and maintenance", minutes: 12 },
        ],
      },
    ],
    quiz: {
      title: "CCTV essentials quiz",
      questions: [
        { prompt: "Which camera type is best for identifying a face at a gate?", options: ["Wide-angle dome", "Varifocal bullet with IR", "Panoramic fisheye", "Hidden pinhole"], correct: 1, explanation: "A varifocal lens lets you frame the face tightly at the gate." },
        { prompt: "PoE stands for:", options: ["Power over Ethernet", "Port of Entry", "Progressive Output Encoding", "Power on Event"], correct: 0, explanation: "Power over Ethernet carries data and power on one cable." },
        { prompt: "Storage requirements depend most on:", options: ["Camera colour", "Bitrate, hours and retention days", "Monitor size", "Cable length"], correct: 1, explanation: "Storage = bitrate × time × cameras, with overhead." },
        { prompt: "A camera shows a good daytime image but dark night image. First check:", options: ["The monitor", "IR illuminator and power", "The NVR password", "The client's Wi-Fi"], correct: 1, explanation: "IR failure or insufficient power is the usual cause." },
      ],
    },
    exam: {
      title: "CCTV installation final assessment",
      questions: [
        { prompt: "The first step in any CCTV project is:", options: ["Buy cameras", "Site survey and requirement capture", "Mount the NVR", "Configure the app"], correct: 1, explanation: "Design follows the client's coverage requirements." },
        { prompt: "Which cable is standard for analogue HD cameras?", options: ["Cat 6", "RG59 coax with power", "HDMI", "USB"], correct: 1, explanation: "RG59 coax with a power pair is standard for HD analogue." },
        { prompt: "To identify a person at 20m, you should prioritise:", options: ["More cameras", "Pixels on target (lens and resolution)", "Larger monitor", "Louder alarm"], correct: 1, explanation: "Identification depends on pixel density on the subject." },
        { prompt: "Which practice improves cybersecurity of remote viewing?", options: ["Port forwarding to all cameras", "Strong unique passwords and encrypted P2P/app access", "Default admin password", "Disabling logs"], correct: 1, explanation: "Avoid exposing devices directly; use secure apps and strong credentials." },
        { prompt: "Motion detection at night is often triggered by:", options: ["Rain and insects", "Colour settings", "Lens brand", "Cable length"], correct: 0, explanation: "Environmental movement and IR reflections cause false triggers." },
        { prompt: "A PoE camera does not power on. First check:", options: ["Replace the NVR", "Switch port power budget and cable", "Format the HDD", "Change the app"], correct: 1, explanation: "Verify PoE budget, port status and cable integrity." },
      ],
    },
  },
  {
    title: "Electrical Installation and Maintenance",
    slug: "electrical-installation-maintenance",
    subtitle: "Safe, compliant wiring for homes and small commercial sites",
    summary:
      "Master domestic and light commercial electrical work: circuits, distribution boards, protection, testing and fault finding.",
    description:
      "This programme builds the practical foundation every technician needs. You will learn how electricity behaves in a building, how to design and wire circuits, how to select protective devices, and how to test an installation before energising it.\n\nThe emphasis is safety and standards. You will work through earthing systems, consumer units, cable sizing, RCD protection, and the systematic process for diagnosing faults without guesswork.\n\nWhether you are starting out or formalising experience you already have, the programme gives you a repeatable method and the documentation habits that protect you and your clients.",
    outcomes: [
      "Design domestic lighting, socket and dedicated circuits",
      "Size cables and protective devices correctly",
      "Wire and label a distribution board",
      "Test insulation resistance, continuity and RCD operation",
      "Diagnose short circuits, earth faults and overloads",
      "Document work and hand over safely",
    ],
    requirements: [
      "Basic hand tools recommended",
      "A phone or laptop for lessons",
      "Willingness to follow strict safety procedures",
    ],
    categorySlug: "electrical",
    instructorEmail: "instructor2@braveskill.ng",
    level: "BEGINNER",
    price: 70000,
    compareAt: 95000,
    duration: "5 weeks · 10 hours of video",
    featured: true,
    guideBullets: [
      "Isolate, lock off and prove dead before touching conductors.",
      "Size the protective device to the cable, not the appliance.",
      "Keep earth and neutral separate except at the supply origin.",
      "Use RCD protection for socket circuits and wet areas.",
      "Label every circuit at the board — future you will be grateful.",
      "Record test results and give the client a handover pack.",
    ],
    modules: [
      {
        title: "Electrical Principles",
        lessons: [
          { title: "Voltage, current, resistance and power", minutes: 18, preview: true },
          { title: "AC circuits and power factor basics", minutes: 16 },
          { title: "Safe isolation procedure", minutes: 13 },
        ],
      },
      {
        title: "Circuits and Cable Selection",
        lessons: [
          { title: "Lighting and socket circuit design", minutes: 22 },
          { title: "Cable current-carrying capacity", minutes: 20 },
          { title: "Cable sizing worksheet", type: "PDF", minutes: 12, pdf: true },
        ],
      },
      {
        title: "Distribution Boards and Protection",
        lessons: [
          { title: "MCBs, RCBOs and RCDs", minutes: 21 },
          { title: "Wiring and labelling a consumer unit", minutes: 26 },
          { title: "Earthing and bonding", minutes: 19 },
        ],
      },
      {
        title: "Testing and Inspection",
        lessons: [
          { title: "Continuity and insulation resistance", minutes: 23 },
          { title: "RCD trip tests and polarity", minutes: 18 },
          { title: "Commissioning checklist", minutes: 14 },
        ],
      },
      {
        title: "Fault Finding and Maintenance",
        lessons: [
          { title: "Systematic fault diagnosis", minutes: 24 },
          { title: "Overheating, arcing and nuisance trips", minutes: 19 },
          { title: "Preventive maintenance plans", type: "TEXT", minutes: 10, content: "Most electrical failures are predictable. Loose terminations heat up, insulation degrades, and overloaded circuits trip more often over time.\n\nA maintenance visit should include thermal checks on distribution boards where possible, torque checks on accessible terminations, RCD testing, and a visual inspection of cable routes and enclosures." },
        ],
      },
    ],
    quiz: {
      title: "Electrical safety quiz",
      questions: [
        { prompt: "What is the first step of safe isolation?", options: ["Remove the fuse", "Identify and isolate the supply", "Test with a screwdriver", "Ask the client"], correct: 1, explanation: "Identify the correct circuit and isolate it at the source." },
        { prompt: "An RCD primarily protects against:", options: ["Overload", "Earth leakage and electric shock", "Voltage surges", "Short circuits only"], correct: 1, explanation: "RCDs detect residual current caused by earth leakage." },
        { prompt: "A 2.5mm² cable on a 20A MCB is generally used for:", options: ["Lighting", "Socket ring/radial circuits", "Main earth", "Doorbell"], correct: 1, explanation: "2.5mm² is common for socket circuits, subject to installation method." },
        { prompt: "Insulation resistance is measured with:", options: ["A multimeter on volts", "An insulation tester at 500V DC", "A clamp meter", "A plug tester"], correct: 1, explanation: "Use a dedicated insulation resistance tester." },
      ],
    },
    exam: {
      title: "Electrical installation final assessment",
      questions: [
        { prompt: "Which document proves an installation was tested?", options: ["Invoice", "Electrical installation certificate / test schedule", "Receipt", "Warranty card"], correct: 1, explanation: "Test results and certificates document compliance." },
        { prompt: "Neutral and earth should be connected together:", options: ["At every socket", "Only at the supply origin as per the earthing system", "Never", "At the last light"], correct: 1, explanation: "Bonding depends on the earthing arrangement; separate downstream." },
        { prompt: "A circuit keeps tripping after rain. Most likely cause:", options: ["Water ingress into an outdoor fitting", "Wrong bulb", "Too many lamps", "Loose switch plate"], correct: 0, explanation: "Moisture causes earth leakage; inspect outdoor connections." },
        { prompt: "Cable size is selected based on:", options: ["Colour", "Current, installation method, voltage drop and protection", "Length only", "Appliance brand"], correct: 1, explanation: "All four factors must be considered together." },
        { prompt: "Before energising a new circuit you should:", options: ["Connect all appliances", "Perform continuity, insulation and polarity tests", "Increase the breaker size", "Remove the earth"], correct: 1, explanation: "Test before power to catch errors safely." },
        { prompt: "The main function of a consumer unit is to:", options: ["Store energy", "Distribute and protect circuits", "Convert AC to DC", "Stabilise voltage"], correct: 1, explanation: "It distributes supply and houses protective devices." },
      ],
    },
  },
  {
    title: "Networking and Fiber Optics",
    slug: "networking-fiber-optics",
    subtitle: "Build reliable networks and terminate fibre like a professional",
    summary:
      "Structured cabling, switching, IP addressing, fibre splicing and testing for homes, offices and estates.",
    description:
      "Connectivity is the backbone of every modern installation. This programme covers structured cabling, network design, IP addressing, switching, Wi-Fi planning and fibre optic termination and testing.\n\nYou will learn why networks fail — bad terminations, loops, poor addressing, weak Wi-Fi design — and how to build and test a network that performs. The fibre modules include hands-on splicing, connectorisation, OTDR interpretation and loss budgets.\n\nThe programme suits IT support staff, CCTV installers expanding into networking, and technicians serving estates and SMEs.",
    outcomes: [
      "Design structured cabling for a building",
      "Terminate and test Cat6 and fibre connections",
      "Configure IP addressing, DHCP and VLANs",
      "Plan Wi-Fi coverage and channel allocation",
      "Splice fibre and interpret loss measurements",
      "Document and troubleshoot networks methodically",
    ],
    requirements: [
      "Basic computer literacy",
      "A laptop is strongly recommended for configuration lessons",
      "No prior networking certification required",
    ],
    categorySlug: "networking",
    instructorEmail: "instructor3@braveskill.ng",
    level: "INTERMEDIATE",
    price: 90000,
    compareAt: 130000,
    duration: "6 weeks · 11 hours of video",
    featured: true,
    guideBullets: [
      "Label both ends of every cable before you terminate it.",
      "Keep data cables away from power cables; cross at 90° where unavoidable.",
      "Test every link and record the result — do not trust a link light.",
      "Document IP ranges, VLANs and switch ports from day one.",
      "For fibre, clean connectors before every mating.",
      "Measure loss in both directions and compare against the budget.",
    ],
    modules: [
      {
        title: "Networking Foundations",
        lessons: [
          { title: "How data moves across a network", minutes: 16, preview: true },
          { title: "OSI model in practical terms", minutes: 18 },
          { title: "IP addresses, subnets and DHCP", minutes: 24 },
        ],
      },
      {
        title: "Structured Cabling",
        lessons: [
          { title: "Cat6 termination and patch panels", minutes: 26 },
          { title: "Cable routes, conduits and labelling", minutes: 15 },
          { title: "Testing and certification", type: "PDF", minutes: 14, pdf: true },
        ],
      },
      {
        title: "Switching and Wi-Fi",
        lessons: [
          { title: "Switches, VLANs and trunking", minutes: 22 },
          { title: "Wi-Fi coverage and channel planning", minutes: 20 },
          { title: "Access points, PoE and controllers", minutes: 19 },
        ],
      },
      {
        title: "Fibre Optics",
        lessons: [
          { title: "Fibre types, connectors and loss budgets", minutes: 23 },
          { title: "Fusion splicing step by step", minutes: 28 },
          { title: "OTDR and power meter testing", minutes: 24 },
          { title: "FTTH and estate distribution", minutes: 21 },
        ],
      },
      {
        title: "Operations and Troubleshooting",
        lessons: [
          { title: "Diagnosing common network faults", minutes: 22 },
          { title: "Documentation and client handover", minutes: 13 },
        ],
      },
    ],
    quiz: {
      title: "Networking fundamentals quiz",
      questions: [
        { prompt: "Which address identifies a device on a local network?", options: ["MAC address", "IP address", "Port number", "Subnet mask"], correct: 1, explanation: "IP addresses identify hosts at layer 3; MAC at layer 2." },
        { prompt: "A /24 subnet provides how many usable host addresses?", options: ["254", "256", "128", "512"], correct: 0, explanation: "256 total minus network and broadcast." },
        { prompt: "Single-mode fibre is preferred for:", options: ["Short patch leads only", "Long-distance links", "Power transmission", "Wi-Fi"], correct: 1, explanation: "Single-mode supports longer distances with lower loss." },
        { prompt: "Before mating fibre connectors you should:", options: ["Blow on them", "Clean them with approved tools", "Apply gel", "Bend the cable"], correct: 1, explanation: "Dirt is the leading cause of high loss and damage." },
      ],
    },
    exam: {
      title: "Networking & fibre final assessment",
      questions: [
        { prompt: "The maximum recommended horizontal cable run for copper Ethernet is:", options: ["50m", "90m permanent link", "200m", "500m"], correct: 1, explanation: "90m permanent link plus patch cords up to 100m channel." },
        { prompt: "A VLAN is used to:", options: ["Increase cable length", "Segment a network logically", "Convert fibre to copper", "Power cameras"], correct: 1, explanation: "VLANs separate traffic without separate hardware." },
        { prompt: "High fibre loss is most commonly caused by:", options: ["Dirty or poorly cleaved connectors", "Bright screens", "Long patch cords", "Switch brand"], correct: 0, explanation: "Contamination and bad cleaves dominate loss problems." },
        { prompt: "Which command checks basic reachability?", options: ["ping", "format", "mkdir", "tar"], correct: 0, explanation: "Ping tests ICMP reachability and latency." },
        { prompt: "A network loop can cause:", options: ["Faster speeds", "Broadcast storms and outages", "Better Wi-Fi", "Lower latency"], correct: 1, explanation: "Loops multiply frames; use STP and design carefully." },
        { prompt: "OTDR is used to:", options: ["Terminate cables", "Measure fibre loss and locate faults", "Configure VLANs", "Test batteries"], correct: 1, explanation: "It characterises fibre links and events." },
      ],
    },
  },
  {
    title: "Intercom and Access Control",
    slug: "intercom-access-control",
    subtitle: "Install smart entry, intercom and access systems",
    summary:
      "From door strikes to biometric readers and estate intercoms: design, wire, configure and support access systems.",
    description:
      "Access control is where security meets convenience. This programme covers the full stack: electric locks and strikes, power supplies, readers, controllers, intercoms, exit devices and integration with CCTV and smart home platforms.\n\nYou will learn how to select the right lock for a door, how fail-safe and fail-secure operation differ, how to wire a controller and reader, and how to configure users and audit trails. We also cover estate intercom systems, gate automation interfaces and the practical issues that cause callbacks — voltage drop, door alignment and power failure behaviour.\n\nThe final module covers commissioning, client training and maintenance.",
    outcomes: [
      "Select locks, strikes and power supplies for each door type",
      "Wire controllers, readers, exit buttons and door contacts",
      "Configure users, credentials and access schedules",
      "Install and configure intercom and gate entry systems",
      "Integrate access events with CCTV and alerts",
      "Commission, test and maintain access systems",
    ],
    requirements: [
      "Basic low-voltage wiring confidence",
      "A phone or laptop for lessons",
      "Access to a practice door or strike is helpful",
    ],
    categorySlug: "access",
    instructorEmail: "instructor2@braveskill.ng",
    level: "BEGINNER",
    price: 55000,
    compareAt: 80000,
    duration: "4 weeks · 7 hours of video",
    featured: false,
    guideBullets: [
      "Match the lock to the door: magnetic, strike, bolt or electric mortise.",
      "Always provide a mechanical override and fire-alarm release where required.",
      "Size the power supply for inrush current, not just steady state.",
      "Use a separate power supply for locks; do not power them from the controller.",
      "Label and fuse every output.",
      "Test fail-safe operation during a power cut.",
    ],
    modules: [
      {
        title: "Access Control Foundations",
        lessons: [
          { title: "How access control systems work", minutes: 13, preview: true },
          { title: "Credentials: cards, PINs, biometrics and phones", minutes: 16 },
          { title: "Fail-safe vs fail-secure", minutes: 11 },
        ],
      },
      {
        title: "Door Hardware and Power",
        lessons: [
          { title: "Electric strikes, maglocks and bolts", minutes: 20 },
          { title: "Power supplies, batteries and voltage drop", minutes: 18 },
          { title: "Exit buttons, break glass and door contacts", minutes: 15 },
        ],
      },
      {
        title: "Controllers, Readers and Intercoms",
        lessons: [
          { title: "Wiring a controller and reader", minutes: 24 },
          { title: "Intercom and video entry systems", minutes: 22 },
          { title: "Gate automation interfaces", type: "PDF", minutes: 12, pdf: true },
        ],
      },
      {
        title: "Configuration and Support",
        lessons: [
          { title: "Users, schedules and audit trails", minutes: 17 },
          { title: "Integration with CCTV and alarms", minutes: 14 },
          { title: "Commissioning and maintenance", minutes: 13 },
        ],
      },
    ],
    quiz: {
      title: "Access control essentials quiz",
      questions: [
        { prompt: "A fail-safe lock releases when:", options: ["Power is applied", "Power is removed", "The door opens", "The reader beeps"], correct: 1, explanation: "Fail-safe unlocks on power loss, appropriate for fire exits." },
        { prompt: "A magnetic lock is typically rated by:", options: ["Holding force in kg/lbs", "Voltage only", "Colour", "Door width"], correct: 0, explanation: "Holding force indicates resistance to being forced open." },
        { prompt: "Locks should generally be powered by:", options: ["The reader", "A dedicated power supply", "The controller's USB port", "PoE"], correct: 1, explanation: "Dedicated supplies handle inrush and isolate faults." },
        { prompt: "An exit button is used to:", options: ["Arm the alarm", "Allow free egress from inside", "Call the gate", "Add a user"], correct: 1, explanation: "It provides safe exit without a credential." },
      ],
    },
    exam: {
      title: "Access control final assessment",
      questions: [
        { prompt: "Which lock type is best for a glass door with no frame drilling?", options: ["Electric strike", "Magnetic lock with glass bracket", "Mortise lock", "Padlock"], correct: 1, explanation: "Maglocks suit glass doors with appropriate brackets." },
        { prompt: "A door with an electric strike fails to release. First check:", options: ["The camera", "Power, strike alignment and controller output", "The Wi-Fi password", "The monitor"], correct: 1, explanation: "Mechanical alignment and power are common faults." },
        { prompt: "For fire safety, fail-safe locks must:", options: ["Remain locked", "Release on power loss and fire alarm", "Require a PIN to exit", "Be disabled"], correct: 1, explanation: "Life safety takes priority over security." },
        { prompt: "Voltage drop on a long lock cable can be solved by:", options: ["Thinner cable", "Shorter run or thicker cable", "Higher lock voltage without checking", "Removing the fuse"], correct: 1, explanation: "Reduce resistance or increase conductor size." },
        { prompt: "Access audit trails help with:", options: ["Interior design", "Investigations and attendance", "Cable selection", "Wi-Fi speed"], correct: 1, explanation: "Logs record who entered and when." },
        { prompt: "Before handover, you must test:", options: ["Only the reader", "Normal entry, exit, power failure and fire release", "The paint finish", "The client's TV"], correct: 1, explanation: "Commission all operating modes, including emergency release." },
      ],
    },
  },
];

async function main() {
  console.log("→ Clearing existing data…");
  await db.supportTicket.deleteMany();
  await db.agentConversation.deleteMany();
  await db.agentKnowledge.deleteMany();
  await db.auditLog.deleteMany();
  await db.notification.deleteMany();
  await db.certificate.deleteMany();
  await db.quizAttempt.deleteMany();
  await db.question.deleteMany();
  await db.quiz.deleteMany();
  await db.lessonProgress.deleteMany();
  await db.enrollment.deleteMany();
  await db.order.deleteMany();
  await db.coupon.deleteMany();
  await db.announcement.deleteMany();
  await db.lesson.deleteMany();
  await db.module.deleteMany();
  await db.course.deleteMany();
  await db.category.deleteMany();
  await db.testimonial.deleteMany();
  await db.faq.deleteMany();
  await db.contactMessage.deleteMany();
  await db.apkRelease.deleteMany();
  await db.asset.deleteMany();
  await db.webhookEvent.deleteMany();
  await db.rateLimitBucket.deleteMany();
  await db.siteSetting.deleteMany();
  await db.passwordResetToken.deleteMany();
  await db.user.deleteMany();

  const passwordHash = await bcrypt.hash(demoPassword, 12);

  console.log("→ Users");
  const [master, admin, instructor1, instructor2, instructor3, student1, student2, student3] = await Promise.all([
    db.user.create({ data: { name: "Nwabueze Jeremiah", email: "master@braveskill.ng", passwordHash, role: "MASTER_ADMIN", phone: "+234 803 000 0001", headline: "Founder & Academy Director", emailVerified: new Date() } }),
    db.user.create({ data: { name: "Amaka Obi", email: "admin@braveskill.ng", passwordHash, role: "ADMIN", phone: "+234 803 000 0002", headline: "Academy Operations Lead", emailVerified: new Date() } }),
    db.user.create({ data: { name: "Musa Ibrahim", email: "instructor@braveskill.ng", passwordHash, role: "INSTRUCTOR", headline: "Solar & Power Systems Engineer", expertise: "Solar PV, hybrid inverters, battery storage", bio: "Musa has designed and commissioned over 180 residential and commercial solar systems across Nigeria.", avatarUrl: null, emailVerified: new Date() } }),
    db.user.create({ data: { name: "Chinedu Eze", email: "instructor2@braveskill.ng", passwordHash, role: "INSTRUCTOR", headline: "Security & Electrical Systems Specialist", expertise: "CCTV, access control, electrical installation", bio: "Chinedu leads installation teams on estate security and electrical projects in Lagos and Enugu.", emailVerified: new Date() } }),
    db.user.create({ data: { name: "Ngozi Okafor", email: "instructor3@braveskill.ng", passwordHash, role: "INSTRUCTOR", headline: "Network & Fibre Engineer", expertise: "Structured cabling, fibre splicing, enterprise Wi-Fi", bio: "Ngozi is a network engineer with experience delivering fibre-to-the-home and enterprise LAN projects.", emailVerified: new Date() } }),
    db.user.create({ data: { name: "Ada Nwosu", email: "student@braveskill.ng", passwordHash, role: "STUDENT", phone: "+234 806 111 2222", headline: "Solar technician in training", emailVerified: new Date(), lastLoginAt: new Date() } }),
    db.user.create({ data: { name: "Emeka Obi", email: "student2@braveskill.ng", passwordHash, role: "STUDENT", phone: "+234 807 333 4444", headline: "CCTV installer", emailVerified: new Date() } }),
    db.user.create({ data: { name: "Fatima Bello", email: "student3@braveskill.ng", passwordHash, role: "STUDENT", phone: "+234 808 555 6666", headline: "Electrical apprentice", emailVerified: new Date() } }),
  ]);

  console.log("→ Categories");
  const categoryData = [
    { name: "Solar & Inverter", slug: "solar", description: "Design, install and maintain solar power and inverter systems.", icon: "solar", accent: "#FBBF24", position: 1 },
    { name: "CCTV & Surveillance", slug: "cctv", description: "Site surveys, camera systems, recorders and secure remote viewing.", icon: "cctv", accent: "#20D9E8", position: 2 },
    { name: "Electrical Installation", slug: "electrical", description: "Safe wiring, distribution boards, testing and fault finding.", icon: "electrical", accent: "#873BFF", position: 3 },
    { name: "Networking & Fiber", slug: "networking", description: "Structured cabling, switching, Wi-Fi and fibre optics.", icon: "networking", accent: "#1677FF", position: 4 },
    { name: "Intercom & Access Control", slug: "access", description: "Smart entry, intercoms, biometric and card access systems.", icon: "access", accent: "#10C99A", position: 5 },
  ];
  const categories = await Promise.all(categoryData.map((data) => db.category.create({ data })));
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));

  console.log("→ Demo media");
  await fs.mkdir(path.join(STORAGE, "videos"), { recursive: true });
  await fs.mkdir(path.join(STORAGE, "pdfs"), { recursive: true });
  const videos = await Promise.all([
    copyVideo("flower.mp4"),
    copyVideo("friday.mp4"),
    copyVideo("Big_Buck_Bunny_360_10s_1MB.mp4"),
  ]);

  console.log("→ Courses");
  const instructorByEmail = new Map([
    [instructor1.email, instructor1],
    [instructor2.email, instructor2],
    [instructor3.email, instructor3],
  ]);

  const createdCourses: { id: string; title: string; slug: string; priceKobo: number; modules: { id: string; lessons: { id: string; title: string }[] }[]; examId: string; quizId: string }[] = [];

  for (const seed of coursesSeed) {
    const category = categoryBySlug.get(seed.categorySlug)!;
    const instructor = instructorByEmail.get(seed.instructorEmail)!;
    const guide = await createGuidePdf(`${seed.title} — Field Guide`, seed.guideBullets);

    const course = await db.course.create({
      data: {
        title: seed.title,
        slug: seed.slug,
        subtitle: seed.subtitle,
        summary: seed.summary,
        description: seed.description,
        outcomes: seed.outcomes.join("\n"),
        requirements: seed.requirements.join("\n"),
        categoryId: category.id,
        instructorId: instructor.id,
        level: seed.level,
        priceKobo: money(seed.price),
        compareAtKobo: money(seed.compareAt),
        durationLabel: seed.duration,
        isPublished: true,
        isFeatured: seed.featured,
        publishedAt: new Date(Date.now() - Math.random() * 40 * 86400000),
        certificateEnabled: true,
        examRequired: true,
        passMark: 70,
      },
    });

    const modules: { id: string; lessons: { id: string; title: string }[] }[] = [];
    let videoIndex = 0;

    for (const [mi, moduleSeed] of seed.modules.entries()) {
      const mod = await db.module.create({
        data: { courseId: course.id, title: moduleSeed.title, position: mi },
      });
      const lessons: { id: string; title: string }[] = [];
      for (const [li, lessonSeed] of moduleSeed.lessons.entries()) {
        const type = lessonSeed.type || "VIDEO";
        const asset = type === "VIDEO" ? videos[videoIndex++ % videos.length] : null;
        const lesson = await db.lesson.create({
          data: {
            moduleId: mod.id,
            title: lessonSeed.title,
            type,
            position: li,
            durationSeconds: (lessonSeed.minutes || 12) * 60,
            isPreview: Boolean(lessonSeed.preview),
            videoAssetId: asset?.id,
            pdfAssetId: type === "PDF" ? guide.id : null,
            content: lessonSeed.content || null,
          },
        });
        lessons.push({ id: lesson.id, title: lesson.title });
      }
      modules.push({ id: mod.id, lessons });
    }

    const quiz = await db.quiz.create({
      data: {
        courseId: course.id,
        title: seed.quiz.title,
        type: "QUIZ",
        passMark: 60,
        maxAttempts: 0,
        description: "Check your understanding before the final assessment.",
      },
    });
    await Promise.all(
      seed.quiz.questions.map((q, i) =>
        db.question.create({
          data: {
            quizId: quiz.id,
            prompt: q.prompt,
            options: JSON.stringify(q.options),
            correctIndex: q.correct,
            explanation: q.explanation,
            position: i,
          },
        }),
      ),
    );

    const exam = await db.quiz.create({
      data: {
        courseId: course.id,
        title: seed.exam.title,
        type: "EXAM",
        passMark: 70,
        timeLimitMinutes: 45,
        maxAttempts: 3,
        description: "Final assessment. Complete every lesson before starting.",
      },
    });
    await Promise.all(
      seed.exam.questions.map((q, i) =>
        db.question.create({
          data: {
            quizId: exam.id,
            prompt: q.prompt,
            options: JSON.stringify(q.options),
            correctIndex: q.correct,
            explanation: q.explanation,
            position: i,
          },
        }),
      ),
    );

    createdCourses.push({
      id: course.id,
      title: course.title,
      slug: course.slug,
      priceKobo: course.priceKobo,
      modules,
      examId: exam.id,
      quizId: quiz.id,
    });
  }

  console.log("→ Enrolments, orders and progress");
  const orderReference = () => `BS-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

  async function enrol(input: {
    userId: string;
    course: (typeof createdCourses)[number];
    daysAgo: number;
    completedLessons?: number;
    status?: "ACTIVE" | "COMPLETED";
    paid?: boolean;
    reference?: string;
  }) {
    const now = new Date(Date.now() - input.daysAgo * 86400000);
    const reference = input.reference || orderReference();
    const order = await db.order.create({
      data: {
        reference,
        userId: input.userId,
        courseId: input.course.id,
        subtotalKobo: input.course.priceKobo,
        amountKobo: input.course.priceKobo,
        status: input.paid === false ? "PENDING" : "PAID",
        gateway: "PAYSTACK",
        gatewayReference: input.paid === false ? null : `ps_${crypto.randomBytes(6).toString("hex")}`,
        paidAt: input.paid === false ? null : now,
        receiptNumber: input.paid === false ? null : `RCPT-${reference.replace("BS-", "")}`,
        createdAt: now,
        ipAddress: "105.112.20.11",
      },
    });
    const enrollment = await db.enrollment.create({
      data: {
        userId: input.userId,
        courseId: input.course.id,
        status: input.status || "ACTIVE",
        pricePaidKobo: input.paid === false ? 0 : input.course.priceKobo,
        source: "PAYSTACK",
        orderId: order.id,
        enrolledAt: now,
        lastAccessedAt: new Date(Date.now() - Math.random() * 3 * 86400000),
      },
    });

    const flatLessons = input.course.modules.flatMap((m) => m.lessons);
    const count = input.completedLessons ?? 0;
    for (let i = 0; i < Math.min(count, flatLessons.length); i++) {
      await db.lessonProgress.create({
        data: {
          enrollmentId: enrollment.id,
          lessonId: flatLessons[i].id,
          completed: true,
          completedAt: new Date(now.getTime() + i * 3600000),
          watchedSeconds: 240 + i * 60,
        },
      });
    }
    return { enrollment, order, lessons: flatLessons };
  }

  const solar = createdCourses[0];
  const cctv = createdCourses[1];
  const electrical = createdCourses[2];
  const networking = createdCourses[3];
  const access = createdCourses[4];

  const adaSolar = await enrol({ userId: student1.id, course: solar, daysAgo: 18, completedLessons: 11 });
  const adaElectrical = await enrol({ userId: student1.id, course: electrical, daysAgo: 34, completedLessons: 15, status: "COMPLETED" });
  const emekaNetwork = await enrol({ userId: student2.id, course: networking, daysAgo: 9, completedLessons: 4 });
  await enrol({ userId: student2.id, course: cctv, daysAgo: 2, paid: false });
  const fatimaCctv = await enrol({ userId: student3.id, course: cctv, daysAgo: 41, completedLessons: 14, status: "COMPLETED" });
  const fatimaSolar = await enrol({ userId: student3.id, course: solar, daysAgo: 12, completedLessons: 5 });
  await enrol({ userId: student3.id, course: access, daysAgo: 6, completedLessons: 6 });

  // A refunded order for reporting
  const refundedRef = orderReference();
  const refundedOrder = await db.order.create({
    data: {
      reference: refundedRef,
      userId: student2.id,
      courseId: access.id,
      subtotalKobo: access.priceKobo,
      amountKobo: access.priceKobo,
      status: "REFUNDED",
      gateway: "PAYSTACK",
      paidAt: new Date(Date.now() - 20 * 86400000),
      refundedAt: new Date(Date.now() - 17 * 86400000),
      refundAmountKobo: access.priceKobo,
      refundReason: "Learner relocated before starting the course.",
      refundedById: admin.id,
      createdAt: new Date(Date.now() - 21 * 86400000),
    },
  });
  await db.enrollment.create({
    data: {
      userId: student2.id,
      courseId: access.id,
      status: "REVOKED",
      pricePaidKobo: access.priceKobo,
      orderId: refundedOrder.id,
      enrolledAt: new Date(Date.now() - 21 * 86400000),
    },
  }).catch(() => {});

  // Exam attempts + certificates
  async function passExam(userId: string, course: (typeof createdCourses)[number], percent: number, attemptCount = 1) {
    const exam = await db.quiz.findUnique({ where: { id: course.examId }, include: { questions: { orderBy: { position: "asc" } } } });
    if (!exam) return null;
    const attempt = await db.quizAttempt.create({
      data: {
        quizId: exam.id,
        userId,
        attemptNumber: attemptCount,
        score: Math.round((percent / 100) * exam.questions.reduce((s, q) => s + q.points, 0)),
        maxScore: exam.questions.reduce((s, q) => s + q.points, 0),
        percent,
        passed: true,
        startedAt: new Date(Date.now() - 2 * 86400000),
        submittedAt: new Date(Date.now() - 2 * 86400000 + 1200000),
        answers: JSON.stringify(exam.questions.map((q) => ({ questionId: q.id, selected: q.correctIndex, correctIndex: q.correctIndex, correct: true }))),
      },
    });
    return attempt;
  }

  const adaAttempt = await passExam(student1.id, electrical, 88);
  const fatimaAttempt = await passExam(student3.id, cctv, 92);

  async function issue(userId: string, course: (typeof createdCourses)[number], enrollmentId: string, attemptId?: string | null) {
    const serial = `BS-${new Date().getFullYear()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const user = await db.user.findUnique({ where: { id: userId } });
    const certCourse = await db.course.findUnique({ where: { id: course.id } });
    if (!user || !certCourse) return;
    const hash = crypto.createHash("sha256").update(`${serial}:${userId}:${course.id}:${process.env.AUTH_SECRET}`).digest("hex");
    await db.certificate.create({
      data: {
        serial,
        userId,
        courseId: course.id,
        enrollmentId,
        examAttemptId: attemptId || undefined,
        recipientName: user.name,
        courseTitle: certCourse.title,
        hash,
        issuedAt: new Date(Date.now() - 1 * 86400000),
      },
    });
    await db.notification.create({
      data: {
        userId,
        type: "CERTIFICATE",
        title: "Your certificate is ready",
        body: `Your certificate for ${certCourse.title} has been issued. Serial ${serial}.`,
        link: "/dashboard/certificates",
      },
    });
  }

  await issue(student1.id, electrical, adaElectrical.enrollment.id, adaAttempt?.id);
  await issue(student3.id, cctv, fatimaCctv.enrollment.id, fatimaAttempt?.id);

  console.log("→ Quizzes attempts for demo feedback");
  await db.quizAttempt.create({
    data: {
      quizId: solar.quizId,
      userId: student1.id,
      attemptNumber: 1,
      score: 3,
      maxScore: 4,
      percent: 75,
      passed: true,
      startedAt: new Date(Date.now() - 5 * 86400000),
      submittedAt: new Date(Date.now() - 5 * 86400000 + 600000),
      answers: "[]",
    },
  }).catch(() => {});

  console.log("→ Marketing content");
  await db.testimonial.createMany({
    data: [
      { name: "Ada Nwosu", role: "Solar technician, Enugu", quote: "I installed my first 3kVA system three weeks after the solar programme. The load audit worksheet alone saved me from over-sizing and losing the job.", courseTitle: "Solar Installation and Inverter Technology", rating: 5, position: 1 },
      { name: "Emeka Obi", role: "CCTV installer, Lagos", quote: "The CCTV course is practical. I now quote with confidence, calculate storage properly, and my callbacks have dropped to almost zero.", courseTitle: "CCTV Installation and Configuration", rating: 5, position: 2 },
      { name: "Fatima Bello", role: "Electrical apprentice, Abuja", quote: "Safety was treated seriously, not as a footnote. The testing and inspection module changed how I work on every board.", courseTitle: "Electrical Installation and Maintenance", rating: 5, position: 3 },
      { name: "Tobi Adeyemi", role: "Network technician, Ibadan", quote: "I learned fibre splicing on real equipment and passed my first estate link test with a clean loss budget. Worth every naira.", courseTitle: "Networking and Fiber Optics", rating: 5, position: 4 },
      { name: "Halima Sule", role: "Facility manager, Kano", quote: "We trained two of our technicians through Brave Skill. The access control module directly improved how we manage our estate gates.", courseTitle: "Intercom and Access Control", rating: 5, position: 5 },
      { name: "Chuka Nnamdi", role: "Entrepreneur, Port Harcourt", quote: "The business module helped me price installations properly. I stopped competing on hardware cost and started charging for expertise.", courseTitle: "Solar Installation and Inverter Technology", rating: 4, position: 6 },
    ],
  });

  await db.faq.createMany({
    data: [
      { question: "Do I need experience to start?", answer: "No. Beginner programmes start from fundamentals and build up. Intermediate tracks such as Networking & Fiber recommend basic computer literacy.", category: "Getting started", position: 1 },
      { question: "How long do I have access to a course?", answer: "Once enrolled, you keep access to the course and its updates for as long as it remains on the platform. Your certificate record stays verifiable for life.", category: "Getting started", position: 2 },
      { question: "Are the classes live or recorded?", answer: "The core lessons are recorded so you can learn at your pace. Instructors may schedule live support sessions and answer questions through the support channels.", category: "Getting started", position: 3 },
      { question: "Do I need tools to practise?", answer: "A multimeter and basic hand tools are recommended for the electrical and solar tracks. You can complete the theory first, but practical confidence comes from handling equipment under supervision.", category: "Courses", position: 4 },
      { question: "Is the certificate recognised?", answer: "It is a Brave Skill certificate of completion issued by Emyphill-Tech Global Solutions Limited. Employers and clients can verify it publicly using the serial number. It is not a government licence.", category: "Certificates", position: 5 },
      { question: "How do I get my certificate?", answer: "Complete every lesson and pass the final assessment. The certificate is generated automatically and appears in your dashboard, ready to download as a PDF.", category: "Certificates", position: 6 },
      { question: "What payment methods are accepted?", answer: "Payments are processed by Paystack and support cards, bank transfer, USSD and other channels enabled on our Paystack account. All prices are in Nigerian Naira.", category: "Payments", position: 7 },
      { question: "Can I pay in instalments?", answer: "Standard checkout is a one-time payment. For corporate cohorts or special arrangements, contact admissions before purchasing.", category: "Payments", position: 8 },
      { question: "My payment succeeded but the course is locked. What should I do?", answer: "Access is granted automatically after our server verifies the payment. If the course is still locked after 10 minutes, contact support with your transaction reference — we will resolve it and the webhook will normally unlock it automatically.", category: "Payments", position: 9 },
      { question: "Can I get a refund?", answer: "Yes, within seven days of purchase if you have completed less than 20% of the course, subject to our refund policy. Contact support with your reference.", category: "Payments", position: 10 },
      { question: "Does the Android app work offline?", answer: "Lesson videos stream online, while some PDF materials can be opened and saved for offline reading depending on your device. Progress syncs when you reconnect.", category: "Android app", position: 11 },
      { question: "Where can I download the Android app?", answer: "Use the Download page on this website for the direct APK. The Google Play listing is being prepared; the app uses the same account and backend as the website.", category: "Android app", position: 12 },
    ],
  });

  await db.announcement.createMany({
    data: [
      { title: "2026 intake is open", body: "New cohorts are open across all five career tracks. Use code BRAVE20 for 20% off your first programme.", audience: "ALL", isPublished: true, createdById: admin.id },
      { title: "New fibre optics lessons added", body: "The Networking & Fiber Optics programme now includes estate FTTH distribution and OTDR interpretation.", audience: "COURSE", courseId: networking.id, isPublished: true, createdById: admin.id },
    ],
  });

  await db.coupon.createMany({
    data: [
      { code: "BRAVE20", description: "20% off any programme", type: "PERCENT", percentOff: 20, maxUses: 500, minAmountKobo: 0, isActive: true, createdById: admin.id },
      { code: "SOLAR10K", description: "₦10,000 off the solar programme", type: "FIXED", amountOffKobo: money(10000), courseId: solar.id, maxUses: 100, isActive: true, createdById: admin.id },
      { code: "EARLYBIRD", description: "Expired launch discount", type: "PERCENT", percentOff: 15, maxUses: 100, expiresAt: new Date(Date.now() - 5 * 86400000), isActive: false, createdById: admin.id },
    ],
  });

  await db.agentKnowledge.createMany({
    data: [
      {
        title: "Enrolment and account creation",
        category: "Admissions",
        content:
          "To join Brave Skill, create a free student account at academy.emyphilltech.com.ng/register using your name, email and a password of at least eight characters containing a letter and a number. Verify your details, open the course catalogue, choose a programme and complete checkout through Paystack. Access unlocks automatically after the payment is verified on our server, not from the browser response. The same account works on the Android app. If you do not receive the welcome email, check your spam folder or contact support.",
      },
      {
        title: "Payments, references and receipts",
        category: "Payments",
        content:
          "Brave Skill prices are in Nigerian Naira and are one-time payments unless a page states otherwise. Paystack processes cards, bank transfers and USSD. Every order receives a reference beginning with BS-. A payment is only confirmed when the order status is PAID in our database after server-side verification. Students can download a receipt from Dashboard, Payments. If a payment succeeds but a course remains locked, wait a few minutes for the webhook, then contact support with the transaction reference. Never send your card PIN or OTP to anyone, including support.",
      },
      {
        title: "Refund policy summary",
        category: "Payments",
        content:
          "A refund can be requested within seven days of purchase if less than 20 percent of the course has been completed. Approved refunds are returned through Paystack to the original payment method, usually within ten business days. The enrolment, progress and certificate are revoked when a refund is processed. Duplicate charges, missing access after a successful payment and materially misdescribed courses are always reviewed. Email support with the account email, transaction reference and reason.",
      },
      {
        title: "Certificates and verification",
        category: "Certificates",
        content:
          "Certificates are issued after every published lesson is complete and the final assessment is passed, when the course includes certification. Each certificate has a unique serial such as BS-2026-4F2A9C and an integrity hash. Students download the PDF from Dashboard, Certificates. Employers and clients verify a certificate at academy.emyphilltech.com.ng/verify by entering the serial. Certificates certify completion of training, not a government licence, and can be revoked if obtained through cheating or error.",
      },
      {
        title: "Examinations and assessments",
        category: "Learning",
        content:
          "Most programmes include module quizzes and a final assessment. The final assessment unlocks only after all lessons are marked complete. Questions are graded on the server and the pass mark is displayed on the course, usually 70 percent. Time limits and attempt limits are enforced by the platform, with a short network grace period. After passing, the certificate is issued automatically if the course includes one. Students can review quiz answers but not final exam answers.",
      },
      {
        title: "Android app and offline learning",
        category: "Android",
        content:
          "The Brave Skill Academy Android app uses the same account and backend as the website. Download the APK from academy.emyphilltech.com.ng/download. Android may ask you to allow installs from your browser; this is normal for direct APK distribution. Sign in with your existing details and your purchased courses, progress and certificates appear automatically. Videos stream online. PDF field guides can be downloaded and opened in your device viewer. The Google Play listing is being prepared; the direct APK is the current install method.",
      },
      {
        title: "Course access and learning materials",
        category: "Learning",
        content:
          "After enrolment, open Dashboard, My Courses and select a programme. Lessons are grouped into modules. Video lessons stream through a protected endpoint, PDF field guides can be viewed or downloaded, and text lessons appear in the player. Progress saves automatically; students can also mark a lesson complete manually. The curriculum sidebar shows completed lessons and the next lesson. If a video will not play, check your connection and sign out and back in, then contact support if it persists.",
      },
      {
        title: "Technical support and account help",
        category: "Support",
        content:
          "For sign-in problems, use Forgot Password on the login page. The reset link is valid for 60 minutes. If the email does not arrive, check spam and confirm the address. Staff can reset a password from the administrator console. For persistent technical issues, email support@academy.emyphilltech.com.ng with the account email, device, a description of the problem and any error message. Support hours are Monday to Friday, 9:00 to 17:00 West Africa Time. Never share passwords, PINs or OTPs.",
      },
    ],
  });

  await db.siteSetting.createMany({
    data: [
      { key: "announcement.bar", value: "2026 intake now open — save 20% with code BRAVE20" },
      { key: "announcement.link", value: "/courses" },
      { key: "hero.title", value: "Learn Practical Skills. Build Your Future." },
      { key: "hero.subtitle", value: "Hands-on training in solar, security, electrical, networking and access control — taught by working professionals, built for the real Nigerian market." },
      { key: "stats.students", value: "4,800" },
      { key: "stats.courses", value: "5" },
      { key: "stats.certificates", value: "3,200" },
      { key: "stats.instructors", value: "12" },
      { key: "site.email", value: "support@academy.emyphilltech.com.ng" },
      { key: "site.phone", value: "+234 800 000 0000" },
      { key: "site.whatsapp", value: "2348000000000" },
      { key: "site.address", value: "Enugu, Nigeria" },
      { key: "app.version", value: "1.1.0" },
      { key: "ai.enabled", value: "true" },
      { key: "ai.name", value: "Brave AI Assistant" },
      {
        key: "ai.greeting",
        value:
          "Hello, I'm Brave AI, the learning assistant for Brave Skill Academy. I can help with courses, pricing, enrolment, payments, certificates or the Android app. What can I help you with?",
      },
      { key: "ai.tone", value: "warm-professional" },
      { key: "ai.voice", value: "auto" },
      { key: "ai.voiceRate", value: "0.98" },
      { key: "ai.voicePitch", value: "1.0" },
    ],
  });

  await db.contactMessage.createMany({
    data: [
      { name: "Blessing Okoro", email: "blessing@example.com", phone: "+234 802 111 0000", subject: "Corporate training", message: "We would like to train six facility technicians in access control and CCTV. Do you offer on-site cohorts?", status: "NEW" },
      { name: "Yusuf Aliyu", email: "yusuf@example.com", subject: "Payment or receipt", message: "I paid for the solar course yesterday but I have not received a receipt email. My reference starts with BS-. Please advise.", status: "READ" },
      { name: "Grace Ede", email: "grace@example.com", subject: "Certificate verification", message: "An employer is asking to verify my certificate. Where do they enter the serial number?", status: "RESOLVED" },
    ],
  });

  await db.notification.createMany({
    data: [
      { userId: student1.id, title: "Welcome to Brave Skill", body: "Your account is ready. Continue your solar and electrical programmes.", type: "SYSTEM", link: "/dashboard/courses" },
      { userId: student1.id, title: "Certificate issued", body: "Your Electrical Installation certificate is ready to download.", type: "CERTIFICATE", link: "/dashboard/certificates" },
      { userId: student1.id, title: "New lesson available", body: "A new practical lesson was added to your solar programme.", type: "COURSE", link: `/dashboard/courses/${solar.id}`, readAt: new Date() },
      { userId: student2.id, title: "Complete your payment", body: "Your CCTV enrolment is awaiting payment confirmation.", type: "PAYMENT", link: `/courses/${cctv.slug}` },
      { userId: student3.id, title: "Certificate issued", body: "Your CCTV certificate is ready.", type: "CERTIFICATE", link: "/dashboard/certificates", readAt: new Date() },
    ],
  });

  const demoConversation = await db.agentConversation.create({
    data: {
      userId: student1.id,
      channel: "WEB",
      title: "How much is the solar course?",
      messageCount: 4,
      lastMessageAt: new Date(Date.now() - 2 * 3600000),
      context: JSON.stringify({ lastIntent: "pricing", lastCourseTitle: solar.title }),
      createdAt: new Date(Date.now() - 2 * 3600000),
      messages: {
        create: [
          { role: "USER", content: "Hello, how much is the solar course?", createdAt: new Date(Date.now() - 2 * 3600000) },
          {
            role: "ASSISTANT",
            intent: "pricing",
            content: "Solar Installation and Inverter Technology costs ₦85,000. That is a one-time payment with lifetime access to the lessons, PDF guides, assessments and updates. Would you like the curriculum or the enrolment steps?",
            createdAt: new Date(Date.now() - 2 * 3600000 + 4000),
          },
          { role: "USER", content: "Does it include a certificate?", createdAt: new Date(Date.now() - 2 * 3600000 + 9000) },
          {
            role: "ASSISTANT",
            intent: "certificate",
            content: "Yes. You receive a serial-numbered Brave Skill certificate after completing every lesson and passing the final assessment. Clients and employers can verify it on the public verification page.",
            createdAt: new Date(Date.now() - 2 * 3600000 + 13000),
          },
        ],
      },
    },
  });

  await db.supportTicket.create({
    data: {
      reference: "BS-TKT-DEMO-4F2A",
      userId: student2.id,
      conversationId: null,
      name: "Emeka Obi",
      email: "student2@braveskill.ng",
      phone: "+234 807 333 4444",
      subject: "Payment succeeded but CCTV course is locked",
      message: "I paid for the CCTV course yesterday and the money left my account, but the course is still showing as locked. Please check transaction BS-DEMO-REF-8891.",
      status: "OPEN",
      priority: "HIGH",
      createdAt: new Date(Date.now() - 86400000),
    },
  });

  void demoConversation;

  await db.auditLog.createMany({
    data: [
      { actorId: master.id, action: "system.seeded", entity: "System", meta: JSON.stringify({ note: "Demo academy data created" }), ip: "127.0.0.1" },
      { actorId: admin.id, action: "payment.fulfilled", entity: "Order", entityId: adaElectrical.order.id, meta: JSON.stringify({ reference: adaElectrical.order.reference }), ip: "105.112.20.11" },
      { actorId: admin.id, action: "certificate.issued_manually", entity: "Certificate", meta: JSON.stringify({ course: "CCTV Installation and Configuration" }), ip: "105.112.20.11" },
      { actorId: instructor1.id, action: "course.updated", entity: "Course", entityId: solar.id, ip: "105.112.20.24" },
    ],
  });

  // Suppress unused warnings for records used only for relational setup.
  void adaSolar;
  void fatimaSolar;
  void emekaNetwork;
  void master;

  console.log("\n✓ Seed complete.");
  console.log("Demo accounts (password: BraveSkill#2026)");
  console.log("  master@braveskill.ng      MASTER_ADMIN");
  console.log("  admin@braveskill.ng       ADMIN");
  console.log("  instructor@braveskill.ng  INSTRUCTOR");
  console.log("  student@braveskill.ng     STUDENT");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
