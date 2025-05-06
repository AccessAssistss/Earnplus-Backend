const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// ####################--------------------Employer Role--------------------####################
// ##########----------Create Employer Role----------##########
const createEmployerRole = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { roleName } = req.body;

  if (!roleName) {
    return res.respond(400, "Role name is required!");
  }

  const employer = await prisma.employer.findFirst({
    where: { userId, isDeleted: false },
  });

  if (!employer) {
    return res.respond(404, "Employer profile not found!");
  }

  const existingRole = await prisma.employerRole.findFirst({
    where: {
      roleName: { equals: roleName, mode: "insensitive" },
      employerId: employer.id,
      isDeleted: false,
    },
  });

  if (existingRole) {
    return res.respond(400, "This role name already exists for the employer.");
  }

  const newRole = await prisma.employerRole.create({
    data: { roleName, employerId: employer.id },
  });

  res.respond(200, "Employer role created successfully!", newRole);
});

// ##########----------Update Employer Role----------##########
const updateEmployerRole = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { roleName } = req.body;
  const { employerRoleId } = req.params;

  if (!roleName) {
    return res.respond(400, "Role name is required!");
  }

  const employer = await prisma.employer.findFirst({
    where: { userId, isDeleted: false },
  });

  if (!employer) {
    return res.respond(404, "Employer profile not found!");
  }

  const existingRole = await prisma.employerRole.findFirst({
    where: {
      roleName: { equals: roleName, mode: "insensitive" },
      employerId: employer.id,
      isDeleted: false,
      NOT: { id: employerRoleId },
    },
  });

  if (existingRole) {
    return res.respond(400, "This role name already exists for the employer.");
  }

  const updatedRole = await prisma.employerRole.update({
    where: { id: employerRoleId },
    data: { roleName },
  });

  res.respond(200, "Employer role updated successfully!", updatedRole);
});

// ##########----------Get All Roles for Employer----------##########
const getAllEmployerRoles = asyncHandler(async (req, res) => {
  const userId = req.user;

  const employer = await prisma.employer.findFirst({
    where: { userId, isDeleted: false },
  });

  if (!employer) {
    return res.respond(404, "Employer profile not found!");
  }

  const roles = await prisma.employerRole.findMany({
    where: { employerId: employer.id, isDeleted: false },
    orderBy: { roleName: "asc" },
  });

  res.respond(200, "Employer roles fetched successfully!", roles);
});

// ##########----------Soft Delete Employer Role----------##########
const softDeleteEmployerRole = asyncHandler(async (req, res) => {
  const { employerRoleId } = req.params;

  await prisma.employerModule.updateMany({
    where: { roleId: employerRoleId },
    data: { isDeleted: true },
  });

  const deletedRole = await prisma.employerRole.update({
    where: { id: employerRoleId },
    data: { isDeleted: true },
  });

  res.respond(200, "Employer role soft-deleted successfully!", deletedRole);
});

// ####################--------------------Employer Module--------------------####################
// ##########----------Create Module under a Role----------##########
const createModule = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { moduleName, roleId } = req.body;

  if (!moduleName || !roleId) {
    return res.respond(400, "Module name and role ID are required!");
  }

  const employer = await prisma.employer.findFirst({
    where: { userId, isDeleted: false },
  });

  if (!employer) {
    return res.respond(404, "Employer profile not found!");
  }

  const existingModule = await prisma.employerModule.findFirst({
    where: {
      moduleName: { equals: moduleName, mode: "insensitive" },
      roleId,
      employerId: employer.id,
      isDeleted: false,
    },
  });

  if (existingModule) {
    return res.respond(400, "This module already exists in the role.");
  }

  const createdModule = await prisma.employerModule.create({
    data: { moduleName, roleId, employerId: employer.id },
  });

  res.respond(200, "Module created successfully!", createdModule);
});

// ##########----------Update Module----------##########
const updateModule = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { moduleName, roleId } = req.body;
  const { moduleId } = req.params;

  if (!moduleName) {
    return res.respond(400, "Module name is required!");
  }

  const employer = await prisma.employer.findFirst({
    where: { userId, isDeleted: false },
  });

  if (!employer) {
    return res.respond(404, "Employer profile not found!");
  }

  const existingModule = await prisma.employerModule.findFirst({
    where: {
      moduleName: { equals: moduleName, mode: "insensitive" },
      roleId,
      employerId: employer.id,
      isDeleted: false,
      NOT: { id: moduleId },
    },
  });

  if (existingModule) {
    return res.respond(400, "This module already exists in the role.");
  }

  const updatedModule = await prisma.employerModule.update({
    where: { id: moduleId },
    data: { moduleName },
  });

  res.respond(200, "Module updated successfully!", updatedModule);
});

// ##########----------Get All Modules by Role----------##########
const getModulesByEmployerRole = asyncHandler(async (req, res) => {
  const { employerRoleId } = req.params;

  const modules = await prisma.employerModule.findMany({
    where: { roleId: employerRoleId, isDeleted: false },
    orderBy: { moduleName: "asc" },
  });

  res.respond(200, "Modules fetched successfully!", modules);
});

// ##########----------Soft Delete Module----------##########
const softDeleteModule = asyncHandler(async (req, res) => {
  const { moduleId } = req.params;

  const deletedModule = await prisma.employerModule.update({
    where: { id: moduleId },
    data: { isDeleted: true },
  });

  res.respond(200, "Module soft-deleted successfully!", deletedModule);
});

module.exports = {
  createEmployerRole,
  updateEmployerRole,
  getAllEmployerRoles,
  softDeleteEmployerRole,
  createModule,
  updateModule,
  getModulesByEmployerRole,
  softDeleteModule,
};
