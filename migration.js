const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function fixFields(tableName, findFn, updateFn) {
    const records = await findFn();

    console.log(`\n🔍 Checking ${tableName}: ${records.length} records`);

    for (const record of records) {
        const data = record.fieldsJsonData;

        if (typeof data === "string") {
            try {
                const parsed = JSON.parse(data);

                await updateFn(record.id, parsed);

                console.log(`✅ Fixed ${tableName} ID: ${record.id}`);
            } catch (err) {
                console.error(
                    `❌ Failed to parse ${tableName} ID: ${record.id}`,
                    err.message
                );
            }
        }
    }
}

async function main() {
    await fixFields(
        "MasterProductFields",
        () => prisma.masterProductFields.findMany(),
        (id, parsed) =>
            prisma.masterProductFields.update({
                where: { id },
                data: { fieldsJsonData: parsed },
            })
    );

    await fixFields(
        "MasterProductFieldsUpdateRequest",
        () => prisma.masterProductFieldsUpdateRequest.findMany(),
        (id, parsed) =>
            prisma.masterProductFieldsUpdateRequest.update({
                where: { id },
                data: { fieldsJsonData: parsed },
            })
    );
}

main()
    .then(() => {
        console.log("\n🎉 Migration completed successfully");
    })
    .catch((e) => {
        console.error("🚨 Migration failed", e);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
