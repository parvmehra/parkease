let publisherPromise;

async function getPublisher() {
  if (process.env.NODE_ENV === "test") return null;
  publisherPromise ||= import("../../shared/index.js")
    .then((module) => module.publisher)
    .catch((err) => {
      publisherPromise = null;
      throw err;
    });
  return publisherPromise;
}

export async function publishEvent(channel, payload) {
  try {
    const publisher = await getPublisher();
    if (!publisher) return;
    await publisher.publish(channel, JSON.stringify(payload));
  } catch (err) {
    console.log(`Unable to publish ${channel}:`, err.message);
  }
}
