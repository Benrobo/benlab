const requiredVariables = [
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_ENDPOINT",
  "R2_BUCKET",
  "R2_PUBLIC_URL",
];

const missingVariables = requiredVariables.filter((name) => !Bun.env[name]);
if (missingVariables.length) {
  throw new Error(`Missing env var(s): ${missingVariables.join(", ")}. See .env.example.`);
}

const env = {
  PORT: Number(Bun.env.ENGINE_PORT ?? 5200),
  REDIS_URL: Bun.env.REDIS_URL ?? "redis://localhost:6379",
  R2: {
    accessKeyId: Bun.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: Bun.env.R2_SECRET_ACCESS_KEY!,
    endpoint: Bun.env.R2_ENDPOINT!,
    bucket: Bun.env.R2_BUCKET!,
    publicUrl: Bun.env.R2_PUBLIC_URL!,
  },
};

export default env;
