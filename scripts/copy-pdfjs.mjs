// Copia i file di supporto di pdf.js (mappe dei caratteri, font standard, decodificatori wasm) in public/pdfjs.
// Servono al lettore PDF per i manuali scansionati o con font non incorporati. Parte da sola prima di dev e build.
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";

const src = "node_modules/pdfjs-dist";
if (!existsSync(src)) {
  console.error("pdfjs-dist non installato: esegui npm install");
  process.exit(1);
}
rmSync("public/pdfjs", { recursive: true, force: true });
mkdirSync("public/pdfjs", { recursive: true });
for (const d of ["cmaps", "standard_fonts", "wasm", "iccs"]) {
  if (existsSync(`${src}/${d}`)) cpSync(`${src}/${d}`, `public/pdfjs/${d}`, { recursive: true });
}
console.log("pdf.js: file di supporto copiati in public/pdfjs");
