#!/usr/bin/env python3
"""Synthetic-only tests for the G6/G7 release-readiness gate. No private data is read.

The 226 + 356 dataset is generated from the existing synthetic fixtures. The gate must
fail closed: with no real server authorization contract it never reports a release as
authorized, whatever a ledger label, approval flag or injected test verifier says.
"""
import ast
import copy
import importlib.util
import json
import sys
import unittest
from pathlib import Path

sys.dont_write_bytecode = True
TOOLS = Path(__file__).resolve().parent
sys.path.insert(0, str(TOOLS))
from test_movekit_catalog_stage import fixtures  # noqa: E402


def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, TOOLS / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


GATE = load("tk504_release_gate", "movekit-release-authority-gate.py")
LEDGER = GATE.LEDGER
PINS = {"supplier": "a" * 64, "catalog": "b" * 64, "inventory": "c" * 64,
        "glossary": "d" * 64}
GLOSSARY = json.loads((TOOLS / "movekit-v2-taxonomy-map.json").read_text(encoding="utf8"))
NOW = "2026-11-05T00:00:00Z"
CLEAN = {"category": "mobility", "type": "mobility", "pattern": "Mobility",
         "primary": ["Legs"], "secondary": ["Core"], "equipment": ["Bodyweight"],
         "goals": []}


def build(mutate_rows=None, mutate_catalog=None):
    """Unanimous-baseline synthetic world: 226 baseline + 356 new, all one signature."""
    catalog, inventory, rows = fixtures()
    for entry in catalog["catalog"]:
        entry["identity"].update(copy.deepcopy(CLEAN), category="mobility", type="mobility")
    # one baseline row in its own signature bucket widens the app vocabulary without
    # making the baseline for the 356 candidates conflicting
    rows[1]["primaryMuscles"] = ["Back"]
    catalog["catalog"][1]["identity"].update(
        primary=["Back"], equipment=["barbell", "Rugzak"], category="upper_body_pull",
        type="compound", goals=["mobility"])
    if mutate_rows:
        mutate_rows(rows)
    if mutate_catalog:
        mutate_catalog(catalog)
    return catalog, inventory, rows


class Base(unittest.TestCase):
    def make(self, mutate_rows=None, mutate_catalog=None):
        self.catalog, self.inventory, self.rows = build(mutate_rows, mutate_catalog)
        self.template = LEDGER.make_template(
            self.catalog, self.inventory, self.rows,
            {k: PINS[k] for k in ("supplier", "catalog", "inventory")})
        self.ledger = copy.deepcopy(self.template)
        return self

    def accept(self, index=0, kind="AI", **changes):
        entry = self.ledger["entries"][index]
        cls = dict(copy.deepcopy(CLEAN), **changes)
        entry.update(decision="ACCEPT", classification=cls, review={
            "kind": kind, "reviewer": "synthetic-proposer", "reference": "r",
            "reviewed_at": "2026-11-04T00:00:00Z", "rationale": "synthetic rationale text",
            "source_refs": ["supplier-sha256:" + entry["supplier_record_sha256"]]})
        return entry

    def accept_all(self):
        for i in range(356):
            self.accept(i)

    def run_gate(self, **kw):
        return GATE.evaluate_release_readiness(
            self.ledger, self.rows, self.catalog, self.inventory, GLOSSARY, PINS, **kw)

    def prepare(self, **kw):
        return GATE.prepare_report(self.ledger, self.rows, self.catalog, self.inventory,
                                   GLOSSARY, PINS, **kw)

    def candidate(self, report, index=0):
        cid = self.ledger["entries"][index]["catalog_id"]
        return next(c for c in report["candidates"] if c["catalog_id"] == cid)

    def exception(self, index, field, flags, **over):
        entry = self.ledger["entries"][index]
        exc = {"schema": GATE.EXCEPTION_SCHEMA, "version": 1, "decision_id": "dec-1",
               "catalog_id": entry["catalog_id"], "field": field, "flags": list(flags),
               "accepted_value_sha256": GATE.digest(entry["classification"][field]),
               "supplier_record_sha256": entry["supplier_record_sha256"],
               "authority_kind": "QUALIFIED_REVIEWER_DECISION_REF",
               "authority_ref": "qualified-ref-1", "rationale": "synthetic exception"}
        exc.update(over)
        return exc

    def approval(self, report, **over):
        refs = [{"type": t, "catalog_id": c, "field": f, "ref_id": "ref-" + c}
                for t, c, f in sorted(GATE._expected_refs(report["candidates"]),
                                      key=lambda x: (x[0], x[1], x[2] or ""))]
        value = {"schema": GATE.APPROVAL_SCHEMA,
                 "issuer": {"id": "auth-server-test", "kind": "SEPARATE_AUTH_SERVER"},
                 "account": {"id": "approver-test", "role": "QUALIFIED_CONTENT_REVIEWER"},
                 "issued_at": "2026-11-04T12:00:00Z", "expires_at": "2026-11-05T12:00:00Z",
                 "binding": copy.deepcopy(report["binding"]), "decision_refs": refs}
        value.update(over)
        return value


