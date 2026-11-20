import {
  DerivedStockRow,
  MixedPlanStep,
  OptimalMixedPlan,
  PortfolioAnalysis,
  PortfolioData,
  SimulationInputs,
  SimulationResult,
  SimulationRowOutcome,
  StockPosition,
} from "../types/portfolio";

export const TARGET_EQUITY_RATIO = 0.35;

/**
 * Computes exact per-row derived values under the brokerage 'Teminat İndirgenmiş' model.
 * Key precision rule: because 'Kapanış' is rounded to 2 decimals (e.g., 58.01 vs 58.005),
 * when both lotT2 > 0 and discountedTotalT2 > 0, deriving effectiveDiscountedPrice = discountedTotalT2 / lotT2
 * preserves kuruş-level reconciliation with the brokerage summary table.
 */
export function computeDerivedRow(
  position: StockPosition,
  requiredCash: number,
  currentOverall: number,
  currentDiscountedStock: number
): DerivedStockRow {
  const k = Math.max(0, Math.min(100, position.collateralRate)) / 100;
  const lot = Math.max(0, position.lotT2);
  const isFractional = lot > 0 && lot < 1;
  const wholeLots = Math.floor(lot);

  let effectiveDiscountedPrice = Math.max(0, position.discountedPrice);
  let discountedTotal = 0;
  let realPrice = 0;

  if (k > 0) {
    if (lot > 0 && position.discountedTotalT2 > 0) {
      discountedTotal = position.discountedTotalT2;
      effectiveDiscountedPrice = discountedTotal / lot;
    } else {
      discountedTotal = lot * effectiveDiscountedPrice;
    }
    realPrice = effectiveDiscountedPrice / k;
  } else {
    // Tem.Kats = 0 (teminat dışı hisse): does not contribute to collateral total V
    discountedTotal = 0;
    realPrice = Math.max(0, position.realPriceOverride ?? position.discountedPrice);
  }

  const realMarketValue = lot * realPrice;
  const sellableMarketValue = (isFractional ? lot : wholeLots) * realPrice;
  const sellableDiscountedValue = sellableMarketValue * k;

  // Selling S TL (real proceeds) adds +S to cash and removes k*S from V:
  // New overall = E + (1 - k) * S, New V = V - k * S
  // (E + (1 - k)*S) / (V - k*S) = 0.35  =>  S * (1 - 0.65 * k) = 0.35 * V - E = requiredCash
  const gapClosePower = 1 - (1 - TARGET_EQUITY_RATIO) * k; // 1 - 0.65 * k

  const requiredRealSaleTL =
    requiredCash > 0 && gapClosePower > 0 ? requiredCash / gapClosePower : 0;
  const requiredLotsExact = realPrice > 0 ? requiredRealSaleTL / realPrice : 0;
  const requiredLotsWhole =
    requiredLotsExact > 0 ? Math.ceil(requiredLotsExact - 1e-9) : 0;

  const isSufficientAlone =
    requiredCash <= 0 ||
    (!isFractional &&
      realPrice > 0 &&
      requiredLotsWhole <= wholeLots &&
      requiredRealSaleTL <= sellableMarketValue + 0.01);

  // Compute ratio if 100% of sellable lots in this row are sold
  const overallAfterAll =
    currentOverall + sellableMarketValue - sellableDiscountedValue;
  const discountedAfterAll = Math.max(
    0,
    currentDiscountedStock - sellableDiscountedValue
  );

  let maxRatioIfAllSold: number;
  if (discountedAfterAll <= 0.01) {
    maxRatioIfAllSold = overallAfterAll >= 0 ? 1 : 0;
  } else {
    maxRatioIfAllSold = overallAfterAll / discountedAfterAll;
  }

  const remainingGapIfAllSold =
    discountedAfterAll <= 0.01
      ? Math.max(0, -overallAfterAll)
      : Math.max(0, TARGET_EQUITY_RATIO * discountedAfterAll - overallAfterAll);

  return {
    position,
    k,
    effectiveDiscountedPrice,
    discountedTotal,
    realPrice,
    realMarketValue,
    wholeLots,
    isFractional,
    gapClosePower,
    requiredRealSaleTL,
    requiredLotsExact,
    requiredLotsWhole,
    isSufficientAlone,
    maxRatioIfAllSold,
    remainingGapIfAllSold,
  };
}

