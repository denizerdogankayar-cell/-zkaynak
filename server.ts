import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

function createGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY sunucu ortamında tanımlı değil.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

const EXTRACTION_SYSTEM_INSTRUCTION = `Sen Türk aracı kurum portföy ekran görüntülerinden (Infina, Matriks, Foreks, Aracı Kurum Müşteri Portföy ekranı vb.) T+2 verilerini kuruş hassasiyetinde çıkaran uzman bir veri ayrıştırıcısısın.

KRİTİK KURALLAR:
1. TEMİNAT İNDİRGENMİŞ TABLO: Kullanıcıların gönderdiği ekran görüntülerinde genellikle "Teminat İndirgenmiş" görünümü açıktır. Yani tabloda görünen Kapanış ve Tutar sütunları halihazırda Tem.Kats (%) ile çarpılmıştır. Sayıları değiştirmeden, ekranda yazan değerleri tam olarak çıkar.
2. AYNI HİSSENİN FARKLI SATIRLARI: Aynı hisse senedi tabloda birden fazla satırda yer alabilir (örneğin AKSEN hem Tem.Kats=90 hem Tem.Kats=100 satırında olabilir). Bunları ASLA birleştirme; her satırı ayrı bir kayıt olarak çıkar!
3. T+2 SÜTUNU: Hisse tablosunda birden fazla tarihli LOT ve Tutar sütunu olabilir (ör. LOT (20/11), LOT (23/11), LOT (24/11) ve Tutar (24/11)). Her zaman EN SAĞDAKİ (en ileri tarihli, yani T+2) LOT sütununu "lotT2" olarak, EN SAĞDAKİ (T+2) Tutar sütununu "discountedTotalT2" olarak al. ÖZET BİLGİLER tablosunda da her zaman "T+2" (en sağdaki) sütunu al.
4. KÜSURAT LOT GÖSTERİMİ: "0.<900>" veya "12.<500>" gibi köşeli parantezli Türk takas küsurat gösterimlerini ondalık sayıya çevir (ör. "0.<900>" -> 0.9, "12.<500>" -> 12.5).
5. SAYI FORMATLARI: Ekranda bazı sütunlarda virgül ondalık ("58,01" -> 58.01), bazı sütunlarda virgül binlik ve nokta ondalık ("517,114.58" -> 517114.58, "-1,608,721.25" -> -1608721.25, "8,915" lot -> 8915) kullanılabilir. Bağlama göre doğru JSON sayısına çevir; negatif işaretleri (kırmızı yazılan Net Bakiye gibi) mutlaka koru.
6. SATIR TİPİ (rowType):
   - T+2 tutarı "Kredili Hisse" toplamıyla eşleşiyorsa veya Tem.Kats = 100 ise "Kredili"
   - T+2 tutarı "Kredi Teminat hisse" toplamıyla eşleşiyorsa "Teminat"
   - T+2 tutarı "Cari Hisse" toplamıyla eşleşiyorsa "Cari"
   - Emin olunamıyorsa: Tem.Kats 100 ise "Kredili", < 100 ve yüksek tutarlıysa "Teminat", aksi halde "Cari".
7. Sadece tablodan gerçekten okunan verileri döndür. T+2 lotu 0 olan satırları da lotT2: 0 olarak dahil edebilirsin.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    t2DateLabel: {
      type: Type.STRING,
      description: "T+2 sütun başlığındaki tarih etiketi (ör. '24/11' veya 'T+2').",
    },
    netBalanceT2: {
      type: Type.NUMBER,
      description: "ÖZET BİLGİLER tablosundaki T+2 sütununun Net Bakiye değeri (borç varsa negatif).",
    },
    reportedCariHisseT2: {
      type: Type.NUMBER,
      description: "T+2 Cari Hisse tutarı (varsa).",
    },
    reportedKrediliHisseT2: {
      type: Type.NUMBER,
      description: "T+2 Kredili Hisse tutarı (varsa).",
    },
    reportedKrediTeminatHisseT2: {
      type: Type.NUMBER,
      description: "T+2 Kredi Teminat hisse tutarı (varsa).",
    },
    reportedStockTotalT2: {
      type: Type.NUMBER,
      description: "T+2 Hisse Senetleri Toplamı (varsa).",
    },
    reportedOverallT2: {
      type: Type.NUMBER,
      description: "T+2 OVERALL(TL) değeri (varsa).",
    },
    reportedEquityRatioT2: {
      type: Type.NUMBER,
      description: "T+2 Hisse Genel Özkaynak Oranı % değeri (ör. 23.75).",
    },
    isCollateralDiscounted: {
      type: Type.BOOLEAN,
      description: "Tablodaki tutar ve fiyatların teminat katsayısı ile indirgenmiş olup olmadığı (varsayılan true).",
    },
    extractionNotes: {
      type: Type.STRING,
      description: "Okuma sırasında dikkat çeken kısa Türkçe not (ör. küsurat lot veya okunamayan alan varsa).",
    },
    positions: {
      type: Type.ARRAY,
      description: "Hisse Senetleri tablosundaki her bir satır (aynı hissenin farklı Tem.Kats satırları ayrı ayrı).",
      items: {
        type: Type.OBJECT,
        properties: {
          ticker: {
            type: Type.STRING,
            description: "Menkul / Hisse kodu (ör. AKSEN, BINHO, CWENE).",
          },
          rowType: {
            type: Type.STRING,
            description: "Satır türü: 'Kredili', 'Teminat' veya 'Cari'.",
          },
          lotT2: {
            type: Type.NUMBER,
            description: "T+2 (en sağdaki) LOT miktarı. '0.<900>' gibi küsuratlar 0.9 olarak yazılır.",
          },
          discountedPrice: {
            type: Type.NUMBER,
            description: "Kapanış sütunundaki birim fiyat.",
          },
          discountedTotalT2: {
            type: Type.NUMBER,
            description: "T+2 (en sağdaki) Tutar sütunundaki toplam tutar.",
          },
          collateralRate: {
            type: Type.NUMBER,
            description: "Tem.Kats sütunundaki teminat katsayısı (0 ile 100 arası, ör. 100, 90, 75, 50, 0).",
          },
        },
        required: [
          "ticker",
          "rowType",
          "lotT2",
          "discountedPrice",
          "discountedTotalT2",
          "collateralRate",
        ],
      },
    },
  },
  required: ["t2DateLabel", "netBalanceT2", "isCollateralDiscounted", "positions"],
};

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "15mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.post("/api/analyze-screenshot", async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body as {
        imageBase64?: string;
        mimeType?: string;
      };

      if (!imageBase64 || typeof imageBase64 !== "string") {
        res.status(400).json({
          error: "Görsel verisi eksik. Lütfen geçerli bir ekran görüntüsü yükleyin.",
        });
        return;
      }

      const safeMime =
        typeof mimeType === "string" && mimeType.startsWith("image/")
          ? mimeType
          : "image/png";

      // Strip data URL prefix if present
      const cleanBase64 = imageBase64.includes(",")
        ? imageBase64.split(",")[1]
        : imageBase64;

      const ai = createGeminiClient();

      let lastError: unknown = null;
      let responseText: string | undefined;

      // Graceful retry for transient upstream errors
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model: "gemini-4-hydrogen",
            contents: {
              parts: [
                {
                  inlineData: {
                    mimeType: safeMime,
                    data: cleanBase64,
                  },
                },
                {
                  text: "Bu aracı kurum portföy ekran görüntüsündeki Hisse Senetleri tablosunun tüm satırlarını (T+2 lot ve T+2 tutarlarıyla) ve ÖZET BİLGİLER tablosunun T+2 sütununu eksiksiz çıkar.",
                },
              ],
            },
            config: {
              systemInstruction: EXTRACTION_SYSTEM_INSTRUCTION,
              responseMimeType: "application/json",
              responseSchema: RESPONSE_SCHEMA,
            },
          });
          responseText = response.text;
          break;
        } catch (err) {
          lastError = err;
          const msg = err instanceof Error ? err.message : String(err);
          // Do not retry auth or bad request errors
          if (
            msg.includes("400") ||
            msg.includes("403") ||
            msg.includes("API_KEY_INVALID") ||
            msg.includes("PERMISSION_DENIED")
          ) {
            break;
          }
          await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
        }
      }

      if (!responseText) {
        throw lastError ?? new Error("Modelden boş yanıt alındı.");
      }

      const parsed = JSON.parse(responseText.trim());
      if (!parsed || !Array.isArray(parsed.positions)) {
        res.status(422).json({
          error:
            "Görselden portföy satırları okunamadı. Lütfen Hisse Senetleri ve Özet Bilgiler tablolarının net göründüğü bir ekran görüntüsü yükleyin.",
        });
        return;
      }

      // Normalize and assign unique stable IDs
      const normalizedPositions = parsed.positions.map(
        (pos: Record<string, unknown>, idx: number) => {
          const rawType = String(pos.rowType ?? "");
          const rowType =
            rawType === "Kredili" || rawType === "Teminat" || rawType === "Cari"
              ? rawType
              : Number(pos.collateralRate) === 100
                ? "Kredili"
                : "Teminat";

          return {
            id: `ocr-row-${Date.now()}-${idx}`,
            ticker: String(pos.ticker ?? "HİSSE").trim().toUpperCase(),
            rowType,
            lotT2: Number(pos.lotT2) || 0,
            discountedPrice: Number(pos.discountedPrice) || 0,
            discountedTotalT2: Number(pos.discountedTotalT2) || 0,
            collateralRate: Math.max(0, Math.min(100, Number(pos.collateralRate) || 0)),
          };
        }
      );

      res.json({
        t2DateLabel: String(parsed.t2DateLabel || "T+2"),
        netBalanceT2: Number(parsed.netBalanceT2) || 0,
        reportedCariHisseT2:
          typeof parsed.reportedCariHisseT2 === "number"
            ? parsed.reportedCariHisseT2
            : undefined,
        reportedKrediliHisseT2:
          typeof parsed.reportedKrediliHisseT2 === "number"
            ? parsed.reportedKrediliHisseT2
            : undefined,
        reportedKrediTeminatHisseT2:
          typeof parsed.reportedKrediTeminatHisseT2 === "number"
            ? parsed.reportedKrediTeminatHisseT2
            : undefined,
        reportedStockTotalT2:
          typeof parsed.reportedStockTotalT2 === "number"
            ? parsed.reportedStockTotalT2
            : undefined,
        reportedOverallT2:
          typeof parsed.reportedOverallT2 === "number"
            ? parsed.reportedOverallT2
            : undefined,
        reportedEquityRatioT2:
          typeof parsed.reportedEquityRatioT2 === "number"
            ? parsed.reportedEquityRatioT2
            : undefined,
        isCollateralDiscounted:
          typeof parsed.isCollateralDiscounted === "boolean"
            ? parsed.isCollateralDiscounted
            : true,
        extractionNotes:
          typeof parsed.extractionNotes === "string"
            ? parsed.extractionNotes
            : undefined,
        positions: normalizedPositions,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[/api/analyze-screenshot] Error:", message);

      if (
        message.includes("API_KEY_INVALID") ||
        message.includes("PERMISSION_DENIED") ||
        message.includes("403")
      ) {
        res.status(403).json({
          error:
            "Gemini API anahtarı yetkisiz veya geçersiz. Lütfen Settings > Secrets panelinden API anahtarınızı kontrol edin.",
        });
        return;
      }

      if (message.includes("RESOURCE_EXHAUSTED") || message.includes("429")) {
        res.status(429).json({
          error:
            "API kullanım kotası aşıldı. Kısa süre sonra tekrar deneyin veya Settings > Secrets panelinden faturalandırmalı bir anahtar seçin.",
        });
        return;
      }

      res.status(500).json({
        error: `Ekran görüntüsü analiz edilemedi: ${message}`,
      });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("/{*splat}", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Özkaynak35 server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
