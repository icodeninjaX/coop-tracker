# CLAUDE.MD - Coop Tracking System

**AI Assistant Guide for the Cooperative Management System**

## Project Overview

This is a full-stack web application for managing a 20-member cooperative with features for:

- Monthly contributions tracking (10th and 25th of each month)
- Share system with dividend distribution
- Multi-user authentication (each user has isolated data)
- Loan management with different repayment plans
- Financial ledger with automatic balance calculations
- Yearly archives for historical data
- Comprehensive export/import capabilities (CSV, JSON)
- Automatic penalty assessment for missed loan payments
- Responsive mobile-first design

**Tech Stack:**

- Next.js 15.4.6 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4.0
- Supabase (PostgreSQL + Auth)
- date-fns for date handling
- Zod v3 for runtime validation
- Jest + React Testing Library for testing

## Architecture

### State Management Pattern

The app uses **React Context + useReducer** pattern for state management:

1. **AuthContext** ([src/context/AuthContext.tsx](coop-tracking/src/context/AuthContext.tsx))

   - Manages user authentication state
   - Handles login, signup, logout, password reset
   - Persists session via Supabase Auth

2. **CoopContext** ([src/context/CoopContext.tsx](coop-tracking/src/context/CoopContext.tsx))
   - Global state for cooperative data (members, loans, payments, etc.)
   - Reducer-based actions for all state mutations
   - Automatically syncs to Supabase via `remoteState.ts`

### Data Flow

```
User Action → Dispatch Action → Reducer Updates State → Auto-save to Supabase → UI Re-renders
```

### File Structure

```
coop-tracking/
├── src/
│   ├── app/                      # Next.js App Router pages
│   │   ├── page.tsx              # Home dashboard (main entry point)
│   │   ├── layout.tsx            # Root layout with navigation
│   │   ├── members/
│   │   │   ├── page.tsx          # Member management page
│   │   │   └── [id]/page.tsx     # Individual member detail page
│   │   ├── loans/page.tsx        # Loan management page
│   │   ├── shares/page.tsx       # Share system management page
│   │   ├── ledger/page.tsx       # Period-by-period financial ledger
│   │   ├── archives/page.tsx     # Yearly archives page
│   │   ├── auth/
│   │   │   ├── login/page.tsx    # Login page
│   │   │   └── reset-password/page.tsx  # Password reset page
│   │   └── debug/
│   │       ├── page.tsx          # Debug page
│   │       └── connection/page.tsx  # Connection debug page
│   ├── components/
│   │   ├── AppNavigation.tsx     # Responsive nav with mobile menu
│   │   ├── AuthForm.tsx          # Login/signup form
│   │   ├── ProtectedRoute.tsx    # Auth wrapper for protected pages
│   │   ├── UI.tsx                # Reusable UI components
│   │   ├── AuthenticatedCoopProvider.tsx  # Loads user data after auth
│   │   ├── LoanSchedule.tsx      # Loan payment schedule display
│   │   ├── ErrorBoundary.tsx     # Error boundary wrapper
│   │   ├── NetworkErrorRecovery.tsx  # Network error recovery UI
│   │   ├── SupabaseBadge.tsx     # Connection status indicator
│   │   └── SupabaseErrorBoundary.tsx  # Supabase error handling
│   ├── context/
│   │   ├── AuthContext.tsx       # Authentication state
│   │   ├── CoopContext.tsx       # Cooperative state (members, loans, etc.)
│   │   └── __tests__/
│   │       └── CoopContext.test.tsx  # Context tests
│   ├── lib/
│   │   ├── supabaseClient.ts     # Supabase client initialization
│   │   ├── remoteState.ts        # Auto-sync state to/from Supabase
│   │   ├── shareCalculations.ts  # Share system calculations
│   │   ├── dataMigration.ts      # Data migration utilities
│   │   ├── exportUtils.ts        # Export/import utilities (CSV, JSON)
│   │   ├── validation.ts         # Zod validation schemas
│   │   ├── errorHandler.ts       # Error handling utilities
│   │   ├── networkUtils.ts       # Network error handling
│   │   ├── debugUtils.ts         # Debugging utilities
│   │   └── __tests__/
│   │       └── validation.test.ts  # Validation tests
│   └── types/
│       └── index.ts              # TypeScript type definitions
├── jest.config.js                # Jest test configuration
├── jest.setup.js                 # Jest setup file
├── supabase.sql                  # Database schema setup
└── package.json
```

## Core Data Models

### TypeScript Types ([src/types/index.ts](coop-tracking/src/types/index.ts))