/**
 * Runs complete T+2 analysis and constructs the minimum-TL-sale automatic mixed plan
 * by prioritizing rows with the lowest Tem.Kats (highest gap-closing power per TL sold).
 */
export function analyzePortfolio(data: PortfolioData): PortfolioAnalysis {
  const activePositions = data.positions.filter((p) => p.lotT2 > 0);
  const inactiveRows = data.positions.filter((p) => p.lotT2 <= 0);

  // First pass: calculate total discounted stock value V
  let totalDiscountedStock = 0;
  let totalRealMarketValue = 0;

  for (const pos of activePositions) {
    const k = Math.max(0, Math.min(100, pos.collateralRate)) / 100;
    let rowDiscounted = 0;
    let rowRealPrice = 0;

    if (k > 0) {
      rowDiscounted =
        pos.discountedTotalT2 > 0
          ? pos.discountedTotalT2
          : pos.lotT2 * pos.discountedPrice;
      const effDiscPrice = pos.lotT2 > 0 ? rowDiscounted / pos.lotT2 : pos.discountedPrice;
      rowRealPrice = effDiscPrice / k;
    } else {
      rowDiscounted = 0;
      rowRealPrice = Math.max(0, pos.realPriceOverride ?? pos.discountedPrice);
    }

    totalDiscountedStock += rowDiscounted;
    totalRealMarketValue += pos.lotT2 * rowRealPrice;
  }

  const netBalance = data.netBalanceT2;
  const overall = netBalance + totalDiscountedStock;

  let equityRatio: number;
  if (totalDiscountedStock <= 0.01) {
    equityRatio = netBalance >= 0 ? 1 : 0;
  } else {
    equityRatio = overall / totalDiscountedStock;
  }

  const requiredCash =
    totalDiscountedStock <= 0.01
      ? Math.max(0, -netBalance)
      : Math.max(0, TARGET_EQUITY_RATIO * totalDiscountedStock - overall);

  const isCompliant = requiredCash <= 0.01;

  // Second pass: per-row detailed analysis
  const activeRows = activePositions.map((pos) =>
    computeDerivedRow(pos, requiredCash, overall, totalDiscountedStock)
  );

  // Automatic optimal mixed plan (lowest collateralRate first, whole-lot sellable rows only)
  const optimalPlan = buildOptimalMixedPlan(
    activeRows,
    netBalance,
    totalDiscountedStock,
    overall,
    requiredCash
  );

  return {
    targetRatio: TARGET_EQUITY_RATIO,
    totalDiscountedStock,
    totalRealMarketValue,
    netBalance,
    overall,
    equityRatio,
    isCompliant,
    requiredCash,
    activeRows,
    inactiveRows,
    optimalPlan,
  };
}

