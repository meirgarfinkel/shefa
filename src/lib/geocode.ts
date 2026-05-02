export interface Coordinates {
  lat: number;
  lon: number;
}

export async function geocodeCityState(city: string, state: string): Promise<Coordinates | null> {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("city", city);
    url.searchParams.set("state", state);
    url.searchParams.set("country", "us");
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");

    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "Shefa Job Board" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as { lat: string; lon: string }[];
    if (!data.length) return null;

    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}
