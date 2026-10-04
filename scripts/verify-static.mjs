import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";

async function files(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const nested = await Promise.all(entries.map((e) => e.isDirectory() ? files(`${root}/${e.name}`) : [`${root}/${e.name}`]));
  return nested.flat();
}
const forbidden = [
  [/\bSEDA-[EMH]\d\d\b/, "private challenge identifiers"],
  [/challengeProof|confirmationCode|SEDA_FLAG|flag\s*:/, "private proof fields"],
  [/127\.0\.0\.1|localhost|seda\.local/, "local service dependencies"],
  [/["'`]\/api\//, "backend endpoints"],
  [/\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon/, "application network requests"],
  [/dangerouslySetInnerHTML/, "unsafe rendering"],
  [/gh[pousr]_[A-Za-z0-9]{20,}|-----BEGIN .*PRIVATE KEY-----/, "credentials"],
];
const paths = [...await files("src"), ...await files("shared"), ...await files("dist")];
let textCount = 0;
for (const path of paths) {
  if (!/\.(?:tsx?|css|js|html|json|svg)$/.test(path)) continue;
  const contents = await readFile(path, "utf8");
  for (const [pattern, description] of forbidden) {
    // React includes the name of this prop in its renderer; app source must never use it.
    if (description === "unsafe rendering" && path.startsWith("dist/")) continue;
    assert.ok(!pattern.test(contents), `${description} found in ${path}`);
  }
  textCount++;
}
const manifest = JSON.parse(await readFile("package.json", "utf8"));
assert.deepEqual(Object.keys(manifest.dependencies).sort(), ["react", "react-dom"]);
const rootEntries = await readdir(".");
for (const directory of ["server", "server-dist", "evaluation", "operator", "runtime"]) assert.ok(!rootEntries.includes(directory), `${directory} must stay outside this repository`);
const entry = await readFile("dist/index.html", "utf8");
assert.match(entry, /\/seda-agent-evaluation-demo\/assets\//);
for (const route of ["products/m1", "products/p1", "account", "checkout", "studio", "support", "recover", "reset-password"]) {
  assert.equal(await readFile(`dist/${route}/index.html`, "utf8"), entry);
}
assert.ok((await readFile("dist/404.html", "utf8")).includes("demo-route"));
console.log(`Static release checks passed: ${textCount} source/build files, frontend-only dependencies, route entries and no application network code.`);