function buildOptimalMixedPlan(
  activeRows: DerivedStockRow[],
  netBalance: number,
  totalDiscountedStock: number,
  overall: number,
  requiredCash: number
): OptimalMixedPlan {
  if (requiredCash <= 0.01) {
    return {
      steps: [],
      totalRealSaleTL: 0,
      totalDiscountedRemovedTL: 0,
      resultingNetBalance: netBalance,
      resultingDiscountedStock: totalDiscountedStock,
      resultingOverall: overall,
      resultingRatio: totalDiscountedStock > 0 ? overall / totalDiscountedStock : 1,
      remainingCashNeeded: 0,
      savingsVsWorstRowTL: 0,
      worstRowLabel: null,
    };
  }

  // Only whole-lot rows (lot >= 1 and valid market price) are auto-recommended
  const eligible = activeRows
    .filter((r) => !r.isFractional && r.wholeLots >= 1 && r.realPrice > 0)
    .sort((a, b) => {
      if (a.k !== b.k) return a.k - b.k; // Lowest Tem.Kats first -> highest gap-closing efficiency!
      return b.realMarketValue - a.realMarketValue;
    });

  let remainingGap = requiredCash;
  const steps: MixedPlanStep[] = [];
  let totalRealSaleTL = 0;
  let totalDiscountedRemovedTL = 0;

  for (const row of eligible) {
    if (remainingGap <= 0.01) break;

    const maxRowGapClose = row.wholeLots * row.realPrice * row.gapClosePower;
    let lotsToSell: number;

    if (maxRowGapClose >= remainingGap - 1e-6) {
      const exactLots = remainingGap / (row.realPrice * row.gapClosePower);
      lotsToSell = Math.min(row.wholeLots, Math.ceil(exactLots - 1e-9));
    } else {
      lotsToSell = row.wholeLots;
    }

    if (lotsToSell <= 0) continue;

    const realSaleTL = lotsToSell * row.realPrice;
    const discountedRemovedTL = realSaleTL * row.k;
    const gapClosedTL = realSaleTL * row.gapClosePower;

    steps.push({
      rowId: row.position.id,
      ticker: row.position.ticker,
      rowType: row.position.rowType,
      collateralRate: row.position.collateralRate,
      lotsToSell,
      maxWholeLots: row.wholeLots,
      realPrice: row.realPrice,
      realSaleTL,
      discountedRemovedTL,
      gapClosedTL,
      isFullRowSold: lotsToSell >= row.wholeLots,
    });

    totalRealSaleTL += realSaleTL;
    totalDiscountedRemovedTL += discountedRemovedTL;
    remainingGap = Math.max(0, remainingGap - gapClosedTL);
  }

  const resultingNetBalance = netBalance + totalRealSaleTL;
  const resultingDiscountedStock = Math.max(
    0,
    totalDiscountedStock - totalDiscountedRemovedTL
  );
  const resultingOverall = resultingNetBalance + resultingDiscountedStock;
  const resultingRatio =
    resultingDiscountedStock <= 0.01
      ? resultingOverall >= 0
        ? 1
        : 0
      : resultingOverall / resultingDiscountedStock;

  const remainingCashNeeded =
    resultingDiscountedStock <= 0.01
      ? Math.max(0, -resultingNetBalance)
      : Math.max(
          0,
          TARGET_EQUITY_RATIO * resultingDiscountedStock - resultingOverall
        );

  // Compare against the highest-Tem.Kats row that is sufficient alone (usually Tem.Kats 100)
  const sufficientRows = eligible.filter((r) => r.isSufficientAlone);
  let savingsVsWorstRowTL = 0;
  let worstRowLabel: string | null = null;

  if (sufficientRows.length > 0 && remainingCashNeeded <= 0.01) {
    const worst = sufficientRows.reduce((prev, curr) =>
      curr.requiredRealSaleTL > prev.requiredRealSaleTL ? curr : prev
    );
    const diff = worst.requiredRealSaleTL - totalRealSaleTL;
    if (diff > 50) {
      savingsVsWorstRowTL = diff;
      worstRowLabel = `${worst.position.ticker} (%${worst.position.collateralRate})`;
    }
  }

  return {
    steps,
    totalRealSaleTL,
    totalDiscountedRemovedTL,
    resultingNetBalance,
    resultingDiscountedStock,
    resultingOverall,
    resultingRatio,
    remainingCashNeeded,
    savingsVsWorstRowTL,
    worstRowLabel,
  };
}

/**
 * Evaluates a user-configured mixed simulation (cash deposit + manual lot sales per row).
 */
