export async function logLoanHistory(tx, loanApplicationId, performedById, action, remarks = null) {
  await tx.loanApplicationHistory.create({
    data: {
      loanApplicationId,
      performedById,
      action,
      remarks,
    },
  });
}

export async function safeCreateAssignment(tx, loanApplicationId, creditManagerId, sequenceOrder, active) {
  const exists = await tx.loanApplicationAssignment.findFirst({
    where: { loanApplicationId, creditManagerId, isDeleted: false },
  });
  if (!exists) {
    return tx.loanApplicationAssignment.create({
      data: {
        loanApplicationId,
        creditManagerId,
        sequenceOrder,
        status: "PENDING",
        active
      },
    });
  }
  return exists;
}