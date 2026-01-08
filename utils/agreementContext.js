const buildAgreementContext = async (loan) => {
    return {
        CUSTOMER: {
            FIRST_NAME: loan.LoanFormData?.formJsonData.basicDetails.firstName ?? "",
            MIDDLE_NAME: loan.LoanFormData?.formJsonData.basicDetails.middleName ?? "",
            LAST_NAME: loan.LoanFormData?.formJsonData.basicDetails.lastName ?? "",
            MOBILE: loan.LoanFormData?.formJsonData.basicDetails.phone ?? "",
        },

        LOAN: {
            AMOUNT: loan.LoanApprovedData?.approvedAmount ?? "",
            TENURE: loan.LoanApprovedData?.tenure ?? "",
            INTEREST_RATE: loan.LoanApprovedData?.interestRate ?? "",
        },

        EMI: {
            AMOUNT: loan.LoanEmiDetails?.emiAmount ?? "",
            TOTAL_PAYABLE: loan.LoanEmiDetails?.totalPayable ?? "",
        },

        META: {
            AGREEMENT_DATE: new Date().toLocaleDateString("en-IN"),
            LOAN_APPLICATION_ID: loan.loanCode ?? "",
        },

        POLICY: {
            PREPAYMENT_ALLOWED: loan.masterProduct?.allowPrepayment ?? false,
        },
    };
};

module.exports = { buildAgreementContext };
