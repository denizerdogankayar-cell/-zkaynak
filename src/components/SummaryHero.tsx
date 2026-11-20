import React, { useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Info,
  SlidersHorizontal,
} from "lucide-react";
import { PortfolioAnalysis, PortfolioData } from "../types/portfolio";
import {
  buildClientSummaryText,
  formatPercent,
  formatTL,
} from "../utils/equityMath";

interface SummaryHeroProps {
  data: PortfolioData;
  analysis: PortfolioAnalysis;
  onOpenEditor: () => void;
  onApplyOptimalToSimulator: () => void;
}

export const SummaryHero: React.FC<SummaryHeroProps> = ({
  data,
  analysis,
  onOpenEditor,
  onApplyOptimalToSimulator,
}) => {
  const [copied, setCopied] = useState(false);
  const [showMessagePreview, setShowMessagePreview] = useState(false);

  const ratioPct = analysis.equityRatio * 100;
  const gapPoints = Math.max(0, 35 - ratioPct);

  const statusTone = analysis.isCompliant
    ? {
        textClass: "text-[#15803D]",
        label: "%35 Hedefi Sağlanıyor",
        icon: CheckCircle2,
      }
    : ratioPct >= 30
      ? {
          textClass: "text-[#B45309]",
          label: `Tamamlama Gerekli · -${gapPoints.toFixed(2).replace(".", ",")} puan`,
          icon: AlertTriangle,
        }
      : {
          textClass: "text-[#B91C1C]",
          label: `Kritik Özkaynak Açığı · -${gapPoints.toFixed(2).replace(".", ",")} puan`,
          icon: AlertTriangle,
        };

  const StatusIcon = statusTone.icon;

  const reportedDiff =
    typeof data.reportedEquityRatioT2 === "number"
      ? Math.abs(data.reportedEquityRatioT2 - ratioPct)
      : 0;

  const summaryText = buildClientSummaryText(data, analysis, "standard");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setShowMessagePreview(true);
    }
  };

  return (
    <section aria-label="T+2 Özkaynak Özeti" className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-6">
      {/* Header row with title + copy summary button */}
      <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Takas Vadesi: T+2 ({data.t2DateLabel || "T+2"})</span>
            <span aria-hidden="true">·</span>
            <span>Hedef Özkaynak: %35,00</span>
            <span aria-hidden="true">·</span>
            <span>
              {data.isCollateralDiscounted
                ? "Teminat İndirgenmiş Tablo"
                : "İndirgenmemiş Tablo"}
            </span>
          </div>
          <h1 className="font-display text-lg sm:text-xl font-bold text-slate-900">
            T+2 Özkaynak Tamamlama Analizi
          </h1>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowMessagePreview((v) => !v)}
            className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            {showMessagePreview ? "Önizlemeyi Gizle" : "Metni Önizle"}
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium text-white bg-[#0F3D6E] hover:bg-[#0B2E54] rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" aria-hidden="true" />
                <span>Özet Kopyalandı</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" aria-hidden="true" />
                <span>Müşteri Özetini Kopyala</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 4-column institutional KPI grid separated by hairlines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        {/* KPI 1: Current T+2 Equity Ratio */}
        <div className="p-6">
          <p className="text-xs font-medium text-slate-500">
            Mevcut T+2 Özkaynak Oranı
          </p>
          <p
            className={`mt-2 font-mono tabular-nums text-3xl font-semibold tracking-tight ${statusTone.textClass}`}
          >
            {formatPercent(analysis.equityRatio)}
          </p>
          <div className={`mt-2 flex items-center gap-1.5 text-xs font-medium ${statusTone.textClass}`}>
            <StatusIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{statusTone.label}</span>
          </div>
        </div>

        {/* KPI 2: Required Cash Deposit */}
        <div className="p-6">
          <p className="text-xs font-medium text-slate-500">
            Sadece Nakit Yatırma (%35 İçin)
          </p>
          <p className="mt-2 font-mono tabular-nums text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
            {analysis.isCompliant ? "0,00 TL" : formatTL(analysis.requiredCash)}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {analysis.isCompliant
              ? "Ek nakit yatırmaya gerek yok"
              : "Hiç hisse satmadan %35'e tamamlar"}
          </p>
        </div>

        {/* KPI 3: Optimal Minimum Sale Plan */}
        <div className="p-6">
          <p className="text-xs font-medium text-slate-500">
            En Az Satışlı Karma Plan
          </p>
          <p className="mt-2 font-mono tabular-nums text-2xl sm:text-3xl font-semibold tracking-tight text-[#0F3D6E]">
            {analysis.isCompliant
              ? "0,00 TL"
              : formatTL(analysis.optimalPlan.totalRealSaleTL)}
          </p>
          {analysis.isCompliant ? (
            <p className="mt-2 text-xs text-slate-500">Satış gerekmiyor</p>
          ) : analysis.optimalPlan.savingsVsWorstRowTL > 0 ? (
            <p className="mt-2 text-xs text-[#15803D] font-medium">
              {analysis.optimalPlan.worstRowLabel} tekil satışına göre{" "}
              <span className="font-mono tabular-nums">
                {formatTL(analysis.optimalPlan.savingsVsWorstRowTL)}
              </span>{" "}
              daha az satış
            </p>
          ) : (
            <button
              type="button"
              onClick={onApplyOptimalToSimulator}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#0F3D6E] hover:underline cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Simülatörde düzenle</span>
            </button>
          )}
        </div>

        {/* KPI 4: T+2 Reconciliation Breakdown */}
        <div className="p-6 bg-slate-50/50">
          <p className="text-xs font-medium text-slate-500 mb-2.5">
            T+2 Tablo Özeti
          </p>
          <dl className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-slate-500">Net Bakiye (T+2)</dt>
              <dd
                className={`font-mono tabular-nums font-medium ${
                  analysis.netBalance < 0 ? "text-[#B91C1C]" : "text-slate-900"
                }`}
              >
                {formatTL(analysis.netBalance)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-slate-500">İndirgenmiş Hisse</dt>
              <dd className="font-mono tabular-nums font-medium text-slate-900">
                {formatTL(analysis.totalDiscountedStock)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-200">
              <dt className="font-medium text-slate-700">OVERALL (Özkaynak)</dt>
              <dd className="font-mono tabular-nums font-semibold text-slate-900">
                {formatTL(analysis.overall)}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Intraday vs closing-table quiet reconciliation note when applicable */}
      {typeof data.reportedEquityRatioT2 === "number" && reportedDiff >= 0.05 && (
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-[#0F3D6E] shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              Görseldeki alt özet satırı gün içi anlık fiyatlamayla{" "}
              <strong className="font-mono tabular-nums text-slate-900">
                %{data.reportedEquityRatioT2.toFixed(2).replace(".", ",")}
              </strong>{" "}
              bildiriyor; yukarıdaki hesaplama hisse tablosundaki kapanış tutarlarıyla (
              <strong className="font-mono tabular-nums text-slate-900">
                {formatPercent(analysis.equityRatio)}
              </strong>
              ) kuruşuna kadar tutarlı yürütülür.
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenEditor}
            className="text-xs font-medium text-[#0F3D6E] hover:underline whitespace-nowrap cursor-pointer"
          >
            Anlık fiyata güncelle
          </button>
        </div>
      )}

      {/* Expandable copy preview */}
      {showMessagePreview && (
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-600">
              Müşteriye Gönderilecek Özet Metin Önizlemesi
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="text-xs font-medium text-[#0F3D6E] hover:underline cursor-pointer"
            >
              {copied ? "Panoya Kopyalandı" : "Metni Kopyala"}
            </button>
          </div>
          <pre className="font-mono text-xs text-slate-800 bg-white border border-slate-200 rounded-lg p-4 whitespace-pre-wrap leading-relaxed overflow-x-auto">
            {summaryText}
          </pre>
        </div>
      )}
    </section>
  );
};
