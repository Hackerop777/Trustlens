import { parse } from "tldts";

export interface NormalizedURLOutput {
  rawUrl: string;
  normalizedUrl: string;
  protocol: string;
  hostname: string;
  registeredDomain: string;
  subdomain: string;
  path: string;
  queryParamsCount: number;
  isIpAddress: boolean;
  isPunycode: boolean;
  isValid: boolean;
  error?: string;
}

const TRACKING_QUERY_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
  "msclkid",
  "mc_eid",
  "ref",
]);

const IPV4_REGEX = /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const IPV6_REGEX = /^\[?[a-fA-F0-9:]+\]?$/;

/**
 * Normalizes and parses a URL, extracting clean domain parts and structural properties.
 */
export function normalizeURL(rawInput: string): NormalizedURLOutput {
  const trimmed = rawInput.trim();

  if (!trimmed) {
    return {
      rawUrl: rawInput,
      normalizedUrl: "",
      protocol: "",
      hostname: "",
      registeredDomain: "",
      subdomain: "",
      path: "",
      queryParamsCount: 0,
      isIpAddress: false,
      isPunycode: false,
      isValid: false,
      error: "Empty URL provided",
    };
  }

  // Ensure scheme is present (default to https)
  let candidate = trimmed;
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  try {
    const parsedUrl = new URL(candidate);

    // Reject non-http/https protocols immediately for security
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return {
        rawUrl: rawInput,
        normalizedUrl: candidate,
        protocol: parsedUrl.protocol,
        hostname: parsedUrl.hostname,
        registeredDomain: "",
        subdomain: "",
        path: parsedUrl.pathname,
        queryParamsCount: 0,
        isIpAddress: false,
        isPunycode: false,
        isValid: false,
        error: `Unsupported protocol scheme: ${parsedUrl.protocol}. Only http: and https: are permitted.`,
      };
    }

    const hostname = parsedUrl.hostname.toLowerCase();
    const isIpAddress = IPV4_REGEX.test(hostname) || (IPV6_REGEX.test(hostname) && hostname.includes(":"));
    const isPunycode = hostname.startsWith("xn--") || hostname.includes(".xn--");

    // Extract registered domain and subdomain via tldts
    const tldParsed = parse(hostname);
    const registeredDomain = tldParsed.domain || (isIpAddress ? hostname : "");
    const subdomain = tldParsed.subdomain || "";

    // Clean tracking query parameters
    const cleanedSearchParams = new URLSearchParams();
    let queryParamsCount = 0;
    parsedUrl.searchParams.forEach((value, key) => {
      queryParamsCount++;
      if (!TRACKING_QUERY_PARAMS.has(key.toLowerCase())) {
        cleanedSearchParams.append(key, value);
      }
    });

    const cleanSearch = cleanedSearchParams.toString() ? `?${cleanedSearchParams.toString()}` : "";
    const cleanPath = parsedUrl.pathname || "/";
    const portPart = parsedUrl.port ? `:${parsedUrl.port}` : "";
    const normalizedUrl = `${parsedUrl.protocol}//${hostname}${portPart}${cleanPath}${cleanSearch}`;

    return {
      rawUrl: rawInput,
      normalizedUrl,
      protocol: parsedUrl.protocol.replace(":", ""),
      hostname,
      registeredDomain,
      subdomain,
      path: cleanPath,
      queryParamsCount,
      isIpAddress,
      isPunycode,
      isValid: true,
    };
  } catch (err: any) {
    return {
      rawUrl: rawInput,
      normalizedUrl: "",
      protocol: "",
      hostname: "",
      registeredDomain: "",
      subdomain: "",
      path: "",
      queryParamsCount: 0,
      isIpAddress: false,
      isPunycode: false,
      isValid: false,
      error: err?.message || "Invalid URL syntax",
    };
  }
}
