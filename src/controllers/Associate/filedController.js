const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// ####################--------------------Section Key Controllers--------------------####################
// ##########----------Create Section Key----------##########
const createSectionKey = asyncHandler(async (req, res) => {
    const { key, label } = req.body;

    if (!key || !label) {
        return res.respond(400, "Section key and label are required!");
    }

    const existingSectionKey = await prisma.sectionKey.findFirst({
        where: {
            key: { equals: key, mode: "insensitive" },
            isDeleted: false,
        },
    });

    if (existingSectionKey) {
        return res.respond(400, "Section Key with this key already exists!");
    }

    const newSectionKey = await prisma.sectionKey.create({
        data: { key, label },
    });

    res.respond(201, "Section Key created successfully!", newSectionKey);
});

// ##########----------Update Section Key----------##########
const updateSectionKey = asyncHandler(async (req, res) => {
    const { key, label } = req.body;
    const { sectionKeyId } = req.params;

    if (!key || !label) {
        return res.respond(400, "Section key and label are required!");
    }

    const existingSectionKey = await prisma.sectionKey.findFirst({
        where: {
            key: { equals: key, mode: "insensitive" },
            isDeleted: false,
            NOT: { id: sectionKeyId },
        },
    });

    if (existingSectionKey) {
        return res.respond(400, "Section Key with this key already exists!");
    }

    const updatedSectionKey = await prisma.sectionKey.update({
        where: { id: sectionKeyId },
        data: { key, label },
    });

    res.respond(200, "Section Key updated successfully!", updatedSectionKey);
});


// ##########----------Get All Section Keys (Admin)----------##########
const getAllSectionKeys = asyncHandler(async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search || "";

    const skip = (page - 1) * limit;

    const whereCondition = {
        ...(search && {
            OR: [
                { key: { contains: search, mode: "insensitive" } },
                { label: { contains: search, mode: "insensitive" } },
            ],
        }),
    };

    const [sectionKeys, totalCount] = await Promise.all([
        prisma.sectionKey.findMany({
            where: whereCondition,
            orderBy: { createdAt: "desc" },
            skip,
            take: limit,
        }),
        prisma.sectionKey.count({ where: whereCondition }),
    ]);

    res.respond(200, "Section Keys fetched successfully!", {
        pagination: {
            totalCount,
            totalPages: Math.ceil(totalCount / limit),
            currentPage: page,
            limit,
        },
        data: sectionKeys,
    });
});


// ##########----------Get All Section Keys For Manager----------##########
const getAllSectionKeysForManager = asyncHandler(async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search || "";

    const skip = (page - 1) * limit;

    const whereCondition = {
        isDeleted: false,
        ...(search && {
            OR: [
                { key: { contains: search, mode: "insensitive" } },
                { label: { contains: search, mode: "insensitive" } },
            ],
        }),
    };

    const [sectionKeys, totalCount] = await Promise.all([
        prisma.sectionKey.findMany({
            where: whereCondition,
            orderBy: { key: "asc" },
            skip,
            take: limit,
        }),
        prisma.sectionKey.count({ where: whereCondition }),
    ]);

    res.respond(200, "Section Keys fetched successfully!", {
        pagination: {
            totalCount,
            totalPages: Math.ceil(totalCount / limit),
            currentPage: page,
            limit,
        },
        data: sectionKeys,
    });
});


// ##########----------Soft Delete Section Key----------##########
const softDeleteSectionKey = asyncHandler(async (req, res) => {
    const { sectionKeyId } = req.params;

    const activeFieldKeys = await prisma.fieldKey.count({
        where: {
            sectionKeyId,
            isDeleted: false,
        },
    });

    if (activeFieldKeys > 0) {
        return res.respond(
            400,
            "Cannot delete Section Key with active Field Keys!"
        );
    }

    const deletedSectionKey = await prisma.sectionKey.update({
        where: { id: sectionKeyId },
        data: { isDeleted: true },
    });

    res.respond(
        200,
        "Section Key deleted (Soft Delete) successfully!",
        deletedSectionKey
    );
});

// ####################--------------------Field Key Controllers--------------------####################
// ##########----------Create Field Key----------##########
const createFieldKey = asyncHandler(async (req, res) => {
    const { sectionKeyId, key, label } = req.body;

    if (!sectionKeyId || !key || !label) {
        return res.respond(400, "Section key, field key and label are required!");
    }

    const sectionKey = await prisma.sectionKey.findFirst({
        where: { id: sectionKeyId, isDeleted: false },
    });

    if (!sectionKey) {
        return res.respond(404, "Section Key not found!");
    }

    const existingFieldKey = await prisma.fieldKey.findFirst({
        where: {
            sectionKeyId,
            key: { equals: key, mode: "insensitive" },
            isDeleted: false,
        },
    });

    if (existingFieldKey) {
        return res.respond(400, "Field Key already exists in this section!");
    }

    const newFieldKey = await prisma.fieldKey.create({
        data: { sectionKeyId, key, label },
    });

    res.respond(201, "Field Key created successfully!", newFieldKey);
});