```typescript
Member {
  id: number;                   // 1-20 for the 20 members
  name: string;
  committedShares: number;      // Fixed share commitment (set by admin)
  forfeited?: boolean;          // Whether member has forfeited dividends
  forfeitureDate?: string;      // When forfeiture occurred
  forfeitedInterest?: number;   // Total interest forfeited
}

CollectionPeriod {
  id: string;
  date: string;                 // ISO date (YYYY-MM-DD)
  totalCollected: number;
  payments: Payment[];
  defaultContribution?: number;  // Default per-member contribution
}

Payment {
  memberId: number;
  amount: number;
  date: string;
  collectionPeriod: string;     // ID of the collection period
}

Loan {
  id: string;
  memberId: number;
  amount: number;               // Principal
  dateIssued: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "PAID";
  dateApproved?: string;
  disbursementPeriodId?: string;  // When funds were disbursed
  repaymentPlan?: "MONTHLY" | "CUT_OFF";
  interestRate?: number;        // 0.04 (4%) for MONTHLY, 0.03 (3%) for CUT_OFF
  termCount?: number;           // Number of months or cut-off periods
  dateClosed?: string;
  penaltyRate?: number;         // Default: 0.03 (3%)
}

Repayment {
  id: string;
  loanId: string;
  memberId: number;
  amount: number;
  date: string;
  periodId: string;             // Which collection period the repayment was made in
}

Penalty {
  id: string;
  loanId: string;
  memberId: number;
  amount: number;
  date: string;
  reason: string;
  periodId?: string;
}

MemberShareHistory {
  memberId: number;
  date: string;
  previousShares: number;
  newShares: number;
  changedBy?: string;
  reason?: string;
}

MemberDividend {
  memberId: number;
  shares: number;
  dividendAmount: number;
  forfeited: boolean;
}

DividendDistribution {
  id: string;
  date: string;
  totalInterestPool: number;
  totalShares: number;
  perShareDividend: number;
  distributions: MemberDividend[];
  periodsCovered: string[];
}

YearlyArchive {
  year: number;
  archivedDate: string;
  summary: {
    totalCollected: number;
    totalDisbursed: number;
    totalRepayments: number;
    totalPenalties: number;
    endingBalance: number;
    activeMembers: number;
    totalLoansIssued: number;
    totalShares?: number;
    totalDividendsDistributed?: number;
  };
  collections: CollectionPeriod[];
  loans: Loan[];
  repayments: Repayment[];
  penalties: Penalty[];
  shareHistory?: MemberShareHistory[];
  dividendDistributions?: DividendDistribution[];
}

CoopState {
  beginningBalance: number;
  currentBalance: number;
  members: Member[];
  collections: CollectionPeriod[];
  loans: Loan[];
  repayments: Repayment[];
  penalties: Penalty[];
  selectedPeriod: string;       // Currently selected period ID
  // Share System fields
  sharePrice: number;           // Price per share (default: 500)
  totalInterestPool: number;    // Accumulated interest from loans
  dividendDistributions: DividendDistribution[];
  shareHistory: MemberShareHistory[];
  // Archive System
  archives: YearlyArchive[];
}
```

### Database Schema (Supabase)

**Table:** `coop_state`

- `id` (UUID, PK)
- `user_id` (UUID, unique) - Links to Supabase auth.users
- `data` (JSONB) - Stores entire CoopState object
- `created_at` (timestamp)
- `updated_at` (timestamp, auto-updated via trigger)

**Row Level Security (RLS):**

- Users can only access their own data (`auth.uid() = user_id`)
- Each user has completely isolated cooperative data

## Key Business Logic

### 1. Financial Calculations

**Current Balance:**

```
currentBalance = SUM(all collections) + SUM(all repayments) - SUM(approved loan disbursements)
```

**Period Ledger:**

```
Beginning Balance = Previous periods' ending balance
Collections This Period = SUM(payments in this period)
Disbursements = SUM(loans approved in this period)
Repayments = SUM(loan repayments in this period)
Ending Balance = Beginning + Collections + Repayments - Disbursements
```

### 2. Loan Interest Calculations

**Cut-off Plan (3% interest, bi-monthly payments):**

```
Total Due = Principal × (1 + 0.03 × termCount)
Per Installment = Total Due ÷ termCount
Payment Schedule: 10th and 25th of each month
```

**Monthly Plan (4% interest, one-time payment):**

```
Total Due = Principal × (1 + 0.04 × termCount)
Payment Schedule: Monthly on the approval date anniversary
```

### 3. Loan Status Workflow

```
PENDING → (admin reviews) → APPROVED or REJECTED
APPROVED → (repayments tracked) → PAID (when fully repaid)
```

**Auto-status update:** When total repayments >= total due, loan status changes to "PAID"

**Interest Pool Update:** When a loan is APPROVED or PAID, the interest earned is automatically added to the total interest pool for dividend distribution.

### 4. Automatic Penalty Assessment

The system automatically calculates penalties for missed loan payments based on the repayment schedule.

**Cut-off Plan (bi-monthly):**
- Expected payments on 10th and 25th of each month
- If payment is missed, penalty = (installment amount × penalty rate)
- Default penalty rate: 3%

**Monthly Plan:**
- Expected payment on the approval date anniversary each month
- If payment is missed after due date, penalty = (total due × penalty rate)
- Default penalty rate: 3%

**Auto-creation:** Penalties are automatically created when:
1. A collection period ends
2. A loan has missed installments based on its schedule
3. The loan status is APPROVED (not PENDING or PAID)

### 5. Share System

The share system manages member share commitments and dividend distributions.

**Share Model (Fixed Commitment):**
- Each member has a fixed number of committed shares (set by admin)
- Shares DO NOT accumulate automatically with payments
- Admin manually updates member shares via the Shares page
- Share price: ₱500 per share (configurable via `sharePrice` state)

**Expected Contribution:**
```
Expected Contribution = committedShares × sharePrice
```

**Interest Pool:**
```
totalInterestPool = SUM(all interest from APPROVED/PAID loans)
```

Interest is calculated as:
```
Loan Interest = Principal × Interest Rate × Term Count
```

**Dividend Distribution:**
```
Total Active Shares = SUM(shares of non-forfeited members)
Per Share Dividend = Total Interest Pool ÷ Total Active Shares
Member Dividend = Member Shares × Per Share Dividend (if not forfeited)
```

**Forfeiture:**
- Members can be marked as "forfeited" by admin
- Forfeited members:
  - Keep their committed shares
  - Do NOT receive dividends from distributions
  - Forfeited amount is tracked in `forfeitedInterest`
- Members can be restored (un-forfeited) at any time

**Share System Actions:**

