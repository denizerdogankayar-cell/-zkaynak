import React, { useState } from "react";
import {
  Check,
  CheckCircle2,
  Copy,
  RotateCcw,
  Sparkles,
  Wallet,
} from "lucide-react";
import {
  PortfolioAnalysis,
  PortfolioData,
  SimulationInputs,
  SimulationResult,
} from "../types/portfolio";
import {
  buildClientSummaryText,
  formatLots,
  formatNumber,
  formatPercent,
  formatTL,
} from "../utils/equityMath";

interface MixedSimulatorProps {
  data: PortfolioData;
  analysis: PortfolioAnalysis;
  simInputs: SimulationInputs;
  simResult: SimulationResult;
  onChangeCash: (cash: number) => void;
  onChangeRowLots: (rowId: string, lots: number) => void;
  onApplyOptimal: () => void;
  onFillRemainingWithCash: () => void;
  onReset: () => void;
}

export const MixedSimulator: React.FC<MixedSimulatorProps> = ({
  data,
  analysis,
  simInputs,
  simResult,
  onChangeCash,
  onChangeRowLots,
  onApplyOptimal,
  onFillRemainingWithCash,
  onReset,
}) => {
  const [copied, setCopied] = useState(false);

  const currentPct = Math.max(0, Math.min(100, analysis.equityRatio * 100));
  const simPct = Math.max(0, Math.min(100, simResult.newRatio * 100));
  const gaugeMax = Math.max(50, Math.ceil(Math.max(currentPct, simPct) / 10) * 10);
  const currentBarW = Math.min(100, (currentPct / gaugeMax) * 100);
  const simBarW = Math.min(100, (simPct / gaugeMax) * 100);
  const targetMarkerPos = Math.min(100, (35 / gaugeMax) * 100);

  const sellableRows = analysis.activeRows.filter(
    (r) => !r.isFractional && r.wholeLots >= 1 && r.realPrice > 0
  );

  const handleCopySimSummary = async () => {
    const text = buildClientSummaryText(data, analysis, "simulator", simResult);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      {/* Live Simulation Outcome Banner */}
      <section
        aria-label="Canlı Simülasyon Sonucu"
        className="bg-white border border-slate-200 rounded-xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              Karma Tamamlama Simülatörü (Nakit + Çoklu Hisse Satışı)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Nakit yatırma ve farklı hisselerden kısmi satışları birleştirerek T+2 özkaynak
              oranını canlı test edin.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onApplyOptimal}
              disabled={analysis.isCompliant}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0F3D6E] bg-[#0F3D6E]/5 hover:bg-[#0F3D6E]/10 border border-[#0F3D6E]/25 rounded-lg transition-colors cursor-pointer disabled:opacity-40 whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Optimal Planı Uygula</span>
            </button>
            <button
              type="button"
              onClick={onFillRemainingWithCash}
              disabled={simResult.isTargetMet}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-40 whitespace-nowrap"
            >
              <Wallet className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Kalanı Nakitle Tamamla</span>
            </button>
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Sıfırla</span>
            </button>
            <button
              type="button"
              onClick={handleCopySimSummary}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-[#0F3D6E] hover:bg-[#0B2E54] rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Senaryo Kopyalandı</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Senaryoyu Kopyala</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Visual Progress Meter against 35% threshold */}
        <div className="px-6 py-5 border-b border-slate-200">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
            <div className="flex items-baseline gap-3">
              <span className="text-xs font-medium text-slate-500">
                Simülasyon Sonrası T+2 Oran:
              </span>
              <span
                className={`font-mono tabular-nums text-2xl sm:text-3xl font-bold ${
                  simResult.isTargetMet ? "text-[#15803D]" : "text-[#B45309]"
                }`}
              >
                {formatPercent(simResult.newRatio)}
              </span>
              <span className="font-mono tabular-nums text-xs text-slate-500">
                (Mevcut: {formatPercent(analysis.equityRatio)})
              </span>
            </div>

            <div className="text-xs font-medium">
              {simResult.isTargetMet ? (
                <span className="inline-flex items-center gap-1.5 text-[#15803D]">
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  <span>
                    %35 Hedefi Sağlandı · Fazla Özkaynak:{" "}
                    <strong className="font-mono tabular-nums">
                      {formatTL(simResult.surplusOver35)}
                    </strong>
                  </span>
                </span>
              ) : (
                <span className="text-[#B91C1C]">
                  %35 İçin Kalan Nakit İhtiyacı:{" "}
                  <strong className="font-mono tabular-nums">
                    {formatTL(simResult.remainingCashFor35)}
                  </strong>
                </span>
              )}
            </div>
          </div>

          <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden">
            {/* Simulated ratio fill */}
            <div
              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-150 ${
                simResult.isTargetMet ? "bg-[#15803D]" : "bg-[#0F3D6E]"
              }`}
              style={{ width: `${simBarW}%` }}
            />
            {/* Original baseline overlay */}
            <div
              className="absolute inset-y-0 left-0 bg-slate-400/45 rounded-l-full"
              style={{ width: `${Math.min(currentBarW, simBarW)}%` }}
            />
            {/* 35% threshold marker */}
            <div
              className="absolute inset-y-0 w-0.5 bg-slate-900 z-10"
              style={{ left: `${targetMarkerPos}%` }}
              title="Hedef: %35"
            />
          </div>
          <div className="relative h-5 mt-1 text-[11px] font-mono tabular-nums text-slate-500">
            <span className="absolute left-0">%0</span>
            <span
              className="absolute -translate-x-1/2 font-semibold text-slate-900"
              style={{ left: `${targetMarkerPos}%` }}
            >
              %35 Hedef
            </span>
            <span className="absolute right-0">%{gaugeMax}</span>
          </div>
        </div>

        {/* Post-Simulation Financial Summary Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 bg-slate-50/50 text-xs">
          <div className="px-6 py-3.5">
            <span className="text-slate-500 block">Toplam Nakit + Satış</span>
            <span className="font-mono tabular-nums text-sm font-semibold text-slate-900 mt-0.5 block">
              {formatTL(simResult.cashDeposit + simResult.totalRealSaleTL)}
            </span>
          </div>
          <div className="px-6 py-3.5">
            <span className="text-slate-500 block">Yeni Net Bakiye (T+2)</span>
            <span
              className={`font-mono tabular-nums text-sm font-semibold mt-0.5 block ${
                simResult.newNetBalance < 0 ? "text-[#B91C1C]" : "text-[#15803D]"
              }`}
            >
              {formatTL(simResult.newNetBalance)}
            </span>
          </div>
          <div className="px-6 py-3.5">
            <span className="text-slate-500 block">Yeni İndirgenmiş Hisse</span>
            <span className="font-mono tabular-nums text-sm font-semibold text-slate-900 mt-0.5 block">
              {formatTL(simResult.newDiscountedStock)}
            </span>
          </div>
          <div className="px-6 py-3.5">
            <span className="text-slate-500 block">Yeni OVERALL (Özkaynak)</span>
            <span className="font-mono tabular-nums text-sm font-semibold text-slate-900 mt-0.5 block">
              {formatTL(simResult.newOverall)}
            </span>
          </div>
        </div>
      </section>

      {/* Simulator Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Cash Deposit Control */}
        <section className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="font-display text-sm font-bold text-slate-900 mb-1">
            Nakit Yatırma (TL)
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Yatırılan her 1 TL, doğrudan Net Bakiye ve Özkaynak tutarını 1 TL artırır.
          </p>

          <label className="block text-xs font-medium text-slate-700 mb-1.5" htmlFor="sim-cash-input">
            Yatırılacak Nakit Tutarı (TL)
          </label>
          <input
            id="sim-cash-input"
            type="number"
            min={0}
            step={1000}
            value={simInputs.cashDeposit === 0 ? "" : Math.round(simInputs.cashDeposit * 100) / 100}
            placeholder="0"
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              onChangeCash(Number.isFinite(v) && v >= 0 ? v : 0);
            }}
            className="w-full px-3.5 py-2.5 font-mono tabular-nums text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0F3D6E] focus:ring-2 focus:ring-[#0F3D6E]/15"
          />

          {analysis.requiredCash > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[0.25, 0.5, 1].map((fraction) => {
                const amount = Math.round(analysis.requiredCash * fraction * 100) / 100;
                return (
                  <button
                    key={fraction}
                    type="button"
                    onClick={() => onChangeCash(amount)}
                    className="px-2 py-1.5 text-xs font-mono tabular-nums text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    %{Math.round(fraction * 100)} Açık
                  </button>
                );
              })}
            </div>
          )}

          {/* Selected Actions Breakdown */}
          <div className="mt-6 pt-5 border-t border-slate-200">
            <h4 className="text-xs font-semibold text-slate-700 mb-3">
              Seçili Aksiyon Özeti
            </h4>
            {simResult.cashDeposit === 0 && simResult.soldRows.length === 0 ? (
              <p className="text-xs text-slate-400">
                Henüz nakit veya hisse satışı seçilmedi. Sağdaki hisselerden lot seçerek
                simülasyona başlayabilirsiniz.
              </p>
            ) : (
              <ul className="space-y-2 text-xs">
                {simResult.cashDeposit > 0 && (
                  <li className="flex items-center justify-between gap-2">
                    <span className="text-slate-600">Nakit Yatırma</span>
                    <span className="font-mono tabular-nums font-medium text-slate-900">
                      {formatTL(simResult.cashDeposit)}
                    </span>
                  </li>
                )}
                {simResult.soldRows.map((row) => (
                  <li key={row.rowId} className="flex items-center justify-between gap-2">
                    <span className="text-slate-600">
                      {row.ticker} (%{row.collateralRate}) · {formatLots(row.sellLots)} lot
                    </span>
                    <span className="font-mono tabular-nums font-medium text-[#0F3D6E]">
                      {formatTL(row.realSaleTL)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Right: Per-Row Stock Sale Sliders & Inputs */}
        <section className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-display text-sm font-bold text-slate-900">
                Hisse Satış Seçimleri (T+2 Pozisyonlar)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Lot veya TL alanlarından birini değiştirdiğinizde diğeri gerçek piyasa fiyatına göre
                otomatik güncellenir.
              </p>
            </div>
          </div>

          {sellableRows.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Satılabilir tam lotlu T+2 hisse satırı bulunmuyor.
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {sellableRows.map((row) => {
                const { position } = row;
                const currentLots = Math.min(
                  row.wholeLots,
                  Math.max(0, simInputs.sellLotsByRowId[position.id] ?? 0)
                );
                const currentTL = currentLots * row.realPrice;

                return (
                  <div key={position.id} className="p-5 sm:px-6">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-bold text-slate-900">{position.ticker}</span>
                        <span className="text-xs text-slate-500">
                          · {position.rowType} · Tem.Kats %{position.collateralRate} · 1 TL ={" "}
                          <span className="font-mono tabular-nums text-slate-700">
                            {formatNumber(row.gapClosePower, 3)} TL
                          </span>{" "}
                          açık kapatır
                        </span>
                      </div>
                      <div className="text-xs font-mono tabular-nums text-slate-500">
                        Gerçek Fiyat: {formatNumber(row.realPrice, 2)} TL · Maks:{" "}
                        {formatLots(row.wholeLots)} lot
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                      <div className="sm:col-span-5">
                        <input
                          type="range"
                          min={0}
                          max={row.wholeLots}
                          step={1}
                          value={currentLots}
                          onChange={(e) =>
                            onChangeRowLots(position.id, parseInt(e.target.value, 10) || 0)
                          }
                          aria-label={`${position.ticker} (${position.rowType}) satış lot kaydırıcısı`}
                          className="w-full sim-slider"
                        />
                        <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-400 mt-1">
                          <span>0 lot</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                onChangeRowLots(position.id, Math.round(row.wholeLots / 2))
                              }
                              className="text-slate-600 hover:text-[#0F3D6E] cursor-pointer"
                            >
                              %50
                            </button>
                            <button
                              type="button"
                              onClick={() => onChangeRowLots(position.id, row.wholeLots)}
                              className="text-slate-600 hover:text-[#0F3D6E] cursor-pointer"
                            >
                              Tümü
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[11px] text-slate-500 mb-1">
                          Satış Lot
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={row.wholeLots}
                          step={1}
                          value={currentLots === 0 ? "" : currentLots}
                          placeholder="0"
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            onChangeRowLots(
                              position.id,
                              Number.isFinite(val)
                                ? Math.max(0, Math.min(row.wholeLots, val))
                                : 0
                            );
                          }}
                          className="w-full px-3 py-1.5 font-mono tabular-nums text-sm text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:border-[#0F3D6E]"
                        />
                      </div>

                      <div className="sm:col-span-4">
                        <label className="block text-[11px] text-slate-500 mb-1">
                          Gerçek Satış Tutarı (TL)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={Math.ceil(row.wholeLots * row.realPrice)}
                          step={500}
                          value={currentTL === 0 ? "" : Math.round(currentTL * 100) / 100}
                          placeholder="0,00"
                          onChange={(e) => {
                            const tl = parseFloat(e.target.value);
                            if (!Number.isFinite(tl) || tl <= 0) {
                              onChangeRowLots(position.id, 0);
                              return;
                            }
                            const lots = Math.min(
                              row.wholeLots,
                              Math.round(tl / row.realPrice)
                            );
                            onChangeRowLots(position.id, lots);
                          }}
                          className="w-full px-3 py-1.5 font-mono tabular-nums text-sm text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:border-[#0F3D6E]"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
