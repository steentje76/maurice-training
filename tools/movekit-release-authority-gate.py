#!/usr/bin/env python3
"""G6/G7 explicit release-readiness gate (pure, fail-closed, report-only).

This module NEVER authorizes a release. There is no production authentication
contract in this repository, so ``release_authorized`` is always False and the
status is always BLOCKED_NO_PRODUCTION_AUTHORITY. What it does:

* validates the full 356-entry source/hash-bound ledger against the pinned
  supplier metadata (582 rows), the 226 existing catalog, the inventory and the
  proposed (unapproved) glossary, without mutating any of them;
* traces every ACCEPT (an AI proposal for FUTURE release) to supplier evidence for
  the 7 classification fields and flags everything that is not source-backed;
* structurally checks a planned content-approval object and hands authenticity to
  an OPTIONAL, injected, server-only verifier. An injected verifier is a test
  seam, not production auth: it can never flip ``server_grant_verified``;
* emits only sanitized output (catalog ids, flag codes, statuses). No supplier
  names, slugs, terms, instructions, reviewer text or rationales are emitted.

It performs no file, network, DB or media I/O and writes nothing. It invents no
keys, signatures or secrets. Comparisons against supplier terms or the catalog
baseline are not proof of exercise truth; they only decide what needs a
qualified human reviewer in a future server.
"""
import collections
import copy
import importlib.util
import re
from datetime import datetime, timedelta
from pathlib import Path

HERE = Path(__file__).resolve().parent


