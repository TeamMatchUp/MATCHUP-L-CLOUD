const COUNTRY_NAME_TO_ISO2: Record<string, string> = {
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
  // DB enum values
  "UK": "gb",
  "USA": "us",
  "AUS": "au",
};

function resolveCode(countryCode: string): string {
  const lower = countryCode.toLowerCase();
  // Check name mapping first
  const mapped = COUNTRY_NAME_TO_ISO2[countryCode];
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

export function getCountryDisplayName(code: string | null | undefined): string {
  if (!code) return "";
  const reverseMap: Record<string, string> = {
    UK: "United Kingdom",
    USA: "United States",
    AUS: "Australia",
  };
  return reverseMap[code] || code;
}
