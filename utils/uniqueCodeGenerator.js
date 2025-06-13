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
  const baseEmployerId = employerId.replace("-", "");

  const latestEmployee = await prisma.employee.findFirst({
    where: {
      employerId: employerInternalId,
      customEmployeeId: {
        startsWith: `EE-${baseEmployerId}-`,
      },
    },
    orderBy: { createdAt: "desc" },
    select: { customEmployeeId: true },
  });

  let newEmployeeId = `EE-${baseEmployerId}-0001`;

  if (latestEmployee?.customEmployeeId) {
    const parts = latestEmployee.customEmployeeId.split("-");
    const lastNumber = parseInt(parts[2], 10);
    const nextNumber = lastNumber + 1;
    newEmployeeId = `EE-${baseEmployerId}-${String(nextNumber).padStart(4, "0")}`;
  }

  return newEmployeeId;
};

const generateUniqueEmployerId = async () => {
  const latestEmployer = await prisma.employer.findFirst({
    orderBy: {
      createdAt: "desc",
    },
    where: {
      employerId: {
        startsWith: "EMP-",
      },
    },
    select: {
      employerId: true,
    },
  });

  let newEmployerId = "EMP-00001";
  if (latestEmployer?.employerId) {
    const currentNumber = parseInt(latestEmployer.employerId.split("-")[1]);
    const nextNumber = currentNumber + 1;
    newEmployerId = `EMP-${String(nextNumber).padStart(5, "0")}`;
  }

  return newEmployerId;
};

const generateUniqueContractCombinationId = async (employerId) => {
  if (!employerId) throw new Error("Employer ID is required");

  const count = await prisma.employerContractTypeCombination.count({
    where: { employerId },
  });

  const sequence = String(count + 1).padStart(3, "0");
  return `PAY-${employerId}-${sequence}`;
};

module.exports = {
  generateProductCode,
  generateVariantProductCode,
  generateUniqueEmployeeId,
  generateUniqueEmployerId,
  generateUniqueContractCombinationId
};
