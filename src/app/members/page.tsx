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
    <div className="min-h-screen">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                👥 Members
              </h1>
              <p className="text-gray-600">
                Manage your cooperative members and track their payments
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant="info">{totalMembers} members</Badge>
              {selectedPeriod && (
                <Badge variant="success">
                  {format(new Date(selectedPeriod), "MMM dd")}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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

        {/* Controls Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
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

        {/* Progress Bar */}
        {selectedPeriod && (
          <Card className="p-6 mb-8">
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
        <Card className="overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                Members List
              </h2>
              <span className="text-sm text-gray-500">
                {members.length} members
                {query && ` (filtered from ${state.members.length})`}
              </span>
            </div>
          </div>

          {members.length === 0 ? (
            <div className="p-12">
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
                    className="p-6 hover:bg-gray-50 transition-colors"
                  >
                    {editingMember?.id === member.id ? (
                      // Edit Mode
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-medium">
                            {editingMember.name[0]?.toUpperCase() || "?"}
                          </span>
                        </div>
                        <div className="flex-1">
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
                          />
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            onClick={updateMember}
                            variant="primary"
                            size="sm"
                          >
                            Save
                          </Button>
                          <Button
                            onClick={() => setEditingMember(null)}
                            variant="secondary"
                            size="sm"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // Display Mode
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-medium">
                              {member.name[0]?.toUpperCase() || "?"}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {member.name}
                            </h3>
                            <p className="text-sm text-gray-500">
                              Member #{member.id}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                          {selectedPeriod && (
                            <div className="flex items-center gap-3">
                              {isPaid ? (
                                <div className="flex items-center gap-2 sm:gap-3">
                                  <Badge variant="success">Paid</Badge>
                                  <span className="font-semibold text-green-600">
                                    ₱{payment?.amount?.toLocaleString() || 0}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                                  <Badge variant="error">Unpaid</Badge>
                                  <div className="flex gap-2 sm:gap-3">
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
                                      className="w-full sm:w-32 text-sm"
                                    />
                                    <Button
                                      onClick={() => saveAmount(member.id)}
                                      variant="success"
                                      size="sm"
                                    >
                                      Pay
                                    </Button>
                                  </div>
                                </div>
                              )}

                              {isPaid && (
                                <Button
                                  onClick={() => clearAmount(member.id)}
                                  variant="secondary"
                                  size="sm"
                                >
                                  Clear
                                </Button>
                              )}
                            </div>
                          )}

                          <div className="flex gap-2 sm:gap-3">
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
          />
          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setShowAddMember(false)}>
              Cancel
            </Button>
            <Button onClick={addMember} disabled={!newMemberName.trim()}>
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
