import { describe, it, expect } from "vitest";
import type {
  CommissionCalculationInput,
  CommissionCalculationResult,
  CommissionRules,
  AccountType,
  AgreementTerm,
  QuotaLevel,
  PricingLine,
  BusinessType,
} from "../../../backendservice/types/commission.types";

const DEFAULT_RULES: CommissionRules = {
  quotaRates: {
    below: 3,
    above: 6,
    double: 9,
  },
  agreementMultipliers: {
    "3-year": 135,
    "1-year": 100,
    "MTM-with-install": 100,
    "MTM-no-install": 50,
  },
  accountTypeAdjustments: {
    Anchor: 0,
    Bread5: -1,
    Bread15: -0.5,
    Pit: 0,
  },
  greenlineBonus: 1,
  renewalBonusRate: 4,
  renewalMinYears: 2,
  insideSalesDeduction: -3,
  anchorMinMonthlyValue: 200,
};

function calculateCommission(
  input: CommissionCalculationInput,
  rules: CommissionRules = DEFAULT_RULES
): CommissionCalculationResult {
  const baseRate = rules.quotaRates[input.quotaLevel] || 3;
  const agreementMultiplier = rules.agreementMultipliers[input.agreementTerm] || 100;
  const accountTypeAdjustment = rules.accountTypeAdjustments[input.accountType] || 0;
  const greenlineBonus = input.pricingLine === "Greenline" ? rules.greenlineBonus : 0;
  const renewalBonus =
    input.businessType === "renewal" &&
    input.yearsAsCustomer !== undefined &&
    input.yearsAsCustomer >= rules.renewalMinYears
      ? rules.renewalBonusRate
      : 0;
  const insideSalesDeduction = input.isInsideSales ? rules.insideSalesDeduction : 0;

  const effectiveBaseRate =
    baseRate + accountTypeAdjustment + greenlineBonus + renewalBonus + insideSalesDeduction;
  const finalCommissionRate = effectiveBaseRate * (agreementMultiplier / 100);
  const monthlyCommission = input.monthlyValue * (finalCommissionRate / 100);
  const annualCommission = monthlyCommission * 12;

  return {
    input,
    breakdown: {
      baseRate,
      agreementMultiplier,
      accountTypeAdjustment,
      greenlineBonus,
      renewalBonus,
      insideSalesDeduction,
    },
    effectiveBaseRate,
    finalCommissionRate,
    monthlyCommission,
    annualCommission,
  };
}

function createInput(overrides: Partial<CommissionCalculationInput> = {}): CommissionCalculationInput {
  return {
    monthlyValue: 500,
    agreementTerm: "1-year",
    accountType: "Anchor",
    pricingLine: "Redline",
    quotaLevel: "above",
    businessType: "new",
    isInsideSales: false,
    ...overrides,
  };
}

describe("Commission Calculator", () => {
  describe("Quota Levels", () => {
    it("calculates 3% base rate for below quota", () => {
      const input = createInput({ quotaLevel: "below" });
      const result = calculateCommission(input);
      expect(result.breakdown.baseRate).toBe(3);
      expect(result.finalCommissionRate).toBe(3);
    });

    it("calculates 6% base rate for above quota", () => {
      const input = createInput({ quotaLevel: "above" });
      const result = calculateCommission(input);
      expect(result.breakdown.baseRate).toBe(6);
      expect(result.finalCommissionRate).toBe(6);
    });

    it("calculates 9% base rate for double quota", () => {
      const input = createInput({ quotaLevel: "double" });
      const result = calculateCommission(input);
      expect(result.breakdown.baseRate).toBe(9);
      expect(result.finalCommissionRate).toBe(9);
    });
  });

  describe("Agreement Terms", () => {
    it("applies 135% multiplier for 3-year agreement", () => {
      const input = createInput({ agreementTerm: "3-year", quotaLevel: "above" });
      const result = calculateCommission(input);
      expect(result.breakdown.agreementMultiplier).toBe(135);
      expect(result.finalCommissionRate).toBeCloseTo(8.1, 2);
    });

    it("applies 100% multiplier for 1-year agreement", () => {
      const input = createInput({ agreementTerm: "1-year", quotaLevel: "above" });
      const result = calculateCommission(input);
      expect(result.breakdown.agreementMultiplier).toBe(100);
      expect(result.finalCommissionRate).toBe(6);
    });

    it("applies 100% multiplier for MTM with install", () => {
      const input = createInput({ agreementTerm: "MTM-with-install", quotaLevel: "above" });
      const result = calculateCommission(input);
      expect(result.breakdown.agreementMultiplier).toBe(100);
      expect(result.finalCommissionRate).toBe(6);
    });

    it("applies 50% multiplier for MTM no install", () => {
      const input = createInput({ agreementTerm: "MTM-no-install", quotaLevel: "above" });
      const result = calculateCommission(input);
      expect(result.breakdown.agreementMultiplier).toBe(50);
      expect(result.finalCommissionRate).toBe(3);
    });
  });

  describe("Account Types", () => {
    it("applies no adjustment for Anchor accounts", () => {
      const input = createInput({ accountType: "Anchor" });
      const result = calculateCommission(input);
      expect(result.breakdown.accountTypeAdjustment).toBe(0);
    });

    it("applies -1% adjustment for Bread5 accounts", () => {
      const input = createInput({ accountType: "Bread5", quotaLevel: "above" });
      const result = calculateCommission(input);
      expect(result.breakdown.accountTypeAdjustment).toBe(-1);
      expect(result.finalCommissionRate).toBe(5);
    });

    it("applies -0.5% adjustment for Bread15 accounts", () => {
      const input = createInput({ accountType: "Bread15", quotaLevel: "above" });
      const result = calculateCommission(input);
      expect(result.breakdown.accountTypeAdjustment).toBe(-0.5);
      expect(result.finalCommissionRate).toBe(5.5);
    });

    it("applies no adjustment for Pit accounts", () => {
      const input = createInput({ accountType: "Pit" });
      const result = calculateCommission(input);
      expect(result.breakdown.accountTypeAdjustment).toBe(0);
    });
  });

  describe("Pricing Lines", () => {
    it("applies no bonus for Redline pricing", () => {
      const input = createInput({ pricingLine: "Redline" });
      const result = calculateCommission(input);
      expect(result.breakdown.greenlineBonus).toBe(0);
    });

    it("applies +1% bonus for Greenline pricing", () => {
      const input = createInput({ pricingLine: "Greenline", quotaLevel: "above" });
      const result = calculateCommission(input);
      expect(result.breakdown.greenlineBonus).toBe(1);
      expect(result.finalCommissionRate).toBe(7);
    });
  });

  describe("Business Type & Renewals", () => {
    it("applies no renewal bonus for new business", () => {
      const input = createInput({ businessType: "new" });
      const result = calculateCommission(input);
      expect(result.breakdown.renewalBonus).toBe(0);
    });

    it("applies no renewal bonus for renewal with less than 2 years", () => {
      const input = createInput({ businessType: "renewal", yearsAsCustomer: 1 });
      const result = calculateCommission(input);
      expect(result.breakdown.renewalBonus).toBe(0);
    });

    it("applies +4% renewal bonus for 2+ year customer", () => {
      const input = createInput({ businessType: "renewal", yearsAsCustomer: 2, quotaLevel: "above" });
      const result = calculateCommission(input);
      expect(result.breakdown.renewalBonus).toBe(4);
      expect(result.finalCommissionRate).toBe(10);
    });

    it("applies renewal bonus for customers with many years", () => {
      const input = createInput({ businessType: "renewal", yearsAsCustomer: 10, quotaLevel: "above" });
      const result = calculateCommission(input);
      expect(result.breakdown.renewalBonus).toBe(4);
    });
  });

  describe("Inside Sales", () => {
    it("applies no deduction when not inside sales", () => {
      const input = createInput({ isInsideSales: false });
      const result = calculateCommission(input);
      expect(result.breakdown.insideSalesDeduction).toBe(0);
    });

    it("applies -3% deduction for inside sales", () => {
      const input = createInput({ isInsideSales: true, quotaLevel: "above" });
      const result = calculateCommission(input);
      expect(result.breakdown.insideSalesDeduction).toBe(-3);
      expect(result.finalCommissionRate).toBe(3);
    });
  });
});