def mock_verifier(approval, binding_sha):
    return {"verified": True, "approval_sha256": GATE.digest(approval),
            "issuer_id": approval["issuer"]["id"]}


class ZeroApprovalReport(Base):
    def test_all_pending_is_blocked_with_reasons(self):
        r = self.make().prepare()
        self.assertEqual(r["status"], GATE.STATUS)
        self.assertFalse(r["release_authorized"])
        for flag in ("PENDING_ENTRIES_REMAIN", "NO_RELEASE_CANDIDATES",
                     "NO_ACCEPTED_AUTHORIZATION", "PRODUCTION_AUTH_CONTRACT_NOT_IMPLEMENTED"):
            self.assertIn(flag, r["set_blocking_flags"])
        self.assertEqual(r["counts"]["pending"], 356)

    def test_inputs_are_not_mutated_and_no_side_effect_flags(self):
        self.make().accept_all()
        before = [GATE.digest(x) for x in (self.ledger, self.rows, self.catalog,
                                          self.inventory, GLOSSARY)]
        r = self.run_gate(content_approval=None)
        after = [GATE.digest(x) for x in (self.ledger, self.rows, self.catalog,
                                         self.inventory, GLOSSARY)]
        self.assertEqual(before, after)
        for key in ("app_activated", "db_writes", "media_grants", "catalog_mutated",
                    "human_identity_verified", "production_auth_implemented"):
            self.assertIs(r[key], False)
        self.assertEqual(len(self.catalog["catalog"]), 226)

    def test_report_contains_no_private_source_content(self):
        self.make().accept_all()
        self.accept(0, equipment=["barbell"])
        text = json.dumps(self.prepare())
        for secret in ("Supplier 227", "synthetic-0227", "Supplier-provided", "barbell",
                       "synthetic-proposer", "synthetic rationale", "demonstration", "Legs",
                       "supplier-sha256:"):
            self.assertNotIn(secret, text)
        self.assertIn("TK-000227", text)

    def test_report_is_deterministic(self):
        self.make().accept_all()
        self.assertEqual(json.dumps(self.prepare(), sort_keys=True),
                         json.dumps(self.prepare(), sort_keys=True))

    def test_prepare_ignores_any_approval_and_never_passes_local_checks(self):
        self.make().accept_all()
        r = self.prepare()
        self.assertFalse(r["local_checks_passed"])
        self.assertEqual(r["authorization"]["status"], "NO_APPROVAL")


