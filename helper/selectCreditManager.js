// ##########----------Select Credit Manager By Score Function----------##########
async function selectCreditManagerByScore(tx, masterProductId, score) {
    const rule = await tx.productCreditAssignmentRule.findFirst({
        where: {
            masterProductId,
            minScore: { lte: score },
            maxScore: { gte: score },
            isDeleted: false
        }
    });

    if (!rule) {
        throw new Error(`No credit assignment rule defined for score ${score}`);
    }

    const creditRole = rule.creditRole;

    const creditManagers = await tx.associateSubAdmin.findMany({
        where: {
            role: { roleName: creditRole },
            isActive: true,
            isDeleted: false
        },
        select: {
            id: true,
            name: true,
            createdAt: true
        }
    });

    if (!creditManagers.length) {
        throw new Error(`No active credit managers found for role ${creditRole}`);
    }

    const managerIds = creditManagers.map(cm => cm.id);

    const loadRows = await tx.loanApplication.groupBy({
        by: ["approverId"],
        where: {
            approverId: { in: managerIds },
            isDeleted: false
        },
        _count: { id: true }
    });

    const loadMap = {};
    loadRows.forEach(r => loadMap[r.approverId] = r._count.id);

    const managersWithLoad = creditManagers.map(cm => ({
        ...cm,
        load: loadMap[cm.id] || 0
    }));

    managersWithLoad.sort((a, b) => {
        if (a.load !== b.load) return a.load - b.load;
        return Math.random() - 0.5;
    });

    return managersWithLoad[0];
}

// ##########----------Select Credit Manager By Role Function----------##########
async function selectCreditManagerByRole(tx, creditRole, currentCredit = null) {
    const creditManagers = await tx.associateSubAdmin.findMany({
        where: {
            role: { roleName: creditRole },
            isActive: true,
            isDeleted: false
        },
        select: {
            id: true,
            name: true,
            createdAt: true
        }
    });

    if (!creditManagers.length) {
        throw new Error(`No active credit managers found for role ${creditRole}`);
    }

    const filtered = currentCredit
        ? creditManagers.filter(cm => cm.id !== currentCredit)
        : creditManagers;

    if (!filtered.length) {
        throw new Error(`No other credit manager available in ${creditRole}`);
    }

    const managerIds = filtered.map(cm => cm.id);

    const loadRows = await tx.loanApplication.groupBy({
        by: ["approverId"],
        where: {
            approverId: { in: managerIds },
            isDeleted: false
        },
        _count: { id: true }
    });

    const loadMap = {};
    loadRows.forEach(r => loadMap[r.approverId] = r._count.id);

    const managersWithLoad = filtered.map(cm => ({
        ...cm,
        load: loadMap[cm.id] || 0
    }));

    managersWithLoad.sort((a, b) => {
        if (a.load !== b.load) return a.load - b.load;
        return Math.random() - 0.5;
    });

    return managersWithLoad[0];
}

module.exports = { selectCreditManagerByScore, selectCreditManagerByRole };
