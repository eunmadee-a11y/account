/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**/

/**/
// ==========================================
// 🎨 대표 색상 8가지 팔레트 (수정 시 아래 헥스 코드를 '찾기/바꾸기' 하세요)
// ==========================================
// 1. 메인 블루 (Main Blue)    : #4B96FF  (강조, 버튼, 메인 지표)
// 2. 다크 블루 (Dark Blue)    : #A0C7DF  (서브 강조, 깊이감)
// 3. 연한 블루 (Light Blue)   : #E2F2D5  (은은한 배경, 서브 텍스트)
// 4. 메인 핑크 (Main Pink)    : #FFA59E  (지출ㄹ, 경고, 대비되는 포인트)
// 5. 연한 핑크 (Light Pink)   : #FFE1EA  (서브 지출, 은은한 포인트)
// 6. 다크 배경1 (Bg Dark)     : #1c1c1e  (카드, 박스 배경)
// 7. 다크 배경2 (Bg Darker)   : #121212  (앱 전체 메인 배경)
// 8. 텍스트 서브 (Text Sub)   : #8e8e93  (회색 서브 텍스트)
// ==========================================

import { useState, useMemo, useEffect, ReactNode, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, CreditCard, TrendingUp, User, ArrowLeftRight as ComparisonIcon,
  ChevronLeft, ChevronRight, Plus, Minus,
  Trash2, X, CreditCard as LoanIcon, Edit2, Search, BarChart2
} from 'lucide-react';
// 수정할 부분 (types.ts 또는 해당 섹션)
import { 
  Transaction, TransactionType, TabName, BalanceEntry, SalaryData,
  SalaryType, SalaryRecord, Loan, GamjaTransaction, LoanRepayment
} from './types';

// TransactionType에 '이체'가 포함되어 있는지 확인하고, 없으면 아래와 같이 처리합니다.
// 아래 코드를 복사하여 상단 import 문 아래에 배치하세요.

const TRANSFER_CATEGORIES = ['계좌이체', '여유자금이동', '자동이체', '생활비입금'];
import { 
  EXPENSE_CATEGORIES, INCOME_CATEGORIES, MY_ACCOUNTS, GAMJA_ACCOUNTS,
  SALARY_TYPES, LOAN_NAMES, MOCK_TRANSACTIONS, INITIAL_BALANCES,
  MOCK_GAMJA_TRANSACTIONS, INITIAL_LOANS
} from './constants';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ko-KR').format(Math.floor(amount));
};

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('ko-KR').format(num);
};

function exportCSV(transactions: any[]) {
  if (!transactions.length) {
    alert("내보낼 데이터가 없습니다.");
    return;
  }

  // 엑셀에서 열었을 때 헤더가 명확하도록 설정
  const header = ["날짜", "구분", "카테고리", "통장", "금액", "메모"];
  const rows = transactions.map((t) => [
    t.date,
    t.type,
    t.category,
    t.account,
    t.amount, // 숫자는 따옴표 없이 들어가야 엑셀에서 바로 합계 계산이 됩니다.
    `"${(t.memo || "").replace(/"/g, '""')}"` // 메모에 쉼표가 있어도 셀이 밀리지 않게 처리
  ]);

  const csvContent = [header, ...rows].map((e) => e.join(",")).join("\n");
  
  // 핵심: \uFEFF (BOM)는 엑셀이 이 파일이 UTF-8임을 즉시 인식하게 하여 한글 깨짐을 방지합니다.
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  
  const dateStr = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).replace(/\. /g, '-').replace(/\./g, '');

  link.setAttribute("href", url);
  link.setAttribute("download", `가계부_데이터_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function EditableHeader({ title, setTitle }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(title);
  const handleSave = () => {
    if (inputValue.trim()) setTitle(inputValue);
    setIsEditing(false);
  };
  return (
    <div className="flex flex-col items-center justify-center py-4 text-center">
      <div className="flex items-center gap-2 group">
        {isEditing ? (
          <input autoFocus type="text" value={inputValue} onChange={e => setInputValue(e.target.value)} onBlur={handleSave} onKeyDown={e => e.key === 'Enter' && handleSave()}
            className="text-xs font-black bg-transparent border-b border-[#4B96FF] text-[#4B96FF] text-center outline-none" />
        ) : (
          <h2 className="text-[14px] font-black text-brand-text-sub/80 uppercase tracking-widest cursor-pointer hover:text-white transition-colors" onClick={() => setIsEditing(true)}>{title}</h2>
        )}
      </div>
    </div>
  );
}

function NumericInput({ value, onChange, className, placeholder, label }: any) {
  const [displayValue, setDisplayValue] = useState(new Intl.NumberFormat('ko-KR').format(value || 0));
  useEffect(() => {
    setDisplayValue(value === 0 ? '' : new Intl.NumberFormat('ko-KR').format(value || 0));
  }, [value]);
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    let rawValue = e.target.value.replace(/,/g, '');
    if (rawValue === '' || /^\d+$/.test(rawValue)) {
      const numValue = rawValue === '' ? 0 : parseInt(rawValue);
      if (rawValue.length > 15) return;
      setDisplayValue(rawValue === '' ? '' : new Intl.NumberFormat('ko-KR').format(numValue));
      onChange(numValue);
    }
  };
  return (
    <div className="space-y-1.5 flex flex-col w-full">
      {label && <label className="text-[11px] font-black text-brand-text-sub uppercase ml-1 tracking-wider">{label}</label>}
      <input
        type="text"
        value={displayValue}
        onChange={handleChange}
        className={className}
        placeholder={placeholder}
        inputMode="numeric"
      />
    </div>
  );
}



export default function App() {
  // --- [데이터 영구 저장 및 불러오기 로직] ---
 const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('myTransactions') : null;
    if (saved) return JSON.parse(saved);
    const currentYearMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-05`;
    return MOCK_TRANSACTIONS.map(t => (t.amount === 15400 && t.category === '식비') ? { ...t, date: currentYearMonth } : t);
  });

  const [gamjaTransactions, setGamjaTransactions] = useState<GamjaTransaction[]>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('gamjaTransactions') : null;
    return saved ? JSON.parse(saved) : MOCK_GAMJA_TRANSACTIONS;
  });

  const [balances, setBalances] = useState<BalanceEntry[]>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('myBalances') : null;
    return saved ? JSON.parse(saved) : INITIAL_BALANCES;
  });

  const [salaries, setSalaries] = useState<SalaryData>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('mySalaries') : null;
    return saved ? JSON.parse(saved) : { mySalaryRecords: [], gamjaSalaryRecords: [], mySalary: 3500000, gamjaSalary: 4200000 };
  });

 const [loans, setLoans] = useState<Loan[]>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('myLoans') : null;
    return saved ? JSON.parse(saved) : INITIAL_LOANS;
  });

  // 수정된 부분: 내 카테고리를 로컬 스토리지에서 불러오도록 변경
  const [myCategories, setMyCategories] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('myCategories') : null;
    return saved ? JSON.parse(saved) : { income: [...INCOME_CATEGORIES], expense: [...EXPENSE_CATEGORIES] };
  });

  const [gamjaCategories, setGamjaCategories] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('gamjaCategories') : null;
    return saved ? JSON.parse(saved) : { income: [...INCOME_CATEGORIES], expense: [...EXPENSE_CATEGORIES] };
  });

// [통합 잔액 로직] 기초 자산 + 전체 내역을 합산하여 실시간 잔액을 도출합니다
  /* 이 부분이 전체 자산 통계에서 지출/수입으로 중복 계산되지 않게 해줍니다. */
  useEffect(() => {
    const updatedBalances = balances.map(balance => {
      const allTxs = [...transactions, ...gamjaTransactions];
      
      // 1. 일반 수입/지출 계산
      const income = allTxs.filter(t => t.account === balance.name && t.type === '수입').reduce((s, t) => s + t.amount, 0);
      const expense = allTxs.filter(t => t.account === balance.name && t.type === '지출').reduce((s, t) => s + t.amount, 0);
      
      // 2. 이체 로직 추가 (보낸 돈은 차감, 받은 돈은 합산)
      const transferOut = allTxs.filter(t => t.type === '이체' && t.account === balance.name).reduce((s, t) => s + t.amount, 0);
      const transferIn = allTxs.filter(t => t.type === '이체' && (t as any).toAccount === balance.name).reduce((s, t) => s + t.amount, 0);

      return {
        ...balance,
        currentBalance: (balance.previousBalance || 0) + income - expense - transferOut + transferIn
      };
    });

    if (JSON.stringify(updatedBalances) !== JSON.stringify(balances)) {
      setBalances(updatedBalances);
    }
  }, [transactions, gamjaTransactions, balances.map(b => b.previousBalance).join(',')]);

 // 데이터를 변경 시 자동 저장 (아이폰 브라우저 저장소 활용 - 카테고리 저장 추가)


// 데이터를 변경 시 자동 저장 (아이폰 브라우저 저장소 활용)
  useEffect(() => {
    localStorage.setItem('myTransactions', JSON.stringify(transactions));
    localStorage.setItem('gamjaTransactions', JSON.stringify(gamjaTransactions));
    localStorage.setItem('myBalances', JSON.stringify(balances));
    localStorage.setItem('mySalaries', JSON.stringify(salaries));
    localStorage.setItem('myLoans', JSON.stringify(loans));
    
    // [수정 완료] 내 카테고리와 감자 카테고리 모두 리셋 없이 유지되도록 저장 실행문 추가
    localStorage.setItem('myCategories', JSON.stringify(myCategories));
    localStorage.setItem('gamjaCategories', JSON.stringify(gamjaCategories));
  }, [transactions, gamjaTransactions, balances, salaries, loans, myCategories, gamjaCategories]);

  
  // --- [저장 로직 끝] ---

  
  const [activeTab, setActiveTab] = useState<TabName>('홈');
  const [tabNames, setTabNames] = useState<Record<TabName, string>>({
    '홈': '홈', '내 지출': '내 지출', '연금/투자 관리': '연금/투자 관리',
    '감자 지출': '감자 지출', '월급 비교': '월급 비교', '대출 관리': '대출 관리', '1년 결산': '1년 결산'
  });
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(new Date().toISOString().split('T')[0]);
  const [mySearchQuery, setMySearchQuery] = useState('');
  const [gamjaSearchQuery, setGamjaSearchQuery] = useState('');
  const [isMyEditModalOpen, setIsMyEditModalOpen] = useState(false);
  const [isGamjaEditModalOpen, setIsGamjaEditModalOpen] = useState(false);
  const [salaryLabels, setSalaryLabels] = useState<Record<string, string>>({
    '메모': '기본급', 'A': '시간외수당', 'B': '자가', 'C': '상여', 'D': '연차', 'E': '대휴비', 'F': '기타'
  });

  const currentMonthDisplay = `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월`;

  const filteredData = useMemo(() => {
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    const currMonthTxs = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === month && d.getFullYear() === year;
    });
    const income = currMonthTxs.filter(t => t.type === '수입').reduce((sum, t) => sum + t.amount, 0);
    const expense = currMonthTxs.filter(t => t.type === '지출').reduce((sum, t) => sum + t.amount, 0);
    const prevMonthDate = new Date(year, month - 1, 1);
    const prevMonthTxs = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === prevMonthDate.getMonth() && d.getFullYear() === prevMonthDate.getFullYear();
    });
    const prevIncome = prevMonthTxs.filter(t => t.type === '수입').reduce((sum, t) => sum + t.amount, 0);
    const prevExpense = prevMonthTxs.filter(t => t.type === '지출').reduce((sum, t) => sum + t.amount, 0);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const spendDays = new Set(currMonthTxs.filter(t => t.type === '지출').map(t => t.date.split('T')[0]));
    const noSpendDays = daysInMonth - spendDays.size;

    return { currMonthTxs, income, expense, savings: income - expense, noSpendDays, prevIncome, prevExpense };
  }, [transactions, currentDate]);

  const totalAssets = useMemo(() => {
    const total = balances.reduce((sum, b) => sum + b.currentBalance, 0);
    const prevTotal = balances.reduce((sum, b) => sum + b.previousBalance, 0);
    const cashLike = balances.filter(b => b.category === '내 통장').reduce((sum, b) => sum + b.currentBalance, 0);
    const investment = balances.filter(b => b.category === '투자/연금').reduce((sum, b) => sum + b.currentBalance, 0);
    const gamja = balances.filter(b => b.category === '감자 자산').reduce((sum, b) => sum + b.currentBalance, 0);
    const others = balances.filter(b => b.category === '기타 자산').reduce((sum, b) => sum + b.currentBalance, 0);
    const change = total - prevTotal;
    const changeRate = prevTotal !== 0 ? (change / prevTotal) * 100 : 0;
    return { total, cashLike, investment, gamja, others, change, changeRate };
  }, [balances]);

  const myAccountNames = useMemo(() => balances.filter((b: any) => b.category === '내 통장').map((b: any) => b.name), [balances]);
  const gamjaAccountNames = useMemo(() => balances.filter((b: any) => b.category === '감자 자산').map((b: any) => b.name), [balances]);

  const loanSummary = useMemo(() => {
    let totalRemaining = 0;
    let totalPrincipalPaid = 0;
    let totalInterestPaid = 0;
    loans.forEach((loan: any) => {
      const principalPaid = loan.repayments.reduce((sum: number, r: any) => sum + r.principal, 0);
      const interestPaid = loan.repayments.reduce((sum: number, r: any) => sum + r.interest, 0);
      totalPrincipalPaid += principalPaid;
      totalInterestPaid += interestPaid;
      totalRemaining += (loan.originalTotalAmount - principalPaid);
    });
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    const monthRepayment = loans.reduce((acc: number, loan: any) => {
      const monthSum = loan.repayments.filter((r: any) => {
        const d = new Date(r.date);
        return d.getMonth() === month && d.getFullYear() === year;
      }).reduce((sum: number, r: any) => sum + r.principal + r.interest, 0);
      return acc + monthSum;
    }, 0);
    return { totalRemaining, totalPrincipalPaid, totalInterestPaid, monthRepayment };
  }, [loans, currentDate]);