class SourceTrace(Base):
    def test_clean_accept_is_traced_but_still_blocked(self):
        self.make()
        self.accept(0)
        c = self.candidate(self.prepare())
        self.assertTrue(c["evidence_complete"])
        self.assertEqual(c["blocking_flags"], [])
        self.assertTrue(c["blocked"])
        self.assertEqual(set(c["fields"]), set(LEDGER.CLASS_FIELDS))

    def test_g6_barbell_accept_contradicting_bodyweight_source_fails(self):
        """Exact G6 expectation (old xfail): supplier says Bodyweight, ACCEPT claims barbell."""
        self.make()
        self.assertEqual(self.rows[226]["equipment"], ["Bodyweight"])
        self.accept(0, equipment=["barbell"])
        LEDGER.validate(self.ledger, self.template, self.catalog)  # old validator: still passes
        c = self.candidate(self.prepare())
        self.assertFalse(c["evidence_complete"])
        self.assertIn("EQUIPMENT_NOT_SOURCE_BACKED_VOCAB_ONLY", c["blocking_flags"])
        self.assertIn("EQUIPMENT_SOURCE_TERM_OMITTED", c["blocking_flags"])

    def test_g7_divergence_from_unanimous_baseline_fails(self):
        """Exact G7 expectation, but with a really unanimous baseline (the old xfail
        fixture is a CONFLICT, so its suggestion assertion fails before it tests anything)."""
        self.make()
        s = self.ledger["entries"][0]["suggestion"]
        self.assertEqual((s["status"], s["proposed_category"], s["proposed_type"]),
                         ("SUGGESTED_UNVERIFIED", "mobility", "mobility"))
        self.accept(0, category="upper_body_pull", type="compound")
        LEDGER.validate(self.ledger, self.template, self.catalog)  # old validator: still passes
        c = self.candidate(self.prepare())
        self.assertIn("CATEGORY_DIVERGES_FROM_UNANIMOUS_BASELINE", c["blocking_flags"])
        self.assertIn("TYPE_DIVERGES_FROM_UNANIMOUS_BASELINE", c["blocking_flags"])

    def test_baseline_conflict_and_no_baseline_need_authority(self):
        def conflicting(catalog):
            catalog["catalog"][2]["identity"]["category"] = "cardio"
        self.make(mutate_catalog=conflicting).accept(0)
        c = self.candidate(self.prepare())
        self.assertIn("CATEGORY_BASELINE_CONFLICT_NEEDS_AUTHORITY", c["blocking_flags"])

        def unique(rows):
            rows[226]["movementPattern"] = ["Unique"]
        self.make(mutate_rows=unique).accept(0)
        c = self.candidate(self.prepare())
        self.assertIn("CATEGORY_NO_BASELINE_NEEDS_AUTHORITY", c["blocking_flags"])
        self.assertIn("PATTERN_NOT_SOURCE_BACKED_VOCAB_ONLY", c["blocking_flags"])

    def test_primary_secondary_mismatch_with_source(self):
        self.make().accept(0, primary=["Back"], secondary=[])
        flags = self.candidate(self.prepare())["blocking_flags"]
        self.assertIn("PRIMARY_NOT_SOURCE_BACKED_VOCAB_ONLY", flags)
        self.assertIn("PRIMARY_SOURCE_TERM_OMITTED", flags)
        self.assertIn("SECONDARY_SOURCE_TERM_OMITTED", flags)

    def test_goals_are_never_source_derived(self):
        self.make().accept(0, goals=["mobility"])
        self.assertIn("GOALS_NOT_SOURCE_DERIVED",
                      self.candidate(self.prepare())["blocking_flags"])

    def test_glossary_alias_counts_as_source_backing(self):
        def backpack(rows):
            rows[226]["equipment"] = ["Backpack"]
        self.make(mutate_rows=backpack).accept(0, equipment=["Rugzak"])
        self.assertEqual(self.candidate(self.prepare())["blocking_flags"], [])

    def test_human_attested_label_does_not_clear_flags(self):
        self.make()
        self.accept(0, kind="AI", equipment=["barbell"])
        self.accept(1, kind="HUMAN_ATTESTED", equipment=["barbell"])
        r = self.prepare()
        self.assertEqual(self.candidate(r, 0)["blocking_flags"],
                         self.candidate(r, 1)["blocking_flags"])
        self.assertEqual(r["counts"]["human_attested_label_unverified"], 1)
        self.assertFalse(r["human_identity_verified"])


