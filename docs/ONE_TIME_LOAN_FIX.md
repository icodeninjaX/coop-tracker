# One-Time Loan Logic Fix Summary

## Issue Understanding

The user clarified that "One-time" loans should work differently:

- **One-time loan**: Borrower pays the ENTIRE loan amount + interest after X months (not monthly payments)
- **Interest**: 4% per month for the entire term period
- **Example**: 12-month one-time loan = Pay full amount after 12 months with 12 × 4% = 48% total interest

## Previous Logic (INCORRECT)

- Both loan types were treated with installment payments
- One-time loans were divided into monthly installments
- This was not the intended behavior

## New Logic (CORRECT)

### One-Time Loans (`repaymentPlan: "MONTHLY"`)

- **Term**: Number of months before the full payment is due
- **Interest**: 4% per month × number of months
- **Payment**: Single payment of Principal × (1 + 0.04 × months) after the term
- **Example**: ₱10,000 for 12 months = ₱10,000 × (1 + 0.04 × 12) = ₱14,800 due after 12 months

### Per Cut-off Loans (`repaymentPlan: "CUT_OFF"`)

- **Term**: Number of months (2 cut-offs per month)
- **Interest**: 3% per month × number of months
- **Payment**: Installments every cut-off period
- **Example**: ₱10,000 for 6 months = 12 payments of ₱1,150 each

## Code Changes Made

### 1. **Fixed Loan Calculation Logic** (`src/app/loans/page.tsx`)

```tsx
// One-time loans: 1 payment period, full amount
const periodsCount = loan.termCount
  ? loan.repaymentPlan === "CUT_OFF"
    ? loan.termCount * 2 // Cut-off periods (2 per month)
    : 1 // One-time payment after full term
  : undefined;

const installment =
  loan.repaymentPlan === "MONTHLY"
    ? totalDue // One-time: pay entire amount at once
    : periodsCount
    ? totalDue / periodsCount // Per cut-off: divide into installments
    : undefined;
```

### 2. **Updated Display Text** (`src/app/loans/page.tsx`)

```tsx
// Clear loan plan description
{
  loan.repaymentPlan === "MONTHLY"
    ? "One-time payment (4% per month)"
    : "Per Cut-off installments (3% per month)";
}

// Clear term description
{
  loan.repaymentPlan === "MONTHLY"
    ? `Term: ${loan.termCount} months (pay full amount after term)`
    : `Terms: ${loan.termCount} months (${
        loan.termCount * 2
      } cut-off payments)`;
}

// Clear payment info
{
  loan.repaymentPlan === "MONTHLY"
    ? `Full payment: ₱${installment.toFixed(2)} (due after ${
        loan.termCount
      } months)`
    : `Installment: ₱${installment.toFixed(2)} / cut-off`;
}
```

### 3. **Enhanced Loan Creation Form** (`src/app/page.tsx`)

```tsx
// Clearer option labels
<option value="CUT_OFF">Per Cut-off installments (3% per month)</option>
<option value="MONTHLY">One-time payment (4% per month)</option>

// Better tooltips
title={
  newLoanPlan === "MONTHLY"
    ? "Number of months before full payment is due"
    : "Number of months to pay (2 cut-offs per month)"
}
```

### 4. **Added Helpful Information** (`src/app/page.tsx`)

- Added explanation box in loan creation form
- Clarifies the difference between one-time vs per cut-off loans
- Shows examples of how each loan type works

## Examples

### One-Time Loan Example

- **Principal**: ₱10,000
- **Term**: 12 months
- **Interest**: 4% per month
- **Total Due**: ₱10,000 × (1 + 0.04 × 12) = ₱14,800
- **Payment**: Single payment of ₱14,800 after 12 months

### Per Cut-off Loan Example

- **Principal**: ₱10,000
- **Term**: 6 months
- **Interest**: 3% per month
- **Total Due**: ₱10,000 × (1 + 0.03 × 6) = ₱11,800
- **Payments**: 12 installments of ₱983.33 each (every cut-off)

## Testing

✅ One-time loans now show correct payment structure
✅ Per cut-off loans still work as before  
✅ Clear visual distinction between loan types
✅ Better user guidance in loan creation form
✅ No TypeScript errors

The loan logic now correctly implements the one-time payment system as requested!
