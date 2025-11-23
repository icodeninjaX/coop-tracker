import { z } from "zod";

/**
 * Validation schemas for the Coop Tracking System
 * Using Zod v3 for runtime type checking and validation
 */

// ============ BASE SCHEMAS ============

export const memberIdSchema = z
  .number()
  .int("Member ID must be an integer")
  .min(1, "Member ID must be at least 1")
  .max(20, "Member ID cannot exceed 20");

export const currencySchema = z
  .number()
  .nonnegative("Amount cannot be negative")
  .finite("Amount must be a finite number")
  .refine((val) => !isNaN(val), "Amount must be a valid number")
  .transform((val) => Math.round(val * 100) / 100); // Round to 2 decimal places

export const positiveCurrencySchema = z
  .number()
  .positive("Amount must be greater than 0")
  .finite("Amount must be a finite number")
  .refine((val) => !isNaN(val), "Amount must be a valid number")
  .transform((val) => Math.round(val * 100) / 100); // Round to 2 decimal places

export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
  .refine((date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  }, "Invalid date");

export const isoDateSchema = z.string().refine((date) => {
  const parsed = new Date(date);
  return !isNaN(parsed.getTime());
}, "Invalid ISO date");

// ============ MEMBER SCHEMAS ============

export const memberSchema = z.object({
  id: memberIdSchema,
  name: z
    .string()
    .min(1, "Member name is required")
    .max(100, "Member name is too long")
    .transform((s) => s.trim()),
});

export const createMemberSchema = memberSchema;
export const updateMemberSchema = memberSchema.partial().required({ id: true });

// ============ PAYMENT SCHEMAS ============

export const paymentSchema = z.object({
  memberId: memberIdSchema,
  amount: positiveCurrencySchema,
  date: isoDateSchema,
  collectionPeriod: z.string().min(1, "Collection period is required"),
});

export const createPaymentSchema = paymentSchema;

// ============ COLLECTION PERIOD SCHEMAS ============

export const collectionPeriodSchema = z.object({
  id: z.string().min(1, "Period ID is required"),
  date: dateStringSchema,
  totalCollected: currencySchema,
  payments: z.array(paymentSchema),
  defaultContribution: currencySchema.optional(),
});

export const createCollectionPeriodSchema = z.object({
  id: z.string().min(1, "Period ID is required"),
  date: dateStringSchema,
  totalCollected: currencySchema.default(0),
  payments: z.array(paymentSchema).default([]),
  defaultContribution: currencySchema.optional(),
});

// ============ LOAN SCHEMAS ============

export const loanStatusSchema = z.enum(["PENDING", "APPROVED", "REJECTED", "PAID"]);
export const repaymentPlanSchema = z.enum(["MONTHLY", "CUT_OFF"]);

export const loanSchema = z.object({
  id: z.string().min(1, "Loan ID is required"),
  memberId: memberIdSchema,
  amount: positiveCurrencySchema,
  dateIssued: isoDateSchema,
  status: loanStatusSchema,
  dateApproved: isoDateSchema.optional(),
  disbursementPeriodId: z.string().optional(),
  repaymentPlan: repaymentPlanSchema.optional(),
  interestRate: z
    .number()
    .min(0, "Interest rate cannot be negative")
    .max(1, "Interest rate cannot exceed 100%")
    .optional(),
  dateClosed: isoDateSchema.optional(),
  termCount: z
    .number()
    .int("Term count must be an integer")
    .positive("Term count must be positive")
    .optional(),
  penaltyRate: z
    .number()
    .min(0, "Penalty rate cannot be negative")
    .max(1, "Penalty rate cannot exceed 100%")
    .optional(),
});

