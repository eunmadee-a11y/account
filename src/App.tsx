/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect, ReactNode, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, CreditCard, TrendingUp, User, ArrowLeftRight as ComparisonIcon,
  ChevronLeft, ChevronRight, Plus, Minus,
  Trash2, X, CreditCard as LoanIcon, Edit2, Search, BarChart2
} from 'lucide-react';
import { 
  Transaction, TransactionType, TabName, BalanceEntry, SalaryData,
  SalaryType, SalaryRecord, Loan, GamjaTransaction, LoanRepayment
} from './types';
import { 
  EXPENSE_CATEGORIES, INCOME_CATEGORIES, MY_ACCOUNTS, GAMJA_ACCOUNTS,
  SALARY_TYPES, LOAN_NAMES, MOCK_TRANSACTIONS, INITIAL_BALANCES,
  MOCK_GAMJA_TRANSACTIONS, INITIAL_LOANS
} from './constants';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

// '원' 단위 제거 및 숫자만 포맷팅
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ko-KR').format(Math.floor(amount));
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
    t.date, t.type, t.category, t.account, t.amount, t.memo || ""
  ]);
  const csvContent = [header, ...rows].map((e) => e.join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
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
  const [activeTab, setActiveTab] = useState<TabName>('홈');
  const [tabNames, setTabNames] = useState<Record<TabName, string>>({
    '홈': '홈', '내 지출': '내 지출', '연금/투자 관리': '연금/투자 관리',
    '감자 지출': '감자 지출', '월급 비교': '월급 비교', '대출 관리': '대출 관리', '1년 결산': '1년 결산'
  });
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(new Date().toISOString().split('T')[0]);
  const [mySearchQuery, setMySearchQuery] = useState('');
  const [gamjaSearchQuery, setGamjaSearchQuery] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>(MOCK_TRANSACTIONS);
  const [gamjaTransactions, setGamjaTransactions] = useState<GamjaTransaction[]>(MOCK_GAMJA_TRANSACTIONS);
  const [balances, setBalances] = useState<BalanceEntry[]>(INITIAL_BALANCES);
  const [salaries, setSalaries] = useState<SalaryData>({ 
    mySalaryRecords: [], gamjaSalaryRecords: [], mySalary: 3500000, gamjaSalary: 4200000 
  });
  const [loans, setLoans] = useState<Loan[]>(INITIAL_LOANS);
  const [myCategories, setMyCategories] = useState({ income: [...INCOME_CATEGORIES], expense: [...EXPENSE_CATEGORIES] });
  const [gamjaCategories, setGamjaCategories] = useState({ income: [...INCOME_CATEGORIES], expense: [...EXPENSE_CATEGORIES] });
  const [isMyEditModalOpen, setIsMyEditModalOpen] = useState(false);
  const [isGamjaEditModalOpen, setIsGamjaEditModalOpen] = useState(false);
  const [salaryLabels, setSalaryLabels] = useState<Record<string, string>>({
    '메모': '기본급', 'A': '시간외수당', 'B': '보너스', 'C': '성과금', 'D': '식대', 'E': '교통비', 'F': '기타'
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
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };
  const deleteTransaction = (id: string) => {
    if (confirm('정말로 이 내역을 삭제하시겠습니까?')) setTransactions(prev => prev.filter(t => t.id !== id));
  };
  const deleteGamjaTransaction = (id: string) => {
    if (confirm('정말로 이 내역을 삭제하시겠습니까?')) setGamjaTransactions(prev => prev.filter(t => t.id !== id));
  };

  const TabButton = ({ name, icon: Icon }: { name: TabName, icon: any }) => (
    <button 
      onClick={() => setActiveTab(name)}
      className={`shrink-0 flex items-center gap-2 px-5 py-3 rounded-full font-black text-[13px] whitespace-nowrap transition-all duration-300 relative overflow-hidden ${
        activeTab === name 
          ? 'text-white bg-[#4B96FF] shadow-[0_4px_20px_rgba(75,150,255,0.4)]' 
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
            <span className="text-xs font-black tracking-widest text-[#4B96FF] uppercase">Ledger</span>
          </div>

          <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-none border border-white/10">
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

      <main className="flex-1 max-w-[1400px] w-full mx-auto p-4 pt-4 md:p-8">
        <AnimatePresence mode="wait">
          {activeTab === '홈' && <HomeView key="home" {...{ totalAssets, monthlySummary: filteredData, currentDate, transactions, balances, setTransactions, selectedDateStr, setSelectedDateStr, deleteTransaction, loanSummary, myAccountNames, categories: myCategories, setCategories: setMyCategories, tabName: tabNames['홈'], setTabName: (n:string)=>setTabNames({...tabNames, '홈':n}) }} />}
          {activeTab === '내 지출' && <ExpenseView key="expense" {...{ transactions, setTransactions, filteredData, currentDate, deleteTransaction, myAccountNames, balances, setBalances, searchQuery: mySearchQuery, setSearchQuery: setMySearchQuery, categories: myCategories, setCategories: setMyCategories, onOpenEdit: () => setIsMyEditModalOpen(true), tabName: tabNames['내 지출'], setTabName: (n:string)=>setTabNames({...tabNames, '내 지출':n}) }} />}
          {activeTab === '연금/투자 관리' && <PensionView key="pension" {...{ balances, setBalances, currentDate, tabName: tabNames['연금/투자 관리'], setTabName: (n:string)=>setTabNames({...tabNames, '연금/투자 관리':n}) }} />}
          {activeTab === '감자 지출' && <GamjaView key="gamja" {...{ gamjaTransactions, setGamjaTransactions, deleteGamjaTransaction, gamjaAccountNames, searchQuery: gamjaSearchQuery, setSearchQuery: setGamjaSearchQuery, balances, setBalances, currentDate, categories: gamjaCategories, setCategories: setGamjaCategories, onOpenEdit: () => setIsGamjaEditModalOpen(true), tabName: tabNames['감자 지출'], setTabName: (n:string)=>setTabNames({...tabNames, '감자 지출':n}) }} />}
          {activeTab === '월급 비교' && <SalaryView key="salary" {...{ salaries, setSalaries, salaryLabels, setSalaryLabels, currentDate, transactions, setTransactions, gamjaTransactions, setGamjaTransactions, balances, setBalances, tabName: tabNames['월급 비교'], setTabName: (n:string)=>setTabNames({...tabNames, '월급 비교':n}) }} />}
          {activeTab === '대출 관리' && <LoanManagementView key="loans" {...{ loans, setLoans, loanSummary, tabName: tabNames['대출 관리'], setTabName: (n:string)=>setTabNames({...tabNames, '대출 관리':n}) }} />}
          {activeTab === '1년 결산' && <AnnualSettlementView key="annual" {...{ transactions, gamjaTransactions, salaries, tabName: tabNames['1년 결산'], setTabName: (n:string)=>setTabNames({...tabNames, '1년 결산':n}) }} />}
        </AnimatePresence>
      </main>

      <TransactionEditModal isOpen={isMyEditModalOpen} onClose={() => setIsMyEditModalOpen(false)} transactions={transactions} setTransactions={setTransactions} categories={myCategories} setCategories={setMyCategories} title="내 지출 내역 관리" />
      <TransactionEditModal isOpen={isGamjaEditModalOpen} onClose={() => setIsGamjaEditModalOpen(false)} transactions={gamjaTransactions} setTransactions={setGamjaTransactions} categories={gamjaCategories} setCategories={setGamjaCategories} title="감자 지출 내역 관리" />
    </div>
  );
}

// --- TAB VIEWS ---

/* 홈 탭 */
function HomeView({ totalAssets, monthlySummary, transactions, setTransactions, selectedDateStr, setSelectedDateStr, deleteTransaction, loanSummary, balances, currentDate, myAccountNames, tabName, setTabName, categories, setCategories }: any) {
  const mainAccounts = balances.filter((b: any) => b.category === '내 통장');
  const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  const [savingsList, setSavingsList] = useState<{id: string, name: string}[]>(() => {
    try { const saved = localStorage.getItem('mySavingsList'); return saved ? JSON.parse(saved) : [{ id: 'savings-1', name: '적금 1' }]; } catch { return [{ id: 'savings-1', name: '적금 1' }]; }
  });
  const [savingsValues, setSavingsValues] = useState<Record<string, Record<string, number>>>(() => {
    try { const saved = localStorage.getItem('mySavingsValues'); return saved ? JSON.parse(saved) : {}; } catch { return {}; }
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

  const [activeQuickAccount, setActiveQuickAccount] = useState<string | null>(() => {
    const defaultAcc = mainAccounts.find((a: any) => a.name.includes('생활비'));
    return defaultAcc ? defaultAcc.name : null;
  });
  const quickAccountKeywords = ['생활비', '여유자금', '자동이체'];
  const quickAccounts = quickAccountKeywords.map(keyword => mainAccounts.find((account: any) => account.name.includes(keyword))).filter(Boolean);

  const selectedDateTransactions = useMemo(() => {
    if (!selectedDateStr) return [];
    return transactions.filter((t: any) => t.date === selectedDateStr);
  }, [transactions, selectedDateStr]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <EditableHeader title={tabName} setTitle={setTabName} />

      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          {quickAccounts.map((account: any) => (
            <button
              key={account.id}
              onClick={() => setActiveQuickAccount(activeQuickAccount === account.name ? null : account.name)}
              className={`py-3.5 px-2 rounded-none border font-black text-xs md:text-sm transition-all active:scale-95 ${
                activeQuickAccount === account.name
                  ? 'bg-[#4B96FF] text-[#121212] border-[#4B96FF] shadow-[0_4px_20px_rgba(75,150,255,0.3)]'
                  : 'bg-[#1c1c1e] text-white border-white/5 hover:border-white/20'
              }`}
            >
              {account.name.replace('내 ', '').replace(' 통장', '')}
            </button>
          ))}
        </div>

        {activeQuickAccount && (
          <div className="bg-[#1c1c1e] p-6 border border-white/5 rounded-none shadow-2xl">
            <QuickEntryBox account={activeQuickAccount} onAdd={(tx:any)=>setTransactions([tx, ...transactions])} categories={categories} setCategories={setCategories} />
          </div>
        )}
      </div>

      <div className="bg-[#1c1c1e] rounded-none border border-white/5 shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-white/5 bg-white/5 flex items-center justify-between">
          <h3 className="text-sm font-black text-white">내 통장 잔액</h3>
          <p className="text-sm font-black text-[#4B96FF]">합계: {formatCurrency(totalSum)}</p>
        </div>

        <div className="divide-y divide-white/5">
          {mainAccounts.map((b: any) => (
            <div key={b.id} className="px-6 py-5 flex items-center justify-between gap-3">
              <p className="text-xs md:text-sm font-black text-brand-text-sub shrink-0">
                {b.name.replace('내 ', '').replace(' 통장', '')}
              </p>
              <div className="flex items-center justify-end gap-2 min-w-0">
                <p className="text-lg md:text-xl font-black tabular-nums text-white">
                  {formatCurrency(b.currentBalance)}
                </p>
              </div>
            </div>
          ))}
          {savingsList.map((savings) => (
            <div key={savings.id} className="px-6 py-5 flex items-center justify-between gap-3 bg-black/20">
              <div className="flex items-center gap-2 shrink-0">
                {savingsList.length > 1 && (
                  <button onClick={() => handleRemoveSavings(savings.id)} className="text-[#FF708C] hover:bg-[#FF708C]/10 p-1.5 rounded-none transition-colors">
                    <Minus size={14} />
                  </button>
                )}
                <input
                  type="text" value={savings.name} onChange={(e) => handleSavingsNameChange(savings.id, e.target.value)}
                  className="bg-transparent text-xs md:text-sm font-black text-brand-text-sub outline-none w-24 md:w-32 focus:text-[#4B96FF]"
                  placeholder="적금 이름"
                />
              </div>
              <div className="flex items-center justify-end gap-2 min-w-0 w-32">
                <NumericInput
                  value={currentMonthSavings[savings.id] || 0}
                  onChange={(val: number) => handleSavingsValueChange(savings.id, val)}
                  className="w-full bg-transparent border-b border-[#4B96FF]/30 text-right text-lg md:text-xl font-black tabular-nums outline-none focus:border-[#4B96FF] text-[#4B96FF]"
                  placeholder="0"
                />
              </div>
            </div>
          ))}
          <div className="px-6 py-4 bg-white/5 flex justify-center border-t border-white/5">
             <button onClick={handleAddSavings} className="flex items-center gap-2 text-[12px] font-bold text-brand-text-sub hover:text-[#4B96FF] transition-colors py-1">
               <Plus size={14} /> 적금 추가
             </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <SummarySmallCard label="이번 달 총수입" value={monthlySummary.income} color="text-[#4B96FF]" />
            <SummarySmallCard label="이번 달 총지출" value={monthlySummary.expense} color="text-[#FF708C]" />
            <SummarySmallCard label="이번 달 저축" value={monthlySummary.savings} color="text-[#A7B5FF]" />
            <SummarySmallCard label="대출 원금 상환" value={loanSummary.totalPrincipalPaid} color="text-[#FFA2B6]" />
          </div>

          <div className="bg-[#1c1c1e] rounded-none p-7 border border-white/5 shadow-[0_10px_40px_rgba(0,0,0,0.3)]">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-black text-[15px] text-[#4B96FF]">자산 현황 요약</h3>
            </div>
            <div className="space-y-6">
              <div>
                <p className="text-[11px] font-bold text-brand-text-sub uppercase mb-2 tracking-widest">총 자산 (현금 + 투자)</p>
                <h4 className="text-3xl font-black text-white tracking-tighter">{formatCurrency(customTotalAsset)}</h4>
              </div>
              <div className="h-3 bg-[#2c2c2e] rounded-none overflow-hidden flex shadow-inner">
                <div className="h-full bg-[#4B96FF]" style={{ width: `${customTotalAsset ? (customCashLike / customTotalAsset) * 100 : 0}%` }} />
                <div className="h-full bg-[#00178F]" style={{ width: `${customTotalAsset ? (customInvestment / customTotalAsset) * 100 : 0}%` }} />
              </div>
              <div className="grid grid-cols-2 gap-4 text-[12px] font-bold text-brand-text-sub pt-2">
                <div className="flex flex-col gap-1.5 p-4 rounded-none bg-white/5 border border-white/5">
                  <span className="flex items-center gap-2 text-white">
                    <span className="w-2.5 h-2.5 rounded-none bg-[#4B96FF] shadow-[0_0_8px_#4B96FF]" />현금성
                  </span>
                  <span className="text-lg tabular-nums tracking-tight">{formatCurrency(customCashLike)}</span>
                </div>
                <div className="flex flex-col gap-1.5 p-4 rounded-none bg-white/5 border border-white/5">
                  <span className="flex items-center gap-2 text-white">
                    <span className="w-2.5 h-2.5 rounded-none bg-[#00178F] shadow-[0_0_8px_#00178F]" />투자/연금
                  </span>
                  <span className="text-lg tabular-nums tracking-tight">{formatCurrency(customInvestment)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[#1c1c1e] p-6 border border-white/5 rounded-none shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-[#A7B5FF] text-lg uppercase">대출 요약</h3>
            </div>
            <div className="space-y-4">
              <div className="p-5 bg-black/40 border border-white/5 rounded-none">
                <p className="text-[11px] font-bold text-brand-text-sub uppercase mb-1">전체 남은 금액</p>
                <p className="text-2xl font-black text-[#FF708C]">{formatCurrency(loanSummary.totalRemaining)}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-black/40 border border-white/5 rounded-none">
                  <p className="text-[10px] font-bold text-brand-text-sub uppercase mb-1">상환 원금</p>
                  <p className="text-base font-black text-[#4B96FF]">{formatCurrency(loanSummary.totalPrincipalPaid)}</p>
                </div>
                <div className="p-4 bg-black/40 border border-white/5 rounded-none">
                  <p className="text-[10px] font-bold text-brand-text-sub uppercase mb-1">상환 이자</p>
                  <p className="text-base font-black text-[#FFA2B6]">{formatCurrency(loanSummary.totalInterestPaid)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#1c1c1e] p-6 border border-white/5 rounded-none shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-[#A7B5FF]">지출 캘린더</h3>
            </div>
            <Calendar currentDate={currentDate} transactions={transactions} selectedDateStr={selectedDateStr} onDateClick={(d: string) => setSelectedDateStr(d)} />
          </div>

          <div className="bg-[#1c1c1e] rounded-none border border-white/5 overflow-hidden shadow-2xl">
            <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center bg-white/5">
              <h3 className="font-black text-sm text-white">
                {selectedDateStr ? `${selectedDateStr} 내역` : '날짜 선택'}
              </h3>
              {selectedDateStr && <span className="text-xs font-bold text-brand-text-sub bg-white/10 px-2 py-1 rounded-none">{selectedDateTransactions.length}건</span>}
            </div>
            <div className="divide-y divide-white/5 min-h-[120px] max-h-[360px] overflow-y-auto custom-scrollbar">
              {selectedDateTransactions.length > 0 ? (
                selectedDateTransactions.map((t: any) => (
                  <div key={t.id} className="px-6 py-5 flex items-center justify-between hover:bg-white/5 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-none flex items-center justify-center ${t.type === '수입' ? 'bg-[#4B96FF]/10 text-[#4B96FF]' : 'bg-[#FF708C]/10 text-[#FF708C]'}`}>
                        {t.type === '수입' ? <Plus size={16} /> : <Minus size={16} />}
                      </div>
                      <div>
                        <p className="text-sm font-black text-white">{t.memo || t.category}</p>
                        <p className="text-[11px] text-brand-text-sub mt-0.5">{t.account}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className={`text-base font-black ${t.type === '수입' ? 'text-[#4B96FF]' : 'text-white'}`}>
                        {t.type === '수입' ? '+' : '-'}{formatCurrency(t.amount)}
                      </p>
                      <button onClick={() => deleteTransaction(t.id)} className="p-2 text-brand-text-sub hover:text-[#FF708C] transition-all bg-white/5 rounded-none">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-10 text-center text-brand-text-sub font-bold flex flex-col items-center gap-3">
                  <span className="text-[12px] uppercase tracking-widest">{selectedDateStr ? '내역 없음' : '날짜를 클릭하세요'}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* 내 지출 */
function ExpenseView({ transactions, setTransactions, filteredData, currentDate, deleteTransaction, myAccountNames, balances, setBalances, searchQuery, setSearchQuery, tabName, setTabName, categories, setCategories, onOpenEdit }: any) {
  const { currMonthTxs } = filteredData;
  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();
  const [isStartBalanceOpen, setIsStartBalanceOpen] = useState(false);
  const expenseAccountButtons = ['내 생활비 통장', '내 여유자금 통장', '내 자동이체 통장'];
  const [activeExpenseAccount, setActiveExpenseAccount] = useState(expenseAccountButtons.find(name => myAccountNames.includes(name)) || myAccountNames[0] || '');

  useEffect(() => {
    if (!activeExpenseAccount && myAccountNames.length > 0) setActiveExpenseAccount(expenseAccountButtons.find(name => myAccountNames.includes(name)) || myAccountNames[0]);
  }, [myAccountNames, activeExpenseAccount]);

  const updateStartBalance = (id: string, value: number) => {
    setBalances((prev: any[]) => prev.map((b: any) => b.id === id ? { ...b, previousBalance: value, currentBalance: value } : b));
  };

  const filteredMonthTxs = useMemo(() => {
    if (!searchQuery.trim()) return currMonthTxs;
    const q = searchQuery.toLowerCase();
    return currMonthTxs.filter((t: any) => (t.memo?.toLowerCase().includes(q)) || (t.category?.toLowerCase().includes(q)) || (t.amount.toString().includes(q)) || (t.date.includes(q)));
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
    expenseTxs.forEach((t: any) => { totals[t.category] = (totals[t.category] || 0) + t.amount; });
    const totalAmount = Object.values(totals).reduce((a, b) => a + b, 0);
    if (totalAmount === 0) return [];
    return Object.entries(totals).map(([name, value]) => ({ name, value: value as number, percentage: ((value as number / totalAmount) * 100).toFixed(1) })).sort((a, b) => b.value - a.value);
  }, [currMonthTxs]);

  const COLORS = ['#00178F', '#4B96FF', '#A7B5FF', '#FF708C', '#FFA2B6'];

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="max-w-7xl mx-auto space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <EditableHeader title={tabName} setTitle={setTabName} />
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text-sub" />
            <input
              type="text" placeholder="내역 검색 (메모, 카테고리, 금액)" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#1c1c1e] border border-white/10 rounded-none pl-11 pr-4 py-3 text-[13px] text-white outline-none focus:border-[#4B96FF] transition-colors shadow-inner"
            />
            {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-text-sub hover:text-white"><X size={14} /></button>}
          </div>
          <div className="text-[11px] font-black text-brand-text-sub bg-white/5 px-4 py-2 rounded-none border border-white/5">
            기준: {year}년 {month + 1}월
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-3">
          {expenseAccountButtons.map((accountName) => {
            const exists = myAccountNames.includes(accountName);
            return (
              <button
                key={accountName} disabled={!exists} onClick={() => setActiveExpenseAccount(accountName)}
                className={`py-4 px-3 rounded-none font-black text-[13px] transition-all active:scale-95 border ${
                  activeExpenseAccount === accountName
                    ? 'bg-[#4B96FF] text-white border-[#4B96FF] shadow-[0_8px_20px_rgba(75,150,255,0.4)]'
                    : 'bg-[#1c1c1e] text-brand-text-main border-white/5 hover:border-white/20'
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
          const incomeTotal = accountTxs.filter((t: any) => t.type === '수입').reduce((sum: number, t: any) => sum + t.amount, 0);
          const expenseTotal = accountTxs.filter((t: any) => t.type === '지출').reduce((sum: number, t: any) => sum + t.amount, 0);

          return (
            <div className="bg-[#1c1c1e] border border-white/5 rounded-none overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.3)] flex flex-col h-[700px]">
              <div className="p-8 border-b border-white/5 bg-gradient-to-br from-white/5 to-transparent space-y-8">
                <div className="flex items-center gap-4">
                  <h4 className="font-black text-lg text-[#4B96FF]">{accountName}</h4>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-brand-text-sub uppercase mb-2 tracking-widest">현재 잔액</p>
                  <p className="text-3xl font-black tabular-nums text-white tracking-tighter">{formatNumber(accountBalance?.currentBalance || 0)}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 pb-2">
                  <div className="bg-black/20 p-4 rounded-none border border-white/5">
                    <p className="text-[10px] font-bold text-brand-text-sub uppercase mb-1">이번 달 수입</p>
                    <p className="text-base font-black text-[#4B96FF] tabular-nums">+{formatNumber(incomeTotal)}</p>
                  </div>
                  <div className="bg-black/20 p-4 rounded-none border border-white/5">
                    <p className="text-[10px] font-bold text-brand-text-sub uppercase mb-1">이번 달 지출</p>
                    <p className="text-base font-black text-[#FF708C] tabular-nums">-{formatNumber(expenseTotal)}</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="px-8 py-4 bg-black/40 border-b border-white/5 flex justify-between items-center">
                  <span className="text-[11px] font-black text-brand-text-sub uppercase tracking-widest">거래 내역</span>
                  <span className="text-[11px] font-bold text-brand-text-sub bg-white/10 px-2.5 py-1 rounded-none uppercase">{accountTxs.length}건</span>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-white/5 custom-scrollbar">
                  {accountTxs.length > 0 ? (
                    accountTxs.map((t: any) => (
                      <div key={t.id} className="px-8 py-5 hover:bg-white/5 transition-colors group flex justify-between items-center gap-4">
                        <div>
                          <p className="text-[11px] text-[#A7B5FF] font-black uppercase mb-1">{t.date}</p>
                          <p className="text-sm font-black text-white">{t.memo || t.category}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className={`text-base font-black tabular-nums ${t.type === '수입' ? 'text-[#4B96FF]' : 'text-white'}`}>
                              {t.type === '수입' ? '+' : '-'}{formatNumber(t.amount)}
                            </p>
                            <span className="text-[10px] font-bold text-brand-text-sub bg-white/10 px-2 py-1 rounded-none mt-1 inline-block">{t.category}</span>
                          </div>
                          <button onClick={() => deleteTransaction(t.id)} className="w-8 h-8 rounded-none bg-white/5 flex items-center justify-center text-brand-text-sub hover:text-white hover:bg-[#FF708C] transition-all">
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center p-10 text-center space-y-3 opacity-30">
                      <p className="text-[12px] font-black uppercase tracking-widest">내역 없음</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      <div className="bg-[#1c1c1e] border border-white/5 rounded-none p-8 md:p-10 shadow-[0_10px_40px_rgba(0,0,0,0.3)]">
        <h4 className="text-xl font-black mb-8 text-[#4B96FF]">이번 달 지출 분석</h4>
        {categoryData.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            {categoryData.map((item, index) => (
              <div key={item.name} className="flex flex-col gap-3">
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-none shadow-[0_0_8px_currentColor]" style={{ backgroundColor: COLORS[index % COLORS.length], color: COLORS[index % COLORS.length] }} />
                    <span className="font-black text-white">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black tabular-nums text-white">{formatNumber(item.value)}</span>
                    <span className="text-[11px] text-brand-text-sub font-bold ml-2 bg-white/5 px-2 py-1 rounded-none">{item.percentage}%</span>
                  </div>
                </div>
                <div className="w-full h-2.5 bg-black/40 rounded-none overflow-hidden border border-white/5 shadow-inner">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${item.percentage}%` }} transition={{ duration: 1, delay: index * 0.1 }} className="h-full rounded-none" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-[250px] flex flex-col items-center justify-center text-center space-y-4 border border-white/5 border-dashed rounded-none">
            <p className="text-sm font-bold text-brand-text-sub uppercase tracking-widest">분석할 지출 없음</p>
          </div>
        )}
      </div>

      <div className="bg-[#1c1c1e] border border-white/5 rounded-none shadow-2xl overflow-hidden">
        <button onClick={() => setIsStartBalanceOpen(!isStartBalanceOpen)} className="w-full px-8 py-6 flex items-center justify-between text-left hover:bg-white/5 transition-all">
          <div>
            <h4 className="font-black text-base text-[#A7B5FF]">시작금액 입력</h4>
            <p className="text-[11px] font-bold text-brand-text-sub mt-2">수정 시 오픈</p>
          </div>
          <ChevronRight size={20} className={`text-[#A7B5FF] transition-transform ${isStartBalanceOpen ? 'rotate-90' : ''}`} />
        </button>
        <AnimatePresence>
          {isStartBalanceOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="px-8 pb-8 pt-4 border-t border-white/5 bg-black/20">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {balances.filter((b: any) => b.category === '내 통장').map((b: any) => (
                    <div key={b.id} className="bg-[#2c2c2e] border border-white/5 rounded-none p-6 space-y-4 shadow-lg">
                      <p className="text-sm font-black text-white">{b.name}</p>
                      <NumericInput label="시작금액" value={b.previousBalance || 0} onChange={(v: number) => updateStartBalance(b.id, v)} className="w-full bg-transparent border-b border-white/20 text-xl font-black text-white outline-none focus:border-[#4B96FF] pb-1" />
                      <p className="text-[11px] font-bold text-brand-text-sub bg-black/30 p-2 rounded-none">계산 잔액: {formatCurrency(getAccountCalculatedBalance(b.name))}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <div className="flex justify-center pt-6">
        <button onClick={onOpenEdit} className="px-10 py-5 bg-[#4B96FF] rounded-none font-black text-white uppercase tracking-widest shadow-[0_10px_30px_rgba(75,150,255,0.4)] hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3 text-[13px]">
          <Edit2 size={18} /> 항목 수정
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
      <EditableHeader title={tabName} setTitle={setTabName} />
      <div className="bg-[#1c1c1e] border border-white/5 p-8 rounded-none shadow-[0_10px_40px_rgba(0,0,0,0.3)] text-center relative overflow-hidden">
        <p className="text-[12px] font-bold text-[#4B96FF] uppercase mb-3 tracking-widest relative z-10">투자 총액</p>
        <p className="text-4xl font-black text-white tabular-nums tracking-tighter relative z-10">{formatCurrency(total)}</p>
        <div className="flex items-center justify-center gap-2 mt-4 relative z-10">
           <span className={`text-[13px] font-black px-3 py-1.5 rounded-none ${diff >= 0 ? 'bg-[#4B96FF]/20 text-[#4B96FF]' : 'bg-[#FF708C]/20 text-[#FF708C]'}`}>
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
            <div key={asset.id} className="bg-[#1c1c1e] border border-white/5 p-6 rounded-none shadow-lg relative group hover:border-[#4B96FF]/50 transition-all flex flex-col justify-between">
              <div className="flex justify-between items-start mb-6">
                <input 
                  value={asset.name} onChange={(e) => setBalances(balances.map(b => b.id === asset.id ? {...b, name: e.target.value} : b))}
                  className="font-black text-[#A7B5FF] bg-transparent outline-none focus:border-b focus:border-[#4B96FF] text-lg w-3/4 pb-1"
                />
              </div>
              <div className="space-y-6">
                <NumericInput label="이번달 잔액" value={monthlyBalance} onChange={(v: number) => updateMonthlyBalance(asset.id, v)} className="w-full bg-transparent border-b border-white/10 text-xl font-black tabular-nums text-white outline-none focus:border-[#4B96FF] pb-1" />
                {isGaugeTarget(asset.name) && (
                  <div className="pt-5 border-t border-white/10 space-y-4">
                    <NumericInput label="이번달 추가금" value={getMonthlyAddition(asset)} onChange={(v: number) => updateMonthlyAddition(asset.id, v)} className="w-full bg-transparent border-b border-white/10 text-base font-black text-[#4B96FF] outline-none focus:border-[#4B96FF] pb-1" />
                    <div className="bg-black/30 p-4 rounded-none border border-white/5">
                      <div className="flex justify-between text-[11px] font-black text-brand-text-sub mb-2">
                        <span>진행률</span>
                        <span className="text-white">{formatNumber(yearlyAddition)} / {formatNumber(limit)}</span>
                      </div>
                      <div className="h-2.5 bg-black/50 rounded-none overflow-hidden shadow-inner">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${gaugePercent}%` }} className="h-full bg-[#4B96FF]" />
                      </div>
                      <p className="text-[10px] font-bold text-[#FFA2B6] mt-3 text-center bg-[#FFA2B6]/10 py-1.5 rounded-none">예상 세제혜택: {formatCurrency(taxRefund)}</p>
                    </div>
                  </div>
                )}
              </div>
              <button onClick={() => deletePensionAccount(asset.id, asset.name)} className="absolute bottom-4 right-4 p-2 text-brand-text-sub/50 hover:text-[#FF708C] transition-colors bg-white/5 rounded-none active:scale-90"><Trash2 size={16} /></button>
            </div>
          );
        })}
      </div>
      <button onClick={addPensionAccount} className="w-full py-6 border-2 border-dashed border-white/10 rounded-none text-brand-text-sub hover:text-white hover:border-white/30 flex items-center justify-center gap-3 mt-4 active:scale-95 transition-all bg-white/5">
        <Plus size={20} /> <span className="text-[13px] font-black uppercase tracking-widest">새 통장 추가</span>
      </button>
    </motion.div>
  );
}

/*감자 지출*/
function GamjaView({ gamjaTransactions, setGamjaTransactions, deleteGamjaTransaction, gamjaAccountNames, searchQuery, setSearchQuery, balances, setBalances, currentDate, tabName, setTabName, categories, setCategories, onOpenEdit }: any) {
  const [activeGamjaAccount, setActiveGamjaAccount] = useState(gamjaAccountNames[0] || '');
  const [isStartBalanceOpen, setIsStartBalanceOpen] = useState(false);
  const [newTx, setNewTx] = useState({ date: new Date().toISOString().split('T')[0], type: '지출' as TransactionType, account: gamjaAccountNames[0] || '', category: categories.expense[0], amount: 0, memo: '' });

  useEffect(() => {
    if (!activeGamjaAccount && gamjaAccountNames.length > 0) { setActiveGamjaAccount(gamjaAccountNames[0]); setNewTx((prev: any) => ({ ...prev, account: gamjaAccountNames[0] })); }
  }, [gamjaAccountNames, activeGamjaAccount]);

  const handleTypeChange = (newType: TransactionType) => { setNewTx({ ...newTx, type: newType, category: newType === '지출' ? categories.expense[0] : categories.income[0] }); };
  const handleAdd = () => {
    if (newTx.amount <= 0 || !activeGamjaAccount) return;
    const tx: GamjaTransaction = { id: Math.random().toString(36).substr(2, 9), ...newTx, account: activeGamjaAccount };
    setGamjaTransactions([tx, ...gamjaTransactions]);
    setNewTx({ ...newTx, type: '지출', category: categories.expense[0], amount: 0, memo: '' });
  };

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
      txs = txs.filter((t: any) => (t.memo?.toLowerCase().includes(q)) || (t.category?.toLowerCase().includes(q)) || (t.amount.toString().includes(q)) || (t.date.includes(q)));
    }
    return txs;
  }, [gamjaTransactions, activeGamjaAccount, searchQuery]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <EditableHeader title={tabName} setTitle={setTabName} />
        <div className="relative w-full sm:w-64">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text-sub" />
          <input type="text" placeholder="검색" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-[#1c1c1e] border border-white/10 rounded-none pl-11 pr-4 py-3 text-[13px] text-white outline-none focus:border-[#A7B5FF] transition-colors shadow-inner" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {gamjaAccountNames.map((name: string) => (
          <button
            key={name} onClick={() => { setActiveGamjaAccount(name); setNewTx({ ...newTx, account: name }); }}
            className={`py-4 px-3 rounded-none border font-black text-xs transition-all active:scale-95 ${
              activeGamjaAccount === name
                ? 'bg-[#A7B5FF] text-[#00178F] border-[#A7B5FF] shadow-[0_8px_20px_rgba(167,181,255,0.4)]'
                : 'bg-[#1c1c1e] text-brand-text-main border-white/5 hover:border-white/20'
            }`}
          >
            <span className="block truncate text-[13px]">{name.replace('감자 ', '').replace(' 통장', '')}</span>
            <span className={`block mt-1.5 text-[12px] tabular-nums ${activeGamjaAccount === name ? 'text-[#00178F]/90' : 'text-brand-text-sub'}`}>{formatCurrency(getAccountCalculatedBalance(name))}</span>
          </button>
        ))}
      </div>

      <div className="bg-[#1c1c1e] border border-white/5 rounded-none overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.3)]">
        <div className="p-8 border-b border-white/5 bg-gradient-to-br from-white/5 to-transparent space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-base font-black text-[#A7B5FF] uppercase tracking-widest">{activeGamjaAccount} 입력</h4>
            <div className="flex items-center bg-black/40 border border-white/5 rounded-none px-3 py-1.5">
              <input type="date" value={newTx.date} onChange={e => setNewTx({...newTx, date: e.target.value})} className="bg-transparent border-none text-[16px] md:text-sm font-bold outline-none text-white" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-black text-brand-text-sub uppercase ml-2 tracking-widest">유형</label>
            <div className="flex bg-black/40 rounded-none p-1 border border-white/5">
              <button onClick={() => handleTypeChange('지출')} className={`flex-1 py-2.5 rounded-none text-[14px] font-black transition-colors ${newTx.type === '지출' ? 'bg-[#FF708C] text-white shadow-md' : 'text-brand-text-sub hover:text-white'}`}>지출</button>
              <button onClick={() => handleTypeChange('수입')} className={`flex-1 py-2.5 rounded-none text-[14px] font-black transition-colors ${newTx.type === '수입' ? 'bg-[#4B96FF] text-white shadow-md' : 'text-brand-text-sub hover:text-white'}`}>수입</button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-black text-brand-text-sub uppercase ml-2 tracking-widest">항목</label>
            <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide snap-x">
              {(newTx.type === '지출' ? categories.expense : categories.income).map((c: string) => (
                <button key={c} onClick={() => setNewTx({...newTx, category: c})} className={`shrink-0 snap-start px-5 py-3 rounded-none text-[13px] font-black transition-all border ${newTx.category === c ? (newTx.type === '지출' ? 'bg-[#FF708C]/20 text-[#FF708C] border-[#FF708C]/50' : 'bg-[#4B96FF]/20 text-[#4B96FF] border-[#4B96FF]/50') : 'bg-black/40 text-brand-text-sub border-white/5'}`}>{c}</button>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2 p-4 bg-[#A7B5FF]/10 border border-[#A7B5FF]/30 rounded-none">
              <NumericInput label="금액 입력" value={newTx.amount} placeholder="0" onChange={(val: number) => setNewTx({...newTx, amount: val})} className="w-full bg-transparent border-none text-2xl font-black text-[#A7B5FF] outline-none tabular-nums placeholder:text-[#A7B5FF]/30" />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black text-brand-text-sub uppercase ml-2 tracking-widest">메모</label>
              <input type="text" value={newTx.memo} placeholder="메모" onChange={e => setNewTx({...newTx, memo: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-none px-4 py-4 text-[14px] text-white outline-none focus:border-[#A7B5FF]" />
            </div>
          </div>
          <div className="pt-2">
            <button onClick={handleAdd} className="w-full bg-[#A7B5FF] text-[#00178F] text-[16px] font-black py-5 rounded-none hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest shadow-[0_8px_30px_rgba(167,181,255,0.4)]">추가하기</button>
          </div>
        </div>

        <div className="divide-y divide-white/5 max-h-[520px] overflow-y-auto custom-scrollbar bg-black/20">
          {filteredTxs.map((t: any) => (
            <div key={t.id} className="px-8 py-5 flex items-center justify-between hover:bg-white/5 transition-colors">
              <div>
                <p className="text-[14px] font-black text-white">{t.memo || t.category}</p>
                <p className="text-[11px] text-brand-text-sub mt-1">{t.date} · <span className="bg-white/10 px-2 py-0.5 rounded-none ml-1">{t.category}</span></p>
              </div>
              <div className="flex items-center gap-4">
                <p className={`text-lg font-black tabular-nums ${t.type === '수입' ? 'text-[#4B96FF]' : 'text-white'}`}>{t.type === '수입' ? '+' : '-'}{formatNumber(t.amount)}</p>
                <button onClick={() => deleteGamjaTransaction(t.id)} className="p-2 text-brand-text-sub hover:text-[#FF708C] bg-white/5 rounded-none"><X size={16} /></button>
              </div>
            </div>
          ))}
          {filteredTxs.length === 0 && <div className="p-16 text-center text-brand-text-sub font-bold opacity-30 uppercase tracking-widest">내역 없음</div>}
        </div>
      </div>

      <div className="bg-[#1c1c1e] border border-white/5 rounded-none shadow-2xl overflow-hidden">
        <button onClick={() => setIsStartBalanceOpen(!isStartBalanceOpen)} className="w-full px-8 py-6 flex items-center justify-between text-left hover:bg-white/5 transition-all">
          <div>
            <h4 className="font-black text-base text-[#A7B5FF]">시작금액 입력</h4>
          </div>
          <ChevronRight size={20} className={`text-[#A7B5FF] transition-transform ${isStartBalanceOpen ? 'rotate-90' : ''}`} />
        </button>
        <AnimatePresence>
          {isStartBalanceOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="px-8 pb-8 pt-4 border-t border-white/5 bg-black/20">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {balances.filter((b: any) => b.category === '감자 자산').map((b: any) => (
                    <div key={b.id} className="bg-[#2c2c2e] border border-white/5 rounded-none p-6 space-y-4 shadow-lg">
                      <p className="text-sm font-black text-white">{b.name}</p>
                      <NumericInput label="시작금액" value={b.previousBalance || 0} onChange={(v: number) => setBalances((prev: any[]) => prev.map((item: any) => item.id === b.id ? { ...item, previousBalance: v, currentBalance: v } : item))} className="w-full bg-transparent border-b border-white/20 text-xl font-black text-white outline-none focus:border-[#A7B5FF] pb-1" />
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="flex justify-center pt-6">
        <button onClick={onOpenEdit} className="px-10 py-5 bg-[#1c1c1e] border border-white/10 rounded-none font-black text-[#A7B5FF] shadow-2xl hover:border-[#A7B5FF]/50 active:scale-95 transition-all flex items-center gap-3 text-[13px]">
          <Edit2 size={18} /> 항목 수정
        </button>
      </div>
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
      <EditableHeader title={tabName} setTitle={setTabName} />
      {activeLoan && activeStats && (
        <div className="bg-[#1c1c1e] p-8 border border-white/5 rounded-none shadow-[0_10px_40px_rgba(0,0,0,0.3)] space-y-6 relative overflow-hidden">
          <div className="text-center">
            <p className="text-[12px] font-black text-brand-text-sub uppercase mb-2 tracking-widest">남은 원금</p>
            <p className="text-4xl font-black text-[#FF708C] tabular-nums tracking-tighter">{formatCurrency(activeStats.remaining)}</p>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-[11px] font-black text-brand-text-sub uppercase px-2">
              <span>상환 진행률</span><span className="text-[#4B96FF]">{activeStats.progress.toFixed(1)}%</span>
            </div>
            <div className="h-4 w-full bg-black/40 rounded-none overflow-hidden border border-white/5 shadow-inner">
              <motion.div initial={{ width: 0 }} animate={{ width: `${activeStats.progress}%` }} className="h-full bg-gradient-to-r from-[#00178F] to-[#4B96FF]" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6 pt-6 border-t border-white/10">
            <div className="bg-black/30 p-4 rounded-none text-center border border-white/5">
              <p className="text-[10px] font-black text-brand-text-sub uppercase mb-1">상환원금</p>
              <p className="text-lg font-black text-[#4B96FF]">{formatNumber(activeStats.cumulativePrincipal)}</p>
            </div>
            <div className="bg-black/30 p-4 rounded-none text-center border border-white/5">
              <p className="text-[10px] font-black text-brand-text-sub uppercase mb-1">상환이자</p>
              <p className="text-lg font-black text-[#FFA2B6]">{formatNumber(activeStats.cumulativeInterest)}</p>
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x">
        {loans.map((loan: any) => (
          <button key={loan.id} onClick={() => setActiveLoanId(loan.id)} className={`shrink-0 snap-start px-6 py-4 rounded-none font-black text-[13px] transition-all border ${activeLoanId === loan.id ? 'bg-[#4B96FF] border-[#4B96FF] text-[#00178F] shadow-[0_8px_20px_rgba(75,150,255,0.4)]' : 'bg-[#1c1c1e] border-white/5 text-brand-text-sub hover:border-white/20'}`}>{loan.name}</button>
        ))}
        <button onClick={addNewLoan} className="shrink-0 p-4 rounded-none border-2 border-dashed border-white/20 text-white/50 hover:text-white hover:border-white/50 bg-white/5"><Plus size={20} /></button>
      </div>
      {activeLoan ? (
        <div className="space-y-6">
          <div className="bg-[#1c1c1e] border border-white/5 rounded-none overflow-hidden shadow-2xl">
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2"><label className="text-[11px] font-black text-brand-text-sub uppercase ml-2">이름수정</label><input type="text" value={activeLoan.name} onChange={(e) => updateLoanField(activeLoan.id, 'name', e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-none px-4 py-3 text-[14px] font-black text-white outline-none focus:border-[#4B96FF]" /></div>
                <div className="space-y-2">
                  <NumericInput label="최초대출금" value={activeLoan.originalTotalAmount} onChange={(val: number) => updateLoanField(activeLoan.id, 'originalTotalAmount', val)} className="w-full bg-black/40 border border-white/5 rounded-none px-4 py-3 text-[14px] font-black text-white outline-none focus:border-[#4B96FF]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2"><NumericInput label="원금상환" value={newRepayment.principal} onChange={(v: number) => setNewRepayment({...newRepayment, principal: v})} className="w-full bg-black/40 border border-[#4B96FF]/30 rounded-none px-4 py-3 text-[14px] font-black text-[#4B96FF] outline-none" /></div>
                <div className="space-y-2"><label className="text-[11px] font-black text-brand-text-sub uppercase ml-2">상환날짜</label><input type="date" value={newRepayment.date} onChange={e => setNewRepayment({...newRepayment, date: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-none px-4 py-3 text-[14px] font-bold text-white outline-none" /></div>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2"><NumericInput label="이자상환" value={newRepayment.interest} onChange={(v: number) => setNewRepayment({...newRepayment, interest: v})} className="w-full bg-black/40 border border-[#FFA2B6]/30 rounded-none px-4 py-3 text-[14px] font-black text-[#FFA2B6] outline-none" /></div>
                <div className="space-y-2"><label className="text-[11px] font-black text-brand-text-sub uppercase ml-2">메모</label><input type="text" value={newRepayment.memo} placeholder="메모" onChange={e => setNewRepayment({...newRepayment, memo: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-none px-4 py-3 text-[14px] text-white outline-none" /></div>
              </div>
              <div className="pt-2">
                <button onClick={addRepayment} className="w-full bg-[#4B96FF] text-[#00178F] font-black py-5 rounded-none active:scale-[0.98] transition-all text-[15px] uppercase tracking-widest shadow-[0_8px_30px_rgba(75,150,255,0.4)]">내역 추가</button>
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
                    <div className="col-span-3 text-right text-[#FFA2B6]">{formatNumber(r.interest)}</div>
                    <div className="col-span-3 text-right flex justify-end"><button onClick={() => deleteRepayment(activeLoan.id, r.id)} className="p-2 text-brand-text-sub hover:text-[#FF708C] bg-white/5 rounded-none"><X size={14}/></button></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <button onClick={() => deleteLoan(activeLoan.id)} className="w-full py-4 rounded-none text-[12px] font-bold text-[#FF708C]/70 hover:bg-[#FF708C]/10 flex items-center justify-center gap-2 border border-dashed border-[#FF708C]/30"><Trash2 size={16} /> 대출 전체 항목 삭제</button>
        </div>
      ) : (
        <div className="p-24 text-center text-brand-text-sub/50 font-black text-[14px] uppercase tracking-widest bg-[#1c1c1e] rounded-none border border-white/5 border-dashed">대출 선택</div>
      )}
    </motion.div>
  );
}

// 퀵 엔트리 박스 (홈탭 전용)
function QuickEntryBox({ account, onAdd, categories, setCategories }: any) {
  const [newTx, setNewTx] = useState({ date: new Date().toISOString().split('T')[0], type: '지출' as TransactionType, category: categories.expense[0], amount: 0, memo: '' });
  const handleTypeChange = (newType: TransactionType) => setNewTx({ ...newTx, type: newType, category: newType === '지출' ? categories.expense[0] : categories.income[0] });
  const handleAdd = () => { if (newTx.amount <= 0) return; onAdd({ id: Math.random().toString(36).substr(2, 9), ...newTx, account }); setNewTx({ ...newTx, type: '지출', category: categories.expense[0], amount: 0, memo: '' }); };
  const currentCategories = newTx.type === '지출' ? categories.expense : categories.income;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
         <h4 className="text-base font-black text-[#4B96FF]">{account}</h4>
        <div className="flex items-center bg-black/40 border border-white/5 rounded-none px-3 py-1.5">
           <input type="date" value={newTx.date} onChange={e => setNewTx({...newTx, date: e.target.value})} className="bg-transparent border-none text-[16px] md:text-sm font-bold outline-none text-white" />
        </div>
      </div>
      <div className="space-y-2">
         <label className="text-[11px] font-black text-brand-text-sub uppercase ml-2 tracking-widest">유형</label>
         <div className="flex bg-black/40 rounded-none p-1 border border-white/5">
            <button onClick={() => handleTypeChange('지출')} className={`flex-1 py-2.5 rounded-none text-[14px] font-black transition-colors ${newTx.type === '지출' ? 'bg-[#FF708C] text-white shadow-md' : 'text-brand-text-sub'}`}>지출</button>
            <button onClick={() => handleTypeChange('수입')} className={`flex-1 py-2.5 rounded-none text-[14px] font-black transition-colors ${newTx.type === '수입' ? 'bg-[#4B96FF] text-[#121212] shadow-md' : 'text-brand-text-sub'}`}>수입</button>
         </div>
      </div>
      <div className="space-y-2">
         <label className="text-[11px] font-black text-brand-text-sub uppercase ml-2 tracking-widest">항목</label>
         <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide snap-x">
            {currentCategories.map((c: string) => (
              <button key={c} onClick={() => setNewTx({...newTx, category: c})} className={`shrink-0 snap-start px-5 py-3 rounded-none text-[13px] font-black transition-all border ${newTx.category === c ? (newTx.type === '지출' ? 'bg-[#FF708C]/20 text-[#FF708C] border-[#FF708C]/50' : 'bg-[#4B96FF]/20 text-[#4B96FF] border-[#4B96FF]/50') : 'bg-black/40 text-brand-text-sub border-white/5'}`}>{c}</button>
            ))}
         </div>
      </div>
      <div className="space-y-4">
         <div className="space-y-2 p-4 bg-white/5 border border-white/10 rounded-none">
           <NumericInput label="금액" value={newTx.amount} placeholder="0" onChange={(val: number) => setNewTx({...newTx, amount: val})} className="w-full bg-transparent border-none text-2xl font-black text-white outline-none tabular-nums" />
         </div>
         <div className="space-y-2">
            <label className="text-[11px] font-black text-brand-text-sub uppercase ml-2 tracking-widest">메모</label>
            <input type="text" value={newTx.memo} placeholder="입력" onChange={e => setNewTx({...newTx, memo: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-none px-4 py-4 text-[14px] text-white outline-none focus:border-[#4B96FF]" />
         </div>
      </div>
      <div className="pt-2">
         <button onClick={handleAdd} className="w-full bg-[#4B96FF] text-[#121212] text-[16px] font-black py-5 rounded-none hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest shadow-[0_8px_30px_rgba(75,150,255,0.3)]">추가</button>
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
        <div className="bg-[#2c2c2e] border border-white/10 p-5 rounded-none shadow-2xl min-w-[200px]">
          <p className="text-[12px] font-black text-white mb-3 border-b border-white/10 pb-2">{data.name}월 상세</p>
          <div className="space-y-3">
            {data.details.map((d: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center gap-4">
                <span className={`text-[11px] font-bold px-2 py-1 rounded-none ${d.user === '나' ? 'bg-[#4B96FF]/20 text-[#4B96FF]' : 'bg-[#A7B5FF]/20 text-[#A7B5FF]'}`}>[{d.user}] {d.type}</span>
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
      <EditableHeader title={tabName} setTitle={setTabName} />
      
      <div className="bg-[#1c1c1e] p-8 rounded-none border border-white/5 shadow-[0_10px_40px_rgba(0,0,0,0.3)] space-y-6">
        <div className="flex justify-between items-end">
          <span className="text-[12px] font-black text-brand-text-sub uppercase tracking-widest bg-white/5 px-3 py-1.5 rounded-none">{selectedYear} 총수입</span>
          <span className="text-3xl font-black tabular-nums text-white tracking-tighter">{formatCurrency(totalAnnual)}</span>
        </div>
        <div className="space-y-3 pt-2">
          <div className="h-4 w-full bg-black/40 rounded-none overflow-hidden flex shadow-inner border border-white/5">
            <motion.div initial={{ width: 0 }} animate={{ width: `${myRatio}%` }} className="h-full bg-[#4B96FF]" />
            <motion.div initial={{ width: 0 }} animate={{ width: `${gamjaRatio}%` }} className="h-full bg-[#A7B5FF]" />
          </div>
          <div className="flex justify-between text-[12px] font-black">
            <div className="flex flex-col">
              <span className="text-[#4B96FF]">나 {myRatio.toFixed(1)}%</span>
              <span className="text-lg font-black tabular-nums text-white">{formatCurrency(totalMyAnnual)}</span>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-[#A7B5FF]">감자 {gamjaRatio.toFixed(1)}%</span>
              <span className="text-lg font-black tabular-nums text-white">{formatCurrency(totalGamjaAnnual)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#1c1c1e] p-8 rounded-none border border-white/5 space-y-6 shadow-2xl">
        <div className="flex items-center justify-between">
           <h4 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">급여 입력</h4>
          <input type="date" value={newEntry.date} onChange={e => setNewEntry({...newEntry, date: e.target.value})} className="bg-black/40 border border-white/5 rounded-none px-3 py-2 text-[14px] font-bold outline-none text-white" />
        </div>
        <div className="space-y-2">
          <label className="text-[11px] font-black text-brand-text-sub uppercase ml-2 tracking-widest">대상</label>
          <div className="flex bg-black/40 rounded-none p-1 border border-white/5">
            <button onClick={() => setNewEntry({...newEntry, target: '나'})} className={`flex-1 py-3 rounded-none text-[14px] font-black transition-colors ${newEntry.target === '나' ? 'bg-[#4B96FF] text-white shadow-md' : 'text-brand-text-sub hover:text-white'}`}>내 월급</button>
            <button onClick={() => setNewEntry({...newEntry, target: '감자'})} className={`flex-1 py-3 rounded-none text-[14px] font-black transition-colors ${newEntry.target === '감자' ? 'bg-[#A7B5FF] text-[#00178F] shadow-md' : 'text-brand-text-sub hover:text-white'}`}>감자 월급</button>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[11px] font-black text-brand-text-sub uppercase ml-2 tracking-widest">항목</label>
          <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide snap-x">
            {SALARY_TYPES.map(type => (
              <button key={type} onClick={() => setNewEntry({...newEntry, type: type as SalaryType})} className={`shrink-0 snap-start px-5 py-3 rounded-none text-[13px] font-black transition-all border ${newEntry.type === type ? 'bg-[#4B96FF]/20 text-[#4B96FF] border-[#4B96FF]/50' : 'bg-black/40 text-brand-text-sub border-white/5 hover:bg-white/5'}`}>{salaryLabels[type] || type}</button>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="p-4 bg-[#4B96FF]/10 border border-[#4B96FF]/30 rounded-none">
            <NumericInput label="금액 입력" value={newEntry.amount} onChange={(v: number) => setNewEntry({...newEntry, amount: v})} className="w-full bg-transparent border-none text-2xl font-black text-[#4B96FF] outline-none tabular-nums placeholder:text-[#4B96FF]/30" placeholder="0" />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-black text-brand-text-sub uppercase ml-2 tracking-widest">메모</label>
            {!isMemoActive ? (
              <button onClick={() => setIsMemoActive(true)} className="w-full text-left px-5 py-4 bg-black/40 border border-white/5 rounded-none text-brand-text-sub text-[14px] font-bold">클릭하여 메모 입력...</button>
            ) : (
              <input autoFocus type="text" value={newEntry.memo} placeholder="메모 입력" onChange={e => setNewEntry({...newEntry, memo: e.target.value})} onBlur={() => newEntry.memo === '' && setIsMemoActive(false)} className="w-full bg-black/40 border border-white/10 rounded-none px-5 py-4 text-[14px] text-white outline-none focus:border-[#4B96FF]" />
            )}
          </div>
        </div>
        <div className="pt-2">
          <button onClick={handleAddSalary} className="w-full bg-gradient-to-r from-[#00178F] to-[#4B96FF] text-white font-black py-5 rounded-none text-[16px] active:scale-[0.98] transition-all uppercase tracking-widest shadow-[0_8px_30px_rgba(75,150,255,0.4)]">등록</button>
        </div>
      </div>

      <div className="bg-[#1c1c1e] p-8 rounded-none border border-white/5 shadow-[0_10px_40px_rgba(0,0,0,0.3)] overflow-hidden">
        <h4 className="text-[13px] font-black uppercase mb-6 text-white">월별 비교</h4>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlySalaryData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8e8e93', fontSize: 12, fontWeight: 'bold' }} interval={0} />
              <YAxis hide />
              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} content={<CustomTooltip />} />
              <Bar dataKey="나" fill="#4B96FF" radius={[0, 0, 0, 0]} barSize={12} />
              <Bar dataKey="감자" fill="#A7B5FF" radius={[0, 0, 0, 0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-[#1c1c1e] border border-white/5 rounded-none overflow-hidden shadow-2xl">
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
                    <input type="text" value={salaryLabels[type]} onChange={e => setSalaryLabels({...salaryLabels, [type]: e.target.value})} className="w-full bg-[#2c2c2e] border border-white/5 rounded-none text-[13px] p-3 font-bold outline-none text-white focus:border-[#4B96FF] transition-colors" />
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
  const selectedYear = new Date().getFullYear();
  const processData = (txs: any[], salaryRecords: any[]) => {
    const annualSalary = salaryRecords.filter((r: any) => new Date(r.date).getFullYear() === selectedYear).reduce((s: number, r: any) => s + r.amount, 0);
    const expenseTxs = txs.filter((t: any) => t.type === '지출' && new Date(t.date).getFullYear() === selectedYear);
    const totalExpense = expenseTxs.reduce((sum, t) => sum + t.amount, 0);
    const categoryTotals: Record<string, number> = {};
    expenseTxs.forEach((t: any) => { categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount; });
    const chartData = Object.entries(categoryTotals).map(([name, value]) => ({ name, value: value as number, percent: totalExpense > 0 ? ((value as number / totalExpense) * 100).toFixed(1) : '0' })).sort((a, b) => b.value - a.value);
    return { annualSalary, totalExpense, remaining: annualSalary - totalExpense, chartData };
  };

  const myData = processData(transactions, salaries.mySalaryRecords);
  const gamjaData = processData(gamjaTransactions, salaries.gamjaSalaryRecords);
  const totalAnnualSalary = myData.annualSalary + gamjaData.annualSalary;
  const totalAnnualExpense = myData.totalExpense + gamjaData.totalExpense;
  const totalRemaining = myData.remaining + gamjaData.remaining;

  const biggerFontSize = "text-xl md:text-2xl"; 
  const COLORS = ['#4B96FF', '#00178F', '#A7B5FF', '#FF708C', '#FFA2B6'];

  const downloadYearlyReport = () => {
    const header = ["날짜", "구분", "카테고리", "금액", "메모"];
    const myYearly = transactions.filter(t => new Date(t.date).getFullYear() === selectedYear).map(t => [t.date, t.type, t.category, t.amount, t.memo].join(","));
    const gamjaYearly = gamjaTransactions.filter(t => new Date(t.date).getFullYear() === selectedYear).map(t => [t.date, t.type, t.category, t.amount, t.memo].join(","));
    const csvContent = [`--- ${selectedYear}년 내 지출 내역 ---`, header.join(","), ...myYearly, "\n", `--- ${selectedYear}년 감자 지출 내역 ---`, header.join(","), ...gamjaYearly].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${selectedYear}년_결산_데이터.csv`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-8 pb-24 px-1">
      <EditableHeader title={tabName} setTitle={setTabName} />

      <div className="bg-[#1c1c1e] p-8 border border-white/5 rounded-none shadow-[0_10px_40px_rgba(0,0,0,0.3)]">
        <p className="text-[14px] font-black text-[#4B96FF] uppercase mb-6 tracking-widest text-center bg-[#4B96FF]/10 py-2 rounded-none w-fit mx-auto px-6">{selectedYear}년 총결산</p>
        <div className="grid grid-cols-3 divide-x divide-white/10 text-center">
          <div><p className="text-[11px] font-bold text-brand-text-sub mb-2 uppercase tracking-widest">연봉</p><p className={`${biggerFontSize} font-black tabular-nums text-white`}>{formatNumber(totalAnnualSalary)}</p></div>
          <div><p className="text-[11px] font-bold text-brand-text-sub mb-2 uppercase tracking-widest">지출</p><p className={`${biggerFontSize} font-black text-[#FF708C] tabular-nums`}>{formatNumber(totalAnnualExpense)}</p></div>
          <div><p className="text-[11px] font-bold text-brand-text-sub mb-2 uppercase tracking-widest">자산</p><p className={`${biggerFontSize} font-black text-[#4B96FF] tabular-nums`}>{formatNumber(totalRemaining)}</p></div>
        </div>
      </div>

      {[ { label: '나', data: myData, color: '#4B96FF', bg: 'bg-[#4B96FF]', text: 'text-white' }, { label: '감자', data: gamjaData, color: '#A7B5FF', bg: 'bg-[#A7B5FF]', text: 'text-[#00178F]' } ].map((user) => (
        <div key={user.label} className="space-y-6">
          <div className="bg-[#1c1c1e] p-8 border border-white/5 rounded-none shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <span className={`px-4 py-2 rounded-none ${user.text} text-[13px] font-black uppercase tracking-widest shadow-lg ${user.bg}`}>{user.label} 결산</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-black/30 border border-white/5 p-4 rounded-none text-center">
                <p className="text-[11px] font-bold text-brand-text-sub mb-2 uppercase tracking-widest">연봉</p>
                <p className="text-[14px] md:text-lg font-black tabular-nums text-white">{formatNumber(user.data.annualSalary)}</p>
              </div>
              <div className="bg-black/30 border border-white/5 p-4 rounded-none text-center">
                <p className="text-[11px] font-bold text-brand-text-sub mb-2 uppercase tracking-widest">지출</p>
                <p className="text-[14px] md:text-lg font-black text-[#FF708C] tabular-nums">{formatNumber(user.data.totalExpense)}</p>
              </div>
              <div className="bg-black/30 border border-white/5 p-4 rounded-none text-center">
                <p className="text-[11px] font-bold text-brand-text-sub mb-2 uppercase tracking-widest">자산</p>
                <p className="text-[14px] md:text-lg font-black text-[#4B96FF] tabular-nums">{formatNumber(user.data.remaining)}</p>
              </div>
            </div>
          </div>

          <div className="bg-[#1c1c1e] p-8 border border-white/5 rounded-none shadow-2xl">
            <h4 className="text-[15px] font-black mb-8 flex justify-between items-center px-2 text-white">
              <span>많이 쓴 항목</span>
              <span className="text-brand-text-sub text-[12px] bg-white/5 px-3 py-1 rounded-none">{user.label}</span>
            </h4>
            <div className="space-y-6">
              {user.data.chartData.map((item, idx) => (
                <div key={item.name} className="space-y-2">
                  <div className="flex justify-between items-end">
                    <div className="flex items-center gap-3">
                      <span className="text-[14px] font-black text-white">{item.name}</span>
                      <span className="text-[11px] font-bold text-brand-text-sub bg-white/10 px-2 py-0.5 rounded-none">{item.percent}%</span>
                    </div>
                    <span className="text-[14px] font-black tabular-nums text-white">{formatNumber(item.value)}</span>
                  </div>
                  <div className="h-3 w-full bg-black/40 rounded-none overflow-hidden border border-white/5 shadow-inner">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${item.percent}%` }} className="h-full rounded-none" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
      
      <div className="flex justify-center pt-10">
        <button onClick={downloadYearlyReport} className="flex items-center gap-3 px-10 py-5 bg-[#4B96FF] rounded-none text-[14px] font-black text-white shadow-[0_8px_30px_rgba(75,150,255,0.3)] hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest">
          {selectedYear}년 다운로드
        </button>
      </div>
    </motion.div>
  );
}

function TransactionEditModal({ isOpen, onClose, transactions, setTransactions, categories, setCategories, title }: any) {
  const [editedTxs, setEditedTxs] = useState<any[]>([]);
  const [editedCategories, setEditedCategories] = useState<any>({ expense: [], income: [] });
  useEffect(() => { if (isOpen) { setEditedTxs([...transactions]); setEditedCategories({ ...categories }); } }, [isOpen, transactions, categories]);
  const handleUpdateTx = (id: string, field: string, value: any) => setEditedTxs(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  const handleDeleteTx = (id: string) => setEditedTxs(prev => prev.filter(t => t.id !== id));
  const handleSave = () => { setTransactions(editedTxs); setCategories(editedCategories); onClose(); };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose} />
      <div className="bg-[#1c1c1e] border border-white/10 rounded-none w-full max-w-6xl h-[85vh] flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.8)] relative z-10 overflow-hidden">
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-white/5 to-transparent">
           <div>
              <h3 className="text-xl font-black uppercase tracking-tight text-white mb-2">{title}</h3>
           </div>
           <button onClick={onClose} className="p-4 hover:bg-[#FF708C] hover:text-white rounded-none transition-all text-brand-text-sub bg-white/5"><X size={24} /></button>
        </div>
        
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
           <div className="flex-1 flex flex-col overflow-hidden border-r border-white/5">
              <div className="p-5 bg-black/40 border-b border-white/5 flex justify-between items-center">
                 <p className="text-[11px] font-black uppercase tracking-widest text-brand-text-sub">리스트 ({editedTxs.length})</p>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar bg-black/20">
                 {editedTxs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((t: any) => (
                   <div key={t.id} className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3 bg-[#2c2c2e] border border-white/5 rounded-none hover:border-[#4B96FF]/50 transition-all items-center shadow-md">
                      <div className="sm:col-span-2">
                         <input type="date" value={t.date} onChange={e => handleUpdateTx(t.id, 'date', e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-none px-3 py-2 text-[12px] font-bold text-white outline-none focus:border-[#4B96FF]" />
                      </div>
                      <div className="sm:col-span-2">
                         <select value={t.category} onChange={e => handleUpdateTx(t.id, 'category', e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-none px-3 py-2 text-[12px] font-bold text-white outline-none focus:border-[#4B96FF]">
                            {(t.type === '지출' ? editedCategories.expense : editedCategories.income).map((c: string) => <option key={c} value={c}>{c}</option>)}
                         </select>
                      </div>
                      <div className="sm:col-span-3">
                         <input type="text" value={t.memo} placeholder="메모" onChange={e => handleUpdateTx(t.id, 'memo', e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-none px-3 py-2 text-[12px] font-bold text-white outline-none focus:border-[#4B96FF]" />
                      </div>
                      <div className="sm:col-span-3">
                         <NumericInput value={t.amount} onChange={(v: number) => handleUpdateTx(t.id, 'amount', v)} className="w-full bg-black/40 border border-[#4B96FF]/30 rounded-none px-3 py-2 text-[14px] font-black text-[#4B96FF] outline-none focus:border-[#4B96FF] tabular-nums" />
                      </div>
                      <div className="sm:col-span-2 flex justify-end">
                         <button onClick={() => handleDeleteTx(t.id)} className="text-[#FF708C] hover:bg-[#FF708C] hover:text-white p-3 rounded-none transition-all active:scale-90 bg-[#FF708C]/10"><Trash2 size={18} /></button>
                      </div>
                   </div>
                 ))}
                 {editedTxs.length === 0 && (
                    <div className="text-center py-32 opacity-30 flex flex-col items-center gap-4">
                      <p className="font-black uppercase tracking-widest text-[13px] text-white">내역 없음</p>
                   </div>
                 )}
              </div>
           </div>

           <div className="w-full lg:w-80 flex flex-col overflow-hidden bg-black/30">
              <div className="p-5 bg-black/40 border-b border-white/5">
                 <p className="text-[11px] font-black uppercase tracking-widest text-brand-text-sub">카테고리</p>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                 <div className="space-y-4">
                    <div className="flex items-center gap-2 px-2">
                       <Minus size={18} className="text-[#FF708C]" />
                       <p className="text-[12px] font-black text-[#FF708C] uppercase tracking-widest">지출</p>
                    </div>
                    <textarea value={editedCategories.expense.join(', ')} onChange={e => setEditedCategories({...editedCategories, expense: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})} className="w-full h-40 bg-black/40 border border-white/10 rounded-none p-5 text-[13px] font-bold text-white leading-relaxed focus:border-[#FF708C] outline-none transition-all" />
                 </div>
                 <div className="space-y-4">
                    <div className="flex items-center gap-2 px-2">
                       <Plus size={18} className="text-[#4B96FF]" />
                       <p className="text-[12px] font-black text-[#4B96FF] uppercase tracking-widest">수입</p>
                    </div>
                    <textarea value={editedCategories.income.join(', ')} onChange={e => setEditedCategories({...editedCategories, income: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})} className="w-full h-40 bg-black/40 border border-white/10 rounded-none p-5 text-[13px] font-bold text-white leading-relaxed focus:border-[#4B96FF] outline-none transition-all" />
                 </div>
              </div>
           </div>
        </div>

        <div className="p-8 border-t border-white/5 bg-[#1c1c1e] flex gap-5">
           <button onClick={onClose} className="flex-1 py-5 border border-white/10 rounded-none font-bold uppercase text-[13px] text-white hover:bg-white/10 transition-all tracking-widest">취소</button>
           <button onClick={handleSave} className="flex-[2] py-5 bg-[#4B96FF] text-white rounded-none font-black uppercase text-[14px] shadow-[0_10px_30px_rgba(75,150,255,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all tracking-widest">
             저장
           </button>
        </div>
      </div>
    </div>
  );
}

// --- HELPERS ---
function SummarySmallCard({ label, value, color }: { label: string, value: string | number, color: string }) {
  return (
    <div className="bg-[#2c2c2e] p-5 md:p-6 rounded-none hover:scale-[1.02] transition-transform shadow-[0_8px_30px_rgba(0,0,0,0.2)] border border-white/5 flex flex-col justify-center min-h-[120px]">
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
    <div className="-mx-6 md:mx-0 grid grid-cols-7 gap-px bg-white/5 border-y md:border border-white/5 rounded-none overflow-hidden shadow-inner">
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
               {hasIncome && <span className="w-2 h-2 rounded-none bg-[#4B96FF] shadow-[0_0_8px_#4B96FF]"></span>}
               {hasExpense && <span className="w-2 h-2 rounded-none bg-[#FF708C] shadow-[0_0_8px_#FF708C]"></span>}
            </div>
          </button>
        );
      })}
    </div>
  );
}