const changeMonth = (offset: number) => {
    // 1. 상단 기준 달 변경
    const nextDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
    setCurrentDate(nextDate);

    // 2. [핵심] 상단 달 이동 시 하단 날짜탭(selectedDateStr)도 해당 달의 날짜로 자동 동기화
    if (selectedDateStr) {
      const currentSelected = new Date(selectedDateStr);
      // 이동한 달의 연/월과 현재 선택된 일(Day)을 합침
      const updatedDate = new Date(nextDate.getFullYear(), nextDate.getMonth(), currentSelected.getDate());
      
      // 해당 월에 없는 날짜(예: 31일인데 다음달은 30일까지인 경우) 대응
      if (updatedDate.getMonth() !== nextDate.getMonth()) {
        const lastDay = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
        setSelectedDateStr(`${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`);
      } else {
        setSelectedDateStr(`${updatedDate.getFullYear()}-${String(updatedDate.getMonth() + 1).padStart(2, '0')}-${String(updatedDate.getDate()).padStart(2, '0')}`);
      }
    }
  };

  
  
  const deleteTransaction = (id: string) => {
    if (confirm('이 내역을 삭제하시겠습니까?')) setTransactions(prev => prev.filter(t => t.id !== id));
  };
  const deleteGamjaTransaction = (id: string) => {
    if (confirm('이 내역을 삭제하시겠습니까?')) setGamjaTransactions(prev => prev.filter(t => t.id !== id));
  };

const TabButton = ({ name, icon: Icon }: { name: TabName, icon: any }) => (
    <button 
      onClick={() => setActiveTab(name)}
      className={`shrink-0 flex items-center gap-2 px-5 py-3 rounded-full font-black text-[13px] whitespace-nowrap transition-all duration-300 relative overflow-hidden ${
        activeTab === name 
          ? 'text-[#121212] bg-[#4B96FF] shadow-[0_4px_20px_rgba(75,150,255,0.4)]' 
          : 'text-brand-text-sub bg-white/5 hover:bg-white/10 border border-white/5'
      }`}
    >
      <span>{tabNames[name]}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-[#121212] text-brand-text-main flex flex-col font-sans selection:bg-[#4B96FF]/30">
      
      <header className="sticky top-0 bg-[#121212]/80 backdrop-blur-3xl z-50 border-b border-white/5 px-4 pt-safe-top pb-3">
        <div className="flex items-center justify-between mb-4 mt-2">
          <div className="flex items-center gap-3">
            <span className="text-xs font-black tracking-widest text-[#4B96FF] uppercase">E.wallet</span>
          </div>

          <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-[12px] border border-white/10">
            <button onClick={() => changeMonth(-1)} className="text-brand-text-sub active:scale-90 p-1 hover:text-white transition-colors">
              <ChevronLeft size={16} />
            </button>
            <span className="text-[11px] font-black min-w-[70px] text-center text-white">{currentMonthDisplay}</span>
            <button onClick={() => changeMonth(1)} className="text-brand-text-sub active:scale-90 p-1 hover:text-white transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <nav className="flex gap-2 overflow-x-auto scrollbar-hide w-full pb-1">
          <TabButton name="홈" icon={Home} />
          <TabButton name="내 지출" icon={CreditCard} />
          <TabButton name="연금/투자 관리" icon={TrendingUp} />
          <TabButton name="감자 지출" icon={User} />
          <TabButton name="월급 비교" icon={ComparisonIcon} />
          <TabButton name="대출 관리" icon={LoanIcon} />
          <TabButton name="1년 결산" icon={BarChart2} />
        </nav>
      </header>

     {/* 기존 p-4 pt-4 md:p-8 에서 pt-2(위쪽 여백 축소)로 수정 */}


<main className="flex-1 max-w-[1400px] w-full mx-auto p-4 pt-2 md:p-8 overflow-hidden relative">
  {/* 양 끝 터치 이동 영역 (Overlay) */}
  <div className="absolute inset-y-0 left-0 w-10 z-30 flex items-center justify-start pointer-events-none">
    <button 
      onClick={() => {
        const tabs: TabName[] = ['홈', '내 지출', '연금/투자 관리', '감자 지출', '월급 비교', '대출 관리', '1년 결산'];
        const currentIndex = tabs.indexOf(activeTab);
        if (currentIndex > 0) setActiveTab(tabs[currentIndex - 1]);
      }}
      className="pointer-events-auto h-full w-full active:bg-white/10 transition-colors duration-200"
      aria-label="이전 탭"
    />
  </div>

  <div className="absolute inset-y-0 right-0 w-10 z-30 flex items-center justify-end pointer-events-none">
    <button 
      onClick={() => {
        const tabs: TabName[] = ['홈', '내 지출', '연금/투자 관리', '감자 지출', '월급 비교', '대출 관리', '1년 결산'];
        const currentIndex = tabs.indexOf(activeTab);
        if (currentIndex < tabs.length - 1) setActiveTab(tabs[currentIndex + 1]);
      }}
      className="pointer-events-auto h-full w-full active:bg-white/10 transition-colors duration-200"
      aria-label="다음 탭"
    />
  </div>

  <motion.div
    key={activeTab}
    initial={{ x: 20, opacity: 0 }}
    animate={{ x: 0, opacity: 1 }}
    exit={{ x: -20, opacity: 0 }}
    transition={{ duration: 0.2 }}
    className="h-full"
  >
    <AnimatePresence mode="wait">
      {activeTab === '홈' && <HomeView key="home" {...{ totalAssets, monthlySummary: filteredData, currentDate, transactions, balances, setTransactions, selectedDateStr, setSelectedDateStr, deleteTransaction, loanSummary, myAccountNames, categories: myCategories, setCategories: setMyCategories, tabName: tabNames['홈'], setTabName: (n:string)=>setTabNames({...tabNames, '홈':n}) }} />}
      {activeTab === '내 지출' && <ExpenseView key="expense" {...{ transactions, setTransactions, filteredData, currentDate, deleteTransaction, myAccountNames, balances, setBalances, searchQuery: mySearchQuery, setSearchQuery: setMySearchQuery, categories: myCategories, setCategories: setMyCategories, onOpenEdit: () => setIsMyEditModalOpen(true), tabName: tabNames['내 지출'], setTabName: (n:string)=>setTabNames({...tabNames, '내 지출':n}) }} />}
      {activeTab === '연금/투자 관리' && <PensionView key="pension" {...{ balances, setBalances, currentDate, tabName: tabNames['연금/투자 관리'], setTabName: (n:string)=>setTabNames({...tabNames, '연금/투자 관리':n}) }} />}
{activeTab === '감자 지출' && <GamjaView key="gamja" {...{ gamjaTransactions, setGamjaTransactions, deleteGamjaTransaction, gamjaAccountNames, searchQuery: gamjaSearchQuery, setSearchQuery: setGamjaSearchQuery, balances, setBalances, currentDate, categories: gamjaCategories, setCategories: setGamjaCategories, selectedDateStr, onOpenEdit: () => setIsGamjaEditModalOpen(true), tabName: tabNames['감자 지출'], setTabName: (n:string)=>setTabNames({...tabNames, '감자 지출':n}) }} />}
      {activeTab === '월급 비교' && <SalaryView key="salary" {...{ salaries, setSalaries, salaryLabels, setSalaryLabels, currentDate, transactions, setTransactions, gamjaTransactions, setGamjaTransactions, balances, setBalances, tabName: tabNames['월급 비교'], setTabName: (n:string)=>setTabNames({...tabNames, '월급 비교':n}) }} />}
      {activeTab === '대출 관리' && <LoanManagementView key="loans" {...{ loans, setLoans, loanSummary, tabName: tabNames['대출 관리'], setTabName: (n:string)=>setTabNames({...tabNames, '대출 관리':n}) }} />}
      {activeTab === '1년 결산' && <AnnualSettlementView key="annual" {...{ transactions, gamjaTransactions, salaries, tabName: tabNames['1년 결산'], setTabName: (n:string)=>setTabNames({...tabNames, '1년 결산':n}) }} />}
    </AnimatePresence>
  </motion.div>
</main>

      <TransactionEditModal isOpen={isMyEditModalOpen} onClose={() => setIsMyEditModalOpen(false)} transactions={transactions} setTransactions={setTransactions} categories={myCategories} setCategories={setMyCategories} title="내 지출 내역 관리" />
      <TransactionEditModal isOpen={isGamjaEditModalOpen} onClose={() => setIsGamjaEditModalOpen(false)} transactions={gamjaTransactions} setTransactions={setGamjaTransactions} categories={gamjaCategories} setCategories={setGamjaCategories} title="감자 지출 내역 관리" />
    </div>
  );
}

// --- TAB VIEWS ---

/* 홈 탭 */
/* 기존 HomeView 함수 내부 상단에 추가 */

