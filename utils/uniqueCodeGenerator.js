const slugify = require("slugify");

const generateProductCode = (name) => {
  const slug = slugify(name, { lower: true, strict: true });
  const upperSlug = slug.toUpperCase();
  return `PROD-${upperSlug}`;
};

module.exports = { generateProductCode };
