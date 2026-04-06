const COUNTRY_CODE_TO_ISO2: Record<string, string> = {
  // DB enum codes
  "UK": "gb",
  "USA": "us",
  "AUS": "au",
  "IE": "ie",
  "FR": "fr",
  "DE": "de",
  "ES": "es",
  "IT": "it",
  "NL": "nl",
  "PT": "pt",
  "BE": "be",
  "SE": "se",
  "NO": "no",
  "DK": "dk",
  "FI": "fi",
  "PL": "pl",
  "RU": "ru",
  "CA": "ca",
  "BR": "br",
  "MX": "mx",
  "AR": "ar",
  "CO": "co",
  "JP": "jp",
  "TH": "th",
  "PH": "ph",
  "CN": "cn",
  "KR": "kr",
  "IN": "in",
  "PK": "pk",
  "NG": "ng",
  "ZA": "za",
  "GH": "gh",
  "KE": "ke",
  "EG": "eg",
  "NZ": "nz",
  "AT": "at",
  "CH": "ch",
  "CZ": "cz",
  "HU": "hu",
  "RO": "ro",
  "HR": "hr",
  "RS": "rs",
  "BG": "bg",
  "GR": "gr",
  "TR": "tr",
  "UA": "ua",
  "JM": "jm",
  "TT": "tt",
  // Full country names
  "United Kingdom": "gb",
  "United States": "us",
  "Ireland": "ie",
  "France": "fr",
  "Germany": "de",
  "Spain": "es",
  "Brazil": "br",
  "Australia": "au",
  "Canada": "ca",
  "Netherlands": "nl",
  "Poland": "pl",
  "Russia": "ru",
  "Japan": "jp",
  "Thailand": "th",
  "Nigeria": "ng",
  "South Africa": "za",
  "Italy": "it",
  "Mexico": "mx",
  "Sweden": "se",
  "Denmark": "dk",
  "Norway": "no",
  "Finland": "fi",
  "Belgium": "be",
  "Portugal": "pt",
  "Scotland": "gb-sct",
  "Wales": "gb-wls",
  "England": "gb-eng",
  "New Zealand": "nz",
  "Philippines": "ph",
  "Argentina": "ar",
  "Colombia": "co",
  "South Korea": "kr",
  "China": "cn",
  "India": "in",
  "Pakistan": "pk",
  "Ghana": "gh",
  "Kenya": "ke",
  "Egypt": "eg",
  "Austria": "at",
  "Switzerland": "ch",
  "Czech Republic": "cz",
  "Hungary": "hu",
  "Romania": "ro",
  "Croatia": "hr",
  "Serbia": "rs",
  "Bulgaria": "bg",
  "Greece": "gr",
  "Turkey": "tr",
  "Ukraine": "ua",
  "Jamaica": "jm",
  "Trinidad and Tobago": "tt",
};

function resolveCode(countryCode: string): string {
  const lower = countryCode.toLowerCase();
  // Check name mapping first
  const mapped = COUNTRY_CODE_TO_ISO2[countryCode];
  if (mapped) return mapped;
  // If already 2-3 chars, treat as ISO code
  if (lower.length <= 3) {
    // Handle 3-letter codes
    if (lower === "aus") return "au";
    if (lower === "usa") return "us";
    return lower.slice(0, 2);
  }
  return lower;
}

interface FlagIconProps {
  countryCode: string | null | undefined;
  size?: number;
}

export function FlagIcon({ countryCode, size = 16 }: FlagIconProps) {
  if (!countryCode) return null;
  const code = resolveCode(countryCode);
  return (
    <img
      src={`https://flagicons.lipis.dev/flags/4x3/${code}.svg`}
      alt={countryCode}
      width={size}
      height={Math.round(size * 0.75)}
      style={{
        borderRadius: 2,
        objectFit: "cover",
        display: "inline-block",
        verticalAlign: "middle",
        flexShrink: 0,
      }}
    />
  );
}

export { getCountryLabel as getCountryDisplayName } from "@/lib/countries";
