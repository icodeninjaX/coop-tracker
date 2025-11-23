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
  Badge,
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

  // Loan form states - EXACTLY like dashboard
  const [newLoanMemberId, setNewLoanMemberId] = useState<string>("");
  const [newLoanAmount, setNewLoanAmount] = useState<string>("");
  const [newLoanPurpose, setNewLoanPurpose] = useState<string>("");
  const [newLoanPlan, setNewLoanPlan] = useState<"MONTHLY" | "CUT_OFF">(
    "CUT_OFF"
  );
  const [newLoanTerms, setNewLoanTerms] = useState<string>("5");
  const [showAddLoan, setShowAddLoan] = useState(false);

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
          <p className="mt-2 text-indigo-600 font-light">Loading coop data...</p>
        </div>
      </div>
    );
  }

  // EXACT same function as dashboard
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
  const totalOutstanding = loans
    .filter((l) => l.status === "APPROVED")
    .reduce(
      (sum, l) => sum + (calculateTotalDue(l) - calculateTotalRepayments(l.id)),
      0
    );

  // Calculate total interest earned from approved and paid loans
  const totalInterestEarned = loans
    .filter((l) => l.status === "APPROVED" || l.status === "PAID")
    .reduce((sum, l) => {
      const totalDue = calculateTotalDue(l);
      const interest = totalDue - l.amount; // Total due - Principal = Interest
      return sum + interest;
    }, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="container mx-auto max-w-7xl px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        {/* Header Section */}
        <div className="mb-6 lg:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-indigo-900 tracking-tight mb-1 sm:mb-2">
                Loans
              </h1>
              <p className="text-sm sm:text-base text-indigo-600 font-light">
                Manage loan applications, approvals, and repayments
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Badge variant="info" className="text-xs sm:text-sm font-normal">
                {totalLoans} loans
              </Badge>
              <Badge variant="warning" className="text-xs sm:text-sm font-normal">
                {pendingLoans} pending
              </Badge>
              {selectedPeriod && (
                <Badge variant="neutral" className="text-xs sm:text-sm font-normal">
                  {format(new Date(selectedPeriod), "MMM dd")}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6 mb-6 lg:mb-8">
          <div className="bg-white/80 backdrop-blur-sm border-2 border-indigo-200 rounded-xl p-4 sm:p-6 transition-all duration-200 hover:shadow-md hover:border-indigo-300">
            <p className="text-xs uppercase tracking-wider text-indigo-600 font-normal mb-2">
              Total Loans
            </p>
            <p className="text-2xl sm:text-3xl font-semibold text-indigo-900">
              {totalLoans}
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm border-2 border-amber-200 rounded-xl p-4 sm:p-6 transition-all duration-200 hover:shadow-md hover:border-amber-300">
            <p className="text-xs uppercase tracking-wider text-amber-600 font-normal mb-2">
              Pending
            </p>
            <p className="text-2xl sm:text-3xl font-semibold text-amber-900">
              {pendingLoans}
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm border-2 border-emerald-200 rounded-xl p-4 sm:p-6 transition-all duration-200 hover:shadow-md hover:border-emerald-300">
            <p className="text-xs uppercase tracking-wider text-emerald-600 font-normal mb-2">
              Approved
            </p>
            <p className="text-2xl sm:text-3xl font-semibold text-emerald-900">
              {approvedLoans}
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm border-2 border-purple-200 rounded-xl p-4 sm:p-6 transition-all duration-200 hover:shadow-md hover:border-purple-300">
            <p className="text-xs uppercase tracking-wider text-purple-600 font-normal mb-2">
              Outstanding
            </p>
            <p className="text-2xl sm:text-3xl font-semibold text-purple-900">
              ₱{totalOutstanding.toLocaleString()}
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm border-2 border-rose-200 rounded-xl p-4 sm:p-6 transition-all duration-200 hover:shadow-md hover:border-rose-300">
            <p className="text-xs uppercase tracking-wider text-rose-600 font-normal mb-2">
              Interest Earned
            </p>
            <p className="text-2xl sm:text-3xl font-semibold text-rose-900">
              ₱{totalInterestEarned.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Controls Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 lg:mb-8">
          {/* Period Selection */}
          <Card className="p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-indigo-900 mb-3 sm:mb-4">
              Collection Period
            </h3>
            <Select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              options={[
                { value: "", label: "All Periods" },
                ...(state.collections || []).map((p) => ({
                  value: p.id,
                  label: format(new Date(p.date), "MMM d, yyyy"),
                })),
              ]}
            />
          </Card>

          {/* Status Filter */}
          <Card className="p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-indigo-900 mb-3 sm:mb-4">
              Status Filter
            </h3>
            <Select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              options={[
                { value: "", label: "All Statuses" },
                { value: "PENDING", label: "Pending" },
                { value: "APPROVED", label: "Approved" },
                { value: "REJECTED", label: "Rejected" },
                { value: "PAID", label: "Completed" },
              ]}
            />
          </Card>

          {/* Search */}
          <Card className="p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-indigo-900 mb-3 sm:mb-4">
              Search
            </h3>
            <Input
              type="text"
              placeholder="Search member..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="text-sm"
              icon={
                <svg
                  className="h-4 w-4 text-indigo-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              }
            />
          </Card>

          {/* Quick Actions */}
          <Card className="p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-indigo-900 mb-3 sm:mb-4">
              Quick Actions
            </h3>
            <button
              onClick={() => setShowAddLoan(true)}
              className="w-full px-5 py-2.5 bg-indigo-300 text-indigo-900 text-sm font-normal rounded-md hover:bg-indigo-400 shadow-sm transition-all duration-200"
            >
              Add Loan
            </button>
          </Card>
        </div>

        {/* Loans List */}
        <Card className="overflow-hidden shadow-sm">
          <div className="p-4 sm:p-6 border-b-2 border-indigo-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h2 className="text-lg sm:text-xl font-semibold text-indigo-900">
                Loan Applications
              </h2>
              <span className="text-xs sm:text-sm text-indigo-600 font-light">
                {loans.length} loans
                {(selectedPeriod || selectedStatus || query) &&
                  ` (filtered from ${state.loans?.length || 0})`}
              </span>
            </div>
          </div>

          {loans.length === 0 ? (
            <div className="p-12">
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
            </div>
          ) : (
            <div className="divide-y divide-indigo-100">
              {loans.map((loan) => {
                const member = (state.members || []).find(
                  (m) => m.id === loan.memberId
                );
                const totalRepayments = calculateTotalRepayments(loan.id);
                const totalDue = calculateTotalDue(loan);
                const remainingBalance = totalDue - totalRepayments;
                const repaymentProgress =
                  totalDue > 0 ? (totalRepayments / totalDue) * 100 : 0;

                // Calculate loan details
                const interestRate =
                  loan.interestRate ||
                  (loan.repaymentPlan === "MONTHLY" ? 0.04 : 0.03);
                const termCount = loan.termCount || 5;
                const interestAmount = totalDue - loan.amount; // Interest earned from this loan

                const periodsCount = loan.termCount
                  ? loan.repaymentPlan === "CUT_OFF"
                    ? loan.termCount * 2
                    : 1
                  : undefined;

                const installment =
                  loan.repaymentPlan === "MONTHLY"
                    ? totalDue
                    : periodsCount
                    ? totalDue / periodsCount
                    : undefined;

                return (
                  <div
                    key={loan.id}
                    className="p-4 sm:p-6 hover:bg-indigo-50/30 transition-colors"
                  >
                    <div className="flex flex-col space-y-4">
                      {/* Header with Member Info and Status */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-300 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-indigo-900 text-sm sm:text-base font-semibold">
                              {member?.name[0]?.toUpperCase() || "?"}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                              <h3 className="text-base sm:text-lg font-semibold text-indigo-900 truncate">
                                {member?.name || "Unknown Member"}
                              </h3>
                              <Badge
                                variant={
                                  loan.status === "APPROVED"
                                    ? "success"
                                    : loan.status === "PENDING"
                                    ? "warning"
                                    : loan.status === "REJECTED"
                                    ? "error"
                                    : "neutral"
                                }
                                className="text-xs self-start"
                              >
                                {loan.status}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* Delete button - always visible on mobile */}
                        <Button
                          onClick={() => deleteLoan(loan.id)}
                          variant="danger"
                          size="sm"
                          className="text-xs px-2 py-1 flex-shrink-0"
                        >
                          🗑️
                        </Button>
                      </div>

                      {/* Loan Details Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm sm:text-base">
                        <div className="space-y-2 sm:space-y-3">
                          <div className="flex justify-between">
                            <span className="text-indigo-600 font-light">Principal:</span>
                            <span className="font-normal text-indigo-900">
                              ₱{loan.amount.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-indigo-600 font-light">Interest:</span>
                            <span className="font-normal text-rose-700">
                              ₱{interestAmount.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-indigo-600 font-light">Rate:</span>
                            <span className="font-normal text-indigo-900">
                              {(interestRate * 100).toFixed(1)}%/month
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-indigo-600 font-light">Date:</span>
                            <span className="font-normal text-indigo-900">
                              {format(new Date(loan.dateIssued), "MMM d, yyyy")}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2 sm:space-y-3">
                          <div className="flex justify-between">
                            <span className="text-indigo-600 font-light">Plan:</span>
                            <span className="font-normal text-indigo-900 text-right">
                              {loan.repaymentPlan === "MONTHLY"
                                ? "One-time"
                                : "Installments"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-indigo-600 font-light">Terms:</span>
                            <span className="font-normal text-indigo-900">
                              {termCount} months
                            </span>
                          </div>
                          {installment && (
                            <div className="flex justify-between">
                              <span className="text-indigo-600 font-light">
                                {loan.repaymentPlan === "MONTHLY"
                                  ? "Total Due:"
                                  : "Per Cut-off:"}
                              </span>
                              <span className="font-normal text-indigo-900">
                                ₱{installment.toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Payment Information - Only for approved loans */}
                      {loan.status === "APPROVED" && (
                        <div className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-4 space-y-3">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-indigo-600 font-light">Repaid:</span>
                              <div className="font-semibold text-emerald-700">
                                ₱{totalRepayments.toLocaleString()}
                              </div>
                            </div>
                            <div>
                              <span className="text-indigo-600 font-light">Balance:</span>
                              <div className="font-semibold text-rose-700">
                                ₱{remainingBalance.toLocaleString()}
                              </div>
                            </div>
                          </div>

                          {remainingBalance > 0 && (
                            <>
                              {/* Progress Bar */}
                              <div className="w-full bg-indigo-200 rounded-full h-2">
                                <div
                                  className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                                  style={{ width: `${repaymentProgress}%` }}
                                />
                              </div>

                              {/* Payment Input */}
                              <div className="flex flex-col sm:flex-row gap-2">
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
                                  className="flex-1 text-sm"
                                />
                                <button
                                  onClick={() => {
                                    const amount = parseFloat(
                                      repaymentAmount[loan.id] || "0"
                                    );
                                    if (amount > 0)
                                      addRepayment(loan.id, amount);
                                  }}
                                  disabled={
                                    !repaymentAmount[loan.id] ||
                                    parseFloat(repaymentAmount[loan.id]) <= 0
                                  }
                                  className="whitespace-nowrap px-4 py-2.5 bg-emerald-300 text-emerald-900 text-sm font-normal rounded-md hover:bg-emerald-400 shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Add Payment
                                </button>
                              </div>
                            </>
                          )}

                          {remainingBalance <= 0 && (
                            <div className="text-center">
                              <Badge variant="success" className="text-sm">
                                🎉 Fully Paid
                              </Badge>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Action Buttons for Pending Loans */}
                      {loan.status === "PENDING" && (
                        <div className="flex flex-col sm:flex-row gap-3 pt-3">
                          <button
                            onClick={() => approveLoan(loan.id)}
                            className="flex-1 px-5 py-2.5 bg-emerald-300 text-emerald-900 text-sm font-normal rounded-md hover:bg-emerald-400 shadow-sm transition-all duration-200"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => rejectLoan(loan.id)}
                            className="flex-1 px-5 py-2.5 bg-rose-300 text-rose-900 text-sm font-normal rounded-md hover:bg-rose-400 shadow-sm transition-all duration-200"
                          >
                            Reject
                          </button>
                        </div>
                      )}

                      {/* Completed Status */}
                      {loan.status === "PAID" && (
                        <div className="text-center">
                          <Badge variant="success" className="text-sm">
                            ✨ Loan Completed
                          </Badge>
                        </div>
                      )}

                      {/* Payment Schedule */}
                      <LoanSchedule
                        loan={loan}
                        repayments={state.repayments || []}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Add Loan Modal */}
      <Modal
        isOpen={showAddLoan}
        onClose={() => setShowAddLoan(false)}
        title="Create New Loan"
        size="md"
      >
        <div className="space-y-4 sm:space-y-6">
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
            className="text-sm sm:text-base"
          />
          <Input
            type="number"
            label="Loan Amount (₱)"
            value={newLoanAmount}
            onChange={(e) => setNewLoanAmount(e.target.value)}
            placeholder="0.00"
            className="text-sm sm:text-base"
          />
          <Input
            label="Purpose"
            value={newLoanPurpose}
            onChange={(e) => setNewLoanPurpose(e.target.value)}
            placeholder="Loan purpose"
            className="text-sm sm:text-base"
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
                label: "Installments (3%/month)",
              },
              { value: "MONTHLY", label: "One-time (4%/month)" },
            ]}
            className="text-sm sm:text-base"
          />
          <Input
            type="number"
            label="Terms (months)"
            value={newLoanTerms}
            onChange={(e) => setNewLoanTerms(e.target.value)}
            placeholder="5"
            className="text-sm sm:text-base"
            title={
              newLoanPlan === "MONTHLY"
                ? "Number of months before full payment is due"
                : "Number of months to pay (2 cut-offs per month)"
            }
          />

          {/* Loan Type Explanation */}
          <div className="p-4 sm:p-5 bg-indigo-50 border-2 border-indigo-200 rounded-lg">
            <h4 className="font-normal text-indigo-900 mb-3 text-sm uppercase tracking-wider">
              Loan Type Information
            </h4>
            {newLoanPlan === "MONTHLY" ? (
              <div className="text-xs sm:text-sm text-indigo-700 font-light">
                <p className="mb-3 font-normal text-indigo-900">
                  One-time Payment Loan
                </p>
                <ul className="space-y-2 ml-1">
                  <li className="flex items-start">
                    <span className="text-indigo-400 mr-2">•</span>
                    <span>Pay full amount + interest after {newLoanTerms || 5} months</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-indigo-400 mr-2">•</span>
                    <span>Interest: 4%/month × {newLoanTerms || 5} months ={" "}
                    {(parseFloat(newLoanTerms) || 5) * 4}% total</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-indigo-400 mr-2">•</span>
                    <span className="break-words">Example: ₱10,000 → Pay ₱
                    {(
                      10000 *
                      (1 + 0.04 * (parseFloat(newLoanTerms) || 5))
                    ).toLocaleString()}{" "}
                    after {newLoanTerms || 5} months</span>
                  </li>
                </ul>
              </div>
            ) : (
              <div className="text-xs sm:text-sm text-indigo-700 font-light">
                <p className="mb-3 font-normal text-indigo-900">
                  Per Cut-off Installment Loan
                </p>
                <ul className="space-y-2 ml-1">
                  <li className="flex items-start">
                    <span className="text-indigo-400 mr-2">•</span>
                    <span>Pay in installments every cut-off (2 times/month)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-indigo-400 mr-2">•</span>
                    <span>Interest: 3%/month × {newLoanTerms || 5} months ={" "}
                    {(parseFloat(newLoanTerms) || 5) * 3}% total</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-indigo-400 mr-2">•</span>
                    <span>Total payments: {(parseFloat(newLoanTerms) || 5) * 2}{" "}
                    installments</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-indigo-400 mr-2">•</span>
                    <span className="break-words">Example: ₱10,000 → {(parseFloat(newLoanTerms) || 5) * 2}{" "}
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

          <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => setShowAddLoan(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={createLoan}
              className="w-full sm:w-auto"
              disabled={!newLoanMemberId || !newLoanAmount}
            >
              Create Loan
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