class IdentityAndBinding(Base):
    def flags(self, report):
        return report["set_blocking_flags"]

    def test_changed_supplier_record_after_review_fails(self):
        self.make().accept(0)
        self.rows[226]["instructions"] = ["Changed after review."]
        self.assertIn("LEDGER_INVALID:STALE_OR_CHANGED_SOURCE", self.flags(self.prepare()))

    def test_tampered_record_sha_in_ledger_fails(self):
        self.make().accept(0)
        self.ledger["entries"][0]["supplier_record_sha256"] = "e" * 64
        self.assertTrue(any(f.startswith("LEDGER_INVALID") for f in self.flags(self.prepare())))

    def test_changed_pinned_file_hash_fails(self):
        self.make().accept(0)
        pins = dict(PINS, supplier="f" * 64)
        r = GATE.prepare_report(self.ledger, self.rows, self.catalog, self.inventory,
                                GLOSSARY, pins)
        self.assertIn("LEDGER_INVALID:STALE_SOURCE_HASH", r["set_blocking_flags"])

    def test_missing_or_malformed_pins_fail(self):
        self.make().accept(0)
        for pins in (None, {}, dict(PINS, glossary="zz")):
            r = GATE.prepare_report(self.ledger, self.rows, self.catalog, self.inventory,
                                    GLOSSARY, pins)
            self.assertIn("PINNED_HASHES_MISSING_OR_INVALID", r["set_blocking_flags"])

    def test_missing_source_identifiers_fail(self):
        self.make().accept(0)
        self.rows.pop()
        self.assertIn("SUPPLIER_METADATA_NOT_582", self.flags(self.prepare()))
        self.make().accept(0)
        del self.rows[226]["slug"]
        self.assertTrue(any(f.startswith("LEDGER_INVALID") or f == "INPUT_INVALID"
                            for f in self.flags(self.prepare())) or
                        "GATE_INTERNAL_ERROR" in self.flags(self.prepare()))

    def test_missing_356_or_226_or_inventory_fails(self):
        self.make().accept_all()
        self.ledger["entries"].pop()
        self.assertIn("LEDGER_NOT_356", self.flags(self.prepare()))
        self.make()
        self.catalog["catalog"].pop()
        self.assertIn("CATALOG_NOT_226", self.flags(self.prepare()))
        self.make()
        self.inventory["items"].pop()
        self.assertIn("INVENTORY_NOT_582", self.flags(self.prepare()))

    def test_approved_or_active_glossary_fails(self):
        self.make()
        for patch in ({"status": "APPROVED"}, {"runtime_activation": True}):
            glossary = dict(GLOSSARY, **patch)
            r = GATE.prepare_report(self.ledger, self.rows, self.catalog, self.inventory,
                                    glossary, PINS)
            self.assertIn("GLOSSARY_INVALID_OR_APPROVED_OR_ACTIVE", r["set_blocking_flags"])

    def test_client_side_flags_and_owner_draft_cannot_bypass(self):
        self.make().accept(0)
        self.ledger["entries"][0]["reviewed"] = True
        self.ledger["entries"][0]["localStorage"] = {"approved": True}
        r = self.prepare()
        self.assertIn("LEDGER_INVALID:UNKNOWN_ENTRY_FIELD", r["set_blocking_flags"])
        owner_draft = {"schema": "owner-draft/1", "approved": True, "entries": []}
        r = GATE.prepare_report(owner_draft, self.rows, self.catalog, self.inventory,
                                GLOSSARY, PINS)
        self.assertIn("LEDGER_NOT_356", r["set_blocking_flags"])
        self.assertFalse(r["release_authorized"])


