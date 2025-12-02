# Share System Fix - Implementation Guide

## Problem with Current Implementation

**Current (WRONG) Behavior:**
- Shares **accumulate** with every payment
- Member pays P1,500 → gets 3 shares
- Next period pays P1,500 → gets 3 MORE shares (total 6) ❌
- Shares keep growing indefinitely

**Correct (REQUIRED) Behavior:**
- Shares are a **fixed commitment** per member
- Member commits to 3 shares → must pay P1,500 per cut-off
- Shares **DON'T accumulate** - they stay at 3 ✅
- Member always has 3 shares as long as they maintain commitment

---

## Correct Share System Model

### Key Concepts

1. **Committed Shares**: Each member has a fixed number of shares they've committed to
   - Example: Member A commits to 3 shares
   - This is manually set by admin, not auto-calculated

2. **Expected Contribution**: Based on committed shares
   - Formula: `committedShares × sharePrice`
   - Example: 3 shares × P500 = P1,500 per cut-off

3. **Fixed Subscription Model**: Like a monthly subscription
   - You pay the same amount each period based on your share level
   - Shares don't increase with each payment

4. **Dividend Distribution**: Based on committed shares
   - Total dividends distributed proportionally to committed shares
   - Member with 3 shares gets 3× dividend of member with 1 share

---

## Implementation Changes

### Phase 1: Update Type Definitions

**File: `src/types/index.ts`**

```typescript
export interface Member {
  id: number;
  name: string;
  committedShares: number; // CHANGED: Fixed share commitment (manually set)
  forfeited?: boolean;
  forfeitureDate?: string;
  forfeitedInterest?: number;
}

// SIMPLIFY MemberShareHistory - only tracks when admin changes shares
export interface MemberShareHistory {
  memberId: number;
  date: string; // When admin changed their shares
  previousShares: number; // Shares before change
  newShares: number; // Shares after change
  changedBy?: string; // Optional: admin who made the change
  reason?: string; // Optional: reason for change
}

// Keep MemberDividend and DividendDistribution unchanged
```

**Key Changes:**
- Rename `totalShares` to `committedShares` to clarify it's a commitment
- Simplify `MemberShareHistory` to only track admin changes, not payment-based accumulation
- Remove `contributionAmount`, `sharesAdded`, `totalShares`, `periodId` from history

---

### Phase 2: Remove Auto-Calculation from Reducers

**File: `src/context/CoopContext.tsx`**

#### 2.1 Update UPSERT_PAYMENT Reducer

**REMOVE all share calculation logic:**

```typescript
case "UPSERT_PAYMENT": {
  const { memberId, collectionPeriod, amount } = action.payload;
  const amt = isFinite(amount) && amount > 0 ? amount : 0;
  const collectionsCopy = state.collections.map((c) => ({
    ...c,
    payments: [...c.payments],
  }));
  const period = collectionsCopy.find((c) => c.id === collectionPeriod);

  // REMOVE: All share calculation logic
  // REMOVE: sharesDelta
  // REMOVE: shareHistoryUpdates
  // REMOVE: member share updates

  if (period) {
    const idx = period.payments.findIndex((p) => p.memberId === memberId);
    if (idx >= 0) {
      // Update existing payment
      const prev = period.payments[idx];
      const delta = amt - (prev.amount || 0);
      period.payments[idx] = {
        ...prev,
        amount: amt,
        date: action.payload.date ?? prev.date,
      };
      period.totalCollected = (period.totalCollected || 0) + delta;
    } else {
      // New payment
      const paymentDate = action.payload.date ?? new Date().toISOString();
      period.payments.push({
        memberId,
        amount: amt,
        date: paymentDate,
        collectionPeriod,
      });
      period.totalCollected = (period.totalCollected || 0) + amt;
    }
  }

  // SIMPLIFIED: Just update collections, no share changes
  return { ...state, collections: collectionsCopy };
}
```

