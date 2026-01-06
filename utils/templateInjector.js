const injectTemplate = (html, values) => {
    return html.replace(/{{(.*?)}}/g, (_, key) => {
        return values[key.trim()] ?? "";
    });
};

module.exports = { injectTemplate };