function HomeView({ totalAssets, monthlySummary, transactions, setTransactions, selectedDateStr, setSelectedDateStr, deleteTransaction, loanSummary, balances, currentDate, myAccountNames, tabName, setTabName, categories, setCategories }: any) {
  // --- [상태 관리] ---
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferData, setTransferData] = useState({
    from: myAccountNames[0] || '',
    to: myAccountNames[1] || '',
    amount: 0,
    date: new Date().toISOString().split('T')[0]
  });

  // 1. 생활비 통장을 찾아서 항상 활성화 (아이폰에서 바로 입력 가능하게)
  const mainAccounts = balances.filter((b: any) => b.category === '내 통장');
  const [activeQuickAccount, setActiveQuickAccount] = useState<string | null>(() => {
    const defaultAcc = mainAccounts.find((a: any) => a.name.includes('생활비'));
    return defaultAcc ? defaultAcc.name : (mainAccounts[0]?.name || null);
  });

  // 2. 적금 관리 로직 복구
  const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  const [savingsList, setSavingsList] = useState<any[]>(() => {
    const saved = localStorage.getItem('mySavingsList');
    return saved ? JSON.parse(saved) : [{ id: 'savings-1', name: '적금 1' }];
  });
  const [savingsValues, setSavingsValues] = useState<any>(() => {
    const saved = localStorage.getItem('mySavingsValues');
    return saved ? JSON.parse(saved) : {};
  });
  const currentMonthSavings = savingsValues[monthKey] || {};

  const handleAddSavings = () => {
    const newId = `savings-${Date.now()}`;
    const newList = [...savingsList, { id: newId, name: `적금 ${savingsList.length + 1}` }];
    setSavingsList(newList); localStorage.setItem('mySavingsList', JSON.stringify(newList));
  };
  const handleRemoveSavings = (id: string) => {
    const newList = savingsList.filter(s => s.id !== id);
    setSavingsList(newList); localStorage.setItem('mySavingsList', JSON.stringify(newList));
  };
  const handleSavingsNameChange = (id: string, newName: string) => {
    const newList = savingsList.map(s => s.id === id ? { ...s, name: newName } : s);
    setSavingsList(newList); localStorage.setItem('mySavingsList', JSON.stringify(newList));
  };
  const handleSavingsValueChange = (id: string, val: number) => {
    const newMonthData = { ...currentMonthSavings, [id]: val };
    const newTotalData = { ...savingsValues, [monthKey]: newMonthData };
    setSavingsValues(newTotalData); localStorage.setItem('mySavingsValues', JSON.stringify(newTotalData));
  };

  // --- [데이터 계산] ---
  const totalSavingsAmount = savingsList.reduce((sum, s) => sum + (currentMonthSavings[s.id] || 0), 0);
  const totalSum = useMemo(() => {
    const targetKeywords = ['생활비', '여유자금', '자동이체'];
    const accountsSum = mainAccounts.filter((b: any) => targetKeywords.some(k => b.name.includes(k))).reduce((sum: number, b: any) => sum + b.currentBalance, 0);
    return accountsSum + totalSavingsAmount;
  }, [mainAccounts, totalSavingsAmount]);

  const homePensionTotal = balances.filter((b: any) => b.category === '투자/연금').reduce((sum: number, b: any) => sum + (b.monthlyBalances?.[monthKey] ?? b.currentBalance ?? 0), 0);
  const customCashLike = totalSum;               
  const customInvestment = homePensionTotal;
  const customTotalAsset = customCashLike + customInvestment;

  const quickAccounts = ['생활비', '여유자금', '자동이체'].map(kw => mainAccounts.find((a: any) => a.name.includes(kw))).filter(Boolean);
  const selectedDateTransactions = transactions.filter((t: any) => t.date === selectedDateStr);

  const handleTransfer = () => {
    if (transferData.amount <= 0 || transferData.from === transferData.to) return;
    const newTransfer = {
      id: Math.random().toString(36).substr(2, 9),
      date: transferData.date,
      type: '이체' as any,
      category: '계좌이체',
      account: transferData.from,
      toAccount: transferData.to,
      amount: transferData.amount,
      memo: `[이체] ${transferData.from} → ${transferData.to}`
    };
    setTransactions([newTransfer, ...transactions]);
    setIsTransferModalOpen(false);
    setTransferData({ ...transferData, amount: 0 });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-20">
      
      {/* 1. 빠른 입력 (생활비 항상 활성화) */}
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          {quickAccounts.map((account: any) => (
            <button key={account.id} onClick={() => setActiveQuickAccount(account.name)}
              className={`py-4 rounded-2xl border font-black text-xs transition-all active:scale-95 ${activeQuickAccount === account.name ? 'bg-[#4B96FF] text-[#121212] border-[#4B96FF] shadow-lg' : 'bg-[#1c1c1e] text-white border-white/5'}`}>
              {account.name.replace('내 ', '').replace(' 통장', '')}
            </button>
          ))}
        </div>
        {activeQuickAccount && (
          <div className="bg-[#1c1c1e] p-6 border border-white/5 rounded-[24px] shadow-2xl">
            <QuickEntryBox account={activeQuickAccount} onAdd={(tx:any)=>setTransactions([tx, ...transactions])} categories={categories} setCategories={setCategories} selectedDateStr={selectedDateStr} />
          </div>
        )}
      </div>

      {/* 2. 내 통장 잔액 & 적금 (이체 및 적금 추가 버튼 포함) */}
      <div className="bg-[#1c1c1e] rounded-[28px] border border-white/5 shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-white/5 bg-white/5 flex items-center justify-between">
          <div className="flex flex-col">
            <h3 className="text-sm font-black text-white">내 통장 잔액</h3>
            <p className="text-[11px] font-black text-[#4B96FF] mt-1">합계: {formatCurrency(totalSum)}</p>
          </div>
          <button onClick={() => setIsTransferModalOpen(!isTransferModalOpen)} className="text-[10px] font-black bg-[#4B96FF]/20 text-[#4B96FF] px-4 py-2 rounded-xl active:scale-95 transition-all">
            계좌간 이동
          </button>
        </div>

        {isTransferModalOpen && (
          <div className="p-6 bg-black/40 border-b border-white/5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <select value={transferData.from} onChange={e => setTransferData({...transferData, from: e.target.value})} className="bg-[#2c2c2e] text-white p-4 rounded-2xl text-xs font-bold outline-none border border-white/10">
                {myAccountNames.map((name: string) => <option key={name} value={name}>{name}</option>)}
              </select>
              <select value={transferData.to} onChange={e => setTransferData({...transferData, to: e.target.value})} className="bg-[#2c2c2e] text-white p-4 rounded-2xl text-xs font-bold outline-none border border-white/10">
                {myAccountNames.map((name: string) => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>
            <NumericInput value={transferData.amount} onChange={(v: number) => setTransferData({...transferData, amount: v})} className="w-full bg-[#1c1c1e] border border-[#4B96FF]/30 rounded-2xl px-5 py-4 text-2xl font-black text-white text-right" placeholder="이체 금액" />
            <button onClick={handleTransfer} className="w-full py-5 bg-[#4B96FF] text-[#121212] rounded-2xl font-black text-[15px] active:scale-95 transition-all">이체 실행</button>
          </div>
        )}

        <div className="divide-y divide-white/5">
          {mainAccounts.map((b: any) => (
            <div key={b.id} className="px-6 py-5 flex items-center justify-between gap-3">
              <p className="text-xs font-black text-brand-text-sub">{b.name.replace('내 ', '').replace(' 통장', '')}</p>
              <p className="text-lg font-black tabular-nums text-white">{formatCurrency(b.currentBalance)}</p>
            </div>
          ))}
          {/* 적금 목록 복구 */}
          {savingsList.map((savings) => (
            <div key={savings.id} className="px-6 py-5 flex items-center justify-between gap-3 bg-black/20">
              <div className="flex items-center gap-2 shrink-0">
                {savingsList.length > 1 && (
                  <button onClick={() => handleRemoveSavings(savings.id)} className="text-[#FFA59E] p-1.5 rounded-lg active:scale-90"><Minus size={14} /></button>
                )}
                <input type="text" value={savings.name} onChange={(e) => handleSavingsNameChange(savings.id, e.target.value)}
                  className="bg-transparent text-xs font-black text-brand-text-sub outline-none w-28 focus:text-[#4B96FF]" placeholder="적금 이름" />
              </div>
              <NumericInput value={currentMonthSavings[savings.id] || 0} onChange={(val: number) => handleSavingsValueChange(savings.id, val)}
                className="w-32 bg-transparent border-b border-[#4B96FF]/30 text-right text-lg font-black text-[#4B96FF] outline-none" />
            </div>
          ))}
          <div className="px-6 py-4 bg-white/5 flex justify-center border-t border-white/5">
             <button onClick={handleAddSavings} className="flex items-center gap-2 text-[11px] font-black text-brand-text-sub hover:text-[#4B96FF] transition-colors">
               <Plus size={14} /> 적금 추가
             </button>
          </div>
        </div>
      </div>

      {/* 3. 자산 현황 섹션 (카드 스타일) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <SummarySmallCard label="총수입" value={monthlySummary.income} color="text-[#4B96FF]" />
            <SummarySmallCard label="총지출" value={monthlySummary.expense} color="text-[#FFA59E]" />
            <SummarySmallCard label="저축" value={monthlySummary.savings} color="text-[#E2F2D5]" />
            <SummarySmallCard label="상환" value={loanSummary.totalPrincipalPaid} color="text-[#FFE1EA]" />
          </div>

          <div className="bg-[#1c1c1e] rounded-[32px] p-7 border border-white/5 shadow-2xl">
            <h3 className="font-black text-[15px] text-[#4B96FF] mb-8">자산 현황 요약</h3>
            <div className="space-y-6">
              <div>
                <p className="text-[11px] font-bold text-brand-text-sub uppercase mb-2 tracking-widest">총 자산 (현금 + 투자)</p>
                <h4 className="text-3xl font-black text-white tracking-tighter">{formatCurrency(customTotalAsset)}</h4>
              </div>
              <div className="h-3 bg-[#2c2c2e] rounded-full overflow-hidden flex shadow-inner">
                <div className="h-full bg-[#4B96FF]" style={{ width: `${customTotalAsset ? (customCashLike / customTotalAsset) * 100 : 0}%` }} />
                <div className="h-full bg-[#A0C7DF]" style={{ width: `${customTotalAsset ? (customInvestment / customTotalAsset) * 100 : 0}%` }} />
              </div>
              <div className="grid grid-cols-2 gap-4 text-[12px] font-black pt-2">
                <div className="flex flex-col gap-1 p-4 rounded-2xl bg-white/5 border border-white/5">
                  <span className="text-brand-text-sub">현금성</span>
                  <span className="text-lg tabular-nums text-white">{formatCurrency(customCashLike)}</span>
                </div>
                <div className="flex flex-col gap-1 p-4 rounded-2xl bg-white/5 border border-white/5">
                  <span className="text-brand-text-sub">투자/연금</span>
                  <span className="text-lg tabular-nums text-white">{formatCurrency(customInvestment)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. 사이드바 (캘린더 및 일일 내역) */}
        <div className="space-y-6">
          <div className="bg-[#1c1c1e] p-6 border border-white/5 rounded-[24px] shadow-2xl">
            <h3 className="font-black text-[#E2F2D5] mb-4">지출 캘린더</h3>
            <Calendar currentDate={currentDate} transactions={transactions} selectedDateStr={selectedDateStr} onDateClick={(d: string) => setSelectedDateStr(d)} />
          </div>

          <div className="bg-[#1c1c1e] rounded-[24px] border border-white/5 overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-white/5">
              <h3 className="font-black text-xs text-white">{selectedDateStr || '날짜 선택'} 내역</h3>
            </div>
            <div className="max-h-[300px] overflow-y-auto custom-scrollbar divide-y divide-white/5">
              {selectedDateTransactions.length > 0 ? (


selectedDateTransactions.map((t: any) => (
                  <div key={t.id} className="px-6 py-5 flex items-center justify-between hover:bg-white/5 active:bg-white/10 transition-colors">
                    {/* 왼쪽: 금액 및 정보 세로 배치 */}
                    <div className="flex flex-col gap-1">
                      {/* 1. 금액을 상단으로 (타이틀 역할) */}
                      <p className={`text-base font-black tabular-nums ${t.type === '수입' ? 'text-[#4B96FF]' : t.type === '이체' ? 'text-[#A0C7DF]' : 'text-white'}`}>
                        {t.type === '수입' ? '+' : t.type === '이체' ? '' : '-'}{formatCurrency(t.amount)}
                      </p>
                      {/* 2. 항목 및 통장 이름을 하단으로 (설명 역할) */}
                      <div className="flex items-center gap-2">
                        <p className="text-[12px] font-bold text-white/80">{t.memo || t.category}</p>
                        <span className="text-[10px] font-black text-brand-text-sub bg-white/5 px-1.5 py-0.5 rounded-md uppercase">
                          {t.account.replace('내 ', '').replace(' 통장', '')}
                        </span>
                      </div>
                    </div>

                    {/* 오른쪽: 삭제 버튼 (아이폰 터치 편의를 위해 유지) */}
                    <button onClick={() => deleteTransaction(t.id)} className="p-3 bg-white/5 rounded-xl active:text-[#FFA59E] transition-all">
                      <X size={16} />
                    </button>
                  </div>
                ))

      
              ) : (
                <div className="p-10 text-center text-[11px] text-brand-text-sub font-black uppercase tracking-widest">내역이 없습니다</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
/* 내 지출 */

/* 내 지출 탭 (아이폰 최적화: 입력창 제거 및 내역 중심) */
function ExpenseView({ transactions, setTransactions, filteredData, currentDate, deleteTransaction, myAccountNames, balances, setBalances, searchQuery, setSearchQuery, onOpenEdit }: any) {
  const { currMonthTxs } = filteredData;
  const [isStartBalanceOpen, setIsStartBalanceOpen] = useState(false);
  
  // 아이폰 터치용 큰 통장 버튼 목록
  const expenseAccountButtons = ['내 생활비 통장', '내 여유자금 통장', '내 자동이체 통장'];
  const [activeExpenseAccount, setActiveExpenseAccount] = useState(expenseAccountButtons.find(name => myAccountNames.includes(name)) || myAccountNames[0] || '');

  // 기초 자산 수정 시 즉시 전역 상태 업데이트 (홈 탭과 실시간 연동)
  const updateStartValue = (id: string, value: number) => {
    setBalances((prev: any[]) => prev.map((b: any) => 
      b.id === id ? { ...b, previousBalance: value } : b
    ));
  };

  // 선택된 통장의 현재 실시간 잔액 데이터
  const currentAcc = balances.find((b: any) => b.name === activeExpenseAccount);
  const accountMonthTxs = currMonthTxs.filter((t: any) => t.account === activeExpenseAccount);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-5 pb-28">
      
      {/* 1. 통장 선택 스위치 (상단 고정 느낌) */}
      <div className="grid grid-cols-3 gap-2">
        {expenseAccountButtons.map((name) => (
          <button
            key={name} onClick={() => setActiveExpenseAccount(name)}
            className={`py-4 rounded-2xl font-black text-[12px] border transition-all active:scale-90 ${
              activeExpenseAccount === name ? 'bg-[#4B96FF] text-[#121212] border-[#4B96FF] shadow-lg' : 'bg-[#1c1c1e] text-brand-text-sub border-white/5'
            }`}
          >
            {name.replace('내 ', '').replace(' 통장', '')}
          </button>
        ))}
      </div>

      {/* 2. 현재 실시간 잔액 카드[cite: 1] */}
      <div className="bg-[#1c1c1e] p-8 rounded-[32px] border border-white/10 shadow-2xl text-center">
        <p className="text-[11px] font-black text-brand-text-sub uppercase mb-2 tracking-widest">현재 실시간 잔액</p>
        <p className="text-4xl font-black text-white tabular-nums tracking-tighter">
          {new Intl.NumberFormat('ko-KR').format(currentAcc?.currentBalance || 0)}
        </p>
      </div>

      {/* 3. 기초 자산(시작 금액) 수정창[cite: 1] */}
      <div className="bg-[#1c1c1e] border border-white/5 rounded-[32px] overflow-hidden shadow-xl">
        <button onClick={() => setIsStartBalanceOpen(!isStartBalanceOpen)} className="w-full px-8 py-5 flex items-center justify-between hover:bg-white/5 transition-all">
          <div className="text-left">
            <h4 className="font-black text-[13px] text-[#E2F2D5] uppercase">기초 자산(시작금액) 수정</h4>
            <p className="text-[10px] text-brand-text-sub mt-1">이 금액을 기준으로 전체 잔액이 재계산됩니다.</p>
          </div>


          
          <ChevronRight size={18} className={`transition-transform duration-300 ${isStartBalanceOpen ? 'rotate-90' : ''}`} />
        </button>
        <AnimatePresence>
          {isStartBalanceOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-black/20 pt-4 px-8 pb-8 space-y-4">
              {balances.filter((b: any) => expenseAccountButtons.includes(b.name)).map((b: any) => (
                <div key={b.id} className="space-y-1">
                  <p className="text-[11px] font-bold text-brand-text-sub ml-1">{b.name}</p>
                  <NumericInput 
                    value={b.previousBalance || 0} 
                    onChange={(v: number) => updateStartValue(b.id, v)} 
                    className="w-full bg-[#2c2c2e] border border-white/10 rounded-2xl px-5 py-4 text-xl font-black text-white outline-none focus:border-[#4B96FF]" 
                  />
                </div>
              ))}
              <button 
                onClick={() => { setIsStartBalanceOpen(false); alert("기초 자산이 성공적으로 반영되었습니다."); }}
                className="w-full py-5 bg-[#E2F2D5] text-[#121212] rounded-2xl font-black text-sm active:scale-95 transition-all mt-2 shadow-lg"
              >
                반영 및 설정 완료
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 4. 이번 달 상세 내역 (기존 내역 기능 유지)[cite: 1] */}
      <div className="bg-[#1c1c1e] rounded-[32px] border border-white/5 overflow-hidden shadow-2xl">
        <div className="px-8 py-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
          <h3 className="text-[12px] font-black text-white uppercase tracking-widest">이번 달 거래 내역</h3>
          <span className="text-[11px] font-bold text-brand-text-sub bg-white/10 px-3 py-1 rounded-full">{accountMonthTxs.length}건</span>
        </div>
        <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto custom-scrollbar">
          {accountMonthTxs.length > 0 ? (
            accountMonthTxs.map((t: any) => (
              <div key={t.id} className="px-8 py-5 flex items-center justify-between active:bg-white/5 transition-colors">
                <div>
                  <p className="text-[14px] font-black text-white">{t.memo || t.category}</p>
                  <p className="text-[10px] text-brand-text-sub mt-1">{t.date} · <span className="text-[#E2F2D5]">{t.category}</span></p>
                </div>
                <div className="flex items-center gap-4">
                  <p className={`text-[16px] font-black tabular-nums ${t.type === '수입' ? 'text-[#4B96FF]' : 'text-white'}`}>
                    {t.type === '수입' ? '+' : '-'}{new Intl.NumberFormat('ko-KR').format(t.amount)}
                  </p>
                  <button onClick={() => deleteTransaction(t.id)} className="p-2 text-brand-text-sub active:text-[#FFA59E]"><X size={16} /></button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-20 text-center opacity-20 font-black uppercase tracking-[0.3em] text-xs">거래 내역이 없습니다.</div>
          )}
        </div>
      </div>

      {/* 5. 하단 관리 버튼[cite: 1] */}
      <div className="pt-4 px-2">
        <button onClick={onOpenEdit} className="w-full py-5 bg-[#1c1c1e] border border-white/10 rounded-2xl font-black text-[#4B96FF] text-[13px] uppercase tracking-widest active:scale-95 transition-all shadow-xl">
           항목 이름 및 내역 관리
        </button>
      </div>
    </motion.div>
  );
}


/*연금 투자관리*/
function PensionView({ balances, setBalances, currentDate, tabName, setTabName }: any) {
  const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  const pensionOrder = ['개인연금', 'IRP', 'irp', 'ISA', 'isa', '퇴직연금', '퇴직금'];
  const pensionAssets = balances.filter((b: any) => b.category === '투자/연금' && !b.name.includes('적금')).sort((a: any, b: any) => {
    const aIndex = pensionOrder.findIndex(name => a.name.toLowerCase().includes(name.toLowerCase()));
    const bIndex = pensionOrder.findIndex(name => b.name.toLowerCase().includes(name.toLowerCase()));
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
  });
  const getMonthlyBalance = (asset: any) => asset.monthlyBalances?.[monthKey] ?? asset.currentBalance ?? 0;
  const getMonthlyAddition = (asset: any) => asset.monthlyAdditions?.[monthKey] ?? 0;
  const updateMonthlyBalance = (id: string, value: number) => {
    setBalances((prev: any[]) => prev.map((b: any) => b.id === id ? { ...b, currentBalance: value, monthlyBalances: { ...(b.monthlyBalances || {}), [monthKey]: value } } : b));
  };
  const updateMonthlyAddition = (id: string, value: number) => {
    setBalances((prev: any[]) => prev.map((b: any) => b.id === id ? { ...b, monthlyAdditions: { ...(b.monthlyAdditions || {}), [monthKey]: value } } : b));
  };
  const deletePensionAccount = (id: string, name: string) => {
    if (confirm(`'${name}' 통장을 삭제하시겠습니까?`)) setBalances((prev: any[]) => prev.filter(b => b.id !== id));
  };
  const getYearlyAdditionTotal = (asset: any) => {
    const year = currentDate.getFullYear().toString();
    const additions = asset.monthlyAdditions || {};
    return Object.entries(additions).filter(([key]) => key.startsWith(year)).reduce((sum: number, [, value]: any) => sum + (Number(value) || 0), 0);
  };
  const getLimit = (assetName: string) => {
    const lower = assetName.toLowerCase();
    if (lower.includes('개인연금')) return 4000000;
    if (lower.includes('irp')) return 2000000;
    return 0;
  };
  const isGaugeTarget = (assetName: string) => {
    const lower = assetName.toLowerCase();
    return lower.includes('개인연금') || lower.includes('irp');
  };

  const total = pensionAssets.reduce((sum: number, b: any) => sum + getMonthlyBalance(b), 0);
  const prevTotal = pensionAssets.reduce((sum: number, b: any) => sum + (b.previousBalance || 0), 0);
  const diff = total - prevTotal;

  const addPensionAccount = () => {
    const newId = `pension-${Date.now()}`;
    const newAccount = { id: newId, name: '새 통장', currentBalance: 0, previousBalance: 0, category: '투자/연금', monthlyBalances: { [monthKey]: 0 }, monthlyAdditions: { [monthKey]: 0 } };
    setBalances([...balances, newAccount]);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="bg-[#1c1c1e] border border-white/5 p-8 rounded-[32px] shadow-[0_10px_40px_rgba(0,0,0,0.3)] text-center relative overflow-hidden">
        <p className="text-[12px] font-bold text-[#4B96FF] uppercase mb-3 tracking-widest relative z-10">투자 총액</p>
        <p className="text-3xl md:text-4xl font-black text-white tabular-nums tracking-tighter relative z-10">{formatCurrency(total)}</p>
        <div className="flex items-center justify-center gap-2 mt-4 relative z-10">
           <span className={`text-[13px] font-black px-3 py-1.5 rounded-xl ${diff >= 0 ? 'bg-[#4B96FF]/20 text-[#4B96FF]' : 'bg-[#FFA59E]/20 text-[#FFA59E]'}`}>
             {diff >= 0 ? '▲' : '▼'} {formatCurrency(Math.abs(diff))}
           </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pensionAssets.map((asset: any) => {
          const monthlyBalance = getMonthlyBalance(asset);
          const yearlyAddition = getYearlyAdditionTotal(asset);
          const limit = getLimit(asset.name);
          const gaugePercent = limit > 0 ? Math.min((yearlyAddition / limit) * 100, 100) : 0;
          const taxRefund = Math.min(yearlyAddition, limit) * 0.132;

          return (
            <div key={asset.id} className="bg-[#1c1c1e] border border-white/5 p-6 rounded-[24px] shadow-lg relative group hover:border-[#4B96FF]/50 transition-all flex flex-col justify-between">
              <div className="flex justify-between items-start mb-6">
                <input 
                  value={asset.name} onChange={(e) => setBalances(balances.map(b => b.id === asset.id ? {...b, name: e.target.value} : b))}
                  className="font-black text-[#E2F2D5] bg-transparent outline-none focus:border-b focus:border-[#4B96FF] text-lg w-3/4 pb-1"
                />
              </div>
              <div className="space-y-6">
                <NumericInput label="이번달 잔액" value={monthlyBalance} onChange={(v: number) => updateMonthlyBalance(asset.id, v)} className="w-full bg-transparent border-b border-white/10 text-xl font-black tabular-nums text-white outline-none focus:border-[#4B96FF] pb-1" />
                {isGaugeTarget(asset.name) && (
                  <div className="pt-5 border-t border-white/10 space-y-4">
                    <NumericInput label="이번달 추가금" value={getMonthlyAddition(asset)} onChange={(v: number) => updateMonthlyAddition(asset.id, v)} className="w-full bg-transparent border-b border-white/10 text-base font-black text-[#4B96FF] outline-none focus:border-[#4B96FF] pb-1" />
                    <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                      <div className="flex justify-between text-[11px] font-black text-brand-text-sub mb-2">
                        <span>진행률</span>
                        <span className="text-white">{formatNumber(yearlyAddition)} / {formatNumber(limit)}</span>
                      </div>
                      <div className="h-2.5 bg-black/50 rounded-full overflow-hidden shadow-inner">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${gaugePercent}%` }} className="h-full bg-[#4B96FF]" />
                      </div>
                      <p className="text-[10px] font-bold text-[#FFE1EA] mt-3 text-center bg-[#FFE1EA]/10 py-1.5 rounded-xl">예상 세제혜택: {formatCurrency(taxRefund)}</p>
                    </div>
                  </div>
                )}
              </div>
              <button onClick={() => deletePensionAccount(asset.id, asset.name)} className="absolute bottom-4 right-4 p-2 text-brand-text-sub/50 hover:text-[#FFA59E] transition-colors bg-white/5 rounded-xl active:scale-90"><Trash2 size={16} /></button>
            </div>
          );
        })}
      </div>
      <button onClick={addPensionAccount} className="w-full py-6 border-2 border-dashed border-white/10 rounded-[24px] text-brand-text-sub hover:text-white hover:border-white/30 flex items-center justify-center gap-3 mt-4 active:scale-95 transition-all bg-white/5">
        <Plus size={20} /> <span className="text-[13px] font-black uppercase tracking-widest">새 통장 추가</span>
      </button>
    </motion.div>
  );
}



/* 감자 지출 탭 (항목 선택 기능 추가 및 아이폰 최적화) */





function GamjaView({ gamjaTransactions, setGamjaTransactions, deleteGamjaTransaction, gamjaAccountNames, searchQuery, setSearchQuery, balances, setBalances, currentDate, categories, onOpenEdit, selectedDateStr }: any) {
  const [activeGamjaAccount, setActiveGamjaAccount] = useState(gamjaAccountNames[0] || '');
  const [isStartBalanceOpen, setIsStartBalanceOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  
  const [newTx, setNewTx] = useState({ 
    date: selectedDateStr || new Date().toISOString().split('T')[0], 
    type: '지출' as TransactionType, 
    account: gamjaAccountNames[0] || '', 
    category: categories.expense[0], 
    amount: 0, 
    memo: '' 
  });

  const [transferData, setTransferData] = useState({
    from: gamjaAccountNames[0] || '',
    to: gamjaAccountNames[1] || '',
    amount: 0,
    date: selectedDateStr || new Date().toISOString().split('T')[0]
  });

  // 상단 달 변경 시 감자 지출 탭의 입력창(기록 추가 및 계좌 이동) 날짜도 실시간 동기화
  useEffect(() => {
    if (selectedDateStr) {
      setNewTx(prev => ({ ...prev, date: selectedDateStr }));
      setTransferData(prev => ({ ...prev, date: selectedDateStr }));
    }
  }, [selectedDateStr]);
  

  const calculateLiveBalance = (accountName: string) => {
    const acc = balances.find((b: any) => b.name === accountName);
    const txs = gamjaTransactions.filter((t: any) => t.account === accountName);
    const income = txs.filter((t: any) => t.type === '수입').reduce((s: number, t: any) => s + t.amount, 0);
    const expense = txs.filter((t: any) => t.type === '지출').reduce((s: number, t: any) => s + t.amount, 0);
    const transferOut = txs.filter((t: any) => (t as any).type === '이체').reduce((s: number, t: any) => s + t.amount, 0);
    const transferIn = gamjaTransactions.filter((t: any) => (t as any).type === '이체' && (t as any).toAccount === accountName).reduce((s: number, t: any) => s + t.amount, 0);
    return (acc?.previousBalance || 0) + income - expense - transferOut + transferIn;
  };

  const handleTransfer = () => {
    if (transferData.amount <= 0 || transferData.from === transferData.to) return;
    const newTransfer = {
      id: Math.random().toString(36).substr(2, 9),
      date: transferData.date,
      type: '이체' as any,
      category: '계좌이체',
      account: transferData.from,
      toAccount: transferData.to,
      amount: transferData.amount,
      memo: `[이체] ${transferData.from} → ${transferData.to}`
    };
    setGamjaTransactions([newTransfer, ...gamjaTransactions]);
    setIsTransferModalOpen(false);
    setTransferData({ ...transferData, amount: 0 });
  };

  const handleAdd = () => {
    if (newTx.amount <= 0 || !activeGamjaAccount) return;
    const tx: GamjaTransaction = { id: Math.random().toString(36).substr(2, 9), ...newTx, account: activeGamjaAccount };
    setGamjaTransactions([tx, ...gamjaTransactions]);
    setNewTx({ ...newTx, amount: 0, memo: '' }); 
  };

  // 기초 자산(시작금액) 수정 함수 (추가됨!)
  const updateStartValue = (id: string, value: number) => {
    setBalances((prev: any[]) => prev.map((b: any) => 
      b.id === id ? { ...b, previousBalance: value } : b
    ));
  };

  // 계좌 그룹 정의 (ISA 추가)

  // 계좌 그룹 정의 (ISA 추가)
  const livingGroup = ['감자 생활비 통장', '감자 여유자금 통장', '감자 적금 통장'];
  const pensionGroup = ['감자 개인연금 통장', '감자 ISA 통장', '감자 퇴직금 통장']; // ISA 추가됨
  
  const livingTotal = livingGroup.reduce((sum, name) => sum + calculateLiveBalance(name), 0);
  const pensionTotal = pensionGroup.reduce((sum, name) => sum + calculateLiveBalance(name), 0);

  const filteredTxs = useMemo(() => {
    let txs = gamjaTransactions.filter((t: any) => t.account === activeGamjaAccount || (t as any).toAccount === activeGamjaAccount);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      txs = txs.filter((t: any) => (t.memo?.toLowerCase().includes(q)) || (t.category?.toLowerCase().includes(q)));
    }
    return txs;
  }, [gamjaTransactions, activeGamjaAccount, searchQuery]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-6 pb-28">
      {/* 1. 계좌 그룹 레이아웃 (아이폰 최적화) */}
      <div className="space-y-4">
        {/* 현금성 그룹 */}
        <div className="bg-black/20 p-4 rounded-[28px] border border-white/5 space-y-3">
          <div className="flex justify-between items-center px-2">
            <p className="text-[10px] font-black text-brand-text-sub uppercase tracking-widest">현금성 자산 합계</p>
            <p className="text-[12px] font-black text-[#E2F2D5]">{formatCurrency(livingTotal)}</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {livingGroup.map(name => (
              <button key={name} onClick={() => { setActiveGamjaAccount(name); setNewTx({ ...newTx, account: name }); }}
                className={`py-4 px-1 rounded-xl border transition-all active:scale-95 flex flex-col items-center gap-1 ${activeGamjaAccount === name ? 'bg-[#E2F2D5] text-[#121212] border-[#E2F2D5]' : 'bg-[#1c1c1e] text-brand-text-sub border-white/5'}`}>
                <span className="text-[9px] font-black truncate w-full text-center leading-tight">{name.replace('감자 ', '').replace(' 통장', '')}</span>
                <span className="text-[11px] font-bold tabular-nums">{formatNumber(calculateLiveBalance(name))}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 연금/투자 그룹 (ISA 포함 3열 배치) */}
        <div className="bg-black/20 p-4 rounded-[28px] border border-white/5 space-y-3">
          <div className="flex justify-between items-center px-2">
            <p className="text-[10px] font-black text-brand-text-sub uppercase tracking-widest">연금/투자 : 총액</p>
            <p className="text-[12px] font-black text-[#4B96FF]">{formatCurrency(pensionTotal)}</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {pensionGroup.map(name => (
              <button key={name} onClick={() => { setActiveGamjaAccount(name); setNewTx({ ...newTx, account: name }); }}
                className={`py-4 px-1 rounded-xl border transition-all active:scale-95 flex flex-col items-center gap-1 ${activeGamjaAccount === name ? 'bg-[#4B96FF] text-white border-[#4B96FF]' : 'bg-[#1c1c1e] text-brand-text-sub border-white/5'}`}>
                <span className="text-[9px] font-black truncate w-full text-center leading-tight">{name.replace('감자 ', '').replace(' 통장', '')}</span>
                <span className="text-[11px] font-bold tabular-nums">{formatNumber(calculateLiveBalance(name))}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 계좌간 이동 버튼 */}
        <button onClick={() => setIsTransferModalOpen(!isTransferModalOpen)} className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[11px] font-black text-[#E2F2D5] uppercase tracking-widest active:scale-95 transition-all">감자 계좌간 이동</button>
        {isTransferModalOpen && (
          <div className="p-6 bg-black/40 border border-[#E2F2D5]/30 rounded-[24px] space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="grid grid-cols-2 gap-3">
              <select value={transferData.from} onChange={e => setTransferData({...transferData, from: e.target.value})} className="bg-[#2c2c2e] text-white p-4 rounded-2xl text-xs font-bold outline-none border border-white/10">{gamjaAccountNames.map((name: string) => <option key={name} value={name}>{name}</option>)}</select>
              <select value={transferData.to} onChange={e => setTransferData({...transferData, to: e.target.value})} className="bg-[#2c2c2e] text-white p-4 rounded-2xl text-xs font-bold outline-none border border-white/10">{gamjaAccountNames.map((name: string) => <option key={name} value={name}>{name}</option>)}</select>
            </div>
            <NumericInput value={transferData.amount} onChange={(v: number) => setTransferData({...transferData, amount: v})} className="w-full bg-[#1c1c1e] border border-[#E2F2D5]/30 rounded-2xl px-5 py-4 text-2xl font-black text-white text-right" placeholder="이체 금액" />
<button onClick={handleTransfer} className="w-full py-5 bg-[#E2F2D5] text-[#121212] rounded-2xl font-black text-[15px] active:scale-95 transition-all">
계좌이체 실행
</button>
          </div>
        )}
      </div>

      {/* 기초 자산(시작금액) 수정 (추가됨!) */}
      <div className="bg-[#1c1c1e] border border-white/5 rounded-[32px] overflow-hidden shadow-xl">
        <button onClick={() => setIsStartBalanceOpen(!isStartBalanceOpen)} className="w-full px-8 py-5 flex items-center justify-between hover:bg-white/5 transition-all">
          <div className="text-left">
            <h4 className="font-black text-[13px] text-[#E2F2D5] uppercase">기초 자산(시작금액) 수정</h4>
            <p className="text-[10px] text-brand-text-sub mt-1">이 금액을 기준으로 감자 전체 잔액이 재계산됩니다.</p>
          </div>
          <ChevronRight size={18} className={`transition-transform duration-300 ${isStartBalanceOpen ? 'rotate-90' : ''}`} />
        </button>
        <AnimatePresence>
          {isStartBalanceOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-black/20 pt-4 px-8 pb-8 space-y-4">
              {balances.filter((b: any) => gamjaAccountNames.includes(b.name)).map((b: any) => (
                <div key={b.id} className="space-y-1">
                  <p className="text-[11px] font-bold text-brand-text-sub ml-1">{b.name}</p>
                  <NumericInput 
                    value={b.previousBalance || 0} 
                    onChange={(v: number) => updateStartValue(b.id, v)} 
                    className="w-full bg-[#2c2c2e] border border-white/10 rounded-2xl px-5 py-4 text-xl font-black text-white outline-none focus:border-[#E2F2D5]" 
                  />
                </div>
              ))}
              <button 
                onClick={() => { setIsStartBalanceOpen(false); alert("감자 기초 자산이 성공적으로 반영되었습니다."); }}
                className="w-full py-5 bg-[#E2F2D5] text-[#121212] rounded-2xl font-black text-sm active:scale-95 transition-all mt-2 shadow-lg"
              >
                변경 및 설정 완료
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 2. 내역 입력          </div>
        )}
      </div>

      {/* 2. 내역 입력 (유형 -> 메모 -> 금액 -> 항목 순서) */}
      <div className="bg-[#1c1c1e] p-7 rounded-[32px] border border-white/5 shadow-2xl space-y-5">
        <div className="flex justify-between items-center">
          <h4 className="text-sm font-black text-white">{activeGamjaAccount.replace('감자 ', '')} 입력</h4>
          <input type="date" value={newTx.date} onChange={e => setNewTx({...newTx, date: e.target.value})} className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[16px] font-bold text-white outline-none" />
        </div>
        <div className="flex bg-black/40 rounded-2xl p-1 border border-white/5">
          {['지출', '수입'].map((type) => (
            <button key={type} onClick={() => setNewTx({ ...newTx, type: type as any, category: type === '지출' ? categories.expense[0] : categories.income[0] })} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${newTx.type === type ? (type === '지출' ? 'bg-[#FFA59E] text-[#121212]' : 'bg-[#4B96FF] text-[#121212]') : 'text-brand-text-sub'}`}>{type}</button>
          ))}
        </div>
        <div className="space-y-2"><label className="text-[11px] font-black text-brand-text-sub ml-2 uppercase tracking-widest">메모</label><input type="text" placeholder="메모 입력..." value={newTx.memo} onChange={e => setNewTx({...newTx, memo: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-[#E2F2D5]" /></div>
        <div className="space-y-2"><label className="text-[11px] font-black text-brand-text-sub ml-2 uppercase tracking-widest">금액</label><NumericInput value={newTx.amount} onChange={(v: number) => setNewTx({...newTx, amount: v})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-2xl font-black text-white outline-none" /></div>
        <div className="space-y-2">
          <label className="text-[11px] font-black text-brand-text-sub ml-2 uppercase tracking-widest">항목 선택</label>
          <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide snap-x">
            {(newTx.type === '지출' ? categories.expense : categories.income).map((c: string) => (
              <button key={c} onClick={() => setNewTx({...newTx, category: c})} className={`shrink-0 snap-start px-5 py-3 rounded-xl text-[13px] font-black transition-all border ${newTx.category === c ? (newTx.type === '지출' ? 'bg-[#FFA59E]/20 text-[#FFA59E] border-[#FFA59E]/50' : 'bg-[#4B96FF]/20 text-[#4B96FF] border-[#4B96FF]/50') : 'bg-black/40 text-brand-text-sub border-white/5'}`}>{c}</button>
            ))}
          </div>
        </div>
        <button onClick={handleAdd} className="w-full py-5 bg-[#E2F2D5] text-[#121212] rounded-2xl font-black text-sm active:scale-95 transition-all shadow-lg">내역 추가</button>
      </div>

      {/* 3. 거래 리스트 */}
      <div className="bg-[#1c1c1e] rounded-[32px] border border-white/5 overflow-hidden shadow-2xl">
        <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto custom-scrollbar">
          {filteredTxs.map((t: any) => (
            <div key={t.id} className="px-8 py-5 flex justify-between items-center active:bg-white/5 transition-colors">
              <div><p className="text-[14px] font-black text-white">{t.memo || t.category}</p><p className="text-[10px] text-brand-text-sub mt-1">{t.date} · <span className="text-[#E2F2D5]">{t.category}</span></p></div>
              <div className="flex items-center gap-4"><p className={`text-base font-black tabular-nums ${t.type === '수입' ? 'text-[#4B96FF]' : t.type === '이체' ? 'text-[#A0C7DF]' : 'text-white'}`}>{t.type === '수입' ? '+' : t.type === '이체' ? '' : '-'}{formatNumber(t.amount)}</p><button onClick={() => deleteGamjaTransaction(t.id)} className="p-2 text-brand-text-sub"><X size={16} /></button></div>
            </div>
          ))}
        </div>
      </div>
      <div className="pt-4 px-2 pb-10"><button onClick={onOpenEdit} className="w-full py-5 bg-[#1c1c1e] border border-white/10 rounded-2xl font-black text-[#E2F2D5] text-[13px] uppercase tracking-widest active:scale-95 transition-all shadow-xl">항목 수정 및 관리</button></div>
    </motion.div>
  );
}





// 대출 현황
function LoanManagementView({ loans, setLoans, loanSummary, tabName, setTabName }: any) {
  const [activeLoanId, setActiveLoanId] = useState(loans[0]?.id || '');
  const activeLoan = loans.find((l: any) => l.id === activeLoanId);
  const [newRepayment, setNewRepayment] = useState({ principal: 0, interest: 0, date: new Date().toISOString().split('T')[0], memo: '' });

  const getLoanStats = (loan: any) => {
    const cumulativePrincipal = loan.repayments.reduce((sum: number, r: any) => sum + r.principal, 0);
    const cumulativeInterest = loan.repayments.reduce((sum: number, r: any) => sum + r.interest, 0);
    const principalRepayments = loan.repayments.filter((r: any) => r.principal > 0);
    const progress = loan.originalTotalAmount > 0 ? Math.min((cumulativePrincipal / loan.originalTotalAmount) * 100, 100) : 0;
    return { cumulativePrincipal, cumulativeInterest, remaining: loan.originalTotalAmount - cumulativePrincipal, nextTurn: principalRepayments.length + 1, progress };
  };

  const updateLoanField = (id: string, field: string, value: any) => setLoans(loans.map((l: any) => l.id === id ? { ...l, [field]: value } : l));
  const addNewLoan = () => { const newId = `loan-${Date.now()}`; setLoans([...loans, { id: newId, name: '새 대출', originalTotalAmount: 0, repayments: [] }]); setActiveLoanId(newId); };
  const deleteLoan = (id: string) => { if (confirm('삭제하시겠습니까?')) { const filtered = loans.filter((l: any) => l.id !== id); setLoans(filtered); setActiveLoanId(filtered[0]?.id || ''); } };
  const addRepayment = () => {
    if (!activeLoanId || (newRepayment.principal === 0 && newRepayment.interest === 0)) return;
    const stats = getLoanStats(activeLoan);
    const repayment = { id: Math.random().toString(36).substr(2, 9), ...newRepayment, turn: newRepayment.principal > 0 ? stats.nextTurn : null };
    setLoans(loans.map((l: any) => l.id === activeLoanId ? { ...l, repayments: [repayment, ...l.repayments] } : l));
    setNewRepayment({ ...newRepayment, principal: 0, interest: 0, memo: '' });
  };
  const deleteRepayment = (loanId: string, repaymentId: string) => setLoans(loans.map((l: any) => l.id === loanId ? { ...l, repayments: l.repayments.filter((r: any) => r.id !== repaymentId) } : l));
  const activeStats = activeLoan ? getLoanStats(activeLoan) : null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-6 pb-20 px-2">
      {activeLoan && activeStats && (
        <div className="bg-[#1c1c1e] p-8 border border-white/5 rounded-[32px] shadow-[0_10px_40px_rgba(0,0,0,0.3)] space-y-6 relative overflow-hidden">
          <div className="text-center">
            <p className="text-[12px] font-black text-brand-text-sub uppercase mb-2 tracking-widest">남은 원금</p>
            <p className="text-3xl md:text-4xl font-black text-[#FFA59E] tabular-nums tracking-tighter">{formatCurrency(activeStats.remaining)}</p>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-[11px] font-black text-brand-text-sub uppercase px-2">
              <span>상환 진행률</span><span className="text-[#4B96FF]">{activeStats.progress.toFixed(1)}%</span>
            </div>
            <div className="h-4 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 shadow-inner">
              <motion.div initial={{ width: 0 }} animate={{ width: `${activeStats.progress}%` }} className="h-full bg-gradient-to-r from-[#A0C7DF] to-[#4B96FF]" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6 pt-6 border-t border-white/10">
            <div className="bg-black/30 p-4 rounded-2xl text-center border border-white/5">
              <p className="text-[10px] font-black text-brand-text-sub uppercase mb-1">상환원금</p>
              <p className="text-base md:text-lg font-black text-[#4B96FF]">{formatNumber(activeStats.cumulativePrincipal)}</p>
            </div>
            <div className="bg-black/30 p-4 rounded-2xl text-center border border-white/5">
              <p className="text-[10px] font-black text-brand-text-sub uppercase mb-1">상환이자</p>
              <p className="text-base md:text-lg font-black text-[#FFE1EA]">{formatNumber(activeStats.cumulativeInterest)}</p>
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x">
        {loans.map((loan: any) => (
          <button key={loan.id} onClick={() => setActiveLoanId(loan.id)} className={`shrink-0 snap-start px-6 py-4 rounded-2xl font-black text-[13px] transition-all border ${activeLoanId === loan.id ? 'bg-[#4B96FF] border-[#4B96FF] text-[#121212]' : 'bg-[#1c1c1e] border-white/5 text-brand-text-sub hover:border-white/20'}`}>{loan.name}</button>
        ))}
        <button onClick={addNewLoan} className="shrink-0 p-4 rounded-2xl border-2 border-dashed border-white/20 text-white/50 hover:text-white hover:border-white/50 bg-white/5"><Plus size={20} /></button>
      </div>
      {activeLoan ? (
        <div className="space-y-6">
          <div className="bg-[#1c1c1e] border border-white/5 rounded-[32px] overflow-hidden shadow-2xl">
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2"><label className="text-[11px] font-black text-brand-text-sub uppercase ml-2">이름수정</label><input type="text" value={activeLoan.name} onChange={(e) => updateLoanField(activeLoan.id, 'name', e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-2xl px-4 py-3 text-[14px] font-black text-white outline-none focus:border-[#4B96FF]" /></div>
                <div className="space-y-2">
                  <NumericInput label="최초대출금" value={activeLoan.originalTotalAmount} onChange={(val: number) => updateLoanField(activeLoan.id, 'originalTotalAmount', val)} className="w-full bg-black/40 border border-white/5 rounded-2xl px-4 py-3 text-[14px] font-black text-white outline-none focus:border-[#4B96FF]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2"><NumericInput label="원금상환" value={newRepayment.principal} onChange={(v: number) => setNewRepayment({...newRepayment, principal: v})} className="w-full bg-black/40 border border-[#4B96FF]/30 rounded-2xl px-4 py-3 text-[14px] font-black text-[#4B96FF] outline-none" /></div>
                <div className="space-y-2"><label className="text-[11px] font-black text-brand-text-sub uppercase ml-2">상환날짜</label><input type="date" value={newRepayment.date} onChange={e => setNewRepayment({...newRepayment, date: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-2xl px-4 py-3 text-[14px] font-bold text-white outline-none" /></div>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2"><NumericInput label="이자상환" value={newRepayment.interest} onChange={(v: number) => setNewRepayment({...newRepayment, interest: v})} className="w-full bg-black/40 border border-[#FFE1EA]/30 rounded-2xl px-4 py-3 text-[14px] font-black text-[#FFE1EA] outline-none" /></div>
                <div className="space-y-2"><label className="text-[11px] font-black text-brand-text-sub uppercase ml-2">메모</label><input type="text" value={newRepayment.memo} placeholder="메모" onChange={e => setNewRepayment({...newRepayment, memo: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-2xl px-4 py-3 text-[14px] text-white outline-none" /></div>
              </div>
              <div className="pt-2">
                <button onClick={addRepayment} className="w-full bg-[#4B96FF] text-[#A0C7DF] font-black py-5 rounded-2xl active:scale-[0.98] transition-all text-[15px] uppercase tracking-widest shadow-[0_8px_30px_rgba(75,150,255,0.4)]">내역 추가</button>
              </div>
            </div>
            <div className="border-t border-white/5 bg-black/20">
              <div className="grid grid-cols-12 gap-2 px-6 py-4 border-b border-white/5 bg-black/40 text-[10px] font-black text-brand-text-sub uppercase text-center tracking-widest">
                <div className="col-span-2">회차</div><div className="col-span-4 text-right">원금</div><div className="col-span-3 text-right">이자</div><div className="col-span-3">삭제</div>
              </div>
              <div className="max-h-[250px] overflow-y-auto custom-scrollbar divide-y divide-white/5 text-center">
                {activeLoan.repayments.map((r: any) => (
                  <div key={r.id} className="grid grid-cols-12 gap-2 px-6 py-4 items-center text-[13px] font-bold tabular-nums hover:bg-white/5 transition-colors">
                    <div className="col-span-2 text-[#4B96FF] font-black">{r.turn || '-'}</div>
                    <div className="col-span-4 text-right text-white">{formatNumber(r.principal)}</div>
                    <div className="col-span-3 text-right text-[#FFE1EA]">{formatNumber(r.interest)}</div>
                    <div className="col-span-3 text-right flex justify-end"><button onClick={() => deleteRepayment(activeLoan.id, r.id)} className="p-2 text-brand-text-sub hover:text-[#FFA59E] bg-white/5 rounded-xl"><X size={14}/></button></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <button onClick={() => deleteLoan(activeLoan.id)} className="w-full py-4 rounded-2xl text-[12px] font-bold text-[#FFA59E]/70 hover:bg-[#FFA59E]/10 flex items-center justify-center gap-2 border border-dashed border-[#FFA59E]/30"><Trash2 size={16} /> 대출 전체 항목 삭제</button>
        </div>
      ) : (
        <div className="p-24 text-center text-brand-text-sub/50 font-black text-[14px] uppercase tracking-widest bg-[#1c1c1e] rounded-[32px] border border-white/5 border-dashed">대출 선택</div>
      )}
    </motion.div>
  );
}

// 퀵 엔트리 박스 (홈탭 전용)
// 퀵 엔트리 박스 (홈탭 전용)
// 퀵 엔트리 박스 (홈탭 전용)
function QuickEntryBox({ account, onAdd, categories, setCategories, selectedDateStr }: any) {
  const [newTx, setNewTx] = useState({ date: selectedDateStr || new Date().toISOString().split('T')[0], type: '지출' as TransactionType, category: categories.expense[0], amount: 0, memo: '' });
  
  // 상단 달 변경이나 캘린더 날짜 클릭 시 퀵엔트리 날짜 입력창 텍스트도 실시간 동기화
  useEffect(() => {
    if (selectedDateStr) {
      setNewTx(prev => ({ ...prev, date: selectedDateStr }));
    }
  }, [selectedDateStr]);

  const handleTypeChange = (newType: TransactionType) => setNewTx({ ...newTx, type: newType, category: newType === '지출' ? categories.expense[0] : categories.income[0] });
  const handleAdd = () => { if (newTx.amount <= 0) return; onAdd({ id: Math.random().toString(36).substr(2, 9), ...newTx, account }); setNewTx({ ...newTx, type: '지출', category: categories.expense[0], amount: 0, memo: '' }); };
  const currentCategories = newTx.type === '지출' ? categories.expense : categories.income;

  // 👇 바로 이 부분! return ( 가 추가되어 화면을 정상적으로 그려줍니다.
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
         <h4 className="text-base font-black text-[#4B96FF]">{account}</h4>
        <div className="flex items-center bg-black/40 border border-white/5 rounded-xl px-3 py-1.5">
           <input type="date" value={newTx.date} onChange={e => setNewTx({...newTx, date: e.target.value})} className="bg-transparent border-none text-[16px] md:text-sm font-bold outline-none text-white" />
        </div>
      </div>

      {/* 2. 유형 선택 */}
      <div className="space-y-2">
         <label className="text-[11px] font-black text-brand-text-sub uppercase ml-2 tracking-widest">유형</label>
         <div className="flex bg-black/40 rounded-2xl p-1 border border-white/5">
            <button onClick={() => handleTypeChange('지출')} className={`flex-1 py-2.5 rounded-xl text-[14px] font-black transition-colors ${newTx.type === '지출' ? 'bg-[#FFA59E] text-[#121212] shadow-md' : 'text-brand-text-sub'}`}>지출</button>
            <button onClick={() => handleTypeChange('수입')} className={`flex-1 py-2.5 rounded-xl text-[14px] font-black transition-colors ${newTx.type === '수입' ? 'bg-[#4B96FF] text-[#121212] shadow-md' : 'text-brand-text-sub'}`}>수입</button>
         </div>
      </div>

      {/* 4. 메모 입력 */}
      <div className="space-y-2">
         <label className="text-[11px] font-black text-brand-text-sub uppercase ml-2 tracking-widest">메모</label>
         <input type="text" value={newTx.memo} placeholder="메모를 입력하세요" onChange={e => setNewTx({...newTx, memo: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-2xl px-4 py-4 text-[14px] text-white outline-none focus:border-[#4B96FF]" />
      </div>

      {/* 1. 금액 입력을 최상단으로 이동 (아이폰 최적화) */}
      <div className="space-y-2">
         <label className="text-[11px] font-black text-brand-text-sub uppercase ml-2 tracking-widest">금액</label>
         <div className="p-4 bg-white/5 border border-white/10 rounded-2xl focus-within:border-[#4B96FF] transition-colors">
           <NumericInput value={newTx.amount} placeholder="0" onChange={(val: number) => setNewTx({...newTx, amount: val})} className="w-full bg-transparent border-none text-3xl font-black text-white outline-none tabular-nums" />
         </div>
      </div>

      {/* 3. 항목 선택 (가로 스크롤 유지) */}
      <div className="space-y-2">
         <label className="text-[11px] font-black text-brand-text-sub uppercase ml-2 tracking-widest">항목</label>
         <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide snap-x">
            {currentCategories.map((c: string) => (
              <button key={c} onClick={() => setNewTx({...newTx, category: c})} className={`shrink-0 snap-start px-5 py-3 rounded-xl text-[13px] font-black transition-all border ${newTx.category === c ? (newTx.type === '지출' ? 'bg-[#FFA59E]/20 text-[#FFA59E] border-[#FFA59E]/50' : 'bg-[#4B96FF]/20 text-[#4B96FF] border-[#4B96FF]/50') : 'bg-black/40 text-brand-text-sub border-white/5'}`}>{c}</button>
            ))}
         </div>
      </div>

      <div className="pt-2">
         <button onClick={handleAdd} className="w-full bg-[#4B96FF] text-[#121212] text-[16px] font-black py-5 rounded-2xl active:scale-[0.98] transition-all uppercase tracking-widest shadow-[0_8px_30px_rgba(75,150,255,0.3)]">기록 추가</button>
      </div>
    </div>
  );
}

/* 월급 비교 */
function SalaryView({ salaries, setSalaries, tabName, setTabName, salaryLabels, setSalaryLabels, currentDate, transactions, setTransactions, gamjaTransactions, setGamjaTransactions, balances, setBalances }: any) {
  const [newEntry, setNewEntry] = useState({ target: '나' as '나' | '감자', date: new Date().toISOString().split('T')[0], type: SALARY_TYPES[0] as SalaryType, amount: 0, memo: '' });
  const [isMemoActive, setIsMemoActive] = useState(false);
  const [isLabelSettingsOpen, setIsLabelSettingsOpen] = useState(false);
  const selectedYear = currentDate.getFullYear();
  const totalMyAnnual = useMemo(() => salaries.mySalaryRecords.filter((r: any) => new Date(r.date).getFullYear() === selectedYear).reduce((s: number, r: any) => s + r.amount, 0), [salaries, selectedYear]);
  const totalGamjaAnnual = useMemo(() => salaries.gamjaSalaryRecords.filter((r: any) => new Date(r.date).getFullYear() === selectedYear).reduce((s: number, r: any) => s + r.amount, 0), [salaries, selectedYear]);
  const totalAnnual = totalMyAnnual + totalGamjaAnnual;
  const myRatio = totalAnnual > 0 ? (totalMyAnnual / totalAnnual) * 100 : 0;
  const gamjaRatio = totalAnnual > 0 ? (totalGamjaAnnual / totalAnnual) * 100 : 0;

  const monthlySalaryData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const monthNum = i + 1;
      const entry: any = { name: `${monthNum}`, details: [] };
      let meMonthTotal = 0;
      salaries.mySalaryRecords.filter((r: any) => { const d = new Date(r.date); return d.getMonth() === i && d.getFullYear() === selectedYear; }).forEach((r: any) => { meMonthTotal += r.amount; entry.details.push({ user: '나', type: salaryLabels[r.type] || r.type, amount: r.amount, memo: r.memo }); });
      let gamjaMonthTotal = 0;
      salaries.gamjaSalaryRecords.filter((r: any) => { const d = new Date(r.date); return d.getMonth() === i && d.getFullYear() === selectedYear; }).forEach((r: any) => { gamjaMonthTotal += r.amount; entry.details.push({ user: '감자', type: '월급', amount: r.amount, memo: r.memo }); });
      entry['나'] = meMonthTotal; entry['감자'] = gamjaMonthTotal; entry['합계'] = meMonthTotal + gamjaMonthTotal;
      return entry;
    });
  }, [salaries, salaryLabels, selectedYear]);

  const handleAddSalary = () => {
    if (newEntry.amount <= 0) return;
    const recordId = Math.random().toString(36).substr(2, 9);
    const record = { ...newEntry, id: recordId };
    if (newEntry.target === '나') {
      setSalaries({ ...salaries, mySalaryRecords: [record, ...salaries.mySalaryRecords] });
      const autoTx = { id: `salary-${recordId}`, date: newEntry.date, type: '수입', category: salaryLabels[newEntry.type] || newEntry.type, account: '내 여유자금 통장', amount: newEntry.amount, memo: `[급여연동] ${newEntry.memo}` };
      setTransactions([autoTx, ...transactions]);
      setBalances((prev: any) => prev.map((b: any) => b.name === '내 여유자금 통장' ? { ...b, currentBalance: b.currentBalance + newEntry.amount } : b));
    } else {
      setSalaries({ ...salaries, gamjaSalaryRecords: [record, ...salaries.gamjaSalaryRecords] });
      const autoGamjaTx = { id: `salary-g-${recordId}`, date: newEntry.date, type: '수입', category: '월급', account: '감자 생활비 통장', amount: newEntry.amount, memo: `[급여연동] ${newEntry.memo}` };
      setGamjaTransactions([autoGamjaTx, ...gamjaTransactions]);
      setBalances((prev: any) => prev.map((b: any) => b.name === '감자 생활비 통장' ? { ...b, currentBalance: b.currentBalance + newEntry.amount } : b));
    }
    setNewEntry({ ...newEntry, amount: 0, memo: '' }); setIsMemoActive(false);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      if (data.details.length === 0) return null;
      return (
        <div className="bg-[#2c2c2e] border border-white/10 p-5 rounded-2xl shadow-2xl min-w-[200px]">
          <p className="text-[12px] font-black text-white mb-3 border-b border-white/10 pb-2">{data.name}월 상세</p>
          <div className="space-y-3">
            {data.details.map((d: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center gap-4">
                <span className={`text-[11px] font-bold px-2 py-1 rounded-md ${d.user === '나' ? 'bg-[#4B96FF]/20 text-[#4B96FF]' : 'bg-[#E2F2D5]/20 text-[#E2F2D5]'}`}>[{d.user}] {d.type}</span>
                <span className="text-[13px] font-black tabular-nums text-white">{formatNumber(d.amount)}</span>
              </div>
            ))}
            <div className="pt-3 border-t border-white/10 flex justify-between items-center text-[#4B96FF] font-black">
              <span className="text-[11px]">합계</span><span className="text-[14px]">{formatNumber(data['합계'])}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-6 pb-20 px-2">

      
      <div className="bg-[#1c1c1e] p-8 rounded-[32px] border border-white/5 shadow-[0_10px_40px_rgba(0,0,0,0.3)] space-y-6">
        <div className="flex justify-between items-end">
          <span className="text-[12px] font-black text-brand-text-sub uppercase tracking-widest bg-white/5 px-3 py-1.5 rounded-xl">{selectedYear} 총수입</span>
          <span className="text-3xl font-black tabular-nums text-white tracking-tighter">{formatCurrency(totalAnnual)}</span>
        </div>
        <div className="space-y-3 pt-2">
          <div className="h-4 w-full bg-black/40 rounded-full overflow-hidden flex shadow-inner border border-white/5">
            <motion.div initial={{ width: 0 }} animate={{ width: `${myRatio}%` }} className="h-full bg-[#4B96FF]" />
            <motion.div initial={{ width: 0 }} animate={{ width: `${gamjaRatio}%` }} className="h-full bg-[#E2F2D5]" />
          </div>
          <div className="flex justify-between text-[12px] font-black">
            <div className="flex flex-col">
              <span className="text-[#4B96FF]">나 {myRatio.toFixed(1)}%</span>
              <span className="text-base md:text-lg font-black tabular-nums text-white">{formatCurrency(totalMyAnnual)}</span>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-[#E2F2D5]">감자 {gamjaRatio.toFixed(1)}%</span>
              <span className="text-base md:text-lg font-black tabular-nums text-white">{formatCurrency(totalGamjaAnnual)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#1c1c1e] p-8 rounded-[32px] border border-white/5 space-y-6 shadow-2xl">
        <div className="flex items-center justify-between">
           <h4 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">급여 입력</h4>
          <input type="date" value={newEntry.date} onChange={e => setNewEntry({...newEntry, date: e.target.value})} className="bg-black/40 border border-white/5 rounded-xl px-3 py-2 text-[14px] font-bold outline-none text-white" />
        </div>
        <div className="space-y-2">
          <label className="text-[11px] font-black text-brand-text-sub uppercase ml-2 tracking-widest">대상</label>
          <div className="flex bg-black/40 rounded-2xl p-1 border border-white/5">
            <button onClick={() => setNewEntry({...newEntry, target: '나'})} className={`flex-1 py-3 rounded-xl text-[14px] font-black transition-colors ${newEntry.target === '나' ? 'bg-[#4B96FF] text-white shadow-md' : 'text-brand-text-sub hover:text-white'}`}>내 월급</button>
            <button onClick={() => setNewEntry({...newEntry, target: '감자'})} className={`flex-1 py-3 rounded-xl text-[14px] font-black transition-colors ${newEntry.target === '감자' ? 'bg-[#E2F2D5] text-[#A0C7DF] shadow-md' : 'text-brand-text-sub hover:text-white'}`}>감자 월급</button>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[11px] font-black text-brand-text-sub uppercase ml-2 tracking-widest">항목</label>
          <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide snap-x">
            {SALARY_TYPES.map(type => (
              <button key={type} onClick={() => setNewEntry({...newEntry, type: type as SalaryType})} className={`shrink-0 snap-start px-5 py-3 rounded-xl text-[13px] font-black transition-all border ${newEntry.type === type ? 'bg-[#4B96FF]/20 text-[#4B96FF] border-[#4B96FF]/50' : 'bg-black/40 text-brand-text-sub border-white/5 hover:bg-white/5'}`}>{salaryLabels[type] || type}</button>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="p-4 bg-[#4B96FF]/10 border border-[#4B96FF]/30 rounded-2xl">
            <NumericInput label="금액 입력" value={newEntry.amount} onChange={(v: number) => setNewEntry({...newEntry, amount: v})} className="w-full bg-transparent border-none text-2xl font-black text-[#4B96FF] outline-none tabular-nums placeholder:text-[#4B96FF]/30" placeholder="0" />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-black text-brand-text-sub uppercase ml-2 tracking-widest">메모</label>
            {!isMemoActive ? (
              <button onClick={() => setIsMemoActive(true)} className="w-full text-left px-5 py-4 bg-black/40 border border-white/5 rounded-2xl text-brand-text-sub text-[14px] font-bold">클릭하여 메모 입력...</button>
            ) : (
              <input autoFocus type="text" value={newEntry.memo} placeholder="메모 입력" onChange={e => setNewEntry({...newEntry, memo: e.target.value})} onBlur={() => newEntry.memo === '' && setIsMemoActive(false)} className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-[14px] text-white outline-none focus:border-[#4B96FF]" />
            )}
          </div>
        </div>
        <div className="pt-2">
          <button onClick={handleAddSalary} className="w-full bg-[#4B96FF] text-white font-black py-5 rounded-2xl text-[16px] active:scale-[0.98] transition-all uppercase tracking-widest shadow-[0_8px_30px_rgba(75,150,255,0.4)]">등록</button>
        </div>
      </div>

      <div className="bg-[#1c1c1e] p-8 rounded-[32px] border border-white/5 shadow-[0_10px_40px_rgba(0,0,0,0.3)] overflow-hidden">
        <h4 className="text-[13px] font-black uppercase mb-6 text-white">월별 비교</h4>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlySalaryData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8e8e93', fontSize: 12, fontWeight: 'bold' }} interval={0} />
              <YAxis hide />
              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} content={<CustomTooltip />} />
              <Bar dataKey="나" fill="#4B96FF" radius={[0, 0, 0, 0]} barSize={12} />
              <Bar dataKey="감자" fill="#E2F2D5" radius={[0, 0, 0, 0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>






{/* 3번: 월급 내역 나열 및 연동 삭제 섹션 */}
      <div className="bg-[#1c1c1e] rounded-[32px] border border-white/5 overflow-hidden shadow-2xl">
        <div className="px-8 py-5 border-b border-white/5 bg-white/5 flex justify-between items-center">
          <h4 className="text-[13px] font-black text-white uppercase tracking-widest">이번 달 월급 상세 내역</h4>
          <span className="text-[11px] font-bold text-brand-text-sub bg-white/10 px-3 py-1 rounded-full">
            {monthlySalaryData[currentDate.getMonth()].details.length}건
          </span>
        </div>
        <div className="divide-y divide-white/5 max-h-[350px] overflow-y-auto custom-scrollbar">
          {[...salaries.mySalaryRecords, ...salaries.gamjaSalaryRecords]
            .filter(r => {
              const d = new Date(r.date);
              return d.getMonth() === currentDate.getMonth() && d.getFullYear() === selectedYear;
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map((record: any) => (
              <div key={record.id} className="px-8 py-5 flex justify-between items-center active:bg-white/5 transition-colors">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${record.target === '나' ? 'bg-[#4B96FF] text-white' : 'bg-[#E2F2D5] text-[#121212]'}`}>
                      {record.target}
                    </span>
                    <p className="text-[14px] font-black text-white">{salaryLabels[record.type] || record.type}</p>
                  </div>
                  <p className="text-[10px] text-brand-text-sub">{record.date} {record.memo && `| ${record.memo}`}</p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-base font-black text-white tabular-nums">
                    {new Intl.NumberFormat('ko-KR').format(record.amount)}
                  </p>
                  <button 
                    onClick={() => {
                      if(confirm('이 월급 내역을 삭제하시겠습니까? 연동된 통장 잔액도 함께 차감됩니다.')) {
                        if (record.target === '나') {
                          setSalaries({...salaries, mySalaryRecords: salaries.mySalaryRecords.filter((r:any) => r.id !== record.id)});
                          setTransactions((prev:any) => prev.filter((t:any) => t.id !== `salary-${record.id}`));
                        } else {
                          setSalaries({...salaries, gamjaSalaryRecords: salaries.gamjaSalaryRecords.filter((r:any) => r.id !== record.id)});
                          setGamjaTransactions((prev:any) => prev.filter((t:any) => t.id !== `salary-g-${record.id}`));
                        }
                      }
                    }} 
                    className="p-2 text-brand-text-sub active:text-[#FFA59E] bg-white/5 rounded-xl"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          {monthlySalaryData[currentDate.getMonth()].details.length === 0 && (
            <div className="py-16 text-center opacity-20 font-black uppercase tracking-[0.2em] text-[10px]">내역이 없습니다.</div>
          )}
        </div>
      </div>
      


      
      <div className="bg-[#1c1c1e] border border-white/5 rounded-[32px] overflow-hidden shadow-2xl">
        <button onClick={() => setIsLabelSettingsOpen(!isLabelSettingsOpen)} className="w-full px-8 py-6 flex items-center justify-between hover:bg-white/5 transition-all">
          <span className="text-[13px] font-black text-white uppercase tracking-widest">명칭 설정</span>
          <ChevronRight size={20} className={`text-brand-text-sub transition-transform ${isLabelSettingsOpen ? 'rotate-90' : ''}`} />
        </button>
        <AnimatePresence>
          {isLabelSettingsOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="px-8 pb-8 pt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 bg-black/20 border-t border-white/5">
                {SALARY_TYPES.map(type => (
                  <div key={type} className="space-y-2">
                    <span className="text-[11px] font-bold text-brand-text-sub px-1">{type}</span>
                    <input type="text" value={salaryLabels[type]} onChange={e => setSalaryLabels({...salaryLabels, [type]: e.target.value})} className="w-full bg-[#2c2c2e] border border-white/5 rounded-xl text-[13px] p-3 font-bold outline-none text-white focus:border-[#4B96FF] transition-colors" />
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/*1년 결산*/




/*1년 결산*/
function AnnualSettlementView({ transactions, gamjaTransactions, salaries, tabName, setTabName }: any) {
  const selectedYear = new Date().getFullYear();
  const [reportTab, setReportTab] = useState<'나' | '감자'>('나');

  const processData = (txs: any[], salaryRecords: any[]) => {
    // 연봉 계산
    const annualSalary = salaryRecords.filter((r: any) => new Date(r.date).getFullYear() === selectedYear).reduce((s: number, r: any) => s + r.amount, 0);
    
    // 전체 지출 내역
    const allExpenseTxs = txs.filter((t: any) => t.type === '지출' && new Date(t.date).getFullYear() === selectedYear);
    
    // [수정] 연금 항목은 계산에서 제외 (합계 및 남은 자산 계산용)
    const filteredExpenseTxs = allExpenseTxs.filter(t => !t.category.includes('연금'));
    const totalExpense = filteredExpenseTxs.reduce((sum, t) => sum + t.amount, 0);

    const categoryTotals: Record<string, number> = {};
    allExpenseTxs.forEach((t: any) => { 
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount; 
    });

    // [수정] 그래프용 데이터: 연금을 맨 위로 올리고 계산은 안 하되 수치만 표시
    const chartDataRaw = Object.entries(categoryTotals).map(([name, value]) => ({
      name,
      value: value as number,
      // 연금은 전체 지출 퍼센트 계산에서 제외하거나 별도 표시
      percent: totalExpense > 0 ? ((value as number / totalExpense) * 100).toFixed(1) : '0',
      isPension: name.includes('연금')
    }));

    // 정렬: 연금 우선 배치 -> 나머지 금액순 정렬
    const chartData = [
      ...chartDataRaw.filter(item => item.isPension),
      ...chartDataRaw.filter(item => !item.isPension).sort((a, b) => b.value - a.value)
    ];

    return { annualSalary, totalExpense, remaining: annualSalary - totalExpense, chartData };
  };

  const myData = processData(transactions, salaries.mySalaryRecords);
  const gamjaData = processData(gamjaTransactions, salaries.gamjaSalaryRecords);
  const totalAnnualSalary = myData.annualSalary + gamjaData.annualSalary;
  const totalAnnualExpense = myData.totalExpense + gamjaData.totalExpense;
  const totalRemaining = myData.remaining + gamjaData.remaining;

  const COLORS = ['#4B96FF', '#A0C7DF', '#E2F2D5', '#FFA59E', '#FFE1EA'];

  // [유지] 엑셀 다운로드 기능 (연금 데이터 포함 유지)
  const downloadYearlyReport = () => {
    const localLoans = JSON.parse(localStorage.getItem('myLoans') || '[]');
    const localBalances = JSON.parse(localStorage.getItem('myBalances') || '[]');
    const header = ["날짜", "구분", "카테고리/항목", "금액", "메모/상세"];
    const summaryHeader = ["구분", "총 연봉", "총 지출", "여유 자산", ""];
    const summaryData = [
      ["나", myData.annualSalary, myData.totalExpense, myData.remaining, ""].join(","),
      ["감자", gamjaData.annualSalary, gamjaData.totalExpense, gamjaData.remaining, ""].join(","),
      ["합계", totalAnnualSalary, totalAnnualExpense, totalRemaining, ""].join(",")
    ];
    const myYearly = transactions.filter((t: any) => new Date(t.date).getFullYear() === selectedYear).map((t: any) => [t.date, t.type, t.category, t.amount, `"${(t.memo || "").replace(/"/g, '""')}"`].join(","));
    const gamjaYearly = gamjaTransactions.filter((t: any) => t.date && new Date(t.date).getFullYear() === selectedYear).map((t: any) => [t.date, t.type, t.category, t.amount, `"${(t.memo || "").replace(/"/g, '""')}"`].join(","));
    const mySalData = salaries.mySalaryRecords.filter((r: any) => new Date(r.date).getFullYear() === selectedYear).map((r: any) => [r.date, "급여(나)", r.type, r.amount, `"${(r.memo || "").replace(/"/g, '""')}"`].join(","));
    const gamjaSalData = salaries.gamjaSalaryRecords.filter((r: any) => new Date(r.date).getFullYear() === selectedYear).map((r: any) => [r.date, "급여(감자)", "월급", r.amount, `"${(r.memo || "").replace(/"/g, '""')}"`].join(","));
    
    const loanData: string[] = [];
    localLoans.forEach((loan: any) => {
      (loan.repayments || []).filter((r: any) => new Date(r.date).getFullYear() === selectedYear).forEach((r: any) => {
        loanData.push([r.date, `대출(${loan.name})`, "원금", r.principal, `"${r.turn || ''}회차 / ${(r.memo || "")}"`].join(","));
        if (r.interest > 0) loanData.push([r.date, `대출(${loan.name})`, "이자", r.interest, ""].join(","));
      });
    });

    const pensionData = localBalances.filter((b: any) => b.category === '투자/연금').map((b: any) => [new Date().toISOString().split('T')[0], "자산현황", b.name, b.currentBalance, "현재 잔액"].join(","));
    
    const csvContent = [`--- ${selectedYear}년 요약 ---`, summaryHeader.join(","), ...summaryData, "\n", `--- 나 지출 ---`, header.join(","), ...myYearly, "\n", `--- 감자 지출 ---`, header.join(","), ...gamjaYearly, "\n", `--- 월급 ---`, header.join(","), ...mySalData, ...gamjaSalData, "\n", `--- 대출 ---`, header.join(","), ...loanData, "\n", `--- 연금 ---`, header.join(","), ...pensionData].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const dateStr = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '-').replace(/\./g, '');
    a.href = url; a.download = `${selectedYear}년_결산_${dateStr}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-6 pb-24 px-1">
      {/* 연간 요약 카드 */}
      <div className="bg-[#1c1c1e] p-3 py-6 border border-white/5 rounded-[24px] shadow-lg">
        <p className="text-[12px] font-black text-[#4B96FF] uppercase mb-5 tracking-widest text-center bg-[#4B96FF]/10 py-1.5 rounded-lg w-fit mx-auto px-4">{selectedYear}년 총합계</p>
        <div className="flex w-full">
          <div className="flex-1 flex flex-col items-center border-r border-white/10 px-0.5">
            <p className="text-[10px] font-bold text-brand-text-sub mb-1 uppercase tracking-tighter">연봉</p>
            <p className="text-[14px] font-black tabular-nums text-white tracking-tighter text-center">{formatNumber(totalAnnualSalary)}</p>
          </div>
          <div className="flex-1 flex flex-col items-center border-r border-white/10 px-0.5">
            <p className="text-[10px] font-bold text-brand-text-sub mb-1 uppercase tracking-tighter">지출</p>
            <p className="text-[14px] font-black text-[#FFA59E] tabular-nums tracking-tighter text-center">{formatNumber(totalAnnualExpense)}</p>
          </div>
          <div className="flex-1 flex flex-col items-center px-0.5">
            <p className="text-[10px] font-bold text-brand-text-sub mb-1 uppercase tracking-tighter">자산</p>
            <p className="text-[14px] font-black text-[#4B96FF] tabular-nums tracking-tighter text-center">{formatNumber(totalRemaining)}</p>
          </div>
        </div>
      </div>

      {/* 탭 버튼 */}
      <div className="flex bg-black/40 rounded-2xl p-1 border border-white/5 mx-1">
        <button onClick={() => setReportTab('나')} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${reportTab === '나' ? 'bg-[#4B96FF] text-[#121212] shadow-lg' : 'text-brand-text-sub'}`}>나 결산</button>
        <button onClick={() => setReportTab('감자')} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${reportTab === '감자' ? 'bg-[#E2F2D5] text-[#121212] shadow-lg' : 'text-brand-text-sub'}`}>감자 결산</button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={reportTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-6">
          {(() => {
            const user = reportTab === '나' 
              ? { label: '나', data: myData, bg: 'bg-[#4B96FF]', text: 'text-[#121212]' }
              : { label: '감자', data: gamjaData, bg: 'bg-[#E2F2D5]', text: 'text-[#121212]' };
            return (
              <>
                {/* 사용자별 요약 */}
                <div className="bg-[#1c1c1e] p-3 py-6 border border-white/5 rounded-[24px] shadow-2xl">
                  <div className="flex w-full">
                    <div className="flex-1 flex flex-col items-center border-r border-white/10 px-0.5">
                      <p className="text-[9px] font-bold text-brand-text-sub mb-1 uppercase tracking-tighter">연봉</p>
                      <p className="text-[13px] font-black tabular-nums text-white text-center tracking-tighter">{formatNumber(user.data.annualSalary)}</p>
                    </div>
                    <div className="flex-1 flex flex-col items-center border-r border-white/10 px-0.5">
                      <p className="text-[9px] font-bold text-brand-text-sub mb-1 uppercase tracking-tighter">지출</p>
                      <p className="text-[13px] font-black text-[#FFA59E] tabular-nums text-center tracking-tighter">{formatNumber(user.data.totalExpense)}</p>
                    </div>
                    <div className="flex-1 flex flex-col items-center px-0.5">
                      <p className="text-[9px] font-bold text-brand-text-sub mb-1 uppercase tracking-tighter">자산</p>
                      <p className="text-[13px] font-black text-[#4B96FF] tabular-nums text-center tracking-tighter">{formatNumber(user.data.remaining)}</p>
                    </div>
                  </div>
                </div>

                {/* 많이 쓴 항목 그래프 */}
                <div className="bg-[#1c1c1e] p-6 border border-white/5 rounded-[24px] shadow-2xl">
                  <h4 className="text-[13px] font-black mb-6 flex justify-between items-center text-white">
                    <span>많이 쓴 항목</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md ${user.bg} ${user.text}`}>{user.label}</span>
                  </h4>
                  <div className="space-y-5">
                    {user.data.chartData.map((item, idx, array) => (
                      <div key={item.name} className="space-y-1.5">
                        <div className="flex justify-between items-end">
                          <div className="flex items-center gap-2">
                            <span className={`text-[12px] font-bold ${item.isPension ? 'text-[#4B96FF]' : 'text-white/90'}`}>
                              {item.isPension ? `[연금] ${item.name}` : item.name}
                            </span>
                            {!item.isPension && <span className="text-[10px] text-brand-text-sub">{item.percent}%</span>}
                          </div>
                          <span className={`text-[11px] font-black tabular-nums ${item.isPension ? 'text-[#4B96FF]' : 'text-white/60'}`}>
                            {formatNumber(item.value)}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 shadow-inner">
                          <motion.div initial={{ width: 0 }} animate={{ width: item.isPension ? '100%' : `${item.percent}%` }} 
                            className="h-full rounded-full" 
                            style={{ backgroundColor: item.isPension ? '#4B96FF' : COLORS[idx % COLORS.length] }} />
                        </div>
                        {/* 연금 항목과 일반 항목 사이 구분선 */}
                        {item.isPension && !array[idx + 1]?.isPension && (
                          <div className="py-2">
                            <div className="border-b border-dashed border-white/10" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            );
          })()}
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-center pt-8">
        <button onClick={downloadYearlyReport} className="flex items-center gap-3 px-10 py-5 bg-[#4B96FF] rounded-2xl text-[14px] font-black text-white shadow-[0_8px_30px_rgba(75,150,255,0.3)] active:scale-95 transition-all uppercase tracking-widest">저장하기</button>
      </div>
    </motion.div>
  );
}


function TransactionEditModal({ isOpen, onClose, transactions, setTransactions, categories, setCategories, title }: any) {
  const [editedTxs, setEditedTxs] = useState<any[]>([]);
  const [editedCategories, setEditedCategories] = useState<any>({ expense: [], income: [] });

  useEffect(() => { 
    if (isOpen) { 
      setEditedTxs([...transactions]); 
      setEditedCategories({ ...categories }); 
    } 
  }, [isOpen, transactions, categories]);

  const handleUpdateTx = (id: string, field: string, value: any) => setEditedTxs(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  const handleDeleteTx = (id: string) => setEditedTxs(prev => prev.filter(t => t.id !== id));
  
  // 카테고리 개별 수정 로직 (리스트형)
  const handleCategoryNameChange = (type: 'expense' | 'income', index: number, newName: string) => {
    const newCats = { ...editedCategories };
    newCats[type][index] = newName;
    setEditedCategories(newCats);
  };

  const handleAddCategory = (type: 'expense' | 'income') => {
    const newCats = { ...editedCategories };
    newCats[type] = [...newCats[type], "새 항목"];
    setEditedCategories(newCats);
  };

  const handleRemoveCategory = (type: 'expense' | 'income', index: number) => {
    const newCats = { ...editedCategories };
    newCats[type] = newCats[type].filter((_: any, i: number) => i !== index);
    setEditedCategories(newCats);
  };

  const handleSave = () => { 
    setTransactions(editedTxs); 
    setCategories(editedCategories); 
    onClose(); 
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose} />
      <div className="bg-[#1c1c1e] border border-white/10 rounded-[32px] w-full max-w-6xl h-[85vh] flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.8)] relative z-10 overflow-hidden">
        
        {/* 헤더 영역 */}
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-white/5 to-transparent">
           <h3 className="text-xl font-black uppercase tracking-tight text-white">{title}</h3>
           <button onClick={onClose} className="p-4 hover:bg-[#FFA59E] hover:text-white rounded-xl transition-all text-brand-text-sub bg-white/5"><X size={24} /></button>
        </div>
        
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
           
           {/* 내역 리스트 (왼쪽) */}
           <div className="flex-1 flex flex-col overflow-hidden border-r border-white/5">
              <div className="p-5 bg-black/40 border-b border-white/5 flex justify-between items-center">
                 <p className="text-[11px] font-black uppercase tracking-widest text-brand-text-sub">리스트 ({editedTxs.length})</p>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar bg-black/20">
                 {editedTxs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((t: any) => (
                   <div key={t.id} className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3 bg-[#2c2c2e] border border-white/5 rounded-2xl hover:border-[#4B96FF]/50 transition-all items-center shadow-md">
                      <div className="sm:col-span-3">
                         <input type="date" value={t.date} onChange={e => handleUpdateTx(t.id, 'date', e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2 text-[12px] font-bold text-white outline-none focus:border-[#4B96FF]" />
                      </div>
                      <div className="sm:col-span-3">
                         <select value={t.category} onChange={e => handleUpdateTx(t.id, 'category', e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2 text-[12px] font-bold text-white outline-none focus:border-[#4B96FF]">
                            {(t.type === '지출' ? editedCategories.expense : editedCategories.income).map((c: string) => <option key={c} value={c}>{c}</option>)}
                         </select>
                      </div>
                      <div className="sm:col-span-4">
                         <input type="text" value={t.memo} placeholder="메모" onChange={e => handleUpdateTx(t.id, 'memo', e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2 text-[12px] font-bold text-white outline-none focus:border-[#4B96FF]" />
                      </div>
                      <div className="sm:col-span-2 flex justify-end">
                         <button onClick={() => handleDeleteTx(t.id)} className="text-[#FFA59E] hover:bg-[#FFA59E] hover:text-white p-3 rounded-xl transition-all active:scale-90 bg-[#FFA59E]/10"><Trash2 size={18} /></button>
                      </div>
                   </div>
                 ))}
              </div>
           </div>

           {/* 카테고리 관리 (오른쪽 - 리스트형 수정 및 추가) */}
           <div className="w-full lg:w-96 flex flex-col overflow-hidden bg-black/30">
              <div className="p-5 bg-black/40 border-b border-white/5 flex justify-between items-center">
                 <p className="text-[11px] font-black uppercase tracking-widest text-brand-text-sub">카테고리 설정</p>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                 
                 {/* 지출 카테고리 리스트 */}
                 <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                       <div className="flex items-center gap-2">
                          <Minus size={18} className="text-[#FFA59E]" />
                          <p className="text-[12px] font-black text-[#FFA59E] uppercase tracking-widest">지출 항목</p>
                       </div>
                       <button onClick={() => handleAddCategory('expense')} className="p-1.5 bg-[#FFA59E]/20 text-[#FFA59E] rounded-lg active:scale-90 transition-transform"><Plus size={16}/></button>
                    </div>
                    <div className="space-y-2">
                       {editedCategories.expense.map((cat: string, idx: number) => (
                         <div key={idx} className="flex gap-2">
                            <input value={cat} onChange={(e) => handleCategoryNameChange('expense', idx, e.target.value)} className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-[13px] font-bold text-white focus:border-[#FFA59E] outline-none transition-all" />
                            <button onClick={() => handleRemoveCategory('expense', idx)} className="px-3 bg-white/5 text-[#FFA59E] rounded-xl active:scale-95"><Minus size={14}/></button>
                         </div>
                       ))}
                    </div>
                 </div>

                 {/* 수입 카테고리 리스트 */}
                 <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                       <div className="flex items-center gap-2">
                          <Plus size={18} className="text-[#4B96FF]" />
                          <p className="text-[12px] font-black text-[#4B96FF] uppercase tracking-widest">수입 항목</p>
                       </div>
                       <button onClick={() => handleAddCategory('income')} className="p-1.5 bg-[#4B96FF]/20 text-[#4B96FF] rounded-lg active:scale-90 transition-transform"><Plus size={16}/></button>
                    </div>
                    <div className="space-y-2">
                       {editedCategories.income.map((cat: string, idx: number) => (
                         <div key={idx} className="flex gap-2">
                            <input value={cat} onChange={(e) => handleCategoryNameChange('income', idx, e.target.value)} className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-[13px] font-bold text-white focus:border-[#4B96FF] outline-none transition-all" />
                            <button onClick={() => handleRemoveCategory('income', idx)} className="px-3 bg-white/5 text-[#4B96FF] rounded-xl active:scale-95"><Minus size={14}/></button>
                         </div>
                       ))}
                    </div>
                 </div>

              </div>
           </div>
        </div>

        {/* 하단 버튼 영역 */}
        <div className="p-8 border-t border-white/5 bg-[#1c1c1e] flex gap-5">
           <button onClick={onClose} className="flex-1 py-5 border border-white/10 rounded-2xl font-bold uppercase text-[13px] text-white hover:bg-white/10 transition-all tracking-widest">취소</button>
           <button onClick={handleSave} className="flex-[2] py-5 bg-[#4B96FF] text-white rounded-2xl font-black uppercase text-[14px] shadow-[0_10px_30px_rgba(75,150,255,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all tracking-widest">저장하기</button>
        </div>
      </div>
    </div>
  );
}




// --- HELPERS ---
function SummarySmallCard({ label, value, color }: { label: string, value: string | number, color: string }) {
  return (
    <div className="bg-[#2c2c2e] p-5 md:p-6 rounded-2xl hover:scale-[1.02] transition-transform shadow-[0_8px_30px_rgba(0,0,0,0.2)] border border-white/5 flex flex-col justify-center min-h-[120px]">
      <p className="text-[11px] md:text-[12px] font-black text-brand-text-sub uppercase mb-2 tracking-wider">{label}</p>
      <p className={`text-xl md:text-2xl font-black ${color} tabular-nums tracking-tight`}>
        {typeof value === 'number' ? formatCurrency(value) : value}
      </p>
    </div>
  );
}

function Calendar({ currentDate, transactions, selectedDateStr, onDateClick }: any) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  return (
    <div className="-mx-6 md:mx-0 grid grid-cols-7 gap-px bg-white/5 border-y md:border border-white/5 rounded-2xl overflow-hidden shadow-inner">
      {['일', '월', '화', '수', '목', '금', '토'].map(d => (
        <div key={d} className="text-[11px] text-center font-black text-brand-text-sub py-4 bg-[#1c1c1e] border-b border-white/5 uppercase tracking-widest">{d}</div>
      ))}
      {days.map((day, idx) => {
        if (!day) return <div key={`empty-${idx}`} className="bg-black/20" />;
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayTransactions = transactions.filter((t: any) => t.date === dateStr);
        const hasExpense = dayTransactions.some((t: any) => t.type === '지출');
        const hasIncome = dayTransactions.some((t: any) => t.type === '수입');
        const isToday = new Date().toISOString().split('T')[0] === dateStr;
        const isSelected = selectedDateStr === dateStr;

        return (
          <button 
            key={idx} onClick={() => onDateClick(dateStr)}
            className={`min-h-[70px] md:min-h-[90px] p-2 border transition-all flex flex-col items-center justify-between relative overflow-hidden ${
              isSelected ? 'bg-[#4B96FF]/20 border-[#4B96FF] z-10' :
              isToday ? 'bg-white/10 border-white/30' : 'bg-[#1c1c1e] border-transparent hover:bg-white/5'
            }`}
          >
            <span className={`text-[13px] md:text-[15px] font-black mt-1 ${isSelected ? 'text-[#4B96FF]' : isToday ? 'text-white' : 'text-brand-text-sub'}`}>{day}</span>
            <div className="flex gap-2 mb-2">
               {hasIncome && <span className="w-2 h-2 rounded-full bg-[#4B96FF] shadow-[0_0_8px_#4B96FF]"></span>}
               {hasExpense && <span className="w-2 h-2 rounded-full bg-[#FFA59E] shadow-[0_0_8px_#FFA59E]"></span>}
            </div>
          </button>
        );
      })}
    </div>
  );
}