describe("Full Matrix Testing - All Combinations", () => {
  const quotaLevels: QuotaLevel[] = ["below", "above", "double"];
  const agreementTerms: AgreementTerm[] = ["3-year", "1-year", "MTM-with-install", "MTM-no-install"];
  const accountTypes: AccountType[] = ["Anchor", "Bread5", "Bread15", "Pit"];
  const pricingLines: PricingLine[] = ["Redline", "Greenline"];
  const businessTypes: BusinessType[] = ["new", "renewal"];
  const insideSalesOptions = [false, true];

  describe("Quota x Agreement Matrix (48 combinations)", () => {
    quotaLevels.forEach((quotaLevel) => {
      agreementTerms.forEach((agreementTerm) => {
        accountTypes.forEach((accountType) => {
          it(`${quotaLevel} + ${agreementTerm} + ${accountType}`, () => {
            const input = createInput({ quotaLevel, agreementTerm, accountType });
            const result = calculateCommission(input);

            const expectedBase = DEFAULT_RULES.quotaRates[quotaLevel];
            const expectedMultiplier = DEFAULT_RULES.agreementMultipliers[agreementTerm];
            const expectedAdjustment = DEFAULT_RULES.accountTypeAdjustments[accountType];

            expect(result.breakdown.baseRate).toBe(expectedBase);
            expect(result.breakdown.agreementMultiplier).toBe(expectedMultiplier);
            expect(result.breakdown.accountTypeAdjustment).toBe(expectedAdjustment);

            const expectedEffective = expectedBase + expectedAdjustment;
            expect(result.effectiveBaseRate).toBe(expectedEffective);

            const expectedFinal = expectedEffective * (expectedMultiplier / 100);
            expect(result.finalCommissionRate).toBeCloseTo(expectedFinal, 4);
          });
        });
      });
    });
  });

  describe("Pricing Line x Business Type Matrix", () => {
    pricingLines.forEach((pricingLine) => {
      businessTypes.forEach((businessType) => {
        [0, 1, 2, 3, 5, 10].forEach((yearsAsCustomer) => {
          it(`${pricingLine} + ${businessType} + ${yearsAsCustomer} years`, () => {
            const input = createInput({
              pricingLine,
              businessType,
              yearsAsCustomer,
              quotaLevel: "above",
            });
            const result = calculateCommission(input);

            const expectedGreenline = pricingLine === "Greenline" ? 1 : 0;
            const expectedRenewal =
              businessType === "renewal" && yearsAsCustomer >= 2 ? 4 : 0;

            expect(result.breakdown.greenlineBonus).toBe(expectedGreenline);
            expect(result.breakdown.renewalBonus).toBe(expectedRenewal);
          });
        });
      });
    });
  });

  describe("Inside Sales Impact Across All Quotas", () => {
    quotaLevels.forEach((quotaLevel) => {
      insideSalesOptions.forEach((isInsideSales) => {
        it(`${quotaLevel} quota with inside sales = ${isInsideSales}`, () => {
          const input = createInput({ quotaLevel, isInsideSales });
          const result = calculateCommission(input);

          const expectedDeduction = isInsideSales ? -3 : 0;
          expect(result.breakdown.insideSalesDeduction).toBe(expectedDeduction);

          const baseRate = DEFAULT_RULES.quotaRates[quotaLevel];
          expect(result.effectiveBaseRate).toBe(baseRate + expectedDeduction);
        });
      });
    });
  });
});

