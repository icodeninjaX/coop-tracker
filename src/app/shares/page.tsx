"use client";

import { useState } from "react";
import { useCoop } from "@/context/CoopContext";
import { Button, Card, Input } from "@/components/UI";
import ProtectedRoute from "@/components/ProtectedRoute";
import { format } from "date-fns";
import { calculateTotalShares, calculateExpectedContribution } from "@/lib/shareCalculations";

function SharesPage() {
  const { state, dispatch } = useCoop();
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showShareHistoryModal, setShowShareHistoryModal] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null);
  const [editSharesValue, setEditSharesValue] = useState("");

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
    setEditSharesValue(String(currentShares));
  };

  const handleSaveShares = (memberId: number) => {
    const shares = parseFloat(editSharesValue);

    if (isNaN(shares) || shares < 0) {
      alert("Please enter a valid non-negative number");
      return;
    }

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
        <h1 className="text-2xl sm:text-3xl text-indigo-900 mb-2">
          Share System
        </h1>
        <p className="text-sm sm:text-base text-indigo-600 font-light">
          Manage member share commitments and dividend distributions
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {/* Total Shares */}
        <Card elevated>
          <p className="text-xs uppercase tracking-wider text-indigo-600 mb-2 font-normal">
            Total Committed Shares
          </p>
          <p className="text-xl sm:text-2xl lg:text-3xl text-indigo-900 mb-1">
            {totalShares.toFixed(2)}
          </p>
          <p className="text-xs text-indigo-500 font-light">
            {sortedMembers.filter((m) => (m.committedShares || 0) > 0).length} members
          </p>
        </Card>

        {/* Interest Pool */}
        <Card elevated>
          <p className="text-xs uppercase tracking-wider text-emerald-600 mb-2 font-normal">
            Interest Pool
          </p>
          <p className="text-xl sm:text-2xl lg:text-3xl text-emerald-900 mb-1">
            ₱{totalInterestPool.toLocaleString()}
          </p>
          <p className="text-xs text-emerald-500 font-light">
            Available to distribute
          </p>
        </Card>

        {/* Per Share Dividend */}
        <Card elevated>
          <p className="text-xs uppercase tracking-wider text-purple-600 mb-2 font-normal">
            Per Share Dividend
          </p>
          <p className="text-xl sm:text-2xl lg:text-3xl text-purple-900 mb-1">
            ₱{perShareDividend.toLocaleString()}
          </p>
          <p className="text-xs text-purple-500 font-light">
            Current value
          </p>
        </Card>

        {/* Share Price */}
        <Card elevated>
          <p className="text-xs uppercase tracking-wider text-amber-600 mb-2 font-normal">
            Share Price
          </p>
          <p className="text-xl sm:text-2xl lg:text-3xl text-amber-900 mb-1">
            ₱{sharePrice.toLocaleString()}
          </p>
          <p className="text-xs text-amber-500 font-light">
            Per share
          </p>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 sm:mb-8">
        <Button
          variant="success"
          onClick={handleDistributeDividends}
          disabled={totalInterestPool === 0 || totalShares === 0}
        >
          Distribute Dividends
        </Button>
        <Button variant="secondary" onClick={() => setShowHistoryModal(true)}>
          View Distribution History
        </Button>
        <Button
          variant="secondary"
          onClick={() => setShowShareHistoryModal(true)}
        >
          View Share Change History
        </Button>
      </div>

      {/* Member Shares Table */}
      <Card>
        <h2 className="text-base sm:text-lg text-indigo-900 mb-4">
          Member Share Commitments
        </h2>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-indigo-200">
                <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-indigo-600 font-normal">
                  Member
                </th>
                <th className="text-right py-3 px-4 text-xs uppercase tracking-wider text-indigo-600 font-normal">
                  Committed Shares
                </th>
                <th className="text-right py-3 px-4 text-xs uppercase tracking-wider text-indigo-600 font-normal">
                  Expected Contribution
                </th>
                <th className="text-right py-3 px-4 text-xs uppercase tracking-wider text-indigo-600 font-normal">
                  Total Contributions
                </th>
                <th className="text-right py-3 px-4 text-xs uppercase tracking-wider text-indigo-600 font-normal">
                  Potential Dividend
                </th>
                <th className="text-center py-3 px-4 text-xs uppercase tracking-wider text-indigo-600 font-normal">
                  Status
                </th>
                <th className="text-right py-3 px-4 text-xs uppercase tracking-wider text-indigo-600 font-normal">
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
                    className="border-b border-indigo-100 hover:bg-indigo-50 transition-colors"
                  >
                    <td className="py-3 px-4 text-sm text-indigo-900">
                      {member.name}
                    </td>
                    <td className="py-3 px-4 text-sm text-indigo-900 text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={editSharesValue}
                          onChange={(e) => setEditSharesValue(e.target.value)}
                          className="w-24 px-2 py-1 border-2 border-indigo-300 rounded text-right"
                          autoFocus
                        />
                      ) : (
                        shares.toFixed(2)
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-indigo-600 text-right">
                      ₱{expectedContribution.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-emerald-900 text-right font-medium">
                      ₱{totalContributions.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-indigo-900 text-right">
                      {isForfeited ? (
                        <span className="text-rose-600">₱0.00</span>
                      ) : (
                        `₱${potentialDividend.toLocaleString()}`
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {isForfeited ? (
                        <span className="px-3 py-1 bg-rose-100 text-rose-800 border border-rose-200 rounded-full text-xs font-normal">
                          Forfeited
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full text-xs font-normal">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        {isEditing ? (
                          <>
                            <Button
                              variant="success"
                              size="sm"
                              onClick={() => handleSaveShares(member.id)}
                            >
                              Save
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={handleCancelEdit}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleEditShares(member.id, shares)}
                            >
                              Edit
                            </Button>
                            {isForfeited ? (
                              <Button
                                variant="success"
                                size="sm"
                                onClick={() =>
                                  handleRestoreInterest(member.id, member.name)
                                }
                              >
                                Restore
                              </Button>
                            ) : (
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() =>
                                  handleForfeitInterest(member.id, member.name)
                                }
                              >
                                Forfeit
                              </Button>
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
        <div className="md:hidden space-y-3">
          {sortedMembers.map((member) => {
            const shares = member.committedShares || 0;
            const expectedContribution = calculateExpectedContribution(shares, sharePrice);
            const totalContributions = memberContributions.get(member.id) || 0;
            const potentialDividend = shares * perShareDividend;
            const isForfeited = member.forfeited || false;
            const isEditing = editingMemberId === member.id;

            return (
              <div
                key={member.id}
                className="bg-indigo-50 rounded-lg p-4 border border-indigo-200"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-sm text-indigo-900 mb-1">
                      {member.name}
                    </p>
                    <p className="text-xs text-indigo-600 font-light">
                      {shares.toFixed(2)} shares
                    </p>
                  </div>
                  {isForfeited ? (
                    <span className="px-3 py-1 bg-rose-100 text-rose-800 border border-rose-200 rounded-full text-xs font-normal">
                      Forfeited
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full text-xs font-normal">
                      Active
                    </span>
                  )}
                </div>

                {isEditing && (
                  <div className="mb-3">
                    <label className="text-xs text-indigo-600 mb-1 block">
                      Committed Shares
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={editSharesValue}
                      onChange={(e) => setEditSharesValue(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-indigo-300 rounded"
                      autoFocus
                    />
                  </div>
                )}

                <div className="space-y-3 mb-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-indigo-500 mb-1">
                        Expected Contribution
                      </p>
                      <p className="text-sm text-indigo-900">
                        ₱{expectedContribution.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-indigo-500 mb-1">
                        Potential Dividend
                      </p>
                      <p className="text-sm text-indigo-900">
                        {isForfeited ? (
                          <span className="text-rose-600">₱0.00</span>
                        ) : (
                          `₱${potentialDividend.toLocaleString()}`
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-indigo-200">
                    <p className="text-xs text-emerald-600 mb-1 font-medium uppercase tracking-wider">
                      Total Contributions
                    </p>
                    <p className="text-base text-emerald-900 font-medium">
                      ₱{totalContributions.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {isEditing ? (
                    <div className="flex gap-2">
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => handleSaveShares(member.id)}
                        className="flex-1"
                      >
                        Save
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleCancelEdit}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleEditShares(member.id, shares)}
                      >
                        Edit Shares
                      </Button>
                      {isForfeited ? (
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() =>
                            handleRestoreInterest(member.id, member.name)
                          }
                        >
                          Restore Interest
                        </Button>
                      ) : (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() =>
                            handleForfeitInterest(member.id, member.name)
                          }
                        >
                          Forfeit Interest
                        </Button>
                      )}
                    </>
                  )}
                </div>
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
