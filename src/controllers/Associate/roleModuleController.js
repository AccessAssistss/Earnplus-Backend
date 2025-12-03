const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// ####################--------------------Role--------------------####################
// ##########----------Create Role----------##########
const createRole = asyncHandler(async (req, res) => {
  const associateId = req.user;
  const { roleName } = req.body;
  if (!roleName) {
    return res.respond(400, "Role name is required!");
  }

  const associate = await prisma.associate.findFirst({
    where: { userId: associateId, isDeleted: false },
  });
  if (!associate) {
    return res.respond(404, "Associate profile not found!");
  }

  const existingRole = await prisma.role.findFirst({
    where: {
      roleName: { equals: roleName, mode: "insensitive" },
      associateId: associate.id,
      isDeleted: false,
    },
  });
  if (existingRole) {
    return res.respond(
      400,
      "Role with this name already exists for this associate!"
    );
  }

  const role = await prisma.role.create({
    data: { roleName, associateId: associate.id },
  });

  res.respond(200, "Role Created Successfully!", role);
});

// ##########----------Update Role----------##########
const updateRole = asyncHandler(async (req, res) => {
  const associateId = req.user;
  const { roleName } = req.body;
  const { roleId } = req.params;
  if (!roleName) {
    return res.respond(400, "Role name is required!");
  }

  const associate = await prisma.associate.findFirst({
    where: { userId: associateId, isDeleted: false },
  });
  if (!associate) {
    return res.respond(404, "Associated profile not found!");
  }

  const existingRole = await prisma.role.findFirst({
    where: {
      roleName: { equals: roleName, mode: "insensitive" },
      associateId: associate.id,
      isDeleted: false,
      NOT: {
        id: roleId,
      },
    },
  });
  if (existingRole) {
    return res.respond(
      400,
      "Role with this name already exists for this associate!"
    );
  }

  const updatedRole = await prisma.role.update({
    where: { id: roleId },
    data: { roleName },
  });

  res.respond(200, "Role Updated Successfully!", updatedRole);
});

// ##########----------Get All Roles----------##########
const getAllRoles = asyncHandler(async (req, res) => {
  const associateId = req.user;

  const associate = await prisma.associate.findFirst({
    where: { userId: associateId, isDeleted: false },
  });
  if (!associate) {
    return res.respond(404, "Associated profile not found!");
  }

  const roles = await prisma.role.findMany({
    where: { associateId: associate.id, isDeleted: false },
    orderBy: { roleName: "asc" },
  });

  res.respond(200, "Roles fetched Successfully!", roles);
});

// ##########----------Soft Delete Role----------##########
const softDeleteRole = asyncHandler(async (req, res) => {
  const { roleId } = req.params;

  await prisma.module.updateMany({
    where: { roleId },
    data: { isDeleted: true },
  });

  const role = await prisma.role.update({
    where: { id: roleId },
    data: { isDeleted: true },
  });

  res.respond(200, "Role deleted (soft delete) successfully!", role);
});

// ####################--------------------Module--------------------####################
// ##########----------Create Module----------##########
const createModule = asyncHandler(async (req, res) => {
  const associateId = req.user;
  const { moduleName, path, roleId } = req.body;

  const iconFile = req.files?.icon?.[0];
  const iconUrl = iconFile
    ? `/uploads/module/icon/${iconFile.filename}`
    : null;

  if (!moduleName || !roleId) {
    return res.respond(400, "Module name And Role ID are required!");
  }

  const associate = await prisma.associate.findFirst({
    where: { userId: associateId, isDeleted: false },
  });
  if (!associate) {
    return res.respond(404, "Associated profile not found!");
  }

  const existingModule = await prisma.module.findFirst({
    where: {
      moduleName: { equals: moduleName, mode: "insensitive" },
      roleId,
      associateId: associate.id,
      isDeleted: false,
    },
  });
  if (existingModule) {
    return res.respond(
      400,
      "Module with this name already exists in the role!"
    );
  }

  const module = await prisma.module.create({
    data: {
      moduleName,
      path,
      icon: iconUrl,
      roleId,
      associateId: associate.id
    },
  });

  res.respond(200, "Module Created Successfully!", module);
});

// ##########----------Update Module----------##########
const updateModule = asyncHandler(async (req, res) => {
  const associateId = req.user;
  const { moduleName, roleId } = req.body;
  const { moduleId, path } = req.params;

  const iconFile = req.files?.icon?.[0];
  const iconUrl = iconFile
    ? `/uploads/module/icon/${iconFile.filename}`
    : null;

  if (!moduleName) {
    return res.respond(400, "Module name is required!");
  }

  const associate = await prisma.associate.findFirst({
    where: { userId: associateId, isDeleted: false },
  });
  if (!associate) {
    return res.respond(404, "Associated profile not found!");
  }

  const existingModule = await prisma.module.findFirst({
    where: {
      moduleName: { equals: moduleName, mode: "insensitive" },
      roleId,
      associateId: associate.id,
      isDeleted: false,
      NOT: {
        id: moduleId,
      },
    },
  });
  if (existingModule) {
    return res.respond(
      400,
      "Module with this name already exists in the role!"
    );
  }

  const updatedModule = await prisma.module.update({
    where: { id: moduleId },
    data: {
      moduleName,
      path,
      icon: iconUrl
    },
  });

  res.respond(200, "Module Updated Successfully!", updatedModule);
});

// ##########----------Get All Modules by Role----------##########
const getModulesByRole = asyncHandler(async (req, res) => {
  const { roleId } = req.params;

  const modules = await prisma.module.findMany({
    where: { roleId, isDeleted: false },
    orderBy: { moduleName: "asc" },
  });

  res.respond(200, "modules fetched Successfully!", modules);
});

// ##########----------Soft Delete Module----------##########
const softDeleteModule = asyncHandler(async (req, res) => {
  const { moduleId } = req.params;

  const deletedModule = await prisma.module.update({
    where: { id: moduleId },
    data: { isDeleted: true },
  });

  res.respond(200, "Module deleted (soft delete) successfully!", deletedModule);
});

// ##########----------Get All Modules----------##########
const getAllModules = asyncHandler(async (req, res) => {
  const modules = await prisma.module.findMany({
    where: { isDeleted: false },
    orderBy: { moduleName: "asc" },
  });

  res.respond(200, "modules fetched Successfully!", modules);
});

module.exports = {
  createRole,
  updateRole,
  getAllRoles,
  softDeleteRole,
  createModule,
  updateModule,
  getModulesByRole,
  getAllModules,
  softDeleteModule,
};
