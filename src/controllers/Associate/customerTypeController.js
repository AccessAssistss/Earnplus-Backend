const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// ####################--------------------Customer Type--------------------####################
// ##########----------Create Customer Type----------##########
const createCustomerType = asyncHandler(async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.respond(400, "Customer name is required!");
  }

  const existingCustomerType = await prisma.customerType.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
    },
  });

  if (existingCustomerType) {
    return res.respond(400, "Customer Type with this name already exists!");
  }

  const createCustomerType = await prisma.customerType.create({
    data: { name },
  });

  res.respond(201, "Customer Type Created Successfully!", createCustomerType);
});

// ##########----------Update Customer Type----------##########
const updateCustomerType = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const { customerId } = req.params;

  if (!name) {
    return res.respond(400, "Customer name is required!");
  }

  const existingCustomerType = await prisma.customerType.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      NOT: {
        id: customerId,
      },
    },
  });

  if (existingCustomerType) {
    return res.respond(400, "Customer Type with this name already exists!");
  }

  const updatedCustomerType = await prisma.customerType.update({
    where: { id: req.params.customerId },
    data: { name },
  });

  res.respond(200, "Customer Type Updated Successfully!", updatedCustomerType);
});

// ##########----------Get All Customer Type----------##########
const getAllCustomerTypes = asyncHandler(async (req, res) => {
  const customerTypes = await prisma.customerType.findMany({
    where: { isDeleted: false },
    orderBy: { name: "asc" },
  });

  res.respond(200, "Customer Types fetched Successfully!", customerTypes);
});

// ##########----------Soft Delete Country----------##########
const softDeleteCustomerType = asyncHandler(async (req, res) => {
  const { customerId } = req.params;

  const deletedCustomerType = await prisma.customerType.update({
    where: { id: customerId },
    data: { isDeleted: true },
  });

  res.respond(
    200,
    "Customer Type deleted(Soft Delete) Successfully!",
    deletedCustomerType
  );
});

module.exports = {
  createCustomerType,
  updateCustomerType,
  getAllCustomerTypes,
  softDeleteCustomerType,
};
