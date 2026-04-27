
import { Transaction, BalanceEntry, GamjaTransaction, LoanRepayment, Loan } from "./types";

export const EXPENSE_CATEGORIES = [
  '식비', '외식', '배달', '카페', '마트', '편의점',
  '교통', '쇼핑', '병원', '약국', '통신비', '공과금',
  '구독', '교육', '경조사', '취미', '여행', '기타'
];

export const INCOME_CATEGORIES = [
  '월급', '용돈', '환급', '이자', '기타수입'
];

export const MY_ACCOUNTS = [
  '생활비 통장', '여유자금 통장', '자동이체 통장'
];

export const GAMJA_ACCOUNTS = [
  '감자 생활비 통장', '감자 여유자금 통장', '감자 개인연금', '감자 퇴직금', '감자 적금'
];

export const LOAN_NAMES = ['회사대출', '엄마대출', '은행대출'];

export const SALARY_TYPES = ['메모', 'A', 'B', 'C', 'D', 'E', 'F'] as const;

export const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: '1',
    date: '2026-04-18',
    type: '지출',
    category: '식비',
    account: '생활비 통장',
    amount: 15400,
    memo: '돈까스 정식'
  },
  {
    id: '4',
    date: '2026-04-25',
    type: '수입',
    category: '월급',
    account: '여유자금 통장',
    amount: 3500000,
    memo: '내 월급'
  }
];

export const INITIAL_BALANCES: BalanceEntry[] = [
  // 내 통장
  { id: '1', name: '내 생활비 통장', category: '내 통장', currentBalance: 0, previousBalance: 0,startingBalance: 0 },
  { id: '2', name: '내 여유자금 통장', category: '내 통장', currentBalance: 0, previousBalance: 0,startingBalance: 0  },
  { id: '3', name: '내 자동이체 통장', category: '내 통장', currentBalance: 0, previousBalance: 0,startingBalance: 0  },
  // 투자 / 연금
  { id: '4', name: 'IRP', category: '투자/연금', currentBalance: 8500000, previousBalance: 8250000 },
  { id: '5', name: 'ISA', category: '투자/연금', currentBalance: 32000000, previousBalance: 31000000 },
  { id: '6', name: '개인연금', category: '투자/연금', currentBalance: 12400000, previousBalance: 12000000 },
  { id: '7', name: '미국 주식', category: '투자/연금', currentBalance: 45200000, previousBalance: 42000000 },
  { id: '8', name: '비트코인', category: '투자/연금', currentBalance: 12500000, previousBalance: 13200000 },
  { id: '9', name: '청약', category: '투자/연금', currentBalance: 15000000, previousBalance: 14900000 },
  { id: '10', name: '퇴직연금', category: '투자/연금', currentBalance: 22000000, previousBalance: 21500000 },
  { id: '11', name: '적금', category: '투자/연금', currentBalance: 5000000, previousBalance: 4500000 },
 // 감자 자산
{ id: '12', name: '감자 생활비 통장', category: '감자 자산', currentBalance: 0, previousBalance: 0, startingBalance: 0 },
{ id: '13', name: '감자 여유자금 통장', category: '감자 자산', currentBalance: 0, previousBalance: 0, startingBalance: 0 },
{ id: '14', name: '감자 개인연금', category: '감자 자산', currentBalance: 0, previousBalance: 0, startingBalance: 0 },
{ id: '15', name: '감자 퇴직금', category: '감자 자산', currentBalance: 0, previousBalance: 0, startingBalance: 0 },
{ id: '18', name: '감자 적금', category: '감자 자산', currentBalance: 0, previousBalance: 0, startingBalance: 0 },
  // 기타 자산
  { id: '16', name: 'A통장', category: '기타 자산', currentBalance: 0, previousBalance: 0,startingBalance: 0  },
  { id: '17', name: 'B통장', category: '기타 자산', currentBalance: 0, previousBalance: 0,startingBalance: 0  },
];

export const MOCK_GAMJA_TRANSACTIONS: GamjaTransaction[] = [
  { id: 'h1', date: '2026-04-18', type: '지출', account: '감자 생활비 통장', category: '식비', amount: 8500, memo: '점심' },
  { id: 'h2', date: '2026-04-15', type: '수입', account: '감자 여유자금 통장', category: '월급', amount: 4200000, memo: '감자 월급' },
];

export const INITIAL_LOANS: Loan[] = [
  { 
    id: 'loan1', 
    name: '회사대출', 
    originalTotalAmount: 50000000, 
    repayments: [
      { id: 'l1', loanName: '회사대출', principal: 500000, interest: 15000, date: '2026-04-10', memo: '4월 상환', turn: 1 },
    ] 
  },
  { 
    id: 'loan2', 
    name: '엄마대출', 
    originalTotalAmount: 30000000, 
    repayments: [
      { id: 'l2', loanName: '엄마대출', principal: 200000, interest: 0, date: '2026-04-12', memo: '효도', turn: 10 },
    ] 
  },
  { 
    id: 'loan3', 
    name: '은행대출', 
    originalTotalAmount: 200000000, 
    repayments: [
      { id: 'l3', loanName: '은행대출', principal: 1200000, interest: 450000, date: '2026-04-15', memo: '주담대', turn: 24 },
    ] 
  },
];
