const validateVariantAgainstMaster = (variantData, masterProduct) => {
    const errors = [];

    if (masterProduct.financialTerms && variantData.parameterUpdate) {
        const masterFinancial = masterProduct.financialTerms;
        const variantFinancial = variantData.parameterUpdate;

        if (variantFinancial.minLoanAmount !== undefined) {
            if (variantFinancial.minLoanAmount < masterFinancial.minLoanAmount) {
                errors.push(
                    `Variant minLoanAmount (${variantFinancial.minLoanAmount}) cannot be less than Master's minLoanAmount (${masterFinancial.minLoanAmount})`
                );
            }
        }

        if (variantFinancial.maxLoanAmount !== undefined) {
            if (variantFinancial.maxLoanAmount > masterFinancial.maxLoanAmount) {
                errors.push(
                    `Variant maxLoanAmount (${variantFinancial.maxLoanAmount}) cannot exceed Master's maxLoanAmount (${masterFinancial.maxLoanAmount})`
                );
            }
        }

        if (variantFinancial.minTenureMonths !== undefined) {
            if (variantFinancial.minTenureMonths < masterFinancial.minTenureMonths) {
                errors.push(
                    `Variant minTenureMonths (${variantFinancial.minTenureMonths}) cannot be less than Master's minTenureMonths (${masterFinancial.minTenureMonths})`
                );
            }
        }

        if (variantFinancial.maxTenureMonths !== undefined) {
            if (variantFinancial.maxTenureMonths > masterFinancial.maxTenureMonths) {
                errors.push(
                    `Variant maxTenureMonths (${variantFinancial.maxTenureMonths}) cannot exceed Master's maxTenureMonths (${masterFinancial.maxTenureMonths})`
                );
            }
        }

        if (variantFinancial.interestRateMin !== undefined) {
            if (variantFinancial.interestRateMin < masterFinancial.interestRateMin) {
                errors.push(
                    `Variant interestRateMin (${variantFinancial.interestRateMin}%) cannot be less than Master's interestRateMin (${masterFinancial.interestRateMin}%)`
                );
            }
        }

        if (variantFinancial.interestRateMax !== undefined) {
            if (variantFinancial.interestRateMax > masterFinancial.interestRateMax) {
                errors.push(
                    `Variant interestRateMax (${variantFinancial.interestRateMax}%) cannot exceed Master's interestRateMax (${masterFinancial.interestRateMax}%)`
                );
            }
        }

        if (variantFinancial.processingFeeValue !== undefined) {
            if (variantFinancial.processingFeeValue > masterFinancial.processingFeeValue) {
                errors.push(
                    `Variant processingFeeValue (${variantFinancial.processingFeeValue}) cannot exceed Master's processingFeeValue (${masterFinancial.processingFeeValue})`
                );
            }
        }

        if (variantFinancial.latePaymentFeeValue !== undefined) {
            if (variantFinancial.latePaymentFeeValue > masterFinancial.latePaymentFeeValue) {
                errors.push(
                    `Variant latePaymentFeeValue (${variantFinancial.latePaymentFeeValue}) cannot exceed Master's latePaymentFeeValue (${masterFinancial.latePaymentFeeValue})`
                );
            }
        }

        if (variantFinancial.prepaymentFeeValue !== undefined) {
            if (variantFinancial.prepaymentFeeValue > masterFinancial.prepaymentFeeValue) {
                errors.push(
                    `Variant prepaymentFeeValue (${variantFinancial.prepaymentFeeValue}) cannot exceed Master's prepaymentFeeValue (${masterFinancial.prepaymentFeeValue})`
                );
            }
        }

        if (variantFinancial.penalInterestRate !== undefined && masterFinancial.penalRate !== undefined) {
            if (variantFinancial.penalInterestRate > masterFinancial.penalRate) {
                errors.push(
                    `Variant penalInterestRate (${variantFinancial.penalInterestRate}%) cannot exceed Master's penalRate (${masterFinancial.penalRate}%)`
                );
            }
        }
    }

    if (masterProduct.eligibilityCriteria && variantData.parameterUpdate) {
        const masterEligibility = masterProduct.eligibilityCriteria;
        const variantParams = variantData.parameterUpdate;

        if (variantParams.minAge !== undefined) {
            if (variantParams.minAge < masterEligibility.minAge) {
                errors.push(
                    `Variant minAge (${variantParams.minAge}) cannot be less than Master's minAge (${masterEligibility.minAge})`
                );
            }
        }

        if (variantParams.maxAge !== undefined) {
            if (variantParams.maxAge > masterEligibility.maxAge) {
                errors.push(
                    `Variant maxAge (${variantParams.maxAge}) cannot exceed Master's maxAge (${masterEligibility.maxAge})`
                );
            }
        }

        if (variantParams.minAge !== undefined && variantParams.maxAge !== undefined) {
            if (variantParams.minAge > variantParams.maxAge) {
                errors.push(
                    `Variant minAge (${variantParams.minAge}) cannot be greater than maxAge (${variantParams.maxAge})`
                );
            }
        }
    }

    if (masterProduct.masterProductOtherCharges && variantData.otherChargesUpdate) {
        const masterCharges = masterProduct.masterProductOtherCharges;
        const variantCharges = variantData.otherChargesUpdate;

        const chargeFields = [
            'chequeBounceCharge',
            'dublicateNocCharge',
            'furnishingCharge',
            'chequeSwapCharge',
            'revocation',
            'documentCopyCharge',
            'stampDutyCharge',
            'nocCharge',
            'incidentalCharge'
        ];

        chargeFields.forEach(field => {
            if (variantCharges[field] !== undefined && masterCharges[field] !== undefined) {
                if (variantCharges[field] > masterCharges[field]) {
                    errors.push(
                        `Variant ${field} (${variantCharges[field]}) cannot exceed Master's ${field} (${masterCharges[field]})`
                    );
                }
            }
        });
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

module.exports = { validateVariantAgainstMaster };