import { readFile, mkdir, writeFile } from "node:fs/promises";

const html = await readFile("dist/index.html", "utf8");
const routes = ["account", "checkout", "recover", "reset-password", "studio", "support",
  ...["m1", "r1", "i1", "s1", "t1", "d1", "b1", "p1"].map((id) => `products/${id}`)];
for (const route of routes) {
  await mkdir(`dist/${route}`, { recursive: true });
  await writeFile(`dist/${route}/index.html`, html);
}
const base = "/seda-agent-evaluation-demo/";
await writeFile("dist/404.html", `<!doctype html><html lang="az"><meta charset="utf-8">
<title>SƏDA</title><script>
const base = ${JSON.stringify(base)};
const route = '/' + location.pathname.slice(base.length) + location.search + location.hash;
if (location.pathname.startsWith(base)) location.replace(base + '?demo-route=' + encodeURIComponent(route));
</script><a href="${base}">SƏDA ana səhifə</a></html>`);
await writeFile("dist/.nojekyll", "");
console.log(`Generated ${routes.length} static entry points and a dynamic-route fallback.`);
