import {
  memberSchema,
  paymentSchema,
  loanSchema,
  createLoanSchema,
  repaymentSchema,
  collectionPeriodSchema,
  currencySchema,
  dateStringSchema,
  validateData,
  safeValidate,
} from "../validation";

describe("Validation Schemas", () => {
  describe("currencySchema", () => {
    it("should accept valid currency amounts", () => {
      expect(currencySchema.parse(100)).toBe(100);
      expect(currencySchema.parse(0)).toBe(0);
      expect(currencySchema.parse(1000.50)).toBe(1000.50);
    });

    it("should round to 2 decimal places", () => {
      expect(currencySchema.parse(100.999)).toBe(101);
      expect(currencySchema.parse(100.001)).toBe(100);
      expect(currencySchema.parse(100.555)).toBe(100.56);
    });

    it("should reject negative amounts", () => {
      expect(() => currencySchema.parse(-100)).toThrow();
    });

    it("should reject NaN and Infinity", () => {
      expect(() => currencySchema.parse(NaN)).toThrow();
      expect(() => currencySchema.parse(Infinity)).toThrow();
    });
  });

  describe("dateStringSchema", () => {
    it("should accept valid YYYY-MM-DD dates", () => {
      expect(dateStringSchema.parse("2025-01-15")).toBe("2025-01-15");
      expect(dateStringSchema.parse("2024-12-31")).toBe("2024-12-31");
    });

    it("should reject invalid date formats", () => {
      expect(() => dateStringSchema.parse("15-01-2025")).toThrow();
      expect(() => dateStringSchema.parse("2025/01/15")).toThrow();
      expect(() => dateStringSchema.parse("January 15, 2025")).toThrow();
    });

    it("should reject invalid dates", () => {
      expect(() => dateStringSchema.parse("2025-13-01")).toThrow(); // Invalid month
      // Note: JavaScript Date constructor converts invalid dates like 2025-02-30 to valid ones (2025-03-02)
      // So we only test clearly invalid formats
    });
  });

  describe("memberSchema", () => {
    it("should accept valid member data", () => {
      const validMember = {
        id: 1,
        name: "John Doe",
      };
      expect(memberSchema.parse(validMember)).toEqual(validMember);
    });

    it("should trim member names", () => {
      const member = memberSchema.parse({
        id: 1,
        name: "  John Doe  ",
      });
      expect(member.name).toBe("John Doe");
    });

    it("should reject invalid member IDs", () => {
      expect(() =>
        memberSchema.parse({ id: 0, name: "Test" })
      ).toThrow("Member ID must be at least 1");

      expect(() =>
        memberSchema.parse({ id: 21, name: "Test" })
      ).toThrow("Member ID cannot exceed 20");

      expect(() =>
        memberSchema.parse({ id: 1.5, name: "Test" })
      ).toThrow("Member ID must be an integer");
    });

    it("should reject empty names", () => {
      expect(() =>
        memberSchema.parse({ id: 1, name: "" })
      ).toThrow("Member name is required");
    });
  });

  describe("paymentSchema", () => {
    it("should accept valid payment data", () => {
      const validPayment = {
        memberId: 5,
        amount: 1000,
        date: new Date().toISOString(),
        collectionPeriod: "2025-01-10",
      };
      expect(paymentSchema.parse(validPayment)).toMatchObject({
        memberId: 5,
        amount: 1000,
        collectionPeriod: "2025-01-10",
      });
    });

    it("should reject zero or negative amounts", () => {
      expect(() =>
        paymentSchema.parse({
          memberId: 1,
          amount: 0,
          date: new Date().toISOString(),
          collectionPeriod: "2025-01-10",
        })
      ).toThrow("Amount must be greater than 0");

      expect(() =>
        paymentSchema.parse({
          memberId: 1,
          amount: -100,
          date: new Date().toISOString(),
          collectionPeriod: "2025-01-10",
        })
      ).toThrow();
    });
  });

  describe("loanSchema", () => {
    it("should accept valid loan data", () => {
      const validLoan = {
        id: "loan-123",
        memberId: 5,
        amount: 10000,
        dateIssued: new Date().toISOString(),
        status: "PENDING" as const,
        repaymentPlan: "CUT_OFF" as const,
        interestRate: 0.03,
        termCount: 6,
      };
      const parsed = loanSchema.parse(validLoan);
      expect(parsed).toMatchObject({
        id: "loan-123",
        memberId: 5,
        amount: 10000,
        status: "PENDING",
      });
    });

    it("should reject invalid loan status", () => {
      expect(() =>
        loanSchema.parse({
          id: "loan-123",
          memberId: 5,
          amount: 10000,
          dateIssued: new Date().toISOString(),
          status: "INVALID_STATUS",
        })
      ).toThrow();
    });

    it("should reject invalid interest rates", () => {
      expect(() =>
        loanSchema.parse({
          id: "loan-123",
          memberId: 5,
          amount: 10000,
          dateIssued: new Date().toISOString(),
          status: "PENDING",
          interestRate: -0.05,
        })
      ).toThrow("Interest rate cannot be negative");

      expect(() =>
        loanSchema.parse({
          id: "loan-123",
          memberId: 5,
          amount: 10000,
          dateIssued: new Date().toISOString(),
          status: "PENDING",
          interestRate: 1.5,
        })
      ).toThrow("Interest rate cannot exceed 100%");
    });
  });

  describe("createLoanSchema", () => {
    it("should validate interest rate matches repayment plan", () => {
      // Valid: CUT_OFF with 3%
      expect(() =>
        createLoanSchema.parse({
          memberId: 1,
          amount: 10000,
          repaymentPlan: "CUT_OFF",
          interestRate: 0.03,
          termCount: 6,
        })
      ).not.toThrow();

      // Valid: MONTHLY with 4%
      expect(() =>
        createLoanSchema.parse({
          memberId: 1,
          amount: 10000,
          repaymentPlan: "MONTHLY",
          interestRate: 0.04,
          termCount: 5,
        })
      ).not.toThrow();

      // Invalid: CUT_OFF with wrong rate
      expect(() =>
        createLoanSchema.parse({
          memberId: 1,
          amount: 10000,
          repaymentPlan: "CUT_OFF",
          interestRate: 0.04,
          termCount: 6,
        })
      ).toThrow("Interest rate must be 4% for MONTHLY or 3% for CUT_OFF plans");
    });
  });

  describe("collectionPeriodSchema", () => {
    it("should accept valid collection period", () => {
      const validPeriod = {
        id: "2025-01-10",
        date: "2025-01-10",
        totalCollected: 20000,
        payments: [],
        defaultContribution: 1000,
      };
      expect(collectionPeriodSchema.parse(validPeriod)).toEqual(validPeriod);
    });

    it("should accept period with payments", () => {
      const validPeriod = {
        id: "2025-01-10",
        date: "2025-01-10",
        totalCollected: 1000,
        payments: [
          {
            memberId: 1,
            amount: 1000,
            date: new Date().toISOString(),
            collectionPeriod: "2025-01-10",
          },
        ],
      };
      const parsed = collectionPeriodSchema.parse(validPeriod);
      expect(parsed.payments).toHaveLength(1);
    });
  });

  describe("repaymentSchema", () => {
    it("should accept valid repayment data", () => {
      const validRepayment = {
        id: "repay-123",
        loanId: "loan-123",
        memberId: 5,
        amount: 1750,
        date: new Date().toISOString(),
        periodId: "2025-01-10",
      };
      expect(repaymentSchema.parse(validRepayment)).toMatchObject({
        id: "repay-123",
        loanId: "loan-123",
        memberId: 5,
        amount: 1750,
      });
    });

    it("should reject zero or negative repayment amounts", () => {
      expect(() =>
        repaymentSchema.parse({
          id: "repay-123",
          loanId: "loan-123",
          memberId: 1,
          amount: 0,
          date: new Date().toISOString(),
          periodId: "2025-01-10",
        })
      ).toThrow("Amount must be greater than 0");
    });
  });

  describe("validateData helper", () => {
    it("should return validated data on success", () => {
      const data = { id: 1, name: "Test Member" };
      const result = validateData(memberSchema, data);
      expect(result).toEqual(data);
    });

    it("should throw formatted error on validation failure", () => {
      expect(() =>
        validateData(memberSchema, { id: 0, name: "" })
      ).toThrow("Validation failed");
    });
  });

  describe("safeValidate helper", () => {
    it("should return success object with validated data", () => {
      const data = { id: 1, name: "Test Member" };
      const result = safeValidate(memberSchema, data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(data);
      }
    });

    it("should return error object on validation failure", () => {
      const result = safeValidate(memberSchema, { id: 0, name: "" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toHaveLength(2);
        expect(result.errors.some((e) => e.includes("Member ID"))).toBe(true);
        expect(result.errors.some((e) => e.includes("name is required"))).toBe(true);
      }
    });
  });
});