describe("Boundary Value Testing", () => {
  describe("Monthly Value Boundaries", () => {
    const boundaryValues = [0, 0.01, 0.99, 1, 99.99, 100, 199.99, 200, 200.01, 499.99, 500, 999.99, 1000, 9999.99, 10000, 99999.99, 100000];

    boundaryValues.forEach((monthlyValue) => {
      it(`handles monthly value of $${monthlyValue}`, () => {
        const input = createInput({ monthlyValue, quotaLevel: "above" });
        const result = calculateCommission(input);

        expect(result.monthlyCommission).toBeCloseTo(monthlyValue * 0.06, 4);
        expect(result.annualCommission).toBeCloseTo(monthlyValue * 0.06 * 12, 4);
      });
    });
  });

  describe("Years as Customer Boundaries", () => {
    const yearsBoundaries = [0, 0.5, 0.99, 1, 1.5, 1.99, 2, 2.01, 3, 5, 10, 20, 50];

    yearsBoundaries.forEach((yearsAsCustomer) => {
      it(`handles ${yearsAsCustomer} years as customer for renewal`, () => {
        const input = createInput({
          businessType: "renewal",
          yearsAsCustomer,
          quotaLevel: "above",
        });
        const result = calculateCommission(input);

        const expectedBonus = yearsAsCustomer >= 2 ? 4 : 0;
        expect(result.breakdown.renewalBonus).toBe(expectedBonus);
      });
    });
  });

  describe("Anchor Minimum Monthly Value", () => {
    const nearAnchorMin = [150, 175, 199, 199.99, 200, 200.01, 225, 250, 300];

    nearAnchorMin.forEach((monthlyValue) => {
      it(`calculates correctly for $${monthlyValue} (anchor min is $200)`, () => {
        const input = createInput({ monthlyValue, accountType: "Anchor" });
        const result = calculateCommission(input);

        expect(result.monthlyCommission).toBeCloseTo(monthlyValue * 0.06, 4);
      });
    });
  });
});

describe("Precision and Rounding Tests", () => {
  describe("Decimal Precision", () => {
    const precisionCases = [
      { value: 333.33, rate: 6, expectedMonthly: 19.9998 },
      { value: 166.67, rate: 6, expectedMonthly: 10.0002 },
      { value: 111.11, rate: 9, expectedMonthly: 9.9999 },
      { value: 777.77, rate: 3, expectedMonthly: 23.3331 },
      { value: 123.456789, rate: 6, expectedMonthly: 7.40740734 },
    ];

    precisionCases.forEach(({ value, rate, expectedMonthly }) => {
      it(`handles $${value} with ${rate}% rate`, () => {
        const quotaLevel = rate === 3 ? "below" : rate === 6 ? "above" : "double";
        const input = createInput({ monthlyValue: value, quotaLevel });
        const result = calculateCommission(input);

        expect(result.monthlyCommission).toBeCloseTo(expectedMonthly, 2);
      });
    });
  });

  describe("Multiplier Precision", () => {
    it("handles 135% multiplier without floating point errors", () => {
      const input = createInput({
        monthlyValue: 1000,
        quotaLevel: "above",
        agreementTerm: "3-year",
      });
      const result = calculateCommission(input);

      expect(result.finalCommissionRate).toBeCloseTo(8.1, 10);
      expect(result.monthlyCommission).toBeCloseTo(81, 10);
    });

    it("handles 50% multiplier without floating point errors", () => {
      const input = createInput({
        monthlyValue: 1000,
        quotaLevel: "above",
        agreementTerm: "MTM-no-install",
      });
      const result = calculateCommission(input);

      expect(result.finalCommissionRate).toBe(3);
      expect(result.monthlyCommission).toBe(30);
    });
  });

  describe("Complex Calculation Precision", () => {
    it("maintains precision with all adjustments applied", () => {
      const input = createInput({
        monthlyValue: 1234.56,
        quotaLevel: "double",
        agreementTerm: "3-year",
        accountType: "Bread15",
        pricingLine: "Greenline",
        businessType: "renewal",
        yearsAsCustomer: 5,
        isInsideSales: true,
      });
      const result = calculateCommission(input);

      
      
      expect(result.effectiveBaseRate).toBe(10.5);
      expect(result.finalCommissionRate).toBeCloseTo(14.175, 4);
      expect(result.monthlyCommission).toBeCloseTo(175.0009, 2);
    });
  });
});

