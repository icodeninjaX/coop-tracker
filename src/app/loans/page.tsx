"use client";

import { useCoop } from "@/context/CoopContext";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  Button,
  Card,
  Input,
  Select,
  EmptyState,
  Modal,
} from "@/components/UI";
import { Loan, Repayment } from "@/types";
import LoanSchedule from "@/components/LoanSchedule";

const LoansPage = () => {
  const { state, dispatch } = useCoop();

  // Filters and search
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [query, setQuery] = useState<string>("");

  // Loan form states
  const [newLoanMemberId, setNewLoanMemberId] = useState<string>("");
  const [newLoanAmount, setNewLoanAmount] = useState<string>("");
  const [newLoanPurpose, setNewLoanPurpose] = useState<string>("");
  const [newLoanPlan, setNewLoanPlan] = useState<"MONTHLY" | "CUT_OFF">(
    "CUT_OFF"
  );
  const [newLoanTerms, setNewLoanTerms] = useState<string>("5");
  const [showAddLoan, setShowAddLoan] = useState(false);

  // Expanded loan for details
  const [expandedLoan, setExpandedLoan] = useState<string | null>(null);

  // Repayment
  const [repaymentAmount, setRepaymentAmount] = useState<
    Record<string, string>
  >({});

  const loans = useMemo(() => {
    if (!state?.loans) return [] as Loan[];
    let filtered = state.loans;
    if (selectedPeriod) {
      filtered = filtered.filter(
        (loan) => loan.disbursementPeriodId === selectedPeriod
      );
    }
    if (selectedStatus) {
      filtered = filtered.filter((loan) => loan.status === selectedStatus);
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      filtered = filtered.filter((loan) => {
        const member = state.members?.find((m) => m.id === loan.memberId);
        return member?.name.toLowerCase().includes(q);
      });
    }
    return filtered;
  }, [state?.loans, state?.members, selectedPeriod, selectedStatus, query]);

  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-indigo-600 font-light">Loading...</p>
        </div>
      </div>
    );
  }

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
    setShowAddLoan(false);
  };

  const approveLoan = (loanId: string) => {
    dispatch({
      type: "UPDATE_LOAN",
      payload: {
        loanId,
        loan: {
          status: "APPROVED",
          dateApproved: new Date().toISOString(),
          disbursementPeriodId:
            selectedPeriod || state.collections?.[0]?.id || "",
        },
      },
    });
  };

  const rejectLoan = (loanId: string) => {
    dispatch({
      type: "UPDATE_LOAN",
      payload: { loanId, loan: { status: "REJECTED" } },
    });
  };

  const deleteLoan = (loanId: string) => {
    if (
      confirm(
        "Are you sure you want to delete this loan? This action cannot be undone."
      )
    ) {
      dispatch({ type: "DELETE_LOAN", payload: { loanId } });
    }
  };

  const addRepayment = (loanId: string, amount: number) => {
    const repayment: Repayment = {
      id: `repayment-${Date.now()}`,
      loanId,
      memberId: state.loans?.find((l) => l.id === loanId)?.memberId || 0,
      amount,
      date: new Date().toISOString(),
      periodId: selectedPeriod || state.collections?.[0]?.id || "",
    };
    dispatch({ type: "ADD_REPAYMENT", payload: repayment });
    setRepaymentAmount((prev) => ({ ...prev, [loanId]: "" }));
  };

  const calculateTotalRepayments = (loanId: string) => {
    return (state.repayments || [])
      .filter((r) => r.loanId === loanId)
      .reduce((sum, r) => sum + r.amount, 0);
  };

  const calculateTotalDue = (loan: Loan) => {
    const interestRate =
      loan.interestRate || (loan.repaymentPlan === "MONTHLY" ? 0.04 : 0.03);
    const termCount = loan.termCount || 5;
    const totalInterest = loan.amount * interestRate * termCount;
    return loan.amount + totalInterest;
  };

  const totalLoans = loans.length;
  const pendingLoans = loans.filter((l) => l.status === "PENDING").length;
  const approvedLoans = loans.filter((l) => l.status === "APPROVED").length;
  const paidLoans = loans.filter((l) => l.status === "PAID").length;
  const totalOutstanding = loans
    .filter((l) => l.status === "APPROVED")
    .reduce(
      (sum, l) => sum + (calculateTotalDue(l) - calculateTotalRepayments(l.id)),
      0
    );

  const totalInterestEarned = loans
    .filter((l) => l.status === "APPROVED" || l.status === "PAID")
    .reduce((sum, l) => {
      const totalDue = calculateTotalDue(l);
      const interest = totalDue - l.amount;
      return sum + interest;
    }, 0);

  const getStatusText = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <span className="text-emerald-600 text-xs font-medium">Active</span>;
      case "PENDING":
        return <span className="text-amber-600 text-xs font-medium">Pending</span>;
      case "REJECTED":
        return <span className="text-rose-600 text-xs font-medium">Rejected</span>;
      case "PAID":
        return <span className="text-slate-500 text-xs font-medium">Paid</span>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="container mx-auto max-w-7xl px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        {/* Header with Stats */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl sm:text-2xl font-semibold text-indigo-900">
              Loans
            </h1>
            <Button onClick={() => setShowAddLoan(true)} size="sm">
              + New Loan
            </Button>
          </div>

          {/* Compact Stats Row */}
          <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/80 border border-indigo-200 rounded-full">
              <span className="text-indigo-600">Total:</span>
              <span className="font-semibold text-indigo-900">{totalLoans}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
              <span className="text-amber-600">Pending:</span>
              <span className="font-semibold text-amber-900">{pendingLoans}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full">
              <span className="text-emerald-600">Active:</span>
              <span className="font-semibold text-emerald-900">{approvedLoans}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-full">
              <span className="text-purple-600">Outstanding:</span>
              <span className="font-semibold text-purple-900">₱{totalOutstanding.toLocaleString()}</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-full">
              <span className="text-rose-600">Interest:</span>
              <span className="font-semibold text-rose-900">₱{totalInterestEarned.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Compact Filters Row */}
        <div className="bg-white/80 backdrop-blur-sm border border-indigo-200 rounded-lg p-3 mb-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="col-span-2 sm:col-span-2">
              <Input
                type="text"
                placeholder="Search member..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="text-sm h-9"
              />
            </div>
            <Select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              options={[
                { value: "", label: "Status" },
                { value: "PENDING", label: "Pending" },
                { value: "APPROVED", label: "Active" },
                { value: "PAID", label: "Paid" },
                { value: "REJECTED", label: "Rejected" },
              ]}
              compact
            />
            <Select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              options={[
                { value: "", label: "Period" },
                ...(state.collections || []).map((p) => ({
                  value: p.id,
                  label: format(new Date(p.date), "MMM d"),
                })),
              ]}
              compact
            />
          </div>
        </div>

        {/* Loans List */}
        {loans.length === 0 ? (
          <Card className="p-8">
            <EmptyState
              title="No Loans Found"
              description={
                query || selectedStatus || selectedPeriod
                  ? "No loans match your filters"
                  : "No loan applications yet"
              }
              action={
                <Button onClick={() => setShowAddLoan(true)}>
                  Add First Loan
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="space-y-2">
            {loans.map((loan) => {
              const member = (state.members || []).find(
                (m) => m.id === loan.memberId
              );
              const totalRepayments = calculateTotalRepayments(loan.id);
              const totalDue = calculateTotalDue(loan);
              const remainingBalance = totalDue - totalRepayments;
              const repaymentProgress =
                totalDue > 0 ? (totalRepayments / totalDue) * 100 : 0;
              const isExpanded = expandedLoan === loan.id;
              const interestRate =
                loan.interestRate ||
                (loan.repaymentPlan === "MONTHLY" ? 0.04 : 0.03);

              // Effective status: if APPROVED but fully paid, treat as PAID
              const isFullyPaid = loan.status === "APPROVED" && remainingBalance <= 0;
              const effectiveStatus = isFullyPaid ? "PAID" : loan.status;

              return (
                <div
                  key={loan.id}
                  className="bg-white/80 backdrop-blur-sm border border-indigo-200 rounded-lg overflow-hidden hover:border-indigo-300 transition-colors"
                >
                  {/* Compact Loan Row */}
                  <div
                    className="p-3 sm:p-4 cursor-pointer"
                    onClick={() => setExpandedLoan(isExpanded ? null : loan.id)}
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="w-9 h-9 sm:w-10 sm:h-10 bg-indigo-200 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-indigo-700 text-sm font-medium">
                          {member?.name[0]?.toUpperCase() || "?"}
                        </span>
                      </div>

                      {/* Main Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-medium text-indigo-900 text-sm truncate">
                            {member?.name || "Unknown"}
                          </span>
                          {getStatusText(effectiveStatus)}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-indigo-600">
                          <span>₱{loan.amount.toLocaleString()}</span>
                          <span className="text-indigo-300">•</span>
                          <span>{(interestRate * 100).toFixed(0)}%/mo</span>
                          <span className="text-indigo-300">•</span>
                          <span>{loan.termCount || 5}mo</span>
                        </div>
                      </div>

                      {/* Right Side - Balance/Actions */}
                      <div className="text-right flex-shrink-0">
                        {effectiveStatus === "APPROVED" && (
                          <div>
                            <div className="text-xs text-indigo-600">Balance</div>
                            <div className="font-semibold text-sm text-indigo-900">
                              ₱{remainingBalance.toLocaleString()}
                            </div>
                          </div>
                        )}
                        {effectiveStatus === "PENDING" && (
                          <div className="flex gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                approveLoan(loan.id);
                              }}
                              className="px-2 py-1 bg-emerald-200 text-emerald-800 text-xs rounded hover:bg-emerald-300 transition-colors"
                            >
                              ✓
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                rejectLoan(loan.id);
                              }}
                              className="px-2 py-1 bg-rose-200 text-rose-800 text-xs rounded hover:bg-rose-300 transition-colors"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                        {effectiveStatus === "PAID" && (
                          <div className="text-xs text-emerald-600 font-medium">
                            ✓ Completed
                          </div>
                        )}
                      </div>

                      {/* Expand Icon */}
                      <svg
                        className={`w-4 h-4 text-indigo-400 transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>

                    {/* Progress Bar for Active Loans */}
                    {loan.status === "APPROVED" && remainingBalance > 0 && (
                      <div className="mt-2 w-full bg-indigo-100 rounded-full h-1.5">
                        <div
                          className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${repaymentProgress}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-indigo-100 p-3 sm:p-4 bg-indigo-50/30">
                      {/* Loan Details Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-3">
                        <div>
                          <span className="text-xs text-indigo-500">Principal</span>
                          <div className="font-medium text-indigo-900">
                            ₱{loan.amount.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <span className="text-xs text-indigo-500">Total Due</span>
                          <div className="font-medium text-indigo-900">
                            ₱{totalDue.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <span className="text-xs text-indigo-500">Paid</span>
                          <div className="font-medium text-emerald-700">
                            ₱{totalRepayments.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <span className="text-xs text-indigo-500">Date</span>
                          <div className="font-medium text-indigo-900">
                            {format(new Date(loan.dateIssued), "MMM d, yyyy")}
                          </div>
                        </div>
                      </div>

                      {/* Payment Input for Active Loans */}
                      {loan.status === "APPROVED" && remainingBalance > 0 && (
                        <div className="flex gap-2 mb-3">
                          <Input
                            type="number"
                            placeholder="Payment amount"
                            value={repaymentAmount[loan.id] || ""}
                            onChange={(e) =>
                              setRepaymentAmount((prev) => ({
                                ...prev,
                                [loan.id]: e.target.value,
                              }))
                            }
                            className="flex-1 text-sm h-9"
                          />
                          <button
                            onClick={() => {
                              const amount = parseFloat(
                                repaymentAmount[loan.id] || "0"
                              );
                              if (amount > 0) addRepayment(loan.id, amount);
                            }}
                            disabled={
                              !repaymentAmount[loan.id] ||
                              parseFloat(repaymentAmount[loan.id]) <= 0
                            }
                            className="px-4 py-2 bg-emerald-200 text-emerald-800 text-sm rounded-md hover:bg-emerald-300 transition-colors disabled:opacity-50"
                          >
                            Pay
                          </button>
                        </div>
                      )}

                      {/* Payment Schedule - Collapsible */}
                      <LoanSchedule
                        loan={loan}
                        repayments={state.repayments || []}
                        compact
                      />

                      {/* Delete Button */}
                      <div className="flex justify-end pt-2 mt-2 border-t border-indigo-100">
                        <button
                          onClick={() => deleteLoan(loan.id)}
                          className="text-xs text-rose-600 hover:text-rose-700 hover:underline"
                        >
                          Delete Loan
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Loan Modal */}
      <Modal
        isOpen={showAddLoan}
        onClose={() => setShowAddLoan(false)}
        title="New Loan"
        size="sm"
      >
        <div className="space-y-4">
          <Select
            label="Member"
            value={newLoanMemberId}
            onChange={(e) => setNewLoanMemberId(e.target.value)}
            options={[
              { value: "", label: "Select member" },
              ...state.members.map((m) => ({
                value: m.id.toString(),
                label: m.name,
              })),
            ]}
            className="text-sm"
          />
          <Input
            type="number"
            label="Amount (₱)"
            value={newLoanAmount}
            onChange={(e) => setNewLoanAmount(e.target.value)}
            placeholder="0.00"
            className="text-sm"
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Plan"
              value={newLoanPlan}
              onChange={(e) =>
                setNewLoanPlan(e.target.value as "MONTHLY" | "CUT_OFF")
              }
              options={[
                { value: "CUT_OFF", label: "Installment (3%)" },
                { value: "MONTHLY", label: "One-time (4%)" },
              ]}
              className="text-sm"
            />
            <Input
              type="number"
              label="Terms (months)"
              value={newLoanTerms}
              onChange={(e) => setNewLoanTerms(e.target.value)}
              placeholder="5"
              className="text-sm"
            />
          </div>

          {/* Quick Info */}
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-700">
            {newLoanPlan === "MONTHLY" ? (
              <p>
                One-time payment after {newLoanTerms || 5} months.
                Total: ₱{newLoanAmount ? (parseFloat(newLoanAmount) * (1 + 0.04 * (parseFloat(newLoanTerms) || 5))).toLocaleString() : "0"}
              </p>
            ) : (
              <p>
                {(parseFloat(newLoanTerms) || 5) * 2} installments of ₱
                {newLoanAmount
                  ? (
                      (parseFloat(newLoanAmount) *
                        (1 + 0.03 * (parseFloat(newLoanTerms) || 5))) /
                      ((parseFloat(newLoanTerms) || 5) * 2)
                    ).toFixed(0)
                  : "0"}{" "}
                each
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => setShowAddLoan(false)}
              className="flex-1"
              size="sm"
            >
              Cancel
            </Button>
            <Button
              onClick={createLoan}
              className="flex-1"
              size="sm"
              disabled={!newLoanMemberId || !newLoanAmount}
            >
              Create
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default function Page() {
  return (
    <ProtectedRoute>
      <LoansPage />
    </ProtectedRoute>
  );
}
