"use client";

import { useCoop } from "@/context/CoopContext";
import { format } from "date-fns";
import { useState } from "react";
import clsx from "clsx";
import ProtectedRoute from "@/components/ProtectedRoute";

function LoansPage() {
  const { state, dispatch } = useCoop();
  const selectedPeriod = state.selectedPeriod;
  const [repaymentInputs, setRepaymentInputs] = useState<
    Record<string, string>
  >({});

  // Loan CRUD states
  const [showCreateLoan, setShowCreateLoan] = useState<boolean>(false);
  const [newLoan, setNewLoan] = useState({
    memberId: "",
    amount: "",
    repaymentPlan: "CUT_OFF" as "MONTHLY" | "CUT_OFF",
    termCount: "5",
  });

  // Loan CRUD functions
  const createLoan = () => {
    if (!newLoan.memberId || !newLoan.amount) return;
    const rate = newLoan.repaymentPlan === "MONTHLY" ? 0.04 : 0.03;

    dispatch({
      type: "ADD_LOAN",
      payload: {
        id: `${Date.now()}-${newLoan.memberId}`,
        memberId: parseInt(newLoan.memberId),
        amount: parseFloat(newLoan.amount),
        dateIssued: new Date().toISOString(),
        status: "PENDING",
        repaymentPlan: newLoan.repaymentPlan,
        interestRate: rate,
        termCount: parseInt(newLoan.termCount) || undefined,
      },
    });

    setNewLoan({
      memberId: "",
      amount: "",
      repaymentPlan: "CUT_OFF",
      termCount: "5",
    });
    setShowCreateLoan(false);
  };

  const deleteLoan = (
    loanId: string,
    memberName: string,
    amount: number,
    status: string
  ) => {
    const message =
      status === "REJECTED"
        ? `Remove rejected loan request of ₱${amount.toLocaleString()} for ${memberName}?`
        : `Are you sure you want to delete the loan of ₱${amount.toLocaleString()} for ${memberName}? This will also remove all related repayments and penalties.`;

    const confirmDelete = confirm(message);
    if (confirmDelete) {
      dispatch({
        type: "DELETE_LOAN",
        payload: { loanId },
      });
    }
  };

  return (
    <main className="container mx-auto max-w-7xl px-4 py-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          Loans Management
        </h1>
        <p className="text-gray-600 text-sm md:text-base">
          Create, approve, and manage loan repayments.
        </p>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
        <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-4">
          Select Period (for repayments)
        </h2>
        <select
          className="w-full p-2 md:p-3 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm md:text-base"
          value={selectedPeriod}
          onChange={(e) =>
            dispatch({
              type: "SET_SELECTED_PERIOD",
              payload: { periodId: e.target.value },
            })
          }
        >
          <option value="">Select Period</option>
          {state.collections.map((p) => (
            <option key={p.id} value={p.id}>
              {format(new Date(p.date), "MMM d, yyyy")} — Collected ₱
              {p.totalCollected.toLocaleString()}
            </option>
          ))}
        </select>
      </div>

      {/* Loan Management Section */}
      <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg md:text-xl font-semibold text-gray-900">
            Create New Loan
          </h2>
          <button
            onClick={() => setShowCreateLoan(!showCreateLoan)}
            className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
          >
            {showCreateLoan ? "Cancel" : "+ Create Loan"}
          </button>
        </div>

        {showCreateLoan && (
          <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-700">
                <strong>💡 Loan Types:</strong>
                <br />• <strong>One-time payment:</strong> Borrower pays the
                full amount + interest after the term period
                <br />• <strong>Per cut-off installments:</strong> Borrower pays
                in installments every cut-off (twice per month)
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Member
                </label>
                <select
                  value={newLoan.memberId}
                  onChange={(e) =>
                    setNewLoan({ ...newLoan, memberId: e.target.value })
                  }
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Select Member</option>
                  {state.members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newLoan.amount}
                  onChange={(e) =>
                    setNewLoan({ ...newLoan, amount: e.target.value })
                  }
                  placeholder="Loan amount"
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Repayment Plan
                </label>
                <select
                  value={newLoan.repaymentPlan}
                  onChange={(e) =>
                    setNewLoan({
                      ...newLoan,
                      repaymentPlan: e.target.value as "CUT_OFF" | "MONTHLY",
                    })
                  }
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="CUT_OFF">
                    Per Cut-off installments (3% per month)
                  </option>
                  <option value="MONTHLY">
                    One-time payment (4% per month)
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Term (Months)
                </label>
                <input
                  type="number"
                  min="1"
                  value={newLoan.termCount}
                  onChange={(e) =>
                    setNewLoan({ ...newLoan, termCount: e.target.value })
                  }
                  title={
                    newLoan.repaymentPlan === "MONTHLY"
                      ? "Number of months before full payment is due"
                      : "Number of months to pay (2 cut-offs per month)"
                  }
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={createLoan}
                disabled={!newLoan.memberId || !newLoan.amount}
                className="px-6 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Create Loan
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-4">
          Active Loans
        </h2>
        {state.loans.filter((l) => l.status === "PENDING").length > 0 && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
            <p className="text-sm text-amber-700">
              <strong>💡 Tip:</strong> Pending loans need approval before
              repayments can be added. Use the Approve/Reject buttons on the
              right to change loan status.
            </p>
          </div>
        )}
        {state.loans.filter((l) => l.status === "REJECTED").length > 0 && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">
              <strong>🗑️ Clean up:</strong> You have{" "}
              {state.loans.filter((l) => l.status === "REJECTED").length}{" "}
              rejected loan
              {state.loans.filter((l) => l.status === "REJECTED").length > 1
                ? "s"
                : ""}
              . Click the &ldquo;🗑️ Remove&rdquo; button to delete rejected loan
              requests.
            </p>
          </div>
        )}
        {state.loans.length === 0 ? (
          <p className="text-gray-500">No active loans</p>
        ) : (
          <div className="space-y-4">
            {state.loans.map((loan) => {
              const member = state.members.find((m) => m.id === loan.memberId);
              const reps = state.repayments.filter((r) => r.loanId === loan.id);
              const repaid = reps.reduce((s, r) => s + (r.amount || 0), 0);
              const rate =
                loan.interestRate ??
                (loan.repaymentPlan === "MONTHLY"
                  ? 0.04
                  : loan.repaymentPlan === "CUT_OFF"
                  ? 0.03
                  : 0);
              const months = loan.termCount ?? 0;
              const totalDue = (loan.amount || 0) * (1 + rate * months);
              const remaining = Math.max(totalDue - repaid, 0);

              // For one-time loans (MONTHLY), there are no installments - pay entire amount after term
              // For per cut-off loans (CUT_OFF), divide into installments over the term period
              const periodsCount = loan.termCount
                ? loan.repaymentPlan === "CUT_OFF"
                  ? loan.termCount * 2 // Cut-off periods (2 per month)
                  : 1 // One-time payment after full term
                : undefined;

              const installment =
                loan.repaymentPlan === "MONTHLY"
                  ? totalDue // One-time: pay entire amount at once
                  : periodsCount
                  ? totalDue / periodsCount // Per cut-off: divide into installments
                  : undefined;

              const periodsPaid =
                loan.repaymentPlan === "MONTHLY"
                  ? repaid >= totalDue
                    ? 1
                    : 0 // One-time: either paid in full or not
                  : periodsCount && installment
                  ? Math.floor(repaid / installment)
                  : undefined;

              const periodsLeft =
                loan.repaymentPlan === "MONTHLY"
                  ? repaid >= totalDue
                    ? 0
                    : 1 // One-time: either 0 or 1 payment left
                  : periodsCount && periodsPaid !== undefined
                  ? Math.max(periodsCount - periodsPaid, 0)
                  : undefined;
              return (
                <div
                  key={loan.id}
                  className="flex items-start justify-between border-b pb-3"
                >
                  <div>
                    <p className="font-medium">{member?.name}</p>
                    <p className="text-sm text-gray-600">
                      Amount: ₱{loan.amount.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-600">
                      Plan:{" "}
                      {loan.repaymentPlan === "MONTHLY"
                        ? "One-time payment (4% per month)"
                        : loan.repaymentPlan === "CUT_OFF"
                        ? "Per Cut-off installments (3% per month)"
                        : "—"}
                    </p>
                    {loan.termCount && (
                      <p className="text-xs text-gray-600">
                        {loan.repaymentPlan === "MONTHLY"
                          ? `Term: ${loan.termCount} month${
                              loan.termCount > 1 ? "s" : ""
                            } (pay full amount after term)`
                          : `Terms: ${loan.termCount} month${
                              loan.termCount > 1 ? "s" : ""
                            } (${loan.termCount * 2} cut-off payments)`}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      Issued: {format(new Date(loan.dateIssued), "MMM d, yyyy")}
                    </p>
                    {loan.dateApproved && (
                      <p className="text-xs text-gray-500">
                        Approved:{" "}
                        {format(new Date(loan.dateApproved), "MMM d, yyyy")}
                      </p>
                    )}
                    <div className="text-sm text-gray-600 mt-1 space-y-1">
                      <p>
                        Total Due: ₱{totalDue.toLocaleString()} • Repaid: ₱
                        {repaid.toLocaleString()} • Remaining: ₱
                        {remaining.toLocaleString()}
                      </p>
                      {loan.repaymentPlan === "MONTHLY" ? (
                        /* One-time payment: Show total amount and due date */
                        <p>
                          <strong>
                            Payment due after {loan.termCount} month
                            {(loan.termCount ?? 0) > 1 ? "s" : ""}:
                          </strong>{" "}
                          ₱{totalDue.toFixed(2)}
                          {periodsLeft !== undefined
                            ? ` • ${
                                periodsLeft > 0
                                  ? "Payment pending"
                                  : "Fully paid"
                              }`
                            : ""}
                        </p>
                      ) : (
                        /* Per cut-off installments: Show installment details */
                        installment && (
                          <p>
                            Installment: ₱{installment.toFixed(2)} per cut-off
                            {periodsLeft !== undefined
                              ? ` • Payments left: ${periodsLeft}`
                              : ""}
                          </p>
                        )
                      )}
                    </div>
                    {reps.length > 0 && (
                      <div className="mt-2 text-xs text-gray-600 space-y-1">
                        {reps
                          .slice()
                          .sort(
                            (a, b) =>
                              new Date(b.date).getTime() -
                              new Date(a.date).getTime()
                          )
                          .map((r) => (
                            <div
                              key={r.id}
                              className="flex items-center justify-between"
                            >
                              <span>
                                ₱{r.amount.toLocaleString()} on{" "}
                                {format(new Date(r.date), "MMM d, yyyy")} (
                                {r.periodId})
                              </span>
                              <button
                                onClick={() =>
                                  dispatch({
                                    type: "REMOVE_REPAYMENT",
                                    payload: { repaymentId: r.id },
                                  })
                                }
                                className="ml-2 text-red-600 hover:text-red-500"
                                title="Remove repayment"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={clsx(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          {
                            "bg-yellow-100 text-yellow-800":
                              loan.status === "PENDING",
                            "bg-green-100 text-green-800":
                              loan.status === "APPROVED",
                            "bg-red-100 text-red-800":
                              loan.status === "REJECTED",
                            "bg-blue-100 text-blue-800": loan.status === "PAID",
                          }
                        )}
                      >
                        {loan.status}
                      </span>

                      {/* Delete loan button - more prominent for rejected loans */}
                      <button
                        onClick={() =>
                          deleteLoan(
                            loan.id,
                            member?.name || "Unknown",
                            loan.amount,
                            loan.status
                          )
                        }
                        className={clsx(
                          "px-2 py-1 text-xs rounded hover:bg-red-200 focus:outline-none",
                          loan.status === "REJECTED"
                            ? "bg-red-200 text-red-800 font-medium" // More prominent for rejected loans
                            : "bg-red-100 text-red-700"
                        )}
                        title={
                          loan.status === "REJECTED"
                            ? "Delete rejected loan request"
                            : "Delete this loan and all related data"
                        }
                      >
                        🗑️ {loan.status === "REJECTED" ? "Remove" : ""}
                      </button>
                    </div>

                    {/* Approval buttons for pending loans */}
                    {loan.status === "PENDING" && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const confirmApprove = confirm(
                              `Approve loan of ₱${loan.amount.toLocaleString()} for ${
                                member?.name
                              }?`
                            );
                            if (confirmApprove) {
                              dispatch({
                                type: "UPDATE_LOAN_STATUS",
                                payload: {
                                  loanId: loan.id,
                                  status: "APPROVED" as const,
                                  dateApproved: new Date().toISOString(),
                                  disbursementPeriodId:
                                    selectedPeriod || undefined,
                                },
                              });
                            }
                          }}
                          className="text-xs px-3 py-1 rounded-md bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
                          title="Approve this loan"
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={() => {
                            const confirmReject = confirm(
                              `Reject loan of ₱${loan.amount.toLocaleString()} for ${
                                member?.name
                              }?`
                            );
                            if (confirmReject) {
                              dispatch({
                                type: "UPDATE_LOAN_STATUS",
                                payload: {
                                  loanId: loan.id,
                                  status: "REJECTED" as const,
                                },
                              });
                            }
                          }}
                          className="text-xs px-3 py-1 rounded-md bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                          title="Reject this loan"
                        >
                          ✕ Reject
                        </button>
                      </div>
                    )}

                    {/* Repayment section for approved loans */}
                    {(loan.status === "APPROVED" || loan.status === "PAID") && (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          placeholder="Repayment"
                          className="w-28 p-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          value={repaymentInputs[loan.id] ?? ""}
                          onChange={(e) =>
                            setRepaymentInputs((prev) => ({
                              ...prev,
                              [loan.id]: e.target.value,
                            }))
                          }
                        />
                        <button
                          onClick={() => {
                            const raw = repaymentInputs[loan.id];
                            const amt =
                              raw === undefined || raw === ""
                                ? NaN
                                : parseFloat(raw);
                            if (!selectedPeriod || !isFinite(amt) || amt <= 0)
                              return;
                            dispatch({
                              type: "ADD_REPAYMENT",
                              payload: {
                                id: `${loan.id}-${Date.now()}`,
                                loanId: loan.id,
                                memberId: loan.memberId,
                                amount: amt,
                                date: new Date().toISOString(),
                                periodId: selectedPeriod,
                              },
                            });
                            setRepaymentInputs((prev) => ({
                              ...prev,
                              [loan.id]: "",
                            }));
                          }}
                          disabled={!selectedPeriod}
                          className="text-xs px-2 py-1 rounded-md bg-indigo-600 text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          Add Repayment
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

export default function Loans() {
  return (
    <ProtectedRoute>
      <LoansPage />
    </ProtectedRoute>
  );
}