export const createLoanSchema = z
  .object({
    memberId: memberIdSchema,
    amount: positiveCurrencySchema,
    repaymentPlan: repaymentPlanSchema.default("CUT_OFF"),
    interestRate: z
      .number()
      .min(0, "Interest rate cannot be negative")
      .max(1, "Interest rate cannot exceed 100%")
      .optional(),
    termCount: z
      .number()
      .int("Term count must be an integer")
      .positive("Term count must be positive")
      .optional(),
  })
  .refine(
    (data) => {
      // Validate interest rate matches repayment plan
      if (data.repaymentPlan === "MONTHLY" && data.interestRate !== undefined) {
        return data.interestRate === 0.04;
      }
      if (data.repaymentPlan === "CUT_OFF" && data.interestRate !== undefined) {
        return data.interestRate === 0.03;
      }
      return true;
    },
    {
      message: "Interest rate must be 4% for MONTHLY or 3% for CUT_OFF plans",
      path: ["interestRate"],
    }
  );

// ============ REPAYMENT SCHEMAS ============

export const repaymentSchema = z.object({
  id: z.string().min(1, "Repayment ID is required"),
  loanId: z.string().min(1, "Loan ID is required"),
  memberId: memberIdSchema,
  amount: positiveCurrencySchema,
  date: isoDateSchema,
  periodId: z.string().min(1, "Period ID is required"),
});

export const createRepaymentSchema = z.object({
  loanId: z.string().min(1, "Loan ID is required"),
  memberId: memberIdSchema,
  amount: positiveCurrencySchema,
  periodId: z.string().min(1, "Period ID is required"),
});

// ============ PENALTY SCHEMAS ============

export const penaltySchema = z.object({
  id: z.string().min(1, "Penalty ID is required"),
  loanId: z.string().min(1, "Loan ID is required"),
  amount: positiveCurrencySchema,
  date: isoDateSchema,
  periodId: z.string().min(1, "Period ID is required"),
  reason: z.string().optional(),
});

export const createPenaltySchema = z.object({
  loanId: z.string().min(1, "Loan ID is required"),
  amount: positiveCurrencySchema,
  periodId: z.string().min(1, "Period ID is required"),
  reason: z.string().optional(),
});

// ============ ARCHIVE SCHEMAS ============

export const yearlyArchiveSchema = z.object({
  year: z
    .number()
    .int("Year must be an integer")
    .min(2000, "Year must be 2000 or later")
    .max(2100, "Year must be before 2100"),
  archivedDate: isoDateSchema,
  summary: z.object({
    totalCollected: currencySchema,
    totalDisbursed: currencySchema,
    totalRepayments: currencySchema,
    totalPenalties: currencySchema,
    endingBalance: currencySchema,
    activeMembers: z.number().int().nonnegative(),
    totalLoansIssued: z.number().int().nonnegative(),
  }),
  collections: z.array(collectionPeriodSchema),
  loans: z.array(loanSchema),
  repayments: z.array(repaymentSchema),
  penalties: z.array(penaltySchema),
});

// ============ COOP STATE SCHEMA ============

export const coopStateSchema = z.object({
  beginningBalance: currencySchema,
  currentBalance: currencySchema,
  members: z.array(memberSchema),
  collections: z.array(collectionPeriodSchema),
  loans: z.array(loanSchema),
  repayments: z.array(repaymentSchema),
  penalties: z.array(penaltySchema),
  selectedPeriod: z.string(),
  archives: z.array(yearlyArchiveSchema).default([]),
});

// ============ VALIDATION HELPERS ============

/**
 * Validates and sanitizes input data
 * Returns either the validated data or throws an error with details
 */
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map((err) => ({
        path: err.path.join("."),
        message: err.message,
      }));
      throw new Error(
        `Validation failed: ${formattedErrors.map((e) => `${e.path}: ${e.message}`).join(", ")}`
      );
    }
    throw error;
  }
}

/**
 * Validates data and returns a result object instead of throwing
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.errors.map((err) => `${err.path.join(".")}: ${err.message}`),
  };
}

// ============ TYPE EXPORTS ============

export type Member = z.infer<typeof memberSchema>;
export type Payment = z.infer<typeof paymentSchema>;
export type CollectionPeriod = z.infer<typeof collectionPeriodSchema>;
export type Loan = z.infer<typeof loanSchema>;
export type Repayment = z.infer<typeof repaymentSchema>;
export type Penalty = z.infer<typeof penaltySchema>;
export type YearlyArchive = z.infer<typeof yearlyArchiveSchema>;
export type CoopState = z.infer<typeof coopStateSchema>;
