// 🔥 이 줄부터 추가 (파일 최상단)
import { useMemo } from "react";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Search, X, ChevronLeft, ChevronRight, Activity, CreditCard, Wallet, Trash2, Edit2 } from "lucide-react";

// 🔥 이것도 같이 추가
const formatNumber = (num) => Number(num).toLocaleString();

function ExpenseView({
  transactions,
  setTransactions,
  filteredData,
  changeMonth,
  deleteTransaction,
  myAccountNames,
  balances,
  searchQuery,
  setSearchQuery,
  tabName,
  setTabName,
  categories,
  setCategories,
  onOpenEdit
}: any) {
  const { currMonthTxs } = filteredData;
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

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

  const COLORS = [
    '#94D5FF',
    '#AEE7E6',
    '#C9C7F5',
    '#A0E1F0',
    '#B7A8E5',
    '#B2D8D8',
    '#D1C4E9',
    '#BBDEFB',
    '#B2EBF2',
    '#E1BEE7'
  ];

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
          description="이번 달 지출/수입 내역과 통장별 흐름을 확인합니다."
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

          <div className="flex items-center gap-2 bg-brand-card border border-brand-border p-1 rounded-full shadow-brand shrink-0">
            <button
              onClick={() => changeMonth(-1)}
              className="p-2 hover:bg-brand-primary/20 rounded-full transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-black min-w-[120px] text-center uppercase tracking-widest">
              {year}년 {month + 1}월
            </span>
            <button
              onClick={() => changeMonth(1)}
              className="p-2 hover:bg-brand-primary/20 rounded-full transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-brand-card border border-brand-border rounded-brand p-8 shadow-brand">
        <h4 className="text-lg font-black mb-10 flex items-center gap-2">
          <Activity size={20} className="text-brand-primary" />
          이번 달 지출 분석
        </h4>

        {categoryData.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="h-[350px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                    label={({ percentage }) => parseFloat(percentage) > 5 ? `${percentage}%` : ''}
                    labelLine={false}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1d22',
                      border: '1px solid #25282b',
                      borderRadius: '16px',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                    }}
                    itemStyle={{
                      color: '#e5e7eb',
                      fontSize: '11px',
                      fontWeight: 'black'
                    }}
                    formatter={(value: number) => `${formatNumber(value)}원`}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-[10px] font-bold text-brand-text-sub uppercase tracking-widest">
                  이번 달 총 지출
                </p>
                <p className="text-3xl font-black tabular-nums">
                  {formatNumber(categoryData.reduce((s, c) => s + c.value, 0))}원
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
              {categoryData.map((item, index) => (
                <div key={item.name} className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="font-black">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-black tabular-nums">{formatNumber(item.value)}원</span>
                      <span className="text-[10px] text-brand-text-sub font-bold ml-2">
                        ({item.percentage}%)
                      </span>
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
          </div>
        ) : (
          <div className="h-[300px] flex flex-col items-center justify-center text-center space-y-4 border border-brand-border border-dashed rounded-xl">
            <CreditCard size={32} className="text-brand-text-sub/30" />
            <p className="text-sm font-bold text-brand-text-sub uppercase tracking-widest">
              분석할 지출 데이터가 없습니다
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {myAccountNames.map((accountName: string) => {
          const accountBalance = balances.find((b: any) => b.name === accountName);
          const accountTxs = filteredMonthTxs.filter((t: any) => t.account === accountName);
          const incomeTotal = accountTxs
            .filter((t: any) => t.type === '수입')
            .reduce((sum: number, t: any) => sum + t.amount, 0);

          const expenseTotal = accountTxs
            .filter((t: any) => t.type === '지출')
            .reduce((sum: number, t: any) => sum + t.amount, 0);



return (
  <div
    key={accountName}
    className="bg-brand-card border border-brand-border rounded-brand overflow-hidden shadow-brand flex flex-col min-h-[420px] md:h-[650px]"
  >
    {/* Account Header Summary */}
    <div className="p-6 border-b border-brand-border bg-white/5 space-y-6">

      
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center text-brand-primary">
                    <Wallet size={20} />
                  </div>
                  <h4 className="font-black text-base">{accountName}</h4>
                </div>

                <div className="space-y-4">
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
                      <p className="text-[9px] font-bold text-brand-text-sub uppercase mb-1">
                        이번 달 수입
                      </p>
                      <p className="text-sm font-black text-brand-mint tabular-nums">
                        +{formatNumber(incomeTotal)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-brand-text-sub uppercase mb-1">
                        이번 달 지출
                      </p>
                      <p className="text-sm font-black text-brand-pink tabular-nums">
                        -{formatNumber(expenseTotal)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="px-6 py-3 bg-brand-bg/30 border-b border-brand-border flex justify-between items-center">
                  <span className="text-[10px] font-black text-brand-text-sub uppercase tracking-widest">
                    거래 내역
                  </span>
                  <span className="text-[10px] font-bold text-brand-text-sub opacity-50 uppercase">
                    {accountTxs.length}건
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-brand-border custom-scrollbar">
                  {accountTxs.length > 0 ? (
                    accountTxs.map((t: any) => (
                      <div key={t.id} className="px-6 py-4 hover:bg-white/5 transition-colors group">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-[10px] text-brand-text-sub font-black uppercase mb-0.5">
                              {t.date}
                            </p>
                            <p className="text-xs font-black">{t.memo || t.category}</p>
                          </div>

                          <div className="text-right flex items-start gap-3">
                            <div>
                              <p className={`text-xs font-black tabular-nums ${t.type === '수입' ? 'text-brand-mint' : 'text-brand-pink'}`}>
                                {t.type === '수입' ? '+' : '-'}{formatNumber(t.amount)}
                              </p>
                              <span className="text-[9px] font-bold text-brand-text-sub bg-brand-border/30 px-1.5 py-0.5 rounded">
                                {t.category}
                              </span>
                            </div>

                            <button
                              onClick={() => deleteTransaction(t.id)}
                              className="p-1 text-brand-text-sub hover:text-brand-pink opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center p-10 text-center space-y-2 opacity-20">
                      <Activity size={24} />
                      <p className="text-[10px] font-black uppercase tracking-widest">
                        내역이 없습니다
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
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
