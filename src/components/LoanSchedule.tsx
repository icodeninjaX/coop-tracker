"use client";

import { Loan, Repayment } from "@/types";
import { format, isBefore, startOfDay } from "date-fns";
import { Badge } from "./UI";

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
}

export default function LoanSchedule({ loan, repayments }: LoanScheduleProps) {
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

  return (
    <div className="mt-4 border-t-2 border-indigo-200 pt-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-indigo-900 uppercase tracking-wider">
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