export function runSimulation(
  analysis: PortfolioAnalysis,
  inputs: SimulationInputs
): SimulationResult {
  const cashDeposit = Math.max(0, Number.isFinite(inputs.cashDeposit) ? inputs.cashDeposit : 0);
  let totalRealSaleTL = 0;
  let totalDiscountedRemovedTL = 0;
  const soldRows: SimulationRowOutcome[] = [];

  for (const row of analysis.activeRows) {
    const rawLots = inputs.sellLotsByRowId[row.position.id] ?? 0;
    const maxLots = row.isFractional ? row.position.lotT2 : row.wholeLots;
    const sellLots = Math.max(0, Math.min(maxLots, Number.isFinite(rawLots) ? rawLots : 0));

    if (sellLots > 0) {
      const realSaleTL = sellLots * row.realPrice;
      const discountedRemovedTL = realSaleTL * row.k;
      totalRealSaleTL += realSaleTL;
      totalDiscountedRemovedTL += discountedRemovedTL;

      soldRows.push({
        rowId: row.position.id,
        ticker: row.position.ticker,
        rowType: row.position.rowType,
        collateralRate: row.position.collateralRate,
        sellLots,
        maxLots,
        realPrice: row.realPrice,
        realSaleTL,
        discountedRemovedTL,
      });
    }
  }

  const newNetBalance = analysis.netBalance + cashDeposit + totalRealSaleTL;
  const newDiscountedStock = Math.max(
    0,
    analysis.totalDiscountedStock - totalDiscountedRemovedTL
  );
  const newOverall = newNetBalance + newDiscountedStock;

  let newRatio: number;
  if (newDiscountedStock <= 0.01) {
    newRatio = newOverall >= 0 ? 1 : 0;
  } else {
    newRatio = newOverall / newDiscountedStock;
  }

  const remainingCashFor35 =
    newDiscountedStock <= 0.01
      ? Math.max(0, -newNetBalance)
      : Math.max(0, TARGET_EQUITY_RATIO * newDiscountedStock - newOverall);

  const surplusOver35 =
    newDiscountedStock <= 0.01
      ? Math.max(0, newNetBalance)
      : Math.max(0, newOverall - TARGET_EQUITY_RATIO * newDiscountedStock);

  return {
    cashDeposit,
    totalRealSaleTL,
    totalDiscountedRemovedTL,
    newNetBalance,
    newDiscountedStock,
    newOverall,
    newRatio,
    isTargetMet: remainingCashFor35 <= 0.01,
    remainingCashFor35,
    surplusOver35,
    soldRows,
  };
}

// Turkish locale formatters
export function formatTL(value: number, showSign = false): string {
  const abs = Math.abs(value);
  const formatted = new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs);
  if (value < -0.004) return `-${formatted} TL`;
  if (showSign && value > 0.004) return `+${formatted} TL`;
  return `${formatted} TL`;
}

export function formatNumber(value: number, maxDecimals = 2): string {
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  }).format(value);
}

