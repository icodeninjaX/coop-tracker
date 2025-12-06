"use client";

import { Loan, Repayment } from "@/types";
import { format, isBefore, startOfDay } from "date-fns";
import { Badge } from "./UI";
import { useState } from "react";

// Helper functions (same as CoopContext)
function nextCutoffOnOrAfter(base: Date): Date {
  const d = new Date(base);
  const day = d.getDate();
  if (day <= 10) {
    d.setDate(10);
  } else if (day <= 25) {
    d.setDate(25);
  } else {
    d.setMonth(d.getMonth() + 1);
    d.setDate(10);
  }
  d.setHours(12, 0, 0, 0);
  return d;
}

function generateCutoffSchedule(start: Date, count: number): Date[] {
  const dates: Date[] = [];
  let current = nextCutoffOnOrAfter(start);
  for (let i = 0; i < count; i++) {
    dates.push(new Date(current));
    const day = current.getDate();
    if (day === 10) {
      current = new Date(current);
      current.setDate(25);
    } else {
      current = new Date(current);
      current.setMonth(current.getMonth() + 1);
      current.setDate(10);
    }
    current.setHours(12, 0, 0, 0);
  }
  return dates;
}

function generateMonthlySchedule(start: Date, count: number): Date[] {
  const dates: Date[] = [];
  let current = new Date(start);
  current.setHours(12, 0, 0, 0);
  for (let i = 0; i < count; i++) {
    const d = new Date(current);
    d.setMonth(d.getMonth() + 1);
    const day = Math.min(
      current.getDate(),
      new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    );
    d.setDate(day);
    d.setHours(12, 0, 0, 0);
    dates.push(d);
    current = d;
  }
  return dates;
}

interface LoanScheduleProps {
  loan: Loan;
  repayments: Repayment[];
  compact?: boolean;
}

