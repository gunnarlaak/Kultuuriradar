#!/usr/bin/env python3
"""Generate a same-origin JSON snapshot of public cultural events for GitHub Pages."""
import datetime as dt
import html
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from zoneinfo import ZoneInfo

SOURCES = ["https://saare.events/api/events", "https://www.saare.events/api/events"]
OUTPUT = Path("data/events.json")
TZ = ZoneInfo("Europe/Tallinn")


def text(value):
    return html.unescape(re.sub(r"<[^>]*>", " ", str(value or ""))).strip()


def instant(value):
    if value is None or value == "":
        return None
    try:
        if isinstance(value, (int, float)):
            return dt.datetime.fromtimestamp(value / 1000 if value > 1e12 else value, dt.timezone.utc)
        v = str(value).strip().replace("Z", "+00:00")
        d = dt.datetime.fromisoformat(v)
        if d.tzinfo is None:
            d = d.replace(tzinfo=TZ)
        return d.astimezone(dt.timezone.utc)
    except (ValueError, TypeError, OverflowError):
        return None


def category(v, title):
    s = (" ".join(map(str, v)) if isinstance(v, list) else str(v or "")) + " " + str(title)
    s = s.lower()
    for name, pat in (
        ("festival", r"festival"),
        ("music", r"muusik|kontsert|music|concert|jazz|ooper|orkester|laul"),
        ("theatre", r"teater|etendus|theatre|lavastus|ballett"),
        ("art", r"näitus|kunst|muuseum|art|galerii|foto"),
        ("cinema", r"kino|film|cinema"),
    ):
        if re.search(pat, s):
            return name
    return "other"


def https_url(v):
    if isinstance(v, dict):
        v = v.get("uri", "")
    return v if isinstance(v, str) and v.startswith("https://") else ""


def collect(payload):
    if not isinstance(payload, dict) or not isinstance(payload.get("list"), list):
        raise ValueError("Unsupported API schema; expected {'list': [...]}")
    result = []
    now = dt.datetime.now(dt.timezone.utc)
    for item in payload["list"]:
        if not isinstance(item, dict):
            continue
        cat = category(item.get("categories"), item.get("title"))
        if cat == "other" and re.search(r"sport|võistlus", str(item.get("categories", "")), re.I):
            continue
        for i, event in enumerate(item.get("events") or []):
            if not isinstance(event, dict):
                continue
            start = instant(event.get("start") or event.get("start_string"))
            end = instant(event.get("end") or event.get("end_string")) or start
            if start is None or end < now:
                continue
            coords = event.get("coordinates") or {}
            try:
                lat = float(coords.get("lat"))
                lng = float(coords.get("lon") or coords.get("lng"))
            except (ValueError, TypeError, AttributeError):
                continue
            if not (-90 <= lat <= 90 and -180 <= lng <= 180) or lat == 0 or lng == 0:
                continue
            link = https_url(event.get("link") or item.get("additional_info_link"))
            images = item.get("images") or []
            photo = https_url(images[0]) if isinstance(images, list) and images else ""
            result.append({
                "id": "saare-%s-%s" % (str(item.get("id", "na")), i),
                "title": text(item.get("title") or "Kultuurisündmus"),
                "description": text(item.get("content")),
                "start": start.isoformat().replace("+00:00", "Z"),
                "end": end.isoformat().replace("+00:00", "Z"),
                "venue": text(event.get("place_string") or "Saaremaa"),
                "lat": lat, "lng": lng,
                "category": cat, "url": link, "image": photo,
                "source": "Saare sündmused",
            })
    return sorted(result, key=lambda event: event["start"])


def fetch():
    last = None
    for endpoint in SOURCES:
        for attempt in range(2):
            try:
                req = urllib.request.Request(endpoint, headers={
                    "Accept": "application/json",
                    "User-Agent": "Kultuuriradar/1.1 (+https://github.com/gunnarlaak/Kultuuriradar)",
                })
                with urllib.request.urlopen(req, timeout=25) as response:
                    blob = response.read(12_000_000)
                payload = json.loads(blob)
                print("Source status: OK; keys:", list(payload)[:12] if isinstance(payload, dict) else type(payload).__name__)
                return collect(payload)
            except Exception as err:
                last = err
                print("Fetch failed:", endpoint, type(err).__name__, str(err)[:200])
                if attempt == 0:
                    time.sleep(2)
    raise RuntimeError(str(last))


def main():
    now = dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00", "Z")
    try:
        events = fetch()
        doc = {"generated_at": now, "events": events,
               "sources": [{"name": "Saare sündmused", "ok": True}]}
        print("Parsed future events:", len(events))
    except Exception as err:
        print("Source unavailable:", type(err).__name__, str(err)[:300], file=sys.stderr)
        # Preserve a previous valid snapshot if one is available.
        old = OUTPUT
        if old.is_file():
            try:
                existing = json.loads(old.read_text(encoding="utf-8"))
                if existing.get("events"):
                    print("Keeping cached event snapshot")
                    return
            except (ValueError, OSError):
                pass
        doc = {"generated_at": now, "events": [],
               "sources": [{"name": "Saare sündmused", "ok": False}],
               "error": "Saaremaa sündmuste API vastus ei ole praegu kättesaadav"}
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print("Saved", str(OUTPUT), "bytes:", OUTPUT.stat().st_size)


if __name__ == "__main__":
    main()
