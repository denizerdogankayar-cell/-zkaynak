export type StockRowType = "Kredili" | "Teminat" | "Cari";

export interface StockPosition {
  id: string;
  ticker: string;
  rowType: StockRowType;
  lotT2: number;
  /** Discounted closing price as displayed in 'Kapanış' when Teminat İndirgenmiş is active */
  discountedPrice: number;
  /** Discounted T+2 total value as displayed in 'Tutar (T+2)' */
  discountedTotalT2: number;
  /** Collateral rate (Tem.Kats) as percentage 0..100 (e.g., 100, 90, 75, 50, 0) */
  collateralRate: number;
  /** Optional real market price override, essential when collateralRate === 0 */
  realPriceOverride?: number;
}

export interface PortfolioData {
  /** Settlement date label extracted from T+2 column header, e.g. '24/11' */
  t2DateLabel: string;
  /** T+2 Net Bakiye in TL (negative when using margin credit) */
  netBalanceT2: number;
  /** Optional reference metrics read from bottom summary table */
  reportedCariHisseT2?: number;
  reportedKrediliHisseT2?: number;
  reportedKrediTeminatHisseT2?: number;
  reportedStockTotalT2?: number;
  reportedOverallT2?: number;
  /** Bottom row 'Hisse Genel Özkaynak Oranı %' (may reflect intraday live price) */
  reportedEquityRatioT2?: number;
  /** Whether the screenshot appeared to have 'Teminat İndirgenmiş' enabled */
  isCollateralDiscounted: boolean;
  /** Optional OCR notes from parser */
  extractionNotes?: string;
  positions: StockPosition[];
}

export interface DerivedStockRow {
  position: StockPosition;
  /** Collateral factor k = collateralRate / 100 */
  k: number;
  /** Effective discounted unit price derived from Tutar/Lot if available, else discountedPrice */
  effectiveDiscountedPrice: number;
  /** Effective discounted T+2 total value included in V */
  discountedTotal: number;
  /** True market unit price (effectiveDiscountedPrice / k) */
  realPrice: number;
  /** True market value of T+2 holding (lotT2 * realPrice) */
  realMarketValue: number;
  /** Whole sellable lots (Math.floor(lotT2)) */
  wholeLots: number;
  /** True if 0 < lotT2 < 1 (küsurat lot like 0.<900>) */
  isFractional: boolean;
  /** How much 1 TL of real sale closes the 35% cash gap: 1 - 0.65 * k */
  gapClosePower: number;
  /** Required real-market sale TL to reach 35% using ONLY this row */
  requiredRealSaleTL: number;
  /** Required lots (exact) */
  requiredLotsExact: number;
  /** Required whole lots (ceiled) */
  requiredLotsWhole: number;
  /** Whether available whole lots of this row alone can achieve 35% */
  isSufficientAlone: boolean;
  /** Equity ratio achieved if 100% of this row's sellable holding is sold */
  maxRatioIfAllSold: number;
  /** Remaining cash gap if 100% of this row is sold */
  remainingGapIfAllSold: number;
}

export interface MixedPlanStep {
  rowId: string;
  ticker: string;
  rowType: StockRowType;
  collateralRate: number;
  lotsToSell: number;
  maxWholeLots: number;
  realPrice: number;
  realSaleTL: number;
  discountedRemovedTL: number;
  gapClosedTL: number;
  isFullRowSold: boolean;
}

export interface OptimalMixedPlan {
  steps: MixedPlanStep[];
  totalRealSaleTL: number;
  totalDiscountedRemovedTL: number;
  resultingNetBalance: number;
  resultingDiscountedStock: number;
  resultingOverall: number;
  resultingRatio: number;
  /** Remaining cash deposit required if even selling all eligible stocks cannot reach 35% */
  remainingCashNeeded: number;
  /** Savings compared to selling only the highest-Tem.Kats (100%) stock */
  savingsVsWorstRowTL: number;
  worstRowLabel: string | null;
}

export interface PortfolioAnalysis {
  targetRatio: number;
  /** Total discounted stock value V (sum of active T+2 rows) */
  totalDiscountedStock: number;
  /** Total undiscounted real market value of T+2 stocks */
  totalRealMarketValue: number;
  /** Net Bakiye (T+2) */
  netBalance: number;
  /** OVERALL(TL) = Net Bakiye + Total Discounted Stock */
  overall: number;
  /** Calculated T+2 Equity Ratio (0..Infinity, e.g. 0.2345 = 23.45%) */
  equityRatio: number;
  /** True if already >= 35% (or no stocks & non-negative balance) */
  isCompliant: boolean;
  /** Exact cash deposit needed (TL) to hit 35.00% */
  requiredCash: number;
  /** Derived analysis for every active T+2 row (lotT2 > 0) */
  activeRows: DerivedStockRow[];
  /** Inactive rows (lotT2 === 0, kept for editing visibility) */
  inactiveRows: StockPosition[];
  /** Greedy minimum-TL-sale plan sorted by lowest Tem.Kats first */
  optimalPlan: OptimalMixedPlan;
}

export interface SimulationInputs {
  cashDeposit: number;
  sellLotsByRowId: Record<string, number>;
}

export interface SimulationRowOutcome {
  rowId: string;
  ticker: string;
  rowType: StockRowType;
  collateralRate: number;
  sellLots: number;
  maxLots: number;
  realPrice: number;
  realSaleTL: number;
  discountedRemovedTL: number;
}

export interface SimulationResult {
  cashDeposit: number;
  totalRealSaleTL: number;
  totalDiscountedRemovedTL: number;
  newNetBalance: number;
  newDiscountedStock: number;
  newOverall: number;
  newRatio: number;
  isTargetMet: boolean;
  /** Additional cash still needed to hit 35% (0 if already >= 35%) */
  remainingCashFor35: number;
  /** Excess equity above 35% threshold (0 if below 35%) */
  surplusOver35: number;
  soldRows: SimulationRowOutcome[];
}
