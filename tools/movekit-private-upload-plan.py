#!/usr/bin/env python3
"""MoveKit Golden V2 private media migration — audit/plan first, never public.

No media bytes, vendor descriptions or secret keys are included in Git. Default
mode is entirely read-only and offline. Explicit --execute is bounded and
requires operator approval + environment-level security gate, scoped to one
trusted Supabase project. No upsert/overwrite/delete is implemented.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
from pathlib import Path
from urllib import error, parse, request

BASE = "https://mhfxhzkdmgkaplicdszg.supabase.co"
BUCKETS = {"video": "exercise-media", "poster": "exercise-posters"}
MIMES = {"video": "video/mp4", "poster": "image/webp"}
UID = re.compile(r"^TK-\d{6}$")
SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
HASH = re.compile(r"^[0-9a-f]{64}$")
APPROVAL = re.compile(r"^TK504-[0-9]{8}-[0-9]{3,6}$")
SOURCE = Path(r"C:\Movikit")


def require(condition: bool, error_code: str):
    if not condition:
        raise ValueError(error_code)


def digest_file(path: Path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def json_file(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def poster_registry_file(source: Path):
    return source / ".tk-private-review/posters-webp-v2/catalog-poster-registry.json"


def prepare(repo: Path, source: Path, verify_hashes: bool = True):
    """Deterministic manifest with no raw bytes, valid only for exact 582 set."""
    repo, source = repo.resolve(), source.resolve()
    require(source != repo and repo not in source.parents, "SOURCE_WITHIN_REPO")
    inventory_path = repo / "docs/generated/MOVEKIT_GOLDEN_V2_INVENTORY.json"
    inv = json_file(inventory_path)
    posters = json_file(poster_registry_file(source))
    require(inv.get("schema") == "trainingskompas-movekit-golden-inventory/2.0"
            and inv.get("status") == "STAGING_ONLY_DO_NOT_ACTIVATE"
            and len(inv.get("items", [])) == 582, "INVALID_GOLDEN_INVENTORY")
    require(posters.get("schema") == "trainingskompas-movekit-private-poster-registry/1.0"
            and posters.get("status") == "LOCAL_ONLY_NO_UPLOAD_NO_RELEASE"
            and posters.get("count") == 582 and len(posters.get("items", [])) == 582,
            "PRIVATE_POSTER_REGISTRY_INVALID")
    vdirs = [p for p in source.iterdir() if p.is_dir()
             and p.name.startswith("complete-exercise-library-golden-release-")]
    require(len(vdirs) == 1, "EXPECTED_EXACTLY_ONE_VIDEO_SOURCE")
    video_dir = vdirs[0]
    optimized_dir = poster_registry_file(source).parent
    by_poster = {}
    for entry in posters["items"]:
        require(isinstance(entry, dict), "INVALID_POSTER_ENTRY")
        cid = entry.get("catalog_id")
        slug = entry.get("provider_id")
        require(isinstance(cid, str) and UID.fullmatch(cid)
                and isinstance(slug, str) and SLUG.fullmatch(slug)
                and cid not in by_poster, "DUPLICATE_POSTER_ID")
        by_poster[cid] = entry
    items = []
    ids = set()
    slugs = set()
    for row in inv["items"]:
        cid, slug = row["catalog_id"], row["provider_id"]
        require(isinstance(cid, str) and UID.fullmatch(cid)
                and isinstance(slug, str) and SLUG.fullmatch(slug)
                and cid not in ids and slug not in slugs,
                "DUPLICATE_OR_INVALID_MEDIA_ID")
        ids.add(cid)
        slugs.add(slug)
        image = by_poster.get(cid)
        require(image is not None and image["provider_id"] == slug
                and image["private_storage_path"] ==
                "movekit/v2/poster-optimized/" + slug + ".webp",
                "POSTER_CATALOG_ID_MISMATCH")
        for kind in ("video", "poster"):
            ref = row["video"] if kind == "video" else image
            path = video_dir / (slug + ".mp4") if kind == "video" \
                else optimized_dir / (slug + ".webp")
            expected_path = ("movekit/v2/video/" + slug + ".mp4") if kind == "video" \
                else "movekit/v2/poster-optimized/" + slug + ".webp"
            storage_path = ref["path"] if kind == "video" else ref["private_storage_path"]
            size = ref["bytes"]
            sha = ref["sha256"]
            require(storage_path == expected_path and isinstance(size, int) and size > 0
                    and isinstance(sha, str) and HASH.fullmatch(sha),
                    "UNTRUSTED_MANIFEST_MEDIA")
            require(path.is_file() and path.stat().st_size == size,
                    "MISSING_OR_CHANGED_SOURCE_MEDIA")
            if verify_hashes:
                require(digest_file(path) == sha, "SOURCE_MEDIA_HASH_MISMATCH")
            items.append({
                "catalog_id": cid, "source": slug, "kind": kind,
                "bucket": BUCKETS[kind], "storage_path": storage_path,
                "mime": MIMES[kind], "sha256": sha, "bytes": size,
                "_local_file": path
            })
    require(len(ids) == 582 and len(slugs) == 582 and len(by_poster) == 582
            and len(items) == 1164, "INCOMPLETE_MEDIA_SET")
    require({p.stem for p in video_dir.glob("*.mp4")} == slugs,
            "UNEXPECTED_SOURCE_VIDEOS")
    require({p.stem for p in optimized_dir.glob("*.webp")} == slugs,
            "UNEXPECTED_OPTIMIZED_POSTERS")
    return items


def safe_report(entries):
    """Exclude local paths; never output raw credentials or media content."""
    return {
        "schema": "trainingskompas-movekit-v2-private-upload-plan/1.0",
        "status": "PRIVATE_TRANSFER_NOT_EXECUTED",
        "destination": BASE,
        "media_count": len(entries),
        "catalog_id_count": len({x["catalog_id"] for x in entries}),
        "video_count": sum(x["kind"] == "video" for x in entries),
        "poster_count": sum(x["kind"] == "poster" for x in entries),
        "video_bytes": sum(x["bytes"] for x in entries if x["kind"] == "video"),
        "poster_bytes": sum(x["bytes"] for x in entries if x["kind"] == "poster"),
        "public_media_release": False,
        "storage_requires_private_buckets": True,
        "entries": [
            {k: v for k, v in row.items() if not k.startswith("_")}
            for row in sorted(entries, key=lambda x: (x["catalog_id"], x["kind"]))
        ]
    }


def allow_plan_path(destination: Path, source: Path, repo: Path):
    destination = destination.resolve()
    source = source.resolve()
    repo = repo.resolve()
    secure_dir = (source / ".tk-private-review").resolve()
    require(destination.parent == secure_dir and destination.suffix == ".json",
            "PLAN_MUST_STAY_PRIVATE")
    require(repo not in destination.parents, "PLAN_CANNOT_ENTER_PUBLIC_REPO")
    require(not destination.exists(), "PLAN_ALREADY_EXISTS")
    return destination


class RefuseRedirect(request.HTTPRedirectHandler):
    """Authorization headers must never be forwarded to another host."""
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class StorageTransport:
    """Strictly fixed-project HTTPS Supabase Storage adapter, no redirects."""
    def __init__(self, key: str, opener=None):
        require(isinstance(key, str) and len(key) >= 16, "SERVICE_KEY_REQUIRED")
        self.key = key
        self.opener = opener or request.build_opener(RefuseRedirect()).open

    def _request(self, method, suffix, body=None, mime=None):
        require(suffix.startswith("/storage/v1/"), "INVALID_STORAGE_ROUTE")
        url = BASE + suffix
        headers = {"apikey": self.key, "Authorization": "Bearer " + self.key}
        if mime:
            headers["Content-Type"] = mime
            headers["x-upsert"] = "false"
            headers["cache-control"] = "no-store"
        req = request.Request(url, data=body, headers=headers, method=method)
        try:
            return self.opener(req, timeout=120)
        except error.HTTPError as exc:
            if exc.code == 404:
                return None
            raise ValueError("SUPABASE_REMOTE_HTTP_" + str(exc.code)) from None

    def check_private_bucket(self, bucket, mime):
        require(bucket in BUCKETS.values(), "UNTRUSTED_BUCKET")
        r = self._request("GET", "/storage/v1/bucket/" + bucket)
        require(r is not None, "PRIVATE_BUCKET_NOT_FOUND")
        with r:
            bucket_meta = json.load(r)
        require(bucket_meta.get("id") == bucket and bucket_meta.get("public") is False,
                "BUCKET_NOT_PRIVATE")
        allowed = bucket_meta.get("allowed_mime_types")
        require(allowed is None or mime in allowed, "BUCKET_MIME_NOT_ALLOWED")
        return True

    def remote_digest(self, item):
        """Download and hash existing object to decide if it is safe to skip."""
        path = self._path(item)
        url = "/storage/v1/object/authenticated/" + path
        r = self._request("GET", url)
        if r is None:
            return None
        md = hashlib.sha256()
        size = 0
        with r:
            for chunk in iter(lambda: r.read(1024 * 1024), b""):
                md.update(chunk)
                size += len(chunk)
                require(size <= item["bytes"], "REMOTE_OVERSIZED_MEDIA")
        return (size, md.hexdigest())

    def upload_new(self, item):
        """POST no-upsert only. No update, delete, public upload or overwrite."""
        self._path(item)
        local = item["_local_file"]
        require(digest_file(local) == item["sha256"], "SOURCE_CHANGED_BEFORE_UPLOAD")
        # Supabase's standard upload endpoint expects a body and Content-Type.
        # Buffer max one object at a time; per-bucket file cap is 32 MiB.
        require(item["bytes"] <= 32 * 1024 * 1024, "OBJECT_OVER_BUCKET_SIZE_LIMIT")
        payload = local.read_bytes()
        require(len(payload) == item["bytes"], "LOCAL_LENGTH_CHANGED")
        result = self._request("POST", "/storage/v1/object/" + self._path(item),
                               body=payload, mime=item["mime"])
        require(result is not None, "STORAGE_UPLOAD_NOT_CONFIRMED")
        with result:
            result.read(4096)
        return True

    @staticmethod
    def _path(item):
        kind = item["kind"]
        bucket = BUCKETS.get(kind)
        value = item["storage_path"]
        slug = item["source"]
        require(bucket == item["bucket"] and SLUG.fullmatch(slug) and
                value == ("movekit/v2/video/" + slug + ".mp4" if kind == "video"
                          else "movekit/v2/poster-optimized/" + slug + ".webp"),
                "UNTRUSTED_UPLOAD_PATH")
        return bucket + "/" + value


def execute(entries, storage, kind, max_objects, max_bytes):
    """Bounded sequential upload, fail on existing mismatch, verify remote SHA."""
    require(kind in BUCKETS, "INVALID_UPLOAD_KIND")
    require(0 < max_objects <= 20 and 0 < max_bytes <= 64 * 1024 * 1024,
            "UNSAFE_UPLOAD_BUDGET")
    eligible = [item for item in entries if item["kind"] == kind]
    storage.check_private_bucket(BUCKETS[kind], MIMES[kind])
    summary = {"mode": "PRIVATE_NO_OVERWRITE", "kind": kind,
               "remote_verified": 0, "new_uploaded": 0,
               "already_verified": 0, "bytes_transferred_estimate": 0}
    for item in eligible[:max_objects]:
        # Reserve worst case: one full upload plus one full integrity download.
        # Actual transfer differs with HTTP buffering and provider overhead.
        if summary["bytes_transferred_estimate"] + 2 * item["bytes"] > max_bytes:
            break
        before = storage.remote_digest(item)
        if before is not None:
            summary["bytes_transferred_estimate"] += item["bytes"]
            require(before == (item["bytes"], item["sha256"]),
                    "EXISTING_REMOTE_MEDIA_INTEGRITY_MISMATCH")
            summary["already_verified"] += 1
        else:
            storage.upload_new(item)
            summary["bytes_transferred_estimate"] += item["bytes"]
            after = storage.remote_digest(item)
            summary["bytes_transferred_estimate"] += item["bytes"]
            require(after == (item["bytes"], item["sha256"]),
                    "UPLOADED_REMOTE_MEDIA_INTEGRITY_MISMATCH")
            summary["new_uploaded"] += 1
        summary["remote_verified"] += 1
    return summary


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=SOURCE)
    parser.add_argument("--mode", choices=["audit", "plan", "execute"], default="audit")
    parser.add_argument("--plan-output", type=Path)
    parser.add_argument("--kind", choices=["video", "poster"])
    parser.add_argument("--max-objects", type=int, default=1)
    parser.add_argument("--max-bytes", type=int, default=16 * 1024 * 1024)
    parser.add_argument("--approval-id")
    opts = parser.parse_args()
    repo = Path(__file__).resolve().parent.parent
    if opts.mode == "execute":
        require(opts.kind is not None and opts.approval_id and APPROVAL.fullmatch(opts.approval_id),
                "EXPLICIT_APPROVAL_ID_REQUIRED")
        require(os.getenv("TK504_PRIVATE_UPLOAD_APPROVED") == "true",
                "PRIVATE_UPLOAD_NOT_APPROVED")
        require(os.getenv("MOVEKIT_V2_LICENSE_REVIEWED") == "true",
                "LICENSE_EVIDENCE_NOT_VERIFIED")
    items = prepare(repo, opts.source, verify_hashes=True)
    result = safe_report(items)
    if opts.mode == "plan":
        require(opts.plan_output is not None, "PRIVATE_PLAN_OUTPUT_REQUIRED")
        out = allow_plan_path(opts.plan_output, opts.source, repo)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
        print(json.dumps({k: v for k, v in result.items() if k != "entries"}, indent=2))
        print("local_plan", out)
        return
    if opts.mode == "execute":
        key = os.getenv("TK504_SUPABASE_SERVICE_ROLE_KEY")
        require(key, "SERVICE_KEY_REQUIRED")
        summary = execute(items, StorageTransport(key), opts.kind,
                          opts.max_objects, opts.max_bytes)
        print(json.dumps(summary, indent=2))
        return
    print(json.dumps({k: v for k, v in result.items() if k != "entries"}, indent=2))


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, KeyError, TypeError) as exc:
        print("STOP:", str(exc), file=sys.stderr)
        raise SystemExit(2)
