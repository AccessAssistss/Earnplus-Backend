const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// ##########----------Create Query----------##########
const createQuery = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { queryType, subject, description } = req.body

    const employee = await prisma.employee.findUnique({
        where: { userId }
    });
    if (!employee) {
        return res.respond(404, "Customer not found!");
    }

    if (!queryType, !subject, !description) {
        return res.respond(400, "All fields required!");
    }

    const queryFile = req.files?.file?.[0];

    const queryFileUrl = queryFile
        ? `/uploads/employee/query/file/${queryFile.filename}`
        : null;

    const query = await prisma.employeeQuery.create({
        data: {
            employeeId: employee.id,
            queryType,
            subject,
            description,
            file: queryFileUrl,
        }
    });

    res.respond(201, "Query raised successfully!", query);
});

// ##########----------Create Query----------##########
const getQueries = asyncHandler(async (req, res) => {
    const queries = await prisma.employeeQuery.findMany({})

    res.respond(200, "Query fetched successfully!", queries);
});

module.exports = {
    createQuery,
    getQueries
}