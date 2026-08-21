// A practical (not exhaustive) list of countries for the WhatsApp number
// field's country-code select. Ordered with Israel first (the default,
// and where this business operates), then roughly by region.
export type CountryCode = { name: string; iso: string; dialCode: string };

export const COUNTRY_CODES: CountryCode[] = [
  { name: "Israel", iso: "IL", dialCode: "+972" },
  { name: "Palestine", iso: "PS", dialCode: "+970" },
  { name: "Jordan", iso: "JO", dialCode: "+962" },
  { name: "Lebanon", iso: "LB", dialCode: "+961" },
  { name: "Egypt", iso: "EG", dialCode: "+20" },
  { name: "Cyprus", iso: "CY", dialCode: "+357" },
  { name: "Turkey", iso: "TR", dialCode: "+90" },
  { name: "United Arab Emirates", iso: "AE", dialCode: "+971" },
  { name: "Saudi Arabia", iso: "SA", dialCode: "+966" },
  { name: "Qatar", iso: "QA", dialCode: "+974" },
  { name: "Kuwait", iso: "KW", dialCode: "+965" },
  { name: "Bahrain", iso: "BH", dialCode: "+973" },
  { name: "Oman", iso: "OM", dialCode: "+968" },
  { name: "United States", iso: "US", dialCode: "+1" },
  { name: "Canada", iso: "CA", dialCode: "+1" },
  { name: "United Kingdom", iso: "GB", dialCode: "+44" },
  { name: "Ireland", iso: "IE", dialCode: "+353" },
  { name: "France", iso: "FR", dialCode: "+33" },
  { name: "Germany", iso: "DE", dialCode: "+49" },
  { name: "Italy", iso: "IT", dialCode: "+39" },
  { name: "Spain", iso: "ES", dialCode: "+34" },
  { name: "Portugal", iso: "PT", dialCode: "+351" },
  { name: "Netherlands", iso: "NL", dialCode: "+31" },
  { name: "Belgium", iso: "BE", dialCode: "+32" },
  { name: "Switzerland", iso: "CH", dialCode: "+41" },
  { name: "Austria", iso: "AT", dialCode: "+43" },
  { name: "Sweden", iso: "SE", dialCode: "+46" },
  { name: "Norway", iso: "NO", dialCode: "+47" },
  { name: "Denmark", iso: "DK", dialCode: "+45" },
  { name: "Finland", iso: "FI", dialCode: "+358" },
  { name: "Poland", iso: "PL", dialCode: "+48" },
  { name: "Czechia", iso: "CZ", dialCode: "+420" },
  { name: "Greece", iso: "GR", dialCode: "+30" },
  { name: "Romania", iso: "RO", dialCode: "+40" },
  { name: "Hungary", iso: "HU", dialCode: "+36" },
  { name: "Ukraine", iso: "UA", dialCode: "+380" },
  { name: "Russia", iso: "RU", dialCode: "+7" },
  { name: "Morocco", iso: "MA", dialCode: "+212" },
  { name: "Tunisia", iso: "TN", dialCode: "+216" },
  { name: "Algeria", iso: "DZ", dialCode: "+213" },
  { name: "South Africa", iso: "ZA", dialCode: "+27" },
  { name: "Nigeria", iso: "NG", dialCode: "+234" },
  { name: "Kenya", iso: "KE", dialCode: "+254" },
  { name: "India", iso: "IN", dialCode: "+91" },
  { name: "Pakistan", iso: "PK", dialCode: "+92" },
  { name: "China", iso: "CN", dialCode: "+86" },
  { name: "Japan", iso: "JP", dialCode: "+81" },
  { name: "South Korea", iso: "KR", dialCode: "+82" },
  { name: "Hong Kong", iso: "HK", dialCode: "+852" },
  { name: "Singapore", iso: "SG", dialCode: "+65" },
  { name: "Thailand", iso: "TH", dialCode: "+66" },
  { name: "Vietnam", iso: "VN", dialCode: "+84" },
  { name: "Philippines", iso: "PH", dialCode: "+63" },
  { name: "Indonesia", iso: "ID", dialCode: "+62" },
  { name: "Malaysia", iso: "MY", dialCode: "+60" },
  { name: "Australia", iso: "AU", dialCode: "+61" },
  { name: "New Zealand", iso: "NZ", dialCode: "+64" },
  { name: "Brazil", iso: "BR", dialCode: "+55" },
  { name: "Argentina", iso: "AR", dialCode: "+54" },
  { name: "Mexico", iso: "MX", dialCode: "+52" },
  { name: "Chile", iso: "CL", dialCode: "+56" },
  { name: "Colombia", iso: "CO", dialCode: "+57" },
];

export const DEFAULT_COUNTRY_DIAL_CODE = "+972";

/** ISO 3166-1 alpha-2 -> flag emoji, via Unicode regional indicator
 * symbols (no emoji data to hand-maintain / get wrong). */
export function countryFlagEmoji(iso: string): string {
  return iso
    .toUpperCase()
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}
