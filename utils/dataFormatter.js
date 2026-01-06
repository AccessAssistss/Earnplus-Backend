const normalizeFieldsJsonData = (data) => {
    if (data === null || data === undefined) return null;

    if (typeof data === "string") {
        try {
            return JSON.parse(data);
        } catch (err) {
            throw new Error("Invalid fieldsJsonData JSON format");
        }
    }

    if (typeof data !== "object") {
        throw new Error("fieldsJsonData must be a JSON object or array");
    }

    return data;
};

module.exports = {
    normalizeFieldsJsonData
}