def _load(name, filename):
    spec = importlib.util.spec_from_file_location(name, HERE / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


LEDGER = _load("tk504_gate_ledger", "movekit-review-ledger.py")

REPORT_SCHEMA = "trainingskompas-release-readiness-report/1.0"
APPROVAL_SCHEMA = "trainingskompas-content-approval/0-planned"
EXCEPTION_SCHEMA = "trainingskompas-classification-exception/1"
MANIFEST_SCHEMA = "trainingskompas-release-manifest/0-planned"
STATUS = "BLOCKED_NO_PRODUCTION_AUTHORITY"
FIELDS = LEDGER.CLASS_FIELDS  # category type primary secondary equipment pattern goals
LIST_FIELDS = ("primary", "secondary", "equipment")
SOURCE_KEY = {"primary": "primaryMuscles", "secondary": "secondaryMuscles",
              "equipment": "equipment", "pattern": "movementPattern"}
GLOSSARY_GROUP = {"primary": "muscles", "secondary": "muscles", "equipment": "equipment"}
PIN_KEYS = ("supplier", "catalog", "inventory", "glossary")
APPROVER_ROLES = ("QUALIFIED_CONTENT_REVIEWER",)
MAX_APPROVAL_HOURS = 72
CATALOG_ID = re.compile(r"TK-\d{6}\Z")
CODE = re.compile(r"[A-Z][A-Z0-9_]*(:[A-Za-z0-9_]+)?\Z")
SAFE_TEXT = re.compile(r"[A-Za-z0-9_:./\-]{0,120}\Z")
ALWAYS = ["PRODUCTION_AUTH_CONTRACT_NOT_IMPLEMENTED"]


def digest(value):
    return LEDGER.digest(value)


def norm(value):
    return value.strip().casefold() if isinstance(value, str) else None


def _code(error):
    text = str(error)
    return text if CODE.fullmatch(text) else "INPUT_INVALID"


def _hex(value):
    return isinstance(value, str) and LEDGER.HASH.fullmatch(value) is not None


def _stamp(value):
    if not isinstance(value, str) or not value.endswith("Z"):
        return None
    try:
        return datetime.fromisoformat(value[:-1] + "+00:00")
    except ValueError:
        return None


# --------------------------------------------------------------------------- inputs
def _check_inputs(ledger, rows, catalog, inventory, glossary, pins):
    flags = []
    if not (isinstance(rows, list) and len(rows) == 582 and
            all(isinstance(r, dict) for r in rows)):
        flags.append("SUPPLIER_METADATA_NOT_582")
    if not (isinstance(catalog, dict) and isinstance(catalog.get("catalog"), list) and
            len(catalog["catalog"]) == 226):
        flags.append("CATALOG_NOT_226")
    if not (isinstance(inventory, dict) and isinstance(inventory.get("items"), list) and
            len(inventory["items"]) == 582):
        flags.append("INVENTORY_NOT_582")
    if not (isinstance(glossary, dict) and glossary.get("status") == "PROPOSED_NOT_APPROVED"
            and glossary.get("runtime_activation") is False and
            isinstance(glossary.get("muscles"), dict) and
            isinstance(glossary.get("equipment"), dict)):
        flags.append("GLOSSARY_INVALID_OR_APPROVED_OR_ACTIVE")
    if not (isinstance(pins, dict) and set(pins) == set(PIN_KEYS) and
            all(_hex(v) for v in pins.values())):
        flags.append("PINNED_HASHES_MISSING_OR_INVALID")
    if not (isinstance(ledger, dict) and isinstance(ledger.get("entries"), list) and
            len(ledger["entries"]) == 356):
        flags.append("LEDGER_NOT_356")
    return flags


def _glossary_aliases(glossary):
    """term -> normalized aliases (term, namespaced code, Dutch label) per group."""
    result = {}
    for group in ("muscles", "equipment"):
        table = {}
        for term, info in glossary[group].items():
            aliases = {norm(term)}
            if isinstance(info, dict):
                aliases |= {norm(info.get("code")), norm(info.get("label_nl"))}
            table[norm(term)] = aliases - {None}
        result[group] = table
    return result


# --------------------------------------------------------------------------- evidence
def _terms(row, key):
    value = row.get(key) if isinstance(row, dict) else None
    if not (isinstance(value, list) and all(isinstance(v, str) and v.strip() for v in value)):
        return None
    return value


def _tag_trace(field, accepted, row, aliases):
    """Return flags for a tag field. Vocabulary membership is NOT source evidence."""
    source = _terms(row, SOURCE_KEY[field])
    if source is None:
        return ["SOURCE_FIELD_MISSING_" + field.upper()]
    group = GLOSSARY_GROUP.get(field)
    table = aliases[group] if group else {}
    source_aliases = {}
    for term in source:
        source_aliases[norm(term)] = {norm(term)} | table.get(norm(term), set())
    backed = set().union(*source_aliases.values()) if source_aliases else set()
    tags = accepted if isinstance(accepted, list) else [accepted]
    flags = []
    if any(norm(tag) not in backed for tag in tags):
        flags.append(field.upper() + "_NOT_SOURCE_BACKED_VOCAB_ONLY")
    if field in LIST_FIELDS:
        covered = {norm(tag) for tag in tags}
        if any(not (aliases_ & covered) for aliases_ in source_aliases.values()):
            flags.append(field.upper() + "_SOURCE_TERM_OMITTED")
    return flags


def _baseline_flags(field, accepted, suggestion):
    status = suggestion.get("status")
    if status == "SUGGESTED_UNVERIFIED":
        key = "proposed_category" if field == "category" else "proposed_type"
        return [] if accepted == suggestion.get(key) else [
            field.upper() + "_DIVERGES_FROM_UNANIMOUS_BASELINE"]
    if status == "CONFLICT_REVIEW_REQUIRED":
        return [field.upper() + "_BASELINE_CONFLICT_NEEDS_AUTHORITY"]
    return [field.upper() + "_NO_BASELINE_NEEDS_AUTHORITY"]


def _field_flags(field, classification, row, suggestion, aliases):
    value = classification[field]
    if field in ("category", "type"):
        return _baseline_flags(field, value, suggestion)
    if field == "goals":
        # The supplier carries no goals; any accepted goal is AI-introduced.
        return ["GOALS_NOT_SOURCE_DERIVED"] if value else []
    return _tag_trace(field, value, row, aliases)


# ------------------------------------------------------------------------ exceptions
EXCEPTION_KEYS = {"schema", "version", "decision_id", "catalog_id", "field", "flags",
                  "accepted_value_sha256", "supplier_record_sha256", "authority_kind",
                  "authority_ref", "rationale"}


def _exception_ok(exc, entry, field, flags, proposer):
    """Structural check only. Authority is NOT verified here; a server must do that."""
    if not (isinstance(exc, dict) and set(exc) == EXCEPTION_KEYS):
        return False
    return (exc["schema"] == EXCEPTION_SCHEMA and exc["version"] == 1 and
            exc["catalog_id"] == entry["catalog_id"] and exc["field"] == field and
            isinstance(exc["flags"], list) and set(flags) <= set(exc["flags"]) and
            all(isinstance(f, str) for f in exc["flags"]) and
            exc["accepted_value_sha256"] == digest(entry["classification"][field]) and
            exc["supplier_record_sha256"] == entry["supplier_record_sha256"] and
            exc["authority_kind"] == "QUALIFIED_REVIEWER_DECISION_REF" and
            all(isinstance(exc[k], str) and 0 < len(exc[k].strip()) <= 2000
                for k in ("decision_id", "authority_ref", "rationale")) and
            exc["authority_ref"] != proposer)


def _index_exceptions(exceptions):
    index = collections.defaultdict(list)
    if isinstance(exceptions, list):
        for exc in exceptions:
            if isinstance(exc, dict) and isinstance(exc.get("catalog_id"), str) and \
                    isinstance(exc.get("field"), str):
                index[(exc["catalog_id"], exc["field"])].append(exc)
    return index


# ------------------------------------------------------------------------- candidates
def _identity_flags(entry, rows_by_slug, inventory_by_slug):
    flags = []
    slug = entry["provider_id"]
    row = rows_by_slug.get(slug)
    if row is None:
        return ["PROVIDER_NOT_IN_SUPPLIER_METADATA"], None
    if row is False:
        return ["SUPPLIER_SLUG_AMBIGUOUS"], None
    if digest(row) != entry["supplier_record_sha256"]:
        flags.append("SUPPLIER_RECORD_SHA_CHANGED")
    if inventory_by_slug.get(slug) != entry["catalog_id"]:
        flags.append("INVENTORY_MAPPING_MISMATCH")
    if entry["review"]["source_refs"] != ["supplier-sha256:" + digest(row)]:
        flags.append("REVIEW_SOURCE_REF_NOT_CURRENT_SHA")
    return flags, row


def _candidate(entry, rows_by_slug, inventory_by_slug, aliases, exc_index):
    cid = entry["catalog_id"]
    id_flags, row = _identity_flags(entry, rows_by_slug, inventory_by_slug)
    fields, blocking, requires = {}, set(id_flags), ["SERVER_VERIFIED_CONTENT_DECISION"]
    for field in FIELDS:
        if row is None:
            fields[field] = {"status": "NOT_TRACEABLE", "flags": [], "excepted_flags": []}
            continue
        flags = _field_flags(field, entry["classification"], row, entry["suggestion"],
                             aliases)
        excepted = []
        if flags:
            usable = [e for e in exc_index.get((cid, field), []) if _exception_ok(
                e, entry, field, flags, entry["review"]["reviewer"])]
            if len(usable) == 1:
                excepted, flags = flags, []
                requires.append("SERVER_VERIFIED_EXCEPTION:" + field)
        blocking.update(flags)
        status = ("SOURCE_OR_BASELINE_TRACED" if not flags and not excepted else
                  "EXCEPTION_STRUCTURALLY_VALID_UNVERIFIED" if excepted else
                  "UNTRACED_EXCEPTION_REQUIRED")
        fields[field] = {"status": status, "flags": sorted(flags),
                         "excepted_flags": sorted(excepted)}
    return {"catalog_id": cid, "decision": "ACCEPT", "blocked": True,
            "evidence_complete": not blocking, "identity_flags": sorted(id_flags),
            "fields": fields, "blocking_flags": sorted(blocking),
            "requires": sorted(set(requires))}


# --------------------------------------------------------------------------- approval
APPROVAL_KEYS = {"schema", "issuer", "account", "issued_at", "expires_at", "binding",
                 "decision_refs"}


def _expected_refs(candidates):
    refs = {("CONTENT_DECISION", c["catalog_id"], None) for c in candidates}
    for c in candidates:
        for field, info in c["fields"].items():
            if info["excepted_flags"]:
                refs.add(("CLASSIFICATION_EXCEPTION", c["catalog_id"], field))
    return refs


def _check_approval(approval, binding, candidates, reviewers, now, verifier):
    """Structural checks, then delegate authenticity to an injected server verifier."""
    if approval is None:
        return "NO_APPROVAL", ["APPROVAL_MISSING"]
    flags = []
    if not (isinstance(approval, dict) and set(approval) == APPROVAL_KEYS and
            approval["schema"] == APPROVAL_SCHEMA):
        return "REJECTED", ["APPROVAL_SCHEMA_INVALID"]  # incl. client flags like approved:true
    issuer, account = approval["issuer"], approval["account"]
    if not (isinstance(issuer, dict) and set(issuer) == {"id", "kind"} and
            issuer["kind"] == "SEPARATE_AUTH_SERVER" and
            isinstance(issuer["id"], str) and issuer["id"].strip() and
            isinstance(account, dict) and set(account) == {"id", "role"} and
            isinstance(account["id"], str) and account["id"].strip() and
            account["role"] in APPROVER_ROLES):
        return "REJECTED", ["APPROVAL_ISSUER_OR_ROLE_INVALID"]
    if account["id"] in reviewers or account["id"] == issuer["id"]:
        flags.append("APPROVER_IS_PROPOSER_OR_ISSUER")
    issued, expires, current = (_stamp(approval["issued_at"]), _stamp(approval["expires_at"]),
                                _stamp(now))
    if issued is None or expires is None or expires <= issued:
        flags.append("APPROVAL_TIMESTAMPS_INVALID")
    elif current is None:
        flags.append("APPROVAL_NOW_REQUIRED")
    else:
        if expires <= current:
            flags.append("APPROVAL_EXPIRED")
        if issued > current:
            flags.append("APPROVAL_NOT_YET_VALID")
        if expires - issued > timedelta(hours=MAX_APPROVAL_HOURS):
            flags.append("APPROVAL_VALIDITY_TOO_LONG")
    if approval["binding"] != binding:
        flags.append("APPROVAL_BINDING_MISMATCH")
    refs = approval["decision_refs"]
    parsed = set()
    if isinstance(refs, list) and all(
            isinstance(r, dict) and set(r) == {"type", "catalog_id", "field", "ref_id"} and
            isinstance(r["ref_id"], str) and r["ref_id"].strip() for r in refs):
        parsed = {(r["type"], r["catalog_id"], r["field"]) for r in refs}
        if len(parsed) != len(refs):
            flags.append("APPROVAL_DECISION_REFS_DUPLICATED")
    else:
        flags.append("APPROVAL_DECISION_REFS_INVALID")
    if parsed != _expected_refs(candidates):
        flags.append("APPROVAL_DECISION_REFS_MISMATCH")
    if flags:
        return "REJECTED", flags
    if not callable(verifier):
        return "UNVERIFIED", ["SERVER_VERIFIER_NOT_PROVIDED"]
    try:
        result = verifier(copy.deepcopy(approval), digest(binding))
    except Exception:  # a verifier failure must never open the gate
        return "REJECTED", ["SERVER_VERIFIER_ERROR"]
    if not (isinstance(result, dict) and result.get("verified") is True and
            result.get("approval_sha256") == digest(approval) and
            result.get("issuer_id") == issuer["id"] and len(result) == 3):
        return "REJECTED", ["SERVER_VERIFIER_REJECTED"]
    return "INJECTED_VERIFIER_ACCEPTED_NOT_PRODUCTION_AUTH", []


# ------------------------------------------------------------------------------ gate
def _index_sources(rows, inventory):
    by_slug = {}
    for row in rows:
        slug = row.get("slug")
        if isinstance(slug, str):
            by_slug[slug] = False if slug in by_slug else row
    inv = {}
    for item in inventory["items"]:
        if isinstance(item, dict):
            inv[item.get("provider_id")] = item.get("catalog_id")
    return by_slug, inv


def evaluate_release_readiness(ledger, supplier_rows, catalog, inventory, glossary,
                               pinned_hashes, content_approval=None, exceptions=None,
                               now=None, verifier=None):
    """Return a sanitized readiness report. Never authorizes; never mutates inputs."""
    report = {
        "schema": REPORT_SCHEMA, "status": STATUS, "release_authorized": False,
        "production_auth_implemented": False, "server_grant_verified": False,
        "human_identity_verified": False, "app_activated": False, "db_writes": False,
        "media_grants": False, "catalog_mutated": False, "local_checks_passed": False,
        "set_blocking_flags": [], "counts": {}, "authorization": {}, "candidates": [],
        "binding": None,
    }
    flags = list(ALWAYS)
    flags += _check_inputs(ledger, supplier_rows, catalog, inventory, glossary,
                           pinned_hashes)
    candidates = []
    auth_status, auth_flags = "NOT_EVALUATED", []
    if len(flags) == len(ALWAYS):
        try:
            hashes = {k: pinned_hashes[k] for k in ("supplier", "catalog", "inventory")}
            template = LEDGER.make_template(catalog, inventory, supplier_rows, hashes)
            LEDGER.validate(ledger, template, catalog)
        except (ValueError, KeyError, TypeError, AttributeError) as error:
            flags.append("LEDGER_INVALID:" + (_code(error) if isinstance(error, ValueError)
                                              else "INPUT_INVALID"))
        else:
            aliases = _glossary_aliases(glossary)
            rows_by_slug, inv_by_slug = _index_sources(supplier_rows, inventory)
            exc_index = _index_exceptions(exceptions)
            decisions = collections.Counter(e["decision"] for e in ledger["entries"])
            accepted = [e for e in ledger["entries"] if e["decision"] == "ACCEPT"]
            report["counts"] = {
                "entries": 356, "accept_candidates": len(accepted),
                "pending": decisions["PENDING"], "reject": decisions["REJECT"],
                "defer": decisions["DEFER"],
                "ai_label_unverified": sum(e["review"]["kind"] == "AI" for e in accepted),
                "human_attested_label_unverified": sum(
                    e["review"]["kind"] == "HUMAN_ATTESTED" for e in accepted),
            }
            if decisions["PENDING"]:
                flags.append("PENDING_ENTRIES_REMAIN")
            if not accepted:
                flags.append("NO_RELEASE_CANDIDATES")
            try:
                candidates = [_candidate(e, rows_by_slug, inv_by_slug, aliases, exc_index)
                              for e in accepted]
            except (KeyError, TypeError, AttributeError):
                flags.append("GATE_INTERNAL_ERROR")
                candidates = []
            binding = {"ledger_sha256": digest(ledger),
                       "object_hashes": {"supplier": digest(supplier_rows),
                                         "catalog": digest(catalog),
                                         "inventory": digest(inventory),
                                         "glossary": digest(glossary)},
                       "pinned_hashes": dict(pinned_hashes)}
            report["binding"] = binding
            reviewers = {e["review"]["reviewer"] for e in ledger["entries"]
                         if isinstance(e.get("review"), dict)}
            auth_status, auth_flags = _check_approval(
                content_approval, binding, candidates, reviewers, now, verifier)
            if any(c["blocking_flags"] for c in candidates):
                flags.append("CANDIDATE_EVIDENCE_INCOMPLETE")
    flags += auth_flags
    if auth_status != "INJECTED_VERIFIER_ACCEPTED_NOT_PRODUCTION_AUTH":
        flags.append("NO_ACCEPTED_AUTHORIZATION")
    report["authorization"] = {"status": auth_status, "flags": sorted(set(auth_flags))}
    report["candidates"] = candidates
    report["set_blocking_flags"] = sorted(set(flags))
    report["local_checks_passed"] = set(flags) == set(ALWAYS) and bool(candidates)
    _assert_sanitized(report)
    return report


def prepare_report(ledger, supplier_rows, catalog, inventory, glossary, pinned_hashes,
                   exceptions=None):
    """Zero-approval report: no approval object, no verifier, no clock. Always blocked."""
    return evaluate_release_readiness(ledger, supplier_rows, catalog, inventory, glossary,
                                      pinned_hashes, None, exceptions, None, None)


def plan_release_manifest(report, valid_hours=24):
    """Planned (not issuable) manifest schema derived from a report. Holds no signature."""
    if not (isinstance(report, dict) and report.get("schema") == REPORT_SCHEMA):
        raise ValueError("INVALID_REPORT")
    if not (isinstance(valid_hours, int) and 0 < valid_hours <= MAX_APPROVAL_HOURS):
        raise ValueError("INVALID_VALIDITY")
    manifest = {
        "schema": MANIFEST_SCHEMA, "state": "PLANNED_NOT_ISSUABLE", "issuable": False,
        "release_authorized": False, "signature": None,
        "pinned_binding": report["binding"],
        "issuer_requirements": {"issuer_kind": "SEPARATE_AUTH_SERVER",
                                "account_roles": list(APPROVER_ROLES),
                                "approver_must_differ_from_proposer": True},
        "expiry_requirements": {"expires_at_required": True, "max_hours": valid_hours},
        "candidates": [{
            "catalog_id": c["catalog_id"], "state": "BLOCKED",
            "decision_ref_type_required": "CONTENT_DECISION",
            "exception_refs_required": sorted(
                f for f, info in c["fields"].items() if info["excepted_flags"]),
            "unresolved_blocking_flags": c["blocking_flags"],
        } for c in report["candidates"]],
        "blocking_flags": report["set_blocking_flags"],
    }
    _assert_sanitized(manifest)
    return manifest


def _assert_sanitized(value):
    """Output may only contain ids, hashes, schema names and flag codes (no free text)."""
    if isinstance(value, dict):
        for key, item in value.items():
            _assert_sanitized(key)
            _assert_sanitized(item)
    elif isinstance(value, list):
        for item in value:
            _assert_sanitized(item)
    elif isinstance(value, str):
        if not SAFE_TEXT.fullmatch(value):
            raise ValueError("REPORT_NOT_SANITIZED")
