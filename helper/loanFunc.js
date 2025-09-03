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