import { PortfolioData } from "../types/portfolio";

/**
 * Exact verified T+2 dataset extracted from the user's attached brokerage screenshot
 * (/assets/aistudio/image_302d74e4.png) with 'Teminat İndirgenmiş' enabled.
 */
export const SAMPLE_PORTFOLIO_IMAGE_URL = "/assets/aistudio/image_302d74e4.png";

export const SAMPLE_PORTFOLIO_DATA: PortfolioData = {
  t2DateLabel: "24/11",
  netBalanceT2: -1608721.25,
  reportedCariHisseT2: 13.45,
  reportedKrediliHisseT2: 1584503.25,
  reportedKrediTeminatHisseT2: 517114.58,
  reportedStockTotalT2: 2101631.27,
  reportedOverallT2: 492910.02,
  reportedEquityRatioT2: 23.75,
  isCollateralDiscounted: true,
  extractionNotes:
    "Örnek portföy görselindeki T+2 (24/11) teminat indirgenmiş tablo verileri yüklendi. Alt satırdaki %23,75 oranı gün içi anlık fiyatlamadan kaynaklanır; tablo kapanış tutarları birebir kuruş hassasiyetinde hesaplanır.",
  positions: [
    {
      id: "sample-aksen-90",
      ticker: "AKSEN",
      rowType: "Teminat",
      lotT2: 8915,
      discountedPrice: 58.01,
      discountedTotalT2: 517114.58,
      collateralRate: 90,
    },
    {
      id: "sample-aksen-100",
      ticker: "AKSEN",
      rowType: "Kredili",
      lotT2: 24585,
      discountedPrice: 64.45,
      discountedTotalT2: 1584503.25,
      collateralRate: 100,
    },
    {
      id: "sample-binho-75",
      ticker: "BINHO",
      rowType: "Cari",
      lotT2: 0,
      discountedPrice: 2.87,
      discountedTotalT2: 0,
      collateralRate: 75,
    },
    {
      id: "sample-cwene-90",
      ticker: "CWENE",
      rowType: "Cari",
      lotT2: 0.9,
      discountedPrice: 14.94,
      discountedTotalT2: 13.45,
      collateralRate: 90,
    },
  ],
};

export const EMPTY_MANUAL_PORTFOLIO: PortfolioData = {
  t2DateLabel: "T+2",
  netBalanceT2: -500000,
  isCollateralDiscounted: true,
  positions: [
    {
      id: "manual-row-1",
      ticker: "THYAO",
      rowType: "Kredili",
      lotT2: 1500,
      discountedPrice: 300,
      discountedTotalT2: 450000,
      collateralRate: 100,
    },
    {
      id: "manual-row-2",
      ticker: "EREGL",
      rowType: "Teminat",
      lotT2: 5000,
      discountedPrice: 45,
      discountedTotalT2: 225000,
      collateralRate: 90,
    },
  ],
};
