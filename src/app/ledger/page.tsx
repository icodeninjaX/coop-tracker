"use client";

import { useCoop } from "@/context/CoopContext";
import { useMemo } from "react";
import { format } from "date-fns";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Card, EmptyState } from "@/components/UI";

interface PeriodLedgerEntry {
  periodId: string;
  periodDate: string;
  openingBalance: number;
  collections: number;
  disbursements: number;
  repayments: number;
  penalties: number;
  closingBalance: number;
}

const LedgerPage = () => {
  const { state } = useCoop();

  // Calculate period-by-period ledger
  const ledgerEntries = useMemo((): PeriodLedgerEntry[] => {
    if (!state) return [];

    const entries: PeriodLedgerEntry[] = [];
    let runningBalance = state.beginningBalance;

    // Sort periods by date
    const sortedPeriods = [...state.collections].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    sortedPeriods.forEach((period) => {
      // Opening balance is the running balance
      const openingBalance = runningBalance;

      // Collections for this period
      const collections = period.totalCollected;

      // Disbursements: loans disbursed in this period
      const disbursements = (state.loans || [])
        .filter(
          (loan) =>
            loan.disbursementPeriodId === period.id &&
            (loan.status === "APPROVED" || loan.status === "PAID")
        )
        .reduce((sum, loan) => sum + loan.amount, 0);

      // Repayments received in this period
      const repayments = (state.repayments || [])
        .filter((r) => r.periodId === period.id)
        .reduce((sum, r) => sum + r.amount, 0);

      // Penalties assessed in this period
      const penalties = (state.penalties || [])
        .filter((p) => p.periodId === period.id)
        .reduce((sum, p) => sum + p.amount, 0);

      // Closing balance
      const closingBalance =
        openingBalance + collections + repayments - disbursements;

      entries.push({
        periodId: period.id,
        periodDate: period.date,
        openingBalance,
        collections,
        disbursements,
        repayments,
        penalties,
        closingBalance,
      });

      // Update running balance for next period
      runningBalance = closingBalance;
    });

    return entries;
  }, [state]);

  // Calculate totals
  const totals = useMemo(() => {
    return ledgerEntries.reduce(
      (acc, entry) => ({
        collections: acc.collections + entry.collections,
        disbursements: acc.disbursements + entry.disbursements,
        repayments: acc.repayments + entry.repayments,
        penalties: acc.penalties + entry.penalties,
      }),
      { collections: 0, disbursements: 0, repayments: 0, penalties: 0 }
    );
  }, [ledgerEntries]);

  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-indigo-600 font-light">Loading ledger data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="container mx-auto max-w-7xl px-3 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-indigo-900 tracking-tight mb-1 sm:mb-2">
            Period Ledger
          </h1>
          <p className="text-xs sm:text-sm lg:text-base text-indigo-600 font-light">
            Comprehensive financial statement showing period-by-period breakdown
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8">
          <div className="bg-white/80 backdrop-blur-sm border-2 border-indigo-200 rounded-xl p-3 sm:p-4 lg:p-6 transition-all duration-200 hover:shadow-md hover:border-indigo-300">
            <p className="text-xs uppercase tracking-wider text-indigo-600 font-normal mb-1 sm:mb-2">
              Beginning Balance
            </p>
            <p className="text-base sm:text-xl lg:text-2xl xl:text-3xl font-semibold text-indigo-900 break-all">
              ₱{state.beginningBalance.toLocaleString()}
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm border-2 border-emerald-200 rounded-xl p-3 sm:p-4 lg:p-6 transition-all duration-200 hover:shadow-md hover:border-emerald-300">
            <p className="text-xs uppercase tracking-wider text-emerald-600 font-normal mb-1 sm:mb-2">
              Total Collections
            </p>
            <p className="text-base sm:text-xl lg:text-2xl xl:text-3xl font-semibold text-emerald-900 break-all">
              ₱{totals.collections.toLocaleString()}
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm border-2 border-rose-200 rounded-xl p-3 sm:p-4 lg:p-6 transition-all duration-200 hover:shadow-md hover:border-rose-300">
            <p className="text-xs uppercase tracking-wider text-rose-600 font-normal mb-1 sm:mb-2">
              Total Disbursed
            </p>
            <p className="text-base sm:text-xl lg:text-2xl xl:text-3xl font-semibold text-rose-900 break-all">
              ₱{totals.disbursements.toLocaleString()}
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm border-2 border-purple-200 rounded-xl p-3 sm:p-4 lg:p-6 transition-all duration-200 hover:shadow-md hover:border-purple-300">
            <p className="text-xs uppercase tracking-wider text-purple-600 font-normal mb-1 sm:mb-2">
              Current Balance
            </p>
            <p className="text-base sm:text-xl lg:text-2xl xl:text-3xl font-semibold text-purple-900 break-all">
              ₱{state.currentBalance.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Ledger Table */}
        <Card className="overflow-hidden shadow-sm">
          <div className="p-4 sm:p-6 border-b-2 border-indigo-200">
            <h2 className="text-lg sm:text-xl font-semibold text-indigo-900">
              Period-by-Period Breakdown
            </h2>
            <p className="text-sm text-indigo-600 font-light mt-1">
              Detailed financial activity for each collection period
            </p>
          </div>

          {ledgerEntries.length === 0 ? (
            <div className="p-12">
              <EmptyState
                title="No Ledger Data"
                description="No collection periods recorded yet. Create a collection period to start tracking financial activity."
              />
            </div>
          ) : (
            <>
              {/* Desktop: Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-indigo-50 border-b-2 border-indigo-200">
                      <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-indigo-700 font-semibold">
                        Period
                      </th>
                      <th className="text-right py-3 px-4 text-xs uppercase tracking-wider text-indigo-700 font-semibold">
                        Opening
                      </th>
                      <th className="text-right py-3 px-4 text-xs uppercase tracking-wider text-emerald-700 font-semibold">
                        Collections
                      </th>
                      <th className="text-right py-3 px-4 text-xs uppercase tracking-wider text-rose-700 font-semibold">
                        Disbursements
                      </th>
                      <th className="text-right py-3 px-4 text-xs uppercase tracking-wider text-purple-700 font-semibold">
                        Repayments
                      </th>
                      <th className="text-right py-3 px-4 text-xs uppercase tracking-wider text-indigo-700 font-semibold">
                        Closing
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-indigo-100">
                    {ledgerEntries.map((entry) => (
                      <tr
                        key={entry.periodId}
                        className="hover:bg-indigo-50/30 transition-colors"
                      >
                        <td className="py-3 px-4 text-indigo-900 font-normal">
                          {format(new Date(entry.periodDate), "MMM d, yyyy")}
                        </td>
                        <td className="py-3 px-4 text-right text-indigo-900 font-light">
                          ₱{entry.openingBalance.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-emerald-700 font-semibold">
                          +₱{entry.collections.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-rose-700 font-semibold">
                          -₱{entry.disbursements.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-purple-700 font-semibold">
                          +₱{entry.repayments.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-indigo-900 font-semibold">
                          ₱{entry.closingBalance.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-indigo-50 border-t-2 border-indigo-200 font-semibold">
                      <td className="py-3 px-4 text-indigo-900">TOTALS</td>
                      <td className="py-3 px-4 text-right text-indigo-900">
                        ₱{state.beginningBalance.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-700">
                        +₱{totals.collections.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right text-rose-700">
                        -₱{totals.disbursements.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right text-purple-700">
                        +₱{totals.repayments.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right text-indigo-900">
                        ₱{state.currentBalance.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Mobile & Tablet: Card View */}
              <div className="lg:hidden p-3 sm:p-4 space-y-3 sm:space-y-4">
                {ledgerEntries.map((entry) => (
                  <div
                    key={entry.periodId}
                    className="border-2 border-indigo-200 rounded-xl p-3 sm:p-4 bg-white/80 backdrop-blur-sm hover:shadow-md transition-all"
                  >
                    <div className="mb-2 sm:mb-3 pb-2 sm:pb-3 border-b-2 border-indigo-100">
                      <h3 className="text-sm sm:text-base font-semibold text-indigo-900">
                        {format(new Date(entry.periodDate), "MMMM d, yyyy")}
                      </h3>
                    </div>

                    <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                      <div className="flex justify-between">
                        <span className="text-indigo-600 font-light">
                          Opening Balance:
                        </span>
                        <span className="text-indigo-900 font-normal">
                          ₱{entry.openingBalance.toLocaleString()}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-emerald-600 font-light">
                          Collections:
                        </span>
                        <span className="text-emerald-700 font-semibold">
                          +₱{entry.collections.toLocaleString()}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-rose-600 font-light">
                          Disbursements:
                        </span>
                        <span className="text-rose-700 font-semibold">
                          -₱{entry.disbursements.toLocaleString()}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-purple-600 font-light">
                          Repayments:
                        </span>
                        <span className="text-purple-700 font-semibold">
                          +₱{entry.repayments.toLocaleString()}
                        </span>
                      </div>

                      <div className="pt-2 mt-2 border-t-2 border-indigo-100 flex justify-between">
                        <span className="text-indigo-900 font-semibold">
                          Closing Balance:
                        </span>
                        <span className="text-indigo-900 font-semibold text-lg">
                          ₱{entry.closingBalance.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Mobile Totals Card */}
                <div className="border-2 border-indigo-300 rounded-xl p-4 bg-gradient-to-r from-indigo-50 to-purple-50">
                  <h3 className="text-base font-semibold text-indigo-900 mb-3 uppercase tracking-wider">
                    Summary Totals
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-indigo-600 font-light">
                        Total Collections:
                      </span>
                      <span className="text-emerald-700 font-semibold">
                        ₱{totals.collections.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-indigo-600 font-light">
                        Total Disbursed:
                      </span>
                      <span className="text-rose-700 font-semibold">
                        ₱{totals.disbursements.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-indigo-600 font-light">
                        Total Repayments:
                      </span>
                      <span className="text-purple-700 font-semibold">
                        ₱{totals.repayments.toLocaleString()}
                      </span>
                    </div>
                    <div className="pt-2 mt-2 border-t-2 border-indigo-200 flex justify-between">
                      <span className="text-indigo-900 font-semibold">
                        Current Balance:
                      </span>
                      <span className="text-indigo-900 font-semibold text-lg">
                        ₱{state.currentBalance.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </Card>

        {/* Calculation Explanation */}
        <Card className="mt-6 lg:mt-8">
          <div className="p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-indigo-900 mb-3">
              How Balances are Calculated
            </h3>
            <div className="space-y-2 text-sm text-indigo-700 font-light">
              <p>
                <span className="font-semibold text-indigo-900">Opening Balance:</span>{" "}
                Closing balance from the previous period (or beginning balance for
                the first period)
              </p>
              <p>
                <span className="font-semibold text-emerald-700">Collections:</span>{" "}
                Total member contributions received during this period
              </p>
              <p>
                <span className="font-semibold text-rose-700">Disbursements:</span>{" "}
                Loans approved and disbursed to members during this period
              </p>
              <p>
                <span className="font-semibold text-purple-700">Repayments:</span>{" "}
                Loan repayments received from members during this period
              </p>
              <p>
                <span className="font-semibold text-indigo-900">Closing Balance:</span>{" "}
                Opening + Collections + Repayments - Disbursements
              </p>
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
      <LedgerPage />
    </ProtectedRoute>
  );
}
