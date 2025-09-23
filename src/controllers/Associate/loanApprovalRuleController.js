const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// Create Approval Rule
const createApprovalRule = asyncHandler(async (req, res) => {
    const { minScore, maxScore, description, steps } = req.body;
    /**
     * steps = [
     *   { level: 1, roleId: "uuid-role-ops" },
     *   { level: 2, roleId: "uuid-role-risk" }
     * ]
     */

    if (!steps || steps.length === 0) {
        return res.respond(400, "At least one approval step is required");
    }

    const approvalRule = await prisma.approvalRule.create({
        data: {
            minScore,
            maxScore,
            description,
            steps: {
                create: steps.map(step => ({
                    level: step.level,
                    roleId: step.roleId,
                }))
            }
        },
        include: { steps: true }
    });

    return res.respond(201, "Approval Rule created successfully", approvalRule);
});

// Get All Approval Rules
const getAllApprovalRules = asyncHandler(async (req, res) => {
    const rules = await prisma.approvalRule.findMany({
        where: { isDeleted: false },
        include: {
            steps: {
                orderBy: { level: "asc" },
                include: {
                    // If role model is SubAdminRole
                    role: true
                }
            }
        }
    });

    return res.respond(200, "Approval Rules fetched successfully", rules);
});

// Update Approval Rule
const updateApprovalRule = asyncHandler(async (req, res) => {
    const { ruleId } = req.params;
    const { minScore, maxScore, description, steps } = req.body;

    const existingRule = await prisma.approvalRule.findUnique({
        where: { id: ruleId, isDeleted: false }
    });

    if (!existingRule) {
        return res.respond(404, "Approval Rule not found");
    }

    const updatedRule = await prisma.$transaction(async (tx) => {
        await tx.approvalRuleStep.deleteMany({ where: { approvalRuleId: ruleId } });

        return await tx.approvalRule.update({
            where: { id: ruleId },
            data: {
                minScore,
                maxScore,
                description,
                steps: {
                    create: steps.map(step => ({
                        level: step.level,
                        roleId: step.roleId,
                    }))
                }
            },
            include: { steps: true }
        });
    });

    return res.respond(200, "Approval Rule updated successfully", updatedRule);
});

// Soft Delete Approval Rule
const deleteApprovalRule = asyncHandler(async (req, res) => {
    const { ruleId } = req.params;

    await prisma.approvalRule.update({
        where: { id: ruleId },
        data: { isDeleted: true }
    });

    return res.respond(200, "Approval Rule deleted successfully");
});

module.exports = {
    createApprovalRule,
    getAllApprovalRules,
    updateApprovalRule,
    deleteApprovalRule,
}