export default function LoanSchedule({ loan, repayments, compact = false }: LoanScheduleProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Only show schedule for approved loans with repayment plans
  if (loan.status !== "APPROVED" && loan.status !== "PAID") {
    return null;
  }

  if (!loan.repaymentPlan || !loan.dateApproved || !loan.termCount) {
    return null;
  }

  // Calculate total due and installment amount
  const interestRate = loan.interestRate || (loan.repaymentPlan === "MONTHLY" ? 0.04 : 0.03);
  const termCount = loan.termCount;
  const totalDue = loan.amount * (1 + interestRate * termCount);

  // Generate payment schedule
  const startDate = new Date(loan.dateApproved);
  let scheduleDates: Date[];
  let installmentAmount: number;

  if (loan.repaymentPlan === "MONTHLY") {
    // One-time payment after termCount months
    scheduleDates = generateMonthlySchedule(startDate, 1);
    installmentAmount = totalDue;
  } else {
    // CUT_OFF: bi-monthly payments
    const numInstallments = termCount * 2; // 2 cut-offs per month
    scheduleDates = generateCutoffSchedule(startDate, numInstallments);
    installmentAmount = totalDue / numInstallments;
  }

  // Calculate total repayments
  const totalRepaid = repayments
    .filter((r) => r.loanId === loan.id)
    .reduce((sum, r) => sum + r.amount, 0);

  // Determine payment status for each installment
  const today = startOfDay(new Date());
  const scheduleItems = scheduleDates.map((dueDate, index) => {
    const installmentNumber = index + 1;
    const cumulativeAmountDue = installmentAmount * installmentNumber;
    const isPaid = totalRepaid >= cumulativeAmountDue;
    const isOverdue = !isPaid && isBefore(dueDate, today);
    const isPending = !isPaid && !isOverdue;

    return {
      installmentNumber,
      dueDate,
      amount: installmentAmount,
      isPaid,
      isOverdue,
      isPending,
    };
  });

  // Summary stats
  const paidCount = scheduleItems.filter(i => i.isPaid).length;
  const overdueCount = scheduleItems.filter(i => i.isOverdue).length;
  const nextDue = scheduleItems.find(i => !i.isPaid);

  // Compact mode - collapsible
  if (compact) {
    return (
      <div className="border-t border-indigo-100 pt-3 mt-3">
        {/* Compact Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-indigo-900 uppercase tracking-wider">
              Schedule
            </span>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-emerald-600">{paidCount} paid</span>
              {overdueCount > 0 && (
                <span className="text-rose-600">{overdueCount} overdue</span>
              )}
              <span className="text-indigo-500">
                {scheduleItems.length - paidCount - overdueCount} upcoming
              </span>
            </div>
          </div>
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
        </button>

        {/* Next Due Quick View */}
        {!isExpanded && nextDue && (
          <div className="mt-2 flex items-center justify-between text-xs bg-indigo-50 rounded px-2 py-1.5">
            <span className="text-indigo-600">
              Next: {format(nextDue.dueDate, "MMM d")}
            </span>
            <span className="font-medium text-indigo-900">
              ₱{nextDue.amount.toFixed(0)}
            </span>
          </div>
        )}

        {/* Expanded Schedule */}
        {isExpanded && (
          <div className="mt-3 space-y-1.5 max-h-48 overflow-y-auto">
            {scheduleItems.map((item) => (
              <div
                key={item.installmentNumber}
                className={`flex items-center justify-between px-2 py-1.5 rounded text-xs ${
                  item.isPaid
                    ? "bg-emerald-50 text-emerald-700"
                    : item.isOverdue
                    ? "bg-rose-50 text-rose-700"
                    : "bg-white text-indigo-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 text-center font-medium">
                    {item.installmentNumber}
                  </span>
                  <span>{format(item.dueDate, "MMM d, yyyy")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">₱{item.amount.toFixed(0)}</span>
                  {item.isPaid && (
                    <span className="text-emerald-600">✓</span>
                  )}
                  {item.isOverdue && (
                    <span className="text-rose-600">!</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Full mode (original layout)
  return (
    <div className="mt-4 border-t-2 border-indigo-200 pt-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <h4 className="text-xs sm:text-sm font-semibold text-indigo-900 uppercase tracking-wider">
          Payment Schedule
        </h4>
        <span className="text-xs text-indigo-600 font-light">
          {loan.repaymentPlan === "MONTHLY" ? "One-time Payment" : `${scheduleDates.length} Installments`}
        </span>
      </div>

      {/* Desktop: Table View */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-indigo-200">
              <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-indigo-600 font-normal">
                #
              </th>
              <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-indigo-600 font-normal">
                Due Date
              </th>
              <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-indigo-600 font-normal">
                Amount
              </th>
              <th className="text-center py-2 px-3 text-xs uppercase tracking-wider text-indigo-600 font-normal">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-indigo-100">
            {scheduleItems.map((item) => (
              <tr
                key={item.installmentNumber}
                className={`${
                  item.isPaid
                    ? "bg-emerald-50/30"
                    : item.isOverdue
                    ? "bg-rose-50/30"
                    : "bg-white"
                }`}
              >
                <td className="py-2 px-3 text-indigo-900 font-normal">
                  {item.installmentNumber}
                </td>
                <td className="py-2 px-3 text-indigo-900 font-light">
                  {format(item.dueDate, "MMM d, yyyy")}
                </td>
                <td className="py-2 px-3 text-right text-indigo-900 font-normal">
                  ₱{item.amount.toFixed(2)}
                </td>
                <td className="py-2 px-3 text-center">
                  {item.isPaid && (
                    <Badge variant="success" className="text-xs">
                      Paid
                    </Badge>
                  )}
                  {item.isOverdue && (
                    <Badge variant="error" className="text-xs">
                      Overdue
                    </Badge>
                  )}
                  {item.isPending && (
                    <Badge variant="warning" className="text-xs">
                      Pending
                    </Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: Card View */}
      <div className="sm:hidden space-y-2">
        {scheduleItems.map((item) => (
          <div
            key={item.installmentNumber}
            className={`p-3 rounded-lg border-2 ${
              item.isPaid
                ? "border-emerald-200 bg-emerald-50/30"
                : item.isOverdue
                ? "border-rose-200 bg-rose-50/30"
                : "border-indigo-200 bg-white"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wider text-indigo-600 font-normal">
                Installment #{item.installmentNumber}
              </span>
              {item.isPaid && (
                <Badge variant="success" className="text-xs">
                  Paid
                </Badge>
              )}
              {item.isOverdue && (
                <Badge variant="error" className="text-xs">
                  Overdue
                </Badge>
              )}
              {item.isPending && (
                <Badge variant="warning" className="text-xs">
                  Pending
                </Badge>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-indigo-900 font-light">
                {format(item.dueDate, "MMM d, yyyy")}
              </span>
              <span className="text-sm text-indigo-900 font-semibold">
                ₱{item.amount.toFixed(2)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-4 p-3 bg-indigo-50 border-2 border-indigo-200 rounded-lg">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-xs text-indigo-600 font-light">Total Due:</span>
            <div className="font-semibold text-indigo-900">₱{totalDue.toFixed(2)}</div>
          </div>
          <div>
            <span className="text-xs text-indigo-600 font-light">Installment:</span>
            <div className="font-semibold text-indigo-900">
              ₱{installmentAmount.toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
