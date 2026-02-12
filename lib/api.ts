import { GARAGE_BACKEND_URL } from "./constants";
import type { Listing } from "./types";

interface CategoryAttribute {
  id: string;
  label: string;
}

export async function fetchListing(uuid: string): Promise<Listing> {
  const res = await fetch(`${GARAGE_BACKEND_URL}/listings/${uuid}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch listing: ${res.status}`);
  }
  return res.json() as Promise<Listing>;
}

export async function fetchCategoryAttributes(
  categoryId: string
): Promise<Map<string, string>> {
  try {
    const res = await fetch(
      `${GARAGE_BACKEND_URL}/categories/${categoryId}/attributes`
    );
    if (!res.ok) return new Map();
    const data = (await res.json()) as { attributes: CategoryAttribute[] };
    const map = new Map<string, string>();
    for (const attr of data.attributes ?? []) {
      map.set(attr.id, attr.label);
    }
    return map;
  } catch {
    return new Map();
  }
}
