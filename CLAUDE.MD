# CLAUDE.MD - Coop Tracking System

**AI Assistant Guide for the Cooperative Management System**

## Project Overview

This is a full-stack web application for managing a 20-member cooperative with features for:
- Monthly contributions tracking (10th and 25th of each month)
- Multi-user authentication (each user has isolated data)
- Loan management with different repayment plans
- Financial ledger with automatic balance calculations
- Responsive mobile-first design

**Tech Stack:**
- Next.js 15.4.6 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4.0
- Supabase (PostgreSQL + Auth)
- date-fns for date handling

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
│   │   ├── members/page.tsx      # Member management page
│   │   ├── loans/page.tsx        # Loan management page
│   │   ├── auth/login/page.tsx   # Login page
│   │   └── dashboard.tsx         # Dashboard component (used by page.tsx)
│   ├── components/
│   │   ├── AppNavigation.tsx     # Responsive nav with mobile menu
│   │   ├── AuthForm.tsx          # Login/signup form
│   │   ├── ProtectedRoute.tsx    # Auth wrapper for protected pages
│   │   ├── UI.tsx                # Reusable UI components
│   │   └── AuthenticatedCoopProvider.tsx  # Loads user data after auth
│   ├── context/
│   │   ├── AuthContext.tsx       # Authentication state
│   │   └── CoopContext.tsx       # Cooperative state (members, loans, etc.)
│   ├── lib/
│   │   ├── supabaseClient.ts     # Supabase client initialization
│   │   ├── remoteState.ts        # Auto-sync state to/from Supabase
│   │   ├── networkUtils.ts       # Network error handling
│   │   └── debugUtils.ts         # Debugging utilities
│   └── types/
│       └── index.ts              # TypeScript type definitions
├── supabase.sql                  # Database schema setup
└── package.json
```

## Core Data Models

### TypeScript Types ([src/types/index.ts](coop-tracking/src/types/index.ts))

```typescript
Member {
  id: number;           // 1-20 for the 20 members
  name: string;
}

CollectionPeriod {
  id: string;
  date: string;         // ISO date (YYYY-MM-DD)
  totalCollected: number;
  payments: Payment[];
  defaultContribution?: number;  // Default per-member contribution
}

Payment {
  memberId: number;
  amount: number;
  date: string;
  collectionPeriod: string;  // ID of the collection period
}

Loan {
  id: string;
  memberId: number;
  amount: number;              // Principal
  dateIssued: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "PAID";
  dateApproved?: string;
  disbursementPeriodId?: string;  // When funds were disbursed
  repaymentPlan?: "MONTHLY" | "CUT_OFF";
  interestRate?: number;       // 0.04 (4%) for MONTHLY, 0.03 (3%) for CUT_OFF
  termCount?: number;          // Number of months or cut-off periods
  dateClosed?: string;
  penaltyRate?: number;
}

Repayment {
  id: string;
  loanId: string;
  memberId: number;
  amount: number;
  date: string;
  periodId: string;  // Which collection period the repayment was made in
}

CoopState {
  beginningBalance: number;
  currentBalance: number;
  members: Member[];
  collections: CollectionPeriod[];
  loans: Loan[];
  repayments: Repayment[];
  penalties: Penalty[];
  selectedPeriod: string;  // Currently selected period ID
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

4. **Test Supabase Sync**
   - Changes auto-save via `remoteState.ts`
   - Test multi-device sync by opening app in two browsers

### Working with Collections

**Add New Collection Period:**
```typescript
dispatch({
  type: "ADD_COLLECTION_PERIOD",
  payload: {
    id: generateId(),
    date: "2025-01-10",  // YYYY-MM-DD format
    totalCollected: 0,
    payments: []
  }
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
      collectionPeriod: selectedPeriod
    }
  }
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
    termCount: 6  // 6 cut-off periods = 3 months
  }
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
    disbursementPeriodId: selectedPeriod
  }
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
    amount: 1750,  // Installment amount
    date: new Date().toISOString(),
    periodId: selectedPeriod
  }
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

### 3. Responsive Design
- Mobile-first approach using Tailwind CSS
- Breakpoints: `sm:` (640px), `md:` (768px), `lg:` (1024px)
- Navigation collapses to hamburger menu on mobile
- Tables transform to card layouts on small screens

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
   - Record individual payments
   - Mark all members paid
   - Verify totals calculate correctly

3. **Loans**
   - Create loan (PENDING status)
   - Approve loan (check balance decreases)
   - Record repayments (check installment tracking)
   - Verify auto-status change to PAID when fully repaid

4. **Financial Accuracy**
   - Check Period Ledger calculations
   - Verify current balance = collections + repayments - disbursements
   - Test with multiple periods and loans

5. **Multi-device Sync**
   - Login on two devices
   - Make changes on device A
   - Verify changes appear on device B after refresh

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

## Future Enhancement Ideas

- Export financial reports (PDF/Excel)
- Email notifications for loan approvals
- Analytics dashboard with charts
- Penalty calculation automation
- Scheduled payment reminders
- Multi-cooperative support per user
- Audit log for all transactions

## Support Files

- [README.md](coop-tracking/README.md) - User-facing documentation
- [SUPABASE_SETUP.md](coop-tracking/SUPABASE_SETUP.md) - Database setup guide
- [supabase.sql](coop-tracking/supabase.sql) - Database schema script
- Various `*_FIX.md` files - Documentation of past bug fixes and features

---

**Last Updated:** 2025-11-19
**Project Version:** 0.1.0
**Next.js Version:** 15.4.6
