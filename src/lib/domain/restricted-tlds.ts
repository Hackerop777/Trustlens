import { parse } from "tldts";

/**
 * Brand TLD Metadata
 */
export interface BrandTldEntry {
  brandName: string;
  category:
    | "TECH"
    | "BANKING"
    | "AUTOMOTIVE"
    | "LUXURY"
    | "MEDIA"
    | "HEALTHCARE"
    | "CONSULTING"
    | "TELECOM"
    | "LOGISTICS"
    | "TRAVEL"
    | "MISC";
  legitimateDomains?: string[];
}

/**
 * Corporate Brand TLDs (Owned exclusively by respective corporations under ICANN gTLD program).
 * No individual or unauthorized third party can register domains under these TLDs.
 */
export const BRAND_TLDS: Record<string, BrandTldEntry> = {
  // --- Technology & AI ---
  google: { brandName: "Google", category: "TECH", legitimateDomains: ["google.com", "google.co.in"] },
  microsoft: { brandName: "Microsoft", category: "TECH", legitimateDomains: ["microsoft.com", "azure.com", "office.com"] },
  apple: { brandName: "Apple", category: "TECH", legitimateDomains: ["apple.com", "icloud.com"] },
  amazon: { brandName: "Amazon", category: "TECH", legitimateDomains: ["amazon.com", "amazon.in", "aws.amazon.com"] },
  azure: { brandName: "Microsoft Azure", category: "TECH", legitimateDomains: ["azure.com", "microsoft.com"] },
  bing: { brandName: "Microsoft Bing", category: "TECH", legitimateDomains: ["bing.com", "microsoft.com"] },
  youtube: { brandName: "YouTube", category: "TECH", legitimateDomains: ["youtube.com", "youtu.be", "google.com"] },
  gmail: { brandName: "Google (Gmail)", category: "TECH", legitimateDomains: ["gmail.com", "google.com"] },
  android: { brandName: "Google Android", category: "TECH", legitimateDomains: ["android.com", "google.com"] },
  chrome: { brandName: "Google Chrome", category: "TECH", legitimateDomains: ["google.com"] },
  docs: { brandName: "Google Docs", category: "TECH", legitimateDomains: ["docs.google.com", "google.com"] },
  drive: { brandName: "Google Drive", category: "TECH", legitimateDomains: ["drive.google.com", "google.com"] },
  maps: { brandName: "Google Maps", category: "TECH", legitimateDomains: ["maps.google.com", "google.com"] },
  meet: { brandName: "Google Meet", category: "TECH", legitimateDomains: ["meet.google.com", "google.com"] },
  sheets: { brandName: "Google Sheets", category: "TECH", legitimateDomains: ["sheets.google.com", "google.com"] },
  slides: { brandName: "Google Slides", category: "TECH", legitimateDomains: ["slides.google.com", "google.com"] },
  goog: { brandName: "Google", category: "TECH", legitimateDomains: ["google.com"] },
  aws: { brandName: "Amazon Web Services (AWS)", category: "TECH", legitimateDomains: ["aws.amazon.com", "amazon.com"] },
  kindle: { brandName: "Amazon Kindle", category: "TECH", legitimateDomains: ["amazon.com"] },
  facebook: { brandName: "Meta (Facebook)", category: "TECH", legitimateDomains: ["facebook.com", "meta.com"] },
  instagram: { brandName: "Meta (Instagram)", category: "TECH", legitimateDomains: ["instagram.com"] },
  whatsapp: { brandName: "Meta (WhatsApp)", category: "TECH", legitimateDomains: ["whatsapp.com"] },
  cisco: { brandName: "Cisco Systems", category: "TECH", legitimateDomains: ["cisco.com"] },
  dell: { brandName: "Dell Technologies", category: "TECH", legitimateDomains: ["dell.com"] },
  epson: { brandName: "Epson", category: "TECH", legitimateDomains: ["epson.com"] },
  ericsson: { brandName: "Ericsson", category: "TECH", legitimateDomains: ["ericsson.com"] },
  ibm: { brandName: "IBM", category: "TECH", legitimateDomains: ["ibm.com"] },
  samsung: { brandName: "Samsung", category: "TECH", legitimateDomains: ["samsung.com"] },
  sony: { brandName: "Sony", category: "TECH", legitimateDomains: ["sony.com"] },
  xerox: { brandName: "Xerox", category: "TECH", legitimateDomains: ["xerox.com"] },
  hp: { brandName: "HP", category: "TECH", legitimateDomains: ["hp.com"] },
  intel: { brandName: "Intel", category: "TECH", legitimateDomains: ["intel.com"] },
  oracle: { brandName: "Oracle", category: "TECH", legitimateDomains: ["oracle.com"] },
  sap: { brandName: "SAP", category: "TECH", legitimateDomains: ["sap.com"] },
  siemens: { brandName: "Siemens", category: "TECH", legitimateDomains: ["siemens.com"] },

  // --- Banking & Financial Services ---
  chase: { brandName: "JPMorgan Chase", category: "BANKING", legitimateDomains: ["chase.com"] },
  citi: { brandName: "Citigroup", category: "BANKING", legitimateDomains: ["citi.com", "citigroup.com"] },
  barclays: { brandName: "Barclays", category: "BANKING", legitimateDomains: ["barclays.com", "barclays.co.uk"] },
  barclaycard: { brandName: "Barclays (Barclaycard)", category: "BANKING", legitimateDomains: ["barclaycard.com", "barclays.com"] },
  anz: { brandName: "ANZ Bank", category: "BANKING", legitimateDomains: ["anz.com", "anz.com.au"] },
  bbva: { brandName: "BBVA", category: "BANKING", legitimateDomains: ["bbva.com", "bbva.es"] },
  bnl: { brandName: "BNL (Banca Nazionale del Lavoro)", category: "BANKING", legitimateDomains: ["bnl.it"] },
  bnpparibas: { brandName: "BNP Paribas", category: "BANKING", legitimateDomains: ["bnpparibas.com", "group.bnpparibas"] },
  bradesco: { brandName: "Banco Bradesco", category: "BANKING", legitimateDomains: ["bradesco.com.br"] },
  capitalone: { brandName: "Capital One", category: "BANKING", legitimateDomains: ["capitalone.com"] },
  commbank: { brandName: "Commonwealth Bank of Australia", category: "BANKING", legitimateDomains: ["commbank.com.au"] },
  creditunion: { brandName: "Credit Union", category: "BANKING", legitimateDomains: ["creditunion.gov"] },
  discover: { brandName: "Discover Financial", category: "BANKING", legitimateDomains: ["discover.com"] },
  everbank: { brandName: "EverBank", category: "BANKING", legitimateDomains: ["everbank.com"] },
  fidelity: { brandName: "Fidelity Investments", category: "BANKING", legitimateDomains: ["fidelity.com"] },
  hsbc: { brandName: "HSBC Bank", category: "BANKING", legitimateDomains: ["hsbc.com", "hsbc.co.in", "hsbc.co.uk"] },
  jpmorgan: { brandName: "JPMorgan Chase", category: "BANKING", legitimateDomains: ["jpmorgan.com", "chase.com"] },
  americanexpress: { brandName: "American Express", category: "BANKING", legitimateDomains: ["americanexpress.com", "amex.com"] },
  amex: { brandName: "American Express", category: "BANKING", legitimateDomains: ["americanexpress.com", "amex.com"] },
  axa: { brandName: "AXA", category: "BANKING", legitimateDomains: ["axa.com"] },
  bbt: { brandName: "BB&T (Truist)", category: "BANKING", legitimateDomains: ["truist.com", "bbt.com"] },
  cfa: { brandName: "CFA Institute", category: "BANKING", legitimateDomains: ["cfainstitute.org"] },
  esurance: { brandName: "Esurance", category: "BANKING", legitimateDomains: ["esurance.com"] },
  farmers: { brandName: "Farmers Insurance", category: "BANKING", legitimateDomains: ["farmers.com"] },
  fairwinds: { brandName: "Fairwinds Credit Union", category: "BANKING", legitimateDomains: ["fairwinds.org"] },

  // --- Automotive & Manufacturing ---
  bmw: { brandName: "BMW Group", category: "AUTOMOTIVE", legitimateDomains: ["bmw.com", "bmwgroup.com"] },
  audi: { brandName: "Audi", category: "AUTOMOTIVE", legitimateDomains: ["audi.com"] },
  volkswagen: { brandName: "Volkswagen Group", category: "AUTOMOTIVE", legitimateDomains: ["volkswagen.com", "vw.com"] },
  vw: { brandName: "Volkswagen Group", category: "AUTOMOTIVE", legitimateDomains: ["vw.com", "volkswagen.com"] },
  mercedes: { brandName: "Mercedes-Benz", category: "AUTOMOTIVE", legitimateDomains: ["mercedes-benz.com"] },
  "mercedes-benz": { brandName: "Mercedes-Benz", category: "AUTOMOTIVE", legitimateDomains: ["mercedes-benz.com"] },
  porsche: { brandName: "Porsche", category: "AUTOMOTIVE", legitimateDomains: ["porsche.com"] },
  lamborghini: { brandName: "Lamborghini", category: "AUTOMOTIVE", legitimateDomains: ["lamborghini.com"] },
  bentley: { brandName: "Bentley Motors", category: "AUTOMOTIVE", legitimateDomains: ["bentleymotors.com"] },
  toyota: { brandName: "Toyota", category: "AUTOMOTIVE", legitimateDomains: ["toyota.com", "toyota-global.com"] },
  honda: { brandName: "Honda", category: "AUTOMOTIVE", legitimateDomains: ["honda.com", "global.honda"] },
  nissan: { brandName: "Nissan", category: "AUTOMOTIVE", legitimateDomains: ["nissan-global.com", "nissanusa.com"] },
  lexus: { brandName: "Lexus", category: "AUTOMOTIVE", legitimateDomains: ["lexus.com"] },
  mitsubishi: { brandName: "Mitsubishi", category: "AUTOMOTIVE", legitimateDomains: ["mitsubishi.com"] },
  subaru: { brandName: "Subaru", category: "AUTOMOTIVE", legitimateDomains: ["subaru.com", "subaru-global.com"] },
  ford: { brandName: "Ford Motor Company", category: "AUTOMOTIVE", legitimateDomains: ["ford.com"] },
  lincoln: { brandName: "Lincoln Motor Company", category: "AUTOMOTIVE", legitimateDomains: ["lincoln.com"] },
  chrysler: { brandName: "Chrysler", category: "AUTOMOTIVE", legitimateDomains: ["chrysler.com"] },
  dodge: { brandName: "Dodge", category: "AUTOMOTIVE", legitimateDomains: ["dodge.com"] },
  ferrari: { brandName: "Ferrari", category: "AUTOMOTIVE", legitimateDomains: ["ferrari.com"] },
  fiat: { brandName: "Fiat", category: "AUTOMOTIVE", legitimateDomains: ["fiat.com"] },
  bridgestone: { brandName: "Bridgestone", category: "AUTOMOTIVE", legitimateDomains: ["bridgestone.com"] },
  firestone: { brandName: "Firestone", category: "AUTOMOTIVE", legitimateDomains: ["firestonecompleteautocare.com"] },
  dunlop: { brandName: "Dunlop", category: "AUTOMOTIVE", legitimateDomains: ["dunlop.com"] },
  dupont: { brandName: "DuPont", category: "AUTOMOTIVE", legitimateDomains: ["dupont.com"] },
  bosch: { brandName: "Bosch", category: "AUTOMOTIVE", legitimateDomains: ["bosch.com"] },
  bostik: { brandName: "Bostik", category: "AUTOMOTIVE", legitimateDomains: ["bostik.com"] },
  crown: { brandName: "Crown", category: "AUTOMOTIVE", legitimateDomains: ["crown.com"] },
  dnp: { brandName: "Dai Nippon Printing (DNP)", category: "AUTOMOTIVE", legitimateDomains: ["dnp.co.jp"] },
  datsun: { brandName: "Datsun", category: "AUTOMOTIVE", legitimateDomains: ["datsun.com"] },
  fresenius: { brandName: "Fresenius", category: "AUTOMOTIVE", legitimateDomains: ["fresenius.com"] },

  // --- Luxury & Fashion ---
  gucci: { brandName: "Gucci", category: "LUXURY", legitimateDomains: ["gucci.com"] },
  chanel: { brandName: "Chanel", category: "LUXURY", legitimateDomains: ["chanel.com"] },
  hermes: { brandName: "Hermès", category: "LUXURY", legitimateDomains: ["hermes.com"] },
  "louis-vuitton": { brandName: "Louis Vuitton", category: "LUXURY", legitimateDomains: ["louisvuitton.com"] },
  cartier: { brandName: "Cartier", category: "LUXURY", legitimateDomains: ["cartier.com"] },
  rolex: { brandName: "Rolex", category: "LUXURY", legitimateDomains: ["rolex.com"] },
  burberry: { brandName: "Burberry", category: "LUXURY", legitimateDomains: ["burberry.com"] },
  dior: { brandName: "Christian Dior", category: "LUXURY", legitimateDomains: ["dior.com"] },
  armani: { brandName: "Giorgio Armani", category: "LUXURY", legitimateDomains: ["armani.com"] },
  prada: { brandName: "Prada", category: "LUXURY", legitimateDomains: ["prada.com"] },
  "ralph-lauren": { brandName: "Ralph Lauren", category: "LUXURY", legitimateDomains: ["ralphlauren.com"] },
  zara: { brandName: "Zara", category: "LUXURY", legitimateDomains: ["zara.com"] },
  calvinklein: { brandName: "Calvin Klein", category: "LUXURY", legitimateDomains: ["calvinklein.com"] },
  bananarepublic: { brandName: "Banana Republic", category: "LUXURY", legitimateDomains: ["bananarepublic.gap.com"] },
  bauhaus: { brandName: "Bauhaus", category: "LUXURY", legitimateDomains: ["bauhaus.info"] },
  blanco: { brandName: "Blanco", category: "LUXURY", legitimateDomains: ["blanco.com"] },
  cipriani: { brandName: "Cipriani", category: "LUXURY", legitimateDomains: ["cipriani.com"] },

  // --- Media & Entertainment ---
  bbc: { brandName: "BBC", category: "MEDIA", legitimateDomains: ["bbc.com", "bbc.co.uk"] },
  bloomberg: { brandName: "Bloomberg", category: "MEDIA", legitimateDomains: ["bloomberg.com"] },
  cbs: { brandName: "CBS", category: "MEDIA", legitimateDomains: ["cbs.com", "cbsnews.com"] },
  cbn: { brandName: "CBN", category: "MEDIA", legitimateDomains: ["cbn.com"] },
  fox: { brandName: "Fox Corporation", category: "MEDIA", legitimateDomains: ["fox.com", "foxnews.com"] },
  flickr: { brandName: "Flickr", category: "MEDIA", legitimateDomains: ["flickr.com"] },
  eurovision: { brandName: "Eurovision", category: "MEDIA", legitimateDomains: ["eurovision.tv"] },
  booking: { brandName: "Booking Holdings", category: "MEDIA", legitimateDomains: ["booking.com"] },
  basketball: { brandName: "NBA / Basketball", category: "MEDIA", legitimateDomains: ["nba.com", "fiba.basketball"] },

  // --- Insurance & Healthcare ---
  allstate: { brandName: "Allstate", category: "HEALTHCARE", legitimateDomains: ["allstate.com"] },
  ally: { brandName: "Ally Financial", category: "HEALTHCARE", legitimateDomains: ["ally.com"] },
  amica: { brandName: "Amica Mutual Insurance", category: "HEALTHCARE", legitimateDomains: ["amica.com"] },
  boehringer: { brandName: "Boehringer Ingelheim", category: "HEALTHCARE", legitimateDomains: ["boehringer-ingelheim.com"] },
  bms: { brandName: "Bristol Myers Squibb", category: "HEALTHCARE", legitimateDomains: ["bms.com"] },
  emerck: { brandName: "Merck KGaA", category: "HEALTHCARE", legitimateDomains: ["merckgroup.com"] },
  aquarelle: { brandName: "Aquarelle", category: "HEALTHCARE", legitimateDomains: ["aquarelle.com"] },
  fage: { brandName: "FAGE", category: "HEALTHCARE", legitimateDomains: ["fage.com"] },
  ferrero: { brandName: "Ferrero", category: "HEALTHCARE", legitimateDomains: ["ferrero.com"] },

  // --- Consulting & Professional Services ---
  accenture: { brandName: "Accenture", category: "CONSULTING", legitimateDomains: ["accenture.com"] },
  abbott: { brandName: "Abbott Laboratories", category: "CONSULTING", legitimateDomains: ["abbott.com"] },
  abbvie: { brandName: "AbbVie", category: "CONSULTING", legitimateDomains: ["abbvie.com"] },
  bcg: { brandName: "Boston Consulting Group (BCG)", category: "CONSULTING", legitimateDomains: ["bcg.com"] },
  cbre: { brandName: "CBRE Group", category: "CONSULTING", legitimateDomains: ["cbre.com"] },
  deloitte: { brandName: "Deloitte", category: "CONSULTING", legitimateDomains: ["deloitte.com"] },
  pwc: { brandName: "PricewaterhouseCoopers (PwC)", category: "CONSULTING", legitimateDomains: ["pwc.com"] },
  erni: { brandName: "ERNI", category: "CONSULTING", legitimateDomains: ["erni.ch"] },
  flsmidth: { brandName: "FLSmidth", category: "CONSULTING", legitimateDomains: ["flsmidth.com"] },
  firmdale: { brandName: "Firmdale Hotels", category: "CONSULTING", legitimateDomains: ["firmdalehotels.com"] },
  extraspace: { brandName: "Extra Space Storage", category: "CONSULTING", legitimateDomains: ["extraspace.com"] },
  frogans: { brandName: "Frogans Technology", category: "CONSULTING", legitimateDomains: ["frogans.org"] },

  // --- Telecommunications & Energy ---
  aramco: { brandName: "Saudi Aramco", category: "TELECOM", legitimateDomains: ["aramco.com"] },
  etisalat: { brandName: "e& (Etisalat)", category: "TELECOM", legitimateDomains: ["etisalat.ae", "eand.com"] },
  bharti: { brandName: "Bharti Airtel", category: "TELECOM", legitimateDomains: ["airtel.in", "bharti.com"] },
  dabur: { brandName: "Dabur", category: "TELECOM", legitimateDomains: ["dabur.com"] },
  edeka: { brandName: "Edeka", category: "TELECOM", legitimateDomains: ["edeka.de"] },
  dvag: { brandName: "Deutsche Vermögensberatung (DVAG)", category: "TELECOM", legitimateDomains: ["dvag.de"] },
  allfinanz: { brandName: "Allfinanz", category: "TELECOM", legitimateDomains: ["allfinanz.de"] },
  schwarz: { brandName: "Schwarz Gruppe (Lidl/Kaufland)", category: "TELECOM", legitimateDomains: ["gruppe.schwarz"] },

  // --- Logistics & Postal ---
  auspost: { brandName: "Australia Post", category: "LOGISTICS", legitimateDomains: ["auspost.com.au"] },
  dhl: { brandName: "DHL", category: "LOGISTICS", legitimateDomains: ["dhl.com"] },
  fedex: { brandName: "FedEx", category: "LOGISTICS", legitimateDomains: ["fedex.com"] },

  // --- Travel & Hospitality ---
  clubmed: { brandName: "Club Med", category: "TRAVEL", legitimateDomains: ["clubmed.com"] },
  delta: { brandName: "Delta Air Lines", category: "TRAVEL", legitimateDomains: ["delta.com"] },

  // --- Miscellaneous Corporate Brand TLDs ---
  alstom: { brandName: "Alstom", category: "MISC", legitimateDomains: ["alstom.com"] },
  aol: { brandName: "AOL", category: "MISC", legitimateDomains: ["aol.com"] },
  bond: { brandName: "Bond University", category: "MISC", legitimateDomains: ["bond.edu.au"] },
  brother: { brandName: "Brother", category: "MISC", legitimateDomains: ["brother.com"] },
  bugatti: { brandName: "Bugatti", category: "MISC", legitimateDomains: ["bugatti.com"] },
  cal: { brandName: "UC Berkeley (Cal)", category: "MISC", legitimateDomains: ["berkeley.edu"] },
  canon: { brandName: "Canon", category: "MISC", legitimateDomains: ["canon.com"] },
  caravan: { brandName: "Caravan", category: "MISC", legitimateDomains: ["caravan.com"] },
  cba: { brandName: "Commonwealth Bank of Australia", category: "MISC", legitimateDomains: ["commbank.com.au"] },
  cern: { brandName: "CERN", category: "MISC", legitimateDomains: ["home.cern"] },
  chintai: { brandName: "CHINTAI", category: "MISC", legitimateDomains: ["chintai.net"] },
  citadel: { brandName: "Citadel", category: "MISC", legitimateDomains: ["citadel.com"] },
  citic: { brandName: "CITIC Group", category: "MISC", legitimateDomains: ["citic.com"] },
  comcast: { brandName: "Comcast", category: "MISC", legitimateDomains: ["comcast.com", "xfinity.com"] },
  crs: { brandName: "CRS", category: "MISC", legitimateDomains: ["crs.org"] },
  csc: { brandName: "CSC", category: "MISC", legitimateDomains: ["cscglobal.com"] },
  cuisinella: { brandName: "Cuisinella", category: "MISC", legitimateDomains: ["cuisinella.com"] },
  dealer: { brandName: "DealerTrack", category: "MISC", legitimateDomains: ["dealertrack.com"] },
  dish: { brandName: "DISH Network", category: "MISC", legitimateDomains: ["dish.com"] },
  flir: { brandName: "FLIR Systems", category: "MISC", legitimateDomains: ["flir.com"] },
  forex: { brandName: "Forex", category: "MISC", legitimateDomains: ["forex.com"] },
};

