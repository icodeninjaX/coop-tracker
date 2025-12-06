"use client";

import { useCoop } from "@/context/CoopContext";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button, Card, Badge, EmptyState } from "@/components/UI";
import { useMemo, useState } from "react";

const MemberDetailPage = () => {
  const { state } = useCoop();
  const params = useParams();
  const router = useRouter();
  const memberId = parseInt(params.id as string);

  // Collapsible state
  const [isContributionHistoryExpanded, setIsContributionHistoryExpanded] = useState(true);
  const [isLoanHistoryExpanded, setIsLoanHistoryExpanded] = useState(true);
  const [isCurrentStandingExpanded, setIsCurrentStandingExpanded] = useState(true);

  const member = useMemo(
    () => state?.members.find((m) => m.id === memberId),
    [state?.members, memberId]
  );

  // Calculate member's payment history
  const paymentHistory = useMemo(() => {
    if (!state) return [];
    return state.collections
      .map((period) => {
        const payment = period.payments.find((p) => p.memberId === memberId);
        return {
          period,
          payment,
          isPaid: !!payment,
          amount: payment?.amount || 0,
        };
      })
      .sort((a, b) => new Date(b.period.date).getTime() - new Date(a.period.date).getTime());
  }, [state, memberId]);

  // Calculate total contributions
  const totalContributions = useMemo(() => {
    return paymentHistory.reduce((sum, item) => sum + item.amount, 0);
  }, [paymentHistory]);

  // Calculate payment compliance rate
  const complianceRate = useMemo(() => {
    const totalPeriods = paymentHistory.length;
    const paidPeriods = paymentHistory.filter((item) => item.isPaid).length;
    return totalPeriods > 0 ? (paidPeriods / totalPeriods) * 100 : 0;
  }, [paymentHistory]);

  // Calculate total dividends received
  const totalDividendsReceived = useMemo(() => {
    if (!state) return 0;
    return state.dividendDistributions.reduce((sum, distribution) => {
      const memberDividend = distribution.distributions.find(
        (d) => d.memberId === memberId && !d.forfeited
      );
      return sum + (memberDividend?.dividendAmount || 0);
    }, 0);
  }, [state, memberId]);

  // Calculate total member equity (contributions + dividends)
  const totalMemberEquity = useMemo(() => {
    return totalContributions + totalDividendsReceived;
  }, [totalContributions, totalDividendsReceived]);

  // Get member's loans
  const memberLoans = useMemo(() => {
    if (!state) return [];
    return state.loans
      .filter((loan) => loan.memberId === memberId)
      .sort((a, b) => new Date(b.dateIssued).getTime() - new Date(a.dateIssued).getTime());
  }, [state, memberId]);

  // Calculate loan totals
  const loanTotals = useMemo(() => {
    let totalBorrowed = 0;
    let totalRepaid = 0;
    let totalOutstanding = 0;

    memberLoans.forEach((loan) => {
      if (loan.status === "APPROVED" || loan.status === "PAID") {
        const interestRate = loan.interestRate || (loan.repaymentPlan === "MONTHLY" ? 0.04 : 0.03);
        const termCount = loan.termCount || 5;
        const totalDue = loan.amount * (1 + interestRate * termCount);

        totalBorrowed += loan.amount;

        const repaid = (state?.repayments || [])
          .filter((r) => r.loanId === loan.id)
          .reduce((sum, r) => sum + r.amount, 0);

        totalRepaid += repaid;

        if (loan.status === "APPROVED") {
          totalOutstanding += totalDue - repaid;
        }
      }
    });

    return { totalBorrowed, totalRepaid, totalOutstanding };
  }, [memberLoans, state?.repayments]);

  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-indigo-600 font-light">Loading member data...</p>
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <div className="container mx-auto max-w-7xl px-3 sm:px-6 py-6 sm:py-8">
          <EmptyState
            title="Member Not Found"
            description="The requested member could not be found."
            action={<Button onClick={() => router.push("/members")}>Back to Members</Button>}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="container mx-auto max-w-7xl px-3 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push("/members")}
            className="mb-3 sm:mb-4"
          >
            ← Back to Members
          </Button>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-indigo-300 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-indigo-900 text-xl sm:text-2xl lg:text-3xl font-semibold">
                {member.name[0]?.toUpperCase() || "?"}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-indigo-900 tracking-tight truncate">
                {member.name}
              </h1>
              <p className="text-xs sm:text-sm lg:text-base text-indigo-600 font-light">
                Member #{member.id}
              </p>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8">
          <div className="bg-white/80 backdrop-blur-sm border-2 border-indigo-200 rounded-xl p-3 sm:p-4 lg:p-6 transition-all duration-200 hover:shadow-md hover:border-indigo-300">
            <p className="text-xs uppercase tracking-wider text-indigo-600 font-normal mb-1 sm:mb-2">
              Total Contributed
            </p>
            <p className="text-base sm:text-xl lg:text-2xl xl:text-3xl font-semibold text-indigo-900 break-all">
              ₱{totalContributions.toLocaleString()}
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm border-2 border-purple-200 rounded-xl p-3 sm:p-4 lg:p-6 transition-all duration-200 hover:shadow-md hover:border-purple-300">
            <p className="text-xs uppercase tracking-wider text-purple-600 font-normal mb-1 sm:mb-2">
              Total Dividends
            </p>
            <p className="text-base sm:text-xl lg:text-2xl xl:text-3xl font-semibold text-purple-900 break-all">
              ₱{totalDividendsReceived.toLocaleString()}
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm border-2 border-emerald-200 rounded-xl p-3 sm:p-4 lg:p-6 transition-all duration-200 hover:shadow-md hover:border-emerald-300">
            <p className="text-xs uppercase tracking-wider text-emerald-600 font-normal mb-1 sm:mb-2">
              Total Member Equity
            </p>
            <p className="text-base sm:text-xl lg:text-2xl xl:text-3xl font-semibold text-emerald-900 break-all">
              ₱{totalMemberEquity.toLocaleString()}
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm border-2 border-amber-200 rounded-xl p-3 sm:p-4 lg:p-6 transition-all duration-200 hover:shadow-md hover:border-amber-300">
            <p className="text-xs uppercase tracking-wider text-amber-600 font-normal mb-1 sm:mb-2">
              Payment Compliance
            </p>
            <p className="text-base sm:text-xl lg:text-2xl xl:text-3xl font-semibold text-amber-900">
              {complianceRate.toFixed(0)}%
            </p>
          </div>
        </div>

        {/* Contributions History */}
        <Card className="mb-6 lg:mb-4">
          <button
            onClick={() => setIsContributionHistoryExpanded(!isContributionHistoryExpanded)}
            className="w-full p-4 sm:p-5 lg:p-4 border-b-2 border-indigo-200 text-left hover:bg-indigo-50/30 transition-colors duration-200 group"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl lg:text-lg font-semibold text-indigo-900 group-hover:text-indigo-700 transition-colors">
                  Contribution History
                </h2>
                <p className="text-xs sm:text-sm text-indigo-600 font-light mt-1">
                  ₱{totalContributions.toLocaleString()} total • {paymentHistory.length} periods
                </p>
              </div>
              <div className="flex-shrink-0">
                <svg
                  className={`w-5 h-5 text-indigo-600 transition-transform duration-200 ${
                    isContributionHistoryExpanded ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </button>
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              isContributionHistoryExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="p-4 sm:p-5 lg:p-4">
              {paymentHistory.length === 0 ? (
                <EmptyState
                  title="No Contribution History"
                  description="No collection periods recorded yet."
                />
              ) : (
                <div className="space-y-2 lg:space-y-2">
                  {paymentHistory.map((item) => (
                    <div
                      key={item.period.id}
                      className="flex items-center justify-between p-3 lg:p-3 border-2 border-indigo-200 rounded-lg hover:bg-indigo-50/30 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="text-sm sm:text-base font-semibold text-indigo-900">
                          {format(new Date(item.period.date), "MMMM d, yyyy")}
                        </p>
                        <p className="text-xs sm:text-sm text-indigo-600 font-light">
                          {item.isPaid
                            ? `Paid ₱${item.amount.toLocaleString()}`
                            : "Not paid"}
                        </p>
                      </div>
                      <div>
                        {item.isPaid ? (
                          <Badge variant="success" className="text-xs sm:text-sm">
                            Paid
                          </Badge>
                        ) : (
                          <Badge variant="error" className="text-xs sm:text-sm">
                            Unpaid
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Loan History */}
        <Card className="mb-6 lg:mb-4">
          <button
            onClick={() => setIsLoanHistoryExpanded(!isLoanHistoryExpanded)}
            className="w-full p-4 sm:p-5 lg:p-4 border-b-2 border-indigo-200 text-left hover:bg-indigo-50/30 transition-colors duration-200 group"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl lg:text-lg font-semibold text-indigo-900 group-hover:text-indigo-700 transition-colors">
                  Loan History
                </h2>
                <p className="text-xs sm:text-sm text-indigo-600 font-light mt-1">
                  ₱{loanTotals.totalBorrowed.toLocaleString()} borrowed • ₱{loanTotals.totalOutstanding.toLocaleString()} outstanding
                </p>
              </div>
              <div className="flex-shrink-0">
                <svg
                  className={`w-5 h-5 text-indigo-600 transition-transform duration-200 ${
                    isLoanHistoryExpanded ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </button>
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              isLoanHistoryExpanded ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="p-4 sm:p-5 lg:p-4">
            {memberLoans.length === 0 ? (
              <EmptyState
                title="No Loan History"
                description="This member has not applied for any loans yet."
              />
            ) : (
              <div className="space-y-3 lg:space-y-2">
                {memberLoans.map((loan) => {
                  const interestRate =
                    loan.interestRate ||
                    (loan.repaymentPlan === "MONTHLY" ? 0.04 : 0.03);
                  const termCount = loan.termCount || 5;
                  const totalDue = loan.amount * (1 + interestRate * termCount);
                  const totalRepaid = (state.repayments || [])
                    .filter((r) => r.loanId === loan.id)
                    .reduce((sum, r) => sum + r.amount, 0);
                  const remainingBalance = totalDue - totalRepaid;
                  const repaymentProgress =
                    totalDue > 0 ? (totalRepaid / totalDue) * 100 : 0;

                  return (
                    <div
                      key={loan.id}
                      className="border-2 border-indigo-200 rounded-lg p-3 lg:p-3 hover:bg-indigo-50/30 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2 lg:mb-2">
                        <div>
                          <p className="text-sm sm:text-base font-semibold text-indigo-900">
                            ₱{loan.amount.toLocaleString()} Loan
                          </p>
                          <p className="text-xs sm:text-sm text-indigo-600 font-light">
                            Issued {format(new Date(loan.dateIssued), "MMM d, yyyy")}
                          </p>
                        </div>
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
                          className="text-xs"
                        >
                          {loan.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 lg:gap-2 text-xs sm:text-sm mb-2 lg:mb-2">
                        <div>
                          <span className="text-indigo-600 font-light">Plan:</span>
                          <span className="ml-2 text-indigo-900 font-normal">
                            {loan.repaymentPlan === "MONTHLY"
                              ? "One-time"
                              : "Installments"}
                          </span>
                        </div>
                        <div>
                          <span className="text-indigo-600 font-light">Terms:</span>
                          <span className="ml-2 text-indigo-900 font-normal">
                            {termCount} months
                          </span>
                        </div>
                        <div>
                          <span className="text-indigo-600 font-light">Rate:</span>
                          <span className="ml-2 text-indigo-900 font-normal">
                            {(interestRate * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-indigo-600 font-light">Total Due:</span>
                          <span className="ml-2 text-indigo-900 font-normal">
                            ₱{totalDue.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {(loan.status === "APPROVED" || loan.status === "PAID") && (
                        <div className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-2 lg:p-2">
                          <div className="grid grid-cols-2 gap-2 lg:gap-2 text-xs sm:text-sm mb-2">
                            <div>
                              <span className="text-indigo-600 font-light">Repaid:</span>
                              <div className="font-semibold text-emerald-700">
                                ₱{totalRepaid.toLocaleString()}
                              </div>
                            </div>
                            <div>
                              <span className="text-indigo-600 font-light">Balance:</span>
                              <div className="font-semibold text-rose-700">
                                ₱{Math.max(0, remainingBalance).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          {loan.status === "APPROVED" && remainingBalance > 0 && (
                            <div className="w-full bg-indigo-200 rounded-full h-2">
                              <div
                                className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${repaymentProgress}%` }}
                              />
                            </div>
                          )}
                          {loan.status === "PAID" && (
                            <div className="text-center">
                              <Badge variant="success" className="text-xs">
                                ✨ Fully Paid
                              </Badge>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            </div>
          </div>
        </Card>

        {/* Current Standing Summary */}
        <Card>
          <button
            onClick={() => setIsCurrentStandingExpanded(!isCurrentStandingExpanded)}
            className="w-full p-4 sm:p-5 lg:p-4 border-b-2 border-indigo-200 text-left hover:bg-indigo-50/30 transition-colors duration-200 group"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl lg:text-lg font-semibold text-indigo-900 group-hover:text-indigo-700 transition-colors">
                  Current Standing
                </h2>
                <p className="text-xs sm:text-sm text-indigo-600 font-light mt-1">
                  ₱{totalMemberEquity.toLocaleString()} equity • {memberLoans.length} loans
                </p>
              </div>
              <div className="flex-shrink-0">
                <svg
                  className={`w-5 h-5 text-indigo-600 transition-transform duration-200 ${
                    isCurrentStandingExpanded ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </button>
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              isCurrentStandingExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="p-4 sm:p-5 lg:p-4">
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 lg:gap-3">
              <div className="p-3 lg:p-3 bg-indigo-50 border-2 border-indigo-200 rounded-lg">
                <p className="text-xs uppercase tracking-wider text-indigo-600 font-normal mb-1">
                  Total Contributed
                </p>
                <p className="text-sm sm:text-base font-semibold text-indigo-900 break-all">
                  ₱{totalContributions.toLocaleString()}
                </p>
              </div>

              <div className="p-3 lg:p-3 bg-purple-50 border-2 border-purple-200 rounded-lg">
                <p className="text-xs uppercase tracking-wider text-purple-600 font-normal mb-1">
                  Total Dividends
                </p>
                <p className="text-sm sm:text-base font-semibold text-purple-900 break-all">
                  ₱{totalDividendsReceived.toLocaleString()}
                </p>
              </div>

              <div className="p-3 lg:p-3 bg-emerald-50 border-2 border-emerald-200 rounded-lg">
                <p className="text-xs uppercase tracking-wider text-emerald-600 font-normal mb-1">
                  Total Member Equity
                </p>
                <p className="text-sm sm:text-base font-semibold text-emerald-900 break-all">
                  ₱{totalMemberEquity.toLocaleString()}
                </p>
              </div>

              <div className="p-3 lg:p-3 bg-amber-50 border-2 border-amber-200 rounded-lg">
                <p className="text-xs uppercase tracking-wider text-amber-600 font-normal mb-1">
                  Total Borrowed
                </p>
                <p className="text-sm sm:text-base font-semibold text-amber-900 break-all">
                  ₱{loanTotals.totalBorrowed.toLocaleString()}
                </p>
              </div>

              <div className="p-3 lg:p-3 bg-emerald-50 border-2 border-emerald-200 rounded-lg">
                <p className="text-xs uppercase tracking-wider text-emerald-600 font-normal mb-1">
                  Total Repaid
                </p>
                <p className="text-sm sm:text-base font-semibold text-emerald-900 break-all">
                  ₱{loanTotals.totalRepaid.toLocaleString()}
                </p>
              </div>

              <div className="p-3 lg:p-3 bg-rose-50 border-2 border-rose-200 rounded-lg">
                <p className="text-xs uppercase tracking-wider text-rose-600 font-normal mb-1">
                  Outstanding Balance
                </p>
                <p className="text-sm sm:text-base font-semibold text-rose-900 break-all">
                  ₱{loanTotals.totalOutstanding.toLocaleString()}
                </p>
              </div>
            </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default function Page() {
  return (
    <ProtectedRoute>
      <MemberDetailPage />
    </ProtectedRoute>
  );
}
