async function selectFinanceManager(tx, currentFinance = null) {
    const financeManagers = await tx.associateSubAdmin.findMany({
        where: {
            role: { roleName: "Finance" },
            isActive: true,
            isDeleted: false
        },
        select: {
            id: true,
            name: true,
            createdAt: true
        }
    });

    if (!financeManagers.length) {
        throw new Error("No active Finance Manager found");
    }

    const filteredFinanceManagers = currentFinance ? financeManagers.filter(f => f.id !== currentFinance) : financeManagers;

    if (!filteredFinanceManagers.length) {
        throw new Error("No other Finance Manager available to assign");
    }

    const financeIds = filteredFinanceManagers.map((f) => f.id);

    const financeLoad = await tx.loanApplication.groupBy({
        by: ["approverId"],
        _count: { id: true },
        where: {
            approverId: { in: financeIds },
            isDeleted: false
        }
    });

    const loadMap = {};
    financeLoad.forEach((row) => {
        loadMap[row.approverId] = row._count.id;
    });

    const financeWithLoad = filteredFinanceManagers.map((f) => ({
        id: f.id,
        name: f.name,
        createdAt: f.createdAt,
        load: loadMap[f.id] || 0
    }));

    financeWithLoad.sort((a, b) => {
        if (a.load !== b.load) return a.load - b.load;
        return Math.random() - 0.5;
    });

    return financeWithLoad[0];
}

module.exports = { selectFinanceManager };
