import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith(".") && !/\.[a-z]+$/.test(specifier)) {
    return nextResolve(`${specifier}.ts`, context);
  }
  return nextResolve(specifier, context);
}
export async function load(url, context, nextLoad) {
  if (!url.endsWith(".ts")) return nextLoad(url, context);
  const source = await readFile(new URL(url), "utf8");
  return { format: "module", shortCircuit: true, source: stripTypeScriptTypes(source, { mode: "strip" }) };
}
