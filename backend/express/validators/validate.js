export function validate(schema, source = "body") {
    return (req, res, next) => {
        const result = schema.safeParse(req[source]);
        if (!result.success) {
            const message = result.error.issues.map((issue) => issue.message).join(", ");
            return res.status(400).json({ success: false, message, code: "VALIDATION_ERROR" });
        }
        req[source] = result.data;
        next();
    };
}
