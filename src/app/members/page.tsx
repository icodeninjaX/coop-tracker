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

  return (
    <main className="container mx-auto max-w-6xl p-6">
      <h1 className="text-3xl font-bold mb-2 text-gray-900">
        Member Management
      </h1>
      <p className="text-gray-600 mb-6">
        Rename members and manage their paid/unpaid status per collection
        period.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Collection Period
          </label>
          <select
            className="w-full p-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
          >
            <option value="">Select Period</option>
            {state.collections.map((p) => (
              <option key={p.id} value={p.id}>
                {format(new Date(p.date), "MMMM d, yyyy")} - ₱
                {p.totalCollected.toLocaleString()}
              </option>
            ))}
          </select>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search Members
          </label>
          <input
            type="text"
            placeholder="Search by name"
            className="w-full p-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-end gap-2">
          <button
            disabled={!selectedPeriod}
            onClick={() => markAll(true)}
            className={clsx(
              "flex-1 inline-flex items-center justify-center px-3 py-2 rounded-md",
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
              "flex-1 inline-flex items-center justify-center px-3 py-2 rounded-md",
              selectedPeriod
                ? "bg-gray-700 text-white hover:bg-gray-600"
                : "bg-gray-300 text-gray-600 cursor-not-allowed"
            )}
          >
            Mark All Unpaid
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="text-sm text-gray-600 border-b">
                <th className="py-2 pr-4">Member</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Amount</th>
                <th className="py-2 pr-4">Periods Paid</th>
                <th className="py-2 pr-4">Approved Loans</th>
                <th className="py-2 pr-4 text-right">Actions</th>
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
                  <tr key={m.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 align-middle w-[320px]">
                      <input
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        value={m.name}
                        onChange={(e) =>
                          dispatch({
                            type: "UPDATE_MEMBER_NAME",
                            payload: { memberId: m.id, name: e.target.value },
                          })
                        }
                      />
                    </td>
                    <td className="py-2 pr-4 align-middle">
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
                    <td className="py-2 pr-4 align-middle w-[180px]">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          className="w-32 p-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                        <span className="text-sm text-gray-500">₱</span>
                      </div>
                    </td>
                    <td className="py-2 pr-4 align-middle">{paidCount}</td>
                    <td className="py-2 pr-4 align-middle">
                      ₱{approvedLoansTotal.toLocaleString()}
                    </td>
                    <td className="py-2 pr-0 align-middle text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          disabled={!selectedPeriod}
                          onClick={() => saveAmount(m.id)}
                          className={clsx(
                            "inline-flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium",
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
                            "inline-flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium",
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
