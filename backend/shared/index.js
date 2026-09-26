import redis from "redis";

const noopClient = {
    publish: async () => {},
    subscribe: async () => {},
    on: () => {},
    connect: async () => {},
};

let publisher = noopClient;
let subscriber = noopClient;

if (process.env.NODE_ENV !== "test") {
    const redisUrl = process.env.REDIS_URL;
    const clientOptions = {
        ...(redisUrl ? { url: redisUrl } : {}),
        disableOfflineQueue: true,
        socket: { reconnectStrategy: (retries) => Math.min(retries * 1000, 10000) },
    };
    publisher = redis.createClient(clientOptions);
    subscriber = redis.createClient(clientOptions);

    let loggedPublisherError = false;
    let loggedSubscriberError = false;
    publisher.on("error", (err) => {
        if (!loggedPublisherError) console.error("Redis publisher unavailable:", err.message);
        loggedPublisherError = true;
    });
    subscriber.on("error", (err) => {
        if (!loggedSubscriberError) console.error("Redis subscriber unavailable:", err.message);
        loggedSubscriberError = true;
    });
    publisher.on("connect", () => {
        console.log("Redis publisher connected");
        loggedPublisherError = false;
    });
    subscriber.on("connect", () => {
        console.log("Redis subscriber connected");
        loggedSubscriberError = false;
    });

    publisher.connect().catch(() => {});
    subscriber.connect().catch(() => {});
}

export { publisher, subscriber };