#### 2.2 Update REMOVE_PAYMENT Reducer

**REMOVE all share subtraction logic:**

```typescript
case "REMOVE_PAYMENT": {
  const collectionsCopy = state.collections.map((c) => ({
    ...c,
    payments: [...c.payments],
  }));
  const period = collectionsCopy.find(
    (c) => c.id === action.payload.collectionPeriod
  );

  // REMOVE: All share removal logic
  // REMOVE: sharesToRemove
  // REMOVE: member share updates
  // REMOVE: share history updates

  if (period) {
    const removed = period.payments.filter(
      (p) => p.memberId === action.payload.memberId
    );
    period.payments = period.payments.filter(
      (p) => p.memberId !== action.payload.memberId
    );
    if (removed.length > 0) {
      const removedTotal = removed.reduce(
        (sum, p) => sum + (p.amount || 0),
        0
      );
      period.totalCollected = Math.max(
        0,
        (period.totalCollected || 0) - removedTotal
      );
    }
  }

  // SIMPLIFIED: Just update collections, no share changes
  return { ...state, collections: collectionsCopy };
}
```

---

### Phase 3: Add New Actions for Share Management

**File: `src/context/CoopContext.tsx`**

#### 3.1 Add New Action Types

```typescript
type CoopAction =
  | { type: "ADD_PAYMENT"; payload: Payment }
  // ... existing actions ...
  | { type: "UPDATE_MEMBER_SHARES"; payload: { memberId: number; shares: number } }
  | { type: "BULK_UPDATE_SHARES"; payload: { updates: Array<{ memberId: number; shares: number }> } };
```

#### 3.2 Add Reducer Cases

```typescript
case "UPDATE_MEMBER_SHARES": {
  const { memberId, shares } = action.payload;
  const member = state.members.find((m) => m.id === memberId);

  if (!member) return state;

  const previousShares = member.committedShares || 0;
  const newShares = Math.max(0, shares); // Ensure non-negative

  // Update member shares
  const updatedMembers = state.members.map((m) =>
    m.id === memberId
      ? { ...m, committedShares: newShares }
      : m
  );

  // Add to history if shares changed
  const historyEntry: MemberShareHistory = {
    memberId,
    date: new Date().toISOString(),
    previousShares,
    newShares,
  };

  return {
    ...state,
    members: updatedMembers,
    shareHistory: [...state.shareHistory, historyEntry],
  };
}

case "BULK_UPDATE_SHARES": {
  const { updates } = action.payload;
  const historyEntries: MemberShareHistory[] = [];

  const updatedMembers = state.members.map((member) => {
    const update = updates.find((u) => u.memberId === member.id);
    if (update) {
      const previousShares = member.committedShares || 0;
      const newShares = Math.max(0, update.shares);

      if (previousShares !== newShares) {
        historyEntries.push({
          memberId: member.id,
          date: new Date().toISOString(),
          previousShares,
          newShares,
        });
      }

      return { ...member, committedShares: newShares };
    }
    return member;
  });

  return {
    ...state,
    members: updatedMembers,
    shareHistory: [...state.shareHistory, ...historyEntries],
  };
}
```

---

### Phase 4: Update Share Calculations

**File: `src/lib/shareCalculations.ts`**

#### 4.1 Update calculateTotalShares

```typescript
/**
 * Calculate total committed shares across all members
 * @param members - Array of members
 * @returns Total committed shares
 */
export function calculateTotalShares(members: Member[]): number {
  return members.reduce((sum, member) => sum + (member.committedShares || 0), 0);
}
```

#### 4.2 Add New Helper Functions

