# One-Time Loan Display & Rejected Loan Deletion Fix

## Issues Fixed

### 1. ✅ **One-Time Loan Display Issue**

**Problem**: One-time loans were still showing "Installment" information, which was confusing.

**Solution**: Updated the loan display logic to show different information based on loan type:

#### One-Time Loans (MONTHLY):

- **Before**: Showed "Full payment: ₱14,800 (due after 12 months)"
- **After**: Shows "**Payment due after 12 months:** ₱14,800 • Payment pending"

#### Per Cut-off Loans (CUT_OFF):

- **Before**: Showed "Installment: ₱983.33 / cut-off • Payments left: 12"
- **After**: Shows "Installment: ₱983.33 per cut-off • Payments left: 12"

### 2. ✅ **Enhanced Delete Functionality for Rejected Loans**

**Problem**: Rejected loans needed better cleanup functionality.

**Solution**: Enhanced the delete functionality with:

#### Visual Improvements:

- **Rejected loans**: Delete button is more prominent (red background, shows "🗑️ Remove")
- **Other loans**: Standard delete button (🗑️ only)

#### Better Confirmation Messages:

- **Rejected loans**: "Remove rejected loan request of ₱10,000 for John Doe?"
- **Other loans**: "Are you sure you want to delete the loan... will remove all related data"

#### Information Banner:

- Shows count of rejected loans with cleanup reminder
- Appears only when there are rejected loans
- Guides user to use the Remove button

## Code Changes

### Display Logic Fix (`src/app/loans/page.tsx`):

```tsx
{
  loan.repaymentPlan === "MONTHLY" ? (
    /* One-time payment: Show total amount and due date */
    <p>
      <strong>Payment due after {loan.termCount} months:</strong> ₱
      {totalDue.toFixed(2)}
      {periodsLeft !== undefined
        ? ` • ${periodsLeft > 0 ? "Payment pending" : "Fully paid"}`
        : ""}
    </p>
  ) : (
    /* Per cut-off installments: Show installment details */
    installment && (
      <p>
        Installment: ₱{installment.toFixed(2)} per cut-off
        {periodsLeft !== undefined ? ` • Payments left: ${periodsLeft}` : ""}
      </p>
    )
  );
}
```

### Enhanced Delete Function:

```tsx
const deleteLoan = (
  loanId: string,
  memberName: string,
  amount: number,
  status: string
) => {
  const message =
    status === "REJECTED"
      ? `Remove rejected loan request of ₱${amount.toLocaleString()} for ${memberName}?`
      : `Are you sure you want to delete the loan of ₱${amount.toLocaleString()} for ${memberName}? This will also remove all related repayments and penalties.`;

  const confirmDelete = confirm(message);
  if (confirmDelete) {
    dispatch({
      type: "DELETE_LOAN",
      payload: { loanId },
    });
  }
};
```

### Visual Enhancement for Delete Button:

```tsx
<button
  onClick={() =>
    deleteLoan(loan.id, member?.name || "Unknown", loan.amount, loan.status)
  }
  className={clsx(
    "px-2 py-1 text-xs rounded hover:bg-red-200 focus:outline-none",
    loan.status === "REJECTED"
      ? "bg-red-200 text-red-800 font-medium" // More prominent for rejected loans
      : "bg-red-100 text-red-700"
  )}
  title={
    loan.status === "REJECTED"
      ? "Delete rejected loan request"
      : "Delete this loan and all related data"
  }
>
  🗑️ {loan.status === "REJECTED" ? "Remove" : ""}
</button>
```

## Examples

### One-Time Loan Display:

```
Member: John Doe
Amount: ₱10,000
Plan: One-time payment (4% per month)
Term: 12 months (pay full amount after term)
Issue: Aug 22, 2025

Total Due: ₱14,800 • Repaid: ₱0 • Remaining: ₱14,800
Payment due after 12 months: ₱14,800 • Payment pending
```

### Per Cut-off Loan Display:

```
Member: Jane Smith
Amount: ₱10,000
Plan: Per Cut-off installments (3% per month)
Terms: 6 months (12 cut-off payments)
Issue: Aug 22, 2025

Total Due: ₱11,800 • Repaid: ₱2,000 • Remaining: ₱9,800
Installment: ₱983.33 per cut-off • Payments left: 10
```

## User Experience Improvements

✅ **Clear loan type distinction**: One-time vs installment loans now show completely different payment information

✅ **Better rejected loan management**: Prominent removal buttons and helpful banners

✅ **Contextual confirmation messages**: Different messages for different loan statuses

✅ **Visual hierarchy**: Rejected loans have more prominent delete buttons

✅ **Informational guidance**: Banners explain what actions are available

The loan management interface now clearly distinguishes between loan types and makes rejected loan cleanup intuitive and prominent!
