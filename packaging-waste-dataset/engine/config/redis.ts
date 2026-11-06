import { RedisClient } from "bun";
import env from "./env";

const keyPrefix = "packaging-waste-dataset";

export const redisKey = (name: string) => `${keyPrefix}:${name}`;

export const redis = new RedisClient(env.REDIS_URL);
export default redis;
