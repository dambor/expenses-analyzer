import { useEffect, useMemo, useState } from "react";
import { Card } from "./ui/card";
import {
  Sankey,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Legend,
} from "recharts";

const CATEGORY_COLORS = [
  "#34d399",
  "#60a5fa",
  "#fbbf24",
  "#f97316",
  "#a855f7",
  "#f472b6",
  "#38bdf8",
  "#4ade80",
  "#fb7185",
  "#22d3ee",
  "#facc15",
  "#93c5fd",
  "#fda4af",
  "#bef264",
  "#c4b5fd",
];

interface ExpenseRecord {
  category: string;
  income: number;
  expenses: number;
}

interface SankeyNode {
  name: string;
  fill?: string;
}

interface SankeyLink {
  source: number;
  target: number;
  value: number;
}

interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

interface CategoryDetail {
  label: string;
  income: number;
  expense: number;
  net: number;
  color: string;
}

const roundToCents = (value: number) => Math.round(value * 100) / 100;

export function ExpenseFlow() {
  const [records, setRecords] = useState<ExpenseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    fetch("/data/expense-summary.json")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Unable to load expense summary data");
        }
        return response.json();
      })
      .then((rawData: unknown) => {
        if (!isMounted) return;

        const parsed = Array.isArray(rawData)
          ? rawData.map((item) => ({
              category: String((item as ExpenseRecord).category ?? ""),
              income: Number((item as ExpenseRecord).income ?? 0),
              expenses: Number((item as ExpenseRecord).expenses ?? 0),
            }))
          : [];

        setRecords(parsed);
        setError(null);
      })
      .catch((err: Error) => {
        if (!isMounted) return;
        setError(err.message);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }),
    [],
  );

  const sanitizedRecords = useMemo(() => {
    return records
      .filter((record) => record.category?.toLowerCase() !== "grand total")
      .map((record) => {
        const trimmedCategory = record.category?.trim();
        const normalizedCategory = trimmedCategory === "" ? "General Income" : trimmedCategory;
        return {
          category: normalizedCategory ?? "General Income",
          income: Number.isFinite(record.income) ? record.income : 0,
          expenses: Number.isFinite(record.expenses) ? record.expenses : 0,
        };
      });
  }, [records]);

  const generalIncomeRecord = useMemo(
    () => sanitizedRecords.find((record) => record.category === "General Income"),
    [sanitizedRecords],
  );

  const categoryRecords = useMemo(
    () => sanitizedRecords.filter((record) => record.category !== "General Income"),
    [sanitizedRecords],
  );

  const totals = useMemo(() => {
    const totalIncome = sanitizedRecords.reduce((sum, record) => sum + Math.max(record.income, 0), 0);
    const totalExpenses = categoryRecords.reduce(
      (sum, record) => sum + Math.max(Math.abs(record.expenses), 0),
      0,
    );

    return {
      totalIncome: roundToCents(totalIncome),
      totalExpenses: roundToCents(totalExpenses),
      net: roundToCents(totalIncome - totalExpenses),
    };
  }, [sanitizedRecords, categoryRecords]);

  const categoryColors = useMemo(() => {
    const map = new Map<string, string>();
    categoryRecords.forEach((record, index) => {
      map.set(record.category, CATEGORY_COLORS[index % CATEGORY_COLORS.length]);
    });
    return map;
  }, [categoryRecords]);

  const sankeyData = useMemo<SankeyData>(() => {
    if (categoryRecords.length === 0 && !generalIncomeRecord) {
      return { nodes: [], links: [] };
    }

    const nodes: SankeyNode[] = [
      { name: "Total Income", fill: "#10b981" },
      { name: "Total Expenses", fill: "#ef4444" },
    ];

    const links: SankeyLink[] = [];
    const incomeIndex = 0;
    const expenseIndex = 1;

    let generalIndex: number | null = null;
    let surplusIndex: number | null = null;

    const ensureSurplusIndex = () => {
      if (surplusIndex === null) {
        surplusIndex = nodes.length;
        nodes.push({ name: "Net Savings", fill: "#22d3ee" });
      }
      return surplusIndex;
    };

    const generalIncome = Math.max(generalIncomeRecord?.income ?? 0, 0);

    if (generalIncomeRecord && generalIncome > 0) {
      generalIndex = nodes.length;
      nodes.push({ name: generalIncomeRecord.category, fill: "#2dd4bf" });
      links.push({
        source: incomeIndex,
        target: generalIndex,
        value: roundToCents(generalIncome),
      });
    }

    const categoryStartIndex = nodes.length;
    categoryRecords.forEach((record) => {
      nodes.push({
        name: record.category,
        fill: categoryColors.get(record.category),
      });
    });

    const shortfalls = categoryRecords.map((record) => {
      const expense = Math.max(Math.abs(record.expenses), 0);
      const income = Math.max(record.income, 0);
      return Math.max(expense - income, 0);
    });

    const totalShortfall = shortfalls.reduce((sum, value) => sum + value, 0);
    const generalAllocations = categoryRecords.map(() => 0);

    if (generalIndex !== null && generalIncome > 0 && totalShortfall > 0) {
      let allocated = 0;
      shortfalls.forEach((shortfall, index) => {
        if (shortfall <= 0) return;
        const value = roundToCents((generalIncome * shortfall) / totalShortfall);
        generalAllocations[index] = value;
        allocated += value;
      });

      const difference = roundToCents(generalIncome - allocated);
      if (Math.abs(difference) > 0) {
        let maxIndex = 0;
        shortfalls.forEach((value, idx) => {
          if (value > shortfalls[maxIndex]) {
            maxIndex = idx;
          }
        });
        generalAllocations[maxIndex] = roundToCents(generalAllocations[maxIndex] + difference);
      }
    }

    generalAllocations.forEach((value, index) => {
      if (value > 0 && generalIndex !== null) {
        links.push({
          source: generalIndex,
          target: categoryStartIndex + index,
          value: roundToCents(value),
        });
      }
    });

    categoryRecords.forEach((record, index) => {
      const incomeValue = Math.max(record.income, 0);
      const expenseValue = Math.max(Math.abs(record.expenses), 0);
      const categoryIndex = categoryStartIndex + index;

      if (incomeValue > 0) {
        links.push({
          source: incomeIndex,
          target: categoryIndex,
          value: roundToCents(incomeValue),
        });
      }

      if (expenseValue > 0) {
        links.push({
          source: categoryIndex,
          target: expenseIndex,
          value: roundToCents(expenseValue),
        });
      }

      const netPositive = incomeValue + generalAllocations[index] - expenseValue;
      if (netPositive > 0.01) {
        const surplus = ensureSurplusIndex();
        links.push({
          source: categoryIndex,
          target: surplus,
          value: roundToCents(netPositive),
        });
      }
    });

    if (generalIndex !== null) {
      const allocated = generalAllocations.reduce((sum, value) => sum + value, 0);
      const remainder = roundToCents(generalIncome - allocated);
      if (remainder > 0.01) {
        const surplus = ensureSurplusIndex();
        links.push({
          source: generalIndex,
          target: surplus,
          value: roundToCents(remainder),
        });
      }
    }

    return { nodes, links };
  }, [categoryRecords, generalIncomeRecord, categoryColors]);

  const categoryDetails = useMemo<CategoryDetail[]>(() => {
    return categoryRecords
      .map((record) => {
        const income = Math.max(record.income, 0);
        const expense = Math.max(Math.abs(record.expenses), 0);
        return {
          label: record.category,
          income,
          expense,
          net: roundToCents(income - expense),
          color: categoryColors.get(record.category) ?? "#64748b",
        };
      })
      .sort((a, b) => b.expense - a.expense);
  }, [categoryRecords, categoryColors]);

  const barChartData = useMemo(
    () =>
      categoryDetails
        .filter((detail) => detail.income > 0 || detail.expense > 0)
        .map((detail) => ({
          name: detail.label,
          Income: roundToCents(detail.income),
          Expenses: roundToCents(detail.expense),
        })),
    [categoryDetails],
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex h-[720px] w-full items-center justify-center text-gray-400">
          Loading financial data...
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex h-[720px] w-full items-center justify-center text-rose-400">
          {error}
        </div>
      );
    }

    if (categoryDetails.length === 0 && !generalIncomeRecord) {
      return (
        <div className="flex h-[720px] w-full items-center justify-center text-gray-400">
          No financial data available.
        </div>
      );
    }

    return (
      <>
        <div className="h-[420px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <Sankey
              data={sankeyData}
              node={{
                stroke: "#1f2937",
                fill: "#1f2937",
                fillOpacity: 1,
              }}
              link={{ stroke: "#4b5563", strokeOpacity: 0.35 }}
              nodePadding={18}
              margin={{ top: 24, right: 24, bottom: 24, left: 24 }}
            >
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                  color: "#fff",
                }}
                formatter={(value: number) => currencyFormatter.format(value)}
              />
            </Sankey>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 gap-4 pt-6 md:grid-cols-3">
          <SummaryCard
            label="Total Income"
            value={currencyFormatter.format(totals.totalIncome)}
          />
          <SummaryCard
            label="Total Expenses"
            value={currencyFormatter.format(totals.totalExpenses)}
          />
          <SummaryCard
            label="Net Position"
            value={currencyFormatter.format(totals.net)}
            emphasis
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl bg-gray-700/40 p-4">
            <h3 className="text-lg font-semibold text-white">
              Income vs Expenses by Category
            </h3>
            <p className="mt-1 text-sm text-gray-400">
              Compare how much each category contributes to income versus spending.
            </p>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" tick={{ fill: "#9ca3af" }} interval={0} angle={-20} textAnchor="end" height={80} />
                  <YAxis
                    tick={{ fill: "#9ca3af" }}
                    tickFormatter={(value: number) => currencyFormatter.format(value)}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                    formatter={(value: number) => currencyFormatter.format(value)}
                  />
                  <Legend wrapperStyle={{ color: "#e5e7eb" }} />
                  <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl bg-gray-700/40 p-4">
            <h3 className="text-lg font-semibold text-white">Category Breakdown</h3>
            <p className="mt-1 text-sm text-gray-400">
              Understand the net effect of each category with detailed income and expense totals.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3">
              {categoryDetails.map((detail) => (
                <CategoryItem
                  key={detail.label}
                  label={detail.label}
                  income={detail.income}
                  expense={detail.expense}
                  net={detail.net}
                  color={detail.color}
                  formatter={currencyFormatter}
                />
              ))}
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <Card className="bg-gray-800 border-gray-700 p-6">
      {renderContent()}
    </Card>
  );
}

