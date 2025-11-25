Share System Implementation Plan
Overview
Add a share system where members earn shares based on contributions (₱500 = 1 share), track total interest earned from loans, and distribute dividends proportionally to shares.
Phase 1: Data Models & Types
File: src/types/index.ts
Add totalShares, forfeited, forfeitureDate fields to Member interface
Create new DividendDistribution interface (tracks dividend events)
Create new MemberDividend interface (per-member dividend amounts)
Create new MemberShareHistory interface (historical share transactions)
Add dividendDistributions, shareHistory, totalInterestPool, sharePrice to CoopState
Phase 2: State Management
File: src/context/CoopContext.tsx
Add new action types: CALCULATE_SHARES, FORFEIT_INTEREST, DISTRIBUTE_DIVIDENDS, UPDATE_INTEREST_POOL, RECORD_SHARE_TRANSACTION
Update UPSERT_PAYMENT reducer to auto-calculate shares when payment is recorded
Update REMOVE_PAYMENT reducer to subtract shares when payment is deleted
Update UPDATE_LOAN_STATUS reducer to add interest to pool when loan status changes to "PAID"
Add reducer cases for new dividend and share actions
Update balance calculation to account for distributed dividends
Phase 3: Calculation Utilities
New File: src/lib/shareCalculations.ts
calculateSharesFromContribution(amount, sharePrice) - Convert payment amount to shares
calculateTotalShares(members) - Sum all member shares
calculateInterestEarned(loan) - Calculate interest from a loan
calculateDividendDistribution(interestPool, members) - Calculate per-member dividends
calculateMemberShareHistory(payments) - Generate share history for migration
Phase 4: New Shares Dashboard Page
New File: src/app/shares/page.tsx
Display share system overview stats (total shares, interest pool, pending dividends)
Show member shares table with columns: Name, Shares, Potential Dividend, Status
Add "Distribute Dividends" button with confirmation modal
Display dividend distribution history
Show share transaction history
Phase 5: Update Existing Pages
Files to update:
src/app/page.tsx - Add 3 new stat cards: Total Shares, Interest Pool, Latest Dividend
src/app/members/page.tsx - Add shares column, forfeit interest button
src/app/layout.tsx - Add "Shares" navigation link
src/components/AppNavigation.tsx - Add "Shares" to navigation menu
Phase 6: New UI Components
New Files:
src/components/SharesOverview.tsx - Share system summary widget
src/components/DividendDistributionModal.tsx - Dividend confirmation modal
src/components/ShareHistoryTable.tsx - Historical share transactions
Phase 7: Data Migration
File: src/lib/dataMigration.ts
Create migration function to calculate shares retroactively from existing payments
Run migration on first load if shareHistory is empty
Update all existing members with their current total shares
Phase 8: Archive System Update
File: src/types/index.ts
Extend YearlyArchive interface to include shareTransactions and dividendDistributions
Update archive creation logic in src/context/CoopContext.tsx
Key Features
✅ Auto-calculate shares on every payment (₱500 = 1 share) ✅ Track total interest pool from loan repayments ✅ Distribute dividends proportionally to shares ✅ Member forfeiture tracking (forfeit interest but keep shares) ✅ Complete historical tracking of shares and dividends ✅ Responsive mobile-first design following existing patterns ✅ Auto-sync to Supabase
Technical Details
Share Price: ₱500 per share (stored in CoopState.sharePrice, configurable)
Interest calculation: Auto-triggered when loan status changes to "PAID"
Dividend formula: (Total Interest Pool / Total Shares) × Member Shares
Forfeited members receive 0 dividends
Balance formula updated: Collections + Repayments - Disbursements - Dividends Paid
