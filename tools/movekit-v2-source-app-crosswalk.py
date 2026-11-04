#!/usr/bin/env python3
"""Source -> app crosswalk OBSERVATION audit (pure, deterministic, read-only, fail-closed).

What this is: a versioned *historical observation* of how the 226 already-published
catalog rows relate supplier (MoveKit) terms to app labels, field by field, and a
coverage/contradiction audit of the ACCEPT proposals of the 356-entry ledger against that
history.

What this is NOT:
* not a translation table, not a taxonomy decision, not evidence of exercise truth;
* not source evidence for category/type (the release gate compares those separately)
  and not evidence for goals (the supplier has none);
* not an approval: ``classification_approved``, ``release_authorized`` and
  ``gate_flags_cleared`` are always False. A historical match is only labelled
  ``HISTORICAL_MATCH_ONLY``; it never clears a G6/G7 flag.

Design:
* Identity: every published row is bound by supplier ``provider_id`` + canonical catalog id
  against the 582 supplier rows and the 582-item inventory; the ledger is re-validated
  with the existing ledger validator against caller-pinned file hashes. Any mismatch
  raises/flags and yields NO mappings.
* A 1:1 mapping (source term -> app label) exists only if >= 3 distinct published
  catalog ids each carry exactly ONE source term and exactly ONE app label in that field,
  ALL with the same app label, and no multi-term published row contradicts it. Empty app
  lists (common for secondary muscles) are never a positive mapping nor a counter-example.
* Known false synonyms (Forearms->Grip, Lower Back->Rug, incl. Dutch/namespaced aliases)
  are hard-blocked at canonical level whatever the history says.
* Output carries only counts, flag codes, and domain-separated SHA-256 term ids; never
  supplier strings, app labels, provider slugs, notes, media or URLs. The separate private
  audit adds catalog ids and status flags only.
"""
import argparse
import collections
import hashlib
import importlib.util
import json
import re
import unicodedata
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent


