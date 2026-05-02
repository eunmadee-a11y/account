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
          className="text-xs font-black bg-transparent border-b border-brand-primary text-center outline-none" />
      ) : (
        <h2 className="text-[11px] font-black text-brand-text-sub/60 uppercase tracking-widest cursor-pointer" onClick={() => setIsEditing(true)}>{title}</h2>
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



{/* iOS 최적화: 상단 여백 및 탭 하단 간격 최소화 */}
<header className="sticky top-0 bg-brand-bg/90 backdrop-blur-xl z-50 border-b border-brand-border px-4 pt-4 pb-1">
  <div className="flex items-center justify-between mb-2">
    {/* 로고 및 제목 */}
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 rounded-lg bg-brand-primary flex items-center justify-center shadow-lg shadow-brand-primary/20">
        <Activity size={14} className="text-white" />
      </div>
      <span className="text-[11px] font-black tracking-widest text-brand-text-main uppercase">Account</span>
    </div>

    {/* 날짜 이동 탭 (우상단 배치) */}
    <div className="flex items-center gap-2 bg-brand-card/50 px-2.5 py-0.5 rounded-full border border-brand-border">
      <button onClick={() => changeMonth(-1)} className="text-brand-text-sub active:scale-90 p-1">
        <ChevronLeft size={14} />
      </button>
      <span className="text-[10px] font-black min-w-[65px] text-center">{currentMonthDisplay}</span>
      <button onClick={() => changeMonth(1)} className="text-brand-text-sub active:scale-90 p-1">
        <ChevronRight size={14} />
      </button>
    </div>
  </div>

  {/* 탭 메뉴 (하단 여백 제거) */}
  <nav className="flex gap-1 overflow-x-auto scrollbar-hide w-full">
    <TabButton name="홈" icon={Home} />
    <TabButton name="내 지출" icon={CreditCard} />
    <TabButton name="연금/투자 관리" icon={TrendingUp} />
    <TabButton name="감자 지출" icon={User} />
    <TabButton name="월급 비교" icon={ComparisonIcon} />
    <TabButton name="대출 관리" icon={LoanIcon} />
    <TabButton name="1년 결산" icon={BarChart2} />
  </nav>
</header>



{/* 콘텐츠 영역 상단 패딩(pt-0)을 제거하여 탭 바에 밀착[cite: 1] */}
<main className="flex-1 max-w-[1400px] w-full mx-auto p-4 pt-0 md:p-8 md:pt-3">
  <AnimatePresence mode="wait">
    {activeTab === '홈' && <HomeView key="home" {...{ totalAssets, monthlySummary: filteredData, currentDate, transactions, balances, setTransactions, selectedDateStr, setSelectedDateStr, deleteTransaction, loanSummary, myAccountNames, categories: myCategories, setCategories: setMyCategories }} />}
    {activeTab === '내 지출' && <ExpenseView key="expense" {...{ transactions, setTransactions, filteredData, currentDate, deleteTransaction, myAccountNames, balances, setBalances, searchQuery: mySearchQuery, setSearchQuery: setMySearchQuery, categories: myCategories, setCategories: setMyCategories, onOpenEdit: () => setIsMyEditModalOpen(true) }} />}
    {activeTab === '연금/투자 관리' && <PensionView key="pension" {...{ balances, setBalances, currentDate }} />}
    {activeTab === '감자 지출' && <GamjaView key="gamja" {...{ gamjaTransactions, setGamjaTransactions, deleteGamjaTransaction, gamjaAccountNames, searchQuery: gamjaSearchQuery, setSearchQuery: setGamjaSearchQuery, balances, setBalances, currentDate, categories: gamjaCategories, setCategories: setGamjaCategories, onOpenEdit: () => setIsGamjaEditModalOpen(true) }} />}
    {activeTab === '월급 비교' && <SalaryView key="salary" {...{ salaries, setSalaries, salaryLabels, setSalaryLabels, currentDate, transactions, setTransactions, gamjaTransactions, setGamjaTransactions, balances, setBalances }} />}
    {activeTab === '대출 관리' && <LoanManagementView key="loans" {...{ loans, setLoans, loanSummary }} />}
    {activeTab === '1년 결산' && <AnnualSettlementView key="annual" {...{ transactions, gamjaTransactions, salaries }} />}
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
/* 홈 탭 */
function HomeView({ totalAssets, monthlySummary, transactions, setTransactions, selectedDateStr, setSelectedDateStr, deleteTransaction, loanSummary, balances, currentDate, myAccountNames, tabName, setTabName, categories, setCategories }: any) {
  const mainAccounts = balances.filter((b: any) => b.category === '내 통장');
  const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  // --- 1. 적금 다중 추가를 위한 로컬 상태 관리 ---
  const [savingsList, setSavingsList] = useState<{id: string, name: string}[]>(() => {
    try {
      const saved = localStorage.getItem('mySavingsList');
      return saved ? JSON.parse(saved) : [{ id: 'savings-1', name: '적금 1' }];
    } catch { return [{ id: 'savings-1', name: '적금 1' }]; }
  });

  const [savingsValues, setSavingsValues] = useState<Record<string, Record<string, number>>>(() => {
    try {
      const saved = localStorage.getItem('mySavingsValues');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const currentMonthSavings = savingsValues[monthKey] || {};

  const handleAddSavings = () => {
    const newId = `savings-${Date.now()}`;
    const newList = [...savingsList, { id: newId, name: `적금 ${savingsList.length + 1}` }];
    setSavingsList(newList);
    localStorage.setItem('mySavingsList', JSON.stringify(newList));
  };

  const handleRemoveSavings = (id: string) => {
    const newList = savingsList.filter(s => s.id !== id);
    setSavingsList(newList);
    localStorage.setItem('mySavingsList', JSON.stringify(newList));
  };

  const handleSavingsNameChange = (id: string, newName: string) => {
    const newList = savingsList.map(s => s.id === id ? { ...s, name: newName } : s);
    setSavingsList(newList);
    localStorage.setItem('mySavingsList', JSON.stringify(newList));
  };

  const handleSavingsValueChange = (id: string, val: number) => {
    const newMonthData = { ...currentMonthSavings, [id]: val };
    const newTotalData = { ...savingsValues, [monthKey]: newMonthData };
    setSavingsValues(newTotalData);
    localStorage.setItem('mySavingsValues', JSON.stringify(newTotalData));
  };

  const totalSavingsAmount = savingsList.reduce((sum, s) => sum + (currentMonthSavings[s.id] || 0), 0);

  // --- 2. 생활비, 여유자금, 자동이체 + 적금(전체) 합계 ---
  const totalSum = useMemo(() => {
    const targetKeywords = ['생활비', '여유자금', '자동이체'];
    const accountsSum = mainAccounts
      .filter((b: any) => targetKeywords.some(k => b.name.includes(k)))
      .reduce((sum: number, b: any) => sum + b.currentBalance, 0);
    return accountsSum + totalSavingsAmount;
  }, [mainAccounts, totalSavingsAmount]);

  // --- 3. 자산 현황 요약 커스텀 데이터 (감자자산, 기타자산 모두 제외) ---
  const homePensionTotal = balances
    .filter((b: any) => b.category === '투자/연금')
    .reduce((sum: number, b: any) => {
      return sum + (b.monthlyBalances?.[monthKey] ?? b.currentBalance ?? 0);
    }, 0);

  const customCashLike = totalSum;               // 현금성 = 내 통장 합계(적금 포함)
  const customInvestment = homePensionTotal;     // 투자/연금 = 연금/투자 탭 총액
  const customTotalAsset = customCashLike + customInvestment; // 오직 현금과 투자만 합산

  // 홈 탭 진입 시 '생활비'가 포함된 통장이 있으면 기본으로 열어둠
  const [activeQuickAccount, setActiveQuickAccount] = useState<string | null>(() => {
    const defaultAcc = mainAccounts.find((a: any) => a.name.includes('생활비'));
    return defaultAcc ? defaultAcc.name : null;
  });

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
        <div className="px-4 py-3 border-b border-brand-border bg-white/5 flex items-center justify-between">
          <h3 className="text-sm font-black flex items-center gap-2">
            <Wallet size={16} className="text-brand-primary" />
            내 통장 잔액
          </h3>
          <p className="text-sm font-black text-brand-primary">
            합계: {formatCurrency(totalSum)}
          </p>
        </div>

        <div className="divide-y divide-brand-border">
          {/* 기존 3개 통장 목록 */}
          {mainAccounts.map((b: any) => (
            <div key={b.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <p className="text-xs md:text-sm font-black text-brand-text-sub shrink-0">
                {b.name.replace('내 ', '').replace(' 통장', '')}
              </p>
              <div className="flex items-center justify-end gap-2 min-w-0">
                <p className="text-base md:text-xl font-black tabular-nums">
                  {formatCurrency(b.currentBalance)}
                </p>
              </div>
            </div>
          ))}

          {/* 추가된 다중 적금 항목 리스트 */}
          {savingsList.map((savings) => (
            <div key={savings.id} className="px-4 py-3 flex items-center justify-between gap-3 bg-brand-bg/30">
              <div className="flex items-center gap-1 shrink-0">
                {savingsList.length > 1 && (
                  <button onClick={() => handleRemoveSavings(savings.id)} className="text-brand-pink hover:bg-brand-pink/10 p-1.5 rounded-md transition-colors">
                    <Minus size={12} />
                  </button>
                )}
                <input
                  type="text"
                  value={savings.name}
                  onChange={(e) => handleSavingsNameChange(savings.id, e.target.value)}
                  className="bg-transparent text-xs md:text-sm font-black text-brand-text-sub outline-none w-24 md:w-32 focus:text-brand-primary"
                  placeholder="적금 이름"
                />
              </div>
              <div className="flex items-center justify-end gap-2 min-w-0 w-32">
                <NumericInput
                  value={currentMonthSavings[savings.id] || 0}
                  onChange={(val: number) => handleSavingsValueChange(savings.id, val)}
                  className="w-full bg-transparent border-b border-brand-primary/30 text-right text-base md:text-xl font-black tabular-nums outline-none focus:border-brand-primary text-brand-primary"
                  placeholder="0"
                />
              </div>
            </div>
          ))}
          
          {/* 적금 추가 (+) 버튼 */}
          <div className="px-4 py-2 bg-brand-bg/10 flex justify-center border-t border-brand-border">
             <button onClick={handleAddSavings} className="flex items-center gap-1 text-[11px] font-bold text-brand-text-sub hover:text-brand-primary transition-colors py-1.5">
               <Plus size={12} /> 적금 통장 추가
             </button>
          </div>
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
                <p className="text-xs font-bold text-brand-text-sub uppercase mb-2">총 자산 (현금 + 투자)</p>
                <h4 className="text-3xl font-black">{formatCurrency(customTotalAsset)}</h4>
              </div>

              <div className="h-1.5 bg-brand-border rounded-full overflow-hidden flex">
                <div className="h-full bg-brand-primary" style={{ width: `${customTotalAsset ? (customCashLike / customTotalAsset) * 100 : 0}%` }} />
                <div className="h-full bg-brand-mint" style={{ width: `${customTotalAsset ? (customInvestment / customTotalAsset) * 100 : 0}%` }} />
              </div>

              {/* 금액 텍스트가 추가된 인덱스 부분 */}
              <div className="grid grid-cols-2 gap-4 text-[10px] font-bold text-brand-text-sub">
                <div className="flex flex-col gap-1">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-brand-primary" />현금성
                  </span>
                  <span className="pl-3 tabular-nums">{formatCurrency(customCashLike)}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-brand-mint" />투자/연금
                  </span>
                  <span className="pl-3 tabular-nums">{formatCurrency(customInvestment)}</span>
                </div>
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


/*내 지출*/


/* 내 지출 */
function ExpenseView({ transactions, setTransactions, filteredData, currentDate, deleteTransaction, myAccountNames, balances, setBalances, searchQuery, setSearchQuery, tabName, setTabName, categories, setCategories, onOpenEdit }: any) {
  const { currMonthTxs } = filteredData;
  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();

  // 시작금액 아코디언 토글 상태 추가
  const [isStartBalanceOpen, setIsStartBalanceOpen] = useState(false);

  const expenseAccountButtons = ['내 생활비 통장', '내 여유자금 통장', '내 자동이체 통장'];

  const [activeExpenseAccount, setActiveExpenseAccount] = useState(
    expenseAccountButtons.find(name => myAccountNames.includes(name)) || myAccountNames[0] || ''
  );

  useEffect(() => {
    if (!activeExpenseAccount && myAccountNames.length > 0) {
      setActiveExpenseAccount(
        expenseAccountButtons.find(name => myAccountNames.includes(name)) || myAccountNames[0]
      );
    }
  }, [myAccountNames, activeExpenseAccount]);

  const updateStartBalance = (id: string, value: number) => {
    setBalances((prev: any[]) =>
      prev.map((b: any) =>
        b.id === id
          ? { ...b, previousBalance: value, currentBalance: value }
          : b
      )
    );
  };

  const filteredMonthTxs = useMemo(() => {
    if (!searchQuery.trim()) return currMonthTxs;
    const q = searchQuery.toLowerCase();
    return currMonthTxs.filter((t: any) =>
      (t.memo?.toLowerCase().includes(q)) ||
      (t.category?.toLowerCase().includes(q)) ||
      (t.amount.toString().includes(q)) ||
      (t.date.includes(q))
    );
  }, [currMonthTxs, searchQuery]);

  const getAccountCalculatedBalance = (accountName: string) => {
    const account = balances.find((b: any) => b.name === accountName);
    const start = account?.previousBalance || 0;
    const accountTxs = currMonthTxs.filter((t: any) => t.account === accountName);
    const income = accountTxs.filter((t: any) => t.type === '수입').reduce((s: number, t: any) => s + t.amount, 0);
    const expense = accountTxs.filter((t: any) => t.type === '지출').reduce((s: number, t: any) => s + t.amount, 0);
    return start + income - expense;
  };

  const categoryData = useMemo(() => {
    const expenseTxs = currMonthTxs.filter((t: any) => t.type === '지출');
    const totals: { [key: string]: number } = {};

    expenseTxs.forEach((t: any) => {
      totals[t.category] = (totals[t.category] || 0) + t.amount;
    });

    const totalAmount = Object.values(totals).reduce((a, b) => a + b, 0);
    if (totalAmount === 0) return [];

    return Object.entries(totals)
      .map(([name, value]) => ({
        name,
        value: value as number,
        percentage: ((value as number / totalAmount) * 100).toFixed(1)
      }))
      .sort((a, b) => b.value - a.value);
  }, [currMonthTxs]);

  const COLORS = ['#94D5FF', '#AEE7E6', '#C9C7F5', '#A0E1F0', '#B7A8E5', '#B2D8D8', '#D1C4E9', '#BBDEFB', '#B2EBF2', '#E1BEE7'];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-7xl mx-auto space-y-10 pb-20"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <EditableHeader
          title={tabName}
          setTitle={setTabName}
        />

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-sub" />
            <input
              type="text"
              placeholder="내역 검색 (메모, 카테고리, 금액)"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-brand-card border border-brand-border rounded-full pl-9 pr-4 py-2 text-xs outline-none focus:border-brand-primary transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-text-sub hover:text-white"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="text-xs font-black text-brand-text-sub">
            상단 선택 월 기준: {year}년 {month + 1}월
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-3">
          {expenseAccountButtons.map((accountName) => {
            const exists = myAccountNames.includes(accountName);

            return (
              <button
                key={accountName}
                disabled={!exists}
                onClick={() => setActiveExpenseAccount(accountName)}
                className={`py-3 px-3 rounded-xl border font-black text-xs md:text-sm transition-all active:scale-95 ${
                  activeExpenseAccount === accountName
                    ? 'bg-brand-primary text-white border-brand-primary shadow-lg shadow-brand-primary/20'
                    : 'bg-brand-card text-brand-text-main border-brand-border hover:border-brand-primary'
                } ${!exists ? 'opacity-30 cursor-not-allowed' : ''}`}
              >
                {accountName.replace('내 ', '').replace(' 통장', '')}
              </button>
            );
          })}
        </div>

        {(() => {
          const accountName = activeExpenseAccount;
          const accountBalance = balances.find((b: any) => b.name === accountName);
          const accountTxs = filteredMonthTxs.filter((t: any) => t.account === accountName);
          const incomeTotal = accountTxs
            .filter((t: any) => t.type === '수입')
            .reduce((sum: number, t: any) => sum + t.amount, 0);
          const expenseTotal = accountTxs
            .filter((t: any) => t.type === '지출')
            .reduce((sum: number, t: any) => sum + t.amount, 0);

          return (
            <div className="bg-brand-card border border-brand-border rounded-brand overflow-hidden shadow-brand flex flex-col h-[650px]">
              <div className="p-6 border-b border-brand-border bg-white/5 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center text-brand-primary">
                    <Wallet size={20} />
                  </div>
                  <h4 className="font-black text-base">{accountName}</h4>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-brand-text-sub uppercase mb-1 tracking-widest">
                    현재 잔액
                  </p>
                  <p className="text-2xl font-black tabular-nums text-brand-text-main">
                    {formatNumber(accountBalance?.currentBalance || 0)}원
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pb-2">
                  <div>
                    <p className="text-[9px] font-bold text-brand-text-sub uppercase mb-1">이번 달 수입</p>
                    <p className="text-sm font-black text-brand-mint tabular-nums">+{formatNumber(incomeTotal)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-brand-text-sub uppercase mb-1">이번 달 지출</p>
                    <p className="text-sm font-black text-brand-pink tabular-nums">-{formatNumber(expenseTotal)}</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="px-6 py-3 bg-brand-bg/30 border-b border-brand-border flex justify-between items-center">
                  <span className="text-[10px] font-black text-brand-text-sub uppercase tracking-widest">거래 내역</span>
                  <span className="text-[10px] font-bold text-brand-text-sub opacity-50 uppercase">{accountTxs.length}건</span>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-brand-border custom-scrollbar">
                  {accountTxs.length > 0 ? (
                    accountTxs.map((t: any) => (
                      <div key={t.id} className="px-6 py-4 hover:bg-white/5 transition-colors group">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <p className="text-[10px] text-brand-text-sub font-black uppercase mb-0.5">{t.date}</p>
                            <p className="text-xs font-black">{t.memo || t.category}</p>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className={`text-xs font-black tabular-nums ${t.type === '수입' ? 'text-brand-mint' : 'text-brand-pink'}`}>
                                {t.type === '수입' ? '+' : '-'}{formatNumber(t.amount)}
                              </p>
                              <span className="text-[9px] font-bold text-brand-text-sub bg-brand-border/30 px-1.5 py-0.5 rounded">
                                {t.category}
                              </span>
                            </div>

                            <button
                              onClick={() => deleteTransaction(t.id)}
                              className="w-7 h-7 rounded-full flex items-center justify-center text-brand-text-sub hover:text-white hover:bg-brand-pink transition-all"
                              title="내역 삭제"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center p-10 text-center space-y-2 opacity-20">
                      <Activity size={24} />
                      <p className="text-[10px] font-black uppercase tracking-widest">내역이 없습니다</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* 파이그래프 제외, 항목별 막대 그래프만 남긴 분석 영역 */}
      <div className="bg-brand-card border border-brand-border rounded-brand p-8 shadow-brand">
        <h4 className="text-lg font-black mb-8 flex items-center gap-2">
          <Activity size={20} className="text-brand-primary" />
          이번 달 지출 분석
        </h4>

        {categoryData.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
            {categoryData.map((item, index) => (
              <div key={item.name} className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="font-black">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black tabular-nums">{formatNumber(item.value)}원</span>
                    <span className="text-[10px] text-brand-text-sub font-bold ml-2">({item.percentage}%)</span>
                  </div>
                </div>

                <div className="w-full h-1.5 bg-brand-border/30 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.percentage}%` }}
                    transition={{ duration: 1, delay: index * 0.1 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-[200px] flex flex-col items-center justify-center text-center space-y-4 border border-brand-border border-dashed rounded-xl">
            <CreditCard size={32} className="text-brand-text-sub/30" />
            <p className="text-sm font-bold text-brand-text-sub uppercase tracking-widest">분석할 지출 데이터가 없습니다</p>
          </div>
        )}
      </div>

      {/* 감자지출처럼 아코디언 방식으로 변경된 내 통장 시작금액 입력 */}
      <div className="bg-brand-card border border-brand-border rounded-brand shadow-brand overflow-hidden">
        <button
          onClick={() => setIsStartBalanceOpen(!isStartBalanceOpen)}
          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/5 transition-all"
        >
          <div>
            <h4 className="font-black text-sm flex items-center gap-2">
              <Wallet size={16} className="text-brand-primary" />
              내 통장 시작금액 입력
            </h4>
            <p className="text-[10px] font-bold text-brand-text-sub mt-1">
              수정할 때만 열어서 사용하세요.
            </p>
          </div>

          <ChevronRight
            size={18}
            className={`text-brand-primary transition-transform ${
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
                    .filter((b: any) => b.category === '내 통장')
                    .map((b: any) => (
                      <div key={b.id} className="bg-brand-bg/50 border border-brand-border rounded-xl p-4 space-y-3">
                        <p className="text-xs font-black">{b.name}</p>
                        <NumericInput
                          label="시작금액"
                          value={b.previousBalance || 0}
                          onChange={(v: number) => updateStartBalance(b.id, v)}
                          className="form-input text-sm font-black"
                        />
                        <p className="text-[10px] font-bold text-brand-text-sub">
                          시작금액 + 이번 달 수입 - 지출 = {formatCurrency(getAccountCalculatedBalance(b.name))}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <div className="flex justify-center pt-10">
        <button
          onClick={onOpenEdit}
          className="px-12 py-4 bg-brand-card border border-brand-border rounded-2xl font-black text-brand-primary uppercase tracking-widest shadow-brand hover:border-brand-primary transition-all flex items-center gap-3 active:scale-95"
        >
          <Edit2 size={18} />
          내 지출 내역 및 항목 수정 (EDIT EXPENSES)
        </button>
      </div>
    </motion.div>
  );
}

/*연금 투자관리*/

function PensionView({ balances, setBalances, currentDate }: any) {
  const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  // 기존 정렬 로직 유지
  const pensionOrder = ['개인연금', 'IRP', 'irp', 'ISA', 'isa', '퇴직연금', '퇴직금'];

  const pensionAssets = balances
    .filter((b: any) => b.category === '투자/연금' && !b.name.includes('적금'))
    .sort((a: any, b: any) => {
      const aIndex = pensionOrder.findIndex(name => a.name.toLowerCase().includes(name.toLowerCase()));
      const bIndex = pensionOrder.findIndex(name => b.name.toLowerCase().includes(name.toLowerCase()));
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });

  const getMonthlyBalance = (asset: any) => asset.monthlyBalances?.[monthKey] ?? asset.currentBalance ?? 0;

  // 실시간 잔액 업데이트 함수 (기존 유지)
  const updateMonthlyBalance = (id: string, value: number) => {
    setBalances((prev: any[]) =>
      prev.map((b: any) =>
        b.id === id ? {
              ...b,
              currentBalance: value,
              monthlyBalances: { ...(b.monthlyBalances || {}), [monthKey]: value }
            } : b
      )
    );
  };

  // 통장 삭제 함수 추가: 삭제 시 상단 총액에 즉시 반영됨
  const deletePensionAccount = (id: string, name: string) => {
    if (confirm(`'${name}' 통장을 삭제하시겠습니까? 삭제된 금액은 투자 총액 및 홈 화면 자산에서 즉시 제외됩니다.`)) {
      setBalances((prev: any[]) => prev.filter(b => b.id !== id));
    }
  };

  // 기존 신규 통장 추가 함수 유지[cite: 1]
  const addPensionAccount = () => {
    const newId = `pension-${Date.now()}`;
    const newAccount = {
      id: newId,
      name: '새 연금 통장',
      currentBalance: 0,
      previousBalance: 0,
      category: '투자/연금',
      monthlyBalances: { [monthKey]: 0 },
      monthlyAdditions: { [monthKey]: 0 }
    };
    setBalances([...balances, newAccount]);
  };

  const total = pensionAssets.reduce((sum: number, b: any) => sum + getMonthlyBalance(b), 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="bg-brand-card border border-brand-border p-4 rounded-xl shadow-brand text-center">
        <p className="text-[10px] font-bold text-brand-text-sub uppercase mb-1 tracking-widest">투자 총액[cite: 1]</p>
        <p className="text-2xl font-black text-brand-primary tabular-nums">{formatCurrency(total)}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {pensionAssets.map((asset: any) => (
          <div key={asset.id} className="bg-brand-card border border-brand-border p-5 rounded-xl relative group hover:border-brand-primary/50 transition-all">
            <div className="flex justify-between items-start mb-4">
              <input 
                value={asset.name}
                onChange={(e) => setBalances(balances.map(b => b.id === asset.id ? {...b, name: e.target.value} : b))}
                className="font-black text-brand-text-main bg-transparent outline-none focus:text-brand-primary transition-colors text-sm"
              />
              <div className="p-1.5 rounded-lg bg-brand-mint/10 text-brand-mint">
                <TrendingUp size={14} />
              </div>
            </div>

            <div className="space-y-4">
              <NumericInput label="이번달 잔액" value={getMonthlyBalance(asset)} onChange={(v: number) => updateMonthlyBalance(asset.id, v)} className="form-input text-lg font-black tabular-nums" />
            </div>

            {/* 통장 박스 하단 삭제 버튼 추가[cite: 1] */}
            <button 
              onClick={() => deletePensionAccount(asset.id, asset.name)}
              className="absolute bottom-2 right-2 p-2 text-brand-text-sub/40 hover:text-brand-pink transition-colors active:scale-90"
              title="통장 삭제"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* 기존 신규 추가 버튼 유지[cite: 1] */}
      <button 
        onClick={addPensionAccount}
        className="w-full py-4 border-2 border-dashed border-brand-border rounded-xl text-brand-text-sub flex items-center justify-center gap-2 mt-2 active:scale-95 transition-all"
      >
        <Plus size={18} /> <span className="text-[11px] font-black uppercase tracking-widest">새 연금/투자 통장 추가</span>
      </button>
    </motion.div>
  );
}

/*감자 */

function GamjaView({ gamjaTransactions, setGamjaTransactions, deleteGamjaTransaction, gamjaAccountNames, searchQuery, setSearchQuery, balances, setBalances, currentDate, tabName, setTabName, categories, setCategories, onOpenEdit }: any) {
  const [activeGamjaAccount, setActiveGamjaAccount] = useState(gamjaAccountNames[0] || '');
  const [isStartBalanceOpen, setIsStartBalanceOpen] = useState(false);

  // 입력 필드 상태 관리
  const [newTx, setNewTx] = useState({
    date: new Date().toISOString().split('T')[0],
    type: '지출' as TransactionType,
    account: gamjaAccountNames[0] || '',
    category: categories.expense[0],
    amount: 0,
    memo: ''
  });

  // 아이폰 조작을 고려하여 통장 변경 시 상태 동기화
  useEffect(() => {
    if (!activeGamjaAccount && gamjaAccountNames.length > 0) {
      setActiveGamjaAccount(gamjaAccountNames[0]);
      setNewTx((prev: any) => ({ ...prev, account: gamjaAccountNames[0] }));
    }
  }, [gamjaAccountNames, activeGamjaAccount]);

  // 지출/수입 유형 변경 시 카테고리 자동 변경
  const handleTypeChange = (newType: TransactionType) => {
    setNewTx({
      ...newTx,
      type: newType,
      category: newType === '지출' ? categories.expense[0] : categories.income[0]
    });
  };

  const handleAdd = () => {
    if (newTx.amount <= 0 || !activeGamjaAccount) return;

    const tx: GamjaTransaction = {
      id: Math.random().toString(36).substr(2, 9),
      ...newTx,
      account: activeGamjaAccount
    };

    setGamjaTransactions([tx, ...gamjaTransactions]);
    setNewTx({ ...newTx, type: '지출', category: categories.expense[0], amount: 0, memo: '' });
  };

  // 잔액 계산 및 검색 로직
  const getAccountCalculatedBalance = (accountName: string) => {
    const account = balances.find((b: any) => b.name === accountName);
    const start = account?.previousBalance || 0;
    const accountTxs = gamjaTransactions.filter((t: any) => t.account === accountName);
    const income = accountTxs.filter((t: any) => t.type === '수입').reduce((s: number, t: any) => s + t.amount, 0);
    const expense = accountTxs.filter((t: any) => t.type === '지출').reduce((s: number, t: any) => s + t.amount, 0);
    return start + income - expense;
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

      {/* 통장 선택 칩 (아이폰 터치 최적화) */}
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
            <span className="block truncate">{name.replace('감자 ', '').replace(' 통장', '')}</span>
            <span className={`block mt-1 text-[10px] tabular-nums ${activeGamjaAccount === name ? 'text-white' : 'text-brand-text-sub'}`}>
              {formatCurrency(getAccountCalculatedBalance(name))}
            </span>
          </button>
        ))}
      </div>

      {/* 홈 탭 QuickEntryBox 스타일의 입력창 */}
      <div className="bg-brand-card border border-brand-border rounded-brand overflow-hidden shadow-brand">
        <div className="p-6 border-b border-brand-border bg-white/5 space-y-5">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-black text-brand-purple flex items-center gap-2 uppercase tracking-widest">
              <Plus size={14} /> {activeGamjaAccount}
            </h4>
            <div className="flex items-center bg-brand-card border border-brand-border rounded-xl px-2 py-1">
              <input
                type="date"
                value={newTx.date}
                onChange={e => setNewTx({...newTx, date: e.target.value})}
                className="bg-transparent border-none text-[16px] md:text-xs font-black outline-none focus:ring-0 text-brand-text-main h-[28px]"
              />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-brand-text-sub uppercase ml-1">유형</label>
            <div className="flex bg-brand-bg rounded-lg p-0.5 border border-brand-border">
              <button
                onClick={() => handleTypeChange('지출')}
                className={`flex-1 py-1.5 rounded-md text-[14px] font-black transition-colors ${newTx.type === '지출' ? 'bg-brand-pink text-white' : 'text-brand-text-sub'}`}
              >
                지출
              </button>
              <button
                onClick={() => handleTypeChange('수입')}
                className={`flex-1 py-1.5 rounded-md text-[14px] font-black transition-colors ${newTx.type === '수입' ? 'bg-brand-mint text-white' : 'text-brand-text-sub'}`}
              >
                수입
              </button>
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <label className="text-[11px] font-black text-brand-text-sub uppercase ml-1">항목 (좌우 스크롤 선택)</label>
            <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide snap-x">
              {(newTx.type === '지출' ? categories.expense : categories.income).map((c: string) => (
                <button
                  key={c}
                  onClick={() => setNewTx({...newTx, category: c})}
                  className={`shrink-0 snap-start px-4 py-2 rounded-xl text-[13px] font-black transition-all ${
                    newTx.category === c 
                      ? (newTx.type === '지출' ? 'bg-brand-pink/20 text-brand-pink border border-brand-pink/50' : 'bg-brand-mint/20 text-brand-mint border border-brand-mint/50')
                      : 'bg-brand-bg text-brand-text-sub border border-brand-border'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 mt-1">
            <div className="space-y-1.5 p-3 bg-brand-purple/5 border border-brand-purple/30 rounded-xl">
              <NumericInput 
                label="금액 입력"
                value={newTx.amount} 
                placeholder="0" 
                onChange={(val: number) => setNewTx({...newTx, amount: val})} 
                className="form-input text-[16px] md:text-lg font-black py-2 h-[42px] bg-transparent text-brand-purple" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-brand-text-sub uppercase ml-1">메모</label>
              <input 
                type="text" 
                value={newTx.memo} 
                placeholder="메모를 입력하세요" 
                onChange={e => setNewTx({...newTx, memo: e.target.value})} 
                className="form-input text-[16px] md:text-[11px] py-2 h-[42px]" 
              />
            </div>
          </div>

          <div className="mt-5">
            <button 
              onClick={handleAdd} 
              className="w-full bg-brand-purple text-white text-[15px] font-black py-3.5 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all uppercase tracking-widest shadow-lg shadow-brand-purple/20"
            >
              내역 추가하기
            </button>
          </div>
        </div>

        {/* 하단 내역 리스트 */}
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
                <button onClick={() => deleteGamjaTransaction(t.id)} className="p-2 text-brand-text-sub hover:text-brand-pink">
                  <X size={15} />
                </button>
              </div>
            </div>
          ))}
          {filteredTxs.length === 0 && (
            <div className="p-16 text-center text-brand-text-sub font-bold opacity-40 uppercase tracking-widest">NO RECORDS</div>
          )}
        </div>
      </div>

      {/* 감자 시작금액 입력 (아코디언) */}
      <div className="bg-brand-card border border-brand-border rounded-brand shadow-brand overflow-hidden">
        <button
          onClick={() => setIsStartBalanceOpen(!isStartBalanceOpen)}
          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/5 transition-all"
        >
          <div>
            <h4 className="font-black text-sm">감자 시작금액 입력</h4>
            <p className="text-[10px] font-bold text-brand-text-sub mt-1">수정할 때만 열어서 사용하세요.</p>
          </div>
          <ChevronRight size={18} className={`text-brand-purple transition-transform ${isStartBalanceOpen ? 'rotate-90' : ''}`} />
        </button>
        <AnimatePresence>
          {isStartBalanceOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="px-6 pb-6 pt-2 border-t border-brand-border">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {balances.filter((b: any) => b.category === '감자 자산').map((b: any) => (
                    <div key={b.id} className="bg-brand-bg/50 border border-brand-border rounded-xl p-4 space-y-3">
                      <p className="text-xs font-black">{b.name}</p>
                      <NumericInput
                        label="시작금액"
                        value={b.previousBalance || 0}
                        onChange={(v: number) => setBalances((prev: any[]) => prev.map((item: any) => item.id === b.id ? { ...item, previousBalance: v, currentBalance: v } : item))}
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
        <button onClick={onOpenEdit} className="px-12 py-4 bg-brand-card border border-brand-border rounded-2xl font-black text-brand-purple shadow-brand hover:border-brand-purple transition-all flex items-center gap-3 active:scale-95">
          <Edit2 size={18} /> 감자 지출 내역 및 항목 수정
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



/*대출 현황*/



function LoanManagementView({ loans, setLoans, loanSummary, tabName, setTabName }: any) {
  const [activeLoanId, setActiveLoanId] = useState(loans[0]?.id || '');
  const activeLoan = loans.find((l: any) => l.id === activeLoanId);

  const [newRepayment, setNewRepayment] = useState({
    principal: 0,
    interest: 0,
    date: new Date().toISOString().split('T')[0],
    memo: ''
  });

  const getLoanStats = (loan: any) => {
    const cumulativePrincipal = loan.repayments.reduce((sum: number, r: any) => sum + r.principal, 0);
    const cumulativeInterest = loan.repayments.reduce((sum: number, r: any) => sum + r.interest, 0);
    const principalRepayments = loan.repayments.filter((r: any) => r.principal > 0);
    const progress = loan.originalTotalAmount > 0 
      ? Math.min((cumulativePrincipal / loan.originalTotalAmount) * 100, 100) 
      : 0;
    
    return {
      cumulativePrincipal,
      cumulativeInterest,
      remaining: loan.originalTotalAmount - cumulativePrincipal,
      nextTurn: principalRepayments.length + 1,
      progress
    };
  };

  const updateLoanField = (id: string, field: string, value: any) => {
    setLoans(loans.map((l: any) => l.id === id ? { ...l, [field]: value } : l));
  };

  const addNewLoan = () => {
    const newId = `loan-${Date.now()}`;
    const newLoan = { id: newId, name: '새 대출', originalTotalAmount: 0, repayments: [] };
    setLoans([...loans, newLoan]);
    setActiveLoanId(newId);
  };

  const deleteLoan = (id: string) => {
    if (confirm('해당 대출 항목을 삭제하시겠습니까? 관련 모든 상환 내역이 사라집니다.')) {
      const filtered = loans.filter((l: any) => l.id !== id);
      setLoans(filtered);
      setActiveLoanId(filtered[0]?.id || '');
    }
  };

  const addRepayment = () => {
    if (!activeLoanId || (newRepayment.principal === 0 && newRepayment.interest === 0)) return;
    const stats = getLoanStats(activeLoan);
    const repayment = {
      id: Math.random().toString(36).substr(2, 9),
      ...newRepayment,
      turn: newRepayment.principal > 0 ? stats.nextTurn : null
    };
    setLoans(loans.map((l: any) => l.id === activeLoanId ? { ...l, repayments: [repayment, ...l.repayments] } : l));
    setNewRepayment({ ...newRepayment, principal: 0, interest: 0, memo: '' });
  };

  const deleteRepayment = (loanId: string, repaymentId: string) => {
    setLoans(loans.map((l: any) => l.id === loanId ? { ...l, repayments: l.repayments.filter((r: any) => r.id !== repaymentId) } : l));
  };

  const activeStats = activeLoan ? getLoanStats(activeLoan) : null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-4 pb-20 px-2">
      <EditableHeader title={tabName} setTitle={setTabName} />

      {/* 1. 상단 대출 현황 (게이지 그래프 버전) */}
      {activeLoan && activeStats && (
        <div className="bg-brand-card p-5 border border-brand-border rounded-2xl shadow-brand space-y-4">
          <div className="text-center">
            <p className="text-[10px] font-black text-brand-text-sub uppercase mb-1">남은 원금</p>
            <p className="text-2xl font-black text-brand-pink tabular-nums">{formatCurrency(activeStats.remaining)}</p>
          </div>
          
          {/* 게이지 바 */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[9px] font-black text-brand-text-sub uppercase px-1">
              <span>상환 진행률</span>
              <span className="text-brand-mint">{activeStats.progress.toFixed(1)}%</span>
            </div>
            <div className="h-2.5 w-full bg-brand-bg rounded-full overflow-hidden border border-brand-border/30">
              <motion.div 
                initial={{ width: 0 }} 
                animate={{ width: `${activeStats.progress}%` }} 
                className="h-full bg-brand-mint shadow-[0_0_10px_rgba(164,255,230,0.3)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-brand-border/30">
            <div className="text-center">
              <p className="text-[9px] font-black text-brand-text-sub uppercase mb-0.5">누적 상환원금</p>
              <p className="text-xs font-black text-brand-mint">{formatNumber(activeStats.cumulativePrincipal)}</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] font-black text-brand-text-sub uppercase mb-0.5">누적 상환이자</p>
              <p className="text-xs font-black text-brand-yellow">{formatNumber(activeStats.cumulativeInterest)}</p>
            </div>
          </div>
        </div>
      )}

      {/* 2. 대출 목록 롤링 + 추가 */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide snap-x">
        {loans.map((loan: any) => (
          <button key={loan.id} onClick={() => setActiveLoanId(loan.id)} className={`shrink-0 snap-start px-5 py-3 rounded-xl border font-black text-xs transition-all ${activeLoanId === loan.id ? 'bg-brand-primary border-brand-primary text-white shadow-lg' : 'bg-brand-card border-brand-border text-brand-text-sub'}`}>
            {loan.name}
          </button>
        ))}
        <button onClick={addNewLoan} className="shrink-0 p-3 rounded-xl border border-dashed border-brand-primary text-brand-primary bg-brand-primary/5"><Plus size={16} /></button>
      </div>

      {/* 3. 입력 & 상세 박스 */}
      {activeLoan ? (
        <div className="space-y-4">
          <div className="bg-brand-card border border-brand-border rounded-3xl overflow-hidden shadow-brand">
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><label className="text-[10px] font-black text-brand-text-sub uppercase ml-1">이름수정</label><input type="text" value={activeLoan.name} onChange={(e) => updateLoanField(activeLoan.id, 'name', e.target.value)} className="form-input text-xs font-black h-[40px] bg-brand-bg" /></div>
                <NumericInput label="최초대출금" value={activeLoan.originalTotalAmount} onChange={(val: number) => updateLoanField(activeLoan.id, 'originalTotalAmount', val)} className="form-input text-xs font-black h-[40px] bg-brand-bg" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <NumericInput label="원금상환" value={newRepayment.principal} onChange={(v: number) => setNewRepayment({...newRepayment, principal: v})} className="form-input text-xs font-black text-brand-mint h-[40px] bg-brand-bg" />
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-brand-text-sub uppercase ml-1">상환날짜</label>
                  <input type="date" value={newRepayment.date} onChange={e => setNewRepayment({...newRepayment, date: e.target.value})} className="form-input text-[11px] font-bold h-[40px] bg-brand-bg px-2" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <NumericInput label="이자상환" value={newRepayment.interest} onChange={(v: number) => setNewRepayment({...newRepayment, interest: v})} className="form-input text-xs font-black text-brand-yellow h-[40px] bg-brand-bg" />
                <div className="space-y-1.5"><label className="text-[10px] font-black text-brand-text-sub uppercase ml-1">메모</label><input type="text" value={newRepayment.memo} placeholder="메모" onChange={e => setNewRepayment({...newRepayment, memo: e.target.value})} className="form-input text-xs h-[40px] bg-brand-bg" /></div>
              </div>

              <button onClick={addRepayment} className="w-full bg-brand-primary text-white font-black py-3.5 rounded-2xl active:scale-95 transition-all text-xs">상환내역 추가</button>
            </div>

            {/* 내역 표 */}
            <div className="border-t border-brand-border bg-white/5">
              <div className="grid grid-cols-12 gap-1 px-4 py-2 border-b border-brand-border bg-brand-bg/50 text-[9px] font-black text-brand-text-sub uppercase text-center">
                <div className="col-span-2">회차</div><div className="col-span-4 text-right">원금</div><div className="col-span-3 text-right">이자</div><div className="col-span-3">삭제</div>
              </div>
              <div className="max-h-[200px] overflow-y-auto custom-scrollbar divide-y divide-brand-border/30 text-center">
                {activeLoan.repayments.map((r: any) => (
                  <div key={r.id} className="grid grid-cols-12 gap-1 px-4 py-2.5 items-center text-[11px] font-bold tabular-nums">
                    <div className="col-span-2 text-brand-primary font-black">{r.turn || '-'}</div>
                    <div className="col-span-4 text-right">{formatNumber(r.principal)}</div>
                    <div className="col-span-3 text-right text-brand-pink">{formatNumber(r.interest)}</div>
                    <div className="col-span-3 text-right"><button onClick={() => deleteRepayment(activeLoan.id, r.id)} className="p-1 text-brand-text-sub"><X size={14} className="ml-auto" /></button></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <button onClick={() => deleteLoan(activeLoan.id)} className="w-full py-2 text-[10px] font-bold text-brand-pink/50 flex items-center justify-center gap-1"><Trash2 size={12} /> 대출 전체 항목 삭제</button>
        </div>
      ) : (
        <div className="p-20 text-center opacity-30 font-black text-xs">대출을 추가하거나 선택하세요</div>
      )}
    </motion.div>
  );
}





function QuickEntryBox({ account, onAdd, categories, setCategories }: any) {
  const [newTx, setNewTx] = useState({
    date: new Date().toISOString().split('T')[0],
    type: '지출' as TransactionType,
    category: categories.expense[0], // 기본값을 지출 항목으로 고정
    amount: 0,
    memo: ''
  });

  // 유형(수입/지출)이 바뀔 때 카테고리도 알맞게 변경
  const handleTypeChange = (newType: TransactionType) => {
    setNewTx({
      ...newTx,
      type: newType,
      category: newType === '지출' ? categories.expense[0] : categories.income[0]
    });
  };

  const handleAdd = () => {
    if (newTx.amount <= 0) return;
    onAdd({
      id: Math.random().toString(36).substr(2, 9),
      ...newTx,
      account
    });
    // 입력 완료 후 다시 기본값(지출)으로 리셋
    setNewTx({ 
      ...newTx, 
      type: '지출', 
      category: categories.expense[0], 
      amount: 0, 
      memo: '' 
    });
  };

  const currentCategories = newTx.type === '지출' ? categories.expense : categories.income;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
         <h4 className="text-sm font-black text-brand-primary flex items-center gap-2 uppercase tracking-widest">
            <Plus size={14} /> {account}
         </h4>
        <div className="flex items-center bg-brand-card border border-brand-border rounded-xl px-2 py-1">
           <input
             type="date"
             value={newTx.date}
             onChange={e => setNewTx({...newTx, date: e.target.value})}
             className="bg-transparent border-none text-[16px] md:text-xs font-black outline-none focus:ring-0 text-brand-text-main h-[28px]"
           />
        </div>
      </div>
      
      {/* 1. 유형 선택 (감자탭과 동일한 토글 버튼) */}
      <div className="space-y-1.5">
         <label className="text-[11px] font-black text-brand-text-sub uppercase ml-1">유형</label>
         <div className="flex bg-brand-bg rounded-lg p-0.5 border border-brand-border">
            <button
              onClick={() => handleTypeChange('지출')}
              className={`flex-1 py-1.5 rounded-md text-[14px] font-black transition-colors ${newTx.type === '지출' ? 'bg-brand-pink text-white' : 'text-brand-text-sub'}`}
            >
              지출
            </button>
            <button
              onClick={() => handleTypeChange('수입')}
              className={`flex-1 py-1.5 rounded-md text-[14px] font-black transition-colors ${newTx.type === '수입' ? 'bg-brand-mint text-white' : 'text-brand-text-sub'}`}
            >
              수입
            </button>
         </div>
      </div>

      {/* 2. 항목 선택 (팝업 없이 좌우로 스크롤하여 바로 터치하는 칩 스타일) */}
      <div className="space-y-1.5 pt-1">
         <label className="text-[11px] font-black text-brand-text-sub uppercase ml-1">항목 (좌우로 밀어서 선택)</label>
         <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide snap-x">
            {currentCategories.map((c: string) => (
              <button
                key={c}
                onClick={() => setNewTx({...newTx, category: c})}
                className={`shrink-0 snap-start px-4 py-2 rounded-xl text-[13px] font-black transition-all ${
                  newTx.category === c 
                    ? (newTx.type === '지출' ? 'bg-brand-pink/20 text-brand-pink border border-brand-pink/50' : 'bg-brand-mint/20 text-brand-mint border border-brand-mint/50')
                    : 'bg-brand-bg text-brand-text-sub border border-brand-border'
                }`}
              >
                {c}
              </button>
            ))}
         </div>
      </div>

      {/* 3. 금액(강조) 및 메모 영역 */}
      <div className="space-y-3 mt-1">
         {/* 금액 창 붉은 톤 하이라이트 */}
         <div className="space-y-1.5 p-3 bg-brand-pink/5 border border-brand-pink/30 rounded-xl">
           <NumericInput 
             label="금액 입력"
             value={newTx.amount} 
             placeholder="0" 
             onChange={(val: number) => setNewTx({...newTx, amount: val})} 
             className="form-input text-[16px] md:text-lg font-black py-2 h-[42px] bg-transparent text-brand-pink" 
           />
         </div>

         {/* 메모 창 위치 아래로 이동 */}
         <div className="space-y-1.5">
            <label className="text-[11px] font-black text-brand-text-sub uppercase ml-1">메모</label>
            <input 
              type="text" 
              value={newTx.memo} 
              placeholder="메모를 입력하세요" 
              onChange={e => setNewTx({...newTx, memo: e.target.value})} 
              className="form-input text-[16px] md:text-[11px] py-2 h-[42px]" 
            />
         </div>
      </div>

      {/* 단일 입력 버튼 */}
      <div className="mt-5">
         <button 
           onClick={handleAdd} 
           className="w-full bg-brand-primary text-white text-[15px] font-black py-3.5 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all uppercase tracking-widest shadow-lg shadow-brand-primary/20"
         >
            내역 추가하기
         </button>
      </div>
    </div>
  );
}

/*월급 비교*/



function SalaryView({ salaries, setSalaries, tabName, setTabName, salaryLabels, setSalaryLabels, currentDate, transactions, setTransactions, gamjaTransactions, setGamjaTransactions, balances, setBalances }: any) {
  const [newEntry, setNewEntry] = useState({
    target: '나' as '나' | '감자',
    date: new Date().toISOString().split('T')[0],
    type: SALARY_TYPES[0] as SalaryType,
    amount: 0,
    memo: ''
  });

  const [isMemoActive, setIsMemoActive] = useState(false);
  const [isLabelSettingsOpen, setIsLabelSettingsOpen] = useState(false);
  const selectedYear = currentDate.getFullYear();

  // 연봉 상세 합계 및 비율 계산
  const totalMyAnnual = useMemo(() => salaries.mySalaryRecords.filter((r: any) => new Date(r.date).getFullYear() === selectedYear).reduce((s: number, r: any) => s + r.amount, 0), [salaries, selectedYear]);
  const totalGamjaAnnual = useMemo(() => salaries.gamjaSalaryRecords.filter((r: any) => new Date(r.date).getFullYear() === selectedYear).reduce((s: number, r: any) => s + r.amount, 0), [salaries, selectedYear]);
  const totalAnnual = totalMyAnnual + totalGamjaAnnual;
  const myRatio = totalAnnual > 0 ? (totalMyAnnual / totalAnnual) * 100 : 0;
  const gamjaRatio = totalAnnual > 0 ? (totalGamjaAnnual / totalAnnual) * 100 : 0;

  // 1월부터 12월까지 데이터 생성
  const monthlySalaryData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const monthNum = i + 1;
      const entry: any = { name: `${monthNum}`, details: [] };
      let meMonthTotal = 0;
      salaries.mySalaryRecords.filter((r: any) => {
        const d = new Date(r.date);
        return d.getMonth() === i && d.getFullYear() === selectedYear;
      }).forEach((r: any) => {
        meMonthTotal += r.amount;
        entry.details.push({ user: '나', type: salaryLabels[r.type] || r.type, amount: r.amount, memo: r.memo });
      });
      let gamjaMonthTotal = 0;
      salaries.gamjaSalaryRecords.filter((r: any) => {
        const d = new Date(r.date);
        return d.getMonth() === i && d.getFullYear() === selectedYear;
      }).forEach((r: any) => {
        gamjaMonthTotal += r.amount;
        entry.details.push({ user: '감자', type: '월급', amount: r.amount, memo: r.memo });
      });
      entry['나'] = meMonthTotal;
      entry['감자'] = gamjaMonthTotal;
      entry['합계'] = meMonthTotal + gamjaMonthTotal;
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
    setNewEntry({ ...newEntry, amount: 0, memo: '' });
    setIsMemoActive(false);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      if (data.details.length === 0) return null;
      return (
        <div className="bg-brand-card border border-brand-border p-4 rounded-xl shadow-xl min-w-[180px]">
          <p className="text-[11px] font-black text-brand-text-sub mb-2 border-b border-brand-border pb-1">{data.name}월 상세</p>
          <div className="space-y-2">
            {data.details.map((d: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center gap-4">
                <span className={`text-[10px] font-bold ${d.user === '나' ? 'text-brand-primary' : 'text-brand-purple'}`}>[{d.user}] {d.type}</span>
                <span className="text-[11px] font-black tabular-nums">{formatNumber(d.amount)}원</span>
              </div>
            ))}
            <div className="pt-2 border-t border-brand-border flex justify-between items-center text-brand-mint font-black">
              <span className="text-[10px]">월 합계</span>
              <span className="text-[11px]">{formatNumber(data['합계'])}원</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-4 pb-20 px-2">
      <EditableHeader title={tabName} setTitle={setTabName} />
      
      {/* 1. 상단 연봉 요약 & 게이지 바 */}
      <div className="bg-brand-card p-5 rounded-2xl border border-brand-border shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-black text-brand-text-sub uppercase tracking-widest">{selectedYear} 가구 총수입</span>
          <span className="text-xl font-black tabular-nums">{formatCurrency(totalAnnual)}</span>
        </div>
        <div className="space-y-2">
          <div className="h-2.5 w-full bg-brand-bg rounded-full overflow-hidden flex border border-brand-border/30">
            <motion.div initial={{ width: 0 }} animate={{ width: `${myRatio}%` }} className="h-full bg-brand-primary" />
            <motion.div initial={{ width: 0 }} animate={{ width: `${gamjaRatio}%` }} className="h-full bg-brand-purple" />
          </div>
          <div className="flex justify-between text-[10px] font-black">
            <div className="flex flex-col">
              <span className="text-brand-primary">나 {myRatio.toFixed(1)}%</span>
              <span className="text-sm font-black tabular-nums">{formatCurrency(totalMyAnnual)}</span>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-brand-purple">감자 {gamjaRatio.toFixed(1)}%</span>
              <span className="text-sm font-black tabular-nums">{formatCurrency(totalGamjaAnnual)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 급여 입력 (아이폰 터치 최적화) */}
      <div className="bg-brand-card p-5 rounded-3xl border border-brand-border space-y-5 shadow-brand">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black text-brand-primary uppercase tracking-widest flex items-center gap-2"><Plus size={14} /> 급여 입력</h4>
          <input type="date" value={newEntry.date} onChange={e => setNewEntry({...newEntry, date: e.target.value})} className="bg-brand-bg border border-brand-border rounded-xl px-2 py-1 text-[14px] font-bold outline-none text-brand-text-main" />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-black text-brand-text-sub uppercase ml-1">대상 선택</label>
          <div className="flex bg-brand-bg rounded-lg p-0.5 border border-brand-border">
            <button onClick={() => setNewEntry({...newEntry, target: '나'})} className={`flex-1 py-1.5 rounded-md text-[14px] font-black transition-colors ${newEntry.target === '나' ? 'bg-brand-primary text-white' : 'text-brand-text-sub'}`}>내 월급</button>
            <button onClick={() => setNewEntry({...newEntry, target: '감자'})} className={`flex-1 py-1.5 rounded-md text-[14px] font-black transition-colors ${newEntry.target === '감자' ? 'bg-brand-purple text-white' : 'text-brand-text-sub'}`}>감자 월급</button>
          </div>
        </div>
        <div className="space-y-1.5 pt-1">
          <label className="text-[11px] font-black text-brand-text-sub uppercase ml-1">항목 선택 (롤링)</label>
          <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-hide snap-x">
            {SALARY_TYPES.map(type => (
              <button key={type} onClick={() => setNewEntry({...newEntry, type: type as SalaryType})} className={`shrink-0 snap-start px-4 py-2 rounded-xl text-[13px] font-black transition-all ${newEntry.type === type ? 'bg-brand-mint/20 text-brand-mint border border-brand-mint/50' : 'bg-brand-bg text-brand-text-sub border border-brand-border'}`}>{salaryLabels[type] || type}</button>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <div className="p-3 bg-brand-primary/5 border border-brand-primary/30 rounded-xl">
            <NumericInput label="금액 입력" value={newEntry.amount} onChange={(v: number) => setNewEntry({...newEntry, amount: v})} className="form-input text-[18px] md:text-lg font-black py-1 h-[42px] bg-transparent text-brand-primary" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-brand-text-sub uppercase ml-1">메모</label>
            {!isMemoActive ? (
              <button onClick={() => setIsMemoActive(true)} className="w-full text-left px-4 py-3 bg-brand-bg/50 border border-brand-border rounded-xl text-brand-text-sub text-[14px] font-medium italic">클릭하여 메모 입력...</button>
            ) : (
              <input autoFocus type="text" value={newEntry.memo} placeholder="메모 입력" onChange={e => setNewEntry({...newEntry, memo: e.target.value})} onBlur={() => newEntry.memo === '' && setIsMemoActive(false)} className="form-input text-[16px] h-[44px] bg-brand-bg/50 border-brand-border rounded-xl px-4 outline-none focus:border-brand-primary" />
            )}
          </div>
        </div>
        <button onClick={handleAddSalary} className="w-full bg-brand-primary text-white font-black py-4 rounded-xl text-[15px] active:scale-95 transition-all">등록 및 지출 탭 연동</button>
      </div>



{/* 3. 월급 비교 그래프 (1월 표시 및 간격 최적화) */}
      <div className="bg-brand-card p-4 rounded-brand border border-brand-border shadow-brand overflow-hidden">
        <h4 className="text-[11px] font-black uppercase mb-4 flex items-center gap-2 text-brand-text-sub px-1">
          <BarChart2 size={14} className="text-brand-primary" /> 
          월별 급여 비교
        </h4>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={monthlySalaryData} 
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }} // left를 0으로 조정하여 1월이 잘리지 않게 함
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#25282b" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 'bold' }} 
                interval={0} // 모든 달(1~12월)이 다 보이도록 강제
              />
              <YAxis hide />
              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} content={<CustomTooltip />} />
              <Bar 
                dataKey="나" 
                fill="#94d5ff" 
                radius={[2, 2, 0, 0]} 
                barSize={8} // 아이폰 화면 폭을 고려해 바 굵기 살짝 축소
              />
              <Bar 
                dataKey="감자" 
                fill="#b7a8e5" 
                radius={[2, 2, 0, 0]} 
                barSize={8} 
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      

      {/* 4. 항목 명칭 설정 */}
      <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
        <button onClick={() => setIsLabelSettingsOpen(!isLabelSettingsOpen)} className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-all">
          <span className="text-[11px] font-black text-brand-text-sub uppercase tracking-widest flex items-center gap-2"><Edit2 size={14} /> 항목 명칭 설정</span>
          <ChevronRight size={18} className={`text-brand-text-sub transition-transform ${isLabelSettingsOpen ? 'rotate-90' : ''}`} />
        </button>
        <AnimatePresence>
          {isLabelSettingsOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="px-5 pb-5 pt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-brand-bg/30 border-t border-brand-border">
                {SALARY_TYPES.map(type => (
                  <div key={type} className="space-y-1">
                    <span className="text-[9px] font-bold text-brand-text-sub px-1">{type}</span>
                    <input type="text" value={salaryLabels[type]} onChange={e => setSalaryLabels({...salaryLabels, [type]: e.target.value})} className="w-full bg-brand-card border border-brand-border rounded-lg text-[12px] p-2 font-bold outline-none" />
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
function AnnualSettlementView({ transactions, gamjaTransactions, salaries, tabName, setTabName }: any) {
  // 현재 가계부 앱에서 선택된 연도 기준 (currentDate 활용 권장하나 여기선 시스템 연도 기준)
  const selectedYear = new Date().getFullYear();

  const processData = (txs: any[], salaryRecords: any[]) => {
    const annualSalary = salaryRecords
      .filter((r: any) => new Date(r.date).getFullYear() === selectedYear)
      .reduce((s: number, r: any) => s + r.amount, 0);

    const expenseTxs = txs.filter((t: any) => t.type === '지출' && new Date(t.date).getFullYear() === selectedYear);
    const totalExpense = expenseTxs.reduce((sum, t) => sum + t.amount, 0);

    const categoryTotals: Record<string, number> = {};
    expenseTxs.forEach((t: any) => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

    const chartData = Object.entries(categoryTotals)
      .map(([name, value]) => ({
        name,
        value: value as number,
        percent: totalExpense > 0 ? ((value as number / totalExpense) * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => b.value - a.value);

    return { annualSalary, totalExpense, remaining: annualSalary - totalExpense, chartData };
  };

  const myData = processData(transactions, salaries.mySalaryRecords);
  const gamjaData = processData(gamjaTransactions, salaries.gamjaSalaryRecords);

  const totalAnnualSalary = myData.annualSalary + gamjaData.annualSalary;
  const totalAnnualExpense = myData.totalExpense + gamjaData.totalExpense;
  const totalRemaining = myData.remaining + gamjaData.remaining;

  // 1.2배 커진 폰트 스타일 (아이폰 가독성 최적화)
  const biggerFontSize = "text-[1.2rem]"; // 기존보다 약 1.2배 확대
  const COLORS = ['#94D5FF', '#AEE7E6', '#C9C7F5', '#A0E1F0', '#B7A8E5', '#B2D8D8', '#D1C4E9', '#BBDEFB', '#B2EBF2', '#E1BEE7'];

  // 연도별 통합 엑셀 다운로드 함수 (CSV 형식의 한계로 인해 탭별 구분을 위해 파일 내용 구성)
  const downloadYearlyReport = () => {
    const header = ["날짜", "구분", "카테고리", "금액", "메모"];
    
    // 1. 내 지출 내역
    const myYearly = transactions
      .filter(t => new Date(t.date).getFullYear() === selectedYear)
      .map(t => [t.date, t.type, t.category, t.amount, t.memo].join(","));
    
    // 2. 감자 지출 내역
    const gamjaYearly = gamjaTransactions
      .filter(t => new Date(t.date).getFullYear() === selectedYear)
      .map(t => [t.date, t.type, t.category, t.amount, t.memo].join(","));

    // 탭 구분을 위해 텍스트로 섹션 분리
    const csvContent = [
      `--- ${selectedYear}년 내 지출 내역 ---`,
      header.join(","),
      ...myYearly,
      "\n",
      `--- ${selectedYear}년 감자 지출 내역 ---`,
      header.join(","),
      ...gamjaYearly
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedYear}년_결산_데이터.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-6 pb-24 px-1">
      <EditableHeader title={tabName} setTitle={setTabName} />

      {/* 1. 가계 전체 요약 (글자 크기 1.2배 확대 적용) */}
      <div className="bg-brand-card p-5 border border-brand-border rounded-2xl shadow-brand">
        <p className="text-[12px] font-black text-brand-primary uppercase mb-3 tracking-widest text-center">{selectedYear}년 가계 총결산</p>
        <div className="grid grid-cols-3 divide-x divide-brand-border text-center">
          <div><p className="text-[10px] font-bold text-brand-text-sub mb-1">총 연봉</p><p className={`${biggerFontSize} font-black tabular-nums`}>{formatNumber(totalAnnualSalary)}</p></div>
          <div><p className="text-[10px] font-bold text-brand-text-sub mb-1">총 지출</p><p className={`${biggerFontSize} font-black text-brand-pink tabular-nums`}>{formatNumber(totalAnnualExpense)}</p></div>
          <div><p className="text-[10px] font-bold text-brand-text-sub mb-1">남은자산</p><p className={`${biggerFontSize} font-black text-brand-mint tabular-nums`}>{formatNumber(totalRemaining)}</p></div>
        </div>
      </div>

      {/* 2. 개별 결산 섹션 (나 / 감자) */}
      {[ { label: '나', data: myData, color: 'brand-primary' }, { label: '감자', data: gamjaData, color: 'brand-purple' } ].map((user) => (
        <div key={user.label} className="space-y-4">
          <div className="bg-brand-card p-5 border border-brand-border rounded-2xl">
            <div className="flex justify-between items-center mb-4">
              <span className={`px-3 py-1 rounded-md bg-${user.color}/10 text-${user.color} text-[11px] font-black`}>{user.label} 결산</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-brand-bg/50 p-3 rounded-xl text-center">
                <p className="text-[10px] font-bold text-brand-text-sub mb-1">연봉</p>
                <p className="text-[13px] font-black tabular-nums">{formatNumber(user.data.annualSalary)}</p>
              </div>
              <div className="bg-brand-bg/50 p-3 rounded-xl text-center">
                <p className="text-[10px] font-bold text-brand-text-sub mb-1">지출</p>
                <p className="text-[13px] font-black text-brand-pink tabular-nums">{formatNumber(user.data.totalExpense)}</p>
              </div>
              <div className="bg-brand-bg/50 p-3 rounded-xl text-center">
                <p className="text-[10px] font-bold text-brand-text-sub mb-1">자산</p>
                <p className="text-[13px] font-black text-brand-mint tabular-nums">{formatNumber(user.data.remaining)}</p>
              </div>
            </div>
          </div>

          {/* 지출 현황 그래프 */}
          <div className="bg-brand-card p-5 border border-brand-border rounded-2xl">
            <h4 className="text-[12px] font-black mb-5 flex justify-between items-center px-1">
              <span>많이 쓴 항목 (순위)</span>
              <span className="text-brand-text-sub text-[10px]">{user.label}</span>
            </h4>
            
            <div className="space-y-5">
              {user.data.chartData.map((item, idx) => (
                <div key={item.name} className="space-y-1.5">
                  <div className="flex justify-between items-end">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-black">{item.name}</span>
                      <span className="text-[10px] font-bold text-brand-text-sub">{item.percent}%</span>
                    </div>
                    <span className="text-[12px] font-black tabular-nums">{formatNumber(item.value)}원</span>
                  </div>
                  <div className="h-2 w-full bg-brand-bg rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }} 
                      animate={{ width: `${item.percent}%` }} 
                      className="h-full rounded-full" 
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
      
      {/* 3. 스마트 연도별 데이터 다운로드 버튼 */}
      <div className="flex justify-center pt-6">
        <button 
          onClick={downloadYearlyReport} 
          className="flex items-center gap-2 px-8 py-4 bg-brand-bg border border-brand-border rounded-xl text-[13px] font-black text-brand-primary shadow-lg active:scale-95 transition-all"
        >
          <BarChart2 size={16} />
          {selectedYear}년 전체 내역 (탭별) 다운로드
        </button>
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
    // -mx-6 를 추가하여 부모의 패딩을 무시하고 모바일 화면 좌우 꽉 차게 늘려줍니다.
    <div className="-mx-6 md:mx-0 grid grid-cols-7 gap-px bg-brand-border border-y md:border border-brand-border md:rounded-brand overflow-hidden shadow-brand">
      {['일', '월', '화', '수', '목', '금', '토'].map(d => (
        <div key={d} className="text-[10px] text-center font-black text-brand-text-sub py-2.5 bg-brand-card border-b border-brand-border uppercase tracking-widest">{d}</div>
      ))}
      {days.map((day, idx) => {
        if (!day) return <div key={`empty-${idx}`} className="bg-brand-bg/20" />;
        
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayTransactions = transactions.filter((t: any) => t.date === dateStr);
        const hasExpense = dayTransactions.some((t: any) => t.type === '지출');
        const hasIncome = dayTransactions.some((t: any) => t.type === '수입');
        const isToday = new Date().toISOString().split('T')[0] === dateStr;
        const isSelected = selectedDateStr === dateStr;

        return (
          <button 
            key={idx} 
            onClick={() => onDateClick(dateStr)}
            className={`min-h-[55px] md:min-h-[70px] p-1 border transition-all flex flex-col items-center justify-between relative overflow-hidden ${
              isSelected ? 'bg-brand-primary/10 border-brand-primary z-10' :
              isToday ? 'bg-white/5 border-white/20' : 
              'bg-brand-card border-transparent hover:bg-white/5'
            }`}
          >
            <span className={`text-[12px] font-black mt-1 ${isSelected ? 'text-brand-primary' : isToday ? 'text-white' : 'text-brand-text-sub/80'}`}>{day}</span>
            <div className="flex gap-1.5 mb-1.5">
               {/* 숫자 대신 직관적인 기호만 표시하여 깔끔하게 변경 */}
               {hasIncome && <span className="text-[14px] font-black text-brand-mint leading-none">+</span>}
               {hasExpense && <span className="text-[14px] font-black text-brand-pink leading-none">-</span>}
            </div>
          </button>
        );
      })}
    </div>
  );
}
