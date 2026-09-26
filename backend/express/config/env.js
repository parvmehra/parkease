const isTest = process.env.NODE_ENV === "test";

function required(name, fallbackForTest) {
    const value = process.env[name];
    if (value) return value;
    if (isTest && fallbackForTest !== undefined) return fallbackForTest;
    throw new Error(`Missing required environment variable: ${name}`);
}

export const env = {
    nodeEnv: process.env.NODE_ENV || "development",
    port: Number(process.env.PORT) || 4444,
    mongoUri: process.env.MONGO_URI || "mongodb://localhost:27017/parkease",
    jwtSecret: required("JWT_SECRET", "test-secret"),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "24h",
    redisUrl: process.env.REDIS_URL,
    clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
};
