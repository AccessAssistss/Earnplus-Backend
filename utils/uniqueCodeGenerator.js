const slugify = require("slugify");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

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

const generateUniqueEmployeeId = async (
  prisma,
  employerId,
  employerInternalId
) => {
  const baseEmployerId = String(employerId).padStart(5, "0");

  const latestEmployee = await prisma.employee.findFirst({
    where: {
      employerId: employerInternalId,
      employeeId: {
        startsWith: `EE-EMP${baseEmployerId}-`,
      },
    },
    orderBy: { createdAt: "desc" },
    select: { employeeId: true },
  });

  let newEmployeeId = `EE-EMP${baseEmployerId}-0001`;
  if (latestEmployee?.employeeId) {
    const parts = latestEmployee.employeeId.split("-");
    const lastNumber = parseInt(parts[2]);
    const nextNumber = lastNumber + 1;
    newEmployeeId = `EE-EMP${baseEmployerId}-${String(nextNumber).padStart(
      4,
      "0"
    )}`;
  }

  return newEmployeeId;
};

module.exports = {
  generateProductCode,
  generateVariantProductCode,
  generateUniqueEmployeeId,
};
