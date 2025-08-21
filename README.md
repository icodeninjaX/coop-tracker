## Coop Tracking System

Simple app to track a 20-member cooperative with ₱1,000 contributions on the 10th and 25th of each month, and loans that affect balances.

### Features

- Members list (1-20) with quick Paid/Unpaid toggles per period
- Add collection periods (seeded: 2024-12-10, 2024-12-25, 2025-01-10)
- Auto totals per period and overall current balance
- Loans: create, approve/reject; approvals are tied to a period and reduce balances
- Period ledger: Beginning Balance, Collections, Disbursed, Ending Balance

### Install

PowerShell sometimes blocks npm.ps1. Use npm.cmd instead if needed.

```powershell
# from project root
npm.cmd install
npm.cmd i date-fns clsx
```

### Run

```powershell
npm.cmd run dev
```

Open http://localhost:3000

### How it computes

- Current Balance = Sum(all collections) - Sum(approved loan disbursements)
- Period Beginning Balance = Sum(collections of previous periods) - Sum(disbursed in previous periods)
- Period Ending Balance = Beginning + Collections(this) - Disbursed(this)

### Tips

- Use “Add Next Period (10th/25th)” to follow the schedule.
- Use “Mark All Paid” to mark everyone as paid (₱1,000 each) for the selected period.
