export function setToken(token: string) {
  localStorage.setItem("admin_token", token);
}

export function getToken(): string | null {
  return localStorage.getItem("admin_token");
}

export function clearToken() {
  localStorage.removeItem("admin_token");
}