```typescript
/**
 * Calculate expected contribution for a member based on committed shares
 * @param committedShares - Member's committed shares
 * @param sharePrice - Price per share
 * @returns Expected contribution amount
 */
export function calculateExpectedContribution(
  committedShares: number,
  sharePrice: number = 500
): number {
  return committedShares * sharePrice;
}

/**
 * Check if member's payment matches their commitment
 * @param payment - Payment amount
 * @param committedShares - Member's committed shares
 * @param sharePrice - Price per share
 * @returns Object with compliance status and details
 */
export function checkPaymentCompliance(
  payment: number,
  committedShares: number,
  sharePrice: number = 500
): {
  isCompliant: boolean;
  expected: number;
  actual: number;
  difference: number;
} {
  const expected = calculateExpectedContribution(committedShares, sharePrice);
  const difference = payment - expected;

  return {
    isCompliant: payment >= expected,
    expected,
    actual: payment,
    difference,
  };
}
```

#### 4.3 REMOVE Obsolete Functions

```typescript
// REMOVE: calculateSharesFromContribution
// REMOVE: calculateMemberShareHistory (or completely rewrite for admin changes only)
// REMOVE: getMemberTotalShares
```

---

### Phase 5: Update Shares Page UI

**File: `src/app/shares/page.tsx`**

#### 5.1 Add Share Editing UI

```typescript
function SharesPage() {
  const { state, dispatch } = useCoop();
  const [editingShares, setEditingShares] = useState<Record<number, string>>({});
  const [showEditModal, setShowEditModal] = useState(false);

  // ... existing code ...

  const handleUpdateShares = (memberId: number) => {
    const shares = parseFloat(editingShares[memberId] || "0");
    if (isNaN(shares) || shares < 0) {
      alert("Please enter a valid number of shares");
      return;
    }

    dispatch({
      type: "UPDATE_MEMBER_SHARES",
      payload: { memberId, shares },
    });

    // Clear editing state
    setEditingShares((prev) => {
      const copy = { ...prev };
      delete copy[memberId];
      return copy;
    });
  };

  // ... rest of component ...
}
```

#### 5.2 Update Member Shares Table

Add columns:
- **Committed Shares**: Display `member.committedShares`
- **Expected Contribution**: `committedShares × sharePrice`
- **Edit Button**: Allow admin to change committed shares
- **Compliance Status**: Show if member is paying their commitment

```tsx
<td className="py-3 px-4 text-sm text-indigo-900 text-right">
  {member.committedShares || 0} shares
</td>
<td className="py-3 px-4 text-sm text-indigo-600 text-right">
  ₱{((member.committedShares || 0) * sharePrice).toLocaleString()}
</td>
<td className="py-3 px-4 text-right">
  <Button
    variant="secondary"
    size="sm"
    onClick={() => {
      setEditingShares((prev) => ({
        ...prev,
        [member.id]: String(member.committedShares || 0),
      }));
    }}
  >
    Edit Shares
  </Button>
</td>
```

---

### Phase 6: Update Members Page

**File: `src/app/members/page.tsx`**

#### 6.1 Display Committed Shares

Update the member display to show:
- Committed shares
- Expected contribution
- Compliance status (paid vs expected)

```tsx
<div className="flex items-center gap-2 mt-1 flex-wrap">
  <p className="text-xs md:text-sm text-indigo-600">
    ID: {member.id}
  </p>
  <span className="text-neutral-300">•</span>
  <p className="text-xs md:text-sm text-purple-600 font-medium">
    {member.committedShares || 0} shares
  </p>
  <span className="text-neutral-300">•</span>
  <p className="text-xs md:text-sm text-emerald-600">
    Expected: ₱{((member.committedShares || 0) * 500).toLocaleString()}
  </p>
  {/* Show compliance status if period is selected */}
</div>
```

---

### Phase 7: Update Migration Logic

**File: `src/lib/dataMigration.ts`**

#### 7.1 Update Migration Function

