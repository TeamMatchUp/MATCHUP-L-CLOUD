export const ALL_COUNTRIES = [
  { code: "UK", label: "United Kingdom" },
  { code: "USA", label: "United States" },
  { code: "IE", label: "Ireland" },
  { code: "FR", label: "France" },
  { code: "DE", label: "Germany" },
  { code: "ES", label: "Spain" },
  { code: "IT", label: "Italy" },
  { code: "NL", label: "Netherlands" },
  { code: "PT", label: "Portugal" },
  { code: "BE", label: "Belgium" },
  { code: "AT", label: "Austria" },
  { code: "CH", label: "Switzerland" },
  { code: "SE", label: "Sweden" },
  { code: "NO", label: "Norway" },
  { code: "DK", label: "Denmark" },
  { code: "FI", label: "Finland" },
  { code: "PL", label: "Poland" },
  { code: "CZ", label: "Czech Republic" },
  { code: "HU", label: "Hungary" },
  { code: "RO", label: "Romania" },
  { code: "HR", label: "Croatia" },
  { code: "RS", label: "Serbia" },
  { code: "BG", label: "Bulgaria" },
  { code: "GR", label: "Greece" },
  { code: "TR", label: "Turkey" },
  { code: "UA", label: "Ukraine" },
  { code: "RU", label: "Russia" },
  { code: "CA", label: "Canada" },
  { code: "BR", label: "Brazil" },
  { code: "MX", label: "Mexico" },
  { code: "AR", label: "Argentina" },
  { code: "CO", label: "Colombia" },
  { code: "JM", label: "Jamaica" },
  { code: "TT", label: "Trinidad and Tobago" },
  { code: "AUS", label: "Australia" },
  { code: "NZ", label: "New Zealand" },
  { code: "JP", label: "Japan" },
  { code: "TH", label: "Thailand" },
  { code: "PH", label: "Philippines" },
  { code: "CN", label: "China" },
  { code: "KR", label: "South Korea" },
  { code: "IN", label: "India" },
  { code: "PK", label: "Pakistan" },
  { code: "NG", label: "Nigeria" },
  { code: "ZA", label: "South Africa" },
  { code: "GH", label: "Ghana" },
  { code: "KE", label: "Kenya" },
  { code: "EG", label: "Egypt" },
] as const;

export type CountryEntry = (typeof ALL_COUNTRIES)[number];

export function getCountryLabel(code: string | null | undefined): string {
  if (!code) return "";
  const entry = ALL_COUNTRIES.find((c) => c.code === code);
  return entry ? entry.label : code;
}

export function filterCountries(search: string) {
  if (!search) return [...ALL_COUNTRIES];
  const lower = search.toLowerCase();
  return ALL_COUNTRIES.filter(
    (c) =>
      c.label.toLowerCase().includes(lower) ||
      c.code.toLowerCase().includes(lower)
  );
}