class Authorization(Base):
    def ready(self):
        self.make().accept_all()
        return self.prepare()

    def test_boolean_approved_object_is_rejected(self):
        self.ready()
        r = self.run_gate(content_approval={"approved": True}, now=NOW, verifier=mock_verifier)
        self.assertEqual(r["authorization"]["status"], "REJECTED")
        self.assertIn("APPROVAL_SCHEMA_INVALID", r["authorization"]["flags"])
        r = self.run_gate(content_approval=True, now=NOW, verifier=mock_verifier)
        self.assertEqual(r["authorization"]["status"], "REJECTED")

    def test_approval_with_extra_client_flag_is_rejected(self):
        base = self.ready()
        approval = self.approval(base, approved=True)
        r = self.run_gate(content_approval=approval, now=NOW, verifier=mock_verifier)
        self.assertIn("APPROVAL_SCHEMA_INVALID", r["authorization"]["flags"])

    def test_no_verifier_fails_closed_even_with_valid_structure(self):
        approval = self.approval(self.ready())
        r = self.run_gate(content_approval=approval, now=NOW)
        self.assertEqual(r["authorization"]["status"], "UNVERIFIED")
        self.assertIn("SERVER_VERIFIER_NOT_PROVIDED", r["set_blocking_flags"])
        self.assertFalse(r["local_checks_passed"])

    def test_injected_verifier_is_never_a_real_server_grant(self):
        approval = self.approval(self.ready())
        r = self.run_gate(content_approval=approval, now=NOW, verifier=mock_verifier)
        self.assertEqual(r["authorization"]["status"],
                         "INJECTED_VERIFIER_ACCEPTED_NOT_PRODUCTION_AUTH")
        self.assertTrue(r["local_checks_passed"])
        self.assertEqual(r["status"], GATE.STATUS)
        self.assertIs(r["release_authorized"], False)
        self.assertIs(r["server_grant_verified"], False)
        self.assertIs(r["production_auth_implemented"], False)
        self.assertIn("PRODUCTION_AUTH_CONTRACT_NOT_IMPLEMENTED", r["set_blocking_flags"])
        self.assertTrue(all(c["blocked"] for c in r["candidates"]))

    def test_non_strict_verifier_results_are_rejected(self):
        approval = self.approval(self.ready())
        bad = (lambda a, b: True, lambda a, b: {"verified": "yes"}, lambda a, b: None,
               lambda a, b: dict(mock_verifier(a, b), extra=1),
               lambda a, b: dict(mock_verifier(a, b), approval_sha256="0" * 64),
               lambda a, b: dict(mock_verifier(a, b), issuer_id="someone-else"),
               lambda a, b: (_ for _ in ()).throw(RuntimeError("boom")))
        for verifier in bad:
            r = self.run_gate(content_approval=approval, now=NOW, verifier=verifier)
            self.assertEqual(r["authorization"]["status"], "REJECTED")
            self.assertFalse(r["local_checks_passed"])

    def test_non_callable_verifier_is_not_a_verifier(self):
        approval = self.approval(self.ready())
        r = self.run_gate(content_approval=approval, now=NOW, verifier={"verified": True})
        self.assertEqual(r["authorization"]["status"], "UNVERIFIED")

    def test_verifier_cannot_mutate_the_approval_it_was_given(self):
        approval = self.approval(self.ready())
        original = copy.deepcopy(approval)

        def evil(a, b):
            a["decision_refs"].clear()
            return mock_verifier(a, b)
        self.run_gate(content_approval=approval, now=NOW, verifier=evil)
        self.assertEqual(approval, original)

    def test_verifier_is_not_called_for_structurally_bad_approval(self):
        approval = self.approval(self.ready())
        approval["decision_refs"].pop()
        calls = []
        r = self.run_gate(content_approval=approval, now=NOW,
                          verifier=lambda a, b: calls.append(1) or mock_verifier(a, b))
        self.assertEqual(calls, [])
        self.assertIn("APPROVAL_DECISION_REFS_MISMATCH", r["authorization"]["flags"])

    def test_expiry_binding_clock_and_proposer_checks(self):
        base = self.ready()
        cases = {
            "APPROVAL_EXPIRED": dict(expires_at="2026-11-04T13:00:00Z"),
            "APPROVAL_NOT_YET_VALID": dict(issued_at="2026-11-06T00:00:00Z",
                                           expires_at="2026-11-06T12:00:00Z"),
            "APPROVAL_VALIDITY_TOO_LONG": dict(expires_at="2026-12-30T00:00:00Z"),
            "APPROVAL_TIMESTAMPS_INVALID": dict(expires_at="2026-11-04T00:00:00Z"),
            "APPROVAL_BINDING_MISMATCH": dict(binding=dict(base["binding"],
                                                           ledger_sha256="0" * 64)),
            "APPROVER_IS_PROPOSER_OR_ISSUER": dict(account={
                "id": "synthetic-proposer", "role": "QUALIFIED_CONTENT_REVIEWER"}),
        }
        for flag, over in cases.items():
            r = self.run_gate(content_approval=self.approval(base, **over), now=NOW,
                              verifier=mock_verifier)
            self.assertIn(flag, r["authorization"]["flags"], flag)
            self.assertFalse(r["local_checks_passed"])
        r = self.run_gate(content_approval=self.approval(base), now=None,
                          verifier=mock_verifier)
        self.assertIn("APPROVAL_NOW_REQUIRED", r["authorization"]["flags"])

    def test_wrong_issuer_kind_or_role_is_rejected(self):
        base = self.ready()
        for over in (dict(issuer={"id": "x", "kind": "CLIENT"}),
                     dict(account={"id": "y", "role": "OWNER_VIEWER"})):
            r = self.run_gate(content_approval=self.approval(base, **over), now=NOW,
                              verifier=mock_verifier)
            self.assertIn("APPROVAL_ISSUER_OR_ROLE_INVALID", r["authorization"]["flags"])

    def test_missing_decisions_or_pending_entries_block_even_with_verifier(self):
        self.make()
        for i in range(10):
            self.accept(i)
        base = self.prepare()
        r = self.run_gate(content_approval=self.approval(base), now=NOW, verifier=mock_verifier)
        self.assertIn("PENDING_ENTRIES_REMAIN", r["set_blocking_flags"])
        self.assertFalse(r["local_checks_passed"])
        self.make().accept_all()
        base = self.prepare()
        approval = self.approval(base)
        approval["decision_refs"] = approval["decision_refs"][:-5]
        r = self.run_gate(content_approval=approval, now=NOW, verifier=mock_verifier)
        self.assertIn("APPROVAL_DECISION_REFS_MISMATCH", r["set_blocking_flags"])

    def test_candidate_evidence_gaps_block_even_with_accepting_verifier(self):
        self.make().accept_all()
        self.accept(5, equipment=["barbell"])
        base = self.prepare()
        r = self.run_gate(content_approval=self.approval(base), now=NOW, verifier=mock_verifier)
        self.assertIn("CANDIDATE_EVIDENCE_INCOMPLETE", r["set_blocking_flags"])
        self.assertFalse(r["local_checks_passed"])