```typescript
export function migrateToShareSystem(state: CoopState): CoopState {
  console.log("Starting share system migration...");

  // Initialize share system fields
  const sharePrice = state.sharePrice || 500;
  const dividendDistributions = state.dividendDistributions || [];

  // DO NOT calculate shares from payments
  // Instead, initialize all members with 0 committed shares
  // Admin will manually set them
  const updatedMembers: Member[] = state.members.map((member) => ({
    ...member,
    committedShares: member.committedShares || 0, // Keep existing or default to 0
    forfeited: member.forfeited || false,
  }));

  console.log("Members initialized with default 0 shares");

  // Calculate total interest pool from paid/approved loans
  const totalInterestPool = state.loans
    .filter((loan) => loan.status === "APPROVED" || loan.status === "PAID")
    .reduce((sum, loan) => sum + calculateInterestEarned(loan), 0);

  console.log(
    `Calculated total interest pool: ₱${totalInterestPool.toLocaleString()}`
  );

  return {
    ...state,
    sharePrice,
    totalInterestPool,
    dividendDistributions,
    shareHistory: [], // Clear old accumulation-based history
    members: updatedMembers,
  };
}
```

---

## Migration Path for Existing Users

### Option A: Reset All Shares to 0
- All members start with 0 committed shares
- Admin manually sets each member's commitment level
- Clean slate approach

### Option B: Calculate Initial Shares from Average Payment
- Calculate each member's average payment amount
- Set initial `committedShares = averagePayment / sharePrice`
- Round to nearest whole number or allow decimals
- Admin can adjust after migration

**Recommended: Option A** (cleaner, avoids confusion)

---

## UI/UX Improvements

### 1. Shares Page
**Add:**
- Bulk edit mode for setting multiple member shares at once
- Import/export shares from CSV
- Share change history viewer
- Compliance dashboard (who's paying their commitment)

### 2. Members Page
**Add:**
- Quick edit button for shares
- Visual indicator if payment matches commitment
- Warning if member underpays/overpays

### 3. Dashboard
**Modify:**
- "Total Shares" stat should show total committed shares
- Add "Compliance Rate" stat (% of members paying their commitment)

---

## Testing Checklist

- [ ] Member shares don't change when recording payments
- [ ] Member shares don't change when removing payments
- [ ] Can manually update member shares via UI
- [ ] Share history tracks admin changes only
- [ ] Dividend distribution uses committed shares
- [ ] Expected contribution calculated correctly
- [ ] Members page shows compliance status
- [ ] Migration sets all shares to 0 (or average)
- [ ] Export/import preserves committed shares
- [ ] Archives include share information

---

## Breaking Changes

**Data Structure Changes:**
1. `Member.totalShares` → `Member.committedShares` (semantic change)
2. `MemberShareHistory` structure simplified
3. `shareHistory` array cleared during migration

**Behavioral Changes:**
1. Shares no longer auto-calculate from payments
2. Admin must manually set member shares
3. Share history only tracks admin changes, not payments

**Migration Impact:**
- Existing users will have all shares reset to 0
- Admin must set each member's commitment level
- Old share history is cleared (payment-based accumulation data is obsolete)

---

## Implementation Order

1. ✅ Update type definitions
2. ✅ Remove auto-calculation from UPSERT_PAYMENT reducer
3. ✅ Remove auto-calculation from REMOVE_PAYMENT reducer
4. ✅ Add UPDATE_MEMBER_SHARES action and reducer
5. ✅ Update shareCalculations.ts helpers
6. ✅ Update migration logic
7. ✅ Add share editing UI to Shares page
8. ✅ Update Members page to show committed shares
9. ✅ Update Dashboard stats
10. ✅ Test all functionality
11. ✅ Update CLAUDE.md documentation

---

## Notes

- Keep `sharePrice` in `CoopState` - it's still needed (default: 500)
- Keep `totalInterestPool` - still tracks interest from loans
- Keep `dividendDistributions` - still needed for history
- Simplify `shareHistory` - only admin changes, not payment events
- Keep `DividendDistribution` and `MemberDividend` structures unchanged

---

**Last Updated:** 2025-01-25
**Status:** Ready for Implementation
**Breaking Changes:** Yes - requires data migration
