const resolveContext = (contextSchema, context) => {
    const resolved = {};

    for (const [htmlKey, rule] of Object.entries(contextSchema)) {

        if (rule === "__FULL_NAME__") {
            const c = context.CUSTOMER;
            resolved[htmlKey] = [
                c.FIRST_NAME,
                c.MIDDLE_NAME,
                c.LAST_NAME
            ].filter(Boolean).join(" ");
            continue;
        }

        if (rule === "__PREPAYMENT_CLAUSE__") {
            resolved[htmlKey] = context.POLICY.PREPAYMENT_ALLOWED
                ? "Prepayment is allowed as per company policy."
                : "Prepayment is not permitted.";
            continue;
        }

        resolved[htmlKey] = rule
            .split(".")
            .reduce((obj, key) => obj?.[key], context) ?? "";
    }

    return resolved;
};

module.exports = { resolveContext };
