import { Container, getContainer } from "@cloudflare/containers";

type Env = {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  ENGINE: DurableObjectNamespace<Engine>;
  OPENROUTER_API_KEY: string;
  BRAVE_SEARCH_API_KEY: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_ENDPOINT: string;
  R2_BUCKET: string;
  R2_PUBLIC_URL: string;
};

export class Engine extends Container<Env> {
  defaultPort = 5200;
  sleepAfter = "2h";

  constructor(ctx: DurableObjectState<Env>, env: Env) {
    super(ctx, env);
    this.envVars = {
      OPENROUTER_API_KEY: env.OPENROUTER_API_KEY,
      BRAVE_SEARCH_API_KEY: env.BRAVE_SEARCH_API_KEY,
      R2_ACCESS_KEY_ID: env.R2_ACCESS_KEY_ID,
      R2_SECRET_ACCESS_KEY: env.R2_SECRET_ACCESS_KEY,
      R2_ENDPOINT: env.R2_ENDPOINT,
      R2_BUCKET: env.R2_BUCKET,
      R2_PUBLIC_URL: env.R2_PUBLIC_URL,
    };
  }
}

export default {
  async fetch(request: Request, env: Env) {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith("/api/")) return getContainer(env.ENGINE).fetch(request);
    if (pathname.startsWith("/.well-known/")) return new Response(null, { status: 404 });
    return env.ASSETS.fetch(request);
  },
};