**Update Member Shares:**
```typescript
dispatch({
  type: "UPDATE_MEMBER_SHARES",
  payload: {
    memberId: 5,
    shares: 10  // New share commitment
  }
});
```

**Bulk Update Shares:**
```typescript
dispatch({
  type: "BULK_UPDATE_SHARES",
  payload: [
    { memberId: 1, shares: 10 },
    { memberId: 2, shares: 15 },
    // ...
  ]
});
```

**Distribute Dividends:**
```typescript
dispatch({
  type: "DISTRIBUTE_DIVIDENDS",
  payload: {
    periodsCovered: ["period-id-1", "period-id-2"]
  }
});
```

**Forfeit Member Interest:**
```typescript
dispatch({
  type: "FORFEIT_INTEREST",
  payload: {
    memberId: 5,
    reason: "Non-compliance with payment schedule"
  }
});
```

**Restore Member:**
```typescript
dispatch({
  type: "RESTORE_MEMBER_INTEREST",
  payload: {
    memberId: 5
  }
});
```

**Update Share Price:**
```typescript
dispatch({
  type: "UPDATE_SHARE_PRICE",
  payload: {
    newPrice: 600
  }
});
```

### 6. Ledger Page (/ledger)

The Ledger page provides a comprehensive period-by-period financial statement.

**Features:**
- Shows all collection periods in chronological order
- Each period displays:
  - Opening balance (ending balance of previous period)
  - Collections (total payments received)
  - Disbursements (loans approved in this period)
  - Repayments (loan repayments in this period)
  - Penalties (penalties assessed in this period)
  - Closing balance (opening + collections + repayments - disbursements + penalties)
- Responsive table on desktop, card view on mobile
- Color-coded transactions (green for inflows, red for outflows)
- Calculation explanations for transparency

**Accessing:**
Navigate to `/ledger` or use "Ledger" in the main navigation.

### 7. Archives System (/archives)

The Archives system allows storing historical year data separately from active data.

**Features:**
- Archive entire year's data (all periods, loans, repayments from that year)
- Summary statistics per archived year
- Expandable year details to view archived data
- Preserves historical records
- Clears active data after archiving

**Archive Structure:**
Each archive contains:
- Year number
- Archive date
- Summary statistics (collections, disbursements, loans, members, etc.)
- All collection periods from that year
- All loans issued/approved in that year
- All repayments made in that year
- All penalties assessed in that year
- Share history (if applicable)
- Dividend distributions (if applicable)

**Archive Year:**
```typescript
dispatch({
  type: "ARCHIVE_YEAR",
  payload: {
    year: 2024
  }
});
```

**Reset Periods (after archiving):**
```typescript
dispatch({
  type: "RESET_PERIODS"
});
```

This clears all collection periods, pending loans, and resets the system for the new year while preserving:
- Member information (names, shares)
- Current balance
- Approved loans (continued from previous year)

### 8. Export/Import System

Comprehensive data export and import capabilities for backup, reporting, and data portability.

**CSV Exports Available:**
- Collections (all periods with summary)
- Payments (per-member payment history)
- Loans (all loans with details)
- Repayments (all repayments with loan info)
- Members (member list with share info)
- Penalties (all penalties assessed)
- Financial Summary (key statistics)

**JSON Exports Available:**
- Full State (complete CoopState object)
- Collections (structured collection data)
- Loans (structured loan data)
- Archives (archived year data)

**Import:**
- Import from JSON (full state or partial data)
- Validates data before import using Zod schemas
- Preserves data integrity

**Usage Example:**
```typescript
import { exportToCSV, exportToJSON, importFromJSON } from '@/lib/exportUtils';

// Export collections to CSV
const collectionsCSV = exportToCSV.collections(state.collections, state.members);
downloadFile(collectionsCSV, 'collections.csv', 'text/csv');

// Export full state to JSON
const fullStateJSON = exportToJSON.fullState(state);
downloadFile(fullStateJSON, 'coop-state-backup.json', 'application/json');

// Import from JSON
const importedState = importFromJSON(jsonString);
```

### 9. Validation System (Zod)

Runtime type validation ensures data integrity and catches errors early.

**Features:**
- Zod v3 schemas for all data types
- Runtime validation on data import
- Safe validation helpers with error handling
- Type inference from schemas

**Available Schemas:**
- `MemberSchema`
- `PaymentSchema`
- `CollectionPeriodSchema`
- `LoanSchema`
- `RepaymentSchema`
- `PenaltySchema`
- `MemberShareHistorySchema`
- `DividendDistributionSchema`
- `YearlyArchiveSchema`
- `CoopStateSchema`

**Usage:**
```typescript
import { validateData, safeValidate } from '@/lib/validation';

// Validate data (throws on error)
const validMember = validateData(MemberSchema, memberData);

// Safe validation (returns result object)
const result = safeValidate(LoanSchema, loanData);
if (result.success) {
  console.log('Valid loan:', result.data);
} else {
  console.error('Validation errors:', result.errors);
}
```

### 10. Testing Infrastructure

Jest and React Testing Library are configured for unit and integration testing.

**Test Configuration:**
- Jest config: `jest.config.js`
- Setup file: `jest.setup.js`
- Test files: `**/__tests__/**/*.test.ts(x)`

