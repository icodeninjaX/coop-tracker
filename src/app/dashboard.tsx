"use client";

import { format } from "date-fns";
import { useCoop } from "@/context/CoopContext";
import { useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  Button,
  Input,
  Select,
  Badge,
  Modal,
} from "@/components/UI";

function DashboardContent() {
  const { state, dispatch } = useCoop();
  const selectedPeriod = state.selectedPeriod;
  const [newLoanMemberId, setNewLoanMemberId] = useState<string>("");
  const [newLoanAmount, setNewLoanAmount] = useState<string>("");
  const [newLoanPlan, setNewLoanPlan] = useState<"MONTHLY" | "CUT_OFF">(
    "CUT_OFF"
  );
  const [newLoanTerms, setNewLoanTerms] = useState<string>("5");
  const [newPeriodDate, setNewPeriodDate] = useState<string>("");
  // (Removed unused quick pay states)
  const [showNewLoanModal, setShowNewLoanModal] = useState(false);
  const [showNewPeriodModal, setShowNewPeriodModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [selectedYearToArchive, setSelectedYearToArchive] = useState<number | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);

  // Existing functions (simplified for brevity)
  // (Removed unused recordPayment helper)

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

  // Get available years that can be archived
  const getAvailableYears = () => {
    const years = new Set<number>();
    state.collections.forEach((c) => {
      years.add(new Date(c.date).getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a); // Newest first
  };

  // Handle archiving a year
  const handleArchiveYear = () => {
    if (selectedYearToArchive === null) return;

    dispatch({
      type: "ARCHIVE_YEAR",
      payload: { year: selectedYearToArchive },
    });

    setShowArchiveModal(false);
    setSelectedYearToArchive(null);
  };

  const openArchiveModal = (year: number) => {
    setSelectedYearToArchive(year);
    setShowArchiveModal(true);
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
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-7xl px-4 py-6">
        {/* Header + Actions - Single compact row */}
        <div className="flex items-center justify-between mb-6 bg-white border border-gray-200 rounded-lg px-6 py-4">
          <div>
            <h1 className="text-2xl font-medium text-gray-900 tracking-tight">
              Dashboard
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {format(new Date(), "MMMM d, yyyy")}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowNewPeriodModal(true)}
              className="px-4 py-2 bg-gray-900 text-white text-xs font-medium rounded hover:bg-gray-800 transition-colors"
            >
              New Period
            </button>
            <button
              onClick={() => setShowNewLoanModal(true)}
              className="px-4 py-2 border border-gray-300 text-gray-700 text-xs font-medium rounded hover:bg-gray-50 transition-colors"
            >
              New Loan
            </button>
            {state.collections.length > 0 && (
              <button
                onClick={() => setShowResetModal(true)}
                className="px-4 py-2 border border-red-300 text-red-600 text-xs font-medium rounded hover:bg-red-50 transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Stats Grid - 4 columns, compact */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-[10px] uppercase tracking-wide text-gray-500 font-medium mb-1">
              Total Balance
            </p>
            <p className="text-2xl font-semibold text-gray-900">
              ₱{totalBalance.toLocaleString()}
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-[10px] uppercase tracking-wide text-gray-500 font-medium mb-1">
              Members
            </p>
            <p className="text-2xl font-semibold text-gray-900">
              {totalMembers}
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-[10px] uppercase tracking-wide text-gray-500 font-medium mb-1">
              Active Loans
            </p>
            <p className="text-2xl font-semibold text-gray-900">
              {activeLoans}
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-[10px] uppercase tracking-wide text-gray-500 font-medium mb-1">
              Pending
            </p>
            <p className="text-2xl font-semibold text-gray-900">
              {pendingLoans}
            </p>
          </div>
        </div>

        {/* Collection Periods - Grid layout */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Collection Periods
            </h2>
          </div>
          {state.collections.length > 0 ? (
            <div className="grid grid-cols-4 gap-3">
              {state.collections.map((period) => (
                <button
                  key={period.id}
                  onClick={() =>
                    dispatch({
                      type: "SET_SELECTED_PERIOD",
                      payload: { periodId: period.id },
                    })
                  }
                  className={`p-4 rounded-lg border text-left transition-colors ${
                    selectedPeriod === period.id
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <p className={`text-[10px] uppercase tracking-wide font-medium mb-2 ${
                    selectedPeriod === period.id ? "text-gray-300" : "text-gray-500"
                  }`}>
                    {format(new Date(period.date), "MMM d, yyyy")}
                  </p>
                  <p className={`text-xl font-semibold mb-1 ${
                    selectedPeriod === period.id ? "text-white" : "text-gray-900"
                  }`}>
                    ₱{period.totalCollected.toLocaleString()}
                  </p>
                  <p className={`text-[10px] ${
                    selectedPeriod === period.id ? "text-gray-400" : "text-gray-500"
                  }`}>
                    {period.payments.length} payments
                  </p>
                </button>
              ))}

              <button
                onClick={addNextCollectionPeriod}
                className="p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-colors flex flex-col items-center justify-center min-h-[112px]"
              >
                <span className="text-2xl text-gray-400 mb-1">+</span>
                <span className="text-xs text-gray-500 font-medium">Add Period</span>
              </button>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
              <p className="text-sm text-gray-500 mb-4">No periods yet</p>
              <button
                onClick={addNextCollectionPeriod}
                className="px-4 py-2 bg-gray-900 text-white text-xs font-medium rounded hover:bg-gray-800 transition-colors"
              >
                Create First Period
              </button>
            </div>
          )}
        </div>

        {/* Year Management */}
        {getAvailableYears().length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                Years
              </h2>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {getAvailableYears().map((year) => (
                <div
                  key={year}
                  className="bg-white border border-gray-200 rounded-lg p-4"
                >
                  <p className="text-[10px] uppercase tracking-wide text-gray-500 font-medium mb-1">
                    Year {year}
                  </p>
                  <p className="text-xl font-semibold text-gray-900 mb-3">
                    {state.collections.filter(
                      (c) => new Date(c.date).getFullYear() === year
                    ).length} periods
                  </p>
                  <button
                    onClick={() => openArchiveModal(year)}
                    className="px-3 py-1.5 border border-gray-300 text-gray-600 text-[10px] font-medium rounded hover:bg-gray-50 transition-colors w-full"
                  >
                    Archive
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Archived Years */}
        {state.archives.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                Archives
              </h2>
            </div>
            <div className="space-y-3">
              {state.archives
                .sort((a, b) => b.year - a.year)
                .map((archive) => (
                  <div
                    key={archive.year}
                    className="bg-white border border-gray-200 rounded-lg p-5"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">
                          Year {archive.year}
                        </h3>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          Archived {format(new Date(archive.archivedDate), "MMM d, yyyy")}
                        </p>
                      </div>
                      <Badge variant="neutral" className="text-[10px]">
                        Archived
                      </Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      <div className="bg-gray-50 border border-gray-100 rounded p-3">
                        <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">Collected</p>
                        <p className="text-base font-semibold text-gray-900">
                          ₱{archive.summary.totalCollected.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-gray-50 border border-gray-100 rounded p-3">
                        <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">Disbursed</p>
                        <p className="text-base font-semibold text-gray-900">
                          ₱{archive.summary.totalDisbursed.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-gray-50 border border-gray-100 rounded p-3">
                        <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">Repayments</p>
                        <p className="text-base font-semibold text-gray-900">
                          ₱{archive.summary.totalRepayments.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-gray-50 border border-gray-100 rounded p-3">
                        <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">Balance</p>
                        <p className="text-base font-semibold text-gray-900">
                          ₱{archive.summary.endingBalance.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
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
          <div className="flex justify-end space-x-3">
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
          <Select
            label="Repayment Plan"
            value={newLoanPlan}
            onChange={(e) =>
              setNewLoanPlan(e.target.value as "MONTHLY" | "CUT_OFF")
            }
            options={[
              { value: "CUT_OFF", label: "Cut-off (3% interest)" },
              { value: "MONTHLY", label: "Monthly (4% interest)" },
            ]}
          />
          <Input
            type="number"
            label="Terms"
            value={newLoanTerms}
            onChange={(e) => setNewLoanTerms(e.target.value)}
            placeholder="5"
          />
          <div className="flex justify-end space-x-3">
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
        isOpen={showArchiveModal}
        onClose={() => setShowArchiveModal(false)}
        title="Archive Year"
      >
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>⚠️ Warning:</strong> Archiving year {selectedYearToArchive} will:
            </p>
            <ul className="mt-2 ml-4 text-sm text-yellow-700 list-disc space-y-1">
              <li>Move all {selectedYearToArchive} collection periods to the archive</li>
              <li>Remove {selectedYearToArchive} loans, repayments, and penalties from active view</li>
              <li>Calculate and save year-end summary statistics</li>
              <li>This action cannot be undone</li>
            </ul>
          </div>
          <p className="text-sm text-gray-600">
            The archived data will be safely stored and viewable in the &ldquo;Archived Years&rdquo; section.
          </p>
          <div className="flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={() => setShowArchiveModal(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleArchiveYear} variant="primary">
              Confirm Archive
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="Reset All Periods"
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">
              <strong>⚠️ DANGER:</strong> This will permanently delete:
            </p>
            <ul className="mt-2 ml-4 text-sm text-red-700 list-disc space-y-1">
              <li>All collection periods ({state.collections.length} periods)</li>
              <li>All loans ({state.loans.length} loans)</li>
              <li>All repayments and penalties</li>
              <li>This action CANNOT be undone!</li>
            </ul>
          </div>
          <p className="text-sm text-gray-600">
            Member information will be preserved. You can start creating new collection periods after reset.
          </p>
          <div className="flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={() => setShowResetModal(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleResetPeriods} variant="danger">
              Yes, Delete Everything
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function Home() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
