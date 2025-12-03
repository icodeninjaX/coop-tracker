"use client";

import { format } from "date-fns";
import { useCoop } from "@/context/CoopContext";
import { useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Link from "next/link";
import {
  Button,
  Input,
  Select,
  Modal,
} from "@/components/UI";
import {
  exportCollectionsToCSV,
  exportPaymentsToCSV,
  exportLoansToCSV,
  exportRepaymentsToCSV,
  exportMembersToCSV,
  exportPenaltiesToCSV,
  exportFinancialSummaryToCSV,
  exportFullStateToJSON,
  exportCollectionsToJSON,
  exportLoansToJSON,
  exportArchivesToJSON,
  exportComprehensiveReport,
  importStateFromJSON,
} from "@/lib/exportUtils";
import { calculateTotalShares } from "@/lib/shareCalculations";

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
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importError, setImportError] = useState<string>("");
  const [amounts, setAmounts] = useState<Record<number, string>>({});
  const [showEditPeriodModal, setShowEditPeriodModal] = useState(false);
  const [showDeletePeriodModal, setShowDeletePeriodModal] = useState(false);
  const [editingPeriodId, setEditingPeriodId] = useState<string>("");
  const [editPeriodDate, setEditPeriodDate] = useState<string>("");
  const [editPeriodDefaultContribution, setEditPeriodDefaultContribution] = useState<string>("");
  const [deletingPeriodId, setDeletingPeriodId] = useState<string>("");
  const [showQuickActionsMenu, setShowQuickActionsMenu] = useState(false);

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

  // Function to generate the next collection period automatically (15th and 30th)
  const addNextCollectionPeriod = () => {
    // Get the latest period by date
    const sortedPeriods = [...state.collections].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const latestPeriod = sortedPeriods[0];

    let nextPeriodId: string;

    if (!latestPeriod) {
      // If no periods exist, start with the next 15th or 30th
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth() + 1; // 1-indexed
      const day = today.getDate();

      if (day < 15) {
        // Next period is 15th of current month
        nextPeriodId = `${year}-${String(month).padStart(2, '0')}-15`;
      } else if (day < 30) {
        // Next period is 30th of current month
        nextPeriodId = `${year}-${String(month).padStart(2, '0')}-30`;
      } else {
        // Next period is 15th of next month
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? year + 1 : year;
        nextPeriodId = `${nextYear}-${String(nextMonth).padStart(2, '0')}-15`;
      }
    } else {
      // Parse the latest period date (YYYY-MM-DD format)
      const [year, month, day] = latestPeriod.date.split('-').map(Number);

      // Cooperative collection pattern: alternate between 15th and 30th
      if (day === 15) {
        // If latest was 15th, next should be 30th of same month
        nextPeriodId = `${year}-${String(month).padStart(2, '0')}-30`;
      } else if (day === 30 || day === 31 || day >= 28) {
        // If latest was 30th or end of month, next should be 15th of next month
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? year + 1 : year;
        nextPeriodId = `${nextYear}-${String(nextMonth).padStart(2, '0')}-15`;
      } else if (day < 15) {
        // If latest was before 15th, next should be 15th of same month
        nextPeriodId = `${year}-${String(month).padStart(2, '0')}-15`;
      } else {
        // If latest was between 15th and 30th, next should be 30th of same month
        nextPeriodId = `${year}-${String(month).padStart(2, '0')}-30`;
      }
    }

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

  // Handle editing a collection period
  const openEditPeriodModal = (periodId: string) => {
    const period = state.collections.find((c) => c.id === periodId);
    if (!period) return;

    setEditingPeriodId(periodId);
    setEditPeriodDate(period.date);
    setEditPeriodDefaultContribution(period.defaultContribution?.toString() || "");
    setShowEditPeriodModal(true);
  };

  const handleEditPeriod = () => {
    if (!editPeriodDate || !editingPeriodId) return;

    dispatch({
      type: "UPDATE_COLLECTION_PERIOD",
      payload: {
        periodId: editingPeriodId,
        date: editPeriodDate,
        defaultContribution: editPeriodDefaultContribution
          ? parseFloat(editPeriodDefaultContribution)
          : undefined,
      },
    });

    setShowEditPeriodModal(false);
    setEditingPeriodId("");
    setEditPeriodDate("");
    setEditPeriodDefaultContribution("");
  };

  // Handle deleting a collection period
  const openDeletePeriodModal = (periodId: string) => {
    setDeletingPeriodId(periodId);
    setShowDeletePeriodModal(true);
  };

  const handleDeletePeriod = () => {
    if (!deletingPeriodId) return;

    dispatch({
      type: "DELETE_COLLECTION_PERIOD",
      payload: { periodId: deletingPeriodId },
    });

    setShowDeletePeriodModal(false);
    setDeletingPeriodId("");
  };

  // Export handlers
  const handleExportCollectionsCSV = () => {
    exportCollectionsToCSV(state.collections);
  };

  const handleExportPaymentsCSV = () => {
    exportPaymentsToCSV(state.collections, state.members);
  };

  const handleExportLoansCSV = () => {
    exportLoansToCSV(state.loans, state.members);
  };

  const handleExportRepaymentsCSV = () => {
    exportRepaymentsToCSV(state.repayments, state.members, state.loans);
  };

  const handleExportMembersCSV = () => {
    exportMembersToCSV(state.members);
  };

  const handleExportPenaltiesCSV = () => {
    exportPenaltiesToCSV(state.penalties, state.loans, state.members);
  };

  const handleExportFinancialSummaryCSV = () => {
    exportFinancialSummaryToCSV(state);
  };

  const handleExportFullBackup = () => {
    exportFullStateToJSON(state);
  };

  const handleExportCollectionsJSON = () => {
    exportCollectionsToJSON(state.collections);
  };

  const handleExportLoansJSON = () => {
    exportLoansToJSON(state.loans);
  };

  const handleExportArchivesJSON = () => {
    exportArchivesToJSON(state.archives);
  };

  const handleExportComprehensiveReport = () => {
    exportComprehensiveReport(state);
  };

  // Import handler
  const handleImportState = async () => {
    if (!importFile) return;

    setImportError("");
    try {
      const importedState = await importStateFromJSON(importFile);
      dispatch({ type: "LOAD_STATE", payload: importedState });
      setShowImportModal(false);
      setImportFile(null);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Failed to import file");
    }
  };

  // Payment management functions
  const currentPeriod = state.collections.find(c => c.id === selectedPeriod);

  const handlePeriodClick = (periodId: string) => {
    dispatch({
      type: "SET_SELECTED_PERIOD",
      payload: { periodId },
    });
    setShowPaymentModal(true);
  };

  const getIsPaid = (memberId: number) =>
    !!currentPeriod?.payments.some((p) => p.memberId === memberId);

  const savePayment = (memberId: number) => {
    if (!selectedPeriod || !currentPeriod) return;
    const raw = amounts[memberId];
    const amt =
      raw === undefined || raw === ""
        ? currentPeriod.defaultContribution ?? 0
        : parseFloat(raw);
    dispatch({
      type: "UPSERT_PAYMENT",
      payload: {
        memberId,
        collectionPeriod: selectedPeriod,
        amount: isNaN(amt) ? currentPeriod.defaultContribution ?? 0 : amt,
        date: new Date().toISOString(),
      },
    });
  };

  const clearPayment = (memberId: number) => {
    if (!selectedPeriod) return;
    dispatch({
      type: "REMOVE_PAYMENT",
      payload: { memberId, collectionPeriod: selectedPeriod },
    });
    setAmounts((prev) => {
      const copy = { ...prev };
      delete copy[memberId];
      return copy;
    });
  };

  const markAllPayments = (paid: boolean) => {
    if (!selectedPeriod || !currentPeriod) return;
    const paidSet = new Set(currentPeriod.payments.map((p) => p.memberId));

    if (paid) {
      // Get all unpaid members
      const unpaidMembers = state.members.filter((m) => !paidSet.has(m.id));
      const membersWithoutDefault: string[] = [];

      // First pass: Check if all unpaid members have a payment history
      unpaidMembers.forEach((member) => {
        // Get member's payment history from all periods
        const memberPayments = state.collections
          .flatMap((c) => c.payments)
          .filter((p) => p.memberId === member.id);

        // If no payment history and no period default, add to list
        if (memberPayments.length === 0 && !currentPeriod.defaultContribution) {
          membersWithoutDefault.push(member.name);
        }
      });

      // If any member doesn't have a default, show error and abort
      if (membersWithoutDefault.length > 0) {
        alert(
          `Cannot mark all as paid.\n\nThe following members have no payment history:\n${membersWithoutDefault.join(", ")}\n\nPlease either:\n1. Record their first payment manually, or\n2. Set a default contribution for this period using the Edit button`
        );
        return;
      }

      // Second pass: Add payments using each member's default
      unpaidMembers.forEach((member) => {
        // Get member's most recent payment amount
        const memberPayments = state.collections
          .flatMap((c) => c.payments)
          .filter((p) => p.memberId === member.id)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Use member's most recent payment, or period default, or 0
        const defaultAmount = memberPayments[0]?.amount || currentPeriod.defaultContribution || 0;

        dispatch({
          type: "ADD_PAYMENT",
          payload: {
            memberId: member.id,
            amount: defaultAmount,
            date: new Date().toISOString(),
            collectionPeriod: selectedPeriod,
          },
        });
      });
    } else {
      // Clear all payments (existing logic)
      state.members.forEach((m) => {
        const isPaid = paidSet.has(m.id);
        if (isPaid) {
          dispatch({
            type: "REMOVE_PAYMENT",
            payload: { memberId: m.id, collectionPeriod: selectedPeriod },
          });
        }
      });
    }
  };

  // Get current period data
  const totalBalance = state.currentBalance || 0;
  const totalMembers = state.members.length;
  const activeLoans = state.loans.filter((l) => l.status === "APPROVED").length;
  const pendingLoans = state.loans.filter((l) => l.status === "PENDING").length;

  // Share system data
  const totalShares = calculateTotalShares(state.members);
  const totalInterestPool = state.totalInterestPool || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="container mx-auto max-w-7xl px-3 sm:px-6 py-6 sm:py-8">
        {/* Header + Actions */}
        <div className="mb-6 sm:mb-10 pb-6 border-b-2 border-indigo-200">
          <div className="flex items-start justify-between mb-1">
            <h1 className="text-2xl sm:text-3xl font-semibold text-indigo-900 tracking-tight">
              Dashboard
            </h1>
            <div className="relative">
              <button
                onClick={() => setShowQuickActionsMenu(!showQuickActionsMenu)}
                className="flex items-center justify-center gap-2 px-4 h-11 sm:h-12 bg-indigo-300 text-indigo-900 rounded-md hover:bg-indigo-400 transition-all duration-200 shadow-sm"
                title="Quick actions"
                aria-label="Quick actions menu"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                </svg>
                <span className="text-sm font-normal">Actions</span>
              </button>

            {/* Dropdown Menu */}
            {showQuickActionsMenu && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowQuickActionsMenu(false)}
                />

                {/* Menu */}
                <div className="absolute right-0 mt-2 w-56 bg-white border-2 border-indigo-200 rounded-xl shadow-lg z-20 overflow-hidden">
                  <div className="py-2">
                    <button
                      onClick={() => {
                        setShowExportModal(true);
                        setShowQuickActionsMenu(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-emerald-50 transition-colors flex items-center gap-3 border-b border-indigo-100"
                    >
                      <div className="flex items-center justify-center w-9 h-9 bg-emerald-300 text-emerald-900 rounded-md flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-normal text-indigo-900">Export Data</div>
                        <div className="text-xs text-indigo-600">Download reports</div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setShowImportModal(true);
                        setShowQuickActionsMenu(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-purple-50 transition-colors flex items-center gap-3 border-b border-indigo-100"
                    >
                      <div className="flex items-center justify-center w-9 h-9 bg-purple-300 text-purple-900 rounded-md flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-normal text-indigo-900">Import Data</div>
                        <div className="text-xs text-indigo-600">Restore backup</div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setShowNewPeriodModal(true);
                        setShowQuickActionsMenu(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-indigo-50 transition-colors flex items-center gap-3 border-b border-indigo-100"
                    >
                      <div className="flex items-center justify-center w-9 h-9 bg-indigo-300 text-indigo-900 rounded-md flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-normal text-indigo-900">New Period</div>
                        <div className="text-xs text-indigo-600">Add collection period</div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setShowNewLoanModal(true);
                        setShowQuickActionsMenu(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-indigo-50 transition-colors flex items-center gap-3 border-b border-indigo-100"
                    >
                      <div className="flex items-center justify-center w-9 h-9 border-2 border-indigo-200 text-indigo-800 rounded-md flex-shrink-0 bg-white">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-normal text-indigo-900">New Loan</div>
                        <div className="text-xs text-indigo-600">Create loan request</div>
                      </div>
                    </button>

                    {state.collections.length > 0 && (
                      <button
                        onClick={() => {
                          setShowResetModal(true);
                          setShowQuickActionsMenu(false);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-rose-50 transition-colors flex items-center gap-3"
                      >
                        <div className="flex items-center justify-center w-9 h-9 border-2 border-rose-200 text-rose-700 rounded-md flex-shrink-0 bg-white">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-sm font-normal text-indigo-900">Reset Periods</div>
                          <div className="text-xs text-rose-600">Clear all data</div>
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
            </div>
          </div>
          <p className="text-sm text-indigo-600 font-light">
            {format(new Date(), "MMMM d, yyyy")} · {state.collections.length} {state.collections.length === 1 ? 'period' : 'periods'}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-8 sm:mb-12">
          <Link href="/ledger" className="bg-white/80 backdrop-blur-sm border-2 border-indigo-200 rounded-xl p-3 sm:p-4 lg:p-6 transition-all duration-200 hover:shadow-md hover:border-indigo-300 cursor-pointer">
            <p className="text-xs uppercase tracking-wider text-indigo-600 font-normal mb-1 sm:mb-2">
              Total Balance
            </p>
            <p className="text-base sm:text-xl lg:text-2xl xl:text-3xl font-semibold text-indigo-900 break-all">
              ₱{totalBalance.toLocaleString()}
            </p>
          </Link>

          <Link href="/members" className="bg-white/80 backdrop-blur-sm border-2 border-purple-200 rounded-xl p-3 sm:p-4 lg:p-6 transition-all duration-200 hover:shadow-md hover:border-purple-300 cursor-pointer">
            <p className="text-xs uppercase tracking-wider text-purple-600 font-normal mb-1 sm:mb-2">
              Members
            </p>
            <p className="text-base sm:text-xl lg:text-2xl xl:text-3xl font-semibold text-purple-900 break-all">
              {totalMembers}
            </p>
          </Link>

          <Link href="/loans" className="bg-white/80 backdrop-blur-sm border-2 border-emerald-200 rounded-xl p-3 sm:p-4 lg:p-6 transition-all duration-200 hover:shadow-md hover:border-emerald-300 cursor-pointer">
            <p className="text-xs uppercase tracking-wider text-emerald-600 font-normal mb-1 sm:mb-2">
              Active Loans
            </p>
            <p className="text-base sm:text-xl lg:text-2xl xl:text-3xl font-semibold text-emerald-900 break-all">
              {activeLoans}
            </p>
          </Link>

          <Link href="/loans" className="bg-white/80 backdrop-blur-sm border-2 border-amber-200 rounded-xl p-3 sm:p-4 lg:p-6 transition-all duration-200 hover:shadow-md hover:border-amber-300 cursor-pointer">
            <p className="text-xs uppercase tracking-wider text-amber-600 font-normal mb-1 sm:mb-2">
              Pending Loans
            </p>
            <p className="text-base sm:text-xl lg:text-2xl xl:text-3xl font-semibold text-amber-900 break-all">
              {pendingLoans}
            </p>
          </Link>

          <Link href="/shares" className="bg-white/80 backdrop-blur-sm border-2 border-rose-200 rounded-xl p-3 sm:p-4 lg:p-6 transition-all duration-200 hover:shadow-md hover:border-rose-300 cursor-pointer">
            <p className="text-xs uppercase tracking-wider text-rose-600 font-normal mb-1 sm:mb-2">
              Committed Shares
            </p>
            <p className="text-base sm:text-xl lg:text-2xl xl:text-3xl font-semibold text-rose-900 break-all">
              {totalShares.toFixed(2)}
            </p>
          </Link>

          <Link href="/shares" className="bg-white/80 backdrop-blur-sm border-2 border-cyan-200 rounded-xl p-3 sm:p-4 lg:p-6 transition-all duration-200 hover:shadow-md hover:border-cyan-300 cursor-pointer">
            <p className="text-xs uppercase tracking-wider text-cyan-600 font-normal mb-1 sm:mb-2">
              Interest Pool
            </p>
            <p className="text-base sm:text-xl lg:text-2xl xl:text-3xl font-semibold text-cyan-900 break-all">
              ₱{totalInterestPool.toLocaleString()}
            </p>
          </Link>
        </div>

        {/* Collection Periods */}
        <div className="mb-8 sm:mb-12">
          <h2 className="text-base sm:text-lg font-semibold text-indigo-900 mb-4 sm:mb-6">
            Collection Periods
          </h2>
          {state.collections.length > 0 ? (
            <>
              {/* Mobile: Horizontal Scroll */}
              <div className="md:hidden overflow-x-auto -mx-3 px-3 pb-2">
                <div className="flex gap-3 min-w-min">
                  {state.collections.map((period) => (
                    <div
                      key={period.id}
                      className={`relative p-4 pb-3 rounded-xl border-2 transition-all duration-200 min-w-[160px] flex-shrink-0 ${
                        selectedPeriod === period.id
                          ? "border-indigo-400 bg-indigo-300 text-indigo-900 shadow-md"
                          : "border-indigo-200 bg-white/80 hover:border-indigo-300 hover:shadow-sm"
                      }`}
                    >
                      {/* Edit/Delete Actions - Top Right */}
                      <div className="absolute top-2 right-2 flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditPeriodModal(period.id);
                          }}
                          className="p-1.5 bg-white/90 backdrop-blur-sm text-indigo-700 rounded-md hover:bg-indigo-100 transition-all duration-200 shadow-sm border border-indigo-200/50"
                          title="Edit period"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openDeletePeriodModal(period.id);
                          }}
                          className="p-1.5 bg-white/90 backdrop-blur-sm text-rose-700 rounded-md hover:bg-rose-100 transition-all duration-200 shadow-sm border border-rose-200/50"
                          title="Delete period"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>

                      <div
                        onClick={() => handlePeriodClick(period.id)}
                        className="cursor-pointer pr-16"
                      >
                        <p className={`text-xs uppercase tracking-wider font-normal mb-2 ${
                          selectedPeriod === period.id ? "text-indigo-700" : "text-indigo-600"
                        }`}>
                          {format(new Date(period.date), "MMM d, yyyy")}
                        </p>
                        <p className={`text-xl font-semibold mb-1 ${
                          selectedPeriod === period.id ? "text-indigo-900" : "text-indigo-900"
                        }`}>
                          ₱{period.totalCollected.toLocaleString()}
                        </p>
                        <p className={`text-xs font-light ${
                          selectedPeriod === period.id ? "text-indigo-700" : "text-indigo-600"
                        }`}>
                          {period.payments.length} {period.payments.length === 1 ? 'payment' : 'payments'}
                        </p>
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={addNextCollectionPeriod}
                    className="p-4 rounded-xl border-2 border-dashed border-indigo-300 hover:border-indigo-400 hover:bg-indigo-50 transition-all duration-200 flex flex-col items-center justify-center min-w-[160px] min-h-[120px] flex-shrink-0"
                  >
                    <span className="text-2xl text-indigo-400 mb-1 font-light">+</span>
                    <span className="text-xs text-indigo-700 font-normal">Add Period</span>
                  </button>
                </div>
              </div>

              {/* Desktop: Grid */}
              <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {state.collections.map((period) => (
                  <div
                    key={period.id}
                    className={`relative p-5 pb-4 rounded-xl border-2 transition-all duration-200 ${
                      selectedPeriod === period.id
                        ? "border-indigo-400 bg-indigo-300 text-indigo-900 shadow-md"
                        : "border-indigo-200 bg-white/80 hover:border-indigo-300 hover:shadow-sm"
                    }`}
                  >
                    {/* Edit/Delete Actions - Top Right */}
                    <div className="absolute top-3 right-3 flex gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditPeriodModal(period.id);
                        }}
                        className="p-2 bg-white/90 backdrop-blur-sm text-indigo-700 rounded-md hover:bg-indigo-100 transition-all duration-200 shadow-sm border border-indigo-200/50"
                        title="Edit period"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openDeletePeriodModal(period.id);
                        }}
                        className="p-2 bg-white/90 backdrop-blur-sm text-rose-700 rounded-md hover:bg-rose-100 transition-all duration-200 shadow-sm border border-rose-200/50"
                        title="Delete period"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>

                    <div
                      onClick={() => handlePeriodClick(period.id)}
                      className="cursor-pointer pr-20"
                    >
                      <p className={`text-xs uppercase tracking-wider font-normal mb-3 ${
                        selectedPeriod === period.id ? "text-indigo-700" : "text-indigo-600"
                      }`}>
                        {format(new Date(period.date), "MMM d, yyyy")}
                      </p>
                      <p className={`text-2xl font-semibold mb-2 ${
                        selectedPeriod === period.id ? "text-indigo-900" : "text-indigo-900"
                      }`}>
                        ₱{period.totalCollected.toLocaleString()}
                      </p>
                      <p className={`text-xs font-light ${
                        selectedPeriod === period.id ? "text-indigo-700" : "text-indigo-600"
                      }`}>
                        {period.payments.length} {period.payments.length === 1 ? 'payment' : 'payments'}
                      </p>
                    </div>
                  </div>
                ))}

                <button
                  onClick={addNextCollectionPeriod}
                  className="p-5 rounded-xl border-2 border-dashed border-indigo-300 hover:border-indigo-400 hover:bg-indigo-50 transition-all duration-200 flex flex-col items-center justify-center min-h-[140px]"
                >
                  <span className="text-3xl text-indigo-400 mb-2 font-light">+</span>
                  <span className="text-sm text-indigo-700 font-normal">Add Period</span>
                </button>
              </div>
            </>
          ) : (
            <div className="bg-white/80 border-2 border-indigo-200 rounded-xl p-8 sm:p-12 text-center">
              <p className="text-sm text-indigo-600 font-light mb-4 sm:mb-6">No periods yet</p>
              <button
                onClick={addNextCollectionPeriod}
                className="px-5 py-2.5 bg-indigo-300 !text-indigo-900 text-sm font-normal rounded-md hover:bg-indigo-400 transition-all duration-200 min-h-[44px] shadow-sm"
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
          <div className="p-5 bg-indigo-50 border-2 border-indigo-200 rounded-lg">
            <h4 className="font-normal text-indigo-900 mb-3 text-sm uppercase tracking-wider">
              Loan Type Information
            </h4>
            {newLoanPlan === "MONTHLY" ? (
              <div className="text-sm text-indigo-700 font-light">
                <p className="mb-3 font-normal text-indigo-900">
                  One-time Payment Loan
                </p>
                <ul className="space-y-2 ml-1">
                  <li className="flex items-start">
                    <span className="text-indigo-400 mr-2">•</span>
                    <span>Pay the full amount + interest after {newLoanTerms || 5}{" "}
                    months</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-indigo-400 mr-2">•</span>
                    <span>Interest: 4% per month × {newLoanTerms || 5} months ={" "}
                    {(parseFloat(newLoanTerms) || 5) * 4}% total</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-indigo-400 mr-2">•</span>
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
              <div className="text-sm text-indigo-700 font-light">
                <p className="mb-3 font-normal text-indigo-900">
                  Per Cut-off Installment Loan
                </p>
                <ul className="space-y-2 ml-1">
                  <li className="flex items-start">
                    <span className="text-indigo-400 mr-2">•</span>
                    <span>Pay in installments every cut-off (2 times per month)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-indigo-400 mr-2">•</span>
                    <span>Interest: 3% per month × {newLoanTerms || 5} months ={" "}
                    {(parseFloat(newLoanTerms) || 5) * 3}% total</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-indigo-400 mr-2">•</span>
                    <span>Total payments: {(parseFloat(newLoanTerms) || 5) * 2}{" "}
                    installments</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-indigo-400 mr-2">•</span>
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
          <div className="bg-rose-50 border-2 border-rose-200 rounded-lg p-5">
            <p className="text-xs uppercase tracking-wider text-rose-700 font-normal mb-3">
              Warning
            </p>
            <p className="text-sm text-rose-900 font-light mb-4">
              This will permanently delete:
            </p>
            <ul className="space-y-2 text-sm text-rose-800 font-light">
              <li className="flex items-start">
                <span className="text-rose-400 mr-2">•</span>
                <span>All collection periods ({state.collections.length} {state.collections.length === 1 ? 'period' : 'periods'})</span>
              </li>
              <li className="flex items-start">
                <span className="text-rose-400 mr-2">•</span>
                <span>All loans ({state.loans.length} {state.loans.length === 1 ? 'loan' : 'loans'})</span>
              </li>
              <li className="flex items-start">
                <span className="text-rose-400 mr-2">•</span>
                <span>All repayments and penalties</span>
              </li>
              <li className="flex items-start">
                <span className="text-rose-400 mr-2">•</span>
                <span>This action cannot be undone</span>
              </li>
            </ul>
          </div>
          <p className="text-sm text-indigo-700 font-light">
            Member information will be preserved. You can start creating new collection periods after reset.
          </p>
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
            <button
              onClick={() => setShowResetModal(false)}
              className="px-5 py-2.5 border-2 border-indigo-200 text-indigo-800 text-sm font-normal rounded-md hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200 min-h-[44px]"
            >
              Cancel
            </button>
            <button
              onClick={handleResetPeriods}
              className="px-5 py-2.5 bg-rose-300 text-rose-900 text-sm font-normal rounded-md hover:bg-rose-400 shadow-sm transition-all duration-200 min-h-[44px]"
            >
              Confirm Reset
            </button>
          </div>
        </div>
      </Modal>

      {/* Export Modal */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export & Backup Data"
        size="lg"
      >
        <div className="space-y-6">
          {/* CSV Exports */}
          <div>
            <h3 className="text-xs uppercase tracking-wider text-indigo-600 font-semibold mb-3">
              CSV Exports
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleExportCollectionsCSV}
                className="px-4 py-3 border-2 border-indigo-200 text-indigo-800 text-sm font-normal rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200 text-left"
              >
                <div className="font-semibold mb-1">Collections</div>
                <div className="text-xs text-indigo-600">Export collection periods summary</div>
              </button>
              <button
                onClick={handleExportPaymentsCSV}
                className="px-4 py-3 border-2 border-indigo-200 text-indigo-800 text-sm font-normal rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200 text-left"
              >
                <div className="font-semibold mb-1">Payments</div>
                <div className="text-xs text-indigo-600">Export all payment records</div>
              </button>
              <button
                onClick={handleExportLoansCSV}
                className="px-4 py-3 border-2 border-indigo-200 text-indigo-800 text-sm font-normal rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200 text-left"
              >
                <div className="font-semibold mb-1">Loans</div>
                <div className="text-xs text-indigo-600">Export all loan records</div>
              </button>
              <button
                onClick={handleExportRepaymentsCSV}
                className="px-4 py-3 border-2 border-indigo-200 text-indigo-800 text-sm font-normal rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200 text-left"
              >
                <div className="font-semibold mb-1">Repayments</div>
                <div className="text-xs text-indigo-600">Export all repayment records</div>
              </button>
              <button
                onClick={handleExportMembersCSV}
                className="px-4 py-3 border-2 border-indigo-200 text-indigo-800 text-sm font-normal rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200 text-left"
              >
                <div className="font-semibold mb-1">Members</div>
                <div className="text-xs text-indigo-600">Export member list</div>
              </button>
              <button
                onClick={handleExportPenaltiesCSV}
                className="px-4 py-3 border-2 border-indigo-200 text-indigo-800 text-sm font-normal rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200 text-left"
              >
                <div className="font-semibold mb-1">Penalties</div>
                <div className="text-xs text-indigo-600">Export penalty records</div>
              </button>
            </div>
          </div>

          {/* Financial Reports */}
          <div>
            <h3 className="text-xs uppercase tracking-wider text-emerald-600 font-semibold mb-3">
              Financial Reports
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleExportFinancialSummaryCSV}
                className="px-4 py-3 border-2 border-emerald-200 bg-emerald-50 text-emerald-800 text-sm font-normal rounded-lg hover:bg-emerald-100 hover:border-emerald-300 transition-all duration-200 text-left"
              >
                <div className="font-semibold mb-1">Financial Summary (CSV)</div>
                <div className="text-xs text-emerald-700">Overview of all financial metrics</div>
              </button>
              <button
                onClick={handleExportComprehensiveReport}
                className="px-4 py-3 border-2 border-purple-200 bg-purple-50 text-purple-800 text-sm font-normal rounded-lg hover:bg-purple-100 hover:border-purple-300 transition-all duration-200 text-left"
              >
                <div className="font-semibold mb-1">Comprehensive Report (JSON)</div>
                <div className="text-xs text-purple-700">Complete financial report with details</div>
              </button>
            </div>
          </div>

          {/* JSON Exports / Backups */}
          <div>
            <h3 className="text-xs uppercase tracking-wider text-indigo-600 font-semibold mb-3">
              Backups (JSON)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleExportFullBackup}
                className="px-4 py-3 border-2 border-indigo-400 bg-indigo-300 text-indigo-900 text-sm font-semibold rounded-lg hover:bg-indigo-400 hover:border-indigo-500 transition-all duration-200 text-left shadow-sm"
              >
                <div className="font-semibold mb-1">Full State Backup</div>
                <div className="text-xs text-indigo-800">Complete system backup (can restore)</div>
              </button>
              <button
                onClick={handleExportCollectionsJSON}
                className="px-4 py-3 border-2 border-indigo-200 text-indigo-800 text-sm font-normal rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200 text-left"
              >
                <div className="font-semibold mb-1">Collections (JSON)</div>
                <div className="text-xs text-indigo-600">Export collections data</div>
              </button>
              <button
                onClick={handleExportLoansJSON}
                className="px-4 py-3 border-2 border-indigo-200 text-indigo-800 text-sm font-normal rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200 text-left"
              >
                <div className="font-semibold mb-1">Loans (JSON)</div>
                <div className="text-xs text-indigo-600">Export loans data</div>
              </button>
              <button
                onClick={handleExportArchivesJSON}
                className="px-4 py-3 border-2 border-indigo-200 text-indigo-800 text-sm font-normal rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200 text-left"
              >
                <div className="font-semibold mb-1">Archives (JSON)</div>
                <div className="text-xs text-indigo-600">Export archived years</div>
              </button>
            </div>
          </div>

          <div className="pt-4 border-t-2 border-indigo-200">
            <Button variant="secondary" onClick={() => setShowExportModal(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Import Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => {
          setShowImportModal(false);
          setImportFile(null);
          setImportError("");
        }}
        title="Import State from Backup"
      >
        <div className="space-y-4">
          <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-5">
            <p className="text-sm text-amber-800 font-semibold mb-2">
              ⚠️ Warning: Importing will replace your current data
            </p>
            <p className="text-xs text-amber-700">
              Make sure to export your current state as a backup before importing.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-indigo-900 mb-2">
              Select Backup File (JSON)
            </label>
            <input
              type="file"
              accept=".json,application/json"
              onChange={(e) => {
                setImportFile(e.target.files?.[0] || null);
                setImportError("");
              }}
              className="block w-full text-sm text-indigo-900 border-2 border-indigo-200 rounded-lg cursor-pointer bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          {importError && (
            <div className="bg-rose-50 border-2 border-rose-200 rounded-lg p-4">
              <p className="text-sm text-rose-800 font-semibold">{importError}</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowImportModal(false);
                setImportFile(null);
                setImportError("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImportState}
              disabled={!importFile}
              variant="primary"
            >
              Import Backup
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Collection Period Modal */}
      <Modal
        isOpen={showEditPeriodModal}
        onClose={() => {
          setShowEditPeriodModal(false);
          setEditingPeriodId("");
          setEditPeriodDate("");
          setEditPeriodDefaultContribution("");
        }}
        title="Edit Collection Period"
      >
        <div className="space-y-4">
          <Input
            type="date"
            label="Period Date"
            value={editPeriodDate}
            onChange={(e) => setEditPeriodDate(e.target.value)}
          />
          <Input
            type="number"
            label="Default Contribution (₱)"
            value={editPeriodDefaultContribution}
            onChange={(e) => setEditPeriodDefaultContribution(e.target.value)}
            placeholder="Optional - default amount per member"
          />
          <div className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-4">
            <p className="text-xs text-indigo-700 font-light">
              <strong className="font-normal">Note:</strong> Changing the date will update the period ID. All payments, repayments, and loan disbursements linked to this period will be updated automatically.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setShowEditPeriodModal(false);
                setEditingPeriodId("");
                setEditPeriodDate("");
                setEditPeriodDefaultContribution("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleEditPeriod}>Save Changes</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Collection Period Modal */}
      <Modal
        isOpen={showDeletePeriodModal}
        onClose={() => {
          setShowDeletePeriodModal(false);
          setDeletingPeriodId("");
        }}
        title="Delete Collection Period"
      >
        <div className="space-y-6">
          <div className="bg-rose-50 border-2 border-rose-200 rounded-lg p-5">
            <p className="text-xs uppercase tracking-wider text-rose-700 font-normal mb-3">
              Warning
            </p>
            <p className="text-sm text-rose-900 font-light mb-4">
              This will permanently delete this collection period and:
            </p>
            <ul className="space-y-2 text-sm text-rose-800 font-light">
              <li className="flex items-start">
                <span className="text-rose-400 mr-2">•</span>
                <span>All payments recorded in this period</span>
              </li>
              <li className="flex items-start">
                <span className="text-rose-400 mr-2">•</span>
                <span>All loan repayments made in this period</span>
              </li>
              <li className="flex items-start">
                <span className="text-rose-400 mr-2">•</span>
                <span>All penalties assessed in this period</span>
              </li>
              <li className="flex items-start">
                <span className="text-rose-400 mr-2">•</span>
                <span>Loan disbursement references to this period</span>
              </li>
              <li className="flex items-start">
                <span className="text-rose-400 mr-2">•</span>
                <span className="font-normal">This action cannot be undone</span>
              </li>
            </ul>
          </div>

          {deletingPeriodId && state.collections.find(c => c.id === deletingPeriodId) && (
            <div className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-4">
              <p className="text-sm text-indigo-900 font-normal mb-2">
                Period Details:
              </p>
              <div className="text-sm text-indigo-700 font-light space-y-1">
                <p>Date: {format(new Date(state.collections.find(c => c.id === deletingPeriodId)!.date), "MMMM d, yyyy")}</p>
                <p>Total Collected: ₱{state.collections.find(c => c.id === deletingPeriodId)!.totalCollected.toLocaleString()}</p>
                <p>Payments: {state.collections.find(c => c.id === deletingPeriodId)!.payments.length}</p>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
            <button
              onClick={() => {
                setShowDeletePeriodModal(false);
                setDeletingPeriodId("");
              }}
              className="px-5 py-2.5 border-2 border-indigo-200 text-indigo-800 text-sm font-normal rounded-md hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200 min-h-[44px]"
            >
              Cancel
            </button>
            <button
              onClick={handleDeletePeriod}
              className="px-5 py-2.5 bg-rose-300 text-rose-900 text-sm font-normal rounded-md hover:bg-rose-400 shadow-sm transition-all duration-200 min-h-[44px]"
            >
              Confirm Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* Payment Management Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title={currentPeriod ? `Manage Payments - ${format(new Date(currentPeriod.date), "MMMM d, yyyy")}` : "Manage Payments"}
        size="lg"
      >
        {currentPeriod && (
          <div className="space-y-6">
            {/* Period Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-4">
                <p className="text-xs uppercase tracking-wider text-indigo-600 font-normal mb-2">
                  Total Collected
                </p>
                <p className="text-xl sm:text-2xl font-semibold text-indigo-900">
                  ₱{currentPeriod.totalCollected.toLocaleString()}
                </p>
              </div>
              <div className="bg-emerald-50 border-2 border-emerald-200 rounded-lg p-4">
                <p className="text-xs uppercase tracking-wider text-emerald-600 font-normal mb-2">
                  Paid
                </p>
                <p className="text-xl sm:text-2xl font-semibold text-emerald-900">
                  {currentPeriod.payments.length}/{state.members.length}
                </p>
              </div>
              <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4 col-span-2 sm:col-span-1">
                <p className="text-xs uppercase tracking-wider text-amber-600 font-normal mb-2">
                  Unpaid
                </p>
                <p className="text-xl sm:text-2xl font-semibold text-amber-900">
                  {state.members.length - currentPeriod.payments.length}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={() => markAllPayments(true)}
                className="px-5 py-2.5 bg-emerald-200 text-emerald-800 text-sm font-normal rounded-md hover:bg-emerald-300 shadow-sm transition-all duration-200 min-h-[44px]"
              >
                Mark All Paid
              </button>
              <button
                onClick={() => markAllPayments(false)}
                className="px-5 py-2.5 border-2 border-indigo-200 text-indigo-800 text-sm font-normal rounded-md hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200 min-h-[44px]"
              >
                Clear All Payments
              </button>
            </div>

            {/* Members List */}
            <div className="border-2 border-indigo-200 rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
              <div className="divide-y-2 divide-indigo-100">
                {state.members.map((member) => {
                  const isPaid = getIsPaid(member.id);
                  const payment = currentPeriod.payments.find(
                    (p) => p.memberId === member.id
                  );

                  return (
                    <div
                      key={member.id}
                      className="bg-white hover:bg-indigo-50/50 transition-colors p-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        {/* Member Info */}
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-400 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-normal text-base">
                              {member.name[0]?.toUpperCase() || "?"}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-normal text-indigo-900 text-base">
                              {member.name}
                            </h3>
                            <p className="text-xs text-indigo-600">ID: {member.id}</p>
                          </div>
                        </div>

                        {/* Payment Actions */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                          {isPaid ? (
                            <>
                              <div className="flex items-center gap-2 sm:gap-3">
                                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full text-xs font-normal">
                                  Paid
                                </span>
                                <span className="font-normal text-indigo-900">
                                  ₱{payment?.amount?.toLocaleString() || 0}
                                </span>
                              </div>
                              <button
                                onClick={() => clearPayment(member.id)}
                                className="px-4 py-2 border-2 border-indigo-200 text-indigo-800 text-sm font-normal rounded-md hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200 min-h-[44px]"
                              >
                                Clear
                              </button>
                            </>
                          ) : (
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                              <span className="px-3 py-1 bg-amber-100 text-amber-800 border border-amber-200 rounded-full text-xs font-normal self-start sm:self-center">
                                Unpaid
                              </span>
                              <Input
                                type="number"
                                placeholder={
                                  currentPeriod.defaultContribution?.toString() || "Amount"
                                }
                                value={amounts[member.id] || ""}
                                onChange={(e) =>
                                  setAmounts((prev) => ({
                                    ...prev,
                                    [member.id]: e.target.value,
                                  }))
                                }
                                className="w-full sm:w-32 text-sm"
                              />
                              <button
                                onClick={() => savePayment(member.id)}
                                className="px-4 py-2 bg-indigo-300 text-indigo-900 text-sm font-normal rounded-md hover:bg-indigo-400 shadow-sm transition-all duration-200 min-h-[44px] whitespace-nowrap"
                              >
                                Record Payment
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Close Button */}
            <div className="flex justify-end">
              <Button onClick={() => setShowPaymentModal(false)}>
                Done
              </Button>
            </div>
          </div>
        )}
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
