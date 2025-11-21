"use client";

import { format } from "date-fns";
import { useCoop } from "@/context/CoopContext";
import { useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  Button,
  Input,
  Select,
  Modal,
} from "@/components/UI";

function HomeContent() {
  const { state, dispatch } = useCoop();
  const selectedPeriod = state.selectedPeriod;
  const [newLoanMemberId, setNewLoanMemberId] = useState<string>("");
  const [newLoanAmount, setNewLoanAmount] = useState<string>("");
  const [newLoanPurpose, setNewLoanPurpose] = useState<string>("");
  const [newLoanPlan, setNewLoanPlan] = useState<"MONTHLY" | "CUT_OFF">(
    "CUT_OFF"
  );
  const [newLoanTerms, setNewLoanTerms] = useState<string>("5");
  const [newPeriodDate, setNewPeriodDate] = useState<string>("");
  const [showNewLoanModal, setShowNewLoanModal] = useState(false);
  const [showNewPeriodModal, setShowNewPeriodModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

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
    setNewLoanPurpose("");
    setShowNewLoanModal(false);
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
    setShowNewPeriodModal(false);
  };

  // Function to generate the next collection period automatically
  const addNextCollectionPeriod = () => {
    const latestPeriod = state.collections
      .map(p => new Date(p.date))
      .sort((a, b) => b.getTime() - a.getTime())[0];

    let nextDate: Date;

    if (!latestPeriod) {
      // If no periods exist, start with today
      nextDate = new Date();
    } else {
      // Get the day of the month from the latest period
      const day = latestPeriod.getDate();

      // Cooperative collection pattern: typically 10th and 25th of each month
      if (day <= 10) {
        // If latest was around 10th, next should be 25th of same month
        nextDate = new Date(latestPeriod.getFullYear(), latestPeriod.getMonth(), 25);
      } else if (day <= 25) {
        // If latest was around 25th, next should be 10th of next month
        nextDate = new Date(latestPeriod.getFullYear(), latestPeriod.getMonth() + 1, 10);
      } else {
        // If latest was end of month, next should be 10th of next month
        nextDate = new Date(latestPeriod.getFullYear(), latestPeriod.getMonth() + 1, 10);
      }

      // If the calculated date is in the past or same as latest, move to next period
      if (nextDate <= latestPeriod) {
        if (day <= 10) {
          nextDate = new Date(latestPeriod.getFullYear(), latestPeriod.getMonth(), 25);
        } else {
          nextDate = new Date(latestPeriod.getFullYear(), latestPeriod.getMonth() + 1, 10);
        }
      }
    }

    const nextPeriodId = nextDate.toISOString().split('T')[0];

    dispatch({
      type: "ADD_COLLECTION_PERIOD",
      payload: {
        id: nextPeriodId,
        date: nextPeriodId,
        totalCollected: 0,
        payments: [],
      },
    });
  };

  // Handle resetting all periods
  const handleResetPeriods = () => {
    dispatch({ type: "RESET_PERIODS" });
    setShowResetModal(false);
  };

  // Get current period data
  const totalBalance = state.currentBalance || 0;
  const totalMembers = state.members.length;
  const activeLoans = state.loans.filter((l) => l.status === "APPROVED").length;
  const pendingLoans = state.loans.filter((l) => l.status === "PENDING").length;

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="container mx-auto max-w-7xl px-3 sm:px-6 py-6 sm:py-8">
        {/* Header + Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0 mb-6 sm:mb-10 pb-6 border-b border-neutral-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-light text-neutral-900 tracking-tight mb-1">
              Dashboard
            </h1>
            <p className="text-sm text-neutral-500 font-light">
              {format(new Date(), "MMMM d, yyyy")} · {state.collections.length} {state.collections.length === 1 ? 'period' : 'periods'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              onClick={() => setShowNewPeriodModal(true)}
              className="px-5 py-2.5 bg-neutral-900 !text-white text-sm font-normal rounded-md hover:bg-neutral-800 transition-all duration-200 min-h-[44px]"
            >
              New Period
            </button>
            <button
              onClick={() => setShowNewLoanModal(true)}
              className="px-5 py-2.5 border border-neutral-300 text-neutral-700 text-sm font-normal rounded-md hover:border-neutral-400 hover:bg-neutral-50 transition-all duration-200 min-h-[44px]"
            >
              New Loan
            </button>
            {state.collections.length > 0 && (
              <button
                onClick={() => setShowResetModal(true)}
                className="px-5 py-2.5 border border-neutral-300 text-neutral-600 text-sm font-normal rounded-md hover:border-neutral-400 hover:bg-neutral-50 transition-all duration-200 min-h-[44px]"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-8 sm:mb-12">
          <div className="bg-white border border-neutral-200 rounded-lg p-4 sm:p-6 transition-all duration-200 hover:shadow-sm">
            <p className="text-xs uppercase tracking-wider text-neutral-500 font-normal mb-2">
              Total Balance
            </p>
            <p className="text-2xl sm:text-3xl font-light text-neutral-900">
              ₱{totalBalance.toLocaleString()}
            </p>
          </div>

          <div className="bg-white border border-neutral-200 rounded-lg p-4 sm:p-6 transition-all duration-200 hover:shadow-sm">
            <p className="text-xs uppercase tracking-wider text-neutral-500 font-normal mb-2">
              Members
            </p>
            <p className="text-2xl sm:text-3xl font-light text-neutral-900">
              {totalMembers}
            </p>
          </div>

          <div className="bg-white border border-neutral-200 rounded-lg p-4 sm:p-6 transition-all duration-200 hover:shadow-sm">
            <p className="text-xs uppercase tracking-wider text-neutral-500 font-normal mb-2">
              Active Loans
            </p>
            <p className="text-2xl sm:text-3xl font-light text-neutral-900">
              {activeLoans}
            </p>
          </div>

          <div className="bg-white border border-neutral-200 rounded-lg p-4 sm:p-6 transition-all duration-200 hover:shadow-sm">
            <p className="text-xs uppercase tracking-wider text-neutral-500 font-normal mb-2">
              Pending
            </p>
            <p className="text-2xl sm:text-3xl font-light text-neutral-900">
              {pendingLoans}
            </p>
          </div>
        </div>

        {/* Collection Periods */}
        <div className="mb-8 sm:mb-12">
          <h2 className="text-base sm:text-lg font-light text-neutral-900 mb-4 sm:mb-6">
            Collection Periods
          </h2>
          {state.collections.length > 0 ? (
            <>
              {/* Mobile: Horizontal Scroll */}
              <div className="md:hidden overflow-x-auto -mx-3 px-3 pb-2">
                <div className="flex gap-3 min-w-min">
                  {state.collections.map((period) => (
                    <button
                      key={period.id}
                      onClick={() =>
                        dispatch({
                          type: "SET_SELECTED_PERIOD",
                          payload: { periodId: period.id },
                        })
                      }
                      className={`p-4 rounded-lg border text-left transition-all duration-200 min-w-[160px] flex-shrink-0 ${
                        selectedPeriod === period.id
                          ? "border-neutral-900 bg-neutral-900 text-white shadow-sm"
                          : "border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-sm"
                      }`}
                    >
                      <p className={`text-xs uppercase tracking-wider font-normal mb-2 ${
                        selectedPeriod === period.id ? "text-neutral-400" : "text-neutral-500"
                      }`}>
                        {format(new Date(period.date), "MMM d, yyyy")}
                      </p>
                      <p className={`text-xl font-light mb-1 ${
                        selectedPeriod === period.id ? "text-white" : "text-neutral-900"
                      }`}>
                        ₱{period.totalCollected.toLocaleString()}
                      </p>
                      <p className={`text-xs font-light ${
                        selectedPeriod === period.id ? "text-neutral-400" : "text-neutral-500"
                      }`}>
                        {period.payments.length} {period.payments.length === 1 ? 'payment' : 'payments'}
                      </p>
                    </button>
                  ))}

                  <button
                    onClick={addNextCollectionPeriod}
                    className="p-4 rounded-lg border border-dashed border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50 transition-all duration-200 flex flex-col items-center justify-center min-w-[160px] min-h-[120px] flex-shrink-0"
                  >
                    <span className="text-2xl text-neutral-400 mb-1 font-light">+</span>
                    <span className="text-xs text-neutral-600 font-light">Add Period</span>
                  </button>
                </div>
              </div>

              {/* Desktop: Grid */}
              <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {state.collections.map((period) => (
                  <button
                    key={period.id}
                    onClick={() =>
                      dispatch({
                        type: "SET_SELECTED_PERIOD",
                        payload: { periodId: period.id },
                      })
                    }
                    className={`p-5 rounded-lg border text-left transition-all duration-200 ${
                      selectedPeriod === period.id
                        ? "border-neutral-900 bg-neutral-900 text-white shadow-sm"
                        : "border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-sm"
                    }`}
                  >
                    <p className={`text-xs uppercase tracking-wider font-normal mb-3 ${
                      selectedPeriod === period.id ? "text-neutral-400" : "text-neutral-500"
                    }`}>
                      {format(new Date(period.date), "MMM d, yyyy")}
                    </p>
                    <p className={`text-2xl font-light mb-2 ${
                      selectedPeriod === period.id ? "text-white" : "text-neutral-900"
                    }`}>
                      ₱{period.totalCollected.toLocaleString()}
                    </p>
                    <p className={`text-xs font-light ${
                      selectedPeriod === period.id ? "text-neutral-400" : "text-neutral-500"
                    }`}>
                      {period.payments.length} {period.payments.length === 1 ? 'payment' : 'payments'}
                    </p>
                  </button>
                ))}

                <button
                  onClick={addNextCollectionPeriod}
                  className="p-5 rounded-lg border border-dashed border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50 transition-all duration-200 flex flex-col items-center justify-center min-h-[140px]"
                >
                  <span className="text-3xl text-neutral-400 mb-2 font-light">+</span>
                  <span className="text-sm text-neutral-600 font-light">Add Period</span>
                </button>
              </div>
            </>
          ) : (
            <div className="bg-white border border-neutral-200 rounded-lg p-8 sm:p-12 text-center">
              <p className="text-sm text-neutral-500 font-light mb-4 sm:mb-6">No periods yet</p>
              <button
                onClick={addNextCollectionPeriod}
                className="px-5 py-2.5 bg-neutral-900 !text-white text-sm font-normal rounded-md hover:bg-neutral-800 transition-all duration-200 min-h-[44px]"
              >
                Create First Period
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <Modal
        isOpen={showNewPeriodModal}
        onClose={() => setShowNewPeriodModal(false)}
        title="Add New Collection Period"
      >
        <div className="space-y-4">
          <Input
            type="date"
            label="Period Date"
            value={newPeriodDate}
            onChange={(e) => setNewPeriodDate(e.target.value)}
          />
          <div className="flex flex-col sm:flex-row justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowNewPeriodModal(false)}
            >
              Cancel
            </Button>
            <Button onClick={addCollectionPeriod}>Create Period</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showNewLoanModal}
        onClose={() => setShowNewLoanModal(false)}
        title="Create New Loan"
        size="md"
      >
        <div className="space-y-4">
          <Select
            label="Member"
            value={newLoanMemberId}
            onChange={(e) => setNewLoanMemberId(e.target.value)}
            options={[
              { value: "", label: "Select a member" },
              ...state.members.map((m) => ({
                value: m.id.toString(),
                label: m.name,
              })),
            ]}
          />
          <Input
            type="number"
            label="Loan Amount (₱)"
            value={newLoanAmount}
            onChange={(e) => setNewLoanAmount(e.target.value)}
            placeholder="0.00"
          />
          <Input
            label="Purpose"
            value={newLoanPurpose}
            onChange={(e) => setNewLoanPurpose(e.target.value)}
            placeholder="Loan purpose"
          />
          <Select
            label="Repayment Plan"
            value={newLoanPlan}
            onChange={(e) =>
              setNewLoanPlan(e.target.value as "MONTHLY" | "CUT_OFF")
            }
            options={[
              {
                value: "CUT_OFF",
                label: "Per Cut-off installments (3% per month)",
              },
              { value: "MONTHLY", label: "One-time payment (4% per month)" },
            ]}
          />
          <Input
            type="number"
            label="Terms (months)"
            value={newLoanTerms}
            onChange={(e) => setNewLoanTerms(e.target.value)}
            placeholder="5"
            title={
              newLoanPlan === "MONTHLY"
                ? "Number of months before full payment is due"
                : "Number of months to pay (2 cut-offs per month)"
            }
          />

          {/* Loan Type Explanation */}
          <div className="p-5 bg-neutral-50 border border-neutral-200 rounded-lg">
            <h4 className="font-normal text-neutral-900 mb-3 text-sm uppercase tracking-wider">
              Loan Type Information
            </h4>
            {newLoanPlan === "MONTHLY" ? (
              <div className="text-sm text-neutral-700 font-light">
                <p className="mb-3 font-normal text-neutral-900">
                  One-time Payment Loan
                </p>
                <ul className="space-y-2 ml-1">
                  <li className="flex items-start">
                    <span className="text-neutral-400 mr-2">•</span>
                    <span>Pay the full amount + interest after {newLoanTerms || 5}{" "}
                    months</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-neutral-400 mr-2">•</span>
                    <span>Interest: 4% per month × {newLoanTerms || 5} months ={" "}
                    {(parseFloat(newLoanTerms) || 5) * 4}% total</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-neutral-400 mr-2">•</span>
                    <span>Example: ₱10,000 → Pay ₱
                    {(
                      10000 *
                      (1 + 0.04 * (parseFloat(newLoanTerms) || 5))
                    ).toLocaleString()}{" "}
                    after {newLoanTerms || 5} months</span>
                  </li>
                </ul>
              </div>
            ) : (
              <div className="text-sm text-neutral-700 font-light">
                <p className="mb-3 font-normal text-neutral-900">
                  Per Cut-off Installment Loan
                </p>
                <ul className="space-y-2 ml-1">
                  <li className="flex items-start">
                    <span className="text-neutral-400 mr-2">•</span>
                    <span>Pay in installments every cut-off (2 times per month)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-neutral-400 mr-2">•</span>
                    <span>Interest: 3% per month × {newLoanTerms || 5} months ={" "}
                    {(parseFloat(newLoanTerms) || 5) * 3}% total</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-neutral-400 mr-2">•</span>
                    <span>Total payments: {(parseFloat(newLoanTerms) || 5) * 2}{" "}
                    installments</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-neutral-400 mr-2">•</span>
                    <span>Example: ₱10,000 → {(parseFloat(newLoanTerms) || 5) * 2}{" "}
                    payments of ₱
                    {(
                      (10000 * (1 + 0.03 * (parseFloat(newLoanTerms) || 5))) /
                      ((parseFloat(newLoanTerms) || 5) * 2)
                    ).toFixed(0)}{" "}
                    each</span>
                  </li>
                </ul>
              </div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowNewLoanModal(false)}
            >
              Cancel
            </Button>
            <Button onClick={createLoan}>Create Loan</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="Reset All Periods"
      >
        <div className="space-y-6">
          <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-5">
            <p className="text-xs uppercase tracking-wider text-neutral-500 font-normal mb-3">
              Warning
            </p>
            <p className="text-sm text-neutral-900 font-light mb-4">
              This will permanently delete:
            </p>
            <ul className="space-y-2 text-sm text-neutral-700 font-light">
              <li className="flex items-start">
                <span className="text-neutral-400 mr-2">•</span>
                <span>All collection periods ({state.collections.length} {state.collections.length === 1 ? 'period' : 'periods'})</span>
              </li>
              <li className="flex items-start">
                <span className="text-neutral-400 mr-2">•</span>
                <span>All loans ({state.loans.length} {state.loans.length === 1 ? 'loan' : 'loans'})</span>
              </li>
              <li className="flex items-start">
                <span className="text-neutral-400 mr-2">•</span>
                <span>All repayments and penalties</span>
              </li>
              <li className="flex items-start">
                <span className="text-neutral-400 mr-2">•</span>
                <span>This action cannot be undone</span>
              </li>
            </ul>
          </div>
          <p className="text-sm text-neutral-600 font-light">
            Member information will be preserved. You can start creating new collection periods after reset.
          </p>
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
            <button
              onClick={() => setShowResetModal(false)}
              className="px-5 py-2.5 border border-neutral-300 text-neutral-700 text-sm font-normal rounded-md hover:border-neutral-400 hover:bg-neutral-50 transition-all duration-200 min-h-[44px]"
            >
              Cancel
            </button>
            <button
              onClick={handleResetPeriods}
              className="px-5 py-2.5 bg-neutral-900 !text-white text-sm font-normal rounded-md hover:bg-neutral-800 transition-all duration-200 min-h-[44px]"
            >
              Confirm Reset
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function HomePage() {
  return (
    <ProtectedRoute>
      <HomeContent />
    </ProtectedRoute>
  );
}
