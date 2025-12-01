// Sri Lanka provinces and districts data

export interface District {
  id: string;
  name: string;
}

export interface Province {
  id: string;
  name: string;
  districts: District[];
}

export const provinces: Province[] = [
  {
    id: "central",
    name: "Central",
    districts: [
      { id: "kandy", name: "Kandy" },
      { id: "matale", name: "Matale" },
      { id: "nuwara-eliya", name: "Nuwara Eliya" },
    ],
  },
  {
    id: "eastern",
    name: "Eastern",
    districts: [
      { id: "ampara", name: "Ampara" },
      { id: "batticaloa", name: "Batticaloa" },
      { id: "trincomalee", name: "Trincomalee" },
    ],
  },
  {
    id: "north-central",
    name: "North Central",
    districts: [
      { id: "anuradhapura", name: "Anuradhapura" },
      { id: "polonnaruwa", name: "Polonnaruwa" },
    ],
  },
  {
    id: "northern",
    name: "Northern",
    districts: [
      { id: "jaffna", name: "Jaffna" },
      { id: "kilinochchi", name: "Kilinochchi" },
      { id: "mannar", name: "Mannar" },
      { id: "mullaitivu", name: "Mullaitivu" },
      { id: "vavuniya", name: "Vavuniya" },
    ],
  },
  {
    id: "north-western",
    name: "North Western",
    districts: [
      { id: "kurunegala", name: "Kurunegala" },
      { id: "puttalam", name: "Puttalam" },
    ],
  },
  {
    id: "sabaragamuwa",
    name: "Sabaragamuwa",
    districts: [
      { id: "kegalle", name: "Kegalle" },
      { id: "ratnapura", name: "Ratnapura" },
    ],
  },
  {
    id: "southern",
    name: "Southern",
    districts: [
      { id: "galle", name: "Galle" },
      { id: "hambantota", name: "Hambantota" },
      { id: "matara", name: "Matara" },
    ],
  },
  {
    id: "uva",
    name: "Uva",
    districts: [
      { id: "badulla", name: "Badulla" },
      { id: "monaragala", name: "Monaragala" },
    ],
  },
  {
    id: "western",
    name: "Western",
    districts: [
      { id: "colombo", name: "Colombo" },
      { id: "gampaha", name: "Gampaha" },
      { id: "kalutara", name: "Kalutara" },
    ],
  },
];

// Helper to get all districts for a province
export function getDistrictsForProvince(provinceId: string): District[] {
  const province = provinces.find((p) => p.id === provinceId);
  return province?.districts || [];
}

// Helper to get province by name (flexible matching)
export function findProvinceByName(name: string): Province | undefined {
  const normalized = name.toLowerCase().replace(/\s+/g, "-");
  return provinces.find(
    (p) =>
      p.id === normalized ||
      p.name.toLowerCase() === name.toLowerCase() ||
      p.name.toLowerCase().includes(name.toLowerCase())
  );
}

// Helper to get district by name within a province
export function findDistrictByName(
  provinceName: string,
  districtName: string
): District | undefined {
  const province = findProvinceByName(provinceName);
  if (!province) return undefined;

  const normalized = districtName.toLowerCase();
  return province.districts.find(
    (d) =>
      d.name.toLowerCase() === normalized ||
      d.name.toLowerCase().includes(normalized)
  );
}

// Approximate bounding boxes for provinces (for reverse geocoding fallback)
// Format: [minLat, maxLat, minLng, maxLng]
export const provinceBounds: Record<string, [number, number, number, number]> = {
  central: [6.9, 7.6, 80.3, 81.1],
  eastern: [6.8, 8.8, 81.1, 81.9],
  "north-central": [7.7, 8.6, 79.9, 81.3],
  northern: [8.6, 9.9, 79.5, 80.8],
  "north-western": [7.0, 8.5, 79.5, 80.5],
  sabaragamuwa: [6.4, 7.3, 80.0, 80.8],
  southern: [5.9, 6.6, 79.8, 81.4],
  uva: [6.2, 7.4, 80.7, 81.5],
  western: [6.4, 7.2, 79.7, 80.3],
};

// Find province by coordinates (approximate)
export function findProvinceByCoords(lat: number, lng: number): Province | undefined {
  for (const [provinceId, [minLat, maxLat, minLng, maxLng]] of Object.entries(provinceBounds)) {
    if (lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng) {
      return provinces.find((p) => p.id === provinceId);
    }
  }
  return undefined;
}
