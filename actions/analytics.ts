"use server";

/**
 * analytics.ts — The Logic Engine (Phase 2)
 *
 * Single source of truth for all dashboard data. Every KPI and category
 * number rendered in Phases 3–5 flows through these two functions.
 *
 * Core rules enforced here:
 *
 *   NET SUM RULE
 *     Sum raw transaction amounts first (outflows negative, refunds positive),
 *     allowing them to cancel naturally. Apply Math.abs() only to the final
 *     aggregated total — never to individual transactions.
 *
 *   BUDGET UTILIZATION RULE
 *     A category's actual spend includes BOTH EXPENSE and TRANSFER types
 *     associated with that category. Because type matching is enforced at
 *     data-entry time (Transaction.type mirrors Category.type), grouping by
 *     categoryId is sufficient — no cross-type filtering is required here.
 *
 *   FISCAL CYCLE COMMANDMENT
 *     startDate / endDate are always supplied by the caller (getFiscalPeriod).
 *     This module never computes or assumes calendar months.
 */

import { prisma } from "@/lib/prisma";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface CategoryAggregate {
  id: string;
  name: string;
  /** "INCOME" | "EXPENSE" | "TRANSFER" */
  type: string;
  targetBudget: number;
  isSinkingFund: boolean;
  /** Math.abs(SUM(amounts)) — Net Sum Rule applied. */
  actual: number;
  /** targetBudget - actual. Positive = under budget, negative = over. 0 if unbudgeted. */
  variance: number;
  /** actual / targetBudget. 0 if targetBudget is 0. */
  utilizationPct: number;
}

export interface KPIs {
  /** Math.abs(SUM(EXPENSE + TRANSFER amounts)). How much cash left my accounts. */
  totalIncurredCost: number;
  /** Math.abs(SUM(EXPENSE amounts)) / daysElapsed. What it costs to live per day. */
  dailyBurnRate: number;
  /** SUM(INCOME) + SUM(EXPENSE + TRANSFER). Effectively income minus all outflows. */
  trueSavings: number;
}

// ─── getCategoryAggregates ─────────────────────────────────────────────────────

/**
 * Groups all transactions within [startDate, endDate] by category and applies
 * the Net Sum Rule and Budget Utilization Rule.
 *
 * Returns ALL categories, including those with zero transactions in the period
 * (actual = 0, variance = targetBudget). Callers filter INCOME rows or sinking
 * funds at the call site as needed for their specific view.
 */
export async function getCategoryAggregates(
  startDate: Date,
  endDate: Date,
): Promise<CategoryAggregate[]> {
  const categories = await prisma.category.findMany({
    include: {
      transactions: {
        where: {
          date: { gte: startDate, lte: endDate },
        },
        select: { amount: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return categories.map((cat) => {
    // Net Sum Rule: accumulate signed amounts first so refunds cancel naturally,
    // then take the absolute value of the total.
    const rawSum = cat.transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const actual = Math.abs(rawSum);

    const variance = cat.targetBudget > 0 ? cat.targetBudget - actual : 0;
    const utilizationPct =
      cat.targetBudget > 0 ? actual / cat.targetBudget : 0;

    return {
      id: cat.id,
      name: cat.name,
      type: cat.type,
      targetBudget: cat.targetBudget,
      isSinkingFund: cat.isSinkingFund,
      actual,
      variance,
      utilizationPct,
    };
  });
}

// ─── getKPIs ───────────────────────────────────────────────────────────────────

/**
 * Computes the three headline KPIs for [startDate, endDate].
 *
 * KPI 1 — Total Incurred Cost (All Outflows, OpEx + CapEx)
 *   Math.abs( SUM(amount) WHERE type IN ('EXPENSE', 'TRANSFER') )
 *   Net Sum Rule applied: a TRANSFER refund/reversal reduces the total.
 *
 * KPI 2 — Daily Burn Rate (Strictly OpEx)
 *   Math.abs( SUM(amount) WHERE type = 'EXPENSE' ) / daysElapsed
 *   Excludes ALL TRANSFER (CapEx). daysElapsed is capped at the total period
 *   length so completed-period burn rates don't divide by days that haven't run.
 *
 * KPI 3 — True Savings
 *   SUM(INCOME amounts) + SUM(EXPENSE + TRANSFER amounts)
 *   Outflows are stored as negative values, so addition is equivalent to
 *   income - |allOutflows|. Negative result means net loss for the period.
 */
export async function getKPIs(startDate: Date, endDate: Date): Promise<KPIs> {
  const transactions = await prisma.transaction.findMany({
    where: {
      date: { gte: startDate, lte: endDate },
    },
    select: { amount: true, type: true },
  });

  let incomeSum = 0;
  let outflowSum = 0; // EXPENSE + TRANSFER (negative values)
  let opExSum = 0; //    EXPENSE only      (negative values)

  for (const tx of transactions) {
    if (tx.type === "INCOME") {
      incomeSum += tx.amount;
    } else if (tx.type === "EXPENSE") {
      outflowSum += tx.amount;
      opExSum += tx.amount;
    } else if (tx.type === "TRANSFER") {
      outflowSum += tx.amount;
    }
  }

  // KPI 1 — Total Incurred Cost
  const totalIncurredCost = Math.abs(outflowSum);

  // KPI 2 — Daily Burn Rate
  // daysElapsed is capped at the period length to handle completed periods.
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const totalDays =
    Math.round((endDate.getTime() - startDate.getTime()) / MS_PER_DAY) + 1;
  const rawElapsed =
    Math.floor((Date.now() - startDate.getTime()) / MS_PER_DAY) + 1;
  const daysElapsed = Math.min(Math.max(rawElapsed, 1), totalDays);
  const dailyBurnRate = Math.abs(opExSum) / daysElapsed;

  // KPI 3 — True Savings (outflowSum is negative, so addition is income - |outflows|)
  const trueSavings = incomeSum + outflowSum;

  return { totalIncurredCost, dailyBurnRate, trueSavings };
}
