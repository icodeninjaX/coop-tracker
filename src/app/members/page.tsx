"use client";

import { useCoop } from "@/context/CoopContext";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  Button,
  Card,
  Input,
  Badge,
  EmptyState,
  Modal,
} from "@/components/UI";

function MembersContent() {
  const { state, dispatch } = useCoop();
  const router = useRouter();
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
  const [showPeriodBrowser, setShowPeriodBrowser] = useState<boolean>(false);
  const [periodSearchQuery, setPeriodSearchQuery] = useState<string>("");

  const period = useMemo(
    () => state.collections.find((c) => c.id === selectedPeriod),
    [state.collections, selectedPeriod]
  );

  const members = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return state.members;
    return state.members.filter((m) => m.name.toLowerCase().includes(q));
  }, [state.members, query]);

  // Filter periods based on search query
  const filteredPeriods = useMemo(() => {
    const q = periodSearchQuery.trim().toLowerCase();
    if (!q) return state.collections;
    return state.collections.filter((p) => {
      const dateStr = format(new Date(p.date), "MMMM d, yyyy").toLowerCase();
      const amountStr = p.totalCollected.toString();
      return dateStr.includes(q) || amountStr.includes(q);
    });
  }, [state.collections, periodSearchQuery]);

  // Helper function to select period and close modal
  const selectPeriod = (periodId: string) => {
    setSelectedPeriod(periodId);
    setShowPeriodBrowser(false);
    setPeriodSearchQuery("");
  };

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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 pb-20 md:pb-8">
      <div className="container mx-auto max-w-7xl">
        {/* Mobile-Optimized Header */}
        <div className="bg-white/80 backdrop-blur-sm border-b-2 border-indigo-200 sticky top-0 z-10 px-4 py-4 md:relative md:bg-transparent md:border-0 md:px-6 md:pt-8">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold text-indigo-900 tracking-tight">
                Members
              </h1>
              <p className="text-sm text-indigo-600 mt-1 hidden md:block font-light">
                Manage your cooperative members and track their payments
              </p>
            </div>
            <Badge variant="info" className="hidden md:inline-flex text-xs font-normal">
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
                  className="h-4 w-4 text-neutral-400"
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

        {/* Stats Grid - Mobile (Fixed 3 Columns) */}
        <div className="md:hidden px-4 py-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/80 backdrop-blur-sm border-2 border-indigo-200 rounded-xl p-3 transition-all duration-200 hover:shadow-md">
              <p className="text-xs uppercase tracking-wider text-indigo-600 font-normal mb-1">
                Members
              </p>
              <p className="text-base font-semibold text-indigo-900">{totalMembers}</p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm border-2 border-emerald-200 rounded-xl p-3 transition-all duration-200 hover:shadow-md">
              <p className="text-xs uppercase tracking-wider text-emerald-600 font-normal mb-1">
                Paid
              </p>
              <p className="text-base font-semibold text-emerald-900">
                {totalPaid}/{totalMembers}
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm border-2 border-purple-200 rounded-xl p-3 transition-all duration-200 hover:shadow-md">
              <p className="text-xs uppercase tracking-wider text-purple-600 font-normal mb-1">
                Collected
              </p>
              <p className="text-base font-semibold text-purple-900">
                ₱{totalCollected.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Desktop Stats Grid */}
        <div className="hidden md:grid md:grid-cols-3 gap-6 mb-8 px-6">
          <div className="bg-white/80 backdrop-blur-sm border-2 border-indigo-200 rounded-xl p-3 sm:p-4 lg:p-6 transition-all duration-200 hover:shadow-md hover:border-indigo-300">
            <p className="text-xs uppercase tracking-wider text-indigo-600 font-normal mb-1 sm:mb-2">
              Total Members
            </p>
            <p className="text-base sm:text-xl lg:text-2xl xl:text-3xl font-semibold text-indigo-900 break-all">
              {totalMembers}
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm border-2 border-emerald-200 rounded-xl p-3 sm:p-4 lg:p-6 transition-all duration-200 hover:shadow-md hover:border-emerald-300">
            <p className="text-xs uppercase tracking-wider text-emerald-600 font-normal mb-1 sm:mb-2">
              Payments Made
            </p>
            <p className="text-base sm:text-xl lg:text-2xl xl:text-3xl font-semibold text-emerald-900 break-all">
              {totalPaid} / {totalMembers}
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm border-2 border-purple-200 rounded-xl p-3 sm:p-4 lg:p-6 transition-all duration-200 hover:shadow-md hover:border-purple-300">
            <p className="text-xs uppercase tracking-wider text-purple-600 font-normal mb-1 sm:mb-2">
              Total Collected
            </p>
            <p className="text-base sm:text-xl lg:text-2xl xl:text-3xl font-semibold text-purple-900 break-all">
              ₱{totalCollected.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Mobile Period Selector Button */}
        <div className="md:hidden px-4 mb-4">
          <button
            onClick={() => setShowPeriodBrowser(true)}
            className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 border-indigo-200 rounded-lg hover:border-indigo-300 hover:bg-white transition-all duration-200 flex items-center justify-between min-h-[52px]"
          >
            <div className="flex items-center gap-3">
              <svg
                className="w-5 h-5 text-indigo-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <div className="text-left">
                {period ? (
                  <>
                    <p className="text-sm font-semibold text-indigo-900">
                      {format(new Date(period.date), "MMMM d, yyyy")}
                    </p>
                    <p className="text-xs text-indigo-600">
                      ₱{period.totalCollected.toLocaleString()} collected
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-indigo-600 font-normal">
                    Select Collection Period
                  </p>
                )}
              </div>
            </div>
            <svg
              className="w-5 h-5 text-indigo-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>

        {/* Desktop Controls Section */}
        <div className="hidden md:grid md:grid-cols-3 gap-6 mb-8 px-6">
          {/* Period Selection */}
          <Card className="p-6">
            <h3 className="text-lg font-normal text-indigo-900 mb-4">
              Collection Period
            </h3>
            <button
              onClick={() => setShowPeriodBrowser(true)}
              className="w-full px-4 py-3 bg-white border-2 border-indigo-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200 flex items-center justify-between min-h-[52px]"
            >
              <div className="flex items-center gap-3">
                <svg
                  className="w-5 h-5 text-indigo-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <div className="text-left">
                  {period ? (
                    <>
                      <p className="text-sm font-semibold text-indigo-900">
                        {format(new Date(period.date), "MMMM d, yyyy")}
                      </p>
                      <p className="text-xs text-indigo-600">
                        ₱{period.totalCollected.toLocaleString()}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-indigo-600">Browse Periods</p>
                  )}
                </div>
              </div>
              <svg
                className="w-5 h-5 text-indigo-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </Card>

          {/* Search */}
          <Card className="p-6">
            <h3 className="text-lg font-normal text-indigo-900 mb-4">
              Search Members
            </h3>
            <Input
              type="text"
              placeholder="Search by name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              icon={
                <svg
                  className="h-4 w-4 text-indigo-400"
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
            <h3 className="text-lg font-normal text-indigo-900 mb-4">
              Quick Actions
            </h3>
            <div className="space-y-3">
              <button
                onClick={() => setShowAddMember(true)}
                className="w-full px-5 py-2.5 bg-indigo-300 text-indigo-900 text-sm font-normal rounded-md hover:bg-indigo-400 shadow-sm transition-all duration-200 min-h-[44px]"
              >
                Add Member
              </button>
              {selectedPeriod && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => markAll(true)}
                    className="flex-1 px-4 py-2 border-2 border-indigo-200 text-indigo-800 text-sm font-normal rounded-md hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200 min-h-[44px]"
                  >
                    Mark All Paid
                  </button>
                  <button
                    onClick={() => markAll(false)}
                    className="flex-1 px-4 py-2 border-2 border-indigo-200 text-indigo-800 text-sm font-normal rounded-md hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200 min-h-[44px]"
                  >
                    Clear All
                  </button>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Desktop Progress Bar */}
        {selectedPeriod && (
          <Card className="hidden md:block p-6 mb-8 mx-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-normal text-indigo-900">
                Payment Progress
              </h3>
              <span className="text-sm font-normal text-indigo-600">
                {Math.round(paymentProgress)}%
              </span>
            </div>
            <div className="w-full bg-indigo-100 rounded-full h-3">
              <div
                className="bg-indigo-400 h-3 rounded-full transition-all duration-500"
                style={{ width: `${paymentProgress}%` }}
              />
            </div>
            <p className="text-sm text-indigo-600 mt-2 font-light">
              {totalPaid} of {totalMembers} members have paid
            </p>
          </Card>
        )}

        {/* Members List */}
        <div className="md:mx-6">
          <Card className="overflow-hidden md:rounded-lg rounded-none">
            <div className="px-4 md:px-6 py-4 border-b-2 border-indigo-200 bg-white/80 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg md:text-xl font-normal text-indigo-900">
                  Members List
                </h2>
                <span className="text-xs md:text-sm text-indigo-600 font-light">
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
              <div className="divide-y divide-indigo-100">
                {members.map((member) => {
                  const isPaid = getIsPaid(member.id);
                  const payment = period?.payments.find(
                    (p) => p.memberId === member.id
                  );

                  return (
                    <div
                      key={member.id}
                      className="bg-white hover:bg-indigo-50/50 transition-colors"
                    >
                      {editingMember?.id === member.id ? (
                        // Edit Mode
                        <div className="p-4 md:p-6 flex items-center space-x-3 md:space-x-4">
                          <div className="w-12 h-12 bg-indigo-400 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-normal text-lg">
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
                              <div className="w-12 h-12 md:w-14 md:h-14 bg-indigo-400 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-white font-normal text-lg md:text-xl">
                                  {member.name[0]?.toUpperCase() || "?"}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-normal text-indigo-900 text-base md:text-lg truncate">
                                  {member.name}
                                </h3>
                                {/* ID, Shares, and Paid Status */}
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <p className="text-xs md:text-sm text-indigo-600">
                                    ID: {member.id}
                                  </p>
                                  <span className="text-neutral-300">•</span>
                                  <p className="text-xs md:text-sm text-purple-600 font-medium">
                                    {(member.committedShares || 0).toFixed(2)} shares
                                  </p>
                                  {selectedPeriod && (
                                    <>
                                      <span className="text-neutral-300">•</span>
                                      {isPaid ? (
                                        <p className="text-xs md:text-sm text-emerald-600 font-medium md:hidden">
                                          Paid
                                        </p>
                                      ) : (
                                        <p className="text-xs md:text-sm text-rose-400 font-medium md:hidden">
                                          Unpaid
                                        </p>
                                      )}
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
                                      <span className="font-normal text-indigo-900">
                                        ₱{payment?.amount?.toLocaleString() || 0}
                                      </span>
                                      <button
                                        onClick={() => clearAmount(member.id)}
                                        className="px-4 py-2 border-2 border-indigo-200 text-indigo-800 text-sm font-normal rounded-md hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200 min-h-[44px]"
                                      >
                                        Clear
                                      </button>
                                    </>
                                  ) : (
                                    <div className="flex items-center gap-3">
                                      <Badge variant="warning">Unpaid</Badge>
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
                                      <button
                                        onClick={() => saveAmount(member.id)}
                                        className="px-4 py-2 bg-indigo-300 text-indigo-900 text-sm font-normal rounded-md hover:bg-indigo-400 shadow-sm transition-all duration-200 min-h-[44px]"
                                      >
                                        Pay
                                      </button>
                                    </div>
                                  )}
                                </>
                              )}
                              <button
                                onClick={() => router.push(`/members/${member.id}`)}
                                className="px-4 py-2 bg-purple-200 text-purple-800 text-sm font-normal rounded-md hover:bg-purple-300 shadow-sm transition-all duration-200 min-h-[44px]"
                              >
                                View Details
                              </button>
                              <button
                                onClick={() =>
                                  setEditingMember({
                                    id: member.id,
                                    name: member.name,
                                  })
                                }
                                className="px-4 py-2 border-2 border-indigo-200 text-indigo-800 text-sm font-normal rounded-md hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200 min-h-[44px]"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() =>
                                  deleteMember(member.id, member.name)
                                }
                                className="px-4 py-2 bg-rose-200 text-rose-800 text-sm font-normal rounded-md hover:bg-rose-300 shadow-sm transition-all duration-200 min-h-[44px]"
                              >
                                Delete
                              </button>
                            </div>

                            {/* Mobile Menu Button */}
                            <button
                              className="md:hidden px-3 py-2 bg-indigo-100 hover:bg-indigo-200 rounded-lg transition-all duration-200 flex-shrink-0 active:scale-95"
                              onClick={() => {
                                // Toggle mobile actions menu
                                const menu = document.getElementById(
                                  `mobile-menu-${member.id}`
                                );
                                if (menu) {
                                  menu.classList.toggle("hidden");
                                }
                              }}
                              aria-label="More actions"
                            >
                              <svg
                                className="w-5 h-5 text-indigo-700"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                              </svg>
                            </button>
                          </div>

                          {/* Mobile Actions - Collapsible */}
                          <div
                            id={`mobile-menu-${member.id}`}
                            className="hidden md:hidden mt-4 pt-4 border-t border-indigo-100 space-y-3"
                          >
                            {selectedPeriod && (
                              <div className="space-y-3">
                                {isPaid ? (
                                  <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm text-emerald-700 font-medium">Paid:</p>
                                      <span className="font-semibold text-emerald-900">
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
                                      <button
                                        onClick={() => saveAmount(member.id)}
                                        className="px-6 h-11 bg-emerald-200 text-emerald-800 text-sm font-normal rounded-md hover:bg-emerald-300 shadow-sm transition-all duration-200"
                                      >
                                        Pay
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            <button
                              onClick={() => router.push(`/members/${member.id}`)}
                              className="w-full h-11 px-4 py-2 bg-purple-200 text-purple-800 text-sm font-normal rounded-md hover:bg-purple-300 shadow-sm transition-all duration-200"
                            >
                              View Details
                            </button>
                            <div className="flex gap-2">
                              <button
                                onClick={() =>
                                  setEditingMember({
                                    id: member.id,
                                    name: member.name,
                                  })
                                }
                                className="flex-1 h-11 px-4 py-2 border-2 border-indigo-200 text-indigo-800 text-sm font-normal rounded-md hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() =>
                                  deleteMember(member.id, member.name)
                                }
                                className="flex-1 h-11 px-4 py-2 bg-rose-200 text-rose-800 text-sm font-normal rounded-md hover:bg-rose-300 shadow-sm transition-all duration-200"
                              >
                                Delete
                              </button>
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
        className="md:hidden fixed bottom-20 right-4 w-14 h-14 bg-indigo-400 hover:bg-indigo-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-20 active:scale-95"
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
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t-2 border-indigo-200 px-4 py-3 z-10 shadow-lg">
          <div className="flex gap-2">
            <button
              onClick={() => markAll(true)}
              className="flex-1 h-12 px-4 py-2 border-2 border-indigo-200 text-indigo-800 text-sm font-normal rounded-md hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200"
            >
              Mark All Paid
            </button>
            <button
              onClick={() => markAll(false)}
              className="flex-1 h-12 px-4 py-2 border-2 border-indigo-200 text-indigo-800 text-sm font-normal rounded-md hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200"
            >
              Clear All
            </button>
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

      {/* Period Browser Modal */}
      <Modal
        isOpen={showPeriodBrowser}
        onClose={() => {
          setShowPeriodBrowser(false);
          setPeriodSearchQuery("");
        }}
        title="Select Collection Period"
        size="lg"
      >
        <div className="space-y-4">
          {/* Search Bar */}
          <Input
            type="text"
            placeholder="Search by date or amount..."
            value={periodSearchQuery}
            onChange={(e) => setPeriodSearchQuery(e.target.value)}
            icon={
              <svg
                className="h-4 w-4 text-indigo-400"
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

          {/* Period Count */}
          <div className="flex items-center justify-between text-sm">
            <p className="text-indigo-600 font-light">
              {filteredPeriods.length} period{filteredPeriods.length !== 1 ? "s" : ""} available
            </p>
            {selectedPeriod && (
              <button
                onClick={() => selectPeriod("")}
                className="text-rose-600 hover:text-rose-700 font-normal"
              >
                Clear Selection
              </button>
            )}
          </div>

          {/* Periods Grid */}
          <div className="max-h-[60vh] overflow-y-auto">
            {filteredPeriods.length === 0 ? (
              <EmptyState
                title="No Periods Found"
                description={
                  periodSearchQuery
                    ? "No periods match your search"
                    : "No collection periods available"
                }
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredPeriods
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((p) => {
                    const isSelected = p.id === selectedPeriod;
                    const paymentCount = p.payments.length;
                    const progress = totalMembers > 0 ? (paymentCount / totalMembers) * 100 : 0;

                    return (
                      <button
                        key={p.id}
                        onClick={() => selectPeriod(p.id)}
                        className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-left hover:shadow-md ${
                          isSelected
                            ? "border-indigo-400 bg-indigo-50 shadow-md"
                            : "border-indigo-200 bg-white hover:border-indigo-300"
                        }`}
                      >
                        {/* Selected Checkmark */}
                        {isSelected && (
                          <div className="absolute top-3 right-3">
                            <svg
                              className="w-6 h-6 text-indigo-600"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        )}

                        {/* Date */}
                        <div className="mb-3 pr-8">
                          <p className="text-base font-semibold text-indigo-900">
                            {format(new Date(p.date), "MMMM d, yyyy")}
                          </p>
                          <p className="text-xs text-indigo-600 mt-1">
                            {format(new Date(p.date), "EEEE")}
                          </p>
                        </div>

                        {/* Stats */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-indigo-600 font-light">Total Collected</span>
                            <span className="font-semibold text-indigo-900">
                              ₱{p.totalCollected.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-indigo-600 font-light">Payments Made</span>
                            <span className="font-semibold text-indigo-900">
                              {paymentCount} / {totalMembers}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs text-indigo-600 mb-1">
                            <span>Progress</span>
                            <span>{Math.round(progress)}%</span>
                          </div>
                          <div className="w-full bg-indigo-100 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                isSelected ? "bg-indigo-500" : "bg-indigo-300"
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </button>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-indigo-200">
            <Button
              variant="secondary"
              onClick={() => {
                setShowPeriodBrowser(false);
                setPeriodSearchQuery("");
              }}
              className="w-full sm:w-auto"
            >
              Close
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
