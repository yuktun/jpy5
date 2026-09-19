import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const files = ["assets/common.js", ...[14, 15, 16, 17, 18].map(lesson => `assets/ch${lesson}-common.js`)];
const expected = [[5, "dark"], [6, "light"], [17, "light"], [18, "dark"], [21, "dark"]];

for (const file of files) {
  const source = await readFile(file, "utf8");
  assert.ok(!/document\.documentElement\.dataset\.theme\s*=\s*theme/.test(source), `${file} bypasses effectiveTheme()`);
  assert.match(source, /applyTheme\(theme\)/, `${file} initializes through applyTheme()`);
  assert.match(source, /visibilitychange/, `${file} refreshes after resuming`);

  const instrumented = source.replace(/return \{[^}]+\};\s*\}\)\(\);\s*$/, "globalThis.effectiveTheme = effectiveTheme;})();");
  const context = {
    Date,
    document: { addEventListener() {}, documentElement: { dataset: {} }, querySelectorAll: () => [] },
    window: { addEventListener() {} },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    setInterval() {},
    globalThis: {}
  };
  vm.runInNewContext(instrumented, context, { filename: file });
  assert.equal(typeof context.globalThis.effectiveTheme, "function", `${file} exposes effectiveTheme for testing`);
  for (const [hour, appearance] of expected) assert.equal(context.globalThis.effectiveTheme("auto", hour), appearance, `${file} Auto at ${hour}:00`);
  assert.equal(context.globalThis.effectiveTheme("light", 21), "light", `${file} manual Light overrides Auto`);
  assert.equal(context.globalThis.effectiveTheme("dark", 12), "dark", `${file} manual Dark overrides Auto`);
}

console.log("Theme checks passed: Auto boundaries, manual overrides, initialization, and resume refresh.");
