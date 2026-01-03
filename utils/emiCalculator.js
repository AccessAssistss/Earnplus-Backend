// ##########----------Flat EMI Calculator----------##########
const calculateFlatEmi = ({ principal, rate, tenure }) => {
    const totalInterest = (principal * rate * tenure) / 1200;
    const totalPayable = principal + totalInterest;
    const emiAmount = totalPayable / tenure;

    return {
        emiAmount: Number(emiAmount.toFixed(2)),
        principalEmi: Number((principal / tenure).toFixed(2)),
        interestEmi: Number((totalInterest / tenure).toFixed(2)),
        totalInterest: Number(totalInterest.toFixed(2)),
        totalPayable: Number(totalPayable.toFixed(2)),
        meta: {
            interestType: "FLAT",
            formula: "P × R × N / 1200",
            principal,
            rate,
            tenure,
            calculatedAt: new Date().toISOString(),
        },
    };
};

// ##########----------Reducing EMI Calculator----------##########
const calculateReducingEmi = ({ principal, rate, tenure }) => {
    const monthlyRate = rate / 1200;

    const emi =
        (principal *
            monthlyRate *
            Math.pow(1 + monthlyRate, tenure)) /
        (Math.pow(1 + monthlyRate, tenure) - 1);

    const totalPayable = emi * tenure;
    const totalInterest = totalPayable - principal;

    return {
        emiAmount: Number(emi.toFixed(2)),
        principalEmi: null,
        interestEmi: null,
        totalInterest: Number(totalInterest.toFixed(2)),
        totalPayable: Number(totalPayable.toFixed(2)),
        meta: {
            interestType: "REDUCING",
            formula: "Reducing balance EMI formula",
            principal,
            rate,
            tenure,
            calculatedAt: new Date().toISOString(),
        },
    };
};

const calculateEmi = ({ interestType = "FLAT", ...payload }) => {
    switch (interestType) {
        case "REDUCING":
            return calculateReducingEmi(payload);

        case "FLAT":
        default:
            return calculateFlatEmi(payload);
    }
};

module.exports = {
    calculateFlatEmi,
    calculateReducingEmi,
    calculateEmi
};