describe("Real-World Sales Scenarios", () => {
  describe("New Sales Rep Scenarios", () => {
    it("first deal - small account, below quota", () => {
      const input = createInput({
        monthlyValue: 150,
        quotaLevel: "below",
        agreementTerm: "1-year",
        accountType: "Pit",
        pricingLine: "Redline",
        businessType: "new",
        isInsideSales: false,
      });
      const result = calculateCommission(input);

      expect(result.finalCommissionRate).toBe(3);
      expect(result.monthlyCommission).toBe(4.5);
      expect(result.annualCommission).toBe(54);
    });

    it("breakthrough deal - anchor account, 3-year", () => {
      const input = createInput({
        monthlyValue: 500,
        quotaLevel: "above",
        agreementTerm: "3-year",
        accountType: "Anchor",
        pricingLine: "Greenline",
        businessType: "new",
        isInsideSales: false,
      });
      const result = calculateCommission(input);

      expect(result.finalCommissionRate).toBeCloseTo(9.45, 2);
      expect(result.monthlyCommission).toBeCloseTo(47.25, 2);
    });

    it("quota buster - double quota with premium pricing", () => {
      const input = createInput({
        monthlyValue: 2000,
        quotaLevel: "double",
        agreementTerm: "3-year",
        accountType: "Anchor",
        pricingLine: "Greenline",
        businessType: "new",
        isInsideSales: false,
      });
      const result = calculateCommission(input);

      expect(result.finalCommissionRate).toBeCloseTo(13.5, 2);
      expect(result.monthlyCommission).toBeCloseTo(270, 2);
      expect(result.annualCommission).toBeCloseTo(3240, 2);
    });
  });

  describe("Account Manager Scenarios", () => {
    it("renewal of long-term customer", () => {
      const input = createInput({
        monthlyValue: 800,
        quotaLevel: "above",
        agreementTerm: "3-year",
        accountType: "Anchor",
        pricingLine: "Redline",
        businessType: "renewal",
        yearsAsCustomer: 7,
        isInsideSales: false,
      });
      const result = calculateCommission(input);

      expect(result.finalCommissionRate).toBeCloseTo(13.5, 2);
      expect(result.monthlyCommission).toBeCloseTo(108, 2);
    });

    it("upsell existing customer to greenline", () => {
      const input = createInput({
        monthlyValue: 600,
        quotaLevel: "above",
        agreementTerm: "1-year",
        accountType: "Anchor",
        pricingLine: "Greenline",
        businessType: "renewal",
        yearsAsCustomer: 3,
        isInsideSales: false,
      });
      const result = calculateCommission(input);

      expect(result.finalCommissionRate).toBe(11);
      expect(result.monthlyCommission).toBe(66);
    });

    it("converting MTM to 3-year", () => {
      const input = createInput({
        monthlyValue: 450,
        quotaLevel: "above",
        agreementTerm: "3-year",
        accountType: "Bread5",
        pricingLine: "Redline",
        businessType: "renewal",
        yearsAsCustomer: 4,
        isInsideSales: false,
      });
      const result = calculateCommission(input);

      expect(result.finalCommissionRate).toBeCloseTo(12.15, 2);
      expect(result.monthlyCommission).toBeCloseTo(54.675, 2);
    });
  });

  describe("Inside Sales Team Scenarios", () => {
    it("cold call conversion - small account", () => {
      const input = createInput({
        monthlyValue: 200,
        quotaLevel: "below",
        agreementTerm: "1-year",
        accountType: "Pit",
        pricingLine: "Redline",
        businessType: "new",
        isInsideSales: true,
      });
      const result = calculateCommission(input);

      expect(result.finalCommissionRate).toBe(0);
      expect(result.monthlyCommission).toBe(0);
    });

    it("inside sales with good commission", () => {
      const input = createInput({
        monthlyValue: 500,
        quotaLevel: "double",
        agreementTerm: "3-year",
        accountType: "Anchor",
        pricingLine: "Greenline",
        businessType: "new",
        isInsideSales: true,
      });
      const result = calculateCommission(input);

      expect(result.finalCommissionRate).toBeCloseTo(9.45, 2);
      expect(result.monthlyCommission).toBeCloseTo(47.25, 2);
    });

    it("inside sales renewal support", () => {
      const input = createInput({
        monthlyValue: 350,
        quotaLevel: "above",
        agreementTerm: "1-year",
        accountType: "Bread15",
        pricingLine: "Redline",
        businessType: "renewal",
        yearsAsCustomer: 5,
        isInsideSales: true,
      });
      const result = calculateCommission(input);

      expect(result.finalCommissionRate).toBe(6.5);
      expect(result.monthlyCommission).toBeCloseTo(22.75, 2);
    });
  });

  describe("Enterprise Sales Scenarios", () => {
    it("large enterprise deal - maximum everything", () => {
      const input = createInput({
        monthlyValue: 10000,
        quotaLevel: "double",
        agreementTerm: "3-year",
        accountType: "Anchor",
        pricingLine: "Greenline",
        businessType: "renewal",
        yearsAsCustomer: 10,
        isInsideSales: false,
      });
      const result = calculateCommission(input);

      expect(result.finalCommissionRate).toBeCloseTo(18.9, 2);
      expect(result.monthlyCommission).toBeCloseTo(1890, 2);
      expect(result.annualCommission).toBeCloseTo(22680, 2);
    });

    it("enterprise fleet deal", () => {
      const input = createInput({
        monthlyValue: 5000,
        quotaLevel: "double",
        agreementTerm: "3-year",
        accountType: "Anchor",
        pricingLine: "Greenline",
        businessType: "new",
        isInsideSales: false,
      });
      const result = calculateCommission(input);

      expect(result.finalCommissionRate).toBeCloseTo(13.5, 2);
      expect(result.monthlyCommission).toBeCloseTo(675, 2);
    });
  });
});

