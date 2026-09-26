import mongoose from "mongoose";

const RETRYABLE_LABELS = ["TransientTransactionError", "UnknownTransactionCommitResult"];

function isRetryable(err) {
    return Array.isArray(err?.errorLabels) && err.errorLabels.some((label) => RETRYABLE_LABELS.includes(label));
}

export async function withTransaction(work, { retries = 3 } = {}) {
    let attempt = 0;
    while (true) {
        attempt += 1;
        const session = await mongoose.startSession();
        try {
            let result;
            await session.withTransaction(async () => {
                result = await work(session);
            });
            return result;
        } catch (err) {
            if (isRetryable(err) && attempt <= retries) {
                continue;
            }
            throw err;
        } finally {
            await session.endSession();
        }
    }
}