/**
 * Reserved Infrastructure and Root TLDs (ICANN/IANA/IETF).
 * These cannot be registered by the public under any circumstance.
 */
export const RESERVED_INFRASTRUCTURE_TLDS = new Set([
  "aso",
  "dnso",
  "icann",
  "internic",
  "pso",
  "afrinic",
  "apnic",
  "arin",
  "example",
  "gtld-servers",
  "iab",
  "gnso",
  "ccnso",
  "test",
  "localhost",
  "invalid",
  "onion",
]);

/**
 * Chartered & Regulatory Restricted Suffixes.
 * Requires rigorous statutory credentials, government charter, or financial licensing to operate.
 */
export const CHARTERED_RESTRICTED_TLDS = new Set([
  "bank.in",
  "bank",
  "insurance",
  "gov.in",
  "nic.in",
  "gov",
  "mil.in",
  "mil",
  "ac.in",
  "edu.in",
  "edu",
  "res.in",
  "int",
  "post",
  "aero",
  "coop",
  "museum",
  "jobs",
  "travel",
  "cat",
  "tel",
  "mobi",
  "xxx",
  "pro",
  "商标",
]);

/**
 * Master set of all restricted suffixes, brand TLDs, and reserved infrastructure zones.
 */
export const RESTRICTED_PUBLIC_SUFFIXES = new Set([
  ...CHARTERED_RESTRICTED_TLDS,
  ...RESERVED_INFRASTRUCTURE_TLDS,
  ...Object.keys(BRAND_TLDS),
]);