**Running Tests:**
```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

**Example Tests:**
- Context tests: `src/context/__tests__/CoopContext.test.tsx`
- Validation tests: `src/lib/__tests__/validation.test.ts`

## Utility Libraries

### Share Calculations (`src/lib/shareCalculations.ts`)

Key functions for share system calculations:

- `calculateSharesFromContribution(contribution, sharePrice)` - Calculate shares from contribution amount
- `calculateTotalShares(members)` - Sum of all member shares
- `calculateInterestEarned(loan)` - Calculate total interest from loan
- `calculateDividendDistribution(totalInterestPool, members, sharePrice)` - Calculate per-member dividends
- `calculateExpectedContribution(shares, sharePrice)` - Expected contribution based on shares
- `checkPaymentCompliance(member, payments, sharePrice)` - Check if member payments meet expectations

### Data Migration (`src/lib/dataMigration.ts`)

Handles automatic migration of data to new schema versions:

- `needsShareMigration(state)` - Detect if migration is needed
- `migrateToShareSystem(state)` - Migrate to share system (adds share fields, recalculates interest pool)
- `validateShareSystem(state)` - Validate migrated data
- `getMigrationSummary(oldState, newState)` - Generate migration report

### Export/Import (`src/lib/exportUtils.ts`)

Comprehensive export and import functionality:

**CSV Exports:**
- `exportToCSV.collections(collections, members)` - Export collections
- `exportToCSV.payments(collections, members)` - Export payment history
- `exportToCSV.loans(loans, members)` - Export loan data
- `exportToCSV.repayments(repayments, loans, members)` - Export repayment history
- `exportToCSV.members(members, sharePrice)` - Export member list
- `exportToCSV.penalties(penalties, loans, members)` - Export penalties
- `exportToCSV.financialSummary(state)` - Export financial summary

**JSON Exports:**
- `exportToJSON.fullState(state)` - Export entire state
- `exportToJSON.collections(collections)` - Export collections only
- `exportToJSON.loans(loans)` - Export loans only
- `exportToJSON.archives(archives)` - Export archives

**Import:**
- `importFromJSON(jsonString)` - Import and validate JSON data

**Helpers:**
- `downloadFile(content, filename, mimeType)` - Trigger file download

### Validation (`src/lib/validation.ts`)

Zod-based runtime validation:

- `validateData(schema, data)` - Validate data (throws on error)
- `safeValidate(schema, data)` - Safe validation (returns result object)
- All schemas exported: `MemberSchema`, `LoanSchema`, `CoopStateSchema`, etc.

### Error Handling (`src/lib/errorHandler.ts`)

Centralized error handling:

- Error classification (network, validation, database, etc.)
- Error logging
- User-friendly error messages
- Error recovery strategies

### Network Utilities (`src/lib/networkUtils.ts`)

Network error detection and handling:

- Network status monitoring
- Retry logic for failed requests
- Connection recovery UI

## Common Development Tasks

### Adding a New Feature

1. **Update Types** ([src/types/index.ts](coop-tracking/src/types/index.ts))

   - Add new interfaces or extend existing ones

2. **Update CoopContext** ([src/context/CoopContext.tsx](coop-tracking/src/context/CoopContext.tsx))

   - Add new action types
   - Add reducer cases for the new actions
   - Add action creator functions

3. **Update UI**

   - Modify existing pages or add new routes in `src/app/`
   - Use components from `src/components/UI.tsx` for consistency

4. **Add Validation** (if applicable)

   - Add Zod schema in `src/lib/validation.ts`
   - Use `validateData` or `safeValidate` to validate user input

5. **Test Supabase Sync**
   - Changes auto-save via `remoteState.ts`
   - Test multi-device sync by opening app in two browsers

6. **Write Tests** (if applicable)
   - Add unit tests for new functions
   - Add integration tests for new features
   - Use Jest and React Testing Library

### Working with Collections

**Add New Collection Period:**

```typescript
dispatch({
  type: "ADD_COLLECTION_PERIOD",
  payload: {
    id: generateId(),
    date: "2025-01-10", // YYYY-MM-DD format
    totalCollected: 0,
    payments: [],
  },
});
```

**Record Payment:**

```typescript
dispatch({
  type: "RECORD_PAYMENT",
  payload: {
    periodId: selectedPeriod,
    payment: {
      memberId: 1,
      amount: 1000,
      date: new Date().toISOString(),
      collectionPeriod: selectedPeriod,
    },
  },
});
```

### Working with Loans

**Create Loan:**

```typescript
dispatch({
  type: "ADD_LOAN",
  payload: {
    id: generateId(),
    memberId: 5,
    amount: 10000,
    dateIssued: new Date().toISOString(),
    status: "PENDING",
    repaymentPlan: "CUT_OFF",
    interestRate: 0.03,
    termCount: 6, // 6 cut-off periods = 3 months
  },
});
```

**Approve Loan:**

```typescript
dispatch({
  type: "UPDATE_LOAN_STATUS",
  payload: {
    loanId: loan.id,
    status: "APPROVED",
    dateApproved: new Date().toISOString(),
    disbursementPeriodId: selectedPeriod,
  },
});
```

**Record Repayment:**

```typescript
dispatch({
  type: "ADD_REPAYMENT",
  payload: {
    id: generateId(),
    loanId: loan.id,
    memberId: loan.memberId,
    amount: 1750, // Installment amount
    date: new Date().toISOString(),
    periodId: selectedPeriod,
  },
});
```

## Important Implementation Details

### 1. Authentication Flow

- Users must be authenticated to access any data
- `ProtectedRoute` component wraps all protected pages
- `AuthenticatedCoopProvider` loads user's data after login
- Logout clears both local state and Supabase session

### 2. Data Persistence

- All state changes auto-save to Supabase via `saveCoopState()` in `remoteState.ts`
- On app load, `loadCoopState(userId)` fetches user's data
- Debounced saving prevents excessive database writes

### 3. Mobile-First Responsive Design

**Philosophy:**

- Mobile-first approach: Design for mobile screens first, then enhance for larger screens
- Touch-friendly interactions with minimum 44px touch targets
- Progressive enhancement: Add complexity only for larger screens
- Consistent patterns across all pages

**Tailwind Breakpoints:**

```
Base:   < 640px   (Mobile phones)
sm:     ≥ 640px   (Large phones, small tablets)
md:     ≥ 768px   (Tablets)
lg:     ≥ 1024px  (Desktops, large tablets)
```

**Key Mobile Patterns:**

1. **Navigation (AppNavigation.tsx)**

   - Hamburger menu on mobile (`< md:`)
   - Full horizontal nav on desktop (`≥ md:`)
   - Sticky header with backdrop blur
   - Animated menu transitions
   - Mobile menu overlay with touch-optimized spacing

2. **Grid Layouts**

   - Dashboard Stats: `grid-cols-2 lg:grid-cols-3` (2 columns mobile, 3 desktop for 6 total stats)
   - Collection Periods: Horizontal scroll on mobile, grid on desktop
   - Loan Cards: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
   - Member Cards: Single column mobile, multi-column desktop

3. **Horizontal Scroll Pattern (Mobile)**

   ```jsx
   {
     /* Mobile: Horizontal Scroll */
   }
   <div className="md:hidden overflow-x-auto -mx-3 px-3 pb-2">
     <div className="flex gap-3 min-w-min">
       {items.map((item) => (
         <div className="min-w-[160px] flex-shrink-0">{/* Item content */}</div>
       ))}
     </div>
   </div>;

   {
     /* Desktop: Grid */
   }
   <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-4">
     {/* Same items in grid */}
   </div>;
   ```

4. **Button Layouts**

   - Stack vertically on mobile: `flex-col sm:flex-row`
   - Modal actions: Full width on mobile, auto-width on desktop
   - Minimum touch target: `min-h-[44px]`
   - Gap spacing: `gap-2 sm:gap-3`

5. **Typography Scaling**

   - Headers: `text-2xl sm:text-3xl`
   - Body text: `text-sm sm:text-base`
   - Stats: `text-xl sm:text-2xl lg:text-3xl`
   - Progressive scaling for readability

6. **Spacing Patterns**

   - Padding: `px-3 sm:px-6` (less on mobile)
   - Margins: `mb-6 sm:mb-10` (less on mobile)
   - Gaps: `gap-3 sm:gap-4 lg:gap-6` (progressive)
   - Container: `max-w-7xl mx-auto`

7. **Touch Targets**

   - All interactive elements: **Minimum 44x44px**
   - Buttons: `min-h-[44px]`
   - Icon buttons: `h-12 w-12` (48px)
   - Adequate spacing between clickable elements

8. **Mobile-Specific Components**

   - **Floating Action Button (FAB)**: `fixed bottom-20 right-4`
   - **Bottom Action Bar**: `fixed bottom-0 inset-x-0`
   - **Dropdown Menus**: Single button with expandable action menu (e.g., Quick Actions on Dashboard)
     - Uses `absolute` positioning with backdrop overlay
     - Auto-closes on action selection or outside click
     - Color-coded icons with titles and descriptions
   - **Collapsible Menus**: Expandable member/loan actions
   - **Sticky Headers**: Search and filter bars

9. **Modals**
   - Full-screen on mobile: `max-h-[95vh]`
   - Rounded top corners: `rounded-t-3xl sm:rounded-2xl`
   - Slide-up animation from bottom
   - Larger close buttons on mobile: `h-6 w-6 sm:h-5 sm:w-5`
   - Stacked action buttons: `flex-col sm:flex-row`

**Page-Specific Patterns:**

**Dashboard (page.tsx):**

- **Quick Actions Menu**: Single dropdown button consolidates Export, Import, New Period, New Loan, and Reset actions
  - Button positioned right-aligned next to Dashboard heading on all screen sizes
  - Dropdown menu with icons, titles, and descriptions for each action
  - Color-coded icons matching action types (emerald for export, purple for import, etc.)
  - Auto-closes after action selection or clicking outside
- 2-column stats grid on mobile, 3 on desktop (Total Balance, Members, Active Loans, Pending Loans, Committed Shares, Interest Pool)
- Collection periods: Horizontal scroll (mobile) vs Grid (desktop)
- All modals have responsive button layouts

**Members Page (members/page.tsx):**

- Sticky search header on mobile
- Horizontal scrollable stats
- Collapsible member action menus
- FAB for adding members (mobile only)
- Bottom action bar for bulk operations

**Individual Member Page (members/[id]/page.tsx):**

- Responsive member detail header
- Payment history table (scrollable on mobile)
- Loan history cards
- Statistics grid adapts to screen size

**Loans Page (loans/page.tsx):**

- Responsive loan cards
- Stacked approve/reject buttons on mobile
- 2-column grid on mobile, 4 on desktop for stats
- Full-width forms on mobile
- LoanSchedule component with responsive table/card view

**Shares Page (shares/page.tsx):**

- Share management table (horizontal scroll on mobile)
- Bulk update modal with responsive layout
- Dividend distribution modal with member list
- Stats grid for share summary
- Forfeit/restore buttons stack on mobile

**Ledger Page (ledger/page.tsx):**

- Full-width responsive table
- Each period shows as card on mobile
- Collapsible transaction details
- Color-coded inflows/outflows
- Calculation explanations

**Archives Page (archives/page.tsx):**

- Yearly archive cards
- Expandable year details
- Summary statistics grid
- Archive modal with year selector
- Responsive archive data view

**Testing Mobile Responsiveness:**

1. Use browser DevTools responsive mode
2. Test breakpoints: 375px (iPhone), 768px (iPad), 1024px (Desktop)
3. Verify touch targets are at least 44px
4. Test horizontal scroll on actual mobile devices
5. Verify modals work well on small screens
6. Check text readability at all sizes
7. Test landscape orientation on tablets

### 4. Collection Period Management

- Default schedule: 10th and 25th of each month
- "Add Next Period" button auto-calculates next scheduled date
- Manual period creation allows custom dates
- Always select a period before recording payments

### 5. Member Management

- 20 members initialized with default names "Member 1" - "Member 20"
- Names are customizable
- Each member tracks payment history and loan status
- Bulk operations available (Mark All Paid/Unpaid)

### 6. Application Navigation

The application has the following main pages accessible via the navigation bar:

**Main Pages:**
1. **Dashboard** (`/`) - Home page with collection periods and quick stats
2. **Members** (`/members`) - Member management and payment tracking
3. **Loans** (`/loans`) - Loan application, approval, and repayment tracking
4. **Shares** (`/shares`) - Share system management and dividend distribution
5. **Ledger** (`/ledger`) - Period-by-period financial statement
6. **Archives** (`/archives`) - Yearly archive management

**Additional Pages:**
- **Individual Member** (`/members/[id]`) - Detailed member view (accessible via Members page)
- **Login** (`/auth/login`) - Authentication page
- **Password Reset** (`/auth/reset-password`) - Password recovery
- **Debug** (`/debug`) - Debug information page
- **Connection Debug** (`/debug/connection`) - Supabase connection testing

**Navigation Behavior:**
- Mobile (< 768px): Hamburger menu with slide-down overlay
- Desktop (≥ 768px): Horizontal navigation bar with all links visible
- Active page highlighted with different background color
- Logout button always visible in navigation

### 7. Collection Period Management (Enhanced)

- Default schedule: 10th and 25th of each month
- "Add Next Period" button auto-calculates next scheduled date
- Manual period creation allows custom dates
- **Edit Period:** Change date and default contribution amount
- **Delete Period:** Removes period and all associated payments (cascade delete)
  - When deleting a period, all payment references are also removed
  - Period IDs are updated throughout the system (in repayments, penalties, etc.)
- Always select a period before recording payments

## Debugging Tips

### Common Issues

**"Cannot record payment - no period selected"**

- Ensure a collection period is selected before recording payments
- Check `state.selectedPeriod` is set

**Balances don't match**

- Review Period Ledger for calculation details
- Check that loans are APPROVED (not PENDING) to count as disbursements
- Verify repayments are linked to correct periods

**Data not syncing**

- Check browser console for Supabase errors
- Verify `.env.local` has correct Supabase credentials
- Check network tab for failed API calls
- Use debug pages: `/debug` and `/debug/connection`

**Authentication errors**

- Check Supabase project is active
- Verify RLS policies are enabled
- Check `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Testing Scenarios

