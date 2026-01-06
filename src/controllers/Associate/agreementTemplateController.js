const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// ##########----------Create Agreement Template----------##########
const createAgreementTemplate = asyncHandler(async (req, res) => {
    const { name, contextSchema } = req.body;
    if (!name) {
        return res.respond(400, "Agreement Template name is required!");
    }

    const existingTemplate = await prisma.agreementTemplate.findFirst({
        where: {
            name: { equals: name, mode: "insensitive" },
            isDeleted: false,
        },
    });

    if (existingTemplate) {
        return res.respond(400, "Agreement Template with this name already exists!");
    }

    const pathFile = req.files?.path?.[0];
    if (!pathFile) {
        return res.respond(400, "HTML template file is required!");
    }

    const isHtmlFile =
        pathFile.originalname.endsWith(".html") ||
        pathFile.originalname.endsWith(".htm");

    if (!isHtmlFile) {
        return res.respond(400, "Only .html files are allowed for agreement templates!");
    }

    let parsedContextSchema = null;
    if (contextSchema) {
        try {
            parsedContextSchema =
                typeof contextSchema === "string"
                    ? JSON.parse(contextSchema)
                    : contextSchema;
        } catch (error) {
            return res.respond(400, "Invalid contextSchema JSON!");
        }
    }

    const pathUrl = `/uploads/agreement/templates/${pathFile.filename}`;

    const newTemplate = await prisma.agreementTemplate.create({
        data: {
            name,
            path: pathUrl,
            contextSchema: parsedContextSchema,
        },
    });

    return res.respond(
        201,
        "Agreement Template Created Successfully!",
        newTemplate
    );
});

// ##########----------Update Agreement Template----------##########
const updateAgreementTemplate = asyncHandler(async (req, res) => {
    const { templateId } = req.params;
    const { name, contextSchema } = req.body;

    const pathFile = req.files?.path?.[0];

    if (!name && !pathFile && !contextSchema) {
        return res.respond(400, "Nothing to update!");
    }

    if (name) {
        const existingTemplate = await prisma.agreementTemplate.findFirst({
            where: {
                name: { equals: name, mode: "insensitive" },
                isDeleted: false,
                NOT: { id: templateId },
            },
        });

        if (existingTemplate) {
            return res.respond(400, "Agreement Template with this name already exists!");
        }
    }

    let pathUrl;
    if (pathFile) {
        const isHtmlFile =
            pathFile.originalname.endsWith(".html") ||
            pathFile.originalname.endsWith(".htm");

        if (!isHtmlFile) {
            return res.respond(400, "Only .html files are allowed for agreement templates!");
        }
        pathUrl = `/uploads/agreement/templates/${pathFile.filename}`;
    }

    let parsedContextSchema;
    if (contextSchema !== undefined) {
        try {
            parsedContextSchema =
                typeof contextSchema === "string"
                    ? JSON.parse(contextSchema)
                    : contextSchema;
        } catch (error) {
            return res.respond(400, "Invalid contextSchema JSON!");
        }
    }

    const updatedTemplate = await prisma.agreementTemplate.update({
        where: { id: templateId },
        data: {
            ...(name && { name }),
            ...(pathUrl && { path: pathUrl }),
            ...(contextSchema !== undefined && {
                contextSchema: parsedContextSchema,
            }),
        },
    });

    return res.respond(
        200,
        "Agreement Template Updated Successfully!",
        updatedTemplate
    );
});

// ##########----------Get All Agreement Templates----------##########
const getAllAgreementTemplates = asyncHandler(async (req, res) => {
    const templates = await prisma.agreementTemplate.findMany({
        orderBy: { createdAt: "desc" },
    });

    return res.respond(
        200,
        "Agreement Templates fetched successfully!",
        templates
    );
});

// ##########----------Get Agreement Templates For Manager----------##########
const getAgreementTemplateForManager = asyncHandler(async (req, res) => {
    const templates = await prisma.agreementTemplate.findMany({
        where: { isDeleted: false },
        select: {
            id: true,
            name: true,
        },
        orderBy: { createdAt: "desc" },
    });

    return res.respond(
        200,
        "Agreement Templates fetched successfully!",
        templates
    );
});

// ##########----------Soft Delete Agreement Template----------##########
const softDeleteAgreementTemplate = asyncHandler(async (req, res) => {
    const { templateId } = req.params;

    const deletedTemplate = await prisma.agreementTemplate.update({
        where: { id: templateId },
        data: { isDeleted: true },
    });

    return res.respond(
        200,
        "Agreement Template deleted (Soft Delete) Successfully!",
        deletedTemplate
    );
});

module.exports = {
    createAgreementTemplate,
    updateAgreementTemplate,
    getAllAgreementTemplates,
    getAgreementTemplateForManager,
    softDeleteAgreementTemplate,
};