const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// Create Document
const createDocument = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.respond(400, "Document name is required!");
  }

  const existingDocument = await prisma.document.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      isDeleted: false,
    },
  });
  if (existingDocument) {
    return res.respond(400, "Document with this name already exists!");
  }

  const newDocument = await prisma.document.create({
    data: { name },
  });

  res.respond(201, "Document Created Successfully!", newDocument);
});

// Update Document
const updateDocument = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const { documentId } = req.params;
  if (!name) {
    return res.respond(400, "Document name is required!");
  }

  const existingDocument = await prisma.document.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      isDeleted: false,
      NOT: { id: documentId },
    },
  });
  if (existingDocument) {
    return res.respond(400, "Document with this name already exists!");
  }

  const updatedDocument = await prisma.document.update({
    where: { id: documentId },
    data: { name },
  });

  res.respond(200, "Document Updated Successfully!", updatedDocument);
});

// Get All Documents
const getAllDocuments = asyncHandler(async (req, res) => {
  const documents = await prisma.document.findMany({
    where: { isDeleted: false },
    orderBy: { name: "asc" },
  });

  res.respond(200, "Documents fetched Successfully!", documents);
});

// Soft Delete Document
const softDeleteDocument = asyncHandler(async (req, res) => {
  const { documentId } = req.params;

  const deletedDocument = await prisma.document.update({
    where: { id: documentId },
    data: { isDeleted: true },
  });

  res.respond(200, "Document deleted (Soft Delete) Successfully!", deletedDocument);
});

module.exports = {
  createDocument,
  updateDocument,
  getAllDocuments,
  softDeleteDocument,
};
