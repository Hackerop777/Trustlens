import dns from "dns/promises";
import { RedirectHop } from "../types";

export interface SafeFetchResult {
  finalUrl: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  html: string;
  contentType: string;
  redirectChain: RedirectHop[];
  isBlockedBySSRF: boolean;
  error?: string;
}

const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 6000;
const MAX_BODY_BYTES = 2 * 1024 * 1024; // 2 MB

/**
 * Checks whether an IP address belongs to private/internal/reserved ranges (SSRF prevention).
 */
export function isPrivateOrReservedIP(ip: string): boolean {
  // IPv6 loopback and private
  if (ip === "::1" || ip === "0:0:0:0:0:0:0:1") return true;
  if (ip.toLowerCase().startsWith("fc") || ip.toLowerCase().startsWith("fd")) return true; // Unique local
  if (ip.toLowerCase().startsWith("fe80")) return true; // Link local

  // Normalize IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1)
  const ipv4 = ip.replace(/^::ffff:/i, "");
  const parts = ipv4.split(".").map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return false;

  const [a, b] = parts;

  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;
  // 10.0.0.0/8 (Private)
  if (a === 10) return true;
  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;
  // 169.254.0.0/16 (Link-local / Cloud Metadata: 169.254.169.254)
  if (a === 169 && b === 254) return true;
  // 172.16.0.0/12 (Private)
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16 (Private)
  if (a === 192 && b === 168) return true;
  // 224.0.0.0/4 (Multicast)
  if (a >= 224 && a <= 239) return true;
  // 240.0.0.0/4 (Reserved)
  if (a >= 240) return true;

  return false;
}

/**
 * Resolves a hostname and verifies none of its IPs point to private/loopback/cloud metadata ranges.
 */
export async function verifyHostSafety(hostname: string): Promise<{ isSafe: boolean; reason?: string }> {
  // Immediate check for localhost or cloud metadata hostnames
  const lowerHost = hostname.toLowerCase();
  if (
    lowerHost === "localhost" ||
    lowerHost.endsWith(".localhost") ||
    lowerHost.endsWith(".local") ||
    lowerHost.endsWith(".internal") ||
    lowerHost === "metadata.google.internal"
  ) {
    return { isSafe: false, reason: `Target host '${hostname}' resolved to a restricted internal domain` };
  }

  // If host is already an IP, verify directly
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(lowerHost)) {
    if (isPrivateOrReservedIP(lowerHost)) {
      return { isSafe: false, reason: `Direct IP '${hostname}' belongs to a private, loopback, or metadata subnet` };
    }
    return { isSafe: true };
  }

  try {
    const addresses = await dns.lookup(hostname, { all: true });
    for (const addr of addresses) {
      if (isPrivateOrReservedIP(addr.address)) {
        return { isSafe: false, reason: `Host '${hostname}' resolved to internal IP ${addr.address}` };
      }
    }
    return { isSafe: true };
  } catch (err: any) {
    return { isSafe: false, reason: `DNS resolution failed for '${hostname}': ${err?.message || "Unknown error"}` };
  }
}

/**
 * Safely fetches a URL with SSRF protection, strict timeouts, hop tracking, and body limits.
 */
export async function safeFetchURL(initialUrl: string): Promise<SafeFetchResult> {
  let currentUrl = initialUrl;
  const redirectChain: RedirectHop[] = [];
  let redirectsCount = 0;

  while (redirectsCount <= MAX_REDIRECTS) {
    let parsed: URL;
    try {
      parsed = new URL(currentUrl);
    } catch {
      return {
        finalUrl: currentUrl,
        status: 0,
        statusText: "Invalid URL",
        headers: {},
        html: "",
        contentType: "",
        redirectChain,
        isBlockedBySSRF: false,
        error: `Malformed target URL: ${currentUrl}`,
      };
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return {
        finalUrl: currentUrl,
        status: 0,
        statusText: "Forbidden Protocol",
        headers: {},
        html: "",
        contentType: "",
        redirectChain,
        isBlockedBySSRF: true,
        error: `Forbidden URL protocol '${parsed.protocol}'. Only http: and https: are allowed.`,
      };
    }

    // SSRF DNS validation for current hop
    const safety = await verifyHostSafety(parsed.hostname);
    if (!safety.isSafe) {
      return {
        finalUrl: currentUrl,
        status: 0,
        statusText: "SSRF Blocked",
        headers: {},
        html: "",
        contentType: "",
        redirectChain,
        isBlockedBySSRF: true,
        error: safety.reason,
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(currentUrl, {
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 TrustLens-Inspector/1.0",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        redirect: "manual", // Manual redirect handling to validate DNS on every single hop
        signal: controller.signal,
      });

      clearTimeout(timeout);

      // Check for redirects
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        redirectChain.push({
          url: currentUrl,
          status: response.status,
          statusText: response.statusText,
        });

        if (!location) {
          return {
            finalUrl: currentUrl,
            status: response.status,
            statusText: response.statusText,
            headers: {},
            html: "",
            contentType: "",
            redirectChain,
            isBlockedBySSRF: false,
            error: "Redirect status without Location header",
          };
        }

        // Resolve relative redirects
        const nextUrl = new URL(location, currentUrl).toString();
        currentUrl = nextUrl;
        redirectsCount++;
        continue;
      }

      // Final response reached
      const contentType = response.headers.get("content-type") || "";
      const headersRecord: Record<string, string> = {};
      response.headers.forEach((val, key) => {
        headersRecord[key.toLowerCase()] = val;
      });

      // Stream / read with maximum size cap
      const arrayBuffer = await response.arrayBuffer();
      const truncatedBuffer = arrayBuffer.slice(0, MAX_BODY_BYTES);
      const textDecoder = new TextDecoder("utf-8");
      const html = textDecoder.decode(truncatedBuffer);

      return {
        finalUrl: currentUrl,
        status: response.status,
        statusText: response.statusText,
        headers: headersRecord,
        html,
        contentType,
        redirectChain,
        isBlockedBySSRF: false,
      };
    } catch (err: any) {
      clearTimeout(timeout);
      const isTimeout = err?.name === "AbortError";
      return {
        finalUrl: currentUrl,
        status: 0,
        statusText: isTimeout ? "Timeout" : "Fetch Error",
        headers: {},
        html: "",
        contentType: "",
        redirectChain,
        isBlockedBySSRF: false,
        error: isTimeout ? `Request timed out after ${TIMEOUT_MS}ms` : err?.message || "Failed to fetch webpage",
      };
    }
  }

  return {
    finalUrl: currentUrl,
    status: 0,
    statusText: "Excessive Redirects",
    headers: {},
    html: "",
    contentType: "",
    redirectChain,
    isBlockedBySSRF: false,
    error: `Exceeded maximum redirect limit of ${MAX_REDIRECTS} hops`,
  };
}
