"use client";

import { format } from "date-fns";
import { useCoop } from "@/context/CoopContext";
import { useState } from "react";
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

  // Quick actions
  const quickActions = [
    {
      title: "Members",
      description: "Manage member payments",
      icon: "👥",
      color: "from-blue-500 to-blue-600",
      href: "/members",
    },
    {
      title: "Loans",
      description: "View and manage loans",
      icon: "💰",
      color: "from-green-500 to-green-600",
      href: "/loans",
    },
    {
      title: "New Loan",
      description: "Create a new loan",
      icon: "➕",
      color: "from-purple-500 to-purple-600",
      action: () => setShowNewLoanModal(true),
    },
    {
      title: "New Period",
      description: "Add collection period",
      icon: "📅",
      color: "from-orange-500 to-orange-600",
      action: () => setShowNewPeriodModal(true),
    },
  ];

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

  // Get current period data
  const currentPeriodData = state.collections.find(
    (p) => p.id === selectedPeriod
  );
  const totalBalance = state.currentBalance || 0;
  const totalMembers = state.members.length;
  const activeLoans = state.loans.filter((l) => l.status === "APPROVED").length;
  const pendingLoans = state.loans.filter((l) => l.status === "PENDING").length;

  // Recent activity
  const recentPayments = currentPeriodData?.payments.slice(-5) || [];

  return (
    <div className="min-h-screen">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Good morning! 👋
              </h1>
              <p className="text-gray-600">
                Here&apos;s what&apos;s happening with your cooperative today.
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant="info" className="hidden sm:inline-flex">
                {state.collections.length} periods
              </Badge>
              <Badge variant="neutral">
                {format(new Date(), "MMM dd, yyyy")}
              </Badge>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">
                  Total Balance
                </p>
                <p className="text-2xl font-bold text-blue-900">
                  ₱{totalBalance.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl">💰</span>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">
                  Active Members
                </p>
                <p className="text-2xl font-bold text-green-900">
                  {totalMembers}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl">👥</span>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 text-sm font-medium">
                  Active Loans
                </p>
                <p className="text-2xl font-bold text-purple-900">
                  {activeLoans}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl">📋</span>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-600 text-sm font-medium">
                  Pending Loans
                </p>
                <p className="text-2xl font-bold text-orange-900">
                  {pendingLoans}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl">⏳</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mb-8">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {quickActions.map((action, index) => {
                if (action.href) {
                  return (
                    <a
                      key={index}
                      href={action.href}
                      className={`p-4 rounded-xl bg-gradient-to-r ${action.color} text-white hover:shadow-lg transform hover:scale-105 transition-all duration-200 block text-center`}
                    >
                      <div className="text-2xl mb-2">{action.icon}</div>
                      <h3 className="font-semibold text-sm">{action.title}</h3>
                      <p className="text-xs sm:text-sm opacity-90">{action.description}</p>
                    </a>
                  );
                }

                return (
                  <button
                    key={index}
                    onClick={action.action}
                    className={`p-4 rounded-xl bg-gradient-to-r ${action.color} text-white hover:shadow-lg transform hover:scale-105 transition-all duration-200 text-center`}
                  >
                    <div className="text-2xl mb-2">{action.icon}</div>
                    <h3 className="font-semibold text-sm">{action.title}</h3>
                    <p className="text-xs sm:text-sm opacity-90">{action.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Current Period & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Current Period */}
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Current Period
                </h2>
                {selectedPeriod && (
                  <Badge variant="success">
                    {format(new Date(selectedPeriod), "MMM dd, yyyy")}
                  </Badge>
                )}
              </div>

              {currentPeriodData ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Collected</span>
                    <span className="font-semibold">
                      ₱{currentPeriodData.totalCollected.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Payments Made</span>
                    <span className="font-semibold">
                      {currentPeriodData.payments.length} / {totalMembers}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${
                          (currentPeriodData.payments.length / totalMembers) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => (window.location.href = "/members")}
                  >
                    Manage Payments
                  </Button>
                </div>
              ) : (
                <EmptyState
                  title="No Period Selected"
                  description="Select or create a collection period to get started"
                  action={
                    <Button onClick={() => setShowNewPeriodModal(true)}>
                      Create Period
                    </Button>
                  }
                />
              )}
            </div>
          </Card>

          {/* Recent Activity */}
          <Card>
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Recent Activity
              </h2>
              {recentPayments.length > 0 ? (
                <div className="space-y-3">
                  {recentPayments.map((payment, index) => {
                    const member = state.members.find(
                      (m) => m.id === payment.memberId
                    );
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 text-sm font-medium">
                              {member?.name[0] || "?"}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {member?.name}
                            </p>
                            <p className="text-sm text-gray-500">
                              {format(new Date(payment.date), "MMM dd, HH:mm")}
                            </p>
                          </div>
                        </div>
                        <span className="font-semibold text-green-600">
                          +₱{payment.amount.toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  title="No Recent Activity"
                  description="Payment activity will appear here"
                />
              )}
            </div>
          </Card>
        </div>

        {/* Period Selector */}
        <Card className="mt-8">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Collection Periods
            </h2>
            {state.collections.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {state.collections
                  .slice(-6)
                  .reverse()
                  .map((period) => (
                    <button
                      key={period.id}
                      onClick={() =>
                        dispatch({
                          type: "SET_SELECTED_PERIOD",
                          payload: { periodId: period.id },
                        })
                      }
                      className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                        selectedPeriod === period.id
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium">
                          {format(new Date(period.date), "MMM dd, yyyy")}
                        </span>
                        {selectedPeriod === period.id && (
                          <Badge variant="info" className="text-xs sm:text-sm">
                            Active
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        ₱{period.totalCollected.toLocaleString()} collected
                      </p>
                      <p className="text-sm text-gray-500">
                        {period.payments.length} payments
                      </p>
                    </button>
                  ))}
              </div>
            ) : (
              <EmptyState
                title="No Collection Periods"
                description="Create your first collection period to get started"
                action={
                  <Button onClick={() => setShowNewPeriodModal(true)}>
                    Create First Period
                  </Button>
                }
              />
            )}
          </div>
        </Card>
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
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">
              Loan Type Information
            </h4>
            {newLoanPlan === "MONTHLY" ? (
              <div className="text-sm text-blue-800">
                <p className="mb-2">
                  <strong>One-time Payment Loan:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>
                    Pay the full amount + interest after {newLoanTerms || 5}{" "}
                    months
                  </li>
                  <li>
                    Interest: 4% per month × {newLoanTerms || 5} months ={" "}
                    {(parseFloat(newLoanTerms) || 5) * 4}% total
                  </li>
                  <li>
                    Example: ₱10,000 → Pay ₱
                    {(
                      10000 *
                      (1 + 0.04 * (parseFloat(newLoanTerms) || 5))
                    ).toLocaleString()}{" "}
                    after {newLoanTerms || 5} months
                  </li>
                </ul>
              </div>
            ) : (
              <div className="text-sm text-blue-800">
                <p className="mb-2">
                  <strong>Per Cut-off Installment Loan:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Pay in installments every cut-off (2 times per month)</li>
                  <li>
                    Interest: 3% per month × {newLoanTerms || 5} months ={" "}
                    {(parseFloat(newLoanTerms) || 5) * 3}% total
                  </li>
                  <li>
                    Total payments: {(parseFloat(newLoanTerms) || 5) * 2}{" "}
                    installments
                  </li>
                  <li>
                    Example: ₱10,000 → {(parseFloat(newLoanTerms) || 5) * 2}{" "}
                    payments of ₱
                    {(
                      (10000 * (1 + 0.03 * (parseFloat(newLoanTerms) || 5))) /
                      ((parseFloat(newLoanTerms) || 5) * 2)
                    ).toFixed(0)}{" "}
                    each
                  </li>
                </ul>
              </div>
            )}
          </div>
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
