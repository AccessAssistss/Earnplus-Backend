const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// Create Ownership Document
const createOwnershipDocument = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.respond(400, "Ownership Document name is required!");
  }

  const existingDocument = await prisma.ownershipDocument.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      isDeleted: false,
    },
  });
  if (existingDocument) {
    return res.respond(400, "Ownership Document with this name already exists!");
  }

  const newDocument = await prisma.ownershipDocument.create({
    data: { name },
  });

  res.respond(201, "Ownership Document Created Successfully!", newDocument);
});

// Update Ownership Document
const updateOwnershipDocument = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const { ownershipDocumentId } = req.params;
  if (!name) {
    return res.respond(400, "Ownership Document name is required!");
  }

  const existingDocument = await prisma.ownershipDocument.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      isDeleted: false,
      NOT: { id: ownershipDocumentId },
    },
  });
  if (existingDocument) {
    return res.respond(400, "Ownership Document with this name already exists!");
  }

  const updatedDocument = await prisma.ownershipDocument.update({
    where: { id: ownershipDocumentId },
    data: { name },
  });

  res.respond(200, "Ownership Document Updated Successfully!", updatedDocument);
});

// Get All Ownership Documents
const getAllOwnershipDocuments = asyncHandler(async (req, res) => {
  const documents = await prisma.ownershipDocument.findMany({
    where: { isDeleted: false },
    orderBy: { name: "asc" },
  });

  res.respond(200, "Ownership Documents fetched Successfully!", documents);
});

// Soft Delete Ownership Document
const softDeleteOwnershipDocument = asyncHandler(async (req, res) => {
  const { ownershipDocumentId } = req.params;

  const deletedDocument = await prisma.ownershipDocument.update({
    where: { id: ownershipDocumentId },
    data: { isDeleted: true },
  });

  res.respond(200, "Ownership Document deleted (Soft Delete) Successfully!", deletedDocument);
});

module.exports = {
  createOwnershipDocument,
  updateOwnershipDocument,
  getAllOwnershipDocuments,
  softDeleteOwnershipDocument,
};