class Exceptions(Base):
    def setUp(self):
        self.make().accept_all()
        self.accept(0, category="upper_body_pull", type="compound")
        self.flags = ["CATEGORY_DIVERGES_FROM_UNANIMOUS_BASELINE"]

    def field(self, report, name):
        return self.candidate(report)["fields"][name]

    def test_valid_exception_is_structural_only_and_needs_server_ref(self):
        exc = self.exception(0, "category", self.flags)
        r = self.prepare(exceptions=[exc])
        info = self.field(r, "category")
        self.assertEqual(info["status"], "EXCEPTION_STRUCTURALLY_VALID_UNVERIFIED")
        self.assertIn("SERVER_VERIFIED_EXCEPTION:category", self.candidate(r)["requires"])
        self.assertTrue(all(c["blocked"] for c in r["candidates"]))
        self.assertIn("NO_ACCEPTED_AUTHORIZATION", r["set_blocking_flags"])

    def test_exception_cannot_cover_unlisted_flags_or_other_fields(self):
        self.accept(0, category="upper_body_pull", type="compound")
        exc = self.exception(0, "category", ["SOMETHING_ELSE"])
        r = self.prepare(exceptions=[exc])
        self.assertIn("CATEGORY_DIVERGES_FROM_UNANIMOUS_BASELINE",
                      self.candidate(r)["blocking_flags"])
        wrong_field = self.exception(0, "type", self.flags)
        r = self.prepare(exceptions=[wrong_field])
        self.assertIn("CATEGORY_DIVERGES_FROM_UNANIMOUS_BASELINE",
                      self.candidate(r)["blocking_flags"])

    def test_exception_bound_to_value_supplier_and_authority(self):
        bad = (dict(accepted_value_sha256="0" * 64), dict(supplier_record_sha256="0" * 64),
               dict(authority_ref="synthetic-proposer"), dict(authority_kind="AI"),
               dict(version=2), dict(schema="other/1"), dict(rationale="  "),
               dict(catalog_id="TK-000999"), dict(unexpected=True))
        for over in bad:
            r = self.prepare(exceptions=[self.exception(0, "category", self.flags, **over)])
            self.assertIn("CATEGORY_DIVERGES_FROM_UNANIMOUS_BASELINE",
                          self.candidate(r)["blocking_flags"], over)

    def test_duplicate_exceptions_are_ambiguous_and_ignored(self):
        exc = self.exception(0, "category", self.flags)
        r = self.prepare(exceptions=[exc, copy.deepcopy(exc)])
        self.assertIn("CATEGORY_DIVERGES_FROM_UNANIMOUS_BASELINE",
                      self.candidate(r)["blocking_flags"])

    def test_exception_requires_its_own_approval_ref(self):
        exc = self.exception(0, "category", self.flags)
        exc2 = self.exception(0, "type", ["TYPE_DIVERGES_FROM_UNANIMOUS_BASELINE"])
        base = self.prepare(exceptions=[exc, exc2])
        approval = self.approval(base)
        kinds = [r["type"] for r in approval["decision_refs"]]
        self.assertEqual(kinds.count("CLASSIFICATION_EXCEPTION"), 2)
        r = self.run_gate(content_approval=approval, now=NOW, verifier=mock_verifier,
                          exceptions=[exc, exc2])
        self.assertTrue(r["local_checks_passed"])
        self.assertFalse(r["release_authorized"])
        approval["decision_refs"] = [x for x in approval["decision_refs"]
                                     if x["type"] != "CLASSIFICATION_EXCEPTION"]
        r = self.run_gate(content_approval=approval, now=NOW, verifier=mock_verifier,
                          exceptions=[exc, exc2])
        self.assertIn("APPROVAL_DECISION_REFS_MISMATCH", r["authorization"]["flags"])


