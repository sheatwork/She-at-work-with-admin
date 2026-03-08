// app/api/resources/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ResourcesTable } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";

// ─── Cache headers ────────────────────────────────────────────────────────────
// Resources are slow-changing (new schemes added occasionally),
// so a longer cache is fine.
const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
};

// ─── GET /api/resources ───────────────────────────────────────────────────────
//
// Query params:
//   scope          "INDIA_STATE" | "GLOBAL"          (required)
//   locationKeys   comma-separated location keys      (optional – returns ALL if omitted)
//   meta=1         returns distinct locationKeys + labels only (no scheme data)
//
// Examples:
//   /api/resources?scope=INDIA_STATE&meta=1
//   /api/resources?scope=INDIA_STATE&locationKeys=india,haryana,punjab
//   /api/resources?scope=GLOBAL&locationKeys=united-states,canada

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope") as "INDIA_STATE" | "GLOBAL" | null;

    if (!scope || !["INDIA_STATE", "GLOBAL"].includes(scope)) {
      return NextResponse.json(
        { error: "scope must be INDIA_STATE or GLOBAL" },
        { status: 400 }
      );
    }

    // ── ?meta=1 — return distinct location options only ───────────────────────
    // Used to populate the MultiSelectDropdown on page load
    if (searchParams.get("meta") === "1") {
      const locations = await db
        .selectDistinct({
          locationKey:   ResourcesTable.locationKey,
          locationLabel: ResourcesTable.locationLabel,
        })
        .from(ResourcesTable)
        .where(
          and(
            eq(ResourcesTable.scope, scope),
            eq(ResourcesTable.isActive, true)
          )
        )
        .orderBy(ResourcesTable.locationLabel);

      return NextResponse.json({ locations }, { headers: CACHE_HEADERS });
    }

    // ── Full scheme fetch ─────────────────────────────────────────────────────
    const locationKeysParam = searchParams.get("locationKeys") ?? "";
    const locationKeys = locationKeysParam
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    const conditions = [
      eq(ResourcesTable.scope, scope),
      eq(ResourcesTable.isActive, true),
    ];

    // If specific locations requested, add IN filter
    if (locationKeys.length > 0) {
      conditions.push(inArray(ResourcesTable.locationKey, locationKeys));
    }

    const rows = await db
      .select({
        id:            ResourcesTable.id,
        locationKey:   ResourcesTable.locationKey,
        locationLabel: ResourcesTable.locationLabel,
        title:         ResourcesTable.title,
        description:   ResourcesTable.description,
        link:          ResourcesTable.link,
        sourceId:      ResourcesTable.sourceId,
      })
      .from(ResourcesTable)
      .where(and(...conditions))
      .orderBy(ResourcesTable.locationLabel, ResourcesTable.title);

    // Group by locationKey so each location has its schemes array
    // Structure: { [locationKey]: { label: string, schemes: Scheme[] } }
    const grouped: Record<
      string,
      { label: string; schemes: { id: string; title: string; description: string; link: string }[] }
    > = {};

    for (const row of rows) {
      if (!grouped[row.locationKey]) {
        grouped[row.locationKey] = {
          label: row.locationLabel,
          schemes: [],
        };
      }
      grouped[row.locationKey].schemes.push({
        id:          row.id,
        title:       row.title,
        description: row.description ?? "",
        link:        row.link ?? "",
      });
    }

    return NextResponse.json({ grouped }, { headers: CACHE_HEADERS });
  } catch (err) {
    console.error("[GET /api/resources]", err);
    return NextResponse.json(
      { error: "Failed to fetch resources" },
      { status: 500 }
    );
  }
}