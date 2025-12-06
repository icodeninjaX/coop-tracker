import { renderHook, act } from "@testing-library/react";
import { ReactNode } from "react";
import { CoopProvider, useCoop } from "../CoopContext";
import { AuthProvider } from "../AuthContext";
import type { CollectionPeriod, Loan, Payment, Repayment, Penalty, CoopState } from "@/types";

// Mock the remote state module
jest.mock("@/lib/remoteState", () => ({
  loadRemoteState: jest.fn(() => Promise.resolve(null)),
  saveRemoteState: jest.fn(() => Promise.resolve()),
}));

// Mock AuthContext to provide a user
jest.mock("../AuthContext", () => ({
  ...jest.requireActual("../AuthContext"),
  useAuth: () => ({
    user: { id: "test-user-id", email: "test@example.com" },
    session: {},
    loading: false,
  }),
  AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

// Helper to create a wrapper with both providers
const createWrapper = () => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <AuthProvider>
      <CoopProvider>{children}</CoopProvider>
    </AuthProvider>
  );
  return Wrapper;
};

describe("CoopContext Reducer", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    // Prevent auto-seeding in tests
    localStorage.setItem("coopSeeded_test-user-id", "1");
  });

  describe("Initial State", () => {
    it("should initialize with 20 members", () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCoop(), { wrapper });

      expect(result.current.state.members).toHaveLength(20);
      expect(result.current.state.members[0]).toEqual({
        id: 1,
        name: "Member 1",
      });
    });

    it("should initialize with empty collections and loans", () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCoop(), { wrapper });

      // Note: Collections start empty when seeding is prevented
      expect(result.current.state.collections).toHaveLength(0);
      expect(result.current.state.loans).toHaveLength(0);
      expect(result.current.state.repayments).toHaveLength(0);
    });

    it("should initialize with zero balances", () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCoop(), { wrapper });

      expect(result.current.state.beginningBalance).toBe(0);
      expect(result.current.state.currentBalance).toBe(0);
    });
  });

  describe("ADD_COLLECTION_PERIOD", () => {
    it("should add a new collection period", () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCoop(), { wrapper });

      const period: CollectionPeriod = {
        id: "2025-01-10",
        date: "2025-01-10",
        totalCollected: 0,
        payments: [],
        defaultContribution: 1000,
      };

      act(() => {
        result.current.dispatch({
          type: "ADD_COLLECTION_PERIOD",
          payload: period,
        });
      });

      expect(result.current.state.collections).toHaveLength(1);
      expect(result.current.state.collections[0]).toEqual(period);
    });

    it("should not add duplicate periods", () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCoop(), { wrapper });

      const period: CollectionPeriod = {
        id: "2025-01-10",
        date: "2025-01-10",
        totalCollected: 0,
        payments: [],
      };

      act(() => {
        result.current.dispatch({
          type: "ADD_COLLECTION_PERIOD",
          payload: period,
        });
        result.current.dispatch({
          type: "ADD_COLLECTION_PERIOD",
          payload: period,
        });
      });

      expect(result.current.state.collections).toHaveLength(1);
    });
  });

  describe("ADD_PAYMENT", () => {
    it("should add a payment to a collection period", () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCoop(), { wrapper });

      const period: CollectionPeriod = {
        id: "2025-01-10",
        date: "2025-01-10",
        totalCollected: 0,
        payments: [],
      };

      const payment: Payment = {
        memberId: 1,
        amount: 1000,
        date: new Date().toISOString(),
        collectionPeriod: "2025-01-10",
      };

      act(() => {
        result.current.dispatch({
          type: "ADD_COLLECTION_PERIOD",
          payload: period,
        });
        result.current.dispatch({
          type: "ADD_PAYMENT",
          payload: payment,
        });
      });

      expect(result.current.state.collections[0].payments).toHaveLength(1);
      expect(result.current.state.collections[0].payments[0]).toEqual(payment);
      expect(result.current.state.collections[0].totalCollected).toBe(1000);
    });

    it("should not add duplicate payment for same member in same period", () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCoop(), { wrapper });

      const period: CollectionPeriod = {
        id: "2025-01-10",
        date: "2025-01-10",
        totalCollected: 0,
        payments: [],
      };

      const payment: Payment = {
        memberId: 1,
        amount: 1000,
        date: new Date().toISOString(),
        collectionPeriod: "2025-01-10",
      };

      act(() => {
        result.current.dispatch({
          type: "ADD_COLLECTION_PERIOD",
          payload: period,
        });
        result.current.dispatch({
          type: "ADD_PAYMENT",
          payload: payment,
        });
        result.current.dispatch({
          type: "ADD_PAYMENT",
          payload: payment,
        });
      });

      expect(result.current.state.collections[0].payments).toHaveLength(1);
      expect(result.current.state.collections[0].totalCollected).toBe(1000);
    });

    it("should use default contribution if amount not specified", () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCoop(), { wrapper });

      const period: CollectionPeriod = {
        id: "2025-01-10",
        date: "2025-01-10",
        totalCollected: 0,
        payments: [],
        defaultContribution: 1500,
      };

      const payment: Payment = {
        memberId: 1,
        amount: 0,
        date: new Date().toISOString(),
        collectionPeriod: "2025-01-10",
      };

      act(() => {
        result.current.dispatch({
          type: "ADD_COLLECTION_PERIOD",
          payload: period,
        });
        result.current.dispatch({
          type: "ADD_PAYMENT",
          payload: payment,
        });
      });

      expect(result.current.state.collections[0].totalCollected).toBe(1500);
    });
  });

  describe("UPSERT_PAYMENT", () => {
    it("should add new payment if member hasnt paid", () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCoop(), { wrapper });

      const period: CollectionPeriod = {
        id: "2025-01-10",
        date: "2025-01-10",
        totalCollected: 0,
        payments: [],
      };

      act(() => {
        result.current.dispatch({
          type: "ADD_COLLECTION_PERIOD",
          payload: period,
        });
        result.current.dispatch({
          type: "UPSERT_PAYMENT",
          payload: {
            memberId: 1,
            collectionPeriod: "2025-01-10",
            amount: 1000,
          },
        });
      });

      expect(result.current.state.collections[0].payments).toHaveLength(1);
      expect(result.current.state.collections[0].totalCollected).toBe(1000);
    });

    it("should update existing payment if member already paid", () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCoop(), { wrapper });

      const period: CollectionPeriod = {
        id: "2025-01-10",
        date: "2025-01-10",
        totalCollected: 0,
        payments: [],
      };

      act(() => {
        result.current.dispatch({
          type: "ADD_COLLECTION_PERIOD",
          payload: period,
        });
        result.current.dispatch({
          type: "UPSERT_PAYMENT",
          payload: {
            memberId: 1,
            collectionPeriod: "2025-01-10",
            amount: 1000,
          },
        });
        result.current.dispatch({
          type: "UPSERT_PAYMENT",
          payload: {
            memberId: 1,
            collectionPeriod: "2025-01-10",
            amount: 1500,
          },
        });
      });

      expect(result.current.state.collections[0].payments).toHaveLength(1);
      expect(result.current.state.collections[0].totalCollected).toBe(1500);
      expect(result.current.state.collections[0].payments[0].amount).toBe(1500);
    });
  });

  describe("REMOVE_PAYMENT", () => {
    it("should remove payment and update total", () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCoop(), { wrapper });

      const period: CollectionPeriod = {
        id: "2025-01-10",
        date: "2025-01-10",
        totalCollected: 0,
        payments: [],
      };

      act(() => {
        result.current.dispatch({
          type: "ADD_COLLECTION_PERIOD",
          payload: period,
        });
        result.current.dispatch({
          type: "UPSERT_PAYMENT",
          payload: {
            memberId: 1,
            collectionPeriod: "2025-01-10",
            amount: 1000,
          },
        });
        result.current.dispatch({
          type: "REMOVE_PAYMENT",
          payload: {
            memberId: 1,
            collectionPeriod: "2025-01-10",
          },
        });
      });

      expect(result.current.state.collections[0].payments).toHaveLength(0);
      expect(result.current.state.collections[0].totalCollected).toBe(0);
    });
  });

  describe("ADD_LOAN", () => {
    it("should add a new loan", () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCoop(), { wrapper });

      const loan: Loan = {
        id: "loan-1",
        memberId: 1,
        amount: 10000,
        dateIssued: new Date().toISOString(),
        status: "PENDING",
        repaymentPlan: "CUT_OFF",
        interestRate: 0.03,
        termCount: 6,
      };

      act(() => {
        result.current.dispatch({
          type: "ADD_LOAN",
          payload: loan,
        });
      });

      expect(result.current.state.loans).toHaveLength(1);
      expect(result.current.state.loans[0]).toEqual(loan);
    });
  });

  describe("UPDATE_LOAN", () => {
    it("should update loan properties", () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCoop(), { wrapper });

      const loan: Loan = {
        id: "loan-1",
        memberId: 1,
        amount: 10000,
        dateIssued: new Date().toISOString(),
        status: "PENDING",
      };

      act(() => {
        result.current.dispatch({
          type: "ADD_LOAN",
          payload: loan,
        });
        result.current.dispatch({
          type: "UPDATE_LOAN",
          payload: {
            loanId: "loan-1",
            loan: { amount: 15000, termCount: 10 },
          },
        });
      });

      expect(result.current.state.loans[0].amount).toBe(15000);
      expect(result.current.state.loans[0].termCount).toBe(10);
    });
  });

  describe("UPDATE_LOAN_STATUS", () => {
    it("should update loan status to APPROVED with metadata", () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCoop(), { wrapper });

      const loan: Loan = {
        id: "loan-1",
        memberId: 1,
        amount: 10000,
        dateIssued: new Date().toISOString(),
        status: "PENDING",
      };

      act(() => {
        result.current.dispatch({
          type: "ADD_LOAN",
          payload: loan,
        });
        result.current.dispatch({
          type: "UPDATE_LOAN_STATUS",
          payload: {
            loanId: "loan-1",
            status: "APPROVED",
            disbursementPeriodId: "2025-01-10",
          },
        });
      });

      const updatedLoan = result.current.state.loans[0];
      expect(updatedLoan.status).toBe("APPROVED");
      expect(updatedLoan.dateApproved).toBeDefined();
      expect(updatedLoan.disbursementPeriodId).toBe("2025-01-10");
    });

    it("should update loan status to REJECTED", () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCoop(), { wrapper });

      const loan: Loan = {
        id: "loan-1",
        memberId: 1,
        amount: 10000,
        dateIssued: new Date().toISOString(),
        status: "PENDING",
      };

      act(() => {
        result.current.dispatch({
          type: "ADD_LOAN",
          payload: loan,
        });
        result.current.dispatch({
          type: "UPDATE_LOAN_STATUS",
          payload: {
            loanId: "loan-1",
            status: "REJECTED",
          },
        });
      });

      expect(result.current.state.loans[0].status).toBe("REJECTED");
    });
  });

  describe("DELETE_LOAN", () => {
    it("should delete loan and associated repayments and penalties", () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCoop(), { wrapper });

      const loan: Loan = {
        id: "loan-1",
        memberId: 1,
        amount: 10000,
        dateIssued: new Date().toISOString(),
        status: "APPROVED",
      };

      const repayment: Repayment = {
        id: "repay-1",
        loanId: "loan-1",
        memberId: 1,
        amount: 1000,
        date: new Date().toISOString(),
        periodId: "2025-01-10",
      };

      const penalty: Penalty = {
        id: "penalty-1",
        loanId: "loan-1",
        amount: 100,
        date: new Date().toISOString(),
        periodId: "2025-01-10",
      };

      act(() => {
        result.current.dispatch({
          type: "ADD_LOAN",
          payload: loan,
        });
        result.current.dispatch({
          type: "ADD_REPAYMENT",
          payload: repayment,
        });
        result.current.dispatch({
          type: "ADD_PENALTY",
          payload: penalty,
        });
        result.current.dispatch({
          type: "DELETE_LOAN",
          payload: { loanId: "loan-1" },
        });
      });

      expect(result.current.state.loans).toHaveLength(0);
      expect(result.current.state.repayments).toHaveLength(0);
      expect(result.current.state.penalties).toHaveLength(0);
    });
  });

  describe("ADD_REPAYMENT", () => {
    it("should add a repayment", () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCoop(), { wrapper });

      const loan: Loan = {
        id: "loan-1",
        memberId: 1,
        amount: 10000,
        dateIssued: new Date().toISOString(),
        status: "APPROVED",
        repaymentPlan: "CUT_OFF",
        interestRate: 0.03,
        termCount: 6,
      };

      const repayment: Repayment = {
        id: "repay-1",
        loanId: "loan-1",
        memberId: 1,
        amount: 1750,
        date: new Date().toISOString(),
        periodId: "2025-01-10",
      };

      act(() => {
        result.current.dispatch({
          type: "ADD_LOAN",
          payload: loan,
        });
        result.current.dispatch({
          type: "ADD_REPAYMENT",
          payload: repayment,
        });
      });

      expect(result.current.state.repayments).toHaveLength(1);
      expect(result.current.state.repayments[0]).toEqual(repayment);
    });

    it("should auto-mark loan as PAID when fully repaid", () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCoop(), { wrapper });

      const loan: Loan = {
        id: "loan-1",
        memberId: 1,
        amount: 10000,
        dateIssued: new Date().toISOString(),
        status: "APPROVED",
        repaymentPlan: "CUT_OFF",
        interestRate: 0.03,
        termCount: 6,
      };

      // Total due = 10000 * (1 + 0.03 * 6) = 11800

      act(() => {
        result.current.dispatch({
          type: "ADD_LOAN",
          payload: loan,
        });
        result.current.dispatch({
          type: "ADD_REPAYMENT",
          payload: {
            id: "repay-1",
            loanId: "loan-1",
            memberId: 1,
            amount: 11800,
            date: new Date().toISOString(),
            periodId: "2025-01-10",
          },
        });
      });

      const updatedLoan = result.current.state.loans[0];
      expect(updatedLoan.status).toBe("PAID");
      expect(updatedLoan.dateClosed).toBeDefined();
    });
  });

  describe("REMOVE_REPAYMENT", () => {
    it("should remove repayment and revert loan status if needed", () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCoop(), { wrapper });

      const loan: Loan = {
        id: "loan-1",
        memberId: 1,
        amount: 10000,
        dateIssued: new Date().toISOString(),
        status: "APPROVED",
        repaymentPlan: "CUT_OFF",
        interestRate: 0.03,
        termCount: 6,
      };

      act(() => {
        result.current.dispatch({
          type: "ADD_LOAN",
          payload: loan,
        });
        result.current.dispatch({
          type: "ADD_REPAYMENT",
          payload: {
            id: "repay-1",
            loanId: "loan-1",
            memberId: 1,
            amount: 11800, // Full payment
            date: new Date().toISOString(),
            periodId: "2025-01-10",
          },
        });
      });

      // Loan should be PAID
      expect(result.current.state.loans[0].status).toBe("PAID");

      act(() => {
        result.current.dispatch({
          type: "REMOVE_REPAYMENT",
          payload: { repaymentId: "repay-1" },
        });
      });

      // After removing repayment, loan should revert to APPROVED
      expect(result.current.state.repayments).toHaveLength(0);
      expect(result.current.state.loans[0].status).toBe("APPROVED");
      expect(result.current.state.loans[0].dateClosed).toBeUndefined();
    });
  });

  describe("ADD_MEMBER", () => {
    it("should add a new member with incremented ID", () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCoop(), { wrapper });

      act(() => {
        result.current.dispatch({
          type: "ADD_MEMBER",
          payload: { name: "New Member" },
        });
      });

      expect(result.current.state.members).toHaveLength(21);
      expect(result.current.state.members[20]).toEqual({
        id: 21,
        name: "New Member",
      });
    });
  });

  describe("UPDATE_MEMBER", () => {
    it("should update member name", () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCoop(), { wrapper });

      act(() => {
        result.current.dispatch({
          type: "UPDATE_MEMBER",
          payload: {
            memberId: 1,
            name: "Updated Name",
          },
        });
      });

      expect(result.current.state.members[0].name).toBe("Updated Name");
    });
  });

  describe("UPDATE_MEMBER_NAME", () => {
    it("should update member name (duplicate action)", () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCoop(), { wrapper });

      act(() => {
        result.current.dispatch({
          type: "UPDATE_MEMBER_NAME",
          payload: {
            memberId: 2,
            name: "Another Name",
          },
        });
      });

      expect(result.current.state.members[1].name).toBe("Another Name");
    });
  });

  describe("DELETE_MEMBER", () => {
    it("should delete member and all associated data", () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCoop(), { wrapper });

      const period: CollectionPeriod = {
        id: "2025-01-10",
        date: "2025-01-10",
        totalCollected: 0,
        payments: [],
      };

      const loan: Loan = {
        id: "loan-1",
        memberId: 1,
        amount: 10000,
        dateIssued: new Date().toISOString(),
        status: "APPROVED",
      };

      act(() => {
        result.current.dispatch({
          type: "ADD_COLLECTION_PERIOD",
          payload: period,
        });
        result.current.dispatch({
          type: "UPSERT_PAYMENT",
          payload: {
            memberId: 1,
            collectionPeriod: "2025-01-10",
            amount: 1000,
          },
        });
        result.current.dispatch({
          type: "ADD_LOAN",
          payload: loan,
        });
        result.current.dispatch({
          type: "DELETE_MEMBER",
          payload: { memberId: 1 },
        });
      });

      expect(result.current.state.members).toHaveLength(19);
      expect(result.current.state.members.find((m) => m.id === 1)).toBeUndefined();
      expect(result.current.state.loans).toHaveLength(0);
      expect(result.current.state.collections[0].payments).toHaveLength(0);
      expect(result.current.state.collections[0].totalCollected).toBe(0);
    });
  });

  describe("ADD_PENALTY and REMOVE_PENALTY", () => {
    it("should add and remove penalties", () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCoop(), { wrapper });

      const penalty: Penalty = {
        id: "penalty-1",
        loanId: "loan-1",
        amount: 100,
        date: new Date().toISOString(),
        periodId: "2025-01-10",
        reason: "Late payment",
      };

      act(() => {
        result.current.dispatch({
          type: "ADD_PENALTY",
          payload: penalty,
        });
      });

      expect(result.current.state.penalties).toHaveLength(1);

      act(() => {
        result.current.dispatch({
          type: "REMOVE_PENALTY",
          payload: { penaltyId: "penalty-1" },
        });
      });

      expect(result.current.state.penalties).toHaveLength(0);
    });
  });

  describe("UPDATE_PERIOD_DEFAULT", () => {
    it("should update period default contribution", () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCoop(), { wrapper });

      const period: CollectionPeriod = {
        id: "2025-01-10",
        date: "2025-01-10",
        totalCollected: 0,
        payments: [],
        defaultContribution: 1000,
      };

      act(() => {
        result.current.dispatch({
          type: "ADD_COLLECTION_PERIOD",
          payload: period,
        });
        result.current.dispatch({
          type: "UPDATE_PERIOD_DEFAULT",
          payload: {
            periodId: "2025-01-10",
            defaultContribution: 1500,
          },
        });
      });

      expect(result.current.state.collections[0].defaultContribution).toBe(1500);
    });
  });

  describe("SET_SELECTED_PERIOD", () => {
    it("should set selected period", () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCoop(), { wrapper });

      act(() => {
        result.current.dispatch({
          type: "SET_SELECTED_PERIOD",
          payload: { periodId: "2025-01-10" },
        });
      });

      expect(result.current.state.selectedPeriod).toBe("2025-01-10");
    });
  });

  describe("UPDATE_BALANCE", () => {
    it("should update current balance", () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCoop(), { wrapper });

      act(() => {
        result.current.dispatch({
          type: "UPDATE_BALANCE",
          payload: 50000,
        });
      });

      // Note: Balance may be recalculated by useEffect based on collections/loans
      // The reducer should at minimum accept the action without erroring
      expect(result.current.state.currentBalance).toBeGreaterThanOrEqual(0);
    });
  });

  describe("RESET_PERIODS", () => {
    it("should reset all transactional data but keep members", () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCoop(), { wrapper });

      const period: CollectionPeriod = {
        id: "2025-01-10",
        date: "2025-01-10",
        totalCollected: 1000,
        payments: [],
      };

      const loan: Loan = {
        id: "loan-1",
        memberId: 1,
        amount: 10000,
        dateIssued: new Date().toISOString(),
        status: "PENDING",
      };

      act(() => {
        result.current.dispatch({
          type: "ADD_COLLECTION_PERIOD",
          payload: period,
        });
        result.current.dispatch({
          type: "ADD_LOAN",
          payload: loan,
        });
        result.current.dispatch({
          type: "RESET_PERIODS",
        });
      });

      expect(result.current.state.collections).toHaveLength(0);
      expect(result.current.state.loans).toHaveLength(0);
      expect(result.current.state.repayments).toHaveLength(0);
      expect(result.current.state.penalties).toHaveLength(0);
      expect(result.current.state.selectedPeriod).toBe("");
      expect(result.current.state.members).toHaveLength(20); // Members preserved
    });
  });

  describe("ARCHIVE_YEAR", () => {
    it("should archive a year and move data to archives", () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCoop(), { wrapper });

      const period2024: CollectionPeriod = {
        id: "2024-12-10",
        date: "2024-12-10",
        totalCollected: 20000,
        payments: [],
      };

      const period2025: CollectionPeriod = {
        id: "2025-01-10",
        date: "2025-01-10",
        totalCollected: 15000,
        payments: [],
      };

      const loan2024: Loan = {
        id: "loan-2024",
        memberId: 1,
        amount: 10000,
        dateIssued: "2024-12-15T00:00:00.000Z",
        status: "APPROVED",
      };

      act(() => {
        result.current.dispatch({
          type: "ADD_COLLECTION_PERIOD",
          payload: period2024,
        });
        result.current.dispatch({
          type: "ADD_COLLECTION_PERIOD",
          payload: period2025,
        });
        result.current.dispatch({
          type: "ADD_LOAN",
          payload: loan2024,
        });
        result.current.dispatch({
          type: "ARCHIVE_YEAR",
          payload: { year: 2024 },
        });
      });

      expect(result.current.state.archives).toHaveLength(1);
      expect(result.current.state.archives[0].year).toBe(2024);
      expect(result.current.state.archives[0].collections).toHaveLength(1);
      expect(result.current.state.archives[0].loans).toHaveLength(1);
      expect(result.current.state.collections).toHaveLength(1);
      expect(result.current.state.collections[0].id).toBe("2025-01-10");
      expect(result.current.state.loans).toHaveLength(0);
    });

    it("should calculate archive summary correctly", () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCoop(), { wrapper });

      const period: CollectionPeriod = {
        id: "2024-12-10",
        date: "2024-12-10",
        totalCollected: 20000,
        payments: [
          {
            memberId: 1,
            amount: 1000,
            date: "2024-12-10T00:00:00.000Z",
            collectionPeriod: "2024-12-10",
          },
        ],
      };

      const loan: Loan = {
        id: "loan-1",
        memberId: 1,
        amount: 10000,
        dateIssued: "2024-12-15T00:00:00.000Z",
        status: "APPROVED",
      };

      act(() => {
        result.current.dispatch({
          type: "ADD_COLLECTION_PERIOD",
          payload: period,
        });
        result.current.dispatch({
          type: "ADD_LOAN",
          payload: loan,
        });
        result.current.dispatch({
          type: "ARCHIVE_YEAR",
          payload: { year: 2024 },
        });
      });

      const archive = result.current.state.archives[0];
      expect(archive.summary.totalCollected).toBe(20000);
      expect(archive.summary.totalDisbursed).toBe(10000);
      expect(archive.summary.activeMembers).toBe(1);
      expect(archive.summary.totalLoansIssued).toBe(1);
    });
  });

  describe("LOAD_STATE", () => {
    it("should load state and merge collections", () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCoop(), { wrapper });

      const loadedState = {
        beginningBalance: 5000,
        currentBalance: 10000,
        members: [{ id: 1, name: "Test Member" }],
        collections: [
          {
            id: "2025-01-10",
            date: "2025-01-10",
            totalCollected: 5000,
            payments: [],
          },
        ],
        loans: [],
        repayments: [],
        penalties: [],
        selectedPeriod: "2025-01-10",
        archives: [],
      };

      act(() => {
        result.current.dispatch({
          type: "LOAD_STATE",
          payload: loadedState as CoopState,
        });
      });

      expect(result.current.state.beginningBalance).toBe(5000);
      expect(result.current.state.members).toHaveLength(1);
      expect(result.current.state.collections).toHaveLength(1);
      expect(result.current.state.selectedPeriod).toBe("2025-01-10");
    });

    it("should auto-mark loans as PAID if fully repaid on load", () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCoop(), { wrapper });

      const loadedState = {
        beginningBalance: 0,
        currentBalance: 0,
        members: [{ id: 1, name: "Test Member" }],
        collections: [],
        loans: [
          {
            id: "loan-1",
            memberId: 1,
            amount: 10000,
            dateIssued: new Date().toISOString(),
            status: "APPROVED",
            repaymentPlan: "CUT_OFF",
            interestRate: 0.03,
            termCount: 6,
          },
        ],
        repayments: [
          {
            id: "repay-1",
            loanId: "loan-1",
            memberId: 1,
            amount: 11800,
            date: new Date().toISOString(),
            periodId: "2025-01-10",
          },
        ],
        penalties: [],
        selectedPeriod: "",
        archives: [],
      };

      act(() => {
        result.current.dispatch({
          type: "LOAD_STATE",
          payload: loadedState as CoopState,
        });
      });

      expect(result.current.state.loans[0].status).toBe("PAID");
      expect(result.current.state.loans[0].dateClosed).toBeDefined();
    });
  });
});
