export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function devServerHint(status: number, url: string): string {
  if (status === 404 && url.startsWith("/api/")) {
    return "（dev 服务器缓存过期或端口不对：停掉所有 npm run dev，执行 rm -rf .next && npm run dev，确认浏览器端口与终端一致）";
  }
  if (status >= 500) {
    return "（服务端错误：重启 dev 服务器试试）";
  }
  return "";
}

export async function apiFetch<T>(
  input: RequestInfo,
  init?: RequestInit,
): Promise<T> {
  const url = typeof input === "string" ? input : input.url;
  const res = await fetch(input, init);
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    const hint = devServerHint(res.status, url);
    throw new ApiError(`Request failed (${res.status}) ${url}${hint}`, res.status);
  }

  if (!res.ok) {
    const base =
      data &&
      typeof data === "object" &&
      "error" in data &&
      typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : `Request failed (${res.status}) ${url}`;
    const hint = devServerHint(res.status, url);
    throw new ApiError(`${base}${hint}`, res.status);
  }

  return data as T;
}
