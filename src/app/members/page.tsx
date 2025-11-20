"use client";

import { useCoop } from "@/context/CoopContext";
import { useEffect, useMemo, useState } from "react";
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

function MembersContent() {
  const { state, dispatch } = useCoop();
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [query, setQuery] = useState<string>("");
  const [amounts, setAmounts] = useState<Record<number, string>>({});

  // Member CRUD states
  const [newMemberName, setNewMemberName] = useState<string>("");
  const [editingMember, setEditingMember] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [showAddMember, setShowAddMember] = useState<boolean>(false);

  const period = useMemo(
    () => state.collections.find((c) => c.id === selectedPeriod),
    [state.collections, selectedPeriod]
  );

  const members = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return state.members;
    return state.members.filter((m) => m.name.toLowerCase().includes(q));
  }, [state.members, query]);

  // Initialize per-member amount inputs when period changes
  useEffect(() => {
    const map: Record<number, string> = {};
    const p = state.collections.find((c) => c.id === selectedPeriod);
    if (p) {
      p.payments.forEach((pay) => {
        map[pay.memberId] = String(pay.amount ?? "");
      });
    }
    setAmounts(map);
  }, [selectedPeriod, state.collections]);

  const getIsPaid = (memberId: number) =>
    !!period?.payments.some((p) => p.memberId === memberId);

  const saveAmount = (memberId: number) => {
    if (!selectedPeriod) return;
    const raw = amounts[memberId];
    const amt =
      raw === undefined || raw === ""
        ? period?.defaultContribution ?? 0
        : parseFloat(raw);
    dispatch({
      type: "UPSERT_PAYMENT",
      payload: {
        memberId,
        collectionPeriod: selectedPeriod,
        amount: isNaN(amt) ? period?.defaultContribution ?? 0 : amt,
        date: new Date().toISOString(),
      },
    });
  };

  const clearAmount = (memberId: number) => {
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

  const markAll = (paid: boolean) => {
    if (!selectedPeriod || !period) return;
    const paidSet = new Set(period.payments.map((p) => p.memberId));
    state.members.forEach((m) => {
      const isPaid = paidSet.has(m.id);
      if (paid && !isPaid) {
        const amt = period.defaultContribution ?? 0;
        dispatch({
          type: "ADD_PAYMENT",
          payload: {
            memberId: m.id,
            amount: amt,
            date: new Date().toISOString(),
            collectionPeriod: selectedPeriod,
          },
        });
      } else if (!paid && isPaid) {
        dispatch({
          type: "REMOVE_PAYMENT",
          payload: { memberId: m.id, collectionPeriod: selectedPeriod },
        });
      }
    });
  };

  // Member CRUD functions
  const addMember = () => {
    if (!newMemberName.trim()) return;
    dispatch({
      type: "ADD_MEMBER",
      payload: { name: newMemberName.trim() },
    });
    setNewMemberName("");
    setShowAddMember(false);
  };

  const updateMember = () => {
    if (!editingMember || !editingMember.name.trim()) return;
    dispatch({
      type: "UPDATE_MEMBER",
      payload: { memberId: editingMember.id, name: editingMember.name.trim() },
    });
    setEditingMember(null);
  };

  const deleteMember = (memberId: number, memberName: string) => {
    const confirmDelete = confirm(
      `Are you sure you want to delete "${memberName}"? This will also remove all their payments, loans, and repayments. This action cannot be undone.`
    );
    if (confirmDelete) {
      dispatch({
        type: "DELETE_MEMBER",
        payload: { memberId },
      });
    }
  };

  // Stats calculations
  const totalPaid = period?.payments.length || 0;
  const totalMembers = state.members.length;
  const totalCollected = period?.totalCollected || 0;
  const paymentProgress =
    totalMembers > 0 ? (totalPaid / totalMembers) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-8">
      <div className="container mx-auto max-w-6xl">
        {/* Mobile-Optimized Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10 px-4 py-4 md:relative md:bg-transparent md:border-0 md:px-6 md:pt-8">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                👥 Members
              </h1>
              <p className="text-sm text-gray-500 mt-1 hidden md:block">
                Manage your cooperative members and track their payments
              </p>
            </div>
            <Badge variant="info" className="hidden md:inline-flex">
              {totalMembers} members
            </Badge>
          </div>

          {/* Mobile Search Bar - Always visible */}
          <div className="md:hidden">
            <Input
              type="text"
              placeholder="Search members..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full"
              icon={
                <svg
                  className="h-4 w-4 text-gray-400"
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
          </div>
        </div>

        {/* Horizontal Scrollable Stats - Mobile */}
        <div className="md:hidden px-4 py-4 overflow-x-auto">
          <div className="flex gap-3 pb-2">
            <Card className="min-w-[140px] p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <div className="flex flex-col items-center text-center">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mb-2">
                  <span className="text-white">👥</span>
                </div>
                <p className="text-blue-600 text-xs font-medium">Members</p>
                <p className="text-xl font-bold text-blue-900">{totalMembers}</p>
              </div>
            </Card>

            <Card className="min-w-[140px] p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <div className="flex flex-col items-center text-center">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mb-2">
                  <span className="text-white">💳</span>
                </div>
                <p className="text-green-600 text-xs font-medium">Paid</p>
                <p className="text-xl font-bold text-green-900">
                  {totalPaid}/{totalMembers}
                </p>
              </div>
            </Card>

            <Card className="min-w-[140px] p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <div className="flex flex-col items-center text-center">
                <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center mb-2">
                  <span className="text-white">💰</span>
                </div>
                <p className="text-purple-600 text-xs font-medium">Collected</p>
                <p className="text-xl font-bold text-purple-900">
                  ₱{totalCollected.toLocaleString()}
                </p>
              </div>
            </Card>

            {selectedPeriod && (
              <Card className="min-w-[140px] p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <div className="flex flex-col items-center text-center">
                  <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center mb-2">
                    <span className="text-white">📊</span>
                  </div>
                  <p className="text-orange-600 text-xs font-medium">Progress</p>
                  <p className="text-xl font-bold text-orange-900">
                    {Math.round(paymentProgress)}%
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Desktop Stats Grid */}
        <div className="hidden md:grid md:grid-cols-3 gap-6 mb-8 px-6">
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">
                  Total Members
                </p>
                <p className="text-2xl font-bold text-blue-900">
                  {totalMembers}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl">👥</span>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">
                  Payments Made
                </p>
                <p className="text-2xl font-bold text-green-900">
                  {totalPaid} / {totalMembers}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl">💳</span>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 text-sm font-medium">
                  Total Collected
                </p>
                <p className="text-2xl font-bold text-purple-900">
                  ₱{totalCollected.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl">💰</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Mobile Period Selector */}
        <div className="md:hidden px-4 mb-4">
          <Select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            options={[
              { value: "", label: "📅 Select Period" },
              ...state.collections.map((p) => ({
                value: p.id,
                label: `${format(new Date(p.date), "MMM d")} - ₱${p.totalCollected.toLocaleString()}`,
              })),
            ]}
            className="text-sm"
          />
        </div>

        {/* Desktop Controls Section */}
        <div className="hidden md:grid md:grid-cols-3 gap-6 mb-8 px-6">
          {/* Period Selection */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Collection Period
            </h3>
            <Select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              options={[
                { value: "", label: "Select Period" },
                ...state.collections.map((p) => ({
                  value: p.id,
                  label: `${format(
                    new Date(p.date),
                    "MMM d, yyyy"
                  )} - ₱${p.totalCollected.toLocaleString()}`,
                })),
              ]}
            />
          </Card>

          {/* Search */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Search Members
            </h3>
            <Input
              type="text"
              placeholder="Search by name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              icon={
                <svg
                  className="h-4 w-4 text-gray-400"
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
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Quick Actions
            </h3>
            <div className="space-y-3">
              <Button
                onClick={() => setShowAddMember(true)}
                variant="primary"
                className="w-full"
              >
                + Add Member
              </Button>
              {selectedPeriod && (
                <div className="flex space-x-2">
                  <Button
                    onClick={() => markAll(true)}
                    variant="success"
                    size="sm"
                    className="flex-1"
                  >
                    Mark All Paid
                  </Button>
                  <Button
                    onClick={() => markAll(false)}
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                  >
                    Mark All Unpaid
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Desktop Progress Bar */}
        {selectedPeriod && (
          <Card className="hidden md:block p-6 mb-8 mx-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold text-gray-900">
                Payment Progress
              </h3>
              <span className="text-sm font-medium text-gray-600">
                {Math.round(paymentProgress)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-green-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${paymentProgress}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {totalPaid} of {totalMembers} members have paid
            </p>
          </Card>
        )}

        {/* Members List */}
        <div className="md:mx-6">
          <Card className="overflow-hidden md:rounded-lg rounded-none">
            <div className="px-4 md:px-6 py-4 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <h2 className="text-lg md:text-xl font-semibold text-gray-900">
                  Members
                </h2>
                <span className="text-xs md:text-sm text-gray-500">
                  {members.length}
                  {query && ` / ${state.members.length}`}
                </span>
              </div>
            </div>

            {members.length === 0 ? (
              <div className="p-8 md:p-12">
                <EmptyState
                  title="No Members Found"
                  description={
                    query
                      ? "No members match your search"
                      : "Add your first member to get started"
                  }
                  action={
                    <Button onClick={() => setShowAddMember(true)}>
                      Add First Member
                    </Button>
                  }
                />
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {members.map((member) => {
                  const isPaid = getIsPaid(member.id);
                  const payment = period?.payments.find(
                    (p) => p.memberId === member.id
                  );

                  return (
                    <div
                      key={member.id}
                      className="bg-white hover:bg-gray-50 transition-colors"
                    >
                      {editingMember?.id === member.id ? (
                        // Edit Mode
                        <div className="p-4 md:p-6 flex items-center space-x-3 md:space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-medium text-lg">
                              {editingMember.name[0]?.toUpperCase() || "?"}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <Input
                              value={editingMember.name}
                              onChange={(e) =>
                                setEditingMember({
                                  ...editingMember,
                                  name: e.target.value,
                                })
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") updateMember();
                                if (e.key === "Escape") setEditingMember(null);
                              }}
                              className="text-base"
                            />
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <Button
                              onClick={updateMember}
                              variant="primary"
                              size="sm"
                              className="min-w-[60px]"
                            >
                              Save
                            </Button>
                            <Button
                              onClick={() => setEditingMember(null)}
                              variant="secondary"
                              size="sm"
                              className="hidden md:inline-flex"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // Display Mode - Mobile Optimized
                        <div className="p-4 md:p-6">
                          <div className="flex items-start md:items-center justify-between gap-3">
                            {/* Member Info */}
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-white font-medium text-lg md:text-xl">
                                  {member.name[0]?.toUpperCase() || "?"}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-900 text-base md:text-lg truncate">
                                  {member.name}
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <p className="text-xs md:text-sm text-gray-500">
                                    ID: {member.id}
                                  </p>
                                  {selectedPeriod && isPaid && (
                                    <>
                                      <span className="text-gray-300">•</span>
                                      <Badge variant="success" className="md:hidden">
                                        Paid
                                      </Badge>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Desktop Actions */}
                            <div className="hidden md:flex items-center gap-3">
                              {selectedPeriod && (
                                <>
                                  {isPaid ? (
                                    <>
                                      <Badge variant="success">Paid</Badge>
                                      <span className="font-semibold text-green-600">
                                        ₱{payment?.amount?.toLocaleString() || 0}
                                      </span>
                                      <Button
                                        onClick={() => clearAmount(member.id)}
                                        variant="secondary"
                                        size="sm"
                                      >
                                        Clear
                                      </Button>
                                    </>
                                  ) : (
                                    <div className="flex items-center gap-3">
                                      <Badge variant="error">Unpaid</Badge>
                                      <Input
                                        type="number"
                                        placeholder={
                                          period?.defaultContribution?.toString() ||
                                          "0"
                                        }
                                        value={amounts[member.id] || ""}
                                        onChange={(e) =>
                                          setAmounts((prev) => ({
                                            ...prev,
                                            [member.id]: e.target.value,
                                          }))
                                        }
                                        className="w-32 text-sm"
                                      />
                                      <Button
                                        onClick={() => saveAmount(member.id)}
                                        variant="success"
                                        size="sm"
                                      >
                                        Pay
                                      </Button>
                                    </div>
                                  )}
                                </>
                              )}
                              <Button
                                onClick={() =>
                                  setEditingMember({
                                    id: member.id,
                                    name: member.name,
                                  })
                                }
                                variant="ghost"
                                size="sm"
                              >
                                Edit
                              </Button>
                              <Button
                                onClick={() =>
                                  deleteMember(member.id, member.name)
                                }
                                variant="danger"
                                size="sm"
                              >
                                Delete
                              </Button>
                            </div>

                            {/* Mobile Menu Button */}
                            <button
                              className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                              onClick={() => {
                                // Toggle mobile actions menu
                                const menu = document.getElementById(
                                  `mobile-menu-${member.id}`
                                );
                                if (menu) {
                                  menu.classList.toggle("hidden");
                                }
                              }}
                            >
                              <svg
                                className="w-5 h-5 text-gray-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                                />
                              </svg>
                            </button>
                          </div>

                          {/* Mobile Actions - Collapsible */}
                          <div
                            id={`mobile-menu-${member.id}`}
                            className="hidden md:hidden mt-4 pt-4 border-t border-gray-100 space-y-3"
                          >
                            {selectedPeriod && (
                              <div className="space-y-3">
                                {isPaid ? (
                                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="success">Paid</Badge>
                                      <span className="font-semibold text-green-600">
                                        ₱{payment?.amount?.toLocaleString() || 0}
                                      </span>
                                    </div>
                                    <Button
                                      onClick={() => clearAmount(member.id)}
                                      variant="secondary"
                                      size="sm"
                                    >
                                      Clear
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="error">Unpaid</Badge>
                                    </div>
                                    <div className="flex gap-2">
                                      <Input
                                        type="number"
                                        placeholder={
                                          period?.defaultContribution?.toString() ||
                                          "Amount"
                                        }
                                        value={amounts[member.id] || ""}
                                        onChange={(e) =>
                                          setAmounts((prev) => ({
                                            ...prev,
                                            [member.id]: e.target.value,
                                          }))
                                        }
                                        className="flex-1 text-base h-11"
                                      />
                                      <Button
                                        onClick={() => saveAmount(member.id)}
                                        variant="success"
                                        size="sm"
                                        className="px-6 h-11"
                                      >
                                        Pay
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            <div className="flex gap-2">
                              <Button
                                onClick={() =>
                                  setEditingMember({
                                    id: member.id,
                                    name: member.name,
                                  })
                                }
                                variant="ghost"
                                size="sm"
                                className="flex-1 h-11"
                              >
                                ✏️ Edit
                              </Button>
                              <Button
                                onClick={() =>
                                  deleteMember(member.id, member.name)
                                }
                                variant="danger"
                                size="sm"
                                className="flex-1 h-11"
                              >
                                🗑️ Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Floating Action Button - Mobile Only */}
      <button
        onClick={() => setShowAddMember(true)}
        className="md:hidden fixed bottom-20 right-4 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-20 active:scale-95"
        aria-label="Add Member"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M12 4v16m8-8H4"
          />
        </svg>
      </button>

      {/* Mobile Bottom Actions Bar */}
      {selectedPeriod && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-10 shadow-lg">
          <div className="flex gap-2">
            <Button
              onClick={() => markAll(true)}
              variant="success"
              size="sm"
              className="flex-1 h-12 font-medium"
            >
              ✓ Mark All Paid
            </Button>
            <Button
              onClick={() => markAll(false)}
              variant="secondary"
              size="sm"
              className="flex-1 h-12 font-medium"
            >
              ✗ Clear All
            </Button>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      <Modal
        isOpen={showAddMember}
        onClose={() => setShowAddMember(false)}
        title="Add New Member"
      >
        <div className="space-y-4">
          <Input
            label="Member Name"
            value={newMemberName}
            onChange={(e) => setNewMemberName(e.target.value)}
            placeholder="Enter member name"
            onKeyDown={(e) => {
              if (e.key === "Enter") addMember();
            }}
            className="text-base h-12"
          />
          <div className="flex flex-col-reverse md:flex-row justify-end gap-2 md:gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowAddMember(false)}
              className="w-full md:w-auto h-12 md:h-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={addMember}
              disabled={!newMemberName.trim()}
              className="w-full md:w-auto h-12 md:h-auto"
            >
              Add Member
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function Members() {
  return (
    <ProtectedRoute>
      <MembersContent />
    </ProtectedRoute>
  );
}
