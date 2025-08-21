"use client";

import { useCoop } from "@/context/CoopContext";
import { format } from "date-fns";
import { useState } from "react";
import clsx from "clsx";
import ProtectedRoute from "@/components/ProtectedRoute";

function LoansPage() {
  const { state, dispatch } = useCoop();
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [repaymentInputs, setRepaymentInputs] = useState<
    Record<string, string>
  >({});

  return (
    <main className="container mx-auto max-w-6xl p-6">
      <h1 className="text-3xl font-bold mb-2 text-gray-900">Loans</h1>
      <p className="text-gray-600 mb-6">
        Create, approve, and manage repayments.
      </p>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Select Period (for repayments)
        </h2>
        <select
          className="w-full p-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
        >
          <option value="">Select Period</option>
          {state.collections.map((p) => (
            <option key={p.id} value={p.id}>
              {format(new Date(p.date), "MMMM d, yyyy")} — Collected ₱
              {p.totalCollected.toLocaleString()}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Active Loans
        </h2>
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
              const periodsCount = loan.termCount
                ? loan.repaymentPlan === "CUT_OFF"
                  ? loan.termCount * 2
                  : loan.termCount
                : undefined;
              const installment = periodsCount
                ? totalDue / periodsCount
                : undefined;
              const periodsPaid =
                periodsCount && installment
                  ? Math.floor(repaid / installment)
                  : undefined;
              const periodsLeft =
                periodsCount && periodsPaid !== undefined
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
                        ? "One-time (4%)"
                        : loan.repaymentPlan === "CUT_OFF"
                        ? "Per Cut-off (3%)"
                        : "—"}
                    </p>
                    {loan.termCount && (
                      <p className="text-xs text-gray-600">
                        Terms: {loan.termCount} month(s)
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
                      {installment && (
                        <p>
                          Installment: ₱{installment.toFixed(2)}{" "}
                          {loan.repaymentPlan === "MONTHLY"
                            ? "/ one-time"
                            : "/ cut-off"}{" "}
                          {periodsLeft !== undefined
                            ? ` • Payments left: ${periodsLeft}`
                            : ""}
                        </p>
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
                    <span
                      className={clsx(
                        "px-2 py-1 rounded-full text-xs font-medium",
                        {
                          "bg-yellow-100 text-yellow-800":
                            loan.status === "PENDING",
                          "bg-green-100 text-green-800":
                            loan.status === "APPROVED",
                          "bg-red-100 text-red-800": loan.status === "REJECTED",
                          "bg-blue-100 text-blue-800": loan.status === "PAID",
                        }
                      )}
                    >
                      {loan.status}
                    </span>
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
