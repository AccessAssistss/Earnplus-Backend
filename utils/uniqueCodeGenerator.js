const slugify = require("slugify");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// ###############---------------Generate Product Code---------------###############
const generateProductCode = (name) => {
  const slug = slugify(name, { lower: true, strict: true });
  const upperSlug = slug.toUpperCase();
  return `PROD-${upperSlug}`;
};

// ###############---------------Generate Variant Product Code---------------###############
const generateVariantProductCode = (productCode, variantName, count) => {
  const sanitizedName = variantName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "");

  const code = `VAR-${productCode}-${sanitizedName}-${count + 1}`;
  return code.toUpperCase();
};

// ###############---------------Generate Unique Employee ID---------------###############
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

// ###############---------------Generate Unique Employer ID---------------###############
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

  const latestCombination = await prisma.employerContractTypeCombination.findFirst({
    where: { employerId },
    orderBy: {
      createdAt: 'desc',
    },
  });

  let lastSequence = 0;
  if (latestCombination && latestCombination.uniqueId) {
    const parts = latestCombination.uniqueId.split("-");
    const seqPart = parts[parts.length - 1];
    lastSequence = parseInt(seqPart, 10) || 0;
  }

  const newSequence = String(lastSequence + 1).padStart(3, "0");
  return `PAY-${employerId}-${newSequence}`;
};

// ###############---------------Generate Unique Rule Book ID---------------###############
const generateUniqueRuleBookId = async (prisma, contractCombinationUUID, contractCombinationUniqueId) => {
  const count = await prisma.contractCombinationRuleBook.count({
    where: { contractCombinationId: contractCombinationUUID },
  });

  const sequence = String(count + 1).padStart(3, "0");
  return `RULE-${contractCombinationUniqueId}-${sequence}`;
};

// ###############---------------Generate Unique Loan Application Code---------------###############
const generateUniqueLoanCode = async (productId, customerId) => {
  if (!productId || !customerId) {
    throw new Error("Both productId and customerId are required");
  }

  const prefix = `LN-${productId}-${customerId}`;

  const latestLoan = await prisma.loanApplication.findFirst({
    where: {
      loanCode: {
        startsWith: prefix,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      loanCode: true,
    },
  });

  let nextNumber = 1;

  if (latestLoan?.loanCode) {
    const parts = latestLoan.loanCode.split("-");
    const lastPart = parts[parts.length - 1];
    const currentNum = parseInt(lastPart, 10);
    if (!isNaN(currentNum)) {
      nextNumber = currentNum + 1;
    }
  }

  const newLoanCode = `${prefix}-${String(nextNumber).padStart(3, "0")}`;
  return newLoanCode;
};

module.exports = {
  generateProductCode,
  generateVariantProductCode,
  generateUniqueEmployeeId,
  generateUniqueEmployerId,
  generateUniqueContractCombinationId,
  generateUniqueRuleBookId,
  generateUniqueLoanCode
};
