import { RiskAssessment, BrandVerification, RecommendedActions } from "../types";

export function generateRecommendations(
  risk: RiskAssessment,
  brandVerification?: BrandVerification
): RecommendedActions {
  const doList: string[] = [];
  const doNotList: string[] = [];
  let urgentNotice: string | undefined;

  if (risk.classification === "CRITICAL" || risk.classification === "HIGH") {
    urgentNotice =
      "CRITICAL ADVISORY: Do not interact further with this page. High risk of credential theft and financial compromise.";

    doList.push("Immediately close this browser tab and avoid clicking any links.");
    if (brandVerification && brandVerification.expectedDomains.length > 0) {
      doList.push(
        `If you need services from ${brandVerification.claimedBrand}, open a fresh tab and navigate only to official domains: ${brandVerification.expectedDomains.join(", ")}.`
      );
    }
    doList.push("Verify communications independently by contacting official customer care via their official app.");
    doList.push("Report this URL to the national cybercrime portal (Dial 1930 in India / ic3.gov in the US).");

    doNotList.push("DO NOT enter any passwords, NetBanking credentials, or PINs.");
    doNotList.push("DO NOT share OTPs or verification codes received via SMS or email.");
    doNotList.push("DO NOT authorize UPI payment requests or click payment links on this site.");
    doNotList.push("DO NOT download any files, executables, or APKs prompted by this page.");
  } else if (risk.classification === "SUSPICIOUS") {
    doList.push("Inspect the full domain name in the address bar before proceeding.");
    doList.push("Check if the website certificate matches the recognized organization.");
    doList.push("Cross-check the URL against official search engine results.");

    doNotList.push("DO NOT submit financial or sensitive personal information without independent verification.");
    doNotList.push("DO NOT make expedited payments under high-pressure claims.");
  } else {
    doList.push("Verify that the browser address bar displays the secure lock icon.");
    doList.push("Ensure your two-factor authentication (2FA) remains enabled across your accounts.");

    doNotList.push("Never reuse master passwords across different web portals.");
  }

  return {
    doList,
    doNotList,
    urgentNotice,
  };
}