def _load(name, filename):
    spec = importlib.util.spec_from_file_location(name, HERE / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


LEDGER = _load("tk504_crosswalk_ledger", "movekit-review-ledger.py")
HINTS = LEDGER.HINTS

REPORT_SCHEMA = "trainingskompas-source-app-crosswalk-report/1.0"
PRIVATE_SCHEMA = "trainingskompas-source-app-crosswalk-private-audit/1.0"
CROSSWALK_VERSION = 1
MIN_SUPPORT = 3
DOMAIN = "tk504-source-app-crosswalk/1"
FIELDS = ("primary", "secondary", "equipment", "pattern")
SOURCE_KEY = {"primary": "primaryMuscles", "secondary": "secondaryMuscles",
              "equipment": "equipment", "pattern": "movementPattern"}
PIN_KEYS = ("supplier", "catalog", "inventory")
CATALOG_ID = re.compile(r"TK-\d{6}\Z")
HEX = re.compile(r"[0-9a-f]{64}\Z")
NAMESPACED = re.compile(r"movekit:(muscle|equipment):[a-z0-9_]+\Z")

SUPPORTED = "SUPPORTED_HISTORICAL"
CONFLICT = "CONFLICT"
TOO_FEW = "TOO_FEW_OBSERVATIONS"
MULTI = "MULTISOURCE_AMBIGUOUS"
NO_DATA = "NO_DATA"
BLOCKED = "BLOCKED_FALSE_SYNONYM"
TERM_STATUSES = (SUPPORTED, CONFLICT, TOO_FEW, MULTI, NO_DATA, BLOCKED)

# Hard-blocked false synonym collapses (canonical alias sets, Dutch + namespaced included).
BLOCK_RULES = {
    "FOREARMS_NOT_GRIP": (
        ("forearms", "forearm", "onderarmen", "onderarm", "movekit:muscle:forearms"),
        ("grip", "grip strength", "greep", "grijpkracht", "handgreep")),
    "LOWER_BACK_NOT_RUG": (
        ("lower back", "lowerback", "onderrug", "lumbar", "lumbar spine",
         "movekit:muscle:lower_back"),
        ("rug", "rugspieren", "back")),
}


def need(ok, code):
    if not ok:
        raise ValueError(code)


def digest(value):
    return LEDGER.digest(value)


def canon(text):
    """Deterministic label normalisation (case, unicode form, separators)."""
    folded = unicodedata.normalize("NFKC", text).casefold()
    return " ".join(re.sub(r"[_\-\s]+", " ", folded).split())


def term_id(field, side, canonical_text):
    """Opaque, domain-separated id. side: 'S' supplier term, 'A' app label."""
    return hashlib.sha256(
        "|".join((DOMAIN, field, side, canonical_text)).encode("utf8")).hexdigest()


def _blocked_pairs():
    table = {}
    for field in FIELDS:
        pairs = {}
        for rule, (sources, targets) in sorted(BLOCK_RULES.items()):
            for s in sources:
                for t in targets:
                    pairs[(term_id(field, "S", canon(s)), term_id(field, "A", canon(t)))] = rule
        table[field] = pairs
    return table


BLOCKED_PAIRS = _blocked_pairs()


def _ids(field, side, value, list_only):
    """Canonical term ids for a field value, or None when unusable."""
    if isinstance(value, str) and not list_only:
        value = [value]
    if not isinstance(value, list):
        return None
    out = set()
    for item in value:
        if not isinstance(item, str) or not item.strip():
            return None
        text = canon(item)
        if text == "pending review":
            return None
        out.add(term_id(field, side, text))
    return frozenset(out)


# ------------------------------------------------------------------ source identity binding
def _bind(supplier_rows, catalog, inventory, pins):
    need(isinstance(pins, dict) and set(pins) in (set(PIN_KEYS), set(PIN_KEYS) | {"glossary"})
         and all(isinstance(v, str) and HEX.fullmatch(v) for v in pins.values()),
         "PINNED_HASHES_MISSING_OR_INVALID")
    need(isinstance(supplier_rows, list) and len(supplier_rows) == 582 and
         all(isinstance(r, dict) for r in supplier_rows), "SUPPLIER_NOT_582")
    by_slug = {}
    for row in supplier_rows:
        slug = row.get("slug")
        need(isinstance(slug, str) and slug.strip() and slug not in by_slug,
             "SUPPLIER_SLUG_MISSING_OR_DUPLICATE")
        by_slug[slug] = row
    need(isinstance(catalog, dict) and isinstance(catalog.get("catalog"), list) and
         len(catalog["catalog"]) == 226, "CATALOG_NOT_226")
    need(isinstance(inventory, dict) and isinstance(inventory.get("items"), list) and
         len(inventory["items"]) == 582, "INVENTORY_NOT_582")
    inv_by_provider, inv_ids = {}, set()
    for item in inventory["items"]:
        need(isinstance(item, dict), "INVENTORY_ITEM_INVALID")
        provider, cid = item.get("provider_id"), item.get("catalog_id")
        need(provider in by_slug and isinstance(cid, str) and CATALOG_ID.fullmatch(cid) and
             provider not in inv_by_provider and cid not in inv_ids,
             "INVENTORY_IDENTITY_INVALID")
        inv_by_provider[provider] = cid
        inv_ids.add(cid)
    need(set(inv_by_provider) == set(by_slug), "INVENTORY_NOT_SUPPLIER_BOUND")
    published, seen_ids, seen_providers = [], set(), set()
    for row in catalog["catalog"]:
        need(isinstance(row, dict), "CATALOG_ROW_INVALID")
        cid, source, identity = row.get("catalog_id"), row.get("source"), row.get("identity")
        need(isinstance(cid, str) and CATALOG_ID.fullmatch(cid) and cid not in seen_ids,
             "CATALOG_ID_INVALID_OR_DUPLICATE")
        need(isinstance(source, dict) and source.get("provider") == "movekit" and
             source.get("provider_id") in by_slug and
             source["provider_id"] not in seen_providers, "PUBLISHED_SOURCE_UNBOUND")
        need(inv_by_provider[source["provider_id"]] == cid, "PUBLISHED_INVENTORY_MISMATCH")
        need(isinstance(identity, dict), "CATALOG_IDENTITY_INVALID")
        seen_ids.add(cid)
        seen_providers.add(source["provider_id"])
        published.append(row)
    return by_slug, inv_by_provider, published


# ----------------------------------------------------------------------- historical consensus
def _observe(by_slug, published):
    records = {f: {} for f in FIELDS}
    quality = {f: collections.Counter() for f in FIELDS}
    for row in published:
        cid = row["catalog_id"]
        source = by_slug[row["source"]["provider_id"]]
        for field in FIELDS:
            terms = _ids(field, "S", source.get(SOURCE_KEY[field]), True)
            if terms is None:
                quality[field]["published_source_unusable"] += 1
                continue
            if not terms:
                quality[field]["published_source_empty"] += 1
                continue
            labels = _ids(field, "A", row["identity"].get(field), False)
            for sid in terms:
                rec = records[field].setdefault(sid, {
                    "votes": collections.defaultdict(set), "multi": {},
                    "empty_app": set(), "app_unusable": set()})
                if labels is None:
                    rec["app_unusable"].add(cid)
                elif not labels:
                    rec["empty_app"].add(cid)        # empty is NEVER a mapping
                elif len(terms) == 1 and len(labels) == 1:
                    rec["votes"][next(iter(labels))].add(cid)
                else:
                    rec["multi"][cid] = labels
    return records, quality


def _classify(field, sid, rec):
    votes = rec["votes"]
    total = sum(len(v) for v in votes.values())
    base = {"status": NO_DATA, "target": None, "one_to_one_votes": total,
            "distinct_targets": len(votes), "multi_term_rows": len(rec["multi"]),
            "empty_app_rows": len(rec["empty_app"]),
            "app_unusable_rows": len(rec["app_unusable"]),
            "counter_rows": 0, "blocked_rule": None, "target_shared_by": 0}
    hits = sorted({BLOCKED_PAIRS[field][(sid, t)] for t in votes
                   if (sid, t) in BLOCKED_PAIRS[field]})
    if hits:
        base.update(status=BLOCKED, blocked_rule=hits[0])
    elif len(votes) >= 2:
        base["status"] = CONFLICT
    elif len(votes) == 1:
        target = next(iter(votes))
        counter = sum(1 for labels in rec["multi"].values() if target not in labels)
        base["counter_rows"] = counter
        if total < MIN_SUPPORT:
            base["status"] = TOO_FEW
        elif counter:
            base["status"] = CONFLICT
        else:
            base.update(status=SUPPORTED, target=target)
    elif rec["multi"]:
        base["status"] = MULTI
    return base


def build_crosswalk(supplier_rows, catalog, inventory, pins):
    """Return {field: {source_term_id: observation}} plus quality counters. Raises ValueError."""
    by_slug, _, published = _bind(supplier_rows, catalog, inventory, pins)
    records, quality = _observe(by_slug, published)
    table = {f: {sid: _classify(f, sid, rec) for sid, rec in records[f].items()}
             for f in FIELDS}
    for field in FIELDS:
        shared = collections.Counter(o["target"] for o in table[field].values()
                                     if o["status"] == SUPPORTED)
        for obs in table[field].values():
            if obs["status"] == SUPPORTED:
                obs["target_shared_by"] = shared[obs["target"]]
    return {"version": CROSSWALK_VERSION, "min_support": MIN_SUPPORT, "fields": table,
            "quality": {f: dict(sorted(quality[f].items())) for f in FIELDS},
            "published_rows": len(published)}


# ------------------------------------------------------------------------------- field audit
P_BLOCKED, P_CONTRADICTION, P_CONFLICT = "BLOCKED_FALSE_SYNONYM", "HISTORICAL_CONTRADICTION", \
    "HISTORICAL_CONFLICT"
P_UNRESOLVED, P_MATCH = "UNRESOLVED_COVERAGE", "HISTORICAL_MATCH_ONLY"
P_EMPTY_ACCEPTED, P_SOURCE_EMPTY_AI = "ACCEPTED_EMPTY_NOT_EVIDENCE", "AI_LABEL_WITHOUT_SOURCE_TERM"
P_NO_DATA_BOTH, P_UNUSABLE = "NO_DATA_BOTH_EMPTY", "SOURCE_OR_ACCEPTED_UNUSABLE"


def audit_field(field, table, source_value, accepted_value):
    """Historical coverage/contradiction for one field. Never an approval."""
    terms = _ids(field, "S", source_value, True)
    labels = _ids(field, "A", accepted_value, False)
    if terms is None or labels is None:
        return {"status": P_UNUSABLE, "flags": ["FIELD_UNUSABLE"], "term_statuses": {}}
    obs = {sid: table.get(sid) for sid in sorted(terms)}
    statuses = collections.Counter((o["status"] if o else NO_DATA) for o in obs.values())
    flags = set()
    for sid in terms:
        for lid in labels:
            rule = BLOCKED_PAIRS[field].get((sid, lid))
            if rule:
                flags.add("BLOCKED_FALSE_SYNONYM:" + rule)
    if not terms:
        status = P_NO_DATA_BOTH if not labels else P_SOURCE_EMPTY_AI
        if labels:
            flags.add(P_SOURCE_EMPTY_AI)
    else:
        mapped = {sid: o["target"] for sid, o in obs.items() if o and o["status"] == SUPPORTED}
        targets = set(mapped.values())
        all_supported = len(mapped) == len(terms)
        if any(o and o["status"] == BLOCKED for o in obs.values()):
            flags.add("SOURCE_TERM_BLOCKED_IN_HISTORY")
        if not labels:
            flags.add(P_EMPTY_ACCEPTED)
        elif targets - labels:
            flags.add("HISTORICAL_TARGET_MISSING")
        if labels and all_supported and labels - targets:
            flags.add("ACCEPTED_LABEL_NOT_IN_HISTORICAL_MAP")
        if labels and not all_supported and labels - targets:
            flags.add("ACCEPTED_LABEL_NOT_EXPLAINED_BY_SUPPORTED_TERMS")
        if statuses[CONFLICT]:
            flags.add("HISTORICAL_CONFLICT_TERM")
        if len(mapped) < len(terms):
            flags.add("SOURCE_TERM_UNRESOLVED")
        if any(f.startswith("BLOCKED_FALSE_SYNONYM:") for f in flags):
            status = P_BLOCKED
        elif "SOURCE_TERM_BLOCKED_IN_HISTORY" in flags:
            status = P_BLOCKED
        elif not labels:
            status = P_EMPTY_ACCEPTED
        elif {"HISTORICAL_TARGET_MISSING", "ACCEPTED_LABEL_NOT_IN_HISTORICAL_MAP"} & flags:
            status = P_CONTRADICTION
        elif statuses[CONFLICT]:
            status = P_CONFLICT
        elif not all_supported:
            status = P_UNRESOLVED
        else:
            status = P_MATCH
    return {"status": status, "flags": sorted(flags),
            "term_statuses": dict(sorted(statuses.items()))}


# ---------------------------------------------------------------------------------- glossary
def _glossary_ok(glossary):
    return (isinstance(glossary, dict) and glossary.get("status") == "PROPOSED_NOT_APPROVED"
            and glossary.get("runtime_activation") is False and
            isinstance(glossary.get("muscles"), dict) and
            isinstance(glossary.get("equipment"), dict))


GLOSSARY_FIELDS = {"muscles": ("primary", "secondary"), "equipment": ("equipment",)}


def _static_rule(field, sid):
    return next((r for (s, _), r in BLOCKED_PAIRS[field].items() if s == sid), None)


def _proposals(glossary, crosswalk, supplier_by_slug, accepted_entries):
    """Namespaced PROPOSALS only: review_required, never runtime-enabled, never a forced
    translation of the supplier term to an app label."""
    items, invalid = [], 0
    for group, fields in sorted(GLOSSARY_FIELDS.items()):
        for term, info in sorted(glossary[group].items()):
            code = info.get("code") if isinstance(info, dict) else None
            if not (isinstance(term, str) and term.strip() and isinstance(code, str) and
                    NAMESPACED.fullmatch(code) and code.split(":")[1] ==
                    ("muscle" if group == "muscles" else "equipment")):
                invalid += 1
                continue
            statuses, rule, sids = {}, None, {}
            for field in fields:
                sids[field] = term_id(field, "S", canon(term))
                obs = crosswalk["fields"][field].get(sids[field])
                statuses[field] = obs["status"] if obs else NO_DATA
                rule = rule or (obs["blocked_rule"] if obs else None) or _static_rule(
                    field, sids[field])
            occurrences = sum(
                1 for entry in accepted_entries
                if any(sids[f] in (_ids(f, "S", supplier_by_slug[entry["provider_id"]].get(
                    SOURCE_KEY[f]), True) or ()) for f in fields))
            items.append({
                "source_term_id": hashlib.sha256(
                    "|".join((DOMAIN, group, canon(term))).encode("utf8")).hexdigest(),
                "group": group,
                "proposed_code_sha256": hashlib.sha256(code.encode("utf8")).hexdigest(),
                "crosswalk_status_by_field": dict(sorted(statuses.items())),
                "hard_block_rule": rule,
                "accepted_entries_with_term": occurrences,
                "review_required": True, "runtime_enabled": False,
                "replaces_app_label": False, "forced_translation": False})
    return items, invalid


# ----------------------------------------------------------------------------------- analyse
def _flags_template():
    return {
        "schema": REPORT_SCHEMA, "crosswalk_version": CROSSWALK_VERSION,
        "classification_approved": False, "release_authorized": False,
        "gate_flags_cleared": False, "runtime_enabled": False, "app_activated": False,
        "db_writes": False, "media_grants": False, "catalog_mutated": False,
        "scientific_truth_claimed": False, "category_type_evidence_provided": False,
        "goals_supported": False, "evidence_kind": "HISTORICAL_ONLY_NOT_SOURCE_PROOF",
    }


def _invalid(code):
    report = _flags_template()
    report.update(status="INPUT_INVALID_FAIL_CLOSED", fail_code=code, binding=None,
                  fields={}, accepted_audit={}, hard_blocks=[], namespaced_proposals=[],
                  blockers=sorted({"INPUT_INVALID_FAIL_CLOSED", "NO_CROSSWALK_PRODUCED"}),
                  remaining_human_review=_remaining())
    private = {"schema": PRIVATE_SCHEMA, "status": "INPUT_INVALID_FAIL_CLOSED", "cases": []}
    _assert_sanitized(report, False)
    return {"report": report, "private_audit": private}


def _remaining():
    return ["CATEGORY_TYPE_VIA_RELEASE_GATE", "FALSE_SYNONYM_RULE_OWNER_CONFIRMATION",
            "GOALS_FROM_NON_SOURCE_AUTHORITY", "NAMESPACED_TERM_DECISIONS",
            "QUALIFIED_REVIEW_OF_EVERY_ACCEPTED_FIELD", "SERVER_SIDE_AUTHORIZATION"]


def _check_digests(expected, objects):
    if expected is None:
        return
    need(isinstance(expected, dict) and set(expected) <= set(objects) and
         all(isinstance(v, str) and HEX.fullmatch(v) for v in expected.values()),
         "EXPECTED_DIGESTS_INVALID")
    for key, value in expected.items():
        need(digest(objects[key]) == value, "EXPECTED_DIGEST_MISMATCH:" + key)


def analyze(ledger, supplier_rows, catalog, inventory, pins, glossary=None,
            expected_digests=None):
    """Return {'report': aggregate (no ids), 'private_audit': per-catalog-id flags}.

    Never mutates inputs, never raises on data problems (returns a fail-closed report)."""
    try:
        return _analyze(ledger, supplier_rows, catalog, inventory, pins, glossary,
                        expected_digests)
    except ValueError as error:
        text = str(error)
        return _invalid(text if re.fullmatch(r"[A-Z][A-Z0-9_]*(:[a-z]+)?", text)
                        else "INPUT_INVALID")
    except (KeyError, TypeError, AttributeError, IndexError):
        return _invalid("INPUT_INVALID")


def _analyze(ledger, supplier_rows, catalog, inventory, pins, glossary, expected_digests):
    objects = {"supplier": supplier_rows, "catalog": catalog, "inventory": inventory,
               "ledger": ledger}
    if glossary is not None:
        objects["glossary"] = glossary
    _check_digests(expected_digests, objects)
    crosswalk = build_crosswalk(supplier_rows, catalog, inventory, pins)
    by_slug, _, published = _bind(supplier_rows, catalog, inventory, pins)
    template = LEDGER.make_template(catalog, inventory, supplier_rows,
                                    {k: pins[k] for k in PIN_KEYS})
    LEDGER.validate(ledger, template, catalog)
    published_ids = {r["catalog_id"] for r in published}
    entries = ledger["entries"]
    need(all(e["catalog_id"] not in published_ids for e in entries), "LEDGER_ENTRY_IS_PUBLISHED")
    accepted = [e for e in entries if e["decision"] == "ACCEPT"]
    decisions = collections.Counter(e["decision"] for e in entries)
    agg = {f: {"status": collections.Counter(), "flags": collections.Counter(),
               "term_occurrences": collections.Counter(), "all_terms_supported": 0}
           for f in FIELDS}
    cases, goals = [], collections.Counter()
    for entry in sorted(accepted, key=lambda e: e["catalog_id"]):
        source = by_slug[entry["provider_id"]]
        fields = {}
        for field in FIELDS:
            result = audit_field(field, crosswalk["fields"][field], source.get(SOURCE_KEY[field]),
                                 entry["classification"][field])
            fields[field] = {"status": result["status"], "flags": result["flags"]}
            a = agg[field]
            a["status"][result["status"]] += 1
            a["flags"].update(result["flags"])
            a["term_occurrences"].update(result["term_statuses"])
            ts = result["term_statuses"]
            if ts and set(ts) == {SUPPORTED}:
                a["all_terms_supported"] += 1
        has_goals = bool(entry["classification"]["goals"])
        goals["accepted_with_goals_unsupported" if has_goals else "accepted_without_goals"] += 1
        cases.append({"catalog_id": entry["catalog_id"], "fields": fields,
                      "goals": "UNSUPPORTED_NO_SOURCE_FIELD" if has_goals else "EMPTY",
                      "category_type": "NOT_ASSESSED_HERE_SEE_RELEASE_GATE",
                      "approved": False, "clears_gate_flags": False})
    proposals, invalid_terms, glossary_flags = [], 0, []
    if glossary is None:
        glossary_flags.append("GLOSSARY_NOT_PROVIDED")
    elif not _glossary_ok(glossary):
        glossary_flags.append("GLOSSARY_INVALID_OR_APPROVED_OR_ACTIVE")
    else:
        proposals, invalid_terms = _proposals(glossary, crosswalk, by_slug, accepted)
        if invalid_terms:
            glossary_flags.append("GLOSSARY_TERM_INVALID_OR_NOT_NAMESPACED")
    # public per-field summary
    field_report = {}
    for field in FIELDS:
        table = crosswalk["fields"][field]
        counts = collections.Counter(o["status"] for o in table.values())
        a = agg[field]
        field_report[field] = {
            "published_source_terms_observed": len(table),
            "source_term_status_counts": {s: counts[s] for s in TERM_STATUSES},
            "published_quality": crosswalk["quality"][field],
            "mappings": [
                {"source_term_id": sid, "status": o["status"],
                 "target_term_id": o["target"], "one_to_one_votes": o["one_to_one_votes"],
                 "distinct_targets": o["distinct_targets"],
                 "multi_term_rows": o["multi_term_rows"], "empty_app_rows": o["empty_app_rows"],
                 "counter_rows": o["counter_rows"], "blocked_rule": o["blocked_rule"],
                 "target_shared_by": o["target_shared_by"]}
                for sid, o in sorted(table.items())],
            "accepted_entries_by_status": dict(sorted(a["status"].items())),
            "accepted_flag_counts": dict(sorted(a["flags"].items())),
            "accepted_term_occurrences_by_status": dict(sorted(a["term_occurrences"].items())),
            "accepted_entries_all_terms_supported": a["all_terms_supported"],
        }
    hard_blocks = []
    for rule in sorted(BLOCK_RULES):
        flag = "BLOCKED_FALSE_SYNONYM:" + rule
        hard_blocks.append({
            "rule": rule,
            "published_terms_blocked": sum(
                1 for f in FIELDS for o in crosswalk["fields"][f].values()
                if o["blocked_rule"] == rule),
            "accepted_field_hits": sum(agg[f]["flags"][flag] for f in FIELDS),
            "auto_mapping_allowed": False})
    blockers = {"HISTORICAL_OBSERVATION_NOT_SOURCE_PROOF", "NO_CLASSIFICATION_APPROVED",
                "HUMAN_REVIEW_REQUIRED", "PRODUCTION_AUTH_CONTRACT_NOT_IMPLEMENTED",
                "GOALS_UNSUPPORTED_BY_SOURCE", "CATEGORY_TYPE_NOT_ASSESSED_HERE"}
    blockers.update(glossary_flags)
    if any(h["accepted_field_hits"] for h in hard_blocks):
        blockers.add("HARD_BLOCKED_FALSE_SYNONYM_PRESENT")
    stats = {s: sum(agg[f]["status"][s] for f in FIELDS)
             for s in (P_BLOCKED, P_CONTRADICTION, P_CONFLICT, P_UNRESOLVED)}
    if stats[P_CONTRADICTION]:
        blockers.add("HISTORICAL_CONTRADICTIONS_PRESENT")
    if stats[P_CONFLICT]:
        blockers.add("HISTORICAL_CONFLICTS_PRESENT")
    if stats[P_UNRESOLVED]:
        blockers.add("UNRESOLVED_COVERAGE_PRESENT")
    if stats[P_BLOCKED]:
        blockers.add("HARD_BLOCKED_FALSE_SYNONYM_PRESENT")
    report = _flags_template()
    report.update(
        status="HISTORICAL_OBSERVATION_ONLY_NOT_APPROVED", fail_code=None,
        binding={"ledger_sha256": digest(ledger),
                 "object_hashes": {k: digest(v) for k, v in sorted(objects.items())
                                   if k != "ledger"},
                 "pinned_hashes": dict(sorted(pins.items()))},
        published_rows=crosswalk["published_rows"], min_support=MIN_SUPPORT,
        fields=field_report,
        accepted_audit={
            "ledger_entries": len(entries), "accepted_entries": len(accepted),
            "accepted_ai_label": sum(e["review"]["kind"] == "AI" for e in accepted),
            "accepted_human_attested_label_unverified": sum(
                e["review"]["kind"] == "HUMAN_ATTESTED" for e in accepted),
            "pending": decisions["PENDING"], "defer": decisions["DEFER"],
            "reject": decisions["REJECT"], "goals": dict(sorted(goals.items())),
            "category_type": "NOT_ASSESSED_HERE_SEE_RELEASE_GATE",
            "pattern_is_category_type_evidence": False},
        hard_blocks=hard_blocks, namespaced_proposals=proposals,
        blockers=sorted(blockers), remaining_human_review=_remaining())
    private = {"schema": PRIVATE_SCHEMA, "status": "PRIVATE_AUDIT_NOT_APPROVAL",
               "cases": cases}
    _assert_sanitized(report, False)
    _assert_sanitized(private, True)
    return {"report": report, "private_audit": private}


def evaluate_crosswalk(*args, **kwargs):
    """Aggregate, id-free report (see ``analyze``)."""
    return analyze(*args, **kwargs)["report"]


# -------------------------------------------------------------------------------- sanitizer
UPPER = re.compile(r"[A-Z][A-Z0-9_]*(:[A-Za-z0-9_]+)?\Z")
KEY = re.compile(r"[A-Za-z][A-Za-z0-9_:]*\Z")
SCHEMA_NAME = re.compile(r"trainingskompas-[a-z\-]+/[0-9.]+\Z")
LITERALS = frozenset(FIELDS) | {"muscles", "equipment"}


def _assert_sanitized(value, allow_catalog_ids):
    """Strings may only be hash ids, UPPER_CASE codes, schema names or field literals."""
    if isinstance(value, dict):
        for key, item in value.items():
            need(isinstance(key, str) and KEY.fullmatch(key), "REPORT_NOT_SANITIZED")
            _assert_sanitized(item, allow_catalog_ids)
    elif isinstance(value, (list, tuple)):
        for item in value:
            _assert_sanitized(item, allow_catalog_ids)
    elif isinstance(value, str):
        ok = (HEX.fullmatch(value) or UPPER.fullmatch(value) or SCHEMA_NAME.fullmatch(value)
              or value in LITERALS or (allow_catalog_ids and CATALOG_ID.fullmatch(value)))
        need(ok, "REPORT_NOT_SANITIZED")
    else:
        need(value is None or isinstance(value, (bool, int)), "REPORT_NOT_SANITIZED")


# ------------------------------------------------------------------------------------- CLI
def run(source_root, ledger_path, output):
    """Read the real private inputs and write ONE new private JSON (report + private audit)."""
    source = Path(source_root)
    paths = {"supplier": source / "complete-exercise-library-metadata/metadata.json",
             "catalog": ROOT / "exercise-catalog.json",
             "inventory": ROOT / "docs/generated/MOVEKIT_GOLDEN_V2_INVENTORY.json"}
    glossary_path = HERE / "movekit-v2-taxonomy-map.json"
    out = HINTS.CATALOG_STAGE.output_allowed(output, ROOT, source)
    ledger_file = Path(ledger_path).resolve(strict=True)
    need(ledger_file.parent == (source / ".tk-private-review").resolve(),
         "LEDGER_OUTSIDE_PRIVATE_STAGE")
    data = {k: json.loads(p.read_text(encoding="utf8")) for k, p in paths.items()}
    ledger = json.loads(ledger_file.read_text(encoding="utf8"))
    glossary = json.loads(glossary_path.read_text(encoding="utf8"))
    pins = {k: HINTS.sha256(p) for k, p in paths.items()}
    result = analyze(ledger, data["supplier"], data["catalog"], data["inventory"], pins, glossary)
    with out.open("x", encoding="utf8", newline="\n") as writer:  # never overwrite
        writer.write(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True) + "\n")
    report = result["report"]
    return {"status": report["status"], "fail_code": report["fail_code"],
            "output": str(out), "blockers": report["blockers"],
            "classification_approved": False, "release_authorized": False}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-root", type=Path, default=Path(r"C:\Movikit"))
    parser.add_argument("--ledger", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(run(args.source_root, args.ledger, args.output), indent=2))
