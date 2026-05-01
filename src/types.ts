
export type TransactionType = '수입' | '지출';

export interface Transaction {
  id: string;
  date: string; // ISO string YYYY-MM-DD
  type: TransactionType;
  category: string;
  account: string;
  amount: number;
  memo: string;
}

export type TabName = '홈' | '내 지출' | '연금/투자 관리' | '감자 지출' | '월급 비교' | '대출 관리' | '1년 결산';

export interface BalanceEntry {
  id: string;
  name: string;
  category: string;
  currentBalance: number;
  previousBalance: number;
  startingBalance?: number;
  monthlyBalances?: Record<string, number>;
}

export interface LoanRepayment {
  id: string;
  loanName: string;
  principal: number;
  interest: number;
  date: string;
  memo: string;
  turn: number; // 회차
}

export interface Loan {
  id: string;
  name: string;
  originalTotalAmount: number; // 총 대출 금액
  repayments: LoanRepayment[];
}

export type SalaryType = '메모' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface SalaryRecord {
  id: string;
  date: string;
  type: SalaryType;
  amount: number;
  memo: string;
}

export interface SalaryData {
  mySalaryRecords: SalaryRecord[];
  gamjaSalaryRecords: SalaryRecord[];
  mySalary: number; // For simplified summary
  gamjaSalary: number; // For simplified summary
}

export interface GamjaTransaction {
  id: string;
  date: string;
  type: TransactionType;
  account: string;
  category: string;
  amount: number;
  memo: string;
}

export interface AssetCategorySummary {
  label: string;
  amount: number;
  change: number;
}
