/**
 * Import roads from OpenStreetMap Overpass API
 *
 * Usage: bun run scripts/import-osm-roads.ts [--dry-run]
 */

const OVERPASS_API = "https://overpass-api.de/api/interpreter";

// Query for Sri Lanka roads with ref tags (road numbers)
const OVERPASS_QUERY = `
[out:json][timeout:300];
area["name"="Sri Lanka"]->.sl;
(
  way["highway"]["ref"](area.sl);
);
out body;
`;

interface OSMElement {
  type: string;
  id: number;
  tags?: {
    ref?: string;
    name?: string;
    "name:si"?: string;
    "name:ta"?: string;
    highway?: string;
  };
}

interface OSMResponse {
  elements: OSMElement[];
}

interface RoadData {
  id: string;
  osmId: string;
  roadNumber: string;
  roadClass: string;
  name: string | null;
  nameSi: string | null;
  nameTa: string | null;
  lastUpdated: number;
}

function generateId(): string {
  return `road_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Infer road class from road number
 * A/AB/AA → A-class (National trunk roads)
 * B → B-class (National secondary roads)
 * C → C-class (Provincial main roads)
 * D → D-class (Provincial secondary roads)
 * E → E-class (Expressways)
 */
function inferRoadClass(roadNumber: string): string | null {
  const normalized = roadNumber.toUpperCase().trim();

  // Expressways (E01, E02, etc.)
  if (/^E\d/.test(normalized)) return "E";

  // A-class roads (A1, A2, AB1, AA1, etc.)
  if (/^A[A-Z]?\d/.test(normalized) || /^AA\d/.test(normalized) || /^AB\d/.test(normalized)) return "A";

  // B-class roads (B1, B2, etc.)
  if (/^B\d/.test(normalized)) return "B";

  // C-class roads (C1, C2, etc.)
  if (/^C\d/.test(normalized)) return "C";

  // D-class roads (D1, D2, etc.)
  if (/^D\d/.test(normalized)) return "D";

  return null;
}

/**
 * Normalize road number to consistent format
 */
function normalizeRoadNumber(ref: string): string {
  // Remove spaces and convert to uppercase
  return ref.replace(/\s+/g, "").toUpperCase();
}

async function fetchOSMRoads(): Promise<OSMResponse> {
  console.log("Fetching roads from Overpass API...");

  const response = await fetch(OVERPASS_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `data=${encodeURIComponent(OVERPASS_QUERY)}`,
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

function processOSMData(data: OSMResponse): RoadData[] {
  const roads: Map<string, RoadData> = new Map();
  const now = Math.floor(Date.now() / 1000);

  for (const element of data.elements) {
    if (element.type !== "way" || !element.tags?.ref) continue;

    // A single way might have multiple refs (e.g., "A1;B23")
    const refs = element.tags.ref.split(/[;,\/]/).map(r => r.trim());

    for (const ref of refs) {
      const roadNumber = normalizeRoadNumber(ref);
      const roadClass = inferRoadClass(roadNumber);

      if (!roadClass) continue; // Skip if we can't determine class

      // Use road number as key to dedupe
      if (!roads.has(roadNumber)) {
        roads.set(roadNumber, {
          id: generateId(),
          osmId: element.id.toString(),
          roadNumber,
          roadClass,
          name: element.tags.name || null,
          nameSi: element.tags["name:si"] || null,
          nameTa: element.tags["name:ta"] || null,
          lastUpdated: now,
        });
      } else {
        // Update name if we found a better one
        const existing = roads.get(roadNumber)!;
        if (!existing.name && element.tags.name) {
          existing.name = element.tags.name;
        }
        if (!existing.nameSi && element.tags["name:si"]) {
          existing.nameSi = element.tags["name:si"];
        }
        if (!existing.nameTa && element.tags["name:ta"]) {
          existing.nameTa = element.tags["name:ta"];
        }
      }
    }
  }

  return Array.from(roads.values());
}

function generateSQL(roads: RoadData[]): string {
  const statements: string[] = [];

  for (const road of roads) {
    const name = road.name ? `'${road.name.replace(/'/g, "''")}'` : "NULL";
    const nameSi = road.nameSi ? `'${road.nameSi.replace(/'/g, "''")}'` : "NULL";
    const nameTa = road.nameTa ? `'${road.nameTa.replace(/'/g, "''")}'` : "NULL";

    statements.push(
      `INSERT INTO roads (id, osm_id, road_number, road_class, name, name_si, name_ta, last_updated) ` +
      `VALUES ('${road.id}', '${road.osmId}', '${road.roadNumber}', '${road.roadClass}', ${name}, ${nameSi}, ${nameTa}, ${road.lastUpdated}) ` +
      `ON CONFLICT(osm_id) DO UPDATE SET ` +
      `road_number = '${road.roadNumber}', road_class = '${road.roadClass}', name = ${name}, ` +
      `name_si = ${nameSi}, name_ta = ${nameTa}, last_updated = ${road.lastUpdated};`
    );
  }

  return statements.join("\n");
}

async function main() {
  const isDryRun = process.argv.includes("--dry-run");

  console.log("=== OpenStreetMap Roads Import ===\n");

  try {
    // Fetch from OSM
    const osmData = await fetchOSMRoads();
    console.log(`Received ${osmData.elements.length} OSM elements`);

    // Process and dedupe
    const roads = processOSMData(osmData);
    console.log(`\nProcessed ${roads.length} unique classified roads:`);

    // Count by class
    const byClass: Record<string, number> = {};
    for (const road of roads) {
      byClass[road.roadClass] = (byClass[road.roadClass] || 0) + 1;
    }
    console.log(`  A-class: ${byClass["A"] || 0}`);
    console.log(`  B-class: ${byClass["B"] || 0}`);
    console.log(`  C-class: ${byClass["C"] || 0}`);
    console.log(`  D-class: ${byClass["D"] || 0}`);
    console.log(`  E-class: ${byClass["E"] || 0}`);

    // Generate SQL
    const sql = generateSQL(roads);

    if (isDryRun) {
      console.log("\n=== DRY RUN - SQL not executed ===\n");
      console.log("First 10 roads:");
      for (const road of roads.slice(0, 10)) {
        console.log(`  ${road.roadNumber} (${road.roadClass}): ${road.name || "unnamed"}`);
      }
      console.log("\nTo import, run without --dry-run flag");
    } else {
      // Write SQL to temp file for wrangler execution
      const tempFile = "/tmp/osm-roads-import.sql";
      await Bun.write(tempFile, sql);
      console.log(`\nSQL written to ${tempFile}`);
      console.log("\nTo import to local DB, run:");
      console.log(`  npx wrangler d1 execute rda-status-db --local --file=${tempFile}`);
      console.log("\nTo import to production, run:");
      console.log(`  npx wrangler d1 execute rda-status-db --remote --file=${tempFile}`);
    }

    // Also output JSON for reference
    const jsonFile = "/tmp/osm-roads.json";
    await Bun.write(jsonFile, JSON.stringify(roads, null, 2));
    console.log(`\nJSON data saved to ${jsonFile}`);

  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
