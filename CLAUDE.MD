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
   - Stats: `grid-cols-2 lg:grid-cols-4` (2 columns mobile, 4 desktop)
   - Collection Periods: Horizontal scroll on mobile, grid on desktop
   - Loan Cards: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
   - Member Cards: Single column mobile, multi-column desktop

3. **Horizontal Scroll Pattern (Mobile)**
   ```jsx
   {/* Mobile: Horizontal Scroll */}
   <div className="md:hidden overflow-x-auto -mx-3 px-3 pb-2">
     <div className="flex gap-3 min-w-min">
       {items.map(item => (
         <div className="min-w-[160px] flex-shrink-0">
           {/* Item content */}
         </div>
       ))}
     </div>
   </div>

   {/* Desktop: Grid */}
   <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-4">
     {/* Same items in grid */}
   </div>
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
- Header actions stack on mobile
- 2-column stats grid on mobile, 4 on desktop
- Collection periods: Horizontal scroll (mobile) vs Grid (desktop)
- All modals have responsive button layouts

**Members Page (members/page.tsx):**
- Sticky search header on mobile
- Horizontal scrollable stats
- Collapsible member action menus
- FAB for adding members (mobile only)
- Bottom action bar for bulk operations

**Loans Page (loans/page.tsx):**
- Responsive loan cards
- Stacked approve/reject buttons on mobile
- 2-column grid on mobile, 4 on desktop for stats
- Full-width forms on mobile

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

6. **Mobile Responsiveness**
   - Test on mobile devices (375px width minimum)
   - Verify stats grid shows 2 columns on mobile
   - Test horizontal scroll for collection periods
   - Verify all buttons stack vertically on mobile
   - Check touch targets are minimum 44px
   - Test modals slide up properly from bottom
   - Verify FAB button appears on Members page (mobile only)
   - Test hamburger menu navigation

7. **Tablet & Desktop Views**
   - Test at 768px (tablet) - verify 2-column layouts
   - Test at 1024px+ (desktop) - verify 4-column grids
   - Ensure navigation shows full horizontal menu
   - Verify no horizontal scroll on large screens

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
<div className="bg-white/80 backdrop-blur-sm border-2 border-indigo-200 rounded-xl p-4 sm:p-6
                hover:shadow-md hover:border-indigo-300 transition-all duration-200">
  {/* Content */}
</div>
```

**Stat Cards (Multi-color):**
```jsx
// Indigo variant
<div className="bg-white/80 backdrop-blur-sm border-2 border-indigo-200 rounded-xl p-4 sm:p-6
                hover:shadow-md hover:border-indigo-300">
  <p className="text-xs uppercase tracking-wider text-indigo-600 mb-2">Label</p>
  <p className="text-2xl sm:text-3xl font-semibold text-indigo-900">Value</p>
</div>

// Purple, Emerald, Amber variants follow same pattern with respective colors
```

**Buttons (Primary):**
```jsx
<button className="px-5 py-2.5 bg-indigo-300 text-indigo-900 text-sm
                   font-normal rounded-md hover:bg-indigo-400 shadow-sm
                   transition-all duration-200 min-h-[44px]">
  Button Text
</button>
```

**Buttons (Secondary):**
```jsx
<button className="px-5 py-2.5 border-2 border-indigo-200 text-indigo-800
                   text-sm font-normal rounded-md hover:border-indigo-300
                   hover:bg-indigo-50 transition-all duration-200 min-h-[44px]">
  Button Text
</button>
```

**Buttons (Success):**
```jsx
<button className="px-5 py-2.5 bg-emerald-200 text-emerald-800 text-sm
                   font-normal rounded-md hover:bg-emerald-300 shadow-sm
                   transition-all duration-200 min-h-[44px]">
  Approve
</button>
```

**Buttons (Danger):**
```jsx
<button className="px-5 py-2.5 bg-rose-200 text-rose-800 text-sm
                   font-normal rounded-md hover:bg-rose-300 shadow-sm
                   transition-all duration-200 min-h-[44px]">
  Delete
</button>
```

**Input Fields:**
```jsx
<input className="w-full px-4 py-3 border-2 border-indigo-200 rounded-lg
                  focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400
                  placeholder-indigo-300 bg-white text-sm font-light" />
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

**Last Updated:** 2025-11-22
**Project Version:** 0.1.0
**Next.js Version:** 15.4.6
**Design System:** Minimalist Pastel with Mobile-First Responsive Design
