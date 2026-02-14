export function toKMorMeter(num) {
  return num < 1000 ? parseInt(num) + " meters" : parseInt(num / 1000) + " Kilo meters";
}

export function tosqKMorMeter(num) {
  const sqKm = num / 1_000_000;
  return sqKm > 10 ? `${Math.round(sqKm)} square kilometers` : `${sqKm.toFixed(2)} square kilometers`;
}

export const geocodingAPI = "https://nominatim.geocoding.ai";
export const headerofNominatim = {
  referrerPolicy: "strict-origin-when-cross-origin",
  headers: {
    "User-Agent": "World-Map-Explorer/1.0",
  },
};

