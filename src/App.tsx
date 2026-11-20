import React, { useCallback, useMemo, useRef, useState } from "react";
import { FormulaGuide } from "./components/FormulaGuide";
import { MixedSimulator } from "./components/MixedSimulator";
import { PortfolioEditor } from "./components/PortfolioEditor";
import { StockComparisonTable } from "./components/StockComparisonTable";
import { SummaryHero } from "./components/SummaryHero";
import { ActiveTab, TopBar } from "./components/TopBar";
import { UploadPanel } from "./components/UploadPanel";
import {
  EMPTY_MANUAL_PORTFOLIO,
  SAMPLE_PORTFOLIO_DATA,
  SAMPLE_PORTFOLIO_IMAGE_URL,
} from "./data/samplePortfolio";
import {
  DerivedStockRow,
  PortfolioData,
  SimulationInputs,
} from "./types/portfolio";
import { analyzePortfolio, runSimulation } from "./utils/equityMath";

async function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) {
        reject(new Error("Görsel okunamadı."));
        return;
      }
      resolve({
        base64: result,
        mimeType: file.type || "image/png",
      });
    };
    reader.onerror = () => reject(new Error("Dosya okuma hatası oluştu."));
    reader.readAsDataURL(file);
  });
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(SAMPLE_PORTFOLIO_DATA);
  const [previewUrl, setPreviewUrl] = useState<string | null>(SAMPLE_PORTFOLIO_IMAGE_URL);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [simInputs, setSimInputs] = useState<SimulationInputs>({
    cashDeposit: 0,
    sellLotsByRowId: {},
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const analysis = useMemo(
    () => (portfolio ? analyzePortfolio(portfolio) : null),
    [portfolio]
  );

  const simResult = useMemo(
    () => (analysis ? runSimulation(analysis, simInputs) : null),
    [analysis, simInputs]
  );

  const handleTriggerUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelected = useCallback(async (file: File) => {
    setError(null);
    setIsAnalyzing(true);

    try {
      const { base64, mimeType } = await fileToBase64(file);

      const response = await fetch("/api/analyze-screenshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(
          payload?.error || "Ekran görüntüsü ayrıştırılırken sunucu hatası oluştu."
        );
      }

      setPortfolio(payload as PortfolioData);
      setPreviewUrl(base64);
      setSimInputs({ cashDeposit: 0, sellLotsByRowId: {} });
      setActiveTab("overview");
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Görsel okunurken beklenmeyen bir hata oluştu.";
      setError(msg);
    } finally {
      setIsAnalyzing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, []);

  const handleLoadSample = useCallback(() => {
    setError(null);
    setPortfolio(SAMPLE_PORTFOLIO_DATA);
    setPreviewUrl(SAMPLE_PORTFOLIO_IMAGE_URL);
    setSimInputs({ cashDeposit: 0, sellLotsByRowId: {} });
    setActiveTab("overview");
  }, []);

  const handleStartManual = useCallback(() => {
    setError(null);
    setPortfolio(EMPTY_MANUAL_PORTFOLIO);
    setPreviewUrl(null);
    setSimInputs({ cashDeposit: 0, sellLotsByRowId: {} });
    setActiveTab("editor");
  }, []);

  const handleTransferSingleRowToSim = useCallback((row: DerivedStockRow) => {
    const lotsToSell = Math.min(row.wholeLots, row.requiredLotsWhole);
    setSimInputs({
      cashDeposit: 0,
      sellLotsByRowId: {
        [row.position.id]: lotsToSell,
      },
    });
    setActiveTab("simulator");
  }, []);

  const handleApplyOptimalToSimulator = useCallback(() => {
    if (!analysis) return;
    const nextLots: Record<string, number> = {};
    for (const step of analysis.optimalPlan.steps) {
      nextLots[step.rowId] = step.lotsToSell;
    }
    setSimInputs({
      cashDeposit:
        analysis.optimalPlan.remainingCashNeeded > 0.01
          ? Math.ceil(analysis.optimalPlan.remainingCashNeeded * 100) / 100
          : 0,
      sellLotsByRowId: nextLots,
    });
    setActiveTab("simulator");
  }, [analysis]);

  const handleFillRemainingWithCash = useCallback(() => {
    if (!simResult || simResult.isTargetMet) return;
    setSimInputs((prev) => ({
      ...prev,
      cashDeposit:
        Math.ceil((prev.cashDeposit + simResult.remainingCashFor35) * 100) / 100,
    }));
  }, [simResult]);

  const handleResetSim = useCallback(() => {
    setSimInputs({ cashDeposit: 0, sellLotsByRowId: {} });
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      {/* Hidden native file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleFileSelected(file);
          }
        }}
      />

      <TopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onTriggerUpload={handleTriggerUpload}
        hasPortfolio={Boolean(portfolio)}
      />

      <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-6 py-6">
        <UploadPanel
          isAnalyzing={isAnalyzing}
          error={error}
          previewUrl={previewUrl}
          hasPortfolio={Boolean(portfolio)}
          onFileSelected={handleFileSelected}
          onLoadSample={handleLoadSample}
          onStartManual={handleStartManual}
          onTriggerUpload={handleTriggerUpload}
        />

        {!isAnalyzing && activeTab === "formula" && (
          <FormulaGuide analysis={analysis} />
        )}

        {!isAnalyzing && portfolio && analysis && activeTab !== "formula" && (
          <>
            <SummaryHero
              data={portfolio}
              analysis={analysis}
              onOpenEditor={() => setActiveTab("editor")}
              onApplyOptimalToSimulator={handleApplyOptimalToSimulator}
            />

            {activeTab === "overview" && (
              <StockComparisonTable
                analysis={analysis}
                onTransferSingleRowToSim={handleTransferSingleRowToSim}
                onApplyOptimalToSimulator={handleApplyOptimalToSimulator}
              />
            )}

            {activeTab === "simulator" && simResult && (
              <MixedSimulator
                data={portfolio}
                analysis={analysis}
                simInputs={simInputs}
                simResult={simResult}
                onChangeCash={(cash) =>
                  setSimInputs((prev) => ({ ...prev, cashDeposit: cash }))
                }
                onChangeRowLots={(rowId, lots) =>
                  setSimInputs((prev) => ({
                    ...prev,
                    sellLotsByRowId: {
                      ...prev.sellLotsByRowId,
                      [rowId]: lots,
                    },
                  }))
                }
                onApplyOptimal={handleApplyOptimalToSimulator}
                onFillRemainingWithCash={handleFillRemainingWithCash}
                onReset={handleResetSim}
              />
            )}

            {activeTab === "editor" && (
              <PortfolioEditor
                data={portfolio}
                onChangeData={(next) => setPortfolio(next)}
              />
            )}
          </>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <span>Özkaynak35 · T+2 Teminat İndirgenmiş Hesaplama Aracı</span>
          <span>
            Hesaplamalar bilgilendirme amaçlıdır; emir öncesi kurum ekranınızdan teyit ediniz.
          </span>
        </div>
      </footer>
    </div>
  );
}
