/**
 * Smoke test for resume parsing against the sample PDF in this repo.
 * Run: npx tsx scripts/test-resume-parser.ts
 *  or: npm run test:parser
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import {
  parseResumeCore,
  parseExperience,
} from "../src/utils/resumeParseCore.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);

pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(
  require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs")
).href;

async function extractPdfText(pdfPath: string): Promise<string> {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pages: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const items = content.items
      .map((item: { str?: string; transform?: number[] }) => {
        const str = item.str ?? "";
        const tr = item.transform;
        return {
          str,
          x: tr?.[4] ?? 0,
          y: Math.round((tr?.[5] ?? 0) * 10) / 10,
        };
      })
      .filter((i) => i.str && i.str.trim());

    items.sort(
      (a: { y: number; x: number }, b: { y: number; x: number }) =>
        b.y - a.y || a.x - b.x
    );

    const lines: string[] = [];
    let currentY: number | null = null;
    let currentLine: string[] = [];
    const yTolerance = 2.5;

    for (const item of items) {
      if (currentY === null || Math.abs(item.y - currentY) <= yTolerance) {
        currentLine.push(item.str);
        currentY = currentY === null ? item.y : currentY;
      } else {
        lines.push(currentLine.join(" ").replace(/\s+/g, " ").trim());
        currentLine = [item.str];
        currentY = item.y;
      }
    }
    if (currentLine.length) {
      lines.push(currentLine.join(" ").replace(/\s+/g, " ").trim());
    }
    pages.push(lines.filter(Boolean).join("\n"));
  }

  return pages.join("\n").trim();
}

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`ASSERT: ${msg}`);
}

async function main() {
  const candidates = [
    path.join(root, "public/sample-resume.pdf"),
    path.join(root, "pradeep_singh_fullstack.pdf"),
  ];
  const pdfPath = candidates.find((p) => fs.existsSync(p));
  assert(pdfPath, "sample resume PDF not found");

  const text = await extractPdfText(pdfPath!);
  assert(text.length > 100, "extracted text too short");
  assert(/Pradeep Singh/i.test(text), "name missing from PDF text");

  const core = parseResumeCore(text);

  console.log("--- Parse summary ---");
  console.log("name:", core.contact.name);
  console.log("email:", core.contact.email);
  console.log("hero:", core.heroLines);
  console.log("phone:", core.contact.phone);
  console.log("location:", core.contact.location);
  console.log("experiences:", core.experiences.length);
  core.experiences.forEach((e, i) => {
    console.log(
      `  [${i}] ${e.companyName} | ${e.title} | ${e.date} | loc=${e.location || "—"} | bullets=${e.points.length}`
    );
  });
  console.log("projects:", core.projects.map((p) => p.name).join(" · "));
  console.log("skills:", core.skills.join(", "));

  assert(
    core.contact.name.toLowerCase().includes("pradeep"),
    "full name should parse"
  );
  assert(/pradeep/i.test(core.contact.email), "email should parse");
  assert(core.experiences.length >= 3, "expected >= 3 jobs");
  assert(
    core.experiences.some((e) => /netskope/i.test(e.companyName)),
    "Netskope company should parse (company+date same line)"
  );
  assert(
    core.experiences.some((e) => /hackerrank/i.test(e.companyName)),
    "HackerRank should parse"
  );
  assert(
    core.experiences.every(
      (e) =>
        e.title &&
        e.title !== "Role" &&
        !/bengaluru|gurgaon|lucknow/i.test(e.title)
    ),
    "titles should not include locations or stay as Role"
  );
  assert(core.projects.length >= 2, "expected projects");
  assert(
    core.skills.some((t) => /react/i.test(t)),
    "React skill expected"
  );
  assert(core.heroLines[0].length <= 60, "hero line 1 should be short");
  assert(core.heroLines[1].length <= 70, "hero line 2 should be short");

  const exp = parseExperience(`Netskope Dec 2025 – Jun 2026
Staff Engineer Bengaluru, India
• Built DRM services.
HackerRank Nov 2022 – Dec 2025
Software Development Engineer 2 Bengaluru, India
• Led redesign.`);
  assert(exp.length === 2, "parseExperience should find 2 jobs");
  assert(exp[0].companyName === "Netskope", `company0=${exp[0].companyName}`);
  assert(exp[0].title === "Staff Engineer", `title0=${exp[0].title}`);
  assert(/2025/.test(exp[0].date), "date0");
  assert(
    /bengaluru/i.test(exp[0].location || ""),
    `location0 should parse, got: ${exp[0].location}`
  );
  assert(
    core.experiences.some((e) => /bengaluru|gurgaon|lucknow/i.test(e.location || "")),
    "at least one experience should carry a city location"
  );
  assert(
    !/pvt\.?\s*ltd/i.test(
      core.experiences.find((e) => /cedcoss/i.test(e.companyName))?.companyName ||
        ""
    ),
    "Cedcoss should strip Pvt. Ltd. legal suffix"
  );

  console.log("\n✓ resume parser smoke tests passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
