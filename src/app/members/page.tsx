"use client";

import { useCoop } from "@/context/CoopContext";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { format } from "date-fns";
import ProtectedRoute from "@/components/ProtectedRoute";

function MembersPage() {
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

  return (
    <main className="container mx-auto max-w-7xl px-4 py-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          Member Management
        </h1>
        <p className="text-gray-600 text-sm md:text-base mb-4">
          Rename members and manage their paid/unpaid status per collection
          period.
        </p>
      </div>

      {/* Member Management Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Member Management
          </h2>
          <button
            onClick={() => setShowAddMember(!showAddMember)}
            className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
          >
            {showAddMember ? "Cancel" : "+ Add Member"}
          </button>
        </div>

        {/* Add Member Form */}
        {showAddMember && (
          <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Member Name
                </label>
                <input
                  type="text"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="Enter member name"
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      addMember();
                    }
                  }}
                />
              </div>
              <button
                onClick={addMember}
                disabled={!newMemberName.trim()}
                className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Add Member
              </button>
            </div>
          </div>
        )}

        {/* Members List with Edit/Delete */}
        <div className="space-y-3">
          <div className="text-sm text-gray-600 mb-3">
            Total Members: {state.members.length}
          </div>
          <div className="max-h-60 overflow-y-auto">
            {state.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                {editingMember?.id === member.id ? (
                  <>
                    <input
                      type="text"
                      value={editingMember.name}
                      onChange={(e) =>
                        setEditingMember({
                          ...editingMember,
                          name: e.target.value,
                        })
                      }
                      className="flex-1 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mr-3"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          updateMember();
                        } else if (e.key === "Escape") {
                          setEditingMember(null);
                        }
                      }}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={updateMember}
                        className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 focus:outline-none"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingMember(null)}
                        className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 focus:outline-none"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex-1">
                      <span className="font-medium text-gray-900">
                        {member.name}
                      </span>
                      <span className="text-sm text-gray-500 ml-2">
                        #{member.id}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          setEditingMember({ id: member.id, name: member.name })
                        }
                        className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 focus:outline-none"
                        title="Edit member name"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteMember(member.id, member.name)}
                        className="px-3 py-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200 focus:outline-none"
                        title="Delete member (will remove all related data)"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Collection Period
          </label>
          <select
            className="w-full p-2 md:p-3 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm md:text-base"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
          >
            <option value="">Select Period</option>
            {state.collections.map((p) => (
              <option key={p.id} value={p.id}>
                {format(new Date(p.date), "MMM d, yyyy")} - ₱
                {p.totalCollected.toLocaleString()}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search Members
          </label>
          <input
            type="text"
            placeholder="Search by name"
            className="w-full p-2 md:p-3 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm md:text-base"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quick Actions
          </label>
          <div className="flex gap-2">
            <button
              disabled={!selectedPeriod}
              onClick={() => markAll(true)}
              className={clsx(
                "flex-1 inline-flex items-center justify-center px-3 py-2 text-sm rounded-md",
                selectedPeriod
                  ? "bg-green-600 text-white hover:bg-green-500"
                  : "bg-gray-300 text-gray-600 cursor-not-allowed"
              )}
            >
              Mark All Paid
            </button>
            <button
              disabled={!selectedPeriod}
              onClick={() => markAll(false)}
              className={clsx(
                "flex-1 inline-flex items-center justify-center px-3 py-2 text-sm rounded-md",
                selectedPeriod
                  ? "bg-gray-700 text-white hover:bg-gray-600"
                  : "bg-gray-300 text-gray-600 cursor-not-allowed"
              )}
            >
              Mark All Unpaid
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
        {/* Stats Summary */}
        <div className="mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-lg md:text-xl font-semibold text-gray-900">
                {members.length}
              </p>
              <p className="text-sm text-gray-600">Total Members</p>
            </div>
            {selectedPeriod && (
              <>
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-lg md:text-xl font-semibold text-green-600">
                    {members.filter((m) => getIsPaid(m.id)).length}
                  </p>
                  <p className="text-sm text-gray-600">Paid</p>
                </div>
                <div className="bg-red-50 p-3 rounded-lg">
                  <p className="text-lg md:text-xl font-semibold text-red-600">
                    {members.filter((m) => !getIsPaid(m.id)).length}
                  </p>
                  <p className="text-sm text-gray-600">Unpaid</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-lg md:text-xl font-semibold text-blue-600">
                    ₱{period?.defaultContribution ?? 0}
                  </p>
                  <p className="text-sm text-gray-600">Default Amount</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="text-sm text-gray-600 border-b">
                <th className="py-3 pr-4 font-medium">Member</th>
                <th className="py-3 pr-4 font-medium">Status</th>
                <th className="py-3 pr-4 font-medium">Amount</th>
                <th className="py-3 pr-4 font-medium">Periods Paid</th>
                <th className="py-3 pr-4 font-medium">Approved Loans</th>
                <th className="py-3 pr-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const paidCount = state.collections.reduce(
                  (acc, c) =>
                    c.payments.some((p) => p.memberId === m.id) ? acc + 1 : acc,
                  0
                );
                const approvedLoansTotal = state.loans
                  .filter((l) => l.memberId === m.id && l.status === "APPROVED")
                  .reduce((sum, l) => sum + (l.amount || 0), 0);
                const isPaid = getIsPaid(m.id);
                const currentPayment = period?.payments.find(
                  (p) => p.memberId === m.id
                );
                return (
                  <tr
                    key={m.id}
                    className="border-b last:border-0 hover:bg-gray-50"
                  >
                    <td className="py-3 pr-4 align-middle">
                      <input
                        className="w-full max-w-xs p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        value={m.name}
                        onChange={(e) =>
                          dispatch({
                            type: "UPDATE_MEMBER_NAME",
                            payload: { memberId: m.id, name: e.target.value },
                          })
                        }
                      />
                    </td>
                    <td className="py-3 pr-4 align-middle">
                      <span
                        className={clsx(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          isPaid
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        )}
                      >
                        {isPaid ? "Paid" : "Unpaid"}
                      </span>
                    </td>
                    <td className="py-3 pr-4 align-middle">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">₱</span>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          className="w-24 p-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                          placeholder={String(period?.defaultContribution ?? 0)}
                          value={
                            amounts[m.id] ??
                            (currentPayment
                              ? String(currentPayment.amount)
                              : "")
                          }
                          onChange={(e) =>
                            setAmounts((prev) => ({
                              ...prev,
                              [m.id]: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </td>
                    <td className="py-3 pr-4 align-middle text-center">
                      {paidCount}
                    </td>
                    <td className="py-3 pr-4 align-middle">
                      ₱{approvedLoansTotal.toLocaleString()}
                    </td>
                    <td className="py-3 pr-0 align-middle text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          disabled={!selectedPeriod}
                          onClick={() => saveAmount(m.id)}
                          className={clsx(
                            "inline-flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                            selectedPeriod
                              ? "bg-indigo-600 text-white hover:bg-indigo-500"
                              : "bg-gray-300 text-gray-600 cursor-not-allowed"
                          )}
                        >
                          {isPaid ? "Update" : "Save"}
                        </button>
                        <button
                          disabled={!selectedPeriod || !isPaid}
                          onClick={() => clearAmount(m.id)}
                          className={clsx(
                            "inline-flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                            selectedPeriod && isPaid
                              ? "bg-gray-700 text-white hover:bg-gray-600"
                              : "bg-gray-300 text-gray-600 cursor-not-allowed"
                          )}
                        >
                          Clear
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Card Layout */}
        <div className="md:hidden space-y-4">
          {members.map((m) => {
            const paidCount = state.collections.reduce(
              (acc, c) =>
                c.payments.some((p) => p.memberId === m.id) ? acc + 1 : acc,
              0
            );
            const approvedLoansTotal = state.loans
              .filter((l) => l.memberId === m.id && l.status === "APPROVED")
              .reduce((sum, l) => sum + (l.amount || 0), 0);
            const isPaid = getIsPaid(m.id);
            const currentPayment = period?.payments.find(
              (p) => p.memberId === m.id
            );

            return (
              <div key={m.id} className="bg-gray-50 p-4 rounded-lg border">
                <div className="flex items-center justify-between mb-3">
                  <input
                    className="flex-1 mr-3 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium"
                    value={m.name}
                    onChange={(e) =>
                      dispatch({
                        type: "UPDATE_MEMBER_NAME",
                        payload: { memberId: m.id, name: e.target.value },
                      })
                    }
                  />
                  <span
                    className={clsx(
                      "px-2 py-1 rounded-full text-xs font-medium",
                      isPaid
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    )}
                  >
                    {isPaid ? "Paid" : "Unpaid"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div>
                    <p className="text-gray-500 mb-1">Periods Paid</p>
                    <p className="font-medium">{paidCount}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Approved Loans</p>
                    <p className="font-medium">
                      ₱{approvedLoansTotal.toLocaleString()}
                    </p>
                  </div>
                </div>

                {selectedPeriod && (
                  <>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Amount
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">₱</span>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          className="flex-1 p-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                          placeholder={String(period?.defaultContribution ?? 0)}
                          value={
                            amounts[m.id] ??
                            (currentPayment
                              ? String(currentPayment.amount)
                              : "")
                          }
                          onChange={(e) =>
                            setAmounts((prev) => ({
                              ...prev,
                              [m.id]: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => saveAmount(m.id)}
                        className="flex-1 bg-indigo-600 text-white py-2 px-3 rounded-md text-sm font-medium hover:bg-indigo-500 transition-colors"
                      >
                        {isPaid ? "Update" : "Save"}
                      </button>
                      <button
                        disabled={!isPaid}
                        onClick={() => clearAmount(m.id)}
                        className={clsx(
                          "flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors",
                          isPaid
                            ? "bg-gray-700 text-white hover:bg-gray-600"
                            : "bg-gray-300 text-gray-600 cursor-not-allowed"
                        )}
                      >
                        Clear
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}

export default function Members() {
  return (
    <ProtectedRoute>
      <MembersPage />
    </ProtectedRoute>
  );
}
