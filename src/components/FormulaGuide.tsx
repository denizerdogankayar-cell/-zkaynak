import React from "react";
import { PortfolioAnalysis } from "../types/portfolio";
import { formatNumber, formatTL } from "../utils/equityMath";

interface FormulaGuideProps {
  analysis: PortfolioAnalysis | null;
}

const COLLATERAL_TIERS = [100, 90, 80, 75, 50, 0];

export const FormulaGuide: React.FC<FormulaGuideProps> = ({ analysis }) => {
  const sampleGap =
    analysis && !analysis.isCompliant ? analysis.requiredCash : 100000;
  const isLiveGap = Boolean(analysis && !analysis.isCompliant);

  return (
    <div className="space-y-6 max-w-5xl">
      <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
        <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900">
          Teminat İndirgenmiş T+2 Özkaynak Hesabı Nasıl Çalışır?
        </h2>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-3xl">
          Aracı kurum ekranında “Teminat İndirgenmiş” görünümü açıkken, her hisse satırındaki
          kapanış fiyatı ve T+2 tutarı halihazırda kendi <strong className="text-slate-900">Tem.Kats</strong>{" "}
          oranı ile çarpılmış hâlde gösterilir. Bu nedenle aynı hissenin %100 (Kredili) ve %90
          (Kredi Teminat) satırlarında farklı fiyat görünür.
        </p>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-200">
          <div>
            <p className="text-xs font-semibold text-[#0F3D6E] mb-1">
              01. T+2 Özkaynak Oranı
            </p>
            <p className="font-mono text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
              Oran = OVERALL / V_ind
            </p>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              <span className="font-mono">OVERALL = Net Bakiye + V_ind</span>. Paydadaki{" "}
              <span className="font-mono">V_ind</span>, tüm T+2 hisselerin teminat indirgenmiş
              toplamıdır.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-[#0F3D6E] mb-1">
              02. %35 İçin Nakit Yatırma
            </p>
            <p className="font-mono text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
              Nakit = 0,35 × V_ind − OVERALL
            </p>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Yatırılan nakit <span className="font-mono">V_ind</span> paydasını değiştirmez;
              doğrudan özkaynağı 1:1 oranında yükseltir.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-[#0F3D6E] mb-1">
              03. Hisseden Satış Tutarı
            </p>
            <p className="font-mono text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
              Satış = Nakit / (1 − 0,65 × k)
            </p>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              <span className="font-mono">k = Tem.Kats / 100</span>. Satış yapıldığında kasaya
              gerçek tutar (+S) girer, paydadan yalnızca indirgenmiş değer (−k×S) düşer.
            </p>
          </div>
        </div>
      </section>

      {/* Sensitivity Table showing WHY selling lower Tem.Kats requires significantly less TL */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="font-display text-base font-bold text-slate-900">
            Tem.Kats Oranına Göre Satış Çarpanı Tablosu (%35 Hedefi)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {isLiveGap
              ? `Mevcut portföyünüzdeki ${formatTL(sampleGap)} nakit açığına göre her teminat katsayısı için gereken gerçek satış tutarı:`
              : "Örnek 100.000,00 TL özkaynak açığı için her teminat katsayısında gereken gerçek satış tutarı:"}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                <th className="py-3 pl-6 pr-3">Tem.Kats (k)</th>
                <th className="py-3 px-3 text-right">1 TL Satışın Kapattığı Açık</th>
                <th className="py-3 px-3 text-right">Satış / Nakit Çarpanı</th>
                <th className="py-3 px-3 text-right">
                  {isLiveGap ? "Mevcut Açık İçin Satış" : "100.000 TL Açık İçin Satış"}
                </th>
                <th className="py-3 pl-3 pr-6">Mekanizma Özeti</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {COLLATERAL_TIERS.map((tier) => {
                const k = tier / 100;
                const power = 1 - 0.65 * k;
                const multiplier = 1 / power;
                const saleRequired = sampleGap / power;

                const desc =
                  tier === 100
                    ? "Özkaynak (OVERALL) sabit kalır, sadece payda daralır — en yüksek satış gerekir."
                    : tier === 0
                      ? "Payda hiç değişmez, satışın tamamı özkaynağa eklenir — nakit yatırmayla birebir aynı."
                      : `Satışın %${100 - tier}'i özkaynağı net artırır, %${tier}'i paydadaki hisse yükünü azaltır.`;

                return (
                  <tr key={tier} className="hover:bg-slate-50/60">
                    <td className="py-3 pl-6 pr-3 font-mono tabular-nums font-semibold text-slate-900">
                      %{tier}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-800">
                      {formatNumber(power, 4)} TL
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-600">
                      ×{formatNumber(multiplier, 3)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-[#0F3D6E]">
                      {formatTL(saleRequired)}
                    </td>
                    <td className="py-3 pl-3 pr-6 text-xs text-slate-600">{desc}</td>
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
