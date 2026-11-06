import env from "../config/env";

export const isAdminToken = (token: string | null | undefined) =>
  Boolean(env.ADMIN_TOKEN) && token === env.ADMIN_TOKEN;