// ##########----------Update Field Key----------##########
const updateFieldKey = asyncHandler(async (req, res) => {
    const { sectionKeyId, key, label } = req.body;
    const { fieldKeyId } = req.params;

    if (!sectionKeyId || !key || !label) {
        return res.respond(400, "Section key, field key and label are required!");
    }

    const sectionKey = await prisma.sectionKey.findFirst({
        where: { id: sectionKeyId, isDeleted: false },
    });

    if (!sectionKey) {
        return res.respond(404, "Section Key not found!");
    }

    const existingFieldKey = await prisma.fieldKey.findFirst({
        where: {
            sectionKeyId,
            key: { equals: key, mode: "insensitive" },
            isDeleted: false,
            NOT: { id: fieldKeyId },
        },
    });

    if (existingFieldKey) {
        return res.respond(400, "Field Key already exists in this section!");
    }

    const updatedFieldKey = await prisma.fieldKey.update({
        where: { id: fieldKeyId },
        data: { sectionKeyId, key, label },
    });

    res.respond(200, "Field Key updated successfully!", updatedFieldKey);
});

// ##########----------Get All Field Keys----------##########
const getAllFieldKeys = asyncHandler(async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search || "";
    const sectionKeyId = req.query.sectionKeyId;

    const skip = (page - 1) * limit;

    const whereCondition = {
        ...(sectionKeyId && { sectionKeyId }),
        ...(search && {
            OR: [
                { key: { contains: search, mode: "insensitive" } },
                { label: { contains: search, mode: "insensitive" } },
                {
                    SectionKey: {
                        label: { contains: search, mode: "insensitive" },
                    },
                },
            ],
        }),
    };

    const [fieldKeys, totalCount] = await Promise.all([
        prisma.fieldKey.findMany({
            where: whereCondition,
            include: {
                SectionKey: { select: { id: true, key: true, label: true } },
            },
            orderBy: { createdAt: "desc" },
            skip,
            take: limit,
        }),
        prisma.fieldKey.count({ where: whereCondition }),
    ]);

    res.respond(200, "Field Keys fetched successfully!", {
        pagination: {
            totalCount,
            totalPages: Math.ceil(totalCount / limit),
            currentPage: page,
            limit,
        },
        data: fieldKeys,
    });
});

// ##########----------Get All Field Keys For Manager----------##########
const getAllFieldKeysForManager = asyncHandler(async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search || "";
    const sectionKeyId = req.query.sectionKeyId;

    const skip = (page - 1) * limit;

    const whereCondition = {
        isDeleted: false,
        ...(sectionKeyId && { sectionKeyId }),
        ...(search && {
            OR: [
                { key: { contains: search, mode: "insensitive" } },
                { label: { contains: search, mode: "insensitive" } },
            ],
        }),
    };

    const [fieldKeys, totalCount] = await Promise.all([
        prisma.fieldKey.findMany({
            where: whereCondition,
            include: {
                SectionKey: { select: { id: true, key: true, label: true } },
            },
            orderBy: { key: "asc" },
            skip,
            take: limit,
        }),
        prisma.fieldKey.count({ where: whereCondition }),
    ]);

    res.respond(200, "Field Keys fetched successfully!", {
        pagination: {
            totalCount,
            totalPages: Math.ceil(totalCount / limit),
            currentPage: page,
            limit,
        },
        data: fieldKeys,
    });
});

// ##########----------Soft Delete Field Key----------##########
const softDeleteFieldKey = asyncHandler(async (req, res) => {
    const { fieldKeyId } = req.params;

    const deletedFieldKey = await prisma.fieldKey.update({
        where: { id: fieldKeyId },
        data: { isDeleted: true },
    });

    res.respond(200, "Field Key deleted (Soft Delete) successfully!", deletedFieldKey);
});

module.exports = {
    createSectionKey,
    updateSectionKey,
    getAllSectionKeys,
    getAllSectionKeysForManager,
    softDeleteSectionKey,

    createFieldKey,
    updateFieldKey,
    getAllFieldKeys,
    getAllFieldKeysForManager,
    softDeleteFieldKey,
};
