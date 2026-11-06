type RateLimit = { limit: (options: { key: string }) => Promise<{ success: boolean }> };

type Env = {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  ENGINE_URL: string;
  UPLOAD_LIMIT: RateLimit;
  REMOVE_LIMIT: RateLimit;
  CATEGORY_LIMIT: RateLimit;
  API_LIMIT: RateLimit;
};

const unlimitedPaths = ["/api/mcp", "/api/download"];

const rateLimits: { limiter: keyof Env; matches: (method: string, path: string) => boolean }[] = [
  {
    limiter: "UPLOAD_LIMIT",
    matches: (method, path) => method === "POST" && path === "/api/uploads",
  },
  {
    limiter: "REMOVE_LIMIT",
    matches: (method, path) => method === "DELETE" && path.startsWith("/api/photos/"),
  },
  {
    limiter: "CATEGORY_LIMIT",
    matches: (method, path) => method === "POST" && path === "/api/categories",
  },
  { limiter: "API_LIMIT", matches: () => true },
];

async function isRateLimited(request: Request, path: string, env: Env) {
  if (unlimitedPaths.includes(path)) return false;
  const { limiter } = rateLimits.find(({ matches }) => matches(request.method, path))!;
  const key = request.headers.get("cf-connecting-ip") ?? "unknown";
  const { success } = await (env[limiter] as RateLimit).limit({ key });
  return !success;
}

export default {
  async fetch(request: Request, env: Env) {
    const { pathname, search } = new URL(request.url);
    if (pathname.startsWith("/api/")) {
      if (await isRateLimited(request, pathname, env)) {
        return Response.json(
          { error: "Too many requests, try again in a minute" },
          { status: 429, headers: { "retry-after": "60" } }
        );
      }
      return fetch(new Request(`${env.ENGINE_URL}${pathname}${search}`, request));
    }
    if (pathname.startsWith("/.well-known/")) return new Response(null, { status: 404 });
    return env.ASSETS.fetch(request);
  },
};
