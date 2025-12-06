"use client";

import { useState, useRef, useEffect } from "react";
import { useCoop } from "@/context/CoopContext";
import { Button, Card } from "@/components/UI";
import ProtectedRoute from "@/components/ProtectedRoute";
import { format } from "date-fns";
import { calculateTotalShares, calculateExpectedContribution } from "@/lib/shareCalculations";

function SharesPage() {
  const { state, dispatch } = useCoop();
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showShareHistoryModal, setShowShareHistoryModal] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null);
  const [editSharesValue, setEditSharesValue] = useState("");
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setShowActionsMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Calculate totals
  const totalShares = calculateTotalShares(state.members);
  const totalInterestPool = state.totalInterestPool || 0;
  const perShareDividend = totalShares > 0 ? totalInterestPool / totalShares : 0;
  const sharePrice = state.sharePrice || 500;

  // Calculate total contributions per member
  const memberContributions = new Map<number, number>();
  state.collections.forEach((period) => {
    period.payments.forEach((payment) => {
      const current = memberContributions.get(payment.memberId) || 0;
      memberContributions.set(payment.memberId, current + payment.amount);
    });
  });

  // Get all members (sorted by committed shares descending)
  const sortedMembers = [...state.members].sort(
    (a, b) => (b.committedShares || 0) - (a.committedShares || 0)
  );

  // Handle dividend distribution
  const handleDistributeDividends = () => {
    if (totalInterestPool === 0) {
      alert("No interest pool to distribute!");
      return;
    }

    if (totalShares === 0) {
      alert("No shares to distribute dividends to!");
      return;
    }

    const confirm = window.confirm(
      `Distribute ₱${totalInterestPool.toLocaleString()} to ${totalShares.toFixed(2)} shares?\n\n` +
        `Per share dividend: ₱${perShareDividend.toLocaleString()}\n\n` +
        `This will reset the interest pool to ₱0.`
    );

    if (confirm) {
      dispatch({
        type: "DISTRIBUTE_DIVIDENDS",
        payload: { date: new Date().toISOString() },
      });
      alert("Dividends distributed successfully!");
    }
  };

  // Handle edit shares
  const handleEditShares = (memberId: number, currentShares: number) => {
    setEditingMemberId(memberId);
    // Set the amount (shares × sharePrice) instead of just shares
    setEditSharesValue(String(currentShares * sharePrice));
  };

  const handleSaveShares = (memberId: number) => {
    const amount = parseFloat(editSharesValue);

    if (isNaN(amount) || amount < 0) {
      alert("Please enter a valid non-negative amount");
      return;
    }

    // Calculate shares from amount (amount ÷ sharePrice)
    const shares = amount / sharePrice;

    dispatch({
      type: "UPDATE_MEMBER_SHARES",
      payload: { memberId, shares },
    });

    setEditingMemberId(null);
    setEditSharesValue("");
  };

  const handleCancelEdit = () => {
    setEditingMemberId(null);
    setEditSharesValue("");
  };

  // Handle forfeit interest
  const handleForfeitInterest = (memberId: number, memberName: string) => {
    const member = state.members.find((m) => m.id === memberId);
    if (!member) return;

    const potentialDividend = (member.committedShares || 0) * perShareDividend;

    const confirm = window.confirm(
      `Forfeit interest for ${memberName}?\n\n` +
        `Current shares: ${(member.committedShares || 0).toFixed(2)}\n` +
        `Potential dividend: ₱${potentialDividend.toLocaleString()}\n\n` +
        `Member will keep their shares but will NOT receive any dividends.`
    );

    if (confirm) {
      dispatch({
        type: "FORFEIT_INTEREST",
        payload: { memberId, date: new Date().toISOString() },
      });
    }
  };

  // Handle restore interest
  const handleRestoreInterest = (memberId: number, memberName: string) => {
    const confirm = window.confirm(
      `Restore interest for ${memberName}?\n\n` +
        `Member will be eligible to receive dividends again.`
    );

    if (confirm) {
      dispatch({
        type: "RESTORE_MEMBER_INTEREST",
        payload: { memberId },
      });
    }
  };

  return (
    <div className="container mx-auto max-w-7xl px-3 sm:px-6 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl sm:text-2xl font-semibold text-indigo-900">
            Share System
          </h1>
          {/* Actions Dropdown */}
          <div className="relative" ref={actionsMenuRef}>
            <Button
              size="sm"
              onClick={() => setShowActionsMenu(!showActionsMenu)}
            >
              Actions
              <svg
                className={`ml-1 w-4 h-4 transition-transform ${showActionsMenu ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </Button>
            {showActionsMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowActionsMenu(false)} />
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border-2 border-indigo-200 z-50 overflow-hidden">
                  <button
                    onClick={() => {
                      handleDistributeDividends();
                      setShowActionsMenu(false);
                    }}
                    disabled={totalInterestPool === 0 || totalShares === 0}
                    className="w-full px-4 py-3 flex items-start gap-3 hover:bg-emerald-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-indigo-900">Distribute Dividends</p>
                      <p className="text-xs text-indigo-500">Pay out interest pool to members</p>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setShowHistoryModal(true);
                      setShowActionsMenu(false);
                    }}
                    className="w-full px-4 py-3 flex items-start gap-3 hover:bg-purple-50 transition-colors text-left border-t border-indigo-100"
                  >
                    <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-indigo-900">Distribution History</p>
                      <p className="text-xs text-indigo-500">View past dividend distributions</p>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setShowShareHistoryModal(true);
                      setShowActionsMenu(false);
                    }}
                    className="w-full px-4 py-3 flex items-start gap-3 hover:bg-amber-50 transition-colors text-left border-t border-indigo-100"
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-indigo-900">Share Change History</p>
                      <p className="text-xs text-indigo-500">Track member share modifications</p>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
        <div className="bg-white/80 backdrop-blur-sm border border-indigo-200 rounded-lg p-2 sm:p-4 sm:border-2 sm:rounded-xl hover:shadow-md hover:border-indigo-300 transition-all duration-200">
          <p className="text-[10px] sm:text-xs uppercase tracking-wider text-indigo-600 mb-0.5 sm:mb-1">Total Shares</p>
          <p className="text-base sm:text-2xl font-semibold text-indigo-900">{totalShares.toFixed(2)}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-sm border border-emerald-200 rounded-lg p-2 sm:p-4 sm:border-2 sm:rounded-xl hover:shadow-md hover:border-emerald-300 transition-all duration-200">
          <p className="text-[10px] sm:text-xs uppercase tracking-wider text-emerald-600 mb-0.5 sm:mb-1">Interest Pool</p>
          <p className="text-base sm:text-xl font-semibold text-emerald-900">₱{totalInterestPool.toLocaleString()}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-sm border border-purple-200 rounded-lg p-2 sm:p-4 sm:border-2 sm:rounded-xl hover:shadow-md hover:border-purple-300 transition-all duration-200">
          <p className="text-[10px] sm:text-xs uppercase tracking-wider text-purple-600 mb-0.5 sm:mb-1">Per Share</p>
          <p className="text-base sm:text-xl font-semibold text-purple-900">₱{perShareDividend.toLocaleString()}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-sm border border-amber-200 rounded-lg p-2 sm:p-4 sm:border-2 sm:rounded-xl hover:shadow-md hover:border-amber-300 transition-all duration-200">
          <p className="text-[10px] sm:text-xs uppercase tracking-wider text-amber-600 mb-0.5 sm:mb-1">Share Price</p>
          <p className="text-base sm:text-2xl font-semibold text-amber-900">₱{sharePrice.toLocaleString()}</p>
        </div>
      </div>

      {/* Member Shares Table */}
      <Card className="p-3 sm:p-6">
        <h2 className="text-sm sm:text-base text-indigo-900 mb-3 font-medium">
          Member Shares
        </h2>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-indigo-200">
                <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-indigo-600 font-normal">
                  Member
                </th>
                <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-indigo-600 font-normal">
                  Shares
                </th>
                <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-indigo-600 font-normal">
                  Expected
                </th>
                <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-indigo-600 font-normal">
                  Contributed
                </th>
                <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-indigo-600 font-normal">
                  Dividend
                </th>
                <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-indigo-600 font-normal">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedMembers.map((member) => {
                const shares = member.committedShares || 0;
                const expectedContribution = calculateExpectedContribution(shares, sharePrice);
                const totalContributions = memberContributions.get(member.id) || 0;
                const potentialDividend = shares * perShareDividend;
                const isForfeited = member.forfeited || false;
                const isEditing = editingMemberId === member.id;

                return (
                  <tr
                    key={member.id}
                    className="border-b border-indigo-100 hover:bg-indigo-50/50 transition-colors"
                  >
                    <td className="py-2 px-3 text-sm text-indigo-900">
                      <div className="flex items-center gap-2">
                        {member.name}
                        {isForfeited && (
                          <span className="w-2 h-2 bg-rose-400 rounded-full" title="Forfeited" />
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-sm text-indigo-900 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-indigo-600 text-xs">₱</span>
                          <input
                            type="number"
                            min="0"
                            step="100"
                            value={editSharesValue}
                            onChange={(e) => setEditSharesValue(e.target.value)}
                            className="w-24 px-2 py-1 border border-indigo-300 rounded text-right text-sm"
                            autoFocus
                          />
                        </div>
                      ) : (
                        shares.toFixed(2)
                      )}
                    </td>
                    <td className="py-2 px-3 text-sm text-indigo-600 text-right">
                      ₱{expectedContribution.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-sm text-emerald-700 text-right font-medium">
                      ₱{totalContributions.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-sm text-right">
                      {isForfeited ? (
                        <span className="text-rose-500">₱0</span>
                      ) : (
                        <span className="text-indigo-900">₱{potentialDividend.toLocaleString()}</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <div className="flex justify-end gap-1">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleSaveShares(member.id)}
                              className="p-1.5 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200 transition-colors"
                              title="Save"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                              title="Cancel"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEditShares(member.id, shares)}
                              className="p-1.5 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 transition-colors"
                              title="Edit shares"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            {isForfeited ? (
                              <button
                                onClick={() => handleRestoreInterest(member.id, member.name)}
                                className="p-1.5 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200 transition-colors"
                                title="Restore interest"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleForfeitInterest(member.id, member.name)}
                                className="p-1.5 bg-rose-100 text-rose-700 rounded hover:bg-rose-200 transition-colors"
                                title="Forfeit interest"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-2">
          {sortedMembers.map((member) => {
            const shares = member.committedShares || 0;
            const totalContributions = memberContributions.get(member.id) || 0;
            const potentialDividend = shares * perShareDividend;
            const isForfeited = member.forfeited || false;
            const isEditing = editingMemberId === member.id;

            return (
              <div
                key={member.id}
                className="bg-indigo-50/50 rounded-lg p-2.5 border border-indigo-200"
              >
                <div className="flex items-center justify-between gap-2">
                  {/* Left: Member info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-sm font-medium text-indigo-900 truncate">
                        {member.name}
                      </span>
                      {isForfeited && (
                        <span className="w-2 h-2 bg-rose-400 rounded-full flex-shrink-0" title="Forfeited" />
                      )}
                      <span className="text-xs text-indigo-500">{shares.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-emerald-600 font-medium">₱{totalContributions.toLocaleString()}</span>
                      <span className="text-indigo-300">•</span>
                      <span className={isForfeited ? "text-rose-500" : "text-purple-600 font-medium"}>
                        {isForfeited ? "₱0" : `+₱${potentialDividend.toLocaleString()}`}
                      </span>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => handleSaveShares(member.id)}
                          className="p-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"
                          title="Save"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                          title="Cancel"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEditShares(member.id, shares)}
                          className="p-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors"
                          title="Edit shares"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {isForfeited ? (
                          <button
                            onClick={() => handleRestoreInterest(member.id, member.name)}
                            className="p-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"
                            title="Restore interest"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleForfeitInterest(member.id, member.name)}
                            className="p-2 bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200 transition-colors"
                            title="Forfeit interest"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Edit input row */}
                {isEditing && (
                  <div className="mt-2 pt-2 border-t border-indigo-200">
                    <div className="flex items-center gap-2">
                      <span className="text-indigo-600 text-sm">₱</span>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={editSharesValue}
                        onChange={(e) => setEditSharesValue(e.target.value)}
                        className="flex-1 px-2 py-1.5 border border-indigo-300 rounded text-sm"
                        placeholder="Amount"
                        autoFocus
                      />
                      <span className="text-xs text-indigo-500">
                        = {(parseFloat(editSharesValue) / sharePrice || 0).toFixed(2)} shares
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Distribution History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-indigo-900/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b-2 border-indigo-200 p-4 sm:p-6 flex justify-between items-center">
              <h3 className="text-base sm:text-lg text-indigo-900">
                Dividend Distribution History
              </h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-indigo-400 hover:text-indigo-600 transition-colors"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="p-4 sm:p-6">
              {state.dividendDistributions.length === 0 ? (
                <p className="text-center py-8 text-indigo-400 font-light">
                  No dividend distributions yet
                </p>
              ) : (
                <div className="space-y-4">
                  {state.dividendDistributions
                    .sort(
                      (a, b) =>
                        new Date(b.date).getTime() - new Date(a.date).getTime()
                    )
                    .map((distribution) => {
                      const totalDistributed = distribution.distributions.reduce(
                        (sum, d) => sum + d.dividendAmount,
                        0
                      );

                      return (
                        <Card key={distribution.id}>
                          <div className="mb-4">
                            <p className="text-sm text-indigo-900 mb-1">
                              {format(
                                new Date(distribution.date),
                                "MMM d, yyyy"
                              )}
                            </p>
                            <p className="text-xs text-indigo-600 font-light">
                              Total Pool: ₱
                              {distribution.totalInterestPool.toLocaleString()}{" "}
                              | Per Share: ₱
                              {distribution.perShareDividend.toLocaleString()}{" "}
                              | Total Shares: {distribution.totalShares.toFixed(2)}
                            </p>
                          </div>
                          <div className="space-y-2">
                            {distribution.distributions
                              .filter((d) => d.dividendAmount > 0)
                              .map((d) => {
                                const member = state.members.find(
                                  (m) => m.id === d.memberId
                                );
                                return (
                                  <div
                                    key={d.memberId}
                                    className="flex justify-between items-center py-2 border-b border-indigo-100 last:border-0"
                                  >
                                    <span className="text-sm text-indigo-900">
                                      {member?.name || `Member ${d.memberId}`}
                                    </span>
                                    <span className="text-sm text-indigo-900">
                                      {d.shares.toFixed(2)} shares → ₱
                                      {d.dividendAmount.toLocaleString()}
                                    </span>
                                  </div>
                                );
                              })}
                          </div>
                          <div className="mt-4 pt-4 border-t-2 border-indigo-200">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-indigo-900 font-medium">
                                Total Distributed
                              </span>
                              <span className="text-sm text-indigo-900 font-medium">
                                ₱{totalDistributed.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Share Change History Modal */}
      {showShareHistoryModal && (
        <div className="fixed inset-0 bg-indigo-900/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b-2 border-indigo-200 p-4 sm:p-6 flex justify-between items-center">
              <h3 className="text-base sm:text-lg text-indigo-900">
                Share Change History
              </h3>
              <button
                onClick={() => setShowShareHistoryModal(false)}
                className="text-indigo-400 hover:text-indigo-600 transition-colors"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="p-4 sm:p-6">
              {state.shareHistory.length === 0 ? (
                <p className="text-center py-8 text-indigo-400 font-light">
                  No share changes yet
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-indigo-200">
                        <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-indigo-600 font-normal">
                          Date
                        </th>
                        <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-indigo-600 font-normal">
                          Member
                        </th>
                        <th className="text-right py-3 px-4 text-xs uppercase tracking-wider text-indigo-600 font-normal">
                          Previous Shares
                        </th>
                        <th className="text-right py-3 px-4 text-xs uppercase tracking-wider text-indigo-600 font-normal">
                          New Shares
                        </th>
                        <th className="text-right py-3 px-4 text-xs uppercase tracking-wider text-indigo-600 font-normal">
                          Change
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.shareHistory
                        .sort(
                          (a, b) =>
                            new Date(b.date).getTime() -
                            new Date(a.date).getTime()
                        )
                        .map((history, index) => {
                          const member = state.members.find(
                            (m) => m.id === history.memberId
                          );
                          const change = history.newShares - history.previousShares;
                          return (
                            <tr
                              key={index}
                              className="border-b border-indigo-100 hover:bg-indigo-50 transition-colors"
                            >
                              <td className="py-3 px-4 text-indigo-900">
                                {format(new Date(history.date), "MMM d, yyyy")}
                              </td>
                              <td className="py-3 px-4 text-indigo-900">
                                {member?.name || `Member ${history.memberId}`}
                              </td>
                              <td className="py-3 px-4 text-indigo-900 text-right">
                                {history.previousShares.toFixed(2)}
                              </td>
                              <td className="py-3 px-4 text-indigo-900 text-right font-medium">
                                {history.newShares.toFixed(2)}
                              </td>
                              <td
                                className={`py-3 px-4 text-right ${
                                  change >= 0
                                    ? "text-emerald-600"
                                    : "text-rose-600"
                                }`}
                              >
                                {change >= 0 ? "+" : ""}
                                {change.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <SharesPage />
    </ProtectedRoute>
  );
}
