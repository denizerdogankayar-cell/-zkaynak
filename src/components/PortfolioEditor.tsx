import React, { useState } from "react";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { PortfolioData, StockPosition, StockRowType } from "../types/portfolio";
import { formatNumber, formatTL } from "../utils/equityMath";

interface PortfolioEditorProps {
  data: PortfolioData;
  onChangeData: (next: PortfolioData) => void;
}

export const PortfolioEditor: React.FC<PortfolioEditorProps> = ({
  data,
  onChangeData,
}) => {
  const [liveTicker, setLiveTicker] = useState<string>("");
  const [livePriceInput, setLivePriceInput] = useState<string>("");

  const uniqueTickers = Array.from(
    new Set(data.positions.map((p) => p.ticker).filter(Boolean))
  );

  const updatePosition = (id: string, patch: Partial<StockPosition>) => {
    const nextPositions = data.positions.map((pos) => {
      if (pos.id !== id) return pos;
      const updated = { ...pos, ...patch };
      // If user edits lotT2 or discountedPrice directly (and didn't pass discountedTotalT2), auto-recompute Tutar
      if (
        (patch.lotT2 !== undefined || patch.discountedPrice !== undefined) &&
        patch.discountedTotalT2 === undefined
      ) {
        if (updated.collateralRate > 0) {
          updated.discountedTotalT2 =
            Math.round(updated.lotT2 * updated.discountedPrice * 100) / 100;
        } else {
          updated.discountedTotalT2 = 0;
        }
      }
      // If user changes collateralRate, keep real price constant and re-discount price & total
      if (patch.collateralRate !== undefined && pos.collateralRate > 0) {
        const oldK = pos.collateralRate / 100;
        const oldEffDiscPrice =
          pos.lotT2 > 0 && pos.discountedTotalT2 > 0
            ? pos.discountedTotalT2 / pos.lotT2
            : pos.discountedPrice;
        const realPrice = oldEffDiscPrice / oldK;
        const newK = Math.max(0, Math.min(100, patch.collateralRate)) / 100;
        if (newK > 0) {
          updated.discountedPrice = Math.round(realPrice * newK * 100) / 100;
          updated.discountedTotalT2 =
            Math.round(updated.lotT2 * realPrice * newK * 100) / 100;
        } else {
          updated.discountedPrice = Math.round(realPrice * 100) / 100;
          updated.discountedTotalT2 = 0;
          updated.realPriceOverride = realPrice;
        }
      }
      return updated;
    });
    onChangeData({ ...data, positions: nextPositions });
  };

  const addRow = () => {
    const newRow: StockPosition = {
      id: `manual-${Date.now()}`,
      ticker: "YENİ",
      rowType: "Teminat",
      lotT2: 1000,
      discountedPrice: 45,
      discountedTotalT2: 45000,
      collateralRate: 90,
    };
    onChangeData({ ...data, positions: [...data.positions, newRow] });
  };

  const removeRow = (id: string) => {
    onChangeData({
      ...data,
      positions: data.positions.filter((p) => p.id !== id),
    });
  };

  /** Updates real market price across ALL rows of a given ticker (e.g. both AKSEN 90% and 100%) */
  const applyLivePriceForTicker = (e: React.FormEvent) => {
    e.preventDefault();
    const targetTicker = liveTicker || uniqueTickers[0];
    const realPrice = parseFloat(livePriceInput.replace(",", "."));
    if (!targetTicker || !Number.isFinite(realPrice) || realPrice <= 0) return;

    const nextPositions = data.positions.map((pos) => {
      if (pos.ticker !== targetTicker) return pos;
      const k = Math.max(0, Math.min(100, pos.collateralRate)) / 100;
      if (k > 0) {
        const newDiscPrice = realPrice * k;
        return {
          ...pos,
          discountedPrice: Math.round(newDiscPrice * 100) / 100,
          discountedTotalT2: Math.round(pos.lotT2 * newDiscPrice * 100) / 100,
        };
      }
      return {
        ...pos,
        discountedPrice: Math.round(realPrice * 100) / 100,
        discountedTotalT2: 0,
        realPriceOverride: realPrice,
      };
    });

    onChangeData({ ...data, positions: nextPositions });
    setLivePriceInput("");
  };

  return (
    <div className="space-y-6">
      {/* Top Account T+2 Summary Inputs + Live Price Helper */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="font-display text-base font-bold text-slate-900 mb-1">
            T+2 Hesap Bakiyesi ve Meta Veriler
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Kredili hesapta T+2 Net Bakiye negatif (-) girilmelidir. Değişiklikler tüm sekmelere
            anında yansır.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label
                htmlFor="edit-net-balance"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                T+2 Net Bakiye (TL)
              </label>
              <input
                id="edit-net-balance"
                type="number"
                step="0.01"
                value={data.netBalanceT2}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onChangeData({
                    ...data,
                    netBalanceT2: Number.isFinite(val) ? val : 0,
                  });
                }}
                className="w-full px-3.5 py-2 font-mono tabular-nums text-sm text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:border-[#0F3D6E]"
              />
            </div>

            <div>
              <label
                htmlFor="edit-t2-date"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                T+2 Tarih Etiketi
              </label>
              <input
                id="edit-t2-date"
                type="text"
                value={data.t2DateLabel}
                onChange={(e) =>
                  onChangeData({ ...data, t2DateLabel: e.target.value })
                }
                placeholder="24/11"
                className="w-full px-3.5 py-2 font-mono text-sm text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:border-[#0F3D6E]"
              />
            </div>
          </div>
        </section>

        {/* Live Market Price Sync Tool */}
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="font-display text-base font-bold text-slate-900 mb-1">
            Anlık Gerçek Fiyat Güncelle
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Bir hissenin gün içi gerçek fiyatını girin; o hissenin tüm %100 / %90 satırları
            katsayılarına göre otomatik yeniden indirgenir.
          </p>

          <form onSubmit={applyLivePriceForTicker} className="flex flex-wrap items-end gap-2.5">
            <div className="w-28">
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Menkul
              </label>
              <select
                value={liveTicker || uniqueTickers[0] || ""}
                onChange={(e) => setLiveTicker(e.target.value)}
                className="w-full px-2.5 py-2 text-sm font-medium text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0F3D6E]"
              >
                {uniqueTickers.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-[120px]">
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Gerçek Piyasa Fiyatı (TL)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={livePriceInput}
                onChange={(e) => setLivePriceInput(e.target.value)}
                placeholder="Örn: 64,70"
                className="w-full px-3 py-2 font-mono tabular-nums text-sm text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:border-[#0F3D6E]"
              />
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-white bg-[#0F3D6E] hover:bg-[#0B2E54] rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Uygula</span>
            </button>
          </form>
        </section>
      </div>

      {/* Editable Stock Rows Table */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              Okunan Hisse Satırları (T+2 Teminat İndirgenmiş)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Görselden okunan değerlerde düzeltme yapabilir, yeni satır ekleyebilir veya T+2 lotu 0
              olan satırları düzenleyebilirsiniz.
            </p>
          </div>
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#0F3D6E] hover:bg-[#0B2E54] rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Hisse Satırı Ekle</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[920px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                <th className="py-2.5 pl-6 pr-2">Menkul</th>
                <th className="py-2.5 px-2">Satır Türü</th>
                <th className="py-2.5 px-2 text-right">LOT (T+2)</th>
                <th className="py-2.5 px-2 text-right">Tem.Kats (%)</th>
                <th className="py-2.5 px-2 text-right">İnd. Kapanış (TL)</th>
                <th className="py-2.5 px-2 text-right">İnd. Tutar T+2 (TL)</th>
                <th className="py-2.5 px-3 text-right">Türetilen Gerçek Fiyat</th>
                <th className="py-2.5 pl-2 pr-6 text-right">Sil</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {data.positions.map((pos) => {
                const k = Math.max(0, Math.min(100, pos.collateralRate)) / 100;
                const effDisc =
                  k > 0 && pos.lotT2 > 0 && pos.discountedTotalT2 > 0
                    ? pos.discountedTotalT2 / pos.lotT2
                    : pos.discountedPrice;
                const realPrice =
                  k > 0 ? effDisc / k : pos.realPriceOverride ?? pos.discountedPrice;

                return (
                  <tr key={pos.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 pl-6 pr-2">
                      <input
                        type="text"
                        value={pos.ticker}
                        onChange={(e) =>
                          updatePosition(pos.id, {
                            ticker: e.target.value.toUpperCase(),
                          })
                        }
                        className="w-24 px-2.5 py-1.5 font-semibold text-slate-900 border border-slate-200 rounded-md focus:outline-none focus:border-[#0F3D6E]"
                      />
                    </td>

                    <td className="py-2.5 px-2">
                      <select
                        value={pos.rowType}
                        onChange={(e) =>
                          updatePosition(pos.id, {
                            rowType: e.target.value as StockRowType,
                          })
                        }
                        className="px-2 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-[#0F3D6E]"
                      >
                        <option value="Kredili">Kredili</option>
                        <option value="Teminat">Teminat</option>
                        <option value="Cari">Cari</option>
                      </select>
                    </td>

                    <td className="py-2.5 px-2 text-right">
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={pos.lotT2}
                        onChange={(e) =>
                          updatePosition(pos.id, {
                            lotT2: Math.max(0, parseFloat(e.target.value) || 0),
                          })
                        }
                        className="w-28 px-2.5 py-1.5 text-right font-mono tabular-nums text-slate-900 border border-slate-200 rounded-md focus:outline-none focus:border-[#0F3D6E]"
                      />
                    </td>

                    <td className="py-2.5 px-2 text-right">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={5}
                        value={pos.collateralRate}
                        onChange={(e) =>
                          updatePosition(pos.id, {
                            collateralRate: Math.max(
                              0,
                              Math.min(100, parseFloat(e.target.value) || 0)
                            ),
                          })
                        }
                        className="w-20 px-2.5 py-1.5 text-right font-mono tabular-nums text-slate-900 border border-slate-200 rounded-md focus:outline-none focus:border-[#0F3D6E]"
                      />
                    </td>

                    <td className="py-2.5 px-2 text-right">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={pos.discountedPrice}
                        onChange={(e) =>
                          updatePosition(pos.id, {
                            discountedPrice: Math.max(
                              0,
                              parseFloat(e.target.value) || 0
                            ),
                          })
                        }
                        className="w-24 px-2.5 py-1.5 text-right font-mono tabular-nums text-slate-900 border border-slate-200 rounded-md focus:outline-none focus:border-[#0F3D6E]"
                      />
                    </td>

                    <td className="py-2.5 px-2 text-right">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={pos.discountedTotalT2}
                        onChange={(e) =>
                          updatePosition(pos.id, {
                            discountedTotalT2: Math.max(
                              0,
                              parseFloat(e.target.value) || 0
                            ),
                          })
                        }
                        className="w-36 px-2.5 py-1.5 text-right font-mono tabular-nums text-slate-900 border border-slate-200 rounded-md focus:outline-none focus:border-[#0F3D6E]"
                      />
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-xs text-slate-600">
                      <div>{formatNumber(realPrice, 2)} TL</div>
                      <div className="text-[11px] text-slate-400">
                        Top: {formatTL(pos.lotT2 * realPrice)}
                      </div>
                    </td>

                    <td className="py-2.5 pl-2 pr-6 text-right">
                      <button
                        type="button"
                        onClick={() => removeRow(pos.id)}
                        aria-label={`${pos.ticker} satırını sil`}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
