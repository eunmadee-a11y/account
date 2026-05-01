/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect, ReactNode, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, 
  CreditCard, 
  TrendingUp, 
  User, 
  ArrowLeftRight as ComparisonIcon,
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Minus,
  Calendar as CalendarIcon,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Coins,
  LayoutDashboard,
  CheckCircle2,
  MoreVertical,
  Activity,
  Trash2,
  ArrowRightLeft,
  X,
  CreditCard as LoanIcon,
  Edit2,
  Search,
  BarChart2,
  Filter
} from 'lucide-react';
import { 
  Transaction, 
  TransactionType, 
  TabName, 
  BalanceEntry, 
  SalaryData,
  SalaryType,
  SalaryRecord,
  Loan,
  GamjaTransaction,
  LoanRepayment
} from './types';
import { 
  EXPENSE_CATEGORIES, 
  INCOME_CATEGORIES, 
  MY_ACCOUNTS, 
  GAMJA_ACCOUNTS,
  SALARY_TYPES,
  LOAN_NAMES,
  MOCK_TRANSACTIONS,
  INITIAL_BALANCES,
  MOCK_GAMJA_TRANSACTIONS,
  INITIAL_LOANS
} from './constants';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell as ReCell 
} from 'recharts';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ko-KR').format(Math.floor(amount)) + '원';
};

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('ko-KR').format(num);
};


function exportCSV(transactions: any[]) {
  if (!transactions.length) {
    alert("데이터 없음");
    return;
  }

  const header = ["날짜","구분","카테고리","통장","금액","메모"];

  const rows = transactions.map((t) => [
    t.date,
    t.type,
    t.category,
    t.account,
    t.amount,
    t.memo || ""
  ]);

  const csvContent =
    [header, ...rows]
      .map((e) => e.join(","))
      .join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "budget.csv";
  a.click();

  URL.revokeObjectURL(url);
}