class Manifest(Base):
    def test_planned_manifest_is_not_issuable_and_unsigned(self):
        self.make().accept_all()
        report = self.prepare()
        m = GATE.plan_release_manifest(report)
        self.assertFalse(m["issuable"])
        self.assertIsNone(m["signature"])
        self.assertEqual(m["state"], "PLANNED_NOT_ISSUABLE")
        self.assertEqual(len(m["candidates"]), 356)
        self.assertTrue(all(c["state"] == "BLOCKED" for c in m["candidates"]))
        self.assertEqual(m["issuer_requirements"]["issuer_kind"], "SEPARATE_AUTH_SERVER")
        self.assertTrue(m["expiry_requirements"]["expires_at_required"])
        self.assertEqual(set(m["pinned_binding"]),
                         {"ledger_sha256", "object_hashes", "pinned_hashes"})

    def test_manifest_rejects_bad_report_and_validity(self):
        self.make()
        for bad in ({}, None):
            with self.assertRaises(ValueError):
                GATE.plan_release_manifest(bad)
        for hours in (0, -1, 10_000, "24"):
            with self.assertRaises(ValueError):
                GATE.plan_release_manifest(self.prepare(), hours)

    def test_sanitizer_rejects_free_text(self):
        with self.assertRaises(ValueError):
            GATE._assert_sanitized({"x": ["Supplier 227 instructions"]})


class BrowserAndServerContract(unittest.TestCase):
    """Dark-launch contract: the gate is server-side Python; nothing in the live app uses it."""

    def test_gate_has_no_io_network_or_db_capability(self):
        tree = ast.parse((TOOLS / "movekit-release-authority-gate.py").read_text("utf8"))
        banned = {"socket", "urllib", "requests", "http", "subprocess", "sqlite3", "shutil",
                  "os", "pathlib_write", "ftplib", "smtplib"}
        imported = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                imported |= {a.name.split(".")[0] for a in node.names}
            elif isinstance(node, ast.ImportFrom):
                imported.add((node.module or "").split(".")[0])
        self.assertFalse(imported & banned, imported & banned)
        calls = {n.func.id for n in ast.walk(tree)
                 if isinstance(n, ast.Call) and isinstance(n.func, ast.Name)}
        self.assertFalse(calls & {"open", "exec", "eval", "compile", "__import__", "print"})
        attrs = {n.attr for n in ast.walk(tree) if isinstance(n, ast.Attribute)}
        self.assertFalse(attrs & {"write_text", "write_bytes", "open", "mkdir", "unlink"})

    def test_live_app_does_not_reference_gate_or_approval_contract(self):
        index = TOOLS.parent / "index.html"
        if not index.exists():
            self.skipTest("no index.html in this worktree")
        text = index.read_text(encoding="utf8", errors="replace")
        for token in ("release-authority-gate", "content_approval", "release_authorized",
                      "trainingskompas-content-approval", "evaluate_release_readiness"):
            self.assertNotIn(token, text)

    def test_server_verifier_default_is_absent(self):
        import inspect
        sig = inspect.signature(GATE.evaluate_release_readiness)
        self.assertIsNone(sig.parameters["verifier"].default)
        self.assertIsNone(sig.parameters["content_approval"].default)
        self.assertIsNone(sig.parameters["now"].default)
        self.assertNotIn("verifier", inspect.signature(GATE.prepare_report).parameters)


if __name__ == "__main__":
    unittest.main()
