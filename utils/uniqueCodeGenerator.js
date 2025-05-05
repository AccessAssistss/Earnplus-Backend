const slugify = require("slugify");

const generateProductCode = (name) => {
  const slug = slugify(name, { lower: true, strict: true });
  const upperSlug = slug.toUpperCase();
  return `PROD-${upperSlug}`;
};

const generateVariantProductCode = (productCode, variantName, count) => {
  const sanitizedName = variantName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "");

  const code = `VAR-${productCode}-${sanitizedName}-${count + 1}`;
  return code.toUpperCase();
};

module.exports = {
  generateProductCode,
  generateVariantProductCode,
};
