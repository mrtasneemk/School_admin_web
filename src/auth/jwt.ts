export type JwtUser = {
  role?: string;
  username?: string;
  userId?: number;
  admNo?: number;
  exp?: number;
};

function decodeBase64Url(input: string): string {
  let base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;
  if (pad > 0) {
    base64 = base64.padEnd(base64.length + (4 - pad), "=");
  }

  return atob(base64);
}

export function parseJwt(token: string | null): JwtUser {
  if (!token) return {};

  try {
    const payloadBase64 = token.split(".")[1];
    if (!payloadBase64) return {};

    const payloadJson = decodeBase64Url(payloadBase64);
    const payload = JSON.parse(payloadJson) as Record<string, string>;

    const role =
      payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ??
      payload.role ??
      "";
    const username =
      payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] ??
      payload.unique_name ??
      payload.name ??
      "";

    const userIdRaw =
      payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ??
      payload.nameid ??
      "";
    const admNoRaw =
      payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/serialnumber"] ??
      payload.admno ??
      "";

    const userId = Number(userIdRaw);
    const admNo = Number(admNoRaw);
    const expRaw = payload.exp ?? "";
    const exp = Number(expRaw);

    // If token is expired, treat it as invalid user payload.
    if (Number.isFinite(exp) && exp > 0) {
      const nowEpochSeconds = Math.floor(Date.now() / 1000);
      if (exp <= nowEpochSeconds) return {};
    }

    return {
      role: role.trim(),
      username: username.trim(),
      userId: Number.isFinite(userId) && userId > 0 ? userId : undefined,
      admNo: Number.isFinite(admNo) && admNo > 0 ? admNo : undefined,
      exp: Number.isFinite(exp) && exp > 0 ? exp : undefined
    };
  } catch {
    return {};
  }
}