describe("Negative and Edge Case Scenarios", () => {
  describe("Negative Commission Scenarios", () => {
    it("worst possible combination results in negative commission", () => {
      const input = createInput({
        monthlyValue: 100,
        quotaLevel: "below",
        agreementTerm: "MTM-no-install",
        accountType: "Bread5",
        pricingLine: "Redline",
        businessType: "new",
        isInsideSales: true,
      });
      const result = calculateCommission(input);

      expect(result.effectiveBaseRate).toBe(-1);
      expect(result.finalCommissionRate).toBe(-0.5);
      expect(result.monthlyCommission).toBe(-0.5);
    });

    it("near-zero commission scenario", () => {
      const input = createInput({
        monthlyValue: 100,
        quotaLevel: "below",
        agreementTerm: "MTM-no-install",
        accountType: "Anchor",
        pricingLine: "Redline",
        businessType: "new",
        isInsideSales: true,
      });
      const result = calculateCommission(input);

      expect(result.effectiveBaseRate).toBe(0);
      expect(result.finalCommissionRate).toBe(0);
      expect(result.monthlyCommission).toBe(0);
    });
  });

  describe("Zero Value Scenarios", () => {
    it("zero monthly value with all bonuses", () => {
      const input = createInput({
        monthlyValue: 0,
        quotaLevel: "double",
        agreementTerm: "3-year",
        pricingLine: "Greenline",
        businessType: "renewal",
        yearsAsCustomer: 5,
      });
      const result = calculateCommission(input);

      expect(result.finalCommissionRate).toBeCloseTo(18.9, 2);
      expect(result.monthlyCommission).toBe(0);
      expect(result.annualCommission).toBe(0);
    });
  });

  describe("Extreme Value Scenarios", () => {
    it("very small monthly value", () => {
      const input = createInput({ monthlyValue: 0.01, quotaLevel: "above" });
      const result = calculateCommission(input);

      expect(result.monthlyCommission).toBeCloseTo(0.0006, 4);
    });

    it("very large monthly value", () => {
      const input = createInput({ monthlyValue: 1000000, quotaLevel: "double", agreementTerm: "3-year" });
      const result = calculateCommission(input);

      expect(result.monthlyCommission).toBeCloseTo(121500, 2);
      expect(result.annualCommission).toBeCloseTo(1458000, 2);
    });
  });
});

describe("Comparison Tests", () => {
  describe("Account Type Comparison", () => {
    it("compares all account types at same value", () => {
      const baseInput = { monthlyValue: 1000, quotaLevel: "above" as QuotaLevel };

      const anchorResult = calculateCommission(createInput({ ...baseInput, accountType: "Anchor" }));
      const bread5Result = calculateCommission(createInput({ ...baseInput, accountType: "Bread5" }));
      const bread15Result = calculateCommission(createInput({ ...baseInput, accountType: "Bread15" }));
      const pitResult = calculateCommission(createInput({ ...baseInput, accountType: "Pit" }));

      expect(anchorResult.monthlyCommission).toBe(pitResult.monthlyCommission);

      expect(bread5Result.monthlyCommission).toBeLessThan(bread15Result.monthlyCommission);
      expect(bread5Result.monthlyCommission).toBeLessThan(anchorResult.monthlyCommission);

      expect(bread15Result.monthlyCommission).toBeLessThan(anchorResult.monthlyCommission);
      expect(bread15Result.monthlyCommission).toBeGreaterThan(bread5Result.monthlyCommission);

      expect(anchorResult.monthlyCommission).toBe(60);
      expect(bread5Result.monthlyCommission).toBe(50);
      expect(bread15Result.monthlyCommission).toBe(55);
      expect(pitResult.monthlyCommission).toBe(60);
    });
  });

  describe("Agreement Term Comparison", () => {
    it("compares all agreement terms at same value", () => {
      const baseInput = { monthlyValue: 1000, quotaLevel: "above" as QuotaLevel };

      const threeYear = calculateCommission(createInput({ ...baseInput, agreementTerm: "3-year" }));
      const oneYear = calculateCommission(createInput({ ...baseInput, agreementTerm: "1-year" }));
      const mtmInstall = calculateCommission(createInput({ ...baseInput, agreementTerm: "MTM-with-install" }));
      const mtmNoInstall = calculateCommission(createInput({ ...baseInput, agreementTerm: "MTM-no-install" }));

      expect(threeYear.monthlyCommission).toBeGreaterThan(oneYear.monthlyCommission);
      expect(threeYear.monthlyCommission).toBeGreaterThan(mtmInstall.monthlyCommission);
      expect(threeYear.monthlyCommission).toBeGreaterThan(mtmNoInstall.monthlyCommission);

      expect(oneYear.monthlyCommission).toBe(mtmInstall.monthlyCommission);

      expect(mtmNoInstall.monthlyCommission).toBeLessThan(oneYear.monthlyCommission);

      expect(threeYear.monthlyCommission).toBeCloseTo(81, 2);
      expect(oneYear.monthlyCommission).toBe(60);
      expect(mtmInstall.monthlyCommission).toBe(60);
      expect(mtmNoInstall.monthlyCommission).toBe(30);
    });
  });

  describe("Quota Level Comparison", () => {
    it("compares all quota levels at same value", () => {
      const baseInput = { monthlyValue: 1000 };

      const below = calculateCommission(createInput({ ...baseInput, quotaLevel: "below" }));
      const above = calculateCommission(createInput({ ...baseInput, quotaLevel: "above" }));
      const double = calculateCommission(createInput({ ...baseInput, quotaLevel: "double" }));

      expect(double.monthlyCommission).toBeGreaterThan(above.monthlyCommission);
      expect(above.monthlyCommission).toBeGreaterThan(below.monthlyCommission);

      expect(above.breakdown.baseRate - below.breakdown.baseRate).toBe(3);
      expect(double.breakdown.baseRate - above.breakdown.baseRate).toBe(3);

      expect(below.monthlyCommission).toBe(30);
      expect(above.monthlyCommission).toBe(60);
      expect(double.monthlyCommission).toBe(90);
    });
  });

  describe("New vs Renewal Comparison", () => {
    it("compares new vs renewal with varying years", () => {
      const baseInput = { monthlyValue: 1000, quotaLevel: "above" as QuotaLevel };

      const newBusiness = calculateCommission(createInput({ ...baseInput, businessType: "new" }));
      const renewal1Year = calculateCommission(createInput({ ...baseInput, businessType: "renewal", yearsAsCustomer: 1 }));
      const renewal2Years = calculateCommission(createInput({ ...baseInput, businessType: "renewal", yearsAsCustomer: 2 }));
      const renewal5Years = calculateCommission(createInput({ ...baseInput, businessType: "renewal", yearsAsCustomer: 5 }));

      expect(newBusiness.monthlyCommission).toBe(renewal1Year.monthlyCommission);

      expect(renewal2Years.monthlyCommission).toBeGreaterThan(newBusiness.monthlyCommission);
      expect(renewal2Years.monthlyCommission).toBe(renewal5Years.monthlyCommission);

      expect(newBusiness.monthlyCommission).toBe(60);
      expect(renewal2Years.monthlyCommission).toBe(100); 
    });
  });

  describe("Field vs Inside Sales Comparison", () => {
    it("compares field sales vs inside sales", () => {
      const baseInput = { monthlyValue: 1000, quotaLevel: "above" as QuotaLevel };

      const fieldSales = calculateCommission(createInput({ ...baseInput, isInsideSales: false }));
      const insideSales = calculateCommission(createInput({ ...baseInput, isInsideSales: true }));

      expect(fieldSales.monthlyCommission).toBeGreaterThan(insideSales.monthlyCommission);

      expect(fieldSales.monthlyCommission - insideSales.monthlyCommission).toBe(30);
    });
  });
});

