
# Auto-populate Deal Summary Deposits from Deal Sheet Data

## Overview
When opening the Deal Summary generator, automatically pre-fill the Deposits tab with any deposits that were previously entered in the Deal Sheet. This creates a seamless workflow where users don't need to re-enter deposit information.

## Current State

**Deal Sheet deposits store:**
- Amount
- Held By (who holds the deposit)
- Due Date (saved to database)

**Deal Summary deposits need:**
- Amount
- Payable To (same concept as "Held By")
- Due Date
- Due Time (not currently stored in database)

## Solution

Modify `GenerateDealSummaryDialog.tsx` to:

1. Import and use the `useDealDeposits` hook to fetch existing deposits
2. When the dialog opens, map existing deposits to the local format
3. If no deposits exist, fall back to creating one empty deposit

## Technical Details

### File: `src/components/deals/GenerateDealSummaryDialog.tsx`

**Add import:**
```typescript
import { useDealDeposits } from '@/hooks/useDealDeposits';
```

**Add hook call:**
```typescript
const { deposits: existingDeposits, isLoading: depositsLoading } = useDealDeposits(deal.id);
```

**Update initialization logic (in useEffect):**
```typescript
// Map existing deposits from database to local format
if (existingDeposits && existingDeposits.length > 0) {
  setDeposits(existingDeposits.map(d => ({
    id: crypto.randomUUID(),
    amount: d.amount || 0,
    amountDisplay: d.amount ? formatNumberWithCommas(d.amount) : '',
    payableTo: d.held_by || '',
    dueDate: d.due_date ? new Date(d.due_date) : undefined,
    dueHour: '',
    dueMinute: '00',
    duePeriod: 'PM',
  })));
} else {
  setDeposits([createEmptyDeposit()]);
}
```

## Data Mapping

| Deal Sheet Field | Database Column | Deal Summary Field |
|-----------------|-----------------|-------------------|
| Amount | `amount` | Amount |
| Held By | `held_by` | Payable To |
| — | `due_date` | Due Date |
| — | (not stored) | Due Time |

The "Due Time" field won't be pre-populated since it's not currently stored in the database. Users can optionally add it if needed.

## User Experience

1. User enters deposits in Deal Sheet (Amount: $300, Held By: "Lawyer")
2. Deal Sheet saves deposits to `deal_deposits` table
3. User opens Deal Summary generator
4. Deposits tab automatically shows: Amount: $300.00, Payable To: "Lawyer"
5. User can edit or add more deposits as needed
