import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

// Use the same path as test-resume-parser
async function main() {
  const { extractTextFromPdf } = await import("../src/utils/resumeParser.ts");
  const { parseResumeCore } = await import("../src/utils/resumeParseCore.ts");
  const pdfPath = path.resolve("public/sample-resume.pdf");
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const text = await extractTextFromPdf(data);
  console.log(text);
  console.log("\n\n===== EXPERIENCES =====\n");
  const core = parseResumeCore(text);
  console.log(JSON.stringify(core.experiences, null, 2));
}
main();
