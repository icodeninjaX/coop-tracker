"use client";

import { format } from "date-fns";
import { useCoop } from "@/context/CoopContext";
import { useState } from "react";
import clsx from "clsx";
import ProtectedRoute from "@/components/ProtectedRoute";

function HomePage() {
  const { state, dispatch } = useCoop();
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [newLoanMemberId, setNewLoanMemberId] = useState<string>("");
  const [newLoanAmount, setNewLoanAmount] = useState<string>("");
  const [newLoanPlan, setNewLoanPlan] = useState<"MONTHLY" | "CUT_OFF">(
    "CUT_OFF"
  );
  const [newLoanTerms, setNewLoanTerms] = useState<string>("5");
  const [newPeriodDate, setNewPeriodDate] = useState<string>("");
  const [entryAmounts, setEntryAmounts] = useState<Record<number, string>>({});

  const recordPayment = (memberId: number) => {
    if (!selectedPeriod) return;
    const raw = entryAmounts[memberId];
    const amount = raw === undefined || raw === "" ? NaN : parseFloat(raw);
    if (!isFinite(amount) || amount <= 0) return;

    dispatch({
      type: "ADD_PAYMENT",
      payload: {
        memberId,
        amount,
        date: new Date().toISOString(),
        collectionPeriod: selectedPeriod,
      },
    });
  };

  const upsertPayment = (memberId: number) => {
    if (!selectedPeriod) return;
    const raw = entryAmounts[memberId];
    const amt = raw === undefined || raw === "" ? NaN : parseFloat(raw);
    if (!isFinite(amt) || amt <= 0) return;
    dispatch({
      type: "UPSERT_PAYMENT",
      payload: {
        memberId,
        amount: amt,
        date: new Date().toISOString(),
        collectionPeriod: selectedPeriod,
      },
    });
  };

  const clearPayment = (memberId: number) => {
    if (!selectedPeriod) return;
    dispatch({
      type: "REMOVE_PAYMENT",
      payload: { memberId, collectionPeriod: selectedPeriod },
    });
    setEntryAmounts((prev) => {
      const copy = { ...prev };
      delete copy[memberId];
      return copy;
    });
  };

  const addCollectionPeriod = () => {
    if (!newPeriodDate) return;
    dispatch({
      type: "ADD_COLLECTION_PERIOD",
      payload: {
        id: newPeriodDate,
        date: newPeriodDate,
        totalCollected: 0,
        payments: [],
      },
    });
    setNewPeriodDate("");
  };

  const createLoan = () => {
    if (!newLoanMemberId || !newLoanAmount) return;
    const plan = newLoanPlan;
    const rate = plan === "MONTHLY" ? 0.04 : 0.03;

    dispatch({
      type: "ADD_LOAN",
      payload: {
        id: `${Date.now()}-${newLoanMemberId}`,
        memberId: parseInt(newLoanMemberId),
        amount: parseFloat(newLoanAmount),
        dateIssued: new Date().toISOString(),
        status: "PENDING",
        repaymentPlan: plan,
        interestRate: rate,
        termCount: parseInt(newLoanTerms) || undefined,
      },
    });
    setNewLoanMemberId("");
    setNewLoanAmount("");
    setNewLoanPlan("CUT_OFF");
    setNewLoanTerms("5");
  };

  const computeLedgerForSelected = () => {
    if (!selectedPeriod) return null;
    const periodsSorted = [...state.collections].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const idx = periodsSorted.findIndex((p) => p.id === selectedPeriod);
    if (idx === -1) return null;

    const prevPeriods = periodsSorted.slice(0, idx);
    const thisPeriod = periodsSorted[idx];

    const sumCollections = (periods: typeof periodsSorted) =>
      periods.reduce((sum, p) => sum + (p.totalCollected || 0), 0);

    const approvedLoans = state.loans.filter((l) => l.status === "APPROVED");

    const sumDisbursedInPeriods = (periodIds: string[]) =>
      approvedLoans
        .filter((l) =>
          l.disbursementPeriodId
            ? periodIds.includes(l.disbursementPeriodId)
            : false
        )
        .reduce((sum, l) => sum + (l.amount || 0), 0);

    const beginningBalance =
      sumCollections(prevPeriods) -
      sumDisbursedInPeriods(prevPeriods.map((p) => p.id));
    const collectionsThis = thisPeriod.totalCollected || 0;
    const repaymentsThis = state.repayments
      .filter((r) => r.periodId === thisPeriod.id)
      .reduce((sum, r) => sum + (r.amount || 0), 0);
    const disbursedThis = sumDisbursedInPeriods([thisPeriod.id]);
    const endingBalance =
      beginningBalance + collectionsThis + repaymentsThis - disbursedThis;

    return {
      beginningBalance,
      collectionsThis,
      repaymentsThis,
      disbursedThis,
      endingBalance,
    };
  };

  const addNextScheduledPeriod = () => {
    let baseDate: Date | null = null;
    if (selectedPeriod) {
      baseDate = new Date(
        state.collections.find((c) => c.id === selectedPeriod)?.date || ""
      );
    } else if (state.collections.length > 0) {
      const latest = [...state.collections].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )[0];
      baseDate = new Date(latest.date);
    }
    if (!baseDate || isNaN(baseDate.getTime())) return;

    const day = baseDate.getDate();
    const next = new Date(baseDate);
    if (day <= 10) {
      next.setDate(25);
    } else if (day <= 25) {
      next.setMonth(next.getMonth() + 1);
      next.setDate(10);
    } else {
      next.setMonth(next.getMonth() + 1);
      next.setDate(10);
    }
    const id = next.toISOString().slice(0, 10);
    const exists = state.collections.some((c) => c.id === id);
    if (!exists) {
      dispatch({
        type: "ADD_COLLECTION_PERIOD",
        payload: { id, date: id, totalCollected: 0, payments: [] },
      });
    }
    setSelectedPeriod(id);
  };

  const markAllPaid = () => {
    if (!selectedPeriod) return;
    const period = state.collections.find((c) => c.id === selectedPeriod);
    if (!period) return;
    const alreadyPaidIds = new Set(period.payments.map((p) => p.memberId));
    state.members.forEach((m) => {
      if (!alreadyPaidIds.has(m.id)) {
        const raw = entryAmounts[m.id];
        const amt = raw === undefined || raw === "" ? NaN : parseFloat(raw);
        if (isFinite(amt) && amt > 0) {
          dispatch({
            type: "ADD_PAYMENT",
            payload: {
              memberId: m.id,
              amount: amt,
              date: new Date().toISOString(),
              collectionPeriod: selectedPeriod,
            },
          });
        }
      }
    });
  };

  const clearAllPayments = () => {
    if (!selectedPeriod) return;
    const period = state.collections.find((c) => c.id === selectedPeriod);
    if (!period) return;
    const newCollections = state.collections.map((c) =>
      c.id === selectedPeriod ? { ...c, payments: [], totalCollected: 0 } : c
    );
    dispatch({
      type: "LOAD_STATE",
      payload: { ...state, collections: newCollections },
    });
  };

  return (
    <main className="container mx-auto max-w-6xl p-6">
      <h1 className="text-3xl font-bold mb-2 text-gray-900">
        Coop Tracking System
      </h1>
      <p className="text-gray-600 mb-8">
        Track bi-monthly contributions, balances, and loans with a simple
        workflow.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Balance Summary */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Balance Summary
          </h2>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-gray-900">
              ₱{state.currentBalance.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500">Current Balance</p>
          </div>
        </div>

        {/* New Collection Period */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Add Collection Period
          </h2>
          <div className="flex gap-2 flex-col sm:flex-row">
            <input
              type="date"
              className="flex-1 p-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={newPeriodDate}
              onChange={(e) => setNewPeriodDate(e.target.value)}
            />
            <button
              onClick={addCollectionPeriod}
              disabled={!newPeriodDate}
              className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Add Period
            </button>
          </div>
        </div>

        {/* Collection Period Selection */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Current Collection Period
          </h2>
          <select
            className="w-full p-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
          >
            <option value="">Select Period</option>
            {state.collections.map((period) => (
              <option key={period.id} value={period.id}>
                {format(new Date(period.date), "MMMM d, yyyy")} — Collected ₱
                {period.totalCollected.toLocaleString()}
              </option>
            ))}
          </select>
          <div className="flex gap-2 mt-3">
            <button
              onClick={addNextScheduledPeriod}
              className="inline-flex items-center justify-center px-3 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Add Next Period (10th/25th)
            </button>
          </div>
        </div>

        {/* Period Ledger */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Period Ledger
          </h2>
          {selectedPeriod ? (
            (() => {
              const ledger = computeLedgerForSelected();
              if (!ledger) return null;
              return (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      Beginning
                    </p>
                    <p className="text-lg font-medium text-gray-900">
                      ₱{ledger.beginningBalance.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      Collected
                    </p>
                    <p className="text-lg font-medium text-gray-900">
                      ₱{ledger.collectionsThis.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      Repayments
                    </p>
                    <p className="text-lg font-medium text-gray-900">
                      ₱{ledger.repaymentsThis.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      Disbursed
                    </p>
                    <p className="text-lg font-medium text-gray-900">
                      ₱{ledger.disbursedThis.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      Ending
                    </p>
                    <p className="text-xl font-semibold text-gray-900">
                      ₱{ledger.endingBalance.toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })()
          ) : (
            <p className="text-gray-500">Select a period to see details</p>
          )}
        </div>

        {/* New Loan Form */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Create New Loan
          </h2>
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-700">
              <strong>💡 Loan Types:</strong><br/>
              • <strong>One-time payment:</strong> Borrower pays the full amount + interest after the term period<br/>
              • <strong>Per cut-off installments:</strong> Borrower pays in installments every cut-off (twice per month)
            </p>
          </div>
          <div className="space-y-3">
            <select
              className="w-full p-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={newLoanMemberId}
              onChange={(e) => setNewLoanMemberId(e.target.value)}
            >
              <option value="">Select Member</option>
              {state.members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap gap-3">
              {/* amount */}
              <input
                type="number"
                placeholder="Loan Amount"
                className="flex-1 min-w-[8rem] p-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 focus:border-indigo-500"
                value={newLoanAmount}
                onChange={(e) => setNewLoanAmount(e.target.value)}
              />
              {/* plan */}
              <select
                className="shrink-0 min-w-[10rem] p-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 focus:border-indigo-500"
                value={newLoanPlan}
                onChange={(e) =>
                  setNewLoanPlan(e.target.value as "CUT_OFF" | "MONTHLY")
                }
                title="Repayment Plan"
              >
                <option value="CUT_OFF">Per Cut-off installments (3% per month)</option>
                <option value="MONTHLY">One-time payment (4% per month)</option>
              </select>
              {/* terms */}
              <input
                type="number"
                min={1}
                className="shrink-0 w-24 min-w-[5rem] p-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 focus:border-indigo-500"
                placeholder={
                  newLoanPlan === "MONTHLY" ? "Months" : "Months"
                }
                value={newLoanTerms}
                onChange={(e) => setNewLoanTerms(e.target.value)}
                title={
                  newLoanPlan === "MONTHLY"
                    ? "Number of months before full payment is due"
                    : "Number of months to pay (2 cut-offs per month)"
                }
              />
              {/* button wrapper: full width on small screens; right-aligned beyond sm */}
              <div className="w-full sm:w-auto sm:ml-auto">
                <button
                  onClick={createLoan}
                  disabled={!newLoanMemberId || !newLoanAmount}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Create Loan
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Member Payments */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 md:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Member Payments
          </h2>
          <div className="flex gap-2 mb-4">
            <button
              onClick={markAllPaid}
              disabled={!selectedPeriod}
              className="inline-flex items-center justify-center px-3 py-2 rounded-md bg-green-600 text-white hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Mark All Paid (use entered amounts)
            </button>
            <button
              onClick={clearAllPayments}
              disabled={!selectedPeriod}
              className="inline-flex items-center justify-center px-3 py-2 rounded-md bg-gray-700 text-white hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Clear Payments for Period
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {state.members.map((member) => {
              const hasPaid = !!(
                selectedPeriod &&
                state.collections
                  .find((c) => c.id === selectedPeriod)
                  ?.payments.some((p) => p.memberId === member.id)
              );
              const period = selectedPeriod
                ? state.collections.find((c) => c.id === selectedPeriod)
                : undefined;
              const currentPayment = period?.payments.find(
                (p) => p.memberId === member.id
              );
              return (
                <div
                  key={member.id}
                  className="border rounded-lg p-3 space-y-2"
                >
                  <p className="font-medium">{member.name}</p>
                  <input
                    type="number"
                    min={0}
                    placeholder={
                      period?.defaultContribution
                        ? `Default ₱${period.defaultContribution}`
                        : "Amount"
                    }
                    className="w-full p-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={
                      entryAmounts[member.id] ??
                      (currentPayment ? String(currentPayment.amount) : "")
                    }
                    onChange={(e) =>
                      setEntryAmounts((prev) => ({
                        ...prev,
                        [member.id]: e.target.value,
                      }))
                    }
                    disabled={!selectedPeriod}
                  />
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span
                      className={clsx(
                        "px-2 py-1 rounded-full",
                        hasPaid
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      )}
                    >
                      {hasPaid ? "Paid" : "Unpaid"}
                    </span>
                    {hasPaid && currentPayment && (
                      <span className="text-xs text-gray-600">
                        Paid ₱{currentPayment.amount.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() =>
                        hasPaid
                          ? upsertPayment(member.id)
                          : recordPayment(member.id)
                      }
                      disabled={!selectedPeriod}
                      className={clsx(
                        "inline-flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium",
                        selectedPeriod
                          ? "bg-indigo-600 text-white hover:bg-indigo-500"
                          : "bg-gray-300 text-gray-600 cursor-not-allowed"
                      )}
                    >
                      {hasPaid ? "Update" : "Pay"}
                    </button>
                    <button
                      onClick={() => clearPayment(member.id)}
                      disabled={!selectedPeriod || !hasPaid}
                      className={clsx(
                        "inline-flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium",
                        selectedPeriod && hasPaid
                          ? "bg-gray-700 text-white hover:bg-gray-600"
                          : "bg-gray-300 text-gray-600 cursor-not-allowed"
                      )}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <ProtectedRoute>
      <HomePage />
    </ProtectedRoute>
  );
}
