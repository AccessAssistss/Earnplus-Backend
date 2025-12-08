// ##########----------Select Oerational Manager Function----------##########
async function selectOpsManager(tx, currentOps = null) {
    const opsManagers = await tx.associateSubAdmin.findMany({
        where: {
            role: { roleName: "Ops" },
            isActive: true,
            isDeleted: false
        },
        select: {
            id: true,
            name: true,
            createdAt: true
        }
    });

    if (!opsManagers.length) {
        throw new Error("No active Ops Manager found");
    }

    const filteredOpsManagers = currentOps ? opsManagers.filter(o => o.id !== currentOps) : opsManagers;

    if (!filteredOpsManagers.length) {
        throw new Error("No other Ops Manager available to assign");
    }

    const opsIds = filteredOpsManagers.map((o) => o.id);

    const opsLoad = await tx.loanApplication.groupBy({
        by: ["approverId"],
        _count: { id: true },
        where: {
            approverId: { in: opsIds },
            isDeleted: false
        }
    });

    const loadMap = {};
    opsLoad.forEach((row) => {
        loadMap[row.approverId] = row._count.id;
    });

    const opsWithLoad = filteredOpsManagers.map((o) => ({
        id: o.id,
        name: o.name,
        createdAt: o.createdAt,
        load: loadMap[o.id] || 0
    }));

    opsWithLoad.sort((a, b) => {
        if (a.load !== b.load) return a.load - b.load;
        return Math.random() - 0.5;
    });

    return opsWithLoad[0];
}

// ##########----------Select Senior Operational Manager Function----------##########
async function selectSeniorOpsManager(tx, currentSeniorOps = null) {
    const seniorOpsManagers = await tx.associateSubAdmin.findMany({
        where: {
            role: { roleName: "Senior_Ops" },
            isActive: true,
            isDeleted: false
        },
        select: { id: true, name: true, createdAt: true }
    });

    if (!seniorOpsManagers.length)
        throw new Error("No active Senior Ops found");

    const filtered = currentSeniorOps
        ? seniorOpsManagers.filter(s => s.id !== currentSeniorOps)
        : seniorOpsManagers;

    if (!filtered.length)
        throw new Error("No other Senior Ops available");

    const ids = filtered.map(s => s.id);

    const loadRows = await tx.loanApplication.groupBy({
        by: ["approverId"],
        where: {
            approverId: { in: ids },
            isDeleted: false
        },
        _count: { id: true }
    });

    const loadMap = {};
    loadRows.forEach(row => (loadMap[row.approverId] = row._count.id));

    const seniorWithLoad = filtered.map(s => ({
        ...s,
        load: loadMap[s.id] || 0
    }));

    seniorWithLoad.sort((a, b) => {
        if (a.load !== b.load) return a.load - b.load;
        return Math.random() - 0.5;
    });

    return seniorWithLoad[0];
}

module.exports = { selectOpsManager, selectSeniorOpsManager };
