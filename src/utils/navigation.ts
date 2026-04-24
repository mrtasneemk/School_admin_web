const appBasePath = import.meta.env.BASE_URL;

export function resolveAppPath(path: string) {
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  return new URL(normalizedPath, window.location.origin + appBasePath).pathname;
}

export function navigateDocument(path: string, options?: { replace?: boolean }) {
  const target = resolveAppPath(path);
  if (options?.replace) {
    window.location.replace(target);
    return;
  }
  window.location.assign(target);
}
