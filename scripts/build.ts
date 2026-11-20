import { cp, mkdir, readFile, rm, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const srcDir = join(root, "src");
const distDir = join(root, "dist");

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });
await cp(srcDir, distDir, { recursive: true });

// Verify every local asset referenced in index.html exists in dist/
const html = await readFile(join(distDir, "index.html"), "utf8");
const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
  .map((m) => m[1])
  .filter((u) => !u.startsWith("http://") && !u.startsWith("https://") && !u.startsWith("mailto:") && !u.startsWith("#"));

for (const ref of refs) {
  const target = join(distDir, ref);
  const info = await stat(target).catch(() => null);
  if (!info || !info.isFile()) {
    throw new Error(`Missing built asset referenced in index.html: ${ref}`);
  }
}

// Verify font files referenced in fonts.css exist in dist/assets/
const fontsCss = await readFile(join(distDir, "assets", "fonts.css"), "utf8");
for (const m of fontsCss.matchAll(/url\("([^"]+)"\)/g)) {
  const target = join(distDir, "assets", m[1]);
  const info = await stat(target).catch(() => null);
  if (!info || !info.isFile()) {
    throw new Error(`Missing font asset referenced in fonts.css: ${m[1]}`);
  }
}

console.log(`Built ${distDir} (${refs.length} local HTML asset refs verified).`);
