import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import vm from "node:vm";

const generate = resolve("scripts/generate-offline-manifest.mjs");
const fixture = await mkdtemp(join(tmpdir(), "jpy5-manifest-test-"));
const decode = source => { const context = { self: {} }; vm.runInNewContext(source, context); return context.self.JPY5_OFFLINE_MANIFEST; };
try {
  await mkdir(join(fixture, "assets"));
  const files = {
    "index.html": '<a href="book.PDF?x=1">PDF</a><a href="https://example.com/">external</a><a href="//example.com/file">protocol-relative</a><script src="assets/pwa.js"></script>\r\n',
    "assets/pwa.js": "// local runtime\r\n",
    "assets/local.pdf": "%PDF-local",
    "book.PDF": "%PDF-linked",
    "manifest.webmanifest": "{}"
  };
  for (const [path, content] of Object.entries(files)) await writeFile(join(fixture, path), content);
  execFileSync(process.execPath, [generate], { cwd: fixture });
  const first = decode(await readFile(join(fixture, "assets/offline-assets.js"), "utf8"));
  assert(first.assets.every(path => !/\.pdf$/i.test(path) && !path.includes("example.com")));
  assert(first.assets.includes("index.html") && first.assets.includes("assets/pwa.js"));
  for (const [path, content] of Object.entries(files)) await writeFile(join(fixture, path), content.replace(/\r\n/g, "\n"));
  execFileSync(process.execPath, [generate], { cwd: fixture });
  const second = decode(await readFile(join(fixture, "assets/offline-assets.js"), "utf8"));
  assert.equal(first.version, second.version, "Windows/Git line endings must not change release hashes");

  const real = decode(await readFile("assets/offline-assets.js", "utf8"));
  for (const path of real.assets) {
    let content = await readFile(path);
    if (/\.(?:html|js|mjs|css|json|webmanifest|md)$/i.test(path)) content = Buffer.from(content.toString().replace(/\r\n/g, "\n"));
    assert.equal(createHash("sha256").update(content).digest("hex"), real.hashes[path], `${path}: regenerate stale inventory`);
  }
  console.log(`Offline manifest checks passed: PDFs/external URLs excluded, portable text hashes, ${real.assets.length} current hashes verified.`);
} finally {
  assert(fixture.startsWith(join(tmpdir(), "jpy5-manifest-test-")));
  await rm(fixture, { recursive: true, force: true });
}