describe("Multi-Year Projection Tests", () => {
  describe("3-Year Contract Projections", () => {
    it("calculates total commission over 3-year contract", () => {
      const input = createInput({
        monthlyValue: 500,
        quotaLevel: "above",
        agreementTerm: "3-year",
        accountType: "Anchor",
      });
      const result = calculateCommission(input);

      const threeYearCommission = result.annualCommission * 3;
      expect(threeYearCommission).toBeCloseTo(result.monthlyCommission * 36, 2);
    });
  });

  describe("Commission Growth Scenarios", () => {
    it("projects commission with annual price increases", () => {
      const baseMonthlyValue = 500;
      const annualIncrease = 0.05; 

      const year1 = calculateCommission(createInput({ monthlyValue: baseMonthlyValue }));
      const year2 = calculateCommission(createInput({ monthlyValue: baseMonthlyValue * (1 + annualIncrease) }));
      const year3 = calculateCommission(createInput({ monthlyValue: baseMonthlyValue * Math.pow(1 + annualIncrease, 2) }));

      expect(year2.annualCommission).toBeGreaterThan(year1.annualCommission);
      expect(year3.annualCommission).toBeGreaterThan(year2.annualCommission);
    });
  });
});

describe("Business Rule Validation", () => {
  describe("Anchor Account Rules", () => {
    it("anchor accounts should have highest base commission", () => {
      const input = createInput({ quotaLevel: "above", accountType: "Anchor" });
      const result = calculateCommission(input);

      expect(result.breakdown.accountTypeAdjustment).toBe(0);
    });
  });

  describe("Bread Account Rules", () => {
    it("Bread5 has larger deduction than Bread15", () => {
      const bread5 = calculateCommission(createInput({ accountType: "Bread5" }));
      const bread15 = calculateCommission(createInput({ accountType: "Bread15" }));

      expect(Math.abs(bread5.breakdown.accountTypeAdjustment)).toBeGreaterThan(
        Math.abs(bread15.breakdown.accountTypeAdjustment)
      );
    });
  });

  describe("Renewal Bonus Rules", () => {
    it("renewal bonus only applies at 2+ years", () => {
      const year1 = calculateCommission(createInput({ businessType: "renewal", yearsAsCustomer: 1.99 }));
      const year2 = calculateCommission(createInput({ businessType: "renewal", yearsAsCustomer: 2 }));

      expect(year1.breakdown.renewalBonus).toBe(0);
      expect(year2.breakdown.renewalBonus).toBe(4);
    });
  });

  describe("Inside Sales Deduction Rules", () => {
    it("inside sales deduction is always -3%", () => {
      const quotaLevels: QuotaLevel[] = ["below", "above", "double"];

      quotaLevels.forEach((quotaLevel) => {
        const result = calculateCommission(createInput({ quotaLevel, isInsideSales: true }));
        expect(result.breakdown.insideSalesDeduction).toBe(-3);
      });
    });
  });

  describe("Greenline Bonus Rules", () => {
    it("greenline bonus is always +1%", () => {
      const quotaLevels: QuotaLevel[] = ["below", "above", "double"];

      quotaLevels.forEach((quotaLevel) => {
        const result = calculateCommission(createInput({ quotaLevel, pricingLine: "Greenline" }));
        expect(result.breakdown.greenlineBonus).toBe(1);
      });
    });
  });
});

