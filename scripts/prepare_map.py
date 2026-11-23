"""Download and simplify the India state GeoJSON for the choropleth map.

Output: frontend/public/india-states.geojson  (~200-500 KB instead of 23 MB)
Run: python scripts/prepare_map.py
"""
from __future__ import annotations

import json
import math
import urllib.request
from pathlib import Path

SOURCE = "https://raw.githubusercontent.com/geohacker/india/master/state/india_state.geojson"
OUTPUT = Path(__file__).resolve().parent.parent / "frontend" / "public" / "india-states.geojson"
EPSILON = 0.04  # degrees; adjust for more/less detail


def perpendicular_distance(point, start, end):
    if start == end:
        return math.hypot(point[0] - start[0], point[1] - start[1])
    dx, dy = end[0] - start[0], end[1] - start[1]
    t = ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / (dx * dx + dy * dy)
    t = max(0, min(1, t))
    proj = (start[0] + t * dx, start[1] + t * dy)
    return math.hypot(point[0] - proj[0], point[1] - proj[1])


def rdp(points: list, epsilon: float) -> list:
    if len(points) < 3:
        return points
    dmax, index = 0.0, 0
    for i in range(1, len(points) - 1):
        d = perpendicular_distance(points[i], points[0], points[-1])
        if d > dmax:
            dmax, index = d, i
    if dmax > epsilon:
        return rdp(points[:index + 1], epsilon)[:-1] + rdp(points[index:], epsilon)
    return [points[0], points[-1]]


def simplify_ring(ring: list) -> list:
    rounded = [[round(p[0], 3), round(p[1], 3)] for p in ring]
    # remove consecutive duplicates introduced by rounding
    deduped = [rounded[0]] if rounded else []
    for p in rounded[1:]:
        if p != deduped[-1]:
            deduped.append(p)
    if len(deduped) < 4:
        return deduped
    return rdp(deduped, EPSILON)


def simplify_geometry(geom: dict) -> dict:
    gtype = geom["type"]
    if gtype == "Polygon":
        return {"type": gtype, "coordinates": [simplify_ring(r) for r in geom["coordinates"]]}
    if gtype == "MultiPolygon":
        return {
            "type": gtype,
            "coordinates": [[simplify_ring(r) for r in poly] for poly in geom["coordinates"]],
        }
    return geom


def main():
    print("Downloading India state GeoJSON ...")
    with urllib.request.urlopen(SOURCE, timeout=120) as response:
        raw = response.read()
    data = json.loads(raw)
    print(f"Source: {len(raw) / 1024 / 1024:.1f} MB, {len(data['features'])} features")

    features = []
    for feature in data["features"]:
        props = feature.get("properties", {})
        # normalise a state-name property for easy joining in the frontend
        name = props.get("NAME_1") or props.get("statenme") or props.get("STATE") or props.get("name") or ""
        features.append({
            "type": "Feature",
            "properties": {"state": name},
            "geometry": simplify_geometry(feature["geometry"]),
        })

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT.open("w", encoding="utf-8") as handle:
        json.dump({"type": "FeatureCollection", "features": features}, handle, separators=(",", ":"))
    print(f"Wrote {OUTPUT} ({OUTPUT.stat().st_size / 1024:.0f} KB)")
    print("Sample names:", [f["properties"]["state"] for f in features[:6]])


if __name__ == "__main__":
    main()
