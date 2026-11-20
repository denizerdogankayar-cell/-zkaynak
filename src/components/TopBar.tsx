import React from "react";
import { Upload } from "lucide-react";

export type ActiveTab = "overview" | "simulator" | "editor" | "formula";

interface TopBarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onTriggerUpload: () => void;
  hasPortfolio: boolean;
}

const NAV_ITEMS: { id: ActiveTab; label: string }[] = [
  { id: "overview", label: "Özet & Kıyaslama" },
  { id: "simulator", label: "Karma Simülatör" },
  { id: "editor", label: "Veri Düzenle" },
  { id: "formula", label: "Formül Rehberi" },
];

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onSelectTab,
  onTriggerUpload,
  hasPortfolio,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark (single text element) */}
        <button
          type="button"
          onClick={() => onSelectTab("overview")}
          className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 hover:text-[#0F3D6E] transition-colors cursor-pointer"
        >
          Özkaynak35
        </button>

        {/* Zone 2: Clean single-line navigation links */}
        <nav
          aria-label="Ana gezinme"
          className="hidden md:flex items-center gap-7 text-sm font-medium"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            const disabled = !hasPortfolio && item.id !== "formula" && item.id !== "overview";
            return (
              <button
                key={item.id}
                type="button"
                disabled={disabled}
                onClick={() => onSelectTab(item.id)}
                className={`relative py-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  isActive
                    ? "text-[#0F3D6E] font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#0F3D6E]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single primary CTA */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onTriggerUpload}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium text-white bg-[#0F3D6E] hover:bg-[#0B2E54] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F3D6E]"
          >
            <Upload className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Görsel Yükle</span>
          </button>
        </div>
      </div>

      {/* Mobile horizontal nav bar (kept compact to respect 15% mobile sticky cap) */}
      <div className="md:hidden border-t border-slate-100 bg-white overflow-x-auto">
        <div className="flex items-center gap-5 px-4 h-10 text-xs font-medium">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            const disabled = !hasPortfolio && item.id !== "formula" && item.id !== "overview";
            return (
              <button
                key={item.id}
                type="button"
                disabled={disabled}
                onClick={() => onSelectTab(item.id)}
                className={`py-2 whitespace-nowrap shrink-0 border-b-2 transition-colors disabled:opacity-40 ${
                  isActive
                    ? "border-[#0F3D6E] text-[#0F3D6E] font-semibold"
                    : "border-transparent text-slate-600"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