export function formatLots(value: number): string {
  if (value > 0 && value < 1) {
    return new Intl.NumberFormat("tr-TR", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(value);
  }
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

export function formatPercent(ratio: number, decimals = 2): string {
  const pct = ratio * 100;
  if (!Number.isFinite(pct)) return "%100+";
  return `%${new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(pct)}`;
}

/**
 * Generates clean, client-ready Turkish summary text for WhatsApp / SMS / Email.
 */
export function buildClientSummaryText(
  data: PortfolioData,
  analysis: PortfolioAnalysis,
  mode: "standard" | "simulator",
  simResult?: SimulationResult
): string {
  const dateTag = data.t2DateLabel ? `T+2 (${data.t2DateLabel})` : "T+2";
  const lines: string[] = [];

  lines.push(`Özkaynak Tamamlama Özeti — ${dateTag}`);
  lines.push("----------------------------------------");
  lines.push(`Mevcut T+2 Özkaynak Oranı: ${formatPercent(analysis.equityRatio)}`);
  lines.push(`T+2 Net Bakiye: ${formatTL(analysis.netBalance)}`);
  lines.push(`İndirgenmiş Hisse Toplamı: ${formatTL(analysis.totalDiscountedStock)}`);
  lines.push(`OVERALL (Özkaynak): ${formatTL(analysis.overall)}`);

  if (analysis.isCompliant) {
    lines.push("");
    lines.push("Durum: Özkaynak oranınız %35 hedefinin üzerindedir. Tamamlama gerekmemektedir.");
    return lines.join("\n");
  }

  lines.push("");

  if (mode === "simulator" && simResult) {
    lines.push("Özel Karma Tamamlama Senaryosu:");
    if (simResult.cashDeposit > 0) {
      lines.push(`• Nakit Yatırma: ${formatTL(simResult.cashDeposit)}`);
    }
    for (const s of simResult.soldRows) {
      lines.push(
        `• ${s.ticker} (${s.rowType} / Tem.Kats %${s.collateralRate}): ${formatLots(s.sellLots)} lot satış (~${formatTL(s.realSaleTL)})`
      );
    }
    if (simResult.cashDeposit === 0 && simResult.soldRows.length === 0) {
      lines.push("• Henüz simülasyon aksiyonu seçilmedi.");
    }
    lines.push("");
    lines.push(`İşlem Sonrası Tahmini T+2 Oranı: ${formatPercent(simResult.newRatio)}`);
    if (!simResult.isTargetMet) {
      lines.push(`%35 İçin Kalan Nakit İhtiyacı: ${formatTL(simResult.remainingCashFor35)}`);
    } else {
      lines.push("Hedef Durumu: %35 özkaynak oranı sağlanmaktadır.");
    }
    return lines.join("\n");
  }

  // Standard summary: Cash option + Optimal mixed plan + Per-stock alternatives
  lines.push("Hedef: %35,00 Özkaynak Oranı İçin Seçenekler");
  lines.push("");
  lines.push(`1) Yalnızca Nakit Yatırma: ${formatTL(analysis.requiredCash)}`);

  const plan = analysis.optimalPlan;
  if (plan.steps.length > 0) {
    lines.push("");
    lines.push(
      `2) En Az Satışlı Önerilen Plan (Toplam ${formatTL(plan.totalRealSaleTL)} satış):`
    );
    for (const step of plan.steps) {
      lines.push(
        `   • ${step.ticker} (${step.rowType} / Tem.Kats %${step.collateralRate}): ${formatLots(step.lotsToSell)} lot (~${formatTL(step.realSaleTL)})`
      );
    }
    if (plan.remainingCashNeeded > 0.01) {
      lines.push(`   • Ek Nakit Yatırma: ${formatTL(plan.remainingCashNeeded)}`);
    }
    lines.push(`   → İşlem sonrası T+2 oran: ${formatPercent(plan.resultingRatio)}`);
  }

  const wholeRows = analysis.activeRows.filter((r) => !r.isFractional && r.realPrice > 0);
  if (wholeRows.length > 0) {
    lines.push("");
    lines.push("3) Tekil Hisse Satış Karşılaştırması:");
    for (const row of wholeRows) {
      if (row.isSufficientAlone) {
        lines.push(
          `   • Sadece ${row.position.ticker} (%${row.position.collateralRate} ${row.position.rowType}): ${formatLots(row.requiredLotsWhole)} lot (~${formatTL(row.requiredRealSaleTL)}) — Yeterli`
        );
      } else {
        lines.push(
          `   • Sadece ${row.position.ticker} (%${row.position.collateralRate} ${row.position.rowType}): Tamamı (${formatLots(row.wholeLots)} lot / ${formatTL(row.realMarketValue)}) satılsa oran ${formatPercent(row.maxRatioIfAllSold)} olur (Tek başına yetersiz)`
        );
      }
    }
  }

  return lines.join("\n");
}