describe("Custom Rules Configuration", () => {
  describe("Modified Quota Rates", () => {
    it("applies custom quota rates", () => {
      const customRules: CommissionRules = {
        ...DEFAULT_RULES,
        quotaRates: { below: 2, above: 5, double: 10 },
      };

      const below = calculateCommission(createInput({ quotaLevel: "below" }), customRules);
      const above = calculateCommission(createInput({ quotaLevel: "above" }), customRules);
      const double = calculateCommission(createInput({ quotaLevel: "double" }), customRules);

      expect(below.breakdown.baseRate).toBe(2);
      expect(above.breakdown.baseRate).toBe(5);
      expect(double.breakdown.baseRate).toBe(10);
    });
  });

  describe("Modified Agreement Multipliers", () => {
    it("applies custom agreement multipliers", () => {
      const customRules: CommissionRules = {
        ...DEFAULT_RULES,
        agreementMultipliers: {
          "3-year": 150,
          "1-year": 110,
          "MTM-with-install": 90,
          "MTM-no-install": 40,
        },
      };

      const threeYear = calculateCommission(createInput({ agreementTerm: "3-year" }), customRules);
      const oneYear = calculateCommission(createInput({ agreementTerm: "1-year" }), customRules);
      const mtmInstall = calculateCommission(createInput({ agreementTerm: "MTM-with-install" }), customRules);
      const mtmNoInstall = calculateCommission(createInput({ agreementTerm: "MTM-no-install" }), customRules);

      expect(threeYear.breakdown.agreementMultiplier).toBe(150);
      expect(oneYear.breakdown.agreementMultiplier).toBe(110);
      expect(mtmInstall.breakdown.agreementMultiplier).toBe(90);
      expect(mtmNoInstall.breakdown.agreementMultiplier).toBe(40);
    });
  });

  describe("Modified Account Type Adjustments", () => {
    it("applies custom account type adjustments", () => {
      const customRules: CommissionRules = {
        ...DEFAULT_RULES,
        accountTypeAdjustments: {
          Anchor: 1,
          Bread5: -2,
          Bread15: -1,
          Pit: -0.5,
        },
      };

      const anchor = calculateCommission(createInput({ accountType: "Anchor" }), customRules);
      const bread5 = calculateCommission(createInput({ accountType: "Bread5" }), customRules);
      const bread15 = calculateCommission(createInput({ accountType: "Bread15" }), customRules);
      const pit = calculateCommission(createInput({ accountType: "Pit" }), customRules);

      expect(anchor.breakdown.accountTypeAdjustment).toBe(1);
      expect(bread5.breakdown.accountTypeAdjustment).toBe(-2);
      expect(bread15.breakdown.accountTypeAdjustment).toBe(-1);
      expect(pit.breakdown.accountTypeAdjustment).toBe(-0.5);
    });
  });

  describe("Modified Bonuses and Deductions", () => {
    it("applies custom greenline bonus", () => {
      const customRules: CommissionRules = { ...DEFAULT_RULES, greenlineBonus: 2.5 };
      const result = calculateCommission(createInput({ pricingLine: "Greenline" }), customRules);
      expect(result.breakdown.greenlineBonus).toBe(2.5);
    });

    it("applies custom renewal bonus rate", () => {
      const customRules: CommissionRules = { ...DEFAULT_RULES, renewalBonusRate: 6 };
      const result = calculateCommission(createInput({ businessType: "renewal", yearsAsCustomer: 3 }), customRules);
      expect(result.breakdown.renewalBonus).toBe(6);
    });

    it("applies custom renewal minimum years", () => {
      const customRules: CommissionRules = { ...DEFAULT_RULES, renewalMinYears: 3 };

      const twoYears = calculateCommission(createInput({ businessType: "renewal", yearsAsCustomer: 2 }), customRules);
      const threeYears = calculateCommission(createInput({ businessType: "renewal", yearsAsCustomer: 3 }), customRules);

      expect(twoYears.breakdown.renewalBonus).toBe(0);
      expect(threeYears.breakdown.renewalBonus).toBe(4);
    });

    it("applies custom inside sales deduction", () => {
      const customRules: CommissionRules = { ...DEFAULT_RULES, insideSalesDeduction: -5 };
      const result = calculateCommission(createInput({ isInsideSales: true }), customRules);
      expect(result.breakdown.insideSalesDeduction).toBe(-5);
    });
  });
});

describe("Data Integrity Tests", () => {
  describe("Input Preservation", () => {
    it("preserves all input values in result", () => {
      const input = createInput({
        monthlyValue: 999.99,
        quotaLevel: "double",
        agreementTerm: "3-year",
        accountType: "Bread15",
        pricingLine: "Greenline",
        businessType: "renewal",
        yearsAsCustomer: 7,
        isInsideSales: true,
      });
      const result = calculateCommission(input);

      expect(result.input).toEqual(input);
      expect(result.input.monthlyValue).toBe(999.99);
      expect(result.input.quotaLevel).toBe("double");
      expect(result.input.agreementTerm).toBe("3-year");
      expect(result.input.accountType).toBe("Bread15");
      expect(result.input.pricingLine).toBe("Greenline");
      expect(result.input.businessType).toBe("renewal");
      expect(result.input.yearsAsCustomer).toBe(7);
      expect(result.input.isInsideSales).toBe(true);
    });
  });

  describe("Breakdown Completeness", () => {
    it("includes all required breakdown fields", () => {
      const result = calculateCommission(createInput());

      expect(result.breakdown).toHaveProperty("baseRate");
      expect(result.breakdown).toHaveProperty("agreementMultiplier");
      expect(result.breakdown).toHaveProperty("accountTypeAdjustment");
      expect(result.breakdown).toHaveProperty("greenlineBonus");
      expect(result.breakdown).toHaveProperty("renewalBonus");
      expect(result.breakdown).toHaveProperty("insideSalesDeduction");
    });

    it("breakdown values are consistent with final calculation", () => {
      const input = createInput({
        quotaLevel: "above",
        agreementTerm: "3-year",
        accountType: "Bread5",
        pricingLine: "Greenline",
        businessType: "renewal",
        yearsAsCustomer: 3,
        isInsideSales: true,
      });
      const result = calculateCommission(input);

      const calculatedEffective =
        result.breakdown.baseRate +
        result.breakdown.accountTypeAdjustment +
        result.breakdown.greenlineBonus +
        result.breakdown.renewalBonus +
        result.breakdown.insideSalesDeduction;

      expect(result.effectiveBaseRate).toBe(calculatedEffective);

      const calculatedFinal = calculatedEffective * (result.breakdown.agreementMultiplier / 100);
      expect(result.finalCommissionRate).toBeCloseTo(calculatedFinal, 10);
    });
  });

  describe("Calculation Consistency", () => {
    it("annual commission is exactly 12x monthly", () => {
      const testCases = [
        { monthlyValue: 100 },
        { monthlyValue: 500 },
        { monthlyValue: 1000 },
        { monthlyValue: 5000 },
        { monthlyValue: 10000 },
      ];

      testCases.forEach(({ monthlyValue }) => {
        const result = calculateCommission(createInput({ monthlyValue }));
        expect(result.annualCommission).toBe(result.monthlyCommission * 12);
      });
    });

    it("monthly commission equals monthlyValue * rate / 100", () => {
      const input = createInput({ monthlyValue: 1000, quotaLevel: "above" });
      const result = calculateCommission(input);

      const expected = 1000 * (result.finalCommissionRate / 100);
      expect(result.monthlyCommission).toBeCloseTo(expected, 10);
    });
  });
});

