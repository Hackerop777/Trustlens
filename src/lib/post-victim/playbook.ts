import { PostVictimGuidance } from "../types";

export function getPostVictimPlaybook(actionType: string, claimedBrand?: string): PostVictimGuidance {
  const brandName = claimedBrand && claimedBrand !== "Unknown Organization" ? claimedBrand : "your financial institution";

  switch (actionType) {
    case "entered_password":
      return {
        actionType: "Entered Password / Master Credentials",
        severity: "CRITICAL",
        summary: "Attacker likely has direct access to your account credentials. Immediate password revocation and active session termination are mandatory.",
        steps: [
          {
            stepNumber: 1,
            title: "Immediately Change Password on Official Website",
            instruction: `Open a new browser window or open the official mobile app for ${brandName}. Navigate directly to account security and change your password immediately.`,
            urgency: "IMMEDIATE",
          },
          {
            stepNumber: 2,
            title: "Terminate All Active Sessions",
            instruction: "Look for 'Sign out of all devices' or 'Active Sessions' in your security settings to revoke attacker access tokens.",
            urgency: "IMMEDIATE",
          },
          {
            stepNumber: 3,
            title: "Change Reused Passwords",
            instruction: "If you used this same password on any other websites (email, banking, cloud storage), change them immediately as attackers test dumped passwords across common services.",
            urgency: "HIGH",
          },
          {
            stepNumber: 4,
            title: "Enable / Re-verify Multi-Factor Authentication",
            instruction: "Switch to an authenticator app (TOTP) or hardware key rather than SMS if supported.",
            urgency: "MEDIUM",
          },
        ],
        disclaimer: "TRUSTLENS provides incident triage guidance. We cannot access your accounts or reverse unauthorized account modifications.",
      };

    case "entered_otp":
      return {
        actionType: "Shared One-Time Password (OTP)",
        severity: "CRITICAL",
        summary: "Attackers use real-time OTPs to authorize immediate fund transfers, password resets, or device additions. You must act within seconds.",
        steps: [
          {
            stepNumber: 1,
            title: "Call Bank Fraud Emergency Helpline Immediately",
            instruction: `Call ${brandName}'s official fraud helpline or Dial 1930 (Cyber Fraud Helpline in India) / your local bank toll-free number immediately to freeze NetBanking and debit cards.`,
            officialResource: "India Cyber Fraud Helpline: 1930 | USA FTC: 1-877-382-4357",
            urgency: "IMMEDIATE",
          },
          {
            stepNumber: 2,
            title: "Temporarily Block Debit/Credit Cards & NetBanking",
            instruction: "Use your bank's official mobile app to toggle 'Card Lock' and disable NetBanking transactions.",
            urgency: "IMMEDIATE",
          },
          {
            stepNumber: 3,
            title: "Review Last Transactions",
            instruction: "Check mini-statement for unapproved debits. Request transaction reference numbers for any unauthorized transfers.",
            urgency: "HIGH",
          },
        ],
        disclaimer: "OTPs expire rapidly; financial institutions must be notified directly to halt pending transactions.",
      };

    case "made_payment":
      return {
        actionType: "Authorized or Completed Payment",
        severity: "CRITICAL",
        summary: "Unauthorized money transfer or fraudulent card charge. Rapid dispute notification to your bank gives the highest chance of charge reversal.",
        steps: [
          {
            stepNumber: 1,
            title: "Contact Your Bank to Dispute & Block Charge",
            instruction: `Contact ${brandName} immediately. Request a transaction dispute / chargeback for fraudulent diversion, and freeze the compromised card or account.`,
            urgency: "IMMEDIATE",
          },
          {
            stepNumber: 2,
            title: "Lodge Official Cybercrime Complaint",
            instruction: "Register an official cyber complaint at cybercrime.gov.in (in India) or ic3.gov (in the US) with the transaction ID, beneficiary details, and screenshots.",
            officialResource: "https://cybercrime.gov.in / https://ic3.gov",
            urgency: "HIGH",
          },
          {
            stepNumber: 3,
            title: "Preserve All Evidence",
            instruction: "Do not delete SMS messages, payment receipts, URLs, or chat logs. They are required by bank fraud investigators and law enforcement.",
            urgency: "MEDIUM",
          },
        ],
        disclaimer: "TRUSTLENS cannot reverse payment transactions or guarantee financial recovery.",
      };

    case "downloaded_file":
      return {
        actionType: "Downloaded Suspicious File / APK",
        severity: "HIGH",
        summary: "Downloaded file may contain a trojan, screen-recording spyware, or malicious APK designed to intercept SMS OTPs.",
        steps: [
          {
            stepNumber: 1,
            title: "Disconnect Device from the Internet",
            instruction: "Immediately turn off Wi-Fi and Mobile Data (or enable Airplane Mode) to stop malware from transmitting data or receiving commands.",
            urgency: "IMMEDIATE",
          },
          {
            stepNumber: 2,
            title: "Do NOT Open or Install the File",
            instruction: "If the file is not yet opened, delete it from your Downloads folder immediately. Check Android device Accessibility settings to ensure no unauthorized apps were granted control.",
            urgency: "IMMEDIATE",
          },
          {
            stepNumber: 3,
            title: "Run Antivirus / Malware Scan",
            instruction: "Run a full system scan using a reputable security solution (Windows Defender, Malwarebytes, Google Play Protect).",
            urgency: "HIGH",
          },
        ],
        disclaimer: "Device-level infections require local security remediation.",
      };

    default:
      return {
        actionType: "Clicked Link / Unsure",
        severity: "MEDIUM",
        summary: "You accessed a suspicious portal. As long as no passwords, OTPs, or downloads were executed, risk of direct compromise is low, but vigilance is required.",
        steps: [
          {
            stepNumber: 1,
            title: "Clear Browser Cache & Cookies",
            instruction: "Clear recent browser history and cookies for the visited domain to eliminate tracking artifacts.",
            urgency: "HIGH",
          },
          {
            stepNumber: 2,
            title: "Monitor Accounts for Unusual Activity",
            instruction: "Monitor your email and banking SMS notifications over the next 48-72 hours for unauthorized password reset attempts.",
            urgency: "MEDIUM",
          },
          {
            stepNumber: 3,
            title: "Be Alert to Follow-up Social Engineering Calls",
            instruction: "Scammers frequently follow up via phone calls pretending to be 'bank security agents'. Never disclose OTPs over the phone.",
            urgency: "HIGH",
          },
        ],
        disclaimer: "TRUSTLENS provides risk containment advice. When in doubt, contact official bank support.",
      };
  }
}