interface SummaryCardProps {
  label: string;
  value: string;
  emphasis?: boolean;
}

function SummaryCard({ label, value, emphasis = false }: SummaryCardProps) {
  return (
    <div className="rounded-xl bg-gray-700/40 p-4">
      <div className="text-sm text-gray-400">{label}</div>
      <div className={`text-xl font-semibold ${emphasis ? "text-emerald-400" : "text-white"}`}>
        {value}
      </div>
    </div>
  );
}

interface CategoryItemProps {
  label: string;
  income: number;
  expense: number;
  net: number;
  color: string;
  formatter: Intl.NumberFormat;
}

function CategoryItem({ label, income, expense, net, color, formatter }: CategoryItemProps) {
  const netColor = net >= 0 ? "text-emerald-400" : "text-rose-400";
  return (
    <div className="rounded-lg bg-gray-700/30 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-gray-200">{label}</span>
        </div>
        <span className={`text-sm font-medium ${netColor}`}>
          {net >= 0 ? "+" : "-"}
          {formatter.format(Math.abs(net))}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-400">
        <div>
          <div className="text-gray-500">Income</div>
          <div className="font-medium text-emerald-400">{formatter.format(income)}</div>
        </div>
        <div className="text-right">
          <div className="text-gray-500">Expenses</div>
          <div className="font-medium text-rose-400">{formatter.format(expense)}</div>
        </div>
      </div>
    </div>
  );
}
