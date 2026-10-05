import { createWorker } from "tesseract.js";

export interface OCRScanResult {
  success: boolean;
  rawText: string;
  detectedUrls: string[];
  detectedPhones: string[];
  detectedUpi: string[];
  urgencyKeywords: string[];
  error?: string;
}

const URL_REGEX = /(?:https?:\/\/|www\.)[^\s/$.?#].[^\s]*/gi;
const DOMAIN_REGEX = /\b[a-zA-Z0-9-]+\.(?:com|org|net|xyz|top|live|info|in|gov|bank|io)\b[^\s]*/gi;
const PHONE_REGEX = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
const UPI_REGEX = /\b[a-zA-Z0-9.\-_]{2,49}@(okhdfcbank|okaxis|okicici|oksbi|paytm|ybl|apl|upi)\b/gi;

const COMMON_SCAM_KEYWORDS = [
  "suspended",
  "blocked",
  "kyc",
  "aadhaar",
  "pan",
  "lottery",
  "urgent",
  "immediately",
  "reward",
  "cashback",
  "refund",
  "otp",
  "password",
  "pin",
  "unauthorized",
  "bank alert",
  "click here",
  "verify now",
];

/**
 * Performs OCR text recognition on an image file or Data URL using Tesseract.
 */
export async function performOCR(imageSource: File | string | Blob): Promise<OCRScanResult> {
  try {
    const worker = await createWorker("eng");
    const ret = await worker.recognize(imageSource);
    await worker.terminate();

    const rawText = ret.data.text || "";

    // Extract URLs
    const detectedUrlsSet = new Set<string>();
    const explicitUrls = rawText.match(URL_REGEX) || [];
    explicitUrls.forEach((u) => detectedUrlsSet.add(u.replace(/[.,;)]+$/, "")));

    const domains = rawText.match(DOMAIN_REGEX) || [];
    domains.forEach((d) => {
      const clean = d.replace(/[.,;)]+$/, "");
      detectedUrlsSet.add(clean.startsWith("http") ? clean : `https://${clean}`);
    });

    // Extract Phone Numbers
    const detectedPhones = Array.from(new Set(rawText.match(PHONE_REGEX) || []));

    // Extract UPI / Payment Handles
    const detectedUpi = Array.from(new Set(rawText.match(UPI_REGEX) || []));

    // Extract Urgency Keywords
    const lowerText = rawText.toLowerCase();
    const urgencyKeywords = COMMON_SCAM_KEYWORDS.filter((kw) => lowerText.includes(kw));

    return {
      success: true,
      rawText,
      detectedUrls: Array.from(detectedUrlsSet),
      detectedPhones,
      detectedUpi,
      urgencyKeywords,
    };
  } catch (err: any) {
    return {
      success: false,
      rawText: "",
      detectedUrls: [],
      detectedPhones: [],
      detectedUpi: [],
      urgencyKeywords: [],
      error: err?.message || "Failed to execute optical character recognition",
    };
  }
}
