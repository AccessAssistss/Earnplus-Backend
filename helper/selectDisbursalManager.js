// ##########----------Select Disbursal Manager----------##########
async function selectDisbursalManager(tx, currentDisbursal = null) {
    const disbursalManagers = await tx.associateSubAdmin.findMany({
        where: {
            role: { roleName: "Disbursal" },
            isActive: true,
            isDeleted: false
        },
        select: { id: true, name: true, createdAt: true }
    });

    if (!disbursalManagers.length)
        throw new Error("No active Disbursal Manager found");

    const filtered = currentDisbursal
        ? disbursalManagers.filter(u => u.id !== currentDisbursal)
        : disbursalManagers;

    if (!filtered.length)
        throw new Error("No other Disbursal Manager available");

    const ids = filtered.map(u => u.id);

    const loadRows = await tx.loanApplication.groupBy({
        by: ["approverId"],
        where: {
            approverId: { in: ids },
            isDeleted: false
        },
        _count: { id: true }
    });

    const loadMap = {};
    loadRows.forEach(r => (loadMap[r.approverId] = r._count.id));

    const managersWithLoad = filtered.map(u => ({
        ...u,
        load: loadMap[u.id] || 0
    }));

    managersWithLoad.sort((a, b) => {
        if (a.load !== b.load) return a.load - b.load;
        return Math.random() - 0.5;
    });

    return managersWithLoad[0];
}

module.exports = { selectDisbursalManager };
