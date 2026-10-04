export const basePath = import.meta.env?.BASE_URL ?? "/";

export function demoUrl(path: string): string {
  return `${basePath}${path.replace(/^\//, "")}`;
}

export function storePathname(): string {
  const pathname = window.location.pathname;
  return pathname.startsWith(basePath) ? `/${pathname.slice(basePath.length)}` : pathname;
}

export function restoreStaticRoute(): void {
  const parameters = new URLSearchParams(window.location.search);
  const route = parameters.get("demo-route");
  if (!route || !/^\/(?:products|support|account|checkout|recover|reset-password|studio)(?:[/?#]|$)/.test(route)) return;
  window.history.replaceState({}, "", demoUrl(route));
}
