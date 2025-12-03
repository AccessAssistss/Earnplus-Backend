const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// ##########----------Create Delivery Channel----------##########
const createDeliveryChannel = asyncHandler(async (req, res) => {
  const { name } = req.body;
  
  if (!name) {
    return res.respond(400, "Delivery Channel name is required!");
  }

  const existingChannel = await prisma.deliveryChannel.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      isDeleted: false,
    },
  });

  if (existingChannel) {
    return res.respond(400, "Delivery Channel with this name already exists!");
  }

  const newChannel = await prisma.deliveryChannel.create({
    data: { name },
  });

  res.respond(201, "Delivery Channel Created Successfully!", newChannel);
});

// ##########----------Update Delivery Channel----------##########
const updateDeliveryChannel = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const { channelId } = req.params;

  if (!name) {
    return res.respond(400, "Delivery Channel name is required!");
  }

  const existingChannel = await prisma.deliveryChannel.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      isDeleted: false,
      NOT: { id: channelId },
    },
  });

  if (existingChannel) {
    return res.respond(400, "Delivery Channel with this name already exists!");
  }

  const updatedChannel = await prisma.deliveryChannel.update({
    where: { id: channelId },
    data: { name },
  });

  res.respond(200, "Delivery Channel Updated Successfully!", updatedChannel);
});

// ##########----------Get All Delivery Channels----------##########
const getAllDeliveryChannels = asyncHandler(async (req, res) => {
  const channels = await prisma.deliveryChannel.findMany({
    where: { isDeleted: false },
    orderBy: { name: "asc" },
  });

  res.respond(200, "Delivery Channels fetched Successfully!", channels);
});

// ##########----------Soft Delete Delivery Channel----------##########
const softDeleteDeliveryChannel = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  const deletedChannel = await prisma.deliveryChannel.update({
    where: { id: channelId },
    data: { isDeleted: true },
  });

  res.respond(200, "Delivery Channel deleted (Soft Delete) Successfully!", deletedChannel);
});

module.exports = {
  createDeliveryChannel,
  updateDeliveryChannel,
  getAllDeliveryChannels,
  softDeleteDeliveryChannel,
};