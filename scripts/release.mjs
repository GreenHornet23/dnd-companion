// Uso: npm run release -- 0.2.0
// Allinea la versione in package.json, tauri.conf.json e Cargo.toml, crea commit e tag.
// Poi basta:  git push && git push --tags   (parte la GitHub Action di release)
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const v = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(v ?? "")) {
  console.error("Uso: npm run release -- X.Y.Z");
  process.exit(1);
}
const editJson = (p, fn) => {
  const j = JSON.parse(readFileSync(p, "utf8"));
  fn(j);
  writeFileSync(p, JSON.stringify(j, null, 2) + "\n");
};
editJson("package.json", (j) => (j.version = v));
editJson("src-tauri/tauri.conf.json", (j) => (j.version = v));
const cargo = readFileSync("src-tauri/Cargo.toml", "utf8").replace(/^version = ".*"$/m, `version = "${v}"`);
writeFileSync("src-tauri/Cargo.toml", cargo);

execSync(`git add -A && git commit -m "Release v${v}" && git tag v${v}`, { stdio: "inherit" });
console.log(`\nFatto. Ora: git push && git push --tags`);
