import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  ClipboardPaste,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Image as ImageIcon,
  PenLine,
  Upload,
} from "lucide-react";

interface UploadPanelProps {
  isAnalyzing: boolean;
  error: string | null;
  previewUrl: string | null;
  hasPortfolio: boolean;
  onFileSelected: (file: File) => void;
  onLoadSample: () => void;
  onStartManual: () => void;
  onTriggerUpload: () => void;
}

export const UploadPanel: React.FC<UploadPanelProps> = ({
  isAnalyzing,
  error,
  previewUrl,
  hasPortfolio,
  onFileSelected,
  onLoadSample,
  onStartManual,
  onTriggerUpload,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Global Ctrl+V clipboard screenshot paste support
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            onFileSelected(file);
            break;
          }
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [onFileSelected]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      onFileSelected(file);
    }
  };

  if (hasPortfolio && !isAnalyzing) {
    return (
      <section aria-label="Kaynak görsel kontrolleri" className="mb-6">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`bg-white border rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 transition-colors ${
            isDragging
              ? "border-[#0F3D6E] bg-[#0F3D6E]/5"
              : "border-slate-200"
          }`}
        >
          <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-600">
            <ClipboardPaste className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
            <span>
              Yeni bir ekran görüntüsü sürükleyebilir veya{" "}
              <kbd className="font-mono text-xs text-slate-800 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                Ctrl+V
              </kbd>{" "}
              ile doğrudan yapıştırabilirsiniz.
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {previewUrl && (
              <button
                type="button"
                onClick={() => setShowPreview((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                {showPreview ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Görseli Gizle</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Kaynak Görseli Gör</span>
                  </>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={onLoadSample}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Örnek Portföy</span>
            </button>
            <button
              type="button"
              onClick={onTriggerUpload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0F3D6E] hover:bg-[#0F3D6E]/5 border border-[#0F3D6E]/30 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Farklı Görsel Seç</span>
            </button>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-3 bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3 text-sm flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {showPreview && previewUrl && (
          <div className="mt-3 bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">
                Yüklenen Portföy Ekran Görüntüsü
              </span>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="text-xs text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                Kapat
              </button>
            </div>
            <div className="overflow-x-auto border border-slate-200 rounded-lg bg-slate-50 p-2">
              <img
                src={previewUrl}
                alt="Yüklenen aracı kurum portföy ekran görüntüsü"
                referrerPolicy="no-referrer"
                className="max-h-[420px] w-auto mx-auto object-contain"
              />
            </div>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="max-w-4xl mx-auto py-8 sm:py-12">
      <div className="mb-8">
        <h1 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 max-w-2xl">
          T+2 Teminat İndirgenmiş %35 Özkaynak Hesaplayıcı
        </h1>
        <p className="mt-3 text-sm sm:text-base text-slate-600 max-w-2xl leading-relaxed">
          Aracı kurum portföy ekran görüntüsünü yükleyin veya yapıştırın. T+2 bakiyesi, hisse
          satırları ve teminat katsayıları okunarak %35 hedefi için gereken nakit yatırma tutarı,
          hisse bazlı satış alternatifleri ve en az satışlı karma plan anında hesaplansın.
        </p>
      </div>

      {isAnalyzing ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-5 h-5 border-2 border-[#0F3D6E] border-t-transparent rounded-full animate-spin" />
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Ekran görüntüsü analiz ediliyor
              </p>
              <p className="text-xs text-slate-500">
                Hisse satırları, Tem.Kats oranları ve T+2 özet bilgileri ayrıştırılıyor...
              </p>
            </div>
          </div>
          <div className="space-y-3 animate-pulse">
            <div className="h-10 bg-slate-100 rounded-lg w-full" />
            <div className="h-10 bg-slate-100 rounded-lg w-full" />
            <div className="h-10 bg-slate-100 rounded-lg w-5/6" />
            <div className="grid grid-cols-3 gap-4 pt-3">
              <div className="h-20 bg-slate-100 rounded-lg" />
              <div className="h-20 bg-slate-100 rounded-lg" />
              <div className="h-20 bg-slate-100 rounded-lg" />
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={onTriggerUpload}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onTriggerUpload();
              }
            }}
            className={`p-8 sm:p-12 text-center transition-colors cursor-pointer ${
              isDragging
                ? "bg-[#0F3D6E]/5 border-b border-[#0F3D6E]"
                : "hover:bg-slate-50/70 border-b border-slate-200"
            }`}
          >
            <div className="w-12 h-12 mx-auto rounded-xl bg-slate-100 text-[#0F3D6E] flex items-center justify-center mb-4">
              <ImageIcon className="w-6 h-6" aria-hidden="true" />
            </div>
            <p className="font-display text-base sm:text-lg font-semibold text-slate-900">
              Portföy ekran görüntüsünü buraya bırakın veya seçin
            </p>
            <p className="mt-1.5 text-sm text-slate-500">
              PNG, JPG veya ekran alıntısını doğrudan{" "}
              <kbd className="font-mono text-xs text-slate-800 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                Ctrl+V
              </kbd>{" "}
              ile yapıştırabilirsiniz
            </p>
            <div className="mt-5">
              <span className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#0F3D6E] hover:bg-[#0B2E54] rounded-lg transition-colors">
                <Upload className="w-4 h-4" aria-hidden="true" />
                <span>Dosya Seç</span>
              </span>
            </div>
          </div>

          <div className="px-6 py-4 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-slate-500">
              Hemen test etmek veya elle giriş yapmak için:
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onLoadSample}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-[#0F3D6E]" aria-hidden="true" />
                <span>Örnek Görsel Verisini Yükle (AKSEN / T+2)</span>
              </button>
              <button
                type="button"
                onClick={onStartManual}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <PenLine className="w-4 h-4 text-slate-500" aria-hidden="true" />
                <span>Sıfırdan Elle Gir</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-4 bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3 text-sm flex items-start gap-2.5"
        >
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
    </section>
  );
};