export interface RestrictedDomainInfo {
  isRestricted: boolean;
  publicSuffix?: string;
  entityLabel?: string;
  registeredDomain?: string;
  category?:
    | "BANKING"
    | "GOVERNMENT"
    | "EDUCATION"
    | "MILITARY"
    | "RESEARCH"
    | "BRAND_TLD"
    | "INFRASTRUCTURE"
    | "RESTRICTED_GTLD";
  authority?: string;
  brandName?: string;
}

/**
 * Inspects a hostname to determine if it is registered under a restricted, government-regulated,
 * ICANN infrastructure, or corporate-owned brand TLD.
 */
export function checkRestrictedDomain(hostname: string): RestrictedDomainInfo {
  const normHost = hostname.toLowerCase().trim();
  const parsed = parse(normHost);

  const suffix = (parsed.publicSuffix || "").toLowerCase();

  if (!suffix || !RESTRICTED_PUBLIC_SUFFIXES.has(suffix)) {
    return { isRestricted: false };
  }

  // 1. Corporate Brand TLD (.apple, .google, .microsoft, .chase, .bmw, etc.)
  if (suffix in BRAND_TLDS) {
    const brandEntry = BRAND_TLDS[suffix];
    return {
      isRestricted: true,
      publicSuffix: suffix,
      entityLabel: parsed.domainWithoutSuffix?.toLowerCase() || "",
      registeredDomain: parsed.domain?.toLowerCase() || normHost,
      category: "BRAND_TLD",
      authority: `${brandEntry.brandName} Corporate Brand Registry (.${suffix})`,
      brandName: brandEntry.brandName,
    };
  }

  // 2. Reserved Root / Infrastructure TLDs (ICANN, IANA, IETF)
  if (RESERVED_INFRASTRUCTURE_TLDS.has(suffix)) {
    return {
      isRestricted: true,
      publicSuffix: suffix,
      entityLabel: parsed.domainWithoutSuffix?.toLowerCase() || "",
      registeredDomain: parsed.domain?.toLowerCase() || normHost,
      category: "INFRASTRUCTURE",
      authority: `ICANN / IANA Core Internet Infrastructure (.${suffix})`,
    };
  }

  // 3. Statutory & Chartered Regulatory TLDs
  let category: RestrictedDomainInfo["category"] = "GOVERNMENT";
  let authority = `Restricted Statutory Registry (.${suffix})`;

  if (suffix === "bank.in") {
    category = "BANKING";
    authority = "IDRBT / Reserve Bank of India (.bank.in)";
  } else if (suffix === "bank") {
    category = "BANKING";
    authority = "fTLD Global Banking Registry (.bank)";
  } else if (suffix === "insurance") {
    category = "BANKING";
    authority = "fTLD Global Insurance Registry (.insurance)";
  } else if (suffix === "gov.in" || suffix === "nic.in") {
    category = "GOVERNMENT";
    authority = "National Informatics Centre (Govt. of India)";
  } else if (suffix === "gov") {
    category = "GOVERNMENT";
    authority = "CISA Official Government Registry (.gov)";
  } else if (suffix === "int") {
    category = "GOVERNMENT";
    authority = "IANA Intergovernmental Treaty Organizations (.int)";
  } else if (suffix === "ac.in" || suffix === "edu.in" || suffix === "edu") {
    category = "EDUCATION";
    authority = "Ministry of Education / ERNET Accredited Institutions";
  } else if (suffix === "mil.in" || suffix === "mil") {
    category = "MILITARY";
    authority = "Armed Forces / Ministry of Defence";
  } else if (suffix === "res.in") {
    category = "RESEARCH";
    authority = "Government of India Autonomous Research Institutes";
  } else if (suffix === "post") {
    category = "INFRASTRUCTURE";
    authority = "Universal Postal Union (UPU) Postal Authority (.post)";
  } else if (suffix === "aero") {
    category = "RESTRICTED_GTLD";
    authority = "SITA Aviation Community Registry (.aero)";
  } else if (suffix === "coop") {
    category = "RESTRICTED_GTLD";
    authority = "DotCooperation LLC (.coop)";
  } else if (suffix === "museum") {
    category = "RESTRICTED_GTLD";
    authority = "Museum Domain Management Association (.museum)";
  } else if (suffix === "商标") {
    category = "RESTRICTED_GTLD";
    authority = "Official Trademark Domain Registry (.商标)";
  } else {
    category = "RESTRICTED_GTLD";
    authority = `ICANN Chartered Regulatory Domain (.${suffix})`;
  }

  return {
    isRestricted: true,
    publicSuffix: suffix,
    entityLabel: parsed.domainWithoutSuffix?.toLowerCase() || "",
    registeredDomain: parsed.domain?.toLowerCase() || normHost,
    category,
    authority,
  };
}
