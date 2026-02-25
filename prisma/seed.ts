/**
 * seed.ts — Realistic Sample Data for Development & Testing
 *
 * Covers 4 complete fiscal periods ending before today (2026-02-25):
 *   Period 1:  Sep 20 – Oct 19 2025
 *   Period 2:  Oct 20 – Nov 19 2025
 *   Period 3:  Nov 20 – Dec 19 2025
 *   Period 4:  Dec 20 – Jan 19 2026
 *   Current:   Jan 20 – Feb 19 2026  (partially seeded — in-flight)
 *
 * Sign Convention:
 *   Outflows → NEGATIVE   e.g. groceries: -320.00
 *   Inflows  → POSITIVE   e.g. salary:   +7500.00
 *
 * Data is designed to exercise every Commandment:
 *   ✓ Net Sum Rule: "Dining" has a refund in one period
 *   ✓ OpEx vs CapEx: Investment TRANSFERs excluded from burn rate
 *   ✓ Budget Utilization: Investment category uses TRANSFER type
 *   ✓ Sinking Funds: "Travel" is isSinkingFund=true
 *   ✓ Income Isolation: Salary/Dividends tagged INCOME
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── Seed helpers ─────────────────────────────────────────────────────────────

function d(dateStr: string): Date {
  return new Date(dateStr + "T12:00:00.000Z");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding database...");

  // ── 1. Wipe existing data (safe for dev resets) ──────────────────────────
  await prisma.transaction.deleteMany();
  await prisma.category.deleteMany();
  await prisma.asset.deleteMany();

  // ── 2. Assets ─────────────────────────────────────────────────────────────
  const [dbs, invest, cpf, crypto, property, creditCard] = await Promise.all([
    prisma.asset.create({
      data: { name: "DBS Multiplier", type: "CASH", balance: 28_450.00 },
    }),
    prisma.asset.create({
      data: { name: "Tiger Brokers", type: "INVESTMENT", balance: 54_200.00 },
    }),
    prisma.asset.create({
      data: { name: "CPF OA", type: "CPF", balance: 87_100.00 },
    }),
    prisma.asset.create({
      data: { name: "Crypto (BTC/ETH)", type: "CRYPTO", balance: 12_800.00 },
    }),
    prisma.asset.create({
      data: { name: "HDB Resale Value", type: "PROPERTY", balance: 520_000.00 },
    }),
    prisma.asset.create({
      data: { name: "UOB Credit Card", type: "DEBT", balance: 1_240.00 },
    }),
  ]);

  // ── 3. Categories ─────────────────────────────────────────────────────────
  const [
    catSalary,
    catDividends,
    catGroceries,
    catDining,
    catTransport,
    catUtilities,
    catSubscriptions,
    catHealthcare,
    catInvestment,
    catTravel,
    catShopping,
    catCreditCardPayment,
  ] = await Promise.all([
    // INCOME
    prisma.category.create({
      data: { name: "Salary", type: "INCOME", targetBudget: 0, isSinkingFund: false },
    }),
    prisma.category.create({
      data: { name: "Dividends", type: "INCOME", targetBudget: 0, isSinkingFund: false },
    }),

    // EXPENSE
    prisma.category.create({
      data: { name: "Groceries", type: "EXPENSE", targetBudget: 450, isSinkingFund: false },
    }),
    prisma.category.create({
      data: { name: "Dining Out", type: "EXPENSE", targetBudget: 350, isSinkingFund: false },
    }),
    prisma.category.create({
      data: { name: "Transport", type: "EXPENSE", targetBudget: 200, isSinkingFund: false },
    }),
    prisma.category.create({
      data: { name: "Utilities & Bills", type: "EXPENSE", targetBudget: 250, isSinkingFund: false },
    }),
    prisma.category.create({
      data: { name: "Subscriptions", type: "EXPENSE", targetBudget: 100, isSinkingFund: false },
    }),
    prisma.category.create({
      data: { name: "Healthcare", type: "EXPENSE", targetBudget: 150, isSinkingFund: false },
    }),

    // TRANSFER — Investment (CapEx: excluded from burn rate, counts for budget utilization)
    prisma.category.create({
      data: { name: "Investment", type: "TRANSFER", targetBudget: 2_000, isSinkingFund: false },
    }),

    // EXPENSE — Sinking Fund (accrual; excluded from savings heroes/villains)
    prisma.category.create({
      data: { name: "Travel Fund", type: "EXPENSE", targetBudget: 500, isSinkingFund: true },
    }),

    // EXPENSE
    prisma.category.create({
      data: { name: "Shopping", type: "EXPENSE", targetBudget: 300, isSinkingFund: false },
    }),

    // TRANSFER — Credit Card Payment
    prisma.category.create({
      data: { name: "Credit Card Payment", type: "TRANSFER", targetBudget: 0, isSinkingFund: false },
    }),
  ]);

  // ── 4. Transactions ───────────────────────────────────────────────────────
  // Seeding 5 fiscal periods worth of data.

  type TxInput = Parameters<typeof prisma.transaction.create>[0]["data"];

  const transactions: TxInput[] = [
    // ═══════════════════════════════════════════════════════════════════════
    // PERIOD 1: Sep 20 – Oct 19 2025
    // ═══════════════════════════════════════════════════════════════════════

    // Income
    { date: d("2025-09-25"), amount: 7_500, type: "INCOME", description: "Monthly Salary", categoryId: catSalary.id, fromAssetId: null, toAssetId: dbs.id },
    { date: d("2025-10-05"), amount: 120, type: "INCOME", description: "Tiger Brokers Dividend", categoryId: catDividends.id, fromAssetId: null, toAssetId: dbs.id },

    // OpEx (EXPENSE)
    { date: d("2025-09-22"), amount: -380, type: "EXPENSE", description: "FairPrice groceries", categoryId: catGroceries.id, fromAssetId: dbs.id, toAssetId: null },
    { date: d("2025-10-04"), amount: -85, type: "EXPENSE", description: "FairPrice top-up", categoryId: catGroceries.id, fromAssetId: dbs.id, toAssetId: null },
    { date: d("2025-09-24"), amount: -290, type: "EXPENSE", description: "Dining - restaurants", categoryId: catDining.id, fromAssetId: dbs.id, toAssetId: null },
    { date: d("2025-10-10"), amount: -75, type: "EXPENSE", description: "Lunch team outing", categoryId: catDining.id, fromAssetId: dbs.id, toAssetId: null },
    { date: d("2025-10-01"), amount: 45, type: "EXPENSE", description: "Dining refund - cancelled reservation", categoryId: catDining.id, fromAssetId: null, toAssetId: dbs.id },
    { date: d("2025-09-21"), amount: -145, type: "EXPENSE", description: "MRT & Grab", categoryId: catTransport.id, fromAssetId: dbs.id, toAssetId: null },
    { date: d("2025-09-28"), amount: -210, type: "EXPENSE", description: "SP Group electricity + water", categoryId: catUtilities.id, fromAssetId: dbs.id, toAssetId: null },
    { date: d("2025-09-20"), amount: -85, type: "EXPENSE", description: "Netflix, Spotify, iCloud", categoryId: catSubscriptions.id, fromAssetId: dbs.id, toAssetId: null },
    { date: d("2025-10-12"), amount: -95, type: "EXPENSE", description: "GP + pharmacy", categoryId: catHealthcare.id, fromAssetId: dbs.id, toAssetId: null },
    { date: d("2025-10-08"), amount: -180, type: "EXPENSE", description: "Uniqlo x2 shirts", categoryId: catShopping.id, fromAssetId: dbs.id, toAssetId: null },

    // Sinking Fund accrual (EXPENSE + isSinkingFund)
    { date: d("2025-10-01"), amount: -500, type: "EXPENSE", description: "Travel Fund accrual", categoryId: catTravel.id, fromAssetId: dbs.id, toAssetId: null },

    // CapEx (TRANSFER — excluded from burn rate)
    { date: d("2025-09-28"), amount: -2_000, type: "TRANSFER", description: "Tiger Brokers top-up", categoryId: catInvestment.id, fromAssetId: dbs.id, toAssetId: invest.id },
    { date: d("2025-10-15"), amount: -1_240, type: "TRANSFER", description: "UOB CC full payment", categoryId: catCreditCardPayment.id, fromAssetId: dbs.id, toAssetId: creditCard.id },

    // ═══════════════════════════════════════════════════════════════════════
    // PERIOD 2: Oct 20 – Nov 19 2025
    // ═══════════════════════════════════════════════════════════════════════

    { date: d("2025-10-25"), amount: 7_500, type: "INCOME", description: "Monthly Salary", categoryId: catSalary.id, fromAssetId: null, toAssetId: dbs.id },
    { date: d("2025-10-22"), amount: -420, type: "EXPENSE", description: "FairPrice weekly shops", categoryId: catGroceries.id, fromAssetId: dbs.id, toAssetId: null },
    { date: d("2025-11-05"), amount: -60, type: "EXPENSE", description: "Cold Storage", categoryId: catGroceries.id, fromAssetId: dbs.id, toAssetId: null },
    { date: d("2025-10-26"), amount: -320, type: "EXPENSE", description: "Dining out", categoryId: catDining.id, fromAssetId: dbs.id, toAssetId: null },
    { date: d("2025-10-23"), amount: -130, type: "EXPENSE", description: "EZ-Link top-up + Grab", categoryId: catTransport.id, fromAssetId: dbs.id, toAssetId: null },
    { date: d("2025-11-01"), amount: -205, type: "EXPENSE", description: "SP Group + Singtel", categoryId: catUtilities.id, fromAssetId: dbs.id, toAssetId: null },
    { date: d("2025-10-20"), amount: -85, type: "EXPENSE", description: "Subscriptions", categoryId: catSubscriptions.id, fromAssetId: dbs.id, toAssetId: null },
    { date: d("2025-11-10"), amount: -300, type: "EXPENSE", description: "11.11 Shopee haul", categoryId: catShopping.id, fromAssetId: dbs.id, toAssetId: null },
    { date: d("2025-10-20"), amount: -500, type: "EXPENSE", description: "Travel Fund accrual", categoryId: catTravel.id, fromAssetId: dbs.id, toAssetId: null },
    { date: d("2025-10-27"), amount: -2_000, type: "TRANSFER", description: "Tiger Brokers top-up", categoryId: catInvestment.id, fromAssetId: dbs.id, toAssetId: invest.id },

    // ═══════════════════════════════════════════════════════════════════════
    // PERIOD 3: Nov 20 – Dec 19 2025
    // ═══════════════════════════════════════════════════════════════════════

    { date: d("2025-11-25"), amount: 7_500, type: "INCOME", description: "Monthly Salary", categoryId: catSalary.id, fromAssetId: null, toAssetId: dbs.id },
    { date: d("2025-11-22"), amount: -480, type: "EXPENSE", description: "FairPrice — stocked up for December", categoryId: catGroceries.id, fromAssetId: dbs.id, toAssetId: null },
    { date: d("2025-12-05"), amount: -400, type: "EXPENSE", description: "Dining — Christmas parties", categoryId: catDining.id, fromAssetId: dbs.id, toAssetId: null },
    { date: d("2025-12-10"), amount: -90, type: "EXPENSE", description: "Taxi + EZLink", categoryId: catTransport.id, fromAssetId: dbs.id, toAssetId: null },
    { date: d("2025-11-28"), amount: -220, type: "EXPENSE", description: "Utilities Dec", categoryId: catUtilities.id, fromAssetId: dbs.id, toAssetId: null },
    { date: d("2025-11-20"), amount: -85, type: "EXPENSE", description: "Subscriptions", categoryId: catSubscriptions.id, fromAssetId: dbs.id, toAssetId: null },
    { date: d("2025-12-03"), amount: -250, type: "EXPENSE", description: "Christmas gifts", categoryId: catShopping.id, fromAssetId: dbs.id, toAssetId: null },
    { date: d("2025-12-15"), amount: -120, type: "EXPENSE", description: "Dental checkup", categoryId: catHealthcare.id, fromAssetId: dbs.id, toAssetId: null },
    // Sinking fund deployment — actually used the travel fund this period (reduced accrual)
    { date: d("2025-11-20"), amount: -200, type: "EXPENSE", description: "Travel Fund — Bali flight deposit", categoryId: catTravel.id, fromAssetId: dbs.id, toAssetId: null },
    { date: d("2025-11-28"), amount: -2_000, type: "TRANSFER", description: "Tiger Brokers top-up", categoryId: catInvestment.id, fromAssetId: dbs.id, toAssetId: invest.id },

    // ═══════════════════════════════════════════════════════════════════════
    // PERIOD 4: Dec 20 – Jan 19 2026
    // ═══════════════════════════════════════════════════════════════════════

    { date: d("2025-12-25"), amount: 7_500, type: "INCOME", description: "Monthly Salary", categoryId: catSalary.id, fromAssetId: null, toAssetId: dbs.id },
    { date: d("2026-01-05"), amount: 240, type: "INCOME", description: "Tiger Brokers Quarterly Dividend", categoryId: catDividends.id, fromAssetId: null, toAssetId: dbs.id },
    { date: d("2025-12-22"), amount: -510, type: "EXPENSE", description: "FairPrice New Year shop", categoryId: catGroceries.id, fromAssetId: dbs.id, toAssetId: null },
    { date: d("2026-01-03"), amount: -380, type: "EXPENSE", description: "New Year dining", categoryId: catDining.id, fromAssetId: dbs.id, toAssetId: null },
    { date: d("2025-12-28"), amount: -160, type: "EXPENSE", description: "Transport Dec-Jan", categoryId: catTransport.id, fromAssetId: dbs.id, toAssetId: null },
    { date: d("2026-01-02"), amount: -230, type: "EXPENSE", description: "Utilities + starhub", categoryId: catUtilities.id, fromAssetId: dbs.id, toAssetId: null },
    { date: d("2025-12-20"), amount: -85, type: "EXPENSE", description: "Subscriptions", categoryId: catSubscriptions.id, fromAssetId: dbs.id, toAssetId: null },
    { date: d("2026-01-10"), amount: -420, type: "EXPENSE", description: "CNY shopping — clothes + gifts", categoryId: catShopping.id, fromAssetId: dbs.id, toAssetId: null },
    { date: d("2025-12-20"), amount: -500, type: "EXPENSE", description: "Travel Fund accrual", categoryId: catTravel.id, fromAssetId: dbs.id, toAssetId: null },
    { date: d("2025-12-27"), amount: -2_000, type: "TRANSFER", description: "Tiger Brokers top-up", categoryId: catInvestment.id, fromAssetId: dbs.id, toAssetId: invest.id },

    // ═══════════════════════════════════════════════════════════════════════
    // CURRENT PERIOD (in-flight): Jan 20 – Feb 19 2026
    // ═══════════════════════════════════════════════════════════════════════

    { date: d("2026-01-25"), amount: 7_500, type: "INCOME", description: "Monthly Salary", categoryId: catSalary.id, fromAssetId: null, toAssetId: dbs.id },
    { date: d("2026-01-22"), amount: -390, type: "EXPENSE", description: "FairPrice weekly", categoryId: catGroceries.id, fromAssetId: dbs.id, toAssetId: null },
    { date: d("2026-02-05"), amount: -55, type: "EXPENSE", description: "Sheng Siong", categoryId: catGroceries.id, fromAssetId: dbs.id, toAssetId: null },
    { date: d("2026-02-01"), amount: -280, type: "EXPENSE", description: "CNY reunion dinners", categoryId: catDining.id, fromAssetId: dbs.id, toAssetId: null },
    { date: d("2026-02-10"), amount: -60, type: "EXPENSE", description: "Grab rides CNY weekend", categoryId: catTransport.id, fromAssetId: dbs.id, toAssetId: null },
    { date: d("2026-01-28"), amount: -215, type: "EXPENSE", description: "Utilities Jan", categoryId: catUtilities.id, fromAssetId: dbs.id, toAssetId: null },
    { date: d("2026-01-20"), amount: -85, type: "EXPENSE", description: "Subscriptions", categoryId: catSubscriptions.id, fromAssetId: dbs.id, toAssetId: null },
    { date: d("2026-01-20"), amount: -500, type: "EXPENSE", description: "Travel Fund accrual", categoryId: catTravel.id, fromAssetId: dbs.id, toAssetId: null },
    { date: d("2026-01-27"), amount: -2_000, type: "TRANSFER", description: "Tiger Brokers top-up", categoryId: catInvestment.id, fromAssetId: dbs.id, toAssetId: invest.id },
  ];

  // Insert all transactions
  for (const tx of transactions) {
    await prisma.transaction.create({ data: tx as Parameters<typeof prisma.transaction.create>[0]["data"] });
  }

  console.log(`✅ Seeded:`);
  console.log(`   Assets:       6`);
  console.log(`   Categories:   12`);
  console.log(`   Transactions: ${transactions.length}`);
  console.log(`\n📅 Fiscal periods covered:`);
  console.log(`   Sep 20 – Oct 19 2025`);
  console.log(`   Oct 20 – Nov 19 2025`);
  console.log(`   Nov 20 – Dec 19 2025`);
  console.log(`   Dec 20 – Jan 19 2026`);
  console.log(`   Jan 20 – Feb 19 2026  (current, in-flight)`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
