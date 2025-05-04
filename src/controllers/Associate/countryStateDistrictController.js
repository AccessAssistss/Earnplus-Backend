const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// ####################--------------------Country--------------------####################
// ##########----------Create Country----------##########
const createCountry = asyncHandler(async (req, res) => {
  const { countryName } = req.body;

  if (!countryName) {
    return res.respond(400, "Country name is required!");
  }

  const existingCountry = await prisma.country.findFirst({
    where: {
      countryName: { equals: countryName, mode: "insensitive" },
      isDeleted: false,
    },
  });

  if (existingCountry) {
    return res.respond(400, "Country with this name already exists!");
  }

  const country = await prisma.country.create({
    data: { countryName },
  });

  res.respond(200, "Country Created Successfully!", country);
});

// ##########----------Update Country----------##########
const updateCountry = asyncHandler(async (req, res) => {
  const { countryName } = req.body;

  if (!countryName) {
    return res.respond(400, "Country name is required!");
  }

  const existingCountry = await prisma.country.findFirst({
    where: {
      countryName: { equals: countryName, mode: "insensitive" },
      isDeleted: false,
      NOT: {
        id: req.params.countryId,
      },
    },
  });

  if (existingCountry) {
    return res.respond(400, "Country with this name already exists!");
  }

  const updatedCountry = await prisma.country.update({
    where: { id: req.params.countryId },
    data: { countryName },
  });

  res.respond(200, "Country Updated Successfully!", updatedCountry);
});

// ##########----------Get All Countries----------##########
const getAllCountries = asyncHandler(async (req, res) => {
  const countries = await prisma.country.findMany({
    where: { isDeleted: false },
    orderBy: { countryName: "asc" },
  });

  res.respond(200, "Countries fetched Successfully!", countries);
});

// ##########----------Soft Delete Country----------##########
const softDeleteCountry = asyncHandler(async (req, res) => {
  const { countryId } = req.params;

  // #####-----Get all states under the given country-----#####
  const states = await prisma.state.findMany({ where: { countryId } });

  // #####-----Soft delete all districts under those states-----#####
  for (const state of states) {
    await prisma.district.updateMany({
      where: { stateId: state.id },
      data: { isDeleted: true },
    });
  }

  // #####-----Soft delete all states under the given country-----#####
  await prisma.state.updateMany({
    where: { countryId },
    data: { isDeleted: true },
  });

  const deletedCountry = await prisma.country.update({
    where: { id: countryId },
    data: { isDeleted: true },
  });

  res.respond(
    200,
    "Country deleted(Soft Delete) Successfully!",
    deletedCountry
  );
});

// ####################--------------------State--------------------####################
// ##########----------Create State----------##########
const createState = asyncHandler(async (req, res) => {
  const { stateName, countryId } = req.body;

  if ((!stateName, !countryId)) {
    return res.respond(400, "State name And Country ID are required!");
  }

  const existingState = await prisma.state.findFirst({
    where: {
      stateName: { equals: stateName, mode: "insensitive" },
      countryId,
      isDeleted: false,
    },
  });

  if (existingState) {
    return res.respond(
      400,
      "State with this name already exists in the country"
    );
  }

  const state = await prisma.state.create({
    data: { stateName, countryId },
  });

  res.respond(200, "State Created Successfully!", state);
});

// ##########----------Update State----------##########
const updateState = asyncHandler(async (req, res) => {
  const { stateName } = req.body;

  if (!stateName) {
    return res.respond(400, "State name is required!");
  }
  const existingState = await prisma.state.findFirst({
    where: {
      stateName: { equals: stateName, mode: "insensitive" },
      countryId,
      isDeleted: false,
      NOT: {
        id: req.params.stateId,
      },
    },
  });

  if (existingState) {
    return res.respond(
      400,
      "State with this name already exists in the country"
    );
  }

  const updatedState = await prisma.state.update({
    where: { id: req.params.stateId },
    data: { stateName },
  });

  res.respond(200, "State Updated Successfully!", updatedState);
});

// ##########----------Get All States by Country----------##########
const getStatesByCountry = asyncHandler(async (req, res) => {
  const { countryId } = req.params;

  const states = await prisma.state.findMany({
    where: { countryId, isDeleted: false },
    orderBy: { stateName: "asc" },
  });

  res.respond(200, "states fetched Successfully!", states);
});

// ##########----------Soft Delete State----------##########
const softDeleteState = asyncHandler(async (req, res) => {
  const { stateId } = req.params;

  // #####-----Soft delete all districts under the given state-----#####
  await prisma.district.updateMany({
    where: { stateId },
    data: { isDeleted: true },
  });

  const deletedState = await prisma.state.update({
    where: { id: stateId },
    data: { isDeleted: true },
  });

  res.respond(200, "State deleted(Soft Delete) Successfully!", deletedState);
});

// ####################--------------------District--------------------####################
// ##########----------Create District----------##########
const createDistrict = asyncHandler(async (req, res) => {
  const { districtName, stateId } = req.body;

  if ((!districtName, !stateId)) {
    return res.respond(400, "District name And State ID are required!");
  }

  const existingDistrict = await prisma.district.findFirst({
    where: {
      districtName: { equals: districtName, mode: "insensitive" },
      stateId,
      isDeleted: false,
    },
  });

  if (existingDistrict) {
    return res.respond(
      400,
      "District with this name already exists in the state"
    );
  }

  const district = await prisma.district.create({
    data: { districtName, stateId },
  });

  res.respond(200, "District Created Successfully!", district);
});

// ##########----------Update District----------##########
const updateDistrict = asyncHandler(async (req, res) => {
  const { districtName } = req.body;

  if (!districtName) {
    return res.respond(400, "District name is required!");
  }

  const existingDistrict = await prisma.district.findFirst({
    where: {
      districtName: { equals: districtName, mode: "insensitive" },
      stateId,
      isDeleted: false,
      NOT: {
        id: req.params.districtId,
      },
    },
  });

  if (existingDistrict) {
    return res.respond(
      400,
      "District with this name already exists in the state"
    );
  }

  const updatedDistrict = await prisma.district.update({
    where: { id: req.params.districtId },
    data: { districtName },
  });

  res.respond(200, "District Updated Successfully!", updatedDistrict);
});

// ##########----------Get All Districts by State----------##########
const getDistrictsByState = asyncHandler(async (req, res) => {
  const { stateId } = req.params;

  const districts = await prisma.district.findMany({
    where: { stateId, isDeleted: false },
    orderBy: { districtName: "asc" },
  });

  res.respond(200, "districts fetched Successfully!", districts);
});

// ##########----------Soft Delete District----------##########
const softDeleteDistrict = asyncHandler(async (req, res) => {
  const deletedDistrict = await prisma.district.update({
    where: { id: req.params.districtId },
    data: { isDeleted: true },
  });

  res.respond(
    200,
    "District deleted(Soft Delete) Successfully!",
    deletedDistrict
  );
});

module.exports = {
  createCountry,
  updateCountry,
  getAllCountries,
  softDeleteCountry,
  createState,
  updateState,
  getStatesByCountry,
  softDeleteState,
  createDistrict,
  updateDistrict,
  getDistrictsByState,
  softDeleteDistrict,
};