### Manual Testing Checklist

1. **Authentication**

   - Sign up new user
   - Login with existing user
   - Logout
   - Password reset

2. **Collection Periods**

   - Create new period
   - Edit period date and default contribution
   - Delete period (verify cascade cleanup)
   - Record individual payments
   - Mark all members paid
   - Verify totals calculate correctly

3. **Loans**

   - Create loan (PENDING status)
   - Approve loan (check balance decreases and interest pool increases)
   - Record repayments (check installment tracking)
   - Verify auto-status change to PAID when fully repaid
   - Verify auto-penalty creation for missed payments
   - Delete loan (verify interest pool recalculation)

4. **Share System**

   - Set/update member committed shares (individual and bulk)
   - Update share price
   - Verify expected contribution calculations
   - Distribute dividends (check interest pool zeroes out)
   - Forfeit member interest (verify they don't receive dividends)
   - Restore forfeited member
   - View share history

5. **Ledger Page**

   - Navigate to `/ledger`
   - Verify period-by-period breakdown
   - Check calculation accuracy (opening + inflows - outflows = closing)
   - Test responsive view (table on desktop, cards on mobile)

6. **Archives**

   - Archive a complete year
   - Verify archive summary statistics
   - View archived data (expand year details)
   - Reset periods after archiving
   - Verify active data cleared but balance/members/shares preserved

7. **Export/Import**

   - Export collections to CSV
   - Export loans to CSV
   - Export full state to JSON
   - Import state from JSON
   - Verify data integrity after import
   - Download comprehensive report

8. **Financial Accuracy**

   - Check Ledger page calculations
   - Verify current balance = collections + repayments - disbursements
   - Verify interest pool = sum of all approved/paid loan interest
   - Test with multiple periods and loans
   - Verify dividend calculations

9. **Auto-Penalty System**

   - Approve loan with cutoff plan
   - Let payment period pass without repayment
   - Verify penalty automatically created
   - Test monthly plan penalty assessment

10. **Multi-device Sync**

    - Login on two devices
    - Make changes on device A
    - Verify changes appear on device B after refresh

11. **Mobile Responsiveness**

    - Test on mobile devices (375px width minimum)
    - Verify stats grid shows 2 columns on mobile
    - Test horizontal scroll for collection periods
    - Verify all buttons stack vertically on mobile
    - Check touch targets are minimum 44px
    - Test modals slide up properly from bottom
    - Verify FAB button appears on Members page (mobile only)
    - Test hamburger menu navigation
    - Test all new pages (Shares, Ledger, Archives) on mobile

12. **Tablet & Desktop Views**

    - Test at 768px (tablet) - verify 2-column layouts
    - Test at 1024px+ (desktop) - verify 4-column grids
    - Ensure navigation shows full horizontal menu (Dashboard, Members, Loans, Shares, Ledger, Archives)
    - Verify no horizontal scroll on large screens

13. **Data Migration**

    - Test migration from old state (without share system)
    - Verify automatic share initialization
    - Verify interest pool recalculation
    - Check migration summary

14. **Error Handling**
    - Test network disconnection recovery
    - Test Supabase error handling
    - Test validation errors on import
    - Test error boundaries

## Environment Variables

**.env.local** (required for production):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Get these from: Supabase Dashboard → Project Settings → API

## Deployment

**Build:**

```bash
npm run build
```

**Start Production:**

```bash
npm start
```

**Deployment Platforms:**

- Vercel (recommended for Next.js)
- Netlify
- Any platform supporting Next.js

**Required:**

- Set environment variables in deployment platform
- Ensure Supabase project is accessible from production domain

## Code Style & Conventions

- **TypeScript:** Strict mode enabled, all types defined in `src/types/index.ts`
- **Components:** Functional components with hooks
- **Styling:** Tailwind utility classes (avoid inline styles)
- **State Updates:** Always use dispatch actions, never mutate state directly
- **Dates:** ISO 8601 format (YYYY-MM-DD) for consistency
- **IDs:** UUID v4 for unique identifiers

## Design System

### Color Palette (Minimalist Pastel)

**Primary Colors (Indigo/Purple):**

```
indigo-900    #312e81   Primary text, headings
indigo-800    #3730a3   Secondary text, labels
indigo-700    #4338ca   Tertiary text, links
indigo-600    #4f46e5   Body text, labels
indigo-400    #818cf8   Icons, accents
indigo-300    #a5b4fc   Primary buttons, active states
indigo-200    #c7d2fe   Borders, dividers
indigo-100    #e0e7ff   Hover backgrounds
indigo-50     #eef2ff   Page background tint
purple-200    #e9d5ff   Accent borders
purple-50     #faf5ff   Accent background tint
```

**Background Gradients:**

```
Main pages:   bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50
Cards:        bg-white/80 backdrop-blur-sm
Navigation:   bg-gradient-to-r from-indigo-50 to-purple-50
```

**Success (Emerald/Green):**

```
emerald-900   #064e3b   Success text
emerald-800   #065f46   Success labels
emerald-600   #059669   Success body
emerald-300   #6ee7b7   Success button backgrounds
emerald-200   #a7f3d0   Success borders
emerald-100   #d1fae5   Success backgrounds
emerald-50    #ecfdf5   Success tint
```

**Warning (Amber/Yellow):**

```
amber-900     #78350f   Warning text
amber-800     #92400e   Warning labels
amber-600     #d97706   Warning body
amber-200     #fde68a   Warning borders
amber-100     #fef3c7   Warning backgrounds
amber-50      #fffbeb   Warning tint
```

**Danger (Rose/Pink):**

```
rose-900      #881337   Error text
rose-800      #9f1239   Error labels
rose-700      #be123c   Error body
rose-300      #fda4af   Error button backgrounds
rose-200      #fecdd3   Error borders
rose-100      #ffe4e6   Error backgrounds
rose-50       #fff1f2   Error tint
pink-50       #fdf2f8   Accent tint
```

### Typography (Poppins Font Family)

**Font Weights:**

```
font-light    300   Body text, descriptions, secondary info
font-normal   400   Labels, buttons, regular text
font-medium   500   (Rarely used)
font-semibold 600   (Rarely used)
```

**Text Sizes (Responsive):**

```
Headings (h1):   text-2xl sm:text-3xl (24px → 30px)
Headings (h2):   text-base sm:text-lg (16px → 18px)
Body text:       text-sm sm:text-base (14px → 16px)
Stats (large):   text-xl sm:text-2xl lg:text-3xl (20px → 24px → 30px)
Labels:          text-xs (12px)
Uppercase:       text-xs uppercase tracking-wider
```

### Component Patterns

**Cards:**

```jsx
<div
  className="bg-white/80 backdrop-blur-sm border-2 border-indigo-200 rounded-xl p-4 sm:p-6
                hover:shadow-md hover:border-indigo-300 transition-all duration-200"
>
  {/* Content */}
</div>
```

**Stat Cards (Multi-color):**

```jsx
// Indigo variant
<div
  className="bg-white/80 backdrop-blur-sm border-2 border-indigo-200 rounded-xl p-4 sm:p-6
                hover:shadow-md hover:border-indigo-300"
>
  <p className="text-xs uppercase tracking-wider text-indigo-600 mb-2">Label</p>
  <p className="text-2xl sm:text-3xl font-semibold text-indigo-900">Value</p>
</div>

// Purple, Emerald, Amber variants follow same pattern with respective colors
```

**Buttons (Primary):**

```jsx
<button
  className="px-5 py-2.5 bg-indigo-300 text-indigo-900 text-sm
                   font-normal rounded-md hover:bg-indigo-400 shadow-sm
                   transition-all duration-200 min-h-[44px]"
>
  Button Text
</button>
```

**Buttons (Secondary):**

```jsx
<button
  className="px-5 py-2.5 border-2 border-indigo-200 text-indigo-800
                   text-sm font-normal rounded-md hover:border-indigo-300
                   hover:bg-indigo-50 transition-all duration-200 min-h-[44px]"
>
  Button Text
</button>
```

**Buttons (Success):**

```jsx
<button
  className="px-5 py-2.5 bg-emerald-200 text-emerald-800 text-sm
                   font-normal rounded-md hover:bg-emerald-300 shadow-sm
                   transition-all duration-200 min-h-[44px]"
>
  Approve
</button>
```

**Buttons (Danger):**

```jsx
<button
  className="px-5 py-2.5 bg-rose-200 text-rose-800 text-sm
                   font-normal rounded-md hover:bg-rose-300 shadow-sm
                   transition-all duration-200 min-h-[44px]"
>
  Delete
</button>
```

**Input Fields:**

```jsx
<input
  className="w-full px-4 py-3 border-2 border-indigo-200 rounded-lg
                  focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400
                  placeholder-indigo-300 bg-white text-sm font-light"
/>
```

**Badges:**

```jsx
// Success
<span className="px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200
                 rounded-full text-xs font-normal">
  Active
</span>

// Warning
<span className="px-3 py-1 bg-amber-100 text-amber-800 border border-amber-200
                 rounded-full text-xs font-normal">
  Pending
</span>

// Danger
<span className="px-3 py-1 bg-rose-100 text-rose-800 border border-rose-200
                 rounded-full text-xs font-normal">
  Rejected
</span>

// Info
<span className="px-3 py-1 bg-indigo-100 text-indigo-800 border border-indigo-200
                 rounded-full text-xs font-normal">
  Info
</span>
```

### Animation & Transitions

**Standard Transition:**

```
transition-all duration-200
```

**Hover Effects:**

- Cards: `hover:shadow-md hover:border-indigo-300`
- Primary Buttons: `hover:bg-indigo-400`
- Secondary Buttons: `hover:border-indigo-300 hover:bg-indigo-50`
- Links: `hover:text-indigo-900`

**Mobile Menu Animation:**

- Slide from top
- Backdrop blur: `backdrop-blur-sm`
- Fade overlay: `bg-indigo-900/20`

### Layout Patterns

**Container:**

```jsx
<div className="container mx-auto max-w-7xl px-3 sm:px-6 py-6 sm:py-8">
  {/* Page content */}
</div>
```

**Section Spacing:**

```
mb-8 sm:mb-12      Between major sections
mb-4 sm:mb-6       Between subsections
gap-3 sm:gap-4     Between related items
```

**Border Patterns:**

```
border-2 border-indigo-200                Standard borders
border-b-2 border-indigo-200              Bottom border (headers)
border-2 border-dashed border-indigo-300  Dashed borders (add buttons)
```

### Accessibility Guidelines

1. **Touch Targets:** Minimum 44x44px for all interactive elements
2. **Color Contrast:** All text meets WCAG AA standards
3. **Focus States:** Visible focus rings on all interactive elements
4. **Semantic HTML:** Proper heading hierarchy, button vs link usage
5. **ARIA Labels:** Added where needed for screen readers
6. **Keyboard Navigation:** All functionality accessible via keyboard

### UI Component Library (UI.tsx)

The app uses a centralized component library at `src/components/UI.tsx`:

- **Button:** Variants (primary, secondary, danger), sizes (sm, md, lg)
- **Input:** Text, number, date inputs with labels
- **Select:** Dropdown with label and options
- **Modal:** Responsive modal with size variants (sm, md, lg)
- **Card:** Container with optional variants
- **Badge:** Status badges with variants (success, warning, danger)

**Usage Example:**

```jsx
import { Button, Input, Modal, Badge } from "@/components/UI";

<Button variant="primary" size="md">Save</Button>
<Input label="Name" value={name} onChange={handleChange} />
<Modal isOpen={show} onClose={handleClose} title="Add Member">
  {/* Modal content */}
</Modal>
<Badge variant="success">Paid</Badge>
```

## Future Enhancement Ideas

**Already Implemented:**
- ✅ Export financial reports (CSV/JSON)
- ✅ Penalty calculation automation (auto-penalty system)
- ✅ Share system with dividend distribution
- ✅ Yearly archives
- ✅ Comprehensive validation system
- ✅ Testing infrastructure

**Potential Future Enhancements:**
- PDF export for reports
- Email notifications for loan approvals and payment reminders
- Analytics dashboard with interactive charts
- Scheduled payment reminders (push notifications)
- Multi-cooperative support per user
- Audit log for all transactions with undo/redo
- Mobile app (React Native)
- Automated backup scheduling
- Advanced reporting with custom date ranges
- Member portal (read-only access for non-admin members)
- SMS notifications for important events
- Integration with accounting software

## Support Files

- [README.md](coop-tracking/README.md) - User-facing documentation
- [SUPABASE_SETUP.md](coop-tracking/SUPABASE_SETUP.md) - Database setup guide
- [supabase.sql](coop-tracking/supabase.sql) - Database schema script
- [SHARES.md](coop-tracking/SHARES.md) - Share system planning document
- [SHARE_SYSTEM_FIX.md](coop-tracking/SHARE_SYSTEM_FIX.md) - Share system implementation documentation
- Various `*_FIX.md` files - Documentation of past bug fixes and features

---

**Last Updated:** 2025-12-02
**Project Version:** 0.2.0
**Next.js Version:** 15.4.6
**Design System:** Minimalist Pastel with Mobile-First Responsive Design

## Major Version History

### v0.2.0 (Current)
- ✅ Complete share system with fixed commitment model
- ✅ Dividend distribution functionality
- ✅ Automatic penalty assessment for missed payments
- ✅ Ledger page for period-by-period financial breakdown
- ✅ Archives system for yearly data preservation
- ✅ Comprehensive export/import (CSV, JSON)
- ✅ Runtime validation with Zod v3
- ✅ Testing infrastructure (Jest + React Testing Library)
- ✅ Individual member detail pages
- ✅ Data migration system
- ✅ Enhanced error handling and recovery
- ✅ Quick Actions dropdown menu on Dashboard for improved mobile UX

### v0.1.0
- Basic cooperative management (members, collections, loans)
- Multi-user authentication
- Financial ledger calculations
- Mobile-first responsive design