describe("Stress Tests", () => {
  describe("Bulk Calculations", () => {
    it("handles 1000 calculations correctly", () => {
      const results: CommissionCalculationResult[] = [];

      for (let i = 0; i < 1000; i++) {
        const input = createInput({
          monthlyValue: i * 10,
          quotaLevel: ["below", "above", "double"][i % 3] as QuotaLevel,
        });
        results.push(calculateCommission(input));
      }

      expect(results.length).toBe(1000);
      results.forEach((result) => {
        expect(result.annualCommission).toBe(result.monthlyCommission * 12);
      });
    });
  });

  describe("Random Value Testing", () => {
    it("handles random monthly values", () => {
      for (let i = 0; i < 100; i++) {
        const randomValue = Math.random() * 10000;
        const input = createInput({ monthlyValue: randomValue });
        const result = calculateCommission(input);

        expect(result.monthlyCommission).toBeCloseTo(randomValue * 0.06, 4);
        expect(result.annualCommission).toBeCloseTo(result.monthlyCommission * 12, 4);
      }
    });
  });
});

describe("Specific Dollar Amount Tests", () => {
  describe("Common Monthly Values", () => {
    const commonValues = [
      { monthly: 200, quota: "above", expectedCommission: 12 },
      { monthly: 250, quota: "above", expectedCommission: 15 },
      { monthly: 300, quota: "above", expectedCommission: 18 },
      { monthly: 350, quota: "above", expectedCommission: 21 },
      { monthly: 400, quota: "above", expectedCommission: 24 },
      { monthly: 450, quota: "above", expectedCommission: 27 },
      { monthly: 500, quota: "above", expectedCommission: 30 },
      { monthly: 600, quota: "above", expectedCommission: 36 },
      { monthly: 750, quota: "above", expectedCommission: 45 },
      { monthly: 1000, quota: "above", expectedCommission: 60 },
      { monthly: 1500, quota: "above", expectedCommission: 90 },
      { monthly: 2000, quota: "above", expectedCommission: 120 },
      { monthly: 2500, quota: "above", expectedCommission: 150 },
      { monthly: 3000, quota: "above", expectedCommission: 180 },
      { monthly: 5000, quota: "above", expectedCommission: 300 },
      { monthly: 10000, quota: "above", expectedCommission: 600 },
    ];

    commonValues.forEach(({ monthly, quota, expectedCommission }) => {
      it(`$${monthly}/month at ${quota} quota = $${expectedCommission} commission`, () => {
        const input = createInput({ monthlyValue: monthly, quotaLevel: quota as QuotaLevel });
        const result = calculateCommission(input);
        expect(result.monthlyCommission).toBe(expectedCommission);
      });
    });
  });

  describe("Commission Thresholds", () => {
    it("calculates monthly value needed for $100 monthly commission at 6%", () => {
      
      const input = createInput({ monthlyValue: 1666.67, quotaLevel: "above" });
      const result = calculateCommission(input);
      expect(result.monthlyCommission).toBeCloseTo(100, 0);
    });

    it("calculates monthly value needed for $500 monthly commission at 9%", () => {
      
      const input = createInput({ monthlyValue: 5555.56, quotaLevel: "double" });
      const result = calculateCommission(input);
      expect(result.monthlyCommission).toBeCloseTo(500, 0);
    });
  });
});

describe("Regression Tests", () => {
  describe("Known Good Values", () => {
    const knownGoodCases = [
      {
        description: "Standard above quota 1-year",
        input: { monthlyValue: 500, quotaLevel: "above", agreementTerm: "1-year", accountType: "Anchor" },
        expected: { rate: 6, monthly: 30, annual: 360 },
      },
      {
        description: "Double quota 3-year with greenline",
        input: { monthlyValue: 1000, quotaLevel: "double", agreementTerm: "3-year", pricingLine: "Greenline" },
        expected: { rate: 13.5, monthly: 135, annual: 1620 },
      },
      {
        description: "Below quota MTM no install",
        input: { monthlyValue: 300, quotaLevel: "below", agreementTerm: "MTM-no-install", accountType: "Anchor" },
        expected: { rate: 1.5, monthly: 4.5, annual: 54 },
      },
      {
        description: "Renewal with 5 year bonus",
        input: { monthlyValue: 800, quotaLevel: "above", agreementTerm: "1-year", businessType: "renewal", yearsAsCustomer: 5 },
        expected: { rate: 10, monthly: 80, annual: 960 },
      },
      {
        description: "Inside sales with all bonuses",
        input: {
          monthlyValue: 1000,
          quotaLevel: "double",
          agreementTerm: "3-year",
          pricingLine: "Greenline",
          businessType: "renewal",
          yearsAsCustomer: 3,
          isInsideSales: true
        },
        expected: { rate: 14.85, monthly: 148.5, annual: 1782 },
      },
    ];

    knownGoodCases.forEach(({ description, input, expected }) => {
      it(description, () => {
        const result = calculateCommission(createInput(input as Partial<CommissionCalculationInput>));
        expect(result.finalCommissionRate).toBeCloseTo(expected.rate, 2);
        expect(result.monthlyCommission).toBeCloseTo(expected.monthly, 2);
        expect(result.annualCommission).toBeCloseTo(expected.annual, 2);
      });
    });
  });
});