function EditableHeader({ title, setTitle, description }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(title);

  const handleSave = () => {
    if (inputValue.trim()) {
      setTitle(inputValue);
    }
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3 group">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input 
              autoFocus
              type="text" 
              value={inputValue} 
              onChange={e => setInputValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              className="text-2xl font-black bg-brand-bg border-b-2 border-brand-primary outline-none px-1"
            />
          </div>
        ) : (
          <div className="flex items-center gap-3">

            <h3 className="text-xl md:text-2xl font-bold">{title}</h3>
            <button 
              onClick={() => setIsEditing(true)}
              className="p-1.5 rounded-lg hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-all text-brand-text-sub"
            >
              <Edit2 size={16} />
            </button>
          </div>
        )}
      </div>
      {description && <p className="text-brand-text-sub font-medium">{description}</p>}
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
      {label && <label className="text-[11px] font-black text-brand-text-sub uppercase ml-1">{label}</label>}
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
  // Global State
  const [activeTab, setActiveTab] = useState<TabName>('홈');
  const [tabNames, setTabNames] = useState<Record<TabName, string>>({
    '홈': '홈',
    '내 지출': '내 지출',
    '연금/투자 관리': '연금/투자 관리',
    '감자 지출': '감자 지출',
    '월급 비교': '월급 비교',
    '대출 관리': '대출 관리',
    '1년 결산': '1년 결산'
  });
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(new Date().toISOString().split('T')[0]);
  
  // Search State
  const [mySearchQuery, setMySearchQuery] = useState('');
  const [gamjaSearchQuery, setGamjaSearchQuery] = useState('');

  // Data State
  const [transactions, setTransactions] = useState<Transaction[]>(MOCK_TRANSACTIONS);
  const [gamjaTransactions, setGamjaTransactions] = useState<GamjaTransaction[]>(MOCK_GAMJA_TRANSACTIONS);
  const [balances, setBalances] = useState<BalanceEntry[]>(INITIAL_BALANCES);
  const [salaries, setSalaries] = useState<SalaryData>({ 
    mySalaryRecords: [], 
    gamjaSalaryRecords: [], 
    mySalary: 3500000, 
    gamjaSalary: 4200000 
  });
  const [loans, setLoans] = useState<Loan[]>(INITIAL_LOANS);

  // Category State (Editable)
  const [myCategories, setMyCategories] = useState({
    income: [...INCOME_CATEGORIES],
    expense: [...EXPENSE_CATEGORIES]
  });
  const [gamjaCategories, setGamjaCategories] = useState({
    income: [...INCOME_CATEGORIES],
    expense: [...EXPENSE_CATEGORIES]
  });

  // State for Edit Modals
  const [isMyEditModalOpen, setIsMyEditModalOpen] = useState(false);
  const [isGamjaEditModalOpen, setIsGamjaEditModalOpen] = useState(false);

  const [salaryLabels, setSalaryLabels] = useState<Record<string, string>>({
    '메모': '기본급',
    'A': '시간외수당',
    'B': '보너스',
    'C': '성과금',
    'D': '식대',
    'E': '교통비',
    'F': '기타'
  });

  const currentMonthDisplay = `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월`;

  // Calculated Summaries
  const filteredData = useMemo(() => {
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    
    const currMonthTxs = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === month && d.getFullYear() === year;
    });

    const income = currMonthTxs.filter(t => t.type === '수입').reduce((sum, t) => sum + t.amount, 0);
    const expense = currMonthTxs.filter(t => t.type === '지출').reduce((sum, t) => sum + t.amount, 0);
    
    // Previous Month Comparison
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

    return { 
      currMonthTxs, 
      income, 
      expense, 
      savings: income - expense, 
      noSpendDays,
      prevIncome,
      prevExpense
    };
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

  const myAccountNames = useMemo(() => 
    balances.filter((b: any) => b.category === '내 통장').map((b: any) => b.name)
  , [balances]);

  const gamjaAccountNames = useMemo(() => 
    balances.filter((b: any) => b.category === '감자 자산').map((b: any) => b.name)
  , [balances]);

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
    
    // Current month repayment
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

  // Handlers
  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const updateBalance = (id: string, value: number) => {
    setBalances(prev => prev.map(b => b.id === id ? { ...b, currentBalance: value } : b));
  };

  const deleteTransaction = (id: string) => {
    if (confirm('정말로 이 내역을 삭제하시겠습니까?')) {
      setTransactions(prev => prev.filter(t => t.id !== id));
    }
  };

  const deleteGamjaTransaction = (id: string) => {
    if (confirm('정말로 이 내역을 삭제하시겠습니까?')) {
      setGamjaTransactions(prev => prev.filter(t => t.id !== id));
    }
  };

  const deleteLoanRepayment = (id: string) => {
    if (confirm('정말로 이 상환 내역을 삭제하시겠습니까?')) {
      setLoans(prev => prev.filter(l => l.id !== id));
    }
  };

  // Sub-components
  const TabButton = ({ name, icon: Icon }: { name: TabName, icon: any }) => (
    <button 
      onClick={() => setActiveTab(name)}
className={`shrink-0 flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-all relative ${
  activeTab === name 
    ? 'text-brand-primary bg-brand-primary/10' 
    : 'text-brand-text-sub hover:bg-white/5'
}`}
    >
      <Icon size={16} />
      <span>{tabNames[name]}</span>
      {activeTab === name && (
        <motion.div layoutId="tab" className="absolute bottom-1 left-4 right-4 h-0.5 bg-brand-primary rounded-full shadow-[0_0_15px_rgba(148,213,255,0.6)]" />
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text-main flex flex-col font-sans selection:bg-brand-primary/30">
      {/* Navigation Rail / Header */}


{/* Navigation Rail / Header */}
<header className="sticky top-0 bg-brand-bg/80 backdrop-blur-md z-50 border-b border-brand-border">
  <div className="px-4 md:px-6 py-3 flex flex-col gap-3">
    
    {/* 1줄: 제목 / 월 이동 */}
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-brand-primary flex items-center justify-center shadow-lg shadow-brand-primary/10 shrink-0">
          <Activity size={18} className="text-white" />
        </div>
        <span className="text-sm md:text-lg font-blod tracking-tight text-brand-text-main truncate">
          Account
        </span>
      </div>

      <div className="flex items-center gap-2 bg-brand-card/50 border border-brand-border px-2.5 py-1.5 rounded-full shrink-0">
        <button
          onClick={() => changeMonth(-1)}
          className="p-1 hover:text-brand-primary transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-xs md:text-sm font-bold min-w-[88px] md:min-w-[100px] text-center">
          {currentMonthDisplay}
        </span>
        <button
          onClick={() => changeMonth(1)}
          className="p-1 hover:text-brand-primary transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>

    {/* 2줄: 모바일 가로 롤링 메뉴 */}
    <div className="relative -mx-4 md:mx-0">
      <nav className="flex gap-2 overflow-x-auto px-4 md:px-0 scrollbar-hide snap-x snap-mandatory">
        <div className="shrink-0 snap-start">
          <TabButton name="홈" icon={Home} />
        </div>
        <div className="shrink-0 snap-start">
          <TabButton name="내 지출" icon={CreditCard} />
        </div>
        <div className="shrink-0 snap-start">
          <TabButton name="연금/투자 관리" icon={TrendingUp} />
        </div>
        <div className="shrink-0 snap-start">
          <TabButton name="감자 지출" icon={User} />
        </div>
        <div className="shrink-0 snap-start">
          <TabButton name="월급 비교" icon={ComparisonIcon} />
        </div>
        
        <div className="shrink-0 snap-start">
          <TabButton name="대출 관리" icon={LoanIcon} />
        </div>
        <div className="shrink-0 snap-start">
          <TabButton name="1년 결산" icon={BarChart2} />
        </div>
      </nav>
    </div>
  </div>
</header>

      

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto p-6 md:p-8">
        <AnimatePresence mode="wait">
          {activeTab === '홈' && <HomeView key="home" {...{ totalAssets, monthlySummary: filteredData, currentDate, transactions, balances, setTransactions, selectedDateStr, setSelectedDateStr, deleteTransaction, loanSummary, myAccountNames, tabName: tabNames['홈'], setTabName: (name: string) => setTabNames(prev => ({ ...prev, '홈': name })), categories: myCategories, setCategories: setMyCategories }} />}
{activeTab === '내 지출' && <ExpenseView key="expense" {...{ transactions, setTransactions, filteredData, currentDate, deleteTransaction, myAccountNames, balances, setBalances, searchQuery: mySearchQuery, setSearchQuery: setMySearchQuery, tabName: tabNames['내 지출'], setTabName: (name: string) => setTabNames(prev => ({ ...prev, '내 지출': name })), categories: myCategories, setCategories: setMyCategories, onOpenEdit: () => setIsMyEditModalOpen(true) }} />}
{activeTab === '연금/투자 관리' && <PensionView key="pension" {...{ balances, setBalances, currentDate, tabName: tabNames['연금/투자 관리'], setTabName: (name: string) => setTabNames(prev => ({ ...prev, '연금/투자 관리': name })) }} />}
          {activeTab === '감자 지출' && <GamjaView key="gamja" {...{ gamjaTransactions, setGamjaTransactions, deleteGamjaTransaction, gamjaAccountNames, searchQuery: gamjaSearchQuery, setSearchQuery: setGamjaSearchQuery, balances, setBalances, currentDate, tabName: tabNames['감자 지출'], setTabName: (name: string) => setTabNames(prev => ({ ...prev, '감자 지출': name })), categories: gamjaCategories, setCategories: setGamjaCategories, onOpenEdit: () => setIsGamjaEditModalOpen(true) }} />}
          {activeTab === '월급 비교' && <SalaryView key="salary" {...{ salaries, setSalaries, tabName: tabNames['월급 비교'], setTabName: (name: string) => setTabNames(prev => ({ ...prev, '월급 비교': name })), salaryLabels, setSalaryLabels, currentDate }} />}
          {activeTab === '대출 관리' && <LoanManagementView key="loans" {...{ loans, setLoans, loanSummary, tabName: tabNames['대출 관리'], setTabName: (name: string) => setTabNames(prev => ({ ...prev, '대출 관리': name })) }} />}
          {activeTab === '1년 결산' && <AnnualSettlementView key="annual" {...{ transactions, gamjaTransactions, salaries, tabName: tabNames['1년 결산'], setTabName: (name: string) => setTabNames(prev => ({ ...prev, '1년 결산': name })) }} />}
        </AnimatePresence>
      </main>

      {/* Edit Modals */}
      <TransactionEditModal 
        isOpen={isMyEditModalOpen} 
        onClose={() => setIsMyEditModalOpen(false)} 
        transactions={transactions} 
        setTransactions={setTransactions} 
        categories={myCategories} 
        setCategories={setMyCategories}
        title="내 지출 내역 및 항목 관리"
      />
      <TransactionEditModal 
        isOpen={isGamjaEditModalOpen} 
        onClose={() => setIsGamjaEditModalOpen(false)} 
        transactions={gamjaTransactions} 
        setTransactions={setGamjaTransactions} 
        categories={gamjaCategories} 
        setCategories={setGamjaCategories}
        title="감자 지출 내역 및 항목 관리"
      />
    </div>
  );
}

// --- TAB VIEWS ---


/*홈 탭 */
function HomeView({ totalAssets, monthlySummary, transactions, setTransactions, selectedDateStr, setSelectedDateStr, deleteTransaction, loanSummary, balances, currentDate, myAccountNames, tabName, setTabName, categories, setCategories }: any) {
  const mainAccounts = balances.filter((b: any) => b.category === '내 통장');


const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

const homePensionTotal = balances
  .filter((b: any) => b.category === '투자/연금' && !b.name.includes('적금'))
  .reduce((sum: number, b: any) => {
    return sum + (b.monthlyBalances?.[monthKey] ?? b.currentBalance ?? 0);
  }, 0);
  

  const [activeQuickAccount, setActiveQuickAccount] = useState<string | null>(null);

  const quickAccountKeywords = ['생활비', '여유자금', '자동이체'];

  const quickAccounts = quickAccountKeywords
    .map(keyword =>
      mainAccounts.find((account: any) => account.name.includes(keyword))
    )
    .filter(Boolean);

  const selectedDateTransactions = useMemo(() => {
    if (!selectedDateStr) return [];
    return transactions.filter((t: any) => t.date === selectedDateStr);
  }, [transactions, selectedDateStr]);

  const addTransaction = (tx: any) => {
    setTransactions([tx, ...transactions]);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <EditableHeader
        title={tabName}
        setTitle={setTabName}
      />

      {/* 홈 상단 통장 입력 버튼 */}
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {quickAccounts.map((account: any) => (
            <button
              key={account.id}
              onClick={() =>
                setActiveQuickAccount(
                  activeQuickAccount === account.name ? null : account.name
                )
              }
              className={`py-2.5 px-2 rounded-xl border font-black text-xs md:text-sm transition-all active:scale-95 ${
                activeQuickAccount === account.name
                  ? 'bg-brand-primary text-white border-brand-primary shadow-lg shadow-brand-primary/20'
                  : 'bg-brand-card text-brand-text-main border-brand-border hover:border-brand-primary'
              }`}
            >
              {account.name.replace('내 ', '').replace(' 통장', '')}
            </button>
          ))}
        </div>

        {activeQuickAccount && (
          <div className="bg-brand-card p-4 border border-brand-border rounded-brand shadow-brand">
            <QuickEntryBox
              account={activeQuickAccount}
              onAdd={addTransaction}
              categories={categories}
              setCategories={setCategories}
            />
          </div>
        )}
      </div>

{/* 통장 잔액 한 박스 */}
<div className="bg-brand-card rounded-brand border border-brand-border shadow-brand overflow-hidden">

  {/* 상단 */}
  <div className="px-4 py-3 border-b border-brand-border bg-white/5 flex items-center justify-between">
    <h3 className="text-sm font-black flex items-center gap-2">
      <Wallet size={16} className="text-brand-primary" />
      내 통장 잔액
    </h3>

    {/* ✅ 합계 (적금 포함) */}
    <p className="text-sm font-black tabular-nums">
      {[
        ...mainAccounts,
        ...(mainAccounts.some((b: any) => b.name.includes('적금'))
          ? []
          : [{
              id: 'saving-temp',
              name: '내 적금',
              currentBalance: 0
            }])
      ]
        .reduce((sum: number, b: any) => sum + (b.currentBalance || 0), 0)
        .toLocaleString()}
    </p>
  </div>

  {/* 리스트 */}
  <div className="divide-y divide-brand-border">
    {[
      ...mainAccounts,
      ...(mainAccounts.some((b: any) => b.name.includes('적금'))
        ? []
        : [{
            id: 'saving-temp',
            name: '내 적금',
            category: '내 통장',
            currentBalance: 0
          }])
    ].map((b: any) => {

      const isSaving = b.name.includes('적금');

      return (
        <div key={b.id} className="px-4 py-3 flex items-center justify-between">

          {/* 통장명 */}
          <p className="text-xs md:text-sm font-black text-brand-text-sub">
            {b.name.replace('내 ', '').replace(' 통장', '')}
          </p>

          {/* 금액 영역 */}
          <div className="w-[55%] flex justify-end">

            {isSaving ? (
              <NumericInput
                value={b.currentBalance || 0}
                onChange={(v: number) => {
                  setBalances((prev: any[]) => {
                    const exists = prev.some((x: any) => x.id === b.id);

                    if (exists) {
                      return prev.map((x: any) =>
                        x.id === b.id ? { ...x, currentBalance: v } : x
                      );
                    }

                    return [...prev, { ...b, currentBalance: v }];
                  });
                }}
                className="text-right font-black tabular-nums w-full"
                placeholder="0"
              />
            ) : (
              <p className="text-base md:text-xl font-black tabular-nums text-right w-full">
                {(b.currentBalance || 0).toLocaleString()}
              </p>
            )}

          </div>
        </div>
      );
    })}
  </div>
</div>


      {/* 메인 대시보드 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummarySmallCard label="이번 달 총수입" value={monthlySummary.income} color="text-brand-mint" />
            <SummarySmallCard label="이번 달 총지출" value={monthlySummary.expense} color="text-brand-pink" />
            <SummarySmallCard label="이번 달 저축" value={monthlySummary.savings} color="text-brand-yellow" />
            <SummarySmallCard label="대출 원금 상환" value={loanSummary.totalPrincipalPaid} color="text-brand-purple" />
          </div>

          <div className="bg-brand-card rounded-brand p-6 border border-brand-border">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <TrendingUp size={20} className="text-brand-primary" />
                자산 현황 요약
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold text-brand-text-sub uppercase mb-2">총 자산</p>
                <h4 className="text-3xl font-black">{formatCurrency(totalAssets.total)}</h4>
              </div>

              <div className="h-1.5 bg-brand-border rounded-full overflow-hidden flex">
                <div className="h-full bg-brand-primary" style={{ width: `${totalAssets.total ? (totalAssets.cashLike / totalAssets.total) * 100 : 0}%` }} />
                <div className="h-full bg-brand-mint" style={{ width: `${totalAssets.total ? (totalAssets.investment / totalAssets.total) * 100 : 0}%` }} />
                <div className="h-full bg-brand-purple" style={{ width: `${totalAssets.total ? (totalAssets.gamja / totalAssets.total) * 100 : 0}%` }} />
                <div className="h-full bg-brand-yellow" style={{ width: `${totalAssets.total ? (totalAssets.others / totalAssets.total) * 100 : 0}%` }} />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px] font-bold text-brand-text-sub">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-brand-primary" />현금성
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-brand-mint" />투자/연금
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-brand-purple" />감자 자산
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-brand-yellow" />기타 자산
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 오른쪽: 대출 요약 + 캘린더 + 날짜 내역 */}
        <div className="space-y-6">
          <div className="bg-brand-card p-6 border border-brand-border rounded-brand">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold flex items-center gap-2 text-brand-purple text-lg uppercase">
                <LayoutDashboard size={20} />
                대출 요약
              </h3>
            </div>

            <div className="space-y-4">
              <div className="p-5 bg-brand-bg border border-brand-border rounded-xl">
                <p className="text-[10px] font-bold text-brand-text-sub uppercase mb-1">전체 남은 대출 금액</p>
                <p className="text-3xl font-black text-brand-pink">{formatCurrency(loanSummary.totalRemaining)}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-brand-bg border border-brand-border rounded-xl">
                  <p className="text-[9px] font-bold text-brand-text-sub uppercase mb-1">상환한 원금</p>
                  <p className="text-sm font-black text-brand-mint">{formatCurrency(loanSummary.totalPrincipalPaid)}</p>
                </div>

                <div className="p-4 bg-brand-bg border border-brand-border rounded-xl">
                  <p className="text-[9px] font-bold text-brand-text-sub uppercase mb-1">상환한 이자</p>
                  <p className="text-sm font-black text-brand-pink">{formatCurrency(loanSummary.totalInterestPaid)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-brand-card p-6 border border-brand-border rounded-brand">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold flex items-center gap-2 text-brand-purple">
                <CalendarIcon size={20} />
                지출 캘린더
              </h3>
            </div>

            <Calendar
              currentDate={currentDate}
              transactions={transactions}
              selectedDateStr={selectedDateStr}
              onDateClick={(d: string) => setSelectedDateStr(d)}
            />
          </div>

          <div className="bg-brand-card rounded-brand border border-brand-border overflow-hidden">
            <div className="px-5 py-4 border-b border-brand-border flex justify-between items-center bg-white/5">
              <h3 className="font-bold flex items-center gap-2 text-sm">
                <CalendarIcon size={16} className="text-brand-primary" />
                {selectedDateStr ? `${selectedDateStr} 내역` : '날짜를 선택하세요'}
              </h3>
              {selectedDateStr && (
                <span className="text-xs font-bold text-brand-text-sub">
                  {selectedDateTransactions.length}건
                </span>
              )}
            </div>

            <div className="divide-y divide-brand-border min-h-[100px] max-h-[360px] overflow-y-auto custom-scrollbar">
              {selectedDateTransactions.length > 0 ? (
                selectedDateTransactions.map((t: any) => (
                  <div key={t.id} className="px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        t.type === '수입'
                          ? 'bg-brand-mint/10 text-brand-mint'
                          : 'bg-brand-pink/10 text-brand-pink'
                      }`}>
                        {t.type === '수입' ? <Plus size={14} /> : <Minus size={14} />}
                      </div>

                      <div>
                        <p className="text-sm font-bold">{t.memo || t.category}</p>
                        <p className="text-[10px] text-brand-text-sub">{t.account}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <p className={`text-sm font-black ${
                        t.type === '수입' ? 'text-brand-mint' : 'text-brand-text-main'
                      }`}>
                        {t.type === '수입' ? '+' : '-'}{formatCurrency(t.amount)}
                      </p>

                      <button
                        onClick={() => deleteTransaction(t.id)}
                        className="p-2 text-brand-text-sub hover:text-brand-pink transition-all"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-10 text-center text-brand-text-sub font-bold flex flex-col items-center gap-2">
                  <CheckCircle2 size={32} className="opacity-20" />
                  {selectedDateStr ? '내역 없음 (무지출)' : '캘린더에서 날짜를 클릭하세요'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}


/*연금 투자관리*/
function PensionView({ balances, setBalances, currentDate, tabName, setTabName }: any) {
  const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  const pensionOrder = ['개인연금', 'IRP', 'irp', 'ISA', 'isa', '퇴직연금', '퇴직금'];

  const pensionAssets = balances
    .filter((b: any) => b.category === '투자/연금' && !b.name.includes('적금'))
    .sort((a: any, b: any) => {
      const aIndex = pensionOrder.findIndex(name => a.name.toLowerCase().includes(name.toLowerCase()));
      const bIndex = pensionOrder.findIndex(name => b.name.toLowerCase().includes(name.toLowerCase()));
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });

  const getMonthlyBalance = (asset: any) => {
    return asset.monthlyBalances?.[monthKey] ?? asset.currentBalance ?? 0;
  };

  const getMonthlyAddition = (asset: any) => {
    return asset.monthlyAdditions?.[monthKey] ?? 0;
  };

  const updateMonthlyBalance = (id: string, value: number) => {
    setBalances((prev: any[]) =>
      prev.map((b: any) =>
        b.id === id
          ? {
              ...b,
              currentBalance: value,
              monthlyBalances: {
                ...(b.monthlyBalances || {}),
                [monthKey]: value
              }
            }
          : b
      )
    );
  };

  const updateMonthlyAddition = (id: string, value: number) => {
    setBalances((prev: any[]) =>
      prev.map((b: any) =>
        b.id === id
          ? {
              ...b,
              monthlyAdditions: {
                ...(b.monthlyAdditions || {}),
                [monthKey]: value
              }
            }
          : b
      )
    );
  };

  const getYearlyAdditionTotal = (asset: any) => {
    const year = currentDate.getFullYear().toString();
    const additions = asset.monthlyAdditions || {};

    return Object.entries(additions)
      .filter(([key]) => key.startsWith(year))
      .reduce((sum: number, [, value]: any) => sum + (Number(value) || 0), 0);
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

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <EditableHeader
          title={tabName}
          setTitle={setTabName}
        />

        <div className="bg-brand-card border border-brand-border p-5 rounded-brand shadow-brand min-w-[280px]">
          <p className="text-[10px] font-bold text-brand-text-sub uppercase mb-1 tracking-widest">
            투자 총액
          </p>
          <p className="text-2xl font-black text-brand-primary tabular-nums">
            {formatCurrency(total)}
          </p>

          <div className="mt-4 pt-4 border-t border-brand-border">
            <p className="text-[10px] font-bold text-brand-text-sub uppercase mb-1">
              전달 대비 변동
            </p>
            <div className="flex items-center gap-2">
              <p className={`text-base font-black tabular-nums ${diff >= 0 ? 'text-brand-mint' : 'text-brand-pink'}`}>
                {diff >= 0 ? '+' : ''}{formatCurrency(diff)}
              </p>
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${diff >= 0 ? 'bg-brand-mint/10 text-brand-mint' : 'bg-brand-pink/10 text-brand-pink'}`}>
                {prevTotal !== 0 ? ((diff / prevTotal) * 100).toFixed(2) : '0.00'}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-brand-card border border-brand-border rounded-brand p-4 md:p-5">
        <p className="text-[10px] font-black text-brand-text-sub mb-1">
          입력 기준 월
        </p>
        <p className="text-sm font-black">
          {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pensionAssets.map((asset: any) => {
          const monthlyBalance = getMonthlyBalance(asset);
          const diffVal = monthlyBalance - (asset.previousBalance || 0);
          const diffRate = asset.previousBalance !== 0 ? (diffVal / asset.previousBalance) * 100 : 0;

          const yearlyAddition = getYearlyAdditionTotal(asset);
          const limit = getLimit(asset.name);
          const gaugePercent = limit > 0 ? Math.min((yearlyAddition / limit) * 100, 100) : 0;
          const taxRefund = Math.min(yearlyAddition, limit) * 0.132;

          return (
            <div key={asset.id} className="bg-brand-card border border-brand-border p-6 rounded-brand shadow-brand hover:border-brand-primary/50 transition-all group">
              <div className="flex justify-between items-start mb-5">
                <h4 className="font-black text-brand-text-main group-hover:text-brand-primary transition-colors">
                  {asset.name}
                </h4>
                <div className={`p-1.5 rounded-lg ${diffVal >= 0 ? 'bg-brand-mint/10 text-brand-mint' : 'bg-brand-pink/10 text-brand-pink'}`}>
                  <TrendingUp size={14} className={diffVal < 0 ? 'rotate-180' : ''} />
                </div>
              </div>

              <div className="space-y-4">
                <NumericInput
                  label="이번달 잔액"
                  value={monthlyBalance}
                  onChange={(v: number) => updateMonthlyBalance(asset.id, v)}
                  className="form-input text-lg font-black tabular-nums"
                />

                <div className="grid grid-cols-2 gap-2 pt-4 border-t border-brand-border">
                  <div>
                    <p className="text-[9px] font-bold text-brand-text-sub uppercase mb-0.5 tracking-tighter">
                      전달 잔액
                    </p>
                    <p className="text-xs font-bold text-brand-text-sub tabular-nums">
                      {formatCurrency(asset.previousBalance || 0)}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-[9px] font-bold text-brand-text-sub uppercase mb-0.5 tracking-tighter">
                      변동률
                    </p>
                    <p className={`text-xs font-black tabular-nums ${diffVal >= 0 ? 'text-brand-mint' : 'text-brand-pink'}`}>
                      {diffVal >= 0 ? '+' : ''}{diffRate.toFixed(1)}%
                    </p>
                  </div>
                </div>

                {isGaugeTarget(asset.name) && (
                  <div className="pt-4 border-t border-brand-border space-y-3">
                    <NumericInput
                      label="이번달 추가금"
                      value={getMonthlyAddition(asset)}
                      onChange={(v: number) => updateMonthlyAddition(asset.id, v)}
                      className="form-input text-sm font-black"
                    />

                    <div>
                      <div className="flex justify-between text-[10px] font-black text-brand-text-sub mb-1">
                        <span>연간 추가금</span>
                        <span>{formatCurrency(yearlyAddition)} / {formatCurrency(limit)}</span>
                      </div>

                      <div className="h-3 bg-brand-border rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${gaugePercent}%` }}
                          transition={{ duration: 0.5 }}
                          className="h-full bg-brand-primary rounded-full"
                        />
                      </div>

                      <p className="text-[10px] font-bold text-brand-mint mt-2">
                        예상 연말정산 세제혜택 13.2%: {formatCurrency(taxRefund)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}


function GamjaView({ gamjaTransactions, setGamjaTransactions, deleteGamjaTransaction, gamjaAccountNames, searchQuery, setSearchQuery, balances, setBalances, currentDate, tabName, setTabName, categories, setCategories, onOpenEdit }: any) {
  const [activeGamjaAccount, setActiveGamjaAccount] = useState(gamjaAccountNames[0] || '');
  const [isStartBalanceOpen, setIsStartBalanceOpen] = useState(false);

  const [newTx, setNewTx] = useState({
    date: new Date().toISOString().split('T')[0],
    type: '지출' as TransactionType,
    account: gamjaAccountNames[0] || '',
    category: categories.expense[0],
    amount: 0,
    memo: ''
  });

  useEffect(() => {
    if (!activeGamjaAccount && gamjaAccountNames.length > 0) {
      setActiveGamjaAccount(gamjaAccountNames[0]);
      setNewTx((prev: any) => ({ ...prev, account: gamjaAccountNames[0] }));
    }
  }, [gamjaAccountNames, activeGamjaAccount]);

  const updateStartBalance = (id: string, value: number) => {
    setBalances((prev: any[]) =>
      prev.map((b: any) =>
        b.id === id
          ? { ...b, previousBalance: value, currentBalance: value }
          : b
      )
    );
  };

  const getAccountCalculatedBalance = (accountName: string) => {
    const account = balances.find((b: any) => b.name === accountName);
    const start = account?.previousBalance || 0;
    const accountTxs = gamjaTransactions.filter((t: any) => t.account === accountName);

    const income = accountTxs
      .filter((t: any) => t.type === '수입')
      .reduce((s: number, t: any) => s + t.amount, 0);

    const expense = accountTxs
      .filter((t: any) => t.type === '지출')
      .reduce((s: number, t: any) => s + t.amount, 0);

    return start + income - expense;
  };

  const gamjaCashTotal = ['감자 생활비 통장', '감자 여유자금 통장', '감자 적금 통장']
    .reduce((sum: number, name: string) => sum + getAccountCalculatedBalance(name), 0);

  const gamjaPensionTotal = ['개인연금', '퇴직금']
    .reduce((sum: number, name: string) => sum + getAccountCalculatedBalance(name), 0);

  const handleAdd = () => {
    if (newTx.amount <= 0 || !activeGamjaAccount) return;

    const tx: GamjaTransaction = {
      id: Math.random().toString(36).substr(2, 9),
      ...newTx,
      account: activeGamjaAccount
    };

    setGamjaTransactions([tx, ...gamjaTransactions]);
    setNewTx({ ...newTx, amount: 0, memo: '' });
  };

  const filteredTxs = useMemo(() => {
    let txs = gamjaTransactions.filter((t: any) => t.account === activeGamjaAccount);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      txs = txs.filter((t: any) =>
        (t.memo?.toLowerCase().includes(q)) ||
        (t.category?.toLowerCase().includes(q)) ||
        (t.amount.toString().includes(q)) ||
        (t.date.includes(q))
      );
    }

    return txs;
  }, [gamjaTransactions, activeGamjaAccount, searchQuery]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <EditableHeader title={tabName} setTitle={setTabName} />

        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-sub" />
          <input
            type="text"
            placeholder="내역 검색"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-brand-card border border-brand-border rounded-full pl-9 pr-4 py-2 text-xs outline-none focus:border-brand-primary transition-colors"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-brand-card border border-brand-border rounded-brand p-5 shadow-brand">
          <p className="text-[10px] font-black text-brand-text-sub mb-2">감자 현금 합계</p>
          <p className="text-xl md:text-2xl font-black text-brand-purple tabular-nums">
            {formatCurrency(gamjaCashTotal)}
          </p>
        </div>

        <div className="bg-brand-card border border-brand-border rounded-brand p-5 shadow-brand">
          <p className="text-[10px] font-black text-brand-text-sub mb-2">감자 연금 합계</p>
          <p className="text-xl md:text-2xl font-black text-brand-mint tabular-nums">
            {formatCurrency(gamjaPensionTotal)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {gamjaAccountNames.map((name: string) => (
          <button
            key={name}
            onClick={() => {
              setActiveGamjaAccount(name);
              setNewTx({ ...newTx, account: name });
            }}
            className={`py-3 px-3 rounded-xl border font-black text-xs transition-all active:scale-95 ${
              activeGamjaAccount === name
                ? 'bg-brand-purple text-white border-brand-purple shadow-lg shadow-brand-purple/20'
                : 'bg-brand-card text-brand-text-main border-brand-border hover:border-brand-purple'
            }`}
          >
            <span className="block truncate">
              {name.replace('감자 ', '').replace(' 통장', '')}
            </span>
            <span className={`block mt-1 text-[10px] tabular-nums ${
              activeGamjaAccount === name ? 'text-white' : 'text-brand-text-sub'
            }`}>
              {formatCurrency(getAccountCalculatedBalance(name))}
            </span>
          </button>
        ))}
      </div>

      <div className="bg-brand-card border border-brand-border rounded-brand overflow-hidden shadow-brand">
        <div className="p-6 border-b border-brand-border bg-white/5 space-y-5">
          <div className="flex justify-between items-start gap-4">
            <div>
              <h4 className="font-black text-lg">{activeGamjaAccount}</h4>
              <p className="text-xl font-black text-brand-purple tabular-nums mt-1">
                {formatCurrency(getAccountCalculatedBalance(activeGamjaAccount))}
              </p>
              <p className="text-[10px] font-bold text-brand-text-sub mt-1">
                선택한 통장에 지출/수입을 입력합니다.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[0.8fr_1fr_1fr_1fr_1.2fr] gap-4 items-end bg-brand-bg/50 p-4 rounded-xl border border-brand-border/50">
            <div>
              <label className="text-[9px] font-black text-brand-text-sub ml-1">날짜</label>
              <input
                type="date"
                value={newTx.date}
                onChange={e => setNewTx({ ...newTx, date: e.target.value })}
                className="form-input text-[11px] py-1.5 px-2"
              />
            </div>

            <div>
              <label className="text-[9px] font-black text-brand-text-sub ml-1">유형</label>
              <div className="flex bg-brand-bg rounded-lg p-0.5 border border-brand-border">
                <button
                  onClick={() => setNewTx({ ...newTx, type: '지출', category: categories.expense[0] })}
                  className={`flex-1 py-1 rounded-md text-xs font-black ${newTx.type === '지출' ? 'bg-brand-pink text-white' : 'text-brand-text-sub'}`}
                >
                  지출
                </button>
                <button
                  onClick={() => setNewTx({ ...newTx, type: '수입', category: categories.income[0] })}
                  className={`flex-1 py-1 rounded-md text-xs font-black ${newTx.type === '수입' ? 'bg-brand-mint text-white' : 'text-brand-text-sub'}`}
                >
                  수입
                </button>
              </div>
            </div>

            <div>
              <label className="text-[9px] font-black text-brand-text-sub ml-1">항목</label>
              <select
                value={newTx.category}
                onChange={e => setNewTx({ ...newTx, category: e.target.value })}
                className="form-select text-xs py-1.5 h-[34px]"
              >
                {(newTx.type === '지출' ? categories.expense : categories.income).map((c: string) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <NumericInput
              label="금액"
              value={newTx.amount}
              onChange={(v: number) => setNewTx({ ...newTx, amount: v })}
              className="form-input text-sm font-black py-1.5"
            />

            <div>
              <label className="text-[9px] font-black text-brand-text-sub ml-1">메모</label>
              <input
                type="text"
                value={newTx.memo}
                placeholder="메모"
                onChange={e => setNewTx({ ...newTx, memo: e.target.value })}
                className="form-input text-xs py-1.5"
              />
            </div>

            <button
              onClick={handleAdd}
              className="sm:col-span-5 bg-brand-purple text-white font-black py-3 rounded-lg text-xs"
            >
              내역 추가
            </button>
          </div>
        </div>

        <div className="divide-y divide-brand-border max-h-[520px] overflow-y-auto custom-scrollbar">
          {filteredTxs.map((t: any) => (
            <div key={t.id} className="px-6 py-4 flex items-center justify-between hover:bg-white/5">
              <div>
                <p className="text-xs font-black">{t.memo || t.category}</p>
                <p className="text-[10px] text-brand-text-sub">{t.date} · {t.category}</p>
              </div>

              <div className="flex items-center gap-3">
                <p className={`text-sm font-black ${t.type === '수입' ? 'text-brand-mint' : 'text-brand-pink'}`}>
                  {t.type === '수입' ? '+' : '-'}{formatNumber(t.amount)}
                </p>
                <button
                  onClick={() => deleteGamjaTransaction(t.id)}
                  className="p-2 text-brand-text-sub hover:text-brand-pink"
                >
                  <X size={15} />
                </button>
              </div>
            </div>
          ))}

          {filteredTxs.length === 0 && (
            <div className="p-16 text-center text-brand-text-sub font-bold opacity-40">
              내역이 없습니다
            </div>
          )}
        </div>
      </div>

      <div className="bg-brand-card border border-brand-border rounded-brand shadow-brand overflow-hidden">
        <button
          onClick={() => setIsStartBalanceOpen(!isStartBalanceOpen)}
          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/5 transition-all"
        >
          <div>
            <h4 className="font-black text-sm">감자 시작금액 입력</h4>
            <p className="text-[10px] font-bold text-brand-text-sub mt-1">
              수정할 때만 열어서 사용하세요.
            </p>
          </div>

          <ChevronRight
            size={18}
            className={`text-brand-purple transition-transform ${
              isStartBalanceOpen ? 'rotate-90' : ''
            }`}
          />
        </button>

        <AnimatePresence>
          {isStartBalanceOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-6 pb-6 pt-2 border-t border-brand-border">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {balances
                    .filter((b: any) => b.category === '감자 자산')
                    .map((b: any) => (
                      <div key={b.id} className="bg-brand-bg/50 border border-brand-border rounded-xl p-4 space-y-3">
                        <p className="text-xs font-black">{b.name}</p>
                        <NumericInput
                          label="시작금액"
                          value={b.previousBalance || 0}
                          onChange={(v: number) => updateStartBalance(b.id, v)}
                          className="form-input text-sm font-black"
                        />
                      </div>
                    ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex justify-center pt-6">
        <button
          onClick={onOpenEdit}
          className="px-12 py-4 bg-brand-card border border-brand-border rounded-2xl font-black text-brand-purple shadow-brand hover:border-brand-purple transition-all flex items-center gap-3 active:scale-95"
        >
          <Edit2 size={18} />
          감자 지출 내역 및 항목 수정
        </button>
      </div>
    </motion.div>
  );
}


function AssetStatusView({ balances, setBalances, tabName, setTabName }: any) {
  const categories = ['내 통장', '투자/연금', '감자 자산', '기타 자산'];

  const updateBalance = (id: string, value: number) => {
    setBalances(balances.map((b: any) => b.id === id ? { ...b, currentBalance: value } : b));
  };

  const updateName = (id: string, name: string) => {
    setBalances(balances.map((b: any) => b.id === id ? { ...b, name: name } : b));
  };

  const total = balances.reduce((sum: number, b: any) => sum + (b.currentBalance || 0), 0);
  const prevTotal = balances.reduce((sum: number, b: any) => sum + (b.previousBalance || 0), 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto space-y-6 pb-12 px-2">
      <EditableHeader 
        title={tabName} 
        setTitle={setTabName} 
      />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-brand p-4 md:p-6">
         <div className="flex-1">
            <p className="text-[10px] font-bold text-brand-text-sub uppercase mb-1 tracking-widest">현재 총 자산 합계</p>
            <h4 className="text-3xl md:text-4xl font-black text-brand-primary tabular-nums tracking-tighter">{formatCurrency(total)}</h4>
         </div>
         <div className="flex-1 md:text-right border-t md:border-t-0 md:border-l border-brand-border pt-4 md:pt-0 md:pl-6">
            <p className="text-[10px] font-bold text-brand-text-sub uppercase mb-1">지난달 대비 흐름</p>
            <div className="flex md:justify-end items-center gap-2">
               <p className="text-lg font-black">{formatCurrency(prevTotal)}</p>
               <p className={`text-xs font-black px-2 py-0.5 rounded ${total >= prevTotal ? 'bg-brand-mint/10 text-brand-mint' : 'bg-brand-pink/10 text-brand-pink'}`}>
                  {total >= prevTotal ? '▲' : '▼'} {formatCurrency(Math.abs(total - prevTotal))}
               </p>
            </div>
         </div>
      </div>

      <div className="space-y-8">
        {categories.map(cat => (
          <div key={cat} className="space-y-4">
            <div className="flex items-center gap-3 px-2">
               <h4 className="text-xs font-black text-brand-primary uppercase tracking-widest">{cat}</h4>
               <div className="flex-1 h-px bg-brand-border/50" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {balances.filter((b: any) => b.category === cat).map((b: any) => (
                <div key={b.id} className="p-3 bg-brand-card border border-brand-border rounded-xl shadow-sm hover:border-brand-primary/50 transition-all flex flex-col justify-between">
                  <div className="space-y-3">
                    <input 
                      type="text" 
                      value={b.name} 
                      onChange={e => updateName(b.id, e.target.value)}
                      className="w-full bg-transparent border-b border-white/5 focus:border-brand-primary/30 px-0 py-1 text-xs font-black text-brand-text-sub outline-none transition-all"
                      placeholder="계좌명"
                    />
                    <NumericInput 
                      value={b.currentBalance}
                      onChange={(val: number) => updateBalance(b.id, val)}
                      className="bg-transparent border-none p-0 text-xl font-black text-brand-text-main tabular-nums focus:ring-0 w-full"
                      placeholder="0"
                    />
                    <div className="flex justify-between items-center text-[9px] font-bold text-brand-text-sub/30 pb-1 border-t border-brand-border/10">
                       <span className="uppercase tracking-tighter">전달 잔액</span>
                       <span className="tabular-nums">{formatNumber(b.previousBalance)}원</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function LoanManagementView({ loans, setLoans, loanSummary, tabName, setTabName }: any) {
  const [activeLoanId, setActiveLoanId] = useState(loans[0]?.id || '');
  const activeLoan = loans.find((l: any) => l.id === activeLoanId);

  const [newRepayment, setNewRepayment] = useState({
    principal: 0,
    interest: 0,
    turn: 1,
    date: new Date().toISOString().split('T')[0],
    memo: ''
  });

  const getLoanStats = (loan: any) => {
    const cumulativePrincipal = loan.repayments.reduce((sum: number, r: any) => sum + r.principal, 0);
    const cumulativeInterest = loan.repayments.reduce((sum: number, r: any) => sum + r.interest, 0);
    return {
      cumulativePrincipal,
      cumulativeInterest,
      totalPaid: cumulativePrincipal + cumulativeInterest,
      remaining: loan.originalTotalAmount - cumulativePrincipal
    };
  };

  const updateLoanOriginal = (id: string, amount: number) => {
    setLoans(loans.map((l: any) => l.id === id ? { ...l, originalTotalAmount: amount } : l));
  };

  const addRepayment = () => {
    if (!activeLoanId) return;
    const repayment = {
      id: Math.random().toString(36).substr(2, 9),
      loanName: activeLoan.name,
      ...newRepayment
    };
    setLoans(loans.map((l: any) => l.id === activeLoanId ? { ...l, repayments: [repayment, ...l.repayments] } : l));
    setNewRepayment({ ...newRepayment, principal: 0, interest: 0, turn: newRepayment.turn + 1, memo: '' });
  };

  const deleteRepayment = (loanId: string, repaymentId: string) => {
    setLoans(loans.map((l: any) => l.id === loanId ? { ...l, repayments: l.repayments.filter((r: any) => r.id !== repaymentId) } : l));
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto space-y-12 pb-20">
      <EditableHeader 
        title={tabName} 
        setTitle={setTabName} 
      />
      {/* 1. Global Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <div className="bg-brand-card p-8 border border-brand-border rounded-brand shadow-brand">
            <p className="text-[11px] font-black text-brand-text-sub uppercase mb-2 tracking-widest">전체 대출 남은 원금</p>
            <h4 className="text-4xl font-black text-brand-pink tabular-nums">{formatCurrency(loanSummary.totalRemaining)}</h4>
         </div>
         <div className="bg-brand-card p-8 border border-brand-border rounded-brand shadow-brand">
            <p className="text-[11px] font-black text-brand-text-sub uppercase mb-2 tracking-widest">전체 누적 상환액 (원금)</p>
            <h4 className="text-4xl font-black text-brand-mint tabular-nums">{formatCurrency(loanSummary.totalPrincipalPaid)}</h4>
         </div>
         <div className="bg-brand-card p-8 border border-brand-border rounded-brand shadow-brand">
            <p className="text-[11px] font-black text-brand-text-sub uppercase mb-2 tracking-widest">전체 누적 상환액 (이자)</p>
            <h4 className="text-4xl font-black text-brand-yellow tabular-nums">{formatCurrency(loanSummary.totalInterestPaid)}</h4>
         </div>
      </div>

      {/* 2. Loan Selector & Detail View */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
         {/* Left: Sidebar Selector */}
         <div className="lg:col-span-1 space-y-4">
            <h3 className="text-xs font-black text-brand-text-sub uppercase px-2 mb-4 tracking-tighter">대출 목록 선택</h3>
            {loans.map((loan: any) => {
               const stats = getLoanStats(loan);
               return (
                  <button 
                    key={loan.id}
                    onClick={() => setActiveLoanId(loan.id)}
                    className={`w-full p-6 text-left border rounded-brand transition-all ${activeLoanId === loan.id ? 'bg-brand-primary border-brand-primary text-white shadow-xl translate-x-1' : 'bg-brand-card border-brand-border text-brand-text-sub hover:border-brand-primary/50'}`}
                  >
                     <p className="text-sm font-black mb-2">{loan.name}</p>
                     <p className={`text-[10px] font-bold ${activeLoanId === loan.id ? 'text-white/70' : 'text-brand-pink/70'}`}>남은 원금: {formatNumber(stats.remaining)}원</p>
                  </button>
               );
            })}
         </div>

         {/* Right: Detailed Content */}
         <div className="lg:col-span-3 space-y-10">
            {activeLoan ? (
               <>
                  {/* Loan Header & Config */}
                  <div className="bg-brand-card p-8 border border-brand-border rounded-brand shadow-brand space-y-8">
                     <div className="flex justify-between items-start">
                        <div>
                           <h2 className="text-3xl font-black text-brand-primary uppercase tracking-tighter">{activeLoan.name}</h2>
                           <p className="text-sm text-brand-text-sub font-bold">대출 상세 정보 및 상환 관리</p>
                        </div>
                        <CreditCard size={32} className="text-brand-border" />
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-brand-border/50">
                        <NumericInput 
                          label="총 대출 금액 (ORIGINAL PRINCIPAL)"
                          value={activeLoan.originalTotalAmount}
                          onChange={(val: number) => updateLoanOriginal(activeLoan.id, val)}
                          className="form-input text-2xl font-black tabular-nums py-4"
                        />
                        <div className="bg-brand-bg/50 p-6 rounded-brand flex flex-col justify-center border border-brand-border/30">
                           <p className="text-[10px] font-bold text-brand-text-sub uppercase mb-1">현재 남은 원금</p>
                           <p className="text-2xl font-black text-brand-pink tabular-nums">{formatCurrency(getLoanStats(activeLoan).remaining)}</p>
                        </div>
                     </div>
                  </div>

                  {/* Add Repayment & Stats */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                     {/* Input Form */}
                     <div className="bg-brand-card p-8 border border-brand-border rounded-brand shadow-brand space-y-6">
                        <h4 className="text-sm font-black flex items-center gap-2 uppercase tracking-widest border-b border-brand-border pb-3">
                           <Plus size={16} className="text-brand-primary" /> 상환 항목 추가
                        </h4>
                        <div className="grid grid-cols-2 gap-6">
                           <NumericInput label="원금 상환액" value={newRepayment.principal} onChange={(v: number) => setNewRepayment({...newRepayment, principal: v})} className="form-input text-sm font-black" />
                           <NumericInput label="이자 상환액" value={newRepayment.interest} onChange={(v: number) => setNewRepayment({...newRepayment, interest: v})} className="form-input text-sm font-black" />
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                           <div className="space-y-1.5">
                              <label className="text-[11px] font-black text-brand-text-sub uppercase ml-1">상환 날짜</label>
                              <input type="date" value={newRepayment.date} onChange={e => setNewRepayment({...newRepayment, date: e.target.value})} className="form-input text-xs h-[42px]" />
                           </div>
                           <NumericInput label="회차" value={newRepayment.turn} onChange={(v: number) => setNewRepayment({...newRepayment, turn: v})} className="form-input text-sm font-black" />
                        </div>
                        <div className="space-y-1.5">
                           <label className="text-[11px] font-black text-brand-text-sub uppercase ml-1">메모</label>
                           <input type="text" value={newRepayment.memo} placeholder="메모를 입력하세요" onChange={e => setNewRepayment({...newRepayment, memo: e.target.value})} className="form-input text-xs" />
                        </div>
                        <button onClick={addRepayment} className="w-full bg-brand-primary text-white font-black py-4 rounded-xl hover:brightness-110 shadow-lg shadow-brand-primary/20 active:scale-[0.98] transition-all uppercase tracking-widest text-sm">
                           저장하기 (SAVE REPAYMENT)
                        </button>
                     </div>

                     {/* Progress Stats */}
                     <div className="bg-brand-card p-8 border border-brand-border rounded-brand shadow-brand flex flex-col justify-between">
                        <div className="space-y-6">
                           <h4 className="text-sm font-black uppercase tracking-widest border-b border-brand-border pb-3">상환 현황 요약</h4>
                           <div className="space-y-4">
                              <div className="flex justify-between items-end">
                                 <span className="text-[11px] font-bold text-brand-text-sub uppercase">누적 원금 상환액</span>
                                 <span className="font-black text-lg">{formatCurrency(getLoanStats(activeLoan).cumulativePrincipal)}</span>
                              </div>
                              <div className="flex justify-between items-end">
                                 <span className="text-[11px] font-bold text-brand-text-sub uppercase">누적 이자 상환액</span>
                                 <span className="font-black text-lg text-brand-pink">{formatCurrency(getLoanStats(activeLoan).cumulativeInterest)}</span>
                              </div>
                              <div className="flex justify-between items-end pt-4 border-t border-brand-border">
                                 <span className="text-[11px] font-black uppercase text-brand-mint">총 납부액</span>
                                 <span className="font-black text-2xl text-brand-mint">{formatCurrency(getLoanStats(activeLoan).totalPaid)}</span>
                              </div>
                           </div>
                        </div>
                        <div className="mt-8 space-y-2">
                            <p className="text-[10px] font-bold text-brand-text-sub uppercase text-right">상환 진행률 (원금 기준)</p>
                            <div className="w-full h-2 bg-brand-bg border border-brand-border">
                               <div 
                                 className="h-full bg-brand-primary" 
                                 style={{ width: `${Math.min(100, (getLoanStats(activeLoan).cumulativePrincipal / activeLoan.originalTotalAmount) * 100)}%` }} 
                               />
                            </div>
                        </div>
                     </div>
                  </div>

                  {/* Repayment History Table */}
                  <div className="bg-brand-card border border-brand-border rounded-brand overflow-hidden shadow-brand">
                     <div className="px-8 py-5 border-b border-brand-border flex justify-between items-center bg-white/5">
                        <h4 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                           <Activity size={16} className="text-brand-primary" /> 상환 내역 History
                        </h4>
                        <span className="text-[11px] font-bold text-brand-text-sub">{activeLoan.repayments.length} 건</span>
                     </div>
                     <div className="overflow-x-auto">
                        <table className="w-full text-left">
                           <thead>
                              <tr className="border-b border-brand-border text-[10px] font-black text-brand-text-sub uppercase tracking-tighter">
                                 <th className="px-8 py-4">회차</th>
                                 <th className="px-4 py-4 text-center">상환 날짜</th>
                                 <th className="px-4 py-4 text-right">원금 상환액</th>
                                 <th className="px-4 py-4 text-right">이자 상환액</th>
                                 <th className="px-4 py-4">메모</th>
                                 <th className="px-8 py-4 text-right">관리</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-brand-border">
                              {activeLoan.repayments.length === 0 ? (
                                 <tr>
                                    <td colSpan={6} className="px-8 py-10 text-center text-sm font-bold text-brand-text-sub/50 uppercase tracking-widest">
                                       상환 기록이 없습니다.
                                    </td>
                                 </tr>
                              ) : activeLoan.repayments.map((r: any) => (
                                 <tr key={r.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-8 py-4 font-black text-brand-primary text-sm">{r.turn}회차</td>
                                    <td className="px-4 py-4 text-center text-xs font-bold tabular-nums">{r.date}</td>
                                    <td className="px-4 py-4 text-right font-black text-sm tabular-nums">{formatNumber(r.principal)}원</td>
                                    <td className="px-4 py-4 text-right font-black text-sm text-brand-pink tabular-nums">{formatNumber(r.interest)}원</td>
                                    <td className="px-4 py-4 text-xs font-medium text-brand-text-sub">{r.memo || '-'}</td>
                                    <td className="px-8 py-4 text-right">
                                       <button 
                                         onClick={() => deleteRepayment(activeLoan.id, r.id)}
                                         className="p-2 text-brand-text-sub hover:text-brand-pink opacity-0 group-hover:opacity-100 transition-all active:scale-90"
                                       >
                                          <Trash2 size={16} />
                                       </button>
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  </div>
               </>
            ) : (
               <div className="h-full flex items-center justify-center border border-brand-border bg-brand-card p-20 text-center">
                  <div className="space-y-4">
                     <CreditCard size={48} className="mx-auto text-brand-border" />
                     <p className="font-bold text-brand-text-sub">대출 항목이 없습니다.</p>
                  </div>
               </div>
            )}
         </div>
      </div>
    </motion.div>
  );
}
function QuickEntryBox({ account, onAdd, categories, setCategories }: any) {
  const [newTx, setNewTx] = useState({
    date: new Date().toISOString().split('T')[0],
    type: '지출' as TransactionType,
    category: categories.expense[0],
    amount: 0,
    memo: ''
  });

  const handleDayShift = (days: number) => {
    const d = new Date(newTx.date);
    d.setDate(d.getDate() + days);
    setNewTx({ ...newTx, date: d.toISOString().split('T')[0] });
  };

  const handleAdd = (type: TransactionType) => {
    if (newTx.amount <= 0) return;
    onAdd({
      id: Math.random().toString(36).substr(2, 9),
      ...newTx,
      type,
      account
    });
    setNewTx({ ...newTx, amount: 0, memo: '' });
  };

  const editCategories = () => {
    const type = newTx.type === '지출' ? 'expense' : 'income';
    const current = categories[type].join(', ');
    const result = prompt(`${newTx.type === '지출' ? '지출' : '수입'} 항목들을 수정하세요 (쉼표로 구분):`, current);
    if (result !== null) {
      const newList = result.split(',').map(s => s.trim()).filter(Boolean);
      if (newList.length > 0) {
        setCategories({ ...categories, [type]: newList });
        if (!newList.includes(newTx.category)) {
          setNewTx({ ...newTx, category: newList[0] });
        }
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
         <h4 className="text-sm font-black text-brand-primary flex items-center gap-2 uppercase tracking-widest">
            <Plus size={14} /> {account}
         </h4>
        <div className="flex items-center gap-2 bg-brand-card border border-brand-border p-1 rounded-xl">
           <button onClick={() => handleDayShift(-1)} className="p-2 hover:bg-brand-primary/20 rounded-lg transition-colors"><ChevronLeft size={14} /></button>
           <span className="text-[10px] font-black px-2">{newTx.date}</span>
           <button onClick={() => handleDayShift(1)} className="p-2 hover:bg-brand-primary/20 rounded-lg transition-colors"><ChevronRight size={14} /></button>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
         <div className="space-y-1.5">
            <div className="flex items-center justify-between ml-1">
               <label className="text-[11px] font-black text-brand-text-sub uppercase">항목</label>
            </div>
            <select value={newTx.category} onChange={e => setNewTx({...newTx, category: e.target.value})} className="form-select text-[11px] py-2 h-[42px]">
               {(newTx.type === '지출' ? categories.expense : categories.income).map((c: string) => <option key={c} value={c}>{c}</option>)}
            </select>
         </div>
         <NumericInput 
           label="금액 입력"
           value={newTx.amount} 
           placeholder="0" 
           onChange={(val: number) => setNewTx({...newTx, amount: val})} 
           className="form-input text-sm font-black py-2 h-[42px]" 
         />
      </div>

      <div className="space-y-1.5">
         <label className="text-[11px] font-black text-brand-text-sub uppercase ml-1">메모</label>
         <input type="text" value={newTx.memo} placeholder="메모 입력" onChange={e => setNewTx({...newTx, memo: e.target.value})} className="form-input text-[11px] py-2 h-[42px]" />
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4">
         <button onClick={() => { setNewTx({...newTx, type: '수입', category: categories.income[0] }); handleAdd('수입'); }} className="bg-brand-mint/10 text-brand-mint text-[11px] font-black py-3 rounded-xl hover:bg-brand-mint/20 transition-all uppercase">수입</button>
         <button onClick={() => { setNewTx({...newTx, type: '지출', category: categories.expense[0] }); handleAdd('지출'); }} className="bg-brand-pink/10 text-brand-pink text-[11px] font-black py-3 rounded-xl hover:bg-brand-pink/20 transition-all uppercase">지출</button>
      </div>
    </div>
  );
}

function SalaryView({ salaries, setSalaries, tabName, setTabName, salaryLabels, setSalaryLabels, currentDate }: any) {
  const [newMySalary, setNewMySalary] = useState({
    date: new Date().toISOString().split('T')[0],
    type: SALARY_TYPES[0] as SalaryType,
    amount: 0,
    memo: ''
  });

  const [newGamjaSalary, setNewGamjaSalary] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    memo: ''
  });

  const total = salaries.mySalary + salaries.gamjaSalary;
  const myRatio = total > 0 ? (salaries.mySalary / total) * 100 : 0;
  const gamjaRatio = total > 0 ? (salaries.gamjaSalary / total) * 100 : 0;

  const handleAddMySalary = () => {
    if (newMySalary.amount <= 0) return;
    const record: SalaryRecord = {
      id: Math.random().toString(36).substr(2, 9),
      ...newMySalary
    };
    setSalaries({
      ...salaries,
      mySalaryRecords: [record, ...salaries.mySalaryRecords],
      mySalary: salaries.mySalary + record.amount
    });
    setNewMySalary({ ...newMySalary, amount: 0, memo: '' });
  };

  const handleAddGamjaSalary = () => {
    if (newGamjaSalary.amount <= 0) return;
    const record: any = {
      id: Math.random().toString(36).substr(2, 9),
      ...newGamjaSalary,
      type: '감자 월급'
    };
    setSalaries({
      ...salaries,
      gamjaSalaryRecords: [record, ...salaries.gamjaSalaryRecords],
      gamjaSalary: salaries.gamjaSalary + record.amount
    });
    setNewGamjaSalary({ ...newGamjaSalary, amount: 0, memo: '' });
  };

  const deleteMySalary = (id: string) => {
    const record = salaries.mySalaryRecords.find((r: any) => r.id === id);
    if (!record) return;
    setSalaries({
      ...salaries,
      mySalaryRecords: salaries.mySalaryRecords.filter((r: any) => r.id !== id),
      mySalary: salaries.mySalary - record.amount
    });
  };

  const deleteGamjaSalary = (id: string) => {
    const record = salaries.gamjaSalaryRecords.find((r: any) => r.id === id);
    if (!record) return;
    setSalaries({
      ...salaries,
      gamjaSalaryRecords: salaries.gamjaSalaryRecords.filter((r: any) => r.id !== id),
      gamjaSalary: salaries.gamjaSalary - record.amount
    });
  };

  // Annual Salary aggregation for selected year from currentDate
  const selectedYear = currentDate.getFullYear();

  // Monthly data for the full year comparison
  const monthlySalaryData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    
    return months.map(month => {
      const entry: any = { name: `${month}월` };
      
      // Me: Breakdown by salary type
      let meMonthTotal = 0;
      SALARY_TYPES.forEach(t => {
        const label = salaryLabels[t] || t;
        const sum = salaries.mySalaryRecords
          .filter((r: any) => {
            const rd = new Date(r.date);
            return rd.getMonth() === month - 1 && rd.getFullYear() === selectedYear && r.type === t;
          })
          .reduce((s: number, r: any) => s + r.amount, 0);
        entry[label] = (entry[label] || 0) + sum;
        meMonthTotal += sum;
      });
      entry['내 월급 합계'] = meMonthTotal;
      
      // Gamja: Total
      const gamjaSum = salaries.gamjaSalaryRecords
        .filter((r: any) => {
          const rd = new Date(r.date);
          return rd.getMonth() === month - 1 && rd.getFullYear() === selectedYear;
        })
        .reduce((s: number, r: any) => s + r.amount, 0);
      entry['감자 월급'] = gamjaSum;
      
      return entry;
    });
  }, [salaries, salaryLabels, selectedYear]);

  const totalMyAnnual = useMemo(() => {
    return salaries.mySalaryRecords
      .filter((r: any) => new Date(r.date).getFullYear() === selectedYear)
      .reduce((s: number, r: any) => s + r.amount, 0);
  }, [salaries.mySalaryRecords, selectedYear]);

  const totalGamjaAnnual = useMemo(() => {
    return salaries.gamjaSalaryRecords
      .filter((r: any) => new Date(r.date).getFullYear() === selectedYear)
      .reduce((s: number, r: any) => s + r.amount, 0);
  }, [salaries.gamjaSalaryRecords, selectedYear]);

  const totalAnnual = totalMyAnnual + totalGamjaAnnual;
  const myAnnualRatio = totalAnnual > 0 ? (totalMyAnnual / totalAnnual) * 100 : 0;
  const gamjaAnnualRatio = totalAnnual > 0 ? (totalGamjaAnnual / totalAnnual) * 100 : 0;

  // Soft Pastel Palette derived from primary blue (#94d5ff)
  const COLORS = ['#94D5FF', '#A5D8FF', '#D0BFFF', '#B2F2BB', '#FFC9C9', '#FFF3BF', '#E9ECEF'];
  
  // Filter out components that have zero total amount for the selected year
  const ME_COMPONENTS_FILTERED = useMemo(() => {
    const labels = SALARY_TYPES
      .filter(t => {
        return salaries.mySalaryRecords.some(r => 
          new Date(r.date).getFullYear() === selectedYear && r.type === t && r.amount > 0
        );
      })
      .map(t => salaryLabels[t] || t);
    return Array.from(new Set(labels));
  }, [salaries.mySalaryRecords, salaryLabels, selectedYear]);

  // Custom Tooltip for separated display
  const SalaryChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const myComponents = payload.filter((p: any) => p.dataKey !== '감자 월급');
      const gamjaComp = payload.find((p: any) => p.dataKey === '감자 월급');
      const myTotal = myComponents.reduce((sum: number, p: any) => sum + p.value, 0);

      return (
        <div className="bg-brand-card border border-brand-border p-5 rounded-2xl shadow-brand min-w-[240px]">
          <p className="text-[10px] font-black text-brand-text-sub uppercase mb-4 border-b border-brand-border pb-2 tracking-[0.2em]">{label} SALARY REPORT</p>
          
          <div className="space-y-6">
            {/* My Section */}
            <div className="space-y-3">
              <p className="text-[10px] font-black text-brand-primary uppercase tracking-widest flex items-center gap-2 border-l-2 border-brand-primary pl-3">
                [MY INCOME]
              </p>
              <div className="space-y-2 pl-3">
                {myComponents.map((p: any) => (
                  p.value > 0 && (
                    <div key={p.dataKey} className="flex justify-between items-center text-[10px] gap-6">
                      <span className="text-brand-text-sub font-bold">{p.name || p.dataKey}</span>
                      <span className="font-black text-brand-primary tabular-nums">{formatNumber(p.value)}</span>
                    </div>
                  )
                ))}
                <div className="flex justify-between items-center text-[11px] pt-3 border-t border-brand-border mt-1">
                  <span className="font-black text-brand-text-main uppercase tracking-tighter">TOTAL:</span>
                  <span className="font-black text-brand-primary tabular-nums text-sm">{formatNumber(myTotal)}</span>
                </div>
              </div>
            </div>

            {/* Gamja Section */}
            {gamjaComp && (
              <div className="space-y-3">
                <p className="text-[10px] font-black text-brand-purple uppercase tracking-widest flex items-center gap-2 border-l-2 border-brand-purple pl-3">
                  [GAMJA INCOME]
                </p>
                <div className="space-y-2 pl-3">
                  <div className="flex justify-between items-center text-[11px] gap-6">
                    <span className="text-brand-text-sub font-bold">Monthly Total</span>
                    <span className="font-black text-brand-purple tabular-nums text-sm">{formatNumber(gamjaComp.value)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="max-w-6xl mx-auto space-y-12 pb-20">
      <EditableHeader 
        title={tabName} 
        setTitle={setTabName} 
      />

      {/* 1. TOP: Household Total Income Summary (Annual) */}
      <div className="bg-brand-card p-10 rounded-brand border border-brand-border shadow-brand relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-5 text-brand-primary">
           <ComparisonIcon size={120} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
           <div className="flex-1">
              <p className="text-xs font-bold text-brand-text-sub uppercase mb-2 tracking-[0.2em]">{selectedYear}년 연간 가구 총수입</p>
              <h4 className="text-5xl font-black text-brand-text-main tabular-nums mb-8">{formatCurrency(totalAnnual)}</h4>
              
              <div className="flex gap-10">
                 <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-brand-primary uppercase tracking-widest">내 비중</span>
                    <span className="text-xl font-black text-brand-text-main">{myAnnualRatio.toFixed(1)}%</span>
                 </div>
                 <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-brand-purple uppercase tracking-widest">감자 비중</span>
                    <span className="text-xl font-black text-brand-text-main">{gamjaAnnualRatio.toFixed(1)}%</span>
                 </div>
              </div>
           </div>
           
           <div className="flex-1 space-y-6 max-w-md">
              <div className="space-y-2">
                 <div className="flex justify-between text-[11px] font-black uppercase tracking-tight">
                    <span className="text-brand-primary">나 (TOTAL)</span>
                    <span className="text-brand-text-main">{formatCurrency(totalMyAnnual)}</span>
                 </div>
                 <div className="h-2 bg-brand-bg rounded-full overflow-hidden flex border border-brand-border">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${myAnnualRatio}%` }} className="h-full bg-brand-primary" />
                 </div>
              </div>
              <div className="space-y-2">
                 <div className="flex justify-between text-[11px] font-black uppercase tracking-tight">
                    <span className="text-brand-purple">감자 (TOTAL)</span>
                    <span className="text-brand-text-main">{formatCurrency(totalGamjaAnnual)}</span>
                 </div>
                 <div className="h-2 bg-brand-bg rounded-full overflow-hidden flex border border-brand-border">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${gamjaAnnualRatio}%` }} className="h-full bg-brand-purple" />
                 </div>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {/* My Salary Section */}
         <div className="space-y-6">
            <div className="bg-brand-card p-6 border border-brand-border rounded-brand shadow-brand">
               <h4 className="text-sm font-black mb-4 flex items-center gap-2 text-brand-primary uppercase tracking-widest">
                  <Plus size={16} /> 내 월급 등록
               </h4>
               <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                     <div className="space-y-1.5 focus-within:text-brand-primary">
                        <label className="text-[10px] font-black text-brand-text-sub uppercase ml-1 tracking-widest">날짜</label>
                        <input type="date" value={newMySalary.date} onChange={e => setNewMySalary({...newMySalary, date: e.target.value})} className="form-input text-[11px] py-1.5 h-[42px] bg-brand-bg/50 border-brand-border focus:border-brand-primary" />
                     </div>
                     <div className="space-y-1.5 focus-within:text-brand-primary">
                        <label className="text-[10px] font-black text-brand-text-sub uppercase ml-1 tracking-widest">월급 종류</label>
                        <select value={newMySalary.type} onChange={e => setNewMySalary({...newMySalary, type: e.target.value as any})} className="form-select text-[11px] py-1.5 h-[42px] bg-brand-bg/50 border-brand-border focus:border-brand-primary">
                           {SALARY_TYPES.map(t => <option key={t} value={t}>{salaryLabels[t] || t}</option>)}
                        </select>
                     </div>
                  </div>
                  <NumericInput label="금액" value={newMySalary.amount} onChange={(v: number) => setNewMySalary({...newMySalary, amount: v})} className="form-input text-sm font-black py-1.5 h-[42px] bg-brand-bg/50 border-brand-border focus:border-brand-primary" />
                  <div className="space-y-1.5 focus-within:text-brand-primary">
                     <label className="text-[10px] font-black text-brand-text-sub uppercase ml-1 tracking-widest">메모</label>
                     <input type="text" value={newMySalary.memo} placeholder="MEMO" onChange={e => setNewMySalary({...newMySalary, memo: e.target.value})} className="form-input text-[11px] py-1.5 h-[42px] bg-brand-bg/50 border-brand-border focus:border-brand-primary" />
                  </div>
                  <button onClick={handleAddMySalary} className="w-full bg-brand-primary text-white font-black py-3 rounded-xl shadow-lg shadow-brand-primary/10 hover:brightness-105 active:scale-[0.98] transition-all text-xs mt-2 uppercase tracking-widest">저장하기</button>
               </div>
            </div>

            <div className="bg-brand-card rounded-brand border border-brand-border overflow-hidden shadow-brand">
               <div className="px-4 py-3 bg-brand-bg/50 border-b border-brand-border text-[9px] font-black uppercase tracking-[0.2em] text-brand-text-sub">내 월급 기록 (HISTORY)</div>
               <div className="max-h-[300px] overflow-y-auto divide-y divide-brand-border custom-scrollbar">
                  {salaries.mySalaryRecords.map((r: any) => (
                     <div key={r.id} className="p-4 flex justify-between items-center group hover:bg-brand-bg/30 transition-colors">
                        <div>
                           <p className="text-[11px] font-black text-brand-text-main">{salaryLabels[r.type] || r.type} <span className="text-brand-text-sub font-normal ml-2">{r.date}</span></p>
                           <p className="text-[10px] text-brand-text-sub mt-0.5 uppercase tracking-tighter">{r.memo || 'INCOME'}</p>
                        </div>
                        <div className="flex items-center gap-3">
                           <p className="text-xs font-black text-brand-primary tabular-nums">{formatNumber(r.amount)}원</p>
                           <button onClick={() => deleteMySalary(r.id)} className="opacity-0 group-hover:opacity-100 text-brand-text-sub hover:text-brand-pink transition-all"><Trash2 size={14} /></button>
                        </div>
                     </div>
                  ))}
                  {salaries.mySalaryRecords.length === 0 && <div className="p-8 text-center text-[10px] text-brand-text-sub italic text-brand-text-sub/50 uppercase">NO RECORDS</div>}
               </div>
            </div>
         </div>

         {/* Gamja Salary Section */}
         <div className="space-y-6">
            <div className="bg-brand-card p-6 border border-brand-border rounded-brand shadow-brand">
               <h4 className="text-sm font-black mb-4 flex items-center gap-2 text-brand-purple uppercase tracking-widest">
                  <Plus size={16} /> 감자 월급 등록
               </h4>
               <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                     <div className="space-y-1.5 focus-within:text-brand-purple">
                        <label className="text-[10px] font-black text-brand-text-sub uppercase ml-1 tracking-widest">날짜</label>
                        <input type="date" value={newGamjaSalary.date} onChange={e => setNewGamjaSalary({...newGamjaSalary, date: e.target.value})} className="form-input text-[11px] py-1.5 h-[42px] bg-brand-bg/50 border-brand-border focus:border-brand-purple" />
                     </div>
                  </div>
                  <NumericInput label="금액" value={newGamjaSalary.amount} onChange={(v: number) => setNewGamjaSalary({...newGamjaSalary, amount: v})} className="form-input text-sm font-black py-1.5 h-[42px] bg-brand-bg/50 border-brand-border focus:border-brand-purple" />
                  <div className="space-y-1.5 focus-within:text-brand-purple">
                     <label className="text-[10px] font-black text-brand-text-sub uppercase ml-1 tracking-widest">메모</label>
                     <input type="text" value={newGamjaSalary.memo} placeholder="MEMO" onChange={e => setNewGamjaSalary({...newGamjaSalary, memo: e.target.value})} className="form-input text-[11px] py-1.5 h-[42px] bg-brand-bg/50 border-brand-border focus:border-brand-purple" />
                  </div>
                  <button onClick={handleAddGamjaSalary} className="w-full bg-brand-purple text-white font-black py-3 rounded-xl shadow-lg shadow-brand-purple/10 hover:brightness-105 active:scale-[0.98] transition-all text-xs mt-2 uppercase tracking-widest">저장하기</button>
               </div>
            </div>

            <div className="bg-brand-card rounded-brand border border-brand-border overflow-hidden shadow-brand">
               <div className="px-4 py-3 bg-brand-bg/50 border-b border-brand-border text-[9px] font-black uppercase tracking-[0.2em] text-brand-text-sub">감자 월급 기록 (HISTORY)</div>
               <div className="max-h-[300px] overflow-y-auto divide-y divide-brand-border custom-scrollbar">
                  {salaries.gamjaSalaryRecords.map((r: any) => (
                     <div key={r.id} className="p-4 flex justify-between items-center group hover:bg-brand-bg/30 transition-colors">
                        <div>
                           <p className="text-[11px] font-black text-brand-text-main">{r.date} 월급</p>
                           <p className="text-[10px] text-brand-text-sub mt-0.5 uppercase tracking-tighter">{r.memo || 'INCOME'}</p>
                        </div>
                        <div className="flex items-center gap-3">
                           <p className="text-xs font-black text-brand-purple tabular-nums">{formatNumber(r.amount)}원</p>
                           <button onClick={() => deleteGamjaSalary(r.id)} className="opacity-0 group-hover:opacity-100 text-brand-text-sub hover:text-brand-pink transition-all"><Trash2 size={14} /></button>
                        </div>
                     </div>
                  ))}
                  {salaries.gamjaSalaryRecords.length === 0 && <div className="p-8 text-center text-[10px] text-brand-text-sub italic text-brand-text-sub/50 uppercase">NO RECORDS</div>}
               </div>
            </div>
         </div>
      </div>

      {/* 3. BOTTOM: Monthly Salary Comparison Chart (Segmented vs Simple) */}
      <div className="bg-brand-card p-10 rounded-brand border border-brand-border shadow-brand">
         <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-3">
               <ComparisonIcon size={24} className="text-brand-primary" />
               <h4 className="text-lg font-black uppercase tracking-tight text-brand-text-main">월간 월급 비교 분석 (TRENDS)</h4>
            </div>
            <div className="flex gap-4">
               <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-brand-primary" />
                  <span className="text-[10px] font-black text-brand-text-sub uppercase tracking-widest">내 월급 현황</span>
               </div>
               <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-brand-purple" />
                  <span className="text-[10px] font-black text-brand-text-sub uppercase tracking-widest">감자 월급 현황</span>
               </div>
            </div>
         </div>
         
         <div className="h-[500px] w-full">
            <ResponsiveContainer width="100%" height="100%">
               <BarChart data={monthlySalaryData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#25282b" />
                  <XAxis 
                     dataKey="name" 
                     axisLine={false} 
                     tickLine={false} 
                     tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 'bold' }} 
                     dy={15}
                  />
                  <YAxis hide />
                  <Tooltip 
                     content={<SalaryChartTooltip />}
                     cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                  />
                  <Legend 
                     verticalAlign="bottom" 
                     align="center" 
                     iconType="circle" 
                     wrapperStyle={{ paddingTop: '50px', fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                  />
                  
                  {/* My Salary Components (Stacked) */}
                  {ME_COMPONENTS_FILTERED.map((label, idx) => (
                     <Bar 
                        key={label} 
                        dataKey={label} 
                        stackId="me" 
                        fill={COLORS[idx % COLORS.length]} 
                        barSize={28}
                     />
                  ))}
                  
                  {/* Gamja Salary (Single Bar) */}
                  <Bar 
                     dataKey="감자 월급" 
                     fill="#b7a8e5" 
                     barSize={28} 
                     radius={[2, 2, 0, 0]}
                  />
               </BarChart>
            </ResponsiveContainer>
         </div>
      </div>

      {/* 4. Salary Label Settings Section */}
      <div className="bg-brand-card p-10 rounded-brand border border-brand-border shadow-brand">
         <div className="flex items-center gap-3 mb-8">
            <Edit2 size={18} className="text-brand-primary" />
            <h4 className="text-sm font-black uppercase tracking-[0.2em] text-brand-text-main">항목 명칭 설정 (CUSTOM LABELS)</h4>
         </div>
         <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6">
            {SALARY_TYPES.map((type) => (
               <div key={type} className="space-y-3">
                  <span className="text-[9px] font-black text-brand-text-sub px-2 uppercase tracking-widest">{type}</span>
                  <input 
                    type="text" 
                    value={salaryLabels[type]} 
                    onChange={(e) => setSalaryLabels({ ...salaryLabels, [type]: e.target.value })}
                    className="form-input text-xs font-black py-2.5 bg-brand-bg/30 border-brand-border focus:border-brand-primary text-brand-text-main transition-all"
                    placeholder="LABEL"
                  />
               </div>
            ))}
         </div>
      </div>
    </motion.div>
  );
}

function AnnualSettlementView({ transactions, gamjaTransactions, salaries, tabName, setTabName }: any) {
  const myChartData = useMemo(() => {
    const expenseTxs = transactions.filter((t: any) => t.type === '지출');
    const categoryTotals: Record<string, number> = {};
    expenseTxs.forEach((t: any) => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });
    return Object.entries(categoryTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const gamjaChartData = useMemo(() => {
    const expenseTxs = gamjaTransactions.filter((t: any) => t.type === '지출');
    const categoryTotals: Record<string, number> = {};
    expenseTxs.forEach((t: any) => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });
    return Object.entries(categoryTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [gamjaTransactions]);

  const totalMySalary = salaries.mySalaryRecords.reduce((s: number, r: any) => s + r.amount, 0);
  const totalGamjaSalary = salaries.gamjaSalaryRecords.reduce((s: number, r: any) => s + r.amount, 0);
  const totalMyExpense = myChartData.reduce((sum, d) => sum + d.value, 0);
  const totalGamjaExpense = gamjaChartData.reduce((sum, d) => sum + d.value, 0);
  
  const myRemaining = totalMySalary - totalMyExpense;
  const gamjaRemaining = totalGamjaSalary - totalGamjaExpense;

  const COLORS = ['#94D5FF', '#AEE7E6', '#C9C7F5', '#A0E1F0', '#B7A8E5', '#B2D8D8', '#D1C4E9', '#BBDEFB', '#B2EBF2', '#E1BEE7'];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto space-y-12 pb-20">
      <EditableHeader title={tabName} setTitle={setTabName}  />
      
      {/* 내 지출 영역 */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <SummarySmallCard label="내 월급 총 금액" value={totalMySalary} color="text-brand-primary" />
           <SummarySmallCard label="내 지출 현황 총액" value={totalMyExpense} color="text-brand-pink" />
           <SummarySmallCard label="내 남은 자산" value={myRemaining} color="text-brand-mint" />
        </div>

        <div className="bg-brand-card p-6 rounded-brand border border-brand-border shadow-brand">
           <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-brand-primary flex items-center gap-2 uppercase tracking-tight">
                 <BarChart2 size={24} /> 내 지출 현황 (ITEMS)
              </h3>
           </div>
           
           {myChartData.length === 0 ? (
             <div className="p-12 text-center text-brand-text-sub font-bold italic">데이터가 존재하지 않습니다.</div>
           ) : (
             <div className="h-[450px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={myChartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#25282b" />
                      <XAxis 
                        dataKey="name" 
                        fontSize={11} 
                        fontWeight="black" 
                        stroke="#9ca3af" 
                        tickLine={false} 
                        axisLine={false}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                      />
                      <YAxis 
                        tickFormatter={(value) => `${Math.round(value / 10000)}만`}
                        fontSize={10}
                        fontWeight="bold"
                        stroke="#9ca3af"
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip 
                         contentStyle={{ backgroundColor: '#1a1d22', border: '1px solid #25282b', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}
                         itemStyle={{ fontSize: '11px', fontWeight: 'black' }}
                         labelStyle={{ color: '#9ca3af', marginBottom: '8px', fontSize: '10px' }}
                         formatter={(value: number) => `${formatNumber(value)}원`}
                         cursor={{ fill: 'rgba(255,255,255,0.01)' }}
                      />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                        {myChartData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                   </BarChart>
                </ResponsiveContainer>
             </div>
           )}
        </div>
      </div>

      {/* 감자 지출 영역 */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <SummarySmallCard label="감자 월급 총 금액" value={totalGamjaSalary} color="text-brand-purple" />
           <SummarySmallCard label="감자 지출 현황 총액" value={totalGamjaExpense} color="text-brand-pink" />
           <SummarySmallCard label="감자 남은 자산" value={gamjaRemaining} color="text-brand-mint" />
        </div>

        <div className="bg-brand-card p-6 rounded-brand border border-brand-border shadow-brand">
           <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-brand-purple flex items-center gap-2 uppercase tracking-tight">
                 <BarChart2 size={24} /> 감자 지출 현황 (ITEMS)
              </h3>
           </div>

           {gamjaChartData.length === 0 ? (
             <div className="p-12 text-center text-brand-text-sub font-bold italic">데이터가 존재하지 않습니다.</div>
           ) : (
             <div className="h-[450px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={gamjaChartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#25282b" />
                      <XAxis 
                        dataKey="name" 
                        fontSize={11} 
                        fontWeight="black" 
                        stroke="#9ca3af" 
                        tickLine={false} 
                        axisLine={false}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                      />
                      <YAxis 
                        tickFormatter={(value) => `${Math.round(value / 10000)}만`}
                        fontSize={10}
                        fontWeight="bold"
                        stroke="#9ca3af"
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip 
                         contentStyle={{ backgroundColor: '#1a1d22', border: '1px solid #25282b', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}
                         itemStyle={{ fontSize: '11px', fontWeight: 'black' }}
                         labelStyle={{ color: '#9ca3af', marginBottom: '8px', fontSize: '10px' }}
                         formatter={(value: number) => `${formatNumber(value)}원`}
                         cursor={{ fill: 'rgba(255,255,255,0.01)' }}
                      />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                        {gamjaChartData.map((entry, index) => (
                           <Cell key={`cell-gamja-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                        ))}
                      </Bar>

                
                   </BarChart>
                </ResponsiveContainer>

                 <button onClick={() => exportCSV(transactions)}>
  엑셀 다운로드
</button>
               
             </div>
           )}
        </div>
      </div>
    </motion.div>
  );
}



function TransactionEditModal({ 
  isOpen, 
  onClose, 
  transactions, 
  setTransactions, 
  categories, 
  setCategories,
  title
}: any) {
  const [editedTxs, setEditedTxs] = useState<any[]>([]);
  const [editedCategories, setEditedCategories] = useState<any>({ expense: [], income: [] });

  useEffect(() => {
    if (isOpen) {
      setEditedTxs([...transactions]);
      setEditedCategories({ ...categories });
    }
  }, [isOpen, transactions, categories]);

  const handleUpdateTx = (id: string, field: string, value: any) => {
    setEditedTxs(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handleDeleteTx = (id: string) => {
     setEditedTxs(prev => prev.filter(t => t.id !== id));
  };

  const handleSave = () => {
    setTransactions(editedTxs);
    setCategories(editedCategories);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-brand-bg/95 backdrop-blur-md" onClick={onClose} />
      <div className="bg-brand-card border border-brand-border rounded-2xl w-full max-w-6xl h-[85vh] flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)] relative z-10 overflow-hidden">
        <div className="p-6 border-b border-brand-border flex justify-between items-center bg-white/5">
           <div>
              <h3 className="text-xl font-black uppercase tracking-tight text-white mb-1">{title}</h3>
              <p className="text-[10px] font-bold text-brand-text-sub uppercase tracking-widest">내역 수정 및 항목 관리를 통합 수행합니다.</p>
           </div>
           <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-full transition-all"><X size={24} /></button>
        </div>
        
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
           {/* Transaction List */}
           <div className="flex-1 flex flex-col overflow-hidden border-r border-brand-border">
              <div className="p-4 bg-brand-bg/50 border-b border-brand-border flex justify-between items-center">
                 <p className="text-[10px] font-black uppercase tracking-widest text-brand-text-sub">지출 내역 리스트 ({editedTxs.length})</p>
                 <span className="text-[9px] font-bold text-brand-text-sub/50 italic">각 항목을 직접 클릭하여 수정하세요.</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-brand-bg/20">
                 {editedTxs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((t: any) => (
                   <div key={t.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-2 bg-brand-card border border-brand-border rounded-xl hover:border-brand-primary/30 transition-all items-center">
                      <div className="sm:col-span-2">
                         <input 
                           type="date" 
                           value={t.date} 
                           onChange={e => handleUpdateTx(t.id, 'date', e.target.value)}
                           className="w-full bg-brand-bg/50 border border-brand-border rounded px-2 py-1.5 text-[10px] font-bold text-white outline-none focus:border-brand-primary h-[32px]"
                         />
                      </div>
                      <div className="sm:col-span-2">
                         <select 
                           value={t.category} 
                           onChange={e => handleUpdateTx(t.id, 'category', e.target.value)}
                           className="w-full bg-brand-bg/50 border border-brand-border rounded px-2 py-1.5 text-[10px] font-bold text-white outline-none focus:border-brand-primary h-[32px]"
                         >
                            {(t.type === '지출' ? editedCategories.expense : editedCategories.income).map((c: string) => <option key={c} value={c}>{c}</option>)}
                         </select>
                      </div>
                      <div className="sm:col-span-3">
                         <input 
                           type="text" 
                           value={t.memo} 
                           placeholder="메모를 입력하세요"
                           onChange={e => handleUpdateTx(t.id, 'memo', e.target.value)}
                           className="w-full bg-brand-bg/50 border border-brand-border rounded px-2 py-1.5 text-[10px] font-bold text-white outline-none focus:border-brand-primary h-[32px]"
                         />
                      </div>
                      <div className="sm:col-span-3">
                         <NumericInput 
                           value={t.amount} 
                           onChange={(v: number) => handleUpdateTx(t.id, 'amount', v)}
                           className="w-full bg-brand-bg/50 border border-brand-border rounded px-2 py-1.5 text-[11px] font-black text-brand-primary outline-none focus:border-brand-primary h-[32px] tabular-nums"
                         />
                      </div>
                      <div className="sm:col-span-2 flex justify-end">
                         <button onClick={() => handleDeleteTx(t.id)} className="text-brand-pink hover:bg-brand-pink/10 p-2 rounded-lg transition-all active:scale-90">
                            <Trash2 size={16} />
                         </button>
                      </div>
                   </div>
                 ))}
                 {editedTxs.length === 0 && (
                   <div className="text-center py-32 opacity-20 flex flex-col items-center gap-4">
                      <Activity size={48} />
                      <p className="font-black uppercase tracking-widest text-xs">관리할 지출 내역이 없습니다</p>
                   </div>
                 )}
              </div>
           </div>

           {/* Category Management */}
           <div className="w-full lg:w-72 flex flex-col overflow-hidden bg-brand-card/30">
              <div className="p-4 bg-brand-bg/50 border-b border-brand-border">
                 <p className="text-[10px] font-black uppercase tracking-widest text-brand-text-sub">지출 항목 카테고리 관리</p>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-8 custom-scrollbar">
                 <div className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                       <Minus size={14} className="text-brand-pink" />
                       <p className="text-[10px] font-black text-brand-pink uppercase tracking-widest">지출 항목 (EXPENSE)</p>
                    </div>
                    <textarea 
                      value={editedCategories.expense.join(', ')} 
                      onChange={e => setEditedCategories({...editedCategories, expense: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}
                      className="w-full h-40 bg-brand-bg/30 border border-brand-border rounded-xl p-4 text-[11px] font-bold leading-relaxed focus:border-brand-primary outline-none transition-all placeholder:text-brand-text-sub/30"
                      placeholder="식비, 외식, 공과금..."
                    />
                    <p className="text-[9px] text-brand-text-sub font-medium px-1 italic">쉼표(,)로 구분하여 입력하세요.</p>
                 </div>
                 
                 <div className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                       <Plus size={14} className="text-brand-mint" />
                       <p className="text-[10px] font-black text-brand-mint uppercase tracking-widest">수입 항목 (INCOME)</p>
                    </div>
                    <textarea 
                      value={editedCategories.income.join(', ')} 
                      onChange={e => setEditedCategories({...editedCategories, income: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}
                      className="w-full h-40 bg-brand-bg/30 border border-brand-border rounded-xl p-4 text-[11px] font-bold leading-relaxed focus:border-brand-mint outline-none transition-all placeholder:text-brand-text-sub/30"
                      placeholder="월급, 보너스, 부수입..."
                    />
                    <p className="text-[9px] text-brand-text-sub font-medium px-1 italic">쉼표(,)로 구분하여 입력하세요.</p>
                 </div>
              </div>
           </div>
        </div>

        <div className="p-8 border-t border-brand-border bg-brand-bg/40 flex gap-4">

 
        
           <button onClick={onClose} className="flex-1 py-4 border border-brand-border rounded-xl font-bold uppercase text-[11px] hover:bg-white/5 transition-all tracking-widest">취소 (DISCARD)</button>
           <button 
             onClick={handleSave} 
             className="flex-[2] py-4 bg-brand-primary text-white rounded-xl font-black uppercase text-[11px] shadow-xl shadow-brand-primary/30 hover:brightness-110 active:scale-[0.98] transition-all tracking-widest"
           >
             모든 변경 사항 적용 및 저장 (APPLY CHANGES)
           </button>
        </div>
      </div>
    </div>
  );
}




// --- HELPERS ---

function SummarySmallCard({ label, value, color }: { label: string, value: string | number, color: string }) {
  return (
    <div className="bg-brand-card p-4 border border-brand-border rounded-xl hover:border-brand-primary/40 transition-all shadow-xl hover:shadow-[0_0_20px_rgba(148,213,255,0.05)]">
      <p className="text-[10px] font-black text-brand-text-sub uppercase mb-1 tracking-widest">{label}</p>
      <p className={`text-lg font-black ${color} tabular-nums`}>
        {typeof value === 'number' ? formatCurrency(value) : value}
      </p>
    </div>
  );
}

function AssetMiniSummary({ label, amount }: { label: string, amount: number }) {
  return (
    <div className="p-3 bg-brand-card border border-brand-border rounded-xl flex flex-col justify-center hover:border-brand-primary transition-all shadow-sm">
       <p className="text-[9px] font-black text-brand-text-sub uppercase mb-0.5 tracking-tighter">{label}</p>
       <p className="text-xs font-black tabular-nums">{formatCurrency(amount)}</p>
    </div>
  );
}

function FormGroup({ label, children }: { label: string, children: ReactNode }) {
  return (
    <div className="space-y-1.5 flex flex-col">
      <label className="text-[11px] font-black text-brand-text-sub uppercase ml-1">{label}</label>
      {children}
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
    <div className="grid grid-cols-7 gap-px bg-brand-border border border-brand-border rounded-brand overflow-hidden shadow-brand">
      {['일', '월', '화', '수', '목', '금', '토'].map(d => (
        <div key={d} className="text-[10px] text-center font-black text-brand-text-sub py-3 bg-brand-card border-b border-brand-border uppercase tracking-widest">{d}</div>
      ))}
      {days.map((day, idx) => {
        if (!day) return <div key={`empty-${idx}`} className="bg-brand-bg/20" />;
        
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayTransactions = transactions.filter((t: any) => t.date === dateStr);
        const dayExpense = dayTransactions.filter((t: any) => t.type === '지출').reduce((sum: number, t: any) => sum + t.amount, 0);
        const dayIncome = dayTransactions.filter((t: any) => t.type === '수입').reduce((sum: number, t: any) => sum + t.amount, 0);
        const isToday = new Date().toISOString().split('T')[0] === dateStr;
        const isSelected = selectedDateStr === dateStr;

        return (
          <button 
            key={idx} 
            onClick={() => onDateClick(dateStr)}
            className={`min-h-[60px] md:min-h-[90px] p-2 border transition-all flex flex-col items-start gap-1 relative ${
              isSelected ? 'bg-brand-primary/10 border-brand-primary z-10' :
              isToday ? 'bg-white/5 border-white/20' : 
              'bg-brand-card border-transparent hover:bg-white/5'
            }`}
          >
            <span className={`text-[10px] font-black ${isSelected ? 'text-brand-primary' : isToday ? 'text-white' : 'text-brand-text-sub/60'}`}>{day}</span>
            <div className="flex flex-col gap-0.5 w-full">
               {dayIncome > 0 && (
                 <span className="text-[8px] font-black text-brand-mint tabular-nums">+{formatNumber(dayIncome)}</span>
               )}
               {dayExpense > 0 && (
                 <span className="text-[8px] font-black text-brand-pink tabular-nums">-{formatNumber(dayExpense)}</span>
               )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
