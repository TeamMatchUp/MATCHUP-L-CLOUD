import { useState, useCallback } from "react";

interface PostcodeCoords {
  latitude: number;
  longitude: number;
  postcode: string;
}

/**
 * Geocode a UK postcode using the free postcodes.io API.
 */
async function geocodePostcode(postcode: string): Promise<PostcodeCoords | null> {
  const trimmed = postcode.trim().replace(/\s+/g, "");
  if (!trimmed) return null;
  try {
    const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(trimmed)}`);
    if (!res.ok) return null;
    const json = await res.json();
    if (json.status !== 200 || !json.result) return null;
    return {
      latitude: json.result.latitude,
      longitude: json.result.longitude,
      postcode: json.result.postcode,
    };
  } catch {
    return null;
  }
}

/**
 * Haversine distance in miles between two lat/lng points.
 */
export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function usePostcodeSearch() {
  const [postcode, setPostcode] = useState("");
  const [radius, setRadius] = useState(25); // miles
  const [coords, setCoords] = useState<PostcodeCoords | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = useCallback(async () => {
    if (!postcode.trim()) {
      setCoords(null);
      setError(null);
      return;
    }
    setIsGeocoding(true);
    setError(null);
    const result = await geocodePostcode(postcode);
    if (result) {
      setCoords(result);
    } else {
      setCoords(null);
      setError("Postcode not found");
    }
    setIsGeocoding(false);
  }, [postcode]);

  const clear = useCallback(() => {
    setPostcode("");
    setCoords(null);
    setError(null);
  }, []);

  return { postcode, setPostcode, radius, setRadius, coords, isGeocoding, error, lookup, clear };
}
