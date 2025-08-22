# Disbursement Tracking Fix

## Issue Identified
The disbursement tracking was not working because each page (main dashboard and loans page) had its own separate `selectedPeriod` state. When users selected a period on the main page and then approved a loan on the loans page, the loan would be assigned an undefined or empty `disbursementPeriodId` because the loans page had its own unset `selectedPeriod`.

## Root Cause
```typescript
// Main page (src/app/page.tsx)
const [selectedPeriod, setSelectedPeriod] = useState<string>("");

// Loans page (src/app/loans/page.tsx)  
const [selectedPeriod, setSelectedPeriod] = useState<string>(""); // SEPARATE STATE!
```

## Solution Implemented

### 1. Global Selected Period State
- Added `selectedPeriod: string` to the `CoopState` interface
- Added `SET_SELECTED_PERIOD` action to update the global selected period
- Updated reducer to handle the new action

### 2. Updated Pages to Use Global State
- **Main Page**: Now uses `state.selectedPeriod` instead of local state
- **Loans Page**: Now uses `state.selectedPeriod` instead of local state
- **Period Selection**: Both pages dispatch `SET_SELECTED_PERIOD` action instead of local setState

### 3. Fixed Loan Approval Flow
```typescript
// Before: Used local selectedPeriod (could be empty)
disbursementPeriodId: selectedPeriod || undefined

// After: Uses global selectedPeriod (shared across pages)
disbursementPeriodId: state.selectedPeriod || undefined
```

## Code Changes

### Types (src/types/index.ts)
```diff
export interface CoopState {
  beginningBalance: number;
  currentBalance: number;
  members: Member[];
  collections: CollectionPeriod[];
  loans: Loan[];
  repayments: Repayment[];
  penalties: Penalty[];
+ selectedPeriod: string;
}
```

### Context (src/context/CoopContext.tsx)
```diff
+ | { type: "SET_SELECTED_PERIOD"; payload: { periodId: string } }

const initialState: CoopState = {
  // ... other fields
+ selectedPeriod: "",
};

+ case "SET_SELECTED_PERIOD": {
+   return {
+     ...state,
+     selectedPeriod: action.payload.periodId,
+   };
+ }
```

### Pages Updated
- `src/app/page.tsx`: Uses `state.selectedPeriod` and dispatches `SET_SELECTED_PERIOD`
- `src/app/loans/page.tsx`: Uses `state.selectedPeriod` and dispatches `SET_SELECTED_PERIOD`

## Expected Behavior Now

1. **Select Period on Main Page**: Sets the global selected period
2. **Navigate to Loans Page**: Same period remains selected
3. **Approve Loan**: Loan gets assigned to the selected period as `disbursementPeriodId`
4. **Return to Main Page**: Period Ledger shows the disbursed amount in the red "Disbursed" column

## Testing Steps

1. Open the app at http://localhost:3000
2. Select a collection period from the dropdown
3. Go to Loans page - same period should be selected
4. Approve a loan (e.g., ₱5,000)
5. Return to main page
6. Check Period Ledger - should show ₱5,000 in the "Disbursed" column (red)

The disbursement tracking should now work correctly!
