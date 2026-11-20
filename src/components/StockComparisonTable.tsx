import React from "react";
import { ArrowRight, CheckCircle2, Info, SlidersHorizontal } from "lucide-react";
import { DerivedStockRow, PortfolioAnalysis } from "../types/portfolio";
import {
  formatLots,
  formatNumber,
  formatPercent,
  formatTL,
} from "../utils/equityMath";

interface StockComparisonTableProps {
  analysis: PortfolioAnalysis;
  onTransferSingleRowToSim: (row: DerivedStockRow) => void;
  onApplyOptimalToSimulator: () => void;
}

export const StockComparisonTable: React.FC<StockComparisonTableProps> = ({
  analysis,
  onTransferSingleRowToSim,
  onApplyOptimalToSimulator,
}) => {
  const { activeRows, optimalPlan, isCompliant } = analysis;

  return (
    <div className="space-y-6">
      {/* 1. Automatic Optimal Mixed-Sale Plan */}
      {!isCompliant && optimalPlan.steps.length > 0 && (
        <section
          aria-label="Otomatik En Az Satışlı Karma Tamamlama Planı"
          className="bg-white border border-slate-200 rounded-xl overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                Otomatik Karma Tamamlama Önerisi (En Az Satış)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Düşük teminat katsayılı hisseler 1 TL satışta daha fazla açık kapattığı için
                önceliklendirilir; toplam hisse satışı en aza iner.
              </p>
            </div>
            <button
              type="button"
              onClick={onApplyOptimalToSimulator}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-[#0F3D6E] bg-[#0F3D6E]/5 hover:bg-[#0F3D6E]/10 border border-[#0F3D6E]/25 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Bu Planı Simülatöre Aktar</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="py-2.5 pl-6 pr-3">Sıra & Menkul</th>
                  <th className="py-2.5 px-3 text-right">Tem.Kats</th>
                  <th className="py-2.5 px-3 text-right">Satılacak Lot</th>
                  <th className="py-2.5 px-3 text-right">Gerçek Fiyat</th>
                  <th className="py-2.5 px-3 text-right">Gerçek Satış Tutarı</th>
                  <th className="py-2.5 pl-3 pr-6 text-right">Kapatılan %35 Açığı</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {optimalPlan.steps.map((step, index) => (
                  <tr key={step.rowId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 pl-6 pr-3">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-xs text-slate-400 w-4">
                          0{index + 1}
                        </span>
                        <div>
                          <span className="font-semibold text-slate-900">
                            {step.ticker}
                          </span>
                          <span className="text-xs text-slate-500 ml-2">
                            · {step.rowType}
                            {step.isFullRowSold ? " · Tamamı" : " · Kısmi"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">
                      %{step.collateralRate}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {formatLots(step.lotsToSell)}{" "}
                      <span className="text-xs font-normal text-slate-400">
                        / {formatLots(step.maxWholeLots)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-600">
                      {formatNumber(step.realPrice, 2)} TL
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-[#0F3D6E]">
                      {formatTL(step.realSaleTL)}
                    </td>
                    <td className="py-3 pl-3 pr-6 text-right font-mono tabular-nums text-[#15803D]">
                      +{formatTL(step.gapClosedTL)}
                    </td>
                  </tr>
                ))}

                {optimalPlan.remainingCashNeeded > 0.01 && (
                  <tr className="bg-amber-50/40">
                    <td className="py-3 pl-6 pr-3" colSpan={4}>
                      <span className="font-semibold text-amber-900">
                        Kalan Açık İçin Ek Nakit Yatırma
                      </span>
                      <span className="text-xs text-amber-700 ml-2">
                        · Tüm hisseler satılsa dahi bakiye açığı kaldığı için
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-amber-900">
                      {formatTL(optimalPlan.remainingCashNeeded)}
                    </td>
                    <td className="py-3 pl-3 pr-6 text-right font-mono tabular-nums text-amber-800">
                      +{formatTL(optimalPlan.remainingCashNeeded)}
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50/80 text-xs sm:text-sm">
                  <td className="py-3 pl-6 pr-3 font-semibold text-slate-900" colSpan={4}>
                    Plan Toplamı · İşlem Sonrası T+2 Oran:{" "}
                    <span className="font-mono tabular-nums text-[#15803D]">
                      {formatPercent(optimalPlan.resultingRatio)}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-slate-900">
                    {formatTL(optimalPlan.totalRealSaleTL)}
                  </td>
                  <td className="py-3 pl-3 pr-6 text-right font-mono tabular-nums font-semibold text-[#15803D]">
                    Hedef Sağlandı
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}

      {/* 2. Per-Stock Individual Comparison Table */}
      <section
        aria-label="Hisse Bazlı Tekil Satış Kıyaslaması"
        className="bg-white border border-slate-200 rounded-xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              Hisse Bazlı Tekil Satış Karşılaştırması (T+2)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Her hisse satırı ayrı hesaplanır: “Sadece bu satırdan satsam %35 için kaç TL ve kaç
              lot gerekir?”
            </p>
          </div>
          <span className="text-xs text-slate-500">
            {activeRows.length} aktif T+2 pozisyon satırı
          </span>
        </div>

        {activeRows.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            T+2 takas gününde lot bulunan hisse satırı yok. Veri Düzenle sekmesinden pozisyon
            ekleyebilirsiniz.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[920px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="py-3 pl-6 pr-3">Menkul</th>
                  <th className="py-3 px-3 text-right">Tem.Kats</th>
                  <th className="py-3 px-3 text-right">1 TL Satış Gücü</th>
                  <th className="py-3 px-3 text-right">Gerçek Fiyat / T+2 Lot</th>
                  <th className="py-3 px-3 text-right">Mevcut Değer (Gerçek / İnd.)</th>
                  <th className="py-3 px-3 text-right">%35 İçin Gereken Satış</th>
                  <th className="py-3 px-3">Tekil Yeterlilik</th>
                  <th className="py-3 pl-3 pr-6 text-right">Simülatör</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {activeRows.map((row) => {
                  const { position } = row;
                  return (
                    <tr
                      key={position.id}
                      className="hover:bg-slate-50/70 transition-colors align-middle"
                    >
                      {/* Ticker + unboxed metadata */}
                      <td className="py-3.5 pl-6 pr-3">
                        <div className="font-semibold text-slate-900">
                          {position.ticker}
                        </div>
                        <div className="text-xs text-slate-500">
                          {position.rowType}
                          {row.isFractional ? " · Küsurat" : ""}
                        </div>
                      </td>

                      {/* Collateral rate */}
                      <td className="py-3.5 px-3 text-right font-mono tabular-nums font-medium text-slate-800">
                        %{position.collateralRate}
                      </td>

                      {/* Gap-closing power per 1 TL */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="font-mono tabular-nums text-slate-800">
                          {formatNumber(row.gapClosePower, 3)} TL
                        </div>
                        <div className="text-xs text-slate-400 font-mono tabular-nums">
                          ×{formatNumber(1 / row.gapClosePower, 2)} çarpan
                        </div>
                      </td>

                      {/* Real price & T+2 lot */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="font-mono tabular-nums text-slate-900">
                          {row.realPrice > 0
                            ? `${formatNumber(row.realPrice, 2)} TL`
                            : "Fiyat girin"}
                        </div>
                        <div className="text-xs text-slate-500 font-mono tabular-nums">
                          {formatLots(position.lotT2)} lot
                        </div>
                      </td>

                      {/* Real vs Discounted value */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="font-mono tabular-nums text-slate-900">
                          {formatTL(row.realMarketValue)}
                        </div>
                        <div className="text-xs text-slate-400 font-mono tabular-nums">
                          İnd: {formatTL(row.discountedTotal)}
                        </div>
                      </td>

                      {/* Required sale for 35% */}
                      <td className="py-3.5 px-3 text-right">
                        {isCompliant ? (
                          <span className="font-mono tabular-nums text-xs text-slate-400">
                            Gerekmiyor
                          </span>
                        ) : row.isFractional ? (
                          <span className="text-xs text-slate-400">
                            1 lot altı küsurat
                          </span>
                        ) : row.realPrice <= 0 ? (
                          <span className="text-xs text-amber-700">
                            Gerçek fiyat eksik
                          </span>
                        ) : (
                          <>
                            <div className="font-mono tabular-nums font-semibold text-slate-900">
                              {formatTL(row.requiredRealSaleTL)}
                            </div>
                            <div className="text-xs text-slate-500 font-mono tabular-nums">
                              {formatLots(row.requiredLotsWhole)} lot
                            </div>
                          </>
                        )}
                      </td>

                      {/* Sufficiency status (explicit text, never color-only) */}
                      <td className="py-3.5 px-3 text-xs">
                        {isCompliant ? (
                          <span className="inline-flex items-center gap-1 text-[#15803D] font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                            <span>Hedef üzerinde</span>
                          </span>
                        ) : row.isFractional ? (
                          <span className="text-slate-500">
                            Otomatik plana dahil değil
                          </span>
                        ) : row.isSufficientAlone ? (
                          <div>
                            <span className="text-[#15803D] font-medium">
                              Tek başına yeterli
                            </span>
                            <div className="text-slate-400 font-mono tabular-nums">
                              Kalan: {formatLots(row.wholeLots - row.requiredLotsWhole)} lot
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span className="text-[#B45309] font-medium">
                              Tek başına yetersiz
                            </span>
                            <div className="text-slate-500 font-mono tabular-nums">
                              Tamamı satılsa: {formatPercent(row.maxRatioIfAllSold)}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Transfer to Simulator */}
                      <td className="py-3.5 pl-3 pr-6 text-right">
                        {!isCompliant && !row.isFractional && row.realPrice > 0 ? (
                          <button
                            type="button"
                            onClick={() => onTransferSingleRowToSim(row)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#0F3D6E] hover:bg-[#0F3D6E]/5 border border-slate-200 hover:border-[#0F3D6E]/30 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                          >
                            <span>Seç</span>
                            <ArrowRight className="w-3 h-3" aria-hidden="true" />
                          </button>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {activeRows.some((r) => r.isFractional) && (
          <div className="px-6 py-3 bg-slate-50/70 border-t border-slate-200 flex items-center gap-2 text-xs text-slate-500">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
            <span>
              1 lot altındaki küsurat pozisyonlar (ör. 0,900 lot) T+2 toplamına dahildir ancak
              otomatik satış önerisinde hariç tutulur.
            </span>
          </div>
        )}
      </section>
    </div>
  );
};
