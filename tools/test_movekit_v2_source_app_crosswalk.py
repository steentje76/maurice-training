#!/usr/bin/env python3
"""Synthetic-only tests for the source->app crosswalk observation audit.

No private data is read. The 226 + 356 corpus is generated from the existing synthetic
fixtures. Every test asserts fail-closed behaviour: a crosswalk is historical observation
only, never an approval, never a gate clearance.
"""
import copy
import importlib.util
import json
import sys
import tempfile
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


CW = load("tk504_crosswalk", "movekit-v2-source-app-crosswalk.py")
GATE = load("tk504_crosswalk_gate", "movekit-release-authority-gate.py")
LEDGER = CW.LEDGER
GLOSSARY = json.loads((TOOLS / "movekit-v2-taxonomy-map.json").read_text(encoding="utf8"))
PINS = {"supplier": "a" * 64, "catalog": "b" * 64, "inventory": "c" * 64,
        "glossary": "d" * 64}
BASE_SRC = {"primaryMuscles": ["Legs"], "secondaryMuscles": ["Core"],
            "equipment": ["Bodyweight"], "movementPattern": ["Mobility"]}
BASE_ID = {"category": "mobility", "type": "mobility", "pattern": "Mobiliteit",
           "primary": ["Benen"], "secondary": [], "equipment": ["lichaamsgewicht"],
           "goals": ["mobility"]}
BASE_CLS = {"category": "mobility", "type": "mobility", "pattern": "Mobiliteit",
            "primary": ["Benen"], "secondary": [], "equipment": ["lichaamsgewicht"],
            "goals": []}


def published_plan(block_published=True):
    """(1-based published index range, supplier edits, app identity edits)."""
    plan = [
        (range(1, 6), {"equipment": ["Barbell"]}, {"equipment": ["barbell"]}),
        (range(6, 8), {"equipment": ["Dumbbell"]}, {"equipment": ["dumbbell"]}),
        (range(8, 10), {"equipment": ["Cable"]}, {"equipment": ["kabel"]}),
        (range(10, 11), {"equipment": ["Cable"]}, {"equipment": ["touw"]}),
        (range(11, 14), {"equipment": ["Bands", "Bench"]}, {"equipment": ["band", "bank"]}),
        (range(20, 23), {"primaryMuscles": ["Quads"]}, {"primary": ["Quadriceps"]}),
        (range(23, 25), {"secondaryMuscles": ["Glutes"]}, {"secondary": ["Billen"]}),
        (range(26, 29), {"primaryMuscles": ["Glutes"]}, {"primary": ["Billen"]}),
        (range(29, 32), {"secondaryMuscles": ["Calves"]}, {"secondary": ["Kuiten"]}),
        (range(32, 35), {"equipment": ["Kettlebell"]}, {"equipment": ["kettlebell"]}),
        (range(35, 36), {"equipment": ["Kettlebell", "Bench"]}, {"equipment": ["bank"]}),
        (range(36, 39), {"movementPattern": ["Hinge"]}, {"pattern": "Heupscharnier"}),
        (range(39, 42), {"equipment": ["Sandbag"]}, {"equipment": ["zandzak"]}),
        (range(42, 45), {"equipment": ["Pack"]}, {"equipment": ["zandzak"]}),
    ]
    if block_published:
        plan += [(range(14, 17), {"primaryMuscles": ["Forearms"]}, {"primary": ["Grip"]}),
                 (range(17, 20), {"primaryMuscles": ["Lower Back"]}, {"primary": ["Rug"]})]
    else:  # Grip/Rug exist in the app vocabulary but NEVER via the Forearms/Lower Back labels
        plan += [(range(14, 15), {"primaryMuscles": ["Wrist"]}, {"primary": ["Grip"]}),
                 (range(17, 18), {"primaryMuscles": ["Spine"]}, {"primary": ["Rug"]})]
    return plan


# 0-based index into the 356 -> (supplier edits, accepted classification edits)
CASES = {
    1: ({"equipment": ["Barbell"]}, {"equipment": ["barbell"]}),
    2: ({"equipment": ["Barbell"]}, {"equipment": ["dumbbell"]}),
    3: ({"equipment": ["Barbell"]}, {"equipment": ["barbell", "kettlebell"]}),
    4: ({"equipment": ["Dumbbell"]}, {"equipment": ["dumbbell"]}),
    5: ({"equipment": ["Cable"]}, {"equipment": ["kabel"]}),
    6: ({"primaryMuscles": ["Forearms"]}, {"primary": ["Grip"]}),
    7: ({"primaryMuscles": ["Lower Back"]}, {"primary": ["Rug"]}),
    8: ({"primaryMuscles": ["Onderrug"]}, {"primary": ["Rug"]}),
    9: ({"primaryMuscles": ["Forearms"]}, {"primary": ["Benen"]}),
    10: ({"secondaryMuscles": []}, {"secondary": []}),
    11: ({"secondaryMuscles": ["Calves"]}, {"secondary": ["Kuiten"]}),
    12: ({"secondaryMuscles": ["Calves"]}, {"secondary": []}),
    13: ({}, {"goals": ["mobility"]}),
    14: ({"primaryMuscles": ["Lower-Back"]}, {"primary": ["Rug"]}),
    15: ({"primaryMuscles": ["Glutes", "Quads"]}, {"primary": ["Billen", "Quadriceps"]}),
    16: ({"primaryMuscles": ["Glutes", "Quads"]}, {"primary": ["Billen"]}),
    17: ({"primaryMuscles": []}, {"primary": ["Benen"]}),
    18: ({"equipment": ["Sandbag"]}, {"equipment": ["zandzak"]}),
    19: ({"equipment": ["Kettlebell"]}, {"equipment": ["kettlebell"]}),
    20: ({"secondaryMuscles": ["Glutes"]}, {"secondary": ["Billen"]}),
    21: ({"movementPattern": ["Hinge"]}, {"pattern": "Heupscharnier"}),
    22: ({"movementPattern": ["Hinge"]}, {"pattern": "Mobiliteit"}),
}


class World:
    def __init__(self, block_published=True, cases=None, mutate=None):
        self.catalog, self.inventory, self.rows = fixtures()
        for i, entry in enumerate(self.catalog["catalog"]):
            entry["identity"].update(copy.deepcopy(BASE_ID))
            self.rows[i].update(copy.deepcopy(BASE_SRC))
        for rng, src, ident in published_plan(block_published):
            for i in rng:
                self.rows[i - 1].update(copy.deepcopy(src))
                self.catalog["catalog"][i - 1]["identity"].update(copy.deepcopy(ident))
        # row 3 uses a different casing/spacing of the same app label
        self.catalog["catalog"][2]["identity"]["equipment"] = ["BARBELL "]
        self.cases = CASES if cases is None else cases
        for k, (src, _) in self.cases.items():
            self.rows[226 + k].update(copy.deepcopy(src))
        if mutate:
            mutate(self)
        self.template = LEDGER.make_template(
            self.catalog, self.inventory, self.rows,
            {k: PINS[k] for k in ("supplier", "catalog", "inventory")})
        self.ledger = copy.deepcopy(self.template)
        for k, entry in enumerate(self.ledger["entries"]):
            ref = ["supplier-sha256:" + entry["supplier_record_sha256"]]
            review = {"kind": "AI", "reviewer": "synthetic-proposer", "reference": "r",
                      "reviewed_at": "2026-11-04T00:00:00Z", "rationale": "synthetic text",
                      "source_refs": ref}
            if k < 245:
                cls = copy.deepcopy(BASE_CLS)
                cls.update(copy.deepcopy(self.cases.get(self.index_of(entry), ({}, {}))[1]))
                entry.update(decision="ACCEPT", classification=cls, review=review)
            else:
                entry.update(decision="DEFER", review=review)

    def index_of(self, entry):
        return int(entry["catalog_id"][3:]) - 227

    def analyze(self, **kw):
        return CW.analyze(self.ledger, self.rows, self.catalog, self.inventory, PINS, **kw)

    def report(self, **kw):
        return self.analyze(**kw)["report"]

    def case(self, k, result=None):
        result = result or self.analyze()
        cid = "TK-%06d" % (227 + k)
        return next(c for c in result["private_audit"]["cases"] if c["catalog_id"] == cid)


def mapping(report, field, text):
    sid = CW.term_id(field, "S", CW.canon(text))
    return next((m for m in report["fields"][field]["mappings"]
                 if m["source_term_id"] == sid), None)


class HistoricalConsensus(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.world = World()
        cls.report = cls.world.report()

    def test_status_is_observation_only(self):
        self.assertEqual(self.report["status"], "HISTORICAL_OBSERVATION_ONLY_NOT_APPROVED")
        self.assertEqual(self.report["accepted_audit"]["accepted_entries"], 245)
        self.assertEqual(self.report["accepted_audit"]["defer"], 111)
        self.assertEqual(self.report["published_rows"], 226)

    def test_three_plus_unanimous_is_supported_historical_only(self):
        m = mapping(self.report, "equipment", "Barbell")
        self.assertEqual(m["status"], CW.SUPPORTED)
        self.assertEqual(m["one_to_one_votes"], 5)  # casing variants collapse, ids stay distinct
        self.assertEqual(m["target_term_id"], CW.term_id("equipment", "A", "barbell"))
        self.assertEqual(self.report["evidence_kind"], "HISTORICAL_ONLY_NOT_SOURCE_PROOF")
        self.assertFalse(self.report["scientific_truth_claimed"])

    def test_fewer_than_three_is_too_few_not_a_mapping(self):
        m = mapping(self.report, "equipment", "Dumbbell")
        self.assertEqual((m["status"], m["one_to_one_votes"]), (CW.TOO_FEW, 2))
        self.assertIsNone(m["target_term_id"])

    def test_two_to_one_contradiction_is_conflict(self):
        m = mapping(self.report, "equipment", "Cable")
        self.assertEqual((m["status"], m["distinct_targets"], m["one_to_one_votes"]),
                         (CW.CONFLICT, 2, 3))
        self.assertIsNone(m["target_term_id"])

    def test_multi_term_rows_are_ambiguous_never_mapped(self):
        for term in ("Bands", "Bench"):
            m = mapping(self.report, "equipment", term)
            self.assertEqual(m["status"], CW.MULTI)
            self.assertEqual(m["one_to_one_votes"], 0)
            self.assertIsNone(m["target_term_id"])

    def test_counter_evidence_in_multi_term_row_downgrades_to_conflict(self):
        m = mapping(self.report, "equipment", "Kettlebell")
        self.assertEqual((m["status"], m["one_to_one_votes"], m["counter_rows"]),
                         (CW.CONFLICT, 3, 1))

    def test_empty_app_list_is_never_a_positive_mapping(self):
        m = mapping(self.report, "secondary", "Core")
        self.assertEqual(m["status"], CW.NO_DATA)
        self.assertEqual(m["one_to_one_votes"], 0)
        self.assertGreater(m["empty_app_rows"], 100)
        self.assertIsNone(m["target_term_id"])

    def test_source_term_blocked_in_history_stays_blocked_for_any_accepted_label(self):
        f = self.world.case(9)["fields"]["primary"]   # Forearms source, unrelated label
        self.assertEqual(f["status"], CW.P_BLOCKED)
        self.assertIn("SOURCE_TERM_BLOCKED_IN_HISTORY", f["flags"])

    def test_mappings_are_field_specific(self):
        self.assertEqual(mapping(self.report, "primary", "Glutes")["status"], CW.SUPPORTED)
        self.assertEqual(mapping(self.report, "secondary", "Glutes")["status"], CW.TOO_FEW)
        self.assertIsNone(mapping(self.report, "primary", "Barbell"))
        self.assertNotEqual(CW.term_id("primary", "S", "glutes"),
                            CW.term_id("secondary", "S", "glutes"))
        self.assertEqual(mapping(self.report, "pattern", "Hinge")["status"], CW.SUPPORTED)

    def test_shared_target_is_reported_not_reversed(self):
        a, b = mapping(self.report, "equipment", "Sandbag"), mapping(
            self.report, "equipment", "Pack")
        self.assertEqual((a["status"], b["status"]), (CW.SUPPORTED, CW.SUPPORTED))
        self.assertEqual((a["target_shared_by"], b["target_shared_by"]), (2, 2))
        self.assertNotIn("reverse", json.dumps(self.report).lower())

    def test_published_forearms_grip_and_lower_back_rug_are_hard_blocked(self):
        for term, field, rule in (("Forearms", "primary", "FOREARMS_NOT_GRIP"),
                                  ("Lower Back", "primary", "LOWER_BACK_NOT_RUG")):
            m = mapping(self.report, field, term)
            self.assertEqual((m["status"], m["blocked_rule"]), (CW.BLOCKED, rule))
            self.assertEqual(m["one_to_one_votes"], 3)   # unanimous 3 still does not map
            self.assertIsNone(m["target_term_id"])


class HardBlockWithoutHistory(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.world = World(block_published=False)
        cls.result = cls.world.analyze()
        cls.report = cls.result["report"]

    def test_labels_absent_from_published_set(self):
        self.assertIsNone(mapping(self.report, "primary", "Forearms"))
        self.assertIsNone(mapping(self.report, "primary", "Lower Back"))

    def test_forearms_to_grip_fails_closed(self):
        f = self.world.case(6, self.result)["fields"]["primary"]
        self.assertEqual(f["status"], CW.P_BLOCKED)
        self.assertIn("BLOCKED_FALSE_SYNONYM:FOREARMS_NOT_GRIP", f["flags"])

    def test_lower_back_to_rug_fails_closed_incl_dutch_and_spelling_variants(self):
        for k in (7, 8, 14):
            f = self.world.case(k, self.result)["fields"]["primary"]
            self.assertEqual(f["status"], CW.P_BLOCKED, k)
            self.assertIn("BLOCKED_FALSE_SYNONYM:LOWER_BACK_NOT_RUG", f["flags"], k)

    def test_unmapped_forearms_never_becomes_a_match(self):
        f = self.world.case(9, self.result)["fields"]["primary"]
        self.assertEqual(f["status"], CW.P_UNRESOLVED)

    def test_hard_block_counts_and_blockers(self):
        blocks = {b["rule"]: b for b in self.report["hard_blocks"]}
        self.assertEqual(blocks["FOREARMS_NOT_GRIP"]["accepted_field_hits"], 1)
        self.assertEqual(blocks["LOWER_BACK_NOT_RUG"]["accepted_field_hits"], 3)
        self.assertFalse(any(b["auto_mapping_allowed"] for b in blocks.values()))
        self.assertIn("HARD_BLOCKED_FALSE_SYNONYM_PRESENT", self.report["blockers"])

    def test_block_applies_to_alias_pairs_at_canonical_level(self):
        for src in ("forearm", "Onderarmen", "movekit:muscle:forearms"):
            for dst in ("grip", "Greep", "grip strength"):
                self.assertEqual(
                    CW.BLOCKED_PAIRS["primary"][(CW.term_id("primary", "S", CW.canon(src)),
                                                 CW.term_id("primary", "A", CW.canon(dst)))],
                    "FOREARMS_NOT_GRIP")
        # generic Back -> Rug is NOT the blocked collapse
        key = (CW.term_id("primary", "S", "back"), CW.term_id("primary", "A", "rug"))
        self.assertNotIn(key, CW.BLOCKED_PAIRS["primary"])


class AcceptedAudit(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.world = World()
        cls.result = cls.world.analyze()

    def field(self, k, name):
        return self.world.case(k, self.result)["fields"][name]

    def test_historical_match_is_labelled_historical_only(self):
        for k in (0, 1, 11, 15, 18, 21):
            self.assertEqual(self.field(k, "equipment" if k in (1, 18) else
                                        "secondary" if k == 11 else
                                        "primary" if k in (15, 0) else "pattern")["status"],
                             CW.P_MATCH, k)
        r = self.result["report"]
        self.assertFalse(r["gate_flags_cleared"])
        self.assertFalse(r["classification_approved"])
        self.assertFalse(any(c["approved"] or c["clears_gate_flags"]
                             for c in self.result["private_audit"]["cases"]))

    def test_mismatched_mapping_is_a_contradiction(self):
        f = self.field(2, "equipment")
        self.assertEqual(f["status"], CW.P_CONTRADICTION)
        self.assertIn("HISTORICAL_TARGET_MISSING", f["flags"])

    def test_extra_ai_label_and_missing_target_are_contradictions(self):
        self.assertIn("ACCEPTED_LABEL_NOT_IN_HISTORICAL_MAP", self.field(3, "equipment")["flags"])
        self.assertEqual(self.field(16, "primary")["status"], CW.P_CONTRADICTION)
        self.assertEqual(self.field(22, "pattern")["status"], CW.P_CONTRADICTION)

    def test_too_few_conflict_and_unresolved_are_distinguished(self):
        self.assertEqual(self.field(4, "equipment")["status"], CW.P_UNRESOLVED)
        self.assertEqual(self.field(5, "equipment")["status"], CW.P_CONFLICT)

    def test_empty_values_are_never_positive_evidence(self):
        self.assertEqual(self.field(10, "secondary")["status"], CW.P_NO_DATA_BOTH)
        self.assertEqual(self.field(12, "secondary")["status"], CW.P_EMPTY_ACCEPTED)
        self.assertEqual(self.field(17, "primary")["status"], CW.P_SOURCE_EMPTY_AI)
        # default entries: Core (secondary) has only empty app history
        self.assertEqual(self.field(0, "secondary")["status"], CW.P_EMPTY_ACCEPTED)

    def test_goals_stay_unsupported_and_category_type_not_assessed(self):
        r = self.result["report"]
        self.assertFalse(r["goals_supported"])
        self.assertFalse(r["category_type_evidence_provided"])
        self.assertFalse(r["accepted_audit"]["pattern_is_category_type_evidence"])
        self.assertEqual(r["accepted_audit"]["goals"], {
            "accepted_with_goals_unsupported": 1, "accepted_without_goals": 244})
        self.assertEqual(self.world.case(13, self.result)["goals"],
                         "UNSUPPORTED_NO_SOURCE_FIELD")
        self.assertEqual(self.world.case(0, self.result)["category_type"],
                         "NOT_ASSESSED_HERE_SEE_RELEASE_GATE")
        for name in ("category", "type", "goals"):
            self.assertNotIn(name, r["fields"])
        for blocker in ("GOALS_UNSUPPORTED_BY_SOURCE", "CATEGORY_TYPE_NOT_ASSESSED_HERE",
                        "HISTORICAL_OBSERVATION_NOT_SOURCE_PROOF", "HUMAN_REVIEW_REQUIRED",
                        "HISTORICAL_CONTRADICTIONS_PRESENT", "HISTORICAL_CONFLICTS_PRESENT",
                        "UNRESOLVED_COVERAGE_PRESENT"):
            self.assertIn(blocker, r["blockers"])

    def test_coverage_counts_are_consistent(self):
        for field, info in self.result["report"]["fields"].items():
            self.assertEqual(sum(info["accepted_entries_by_status"].values()), 245, field)
            self.assertLessEqual(info["accepted_entries_all_terms_supported"], 245)

    def test_audit_field_unusable_inputs_fail_closed(self):
        out = CW.audit_field("primary", {}, "not-a-list", ["x"])
        self.assertEqual(out["status"], CW.P_UNUSABLE)
        out = CW.audit_field("primary", {}, ["a"], ["pending_review"])
        self.assertEqual(out["status"], CW.P_UNUSABLE)


class IdentityBinding(unittest.TestCase):
    def failed(self, result, code=None):
        r = result["report"]
        self.assertEqual(r["status"], "INPUT_INVALID_FAIL_CLOSED")
        self.assertEqual(r["fields"], {})
        self.assertIn("NO_CROSSWALK_PRODUCED", r["blockers"])
        self.assertEqual(result["private_audit"]["cases"], [])
        if code:
            self.assertEqual(r["fail_code"], code)

    def test_fake_provider_id_in_ledger(self):
        w = World()
        w.ledger["entries"][0]["provider_id"] = "synthetic-9999"
        self.failed(w.analyze(), "STALE_OR_CHANGED_SOURCE")

    def test_fake_source_ref_and_record_hash(self):
        w = World()
        w.ledger["entries"][0]["review"]["source_refs"] = ["supplier-sha256:" + "0" * 64]
        self.failed(w.analyze(), "MISSING_EXACT_SUPPLIER_REFERENCE")
        w = World()
        w.ledger["entries"][0]["supplier_record_sha256"] = "0" * 64
        self.failed(w.analyze(), "STALE_OR_CHANGED_SOURCE")

    def test_changed_supplier_row_after_ledger(self):
        w = World()
        w.rows[300]["primaryMuscles"] = ["Changed"]
        self.failed(w.analyze(), "STALE_OR_CHANGED_SOURCE")

    def test_stale_or_malformed_pins(self):
        w = World()
        self.failed(CW.analyze(w.ledger, w.rows, w.catalog, w.inventory,
                               dict(PINS, supplier="e" * 64)), "STALE_SOURCE_HASH")
        self.failed(CW.analyze(w.ledger, w.rows, w.catalog, w.inventory,
                               {"supplier": "x"}), "PINNED_HASHES_MISSING_OR_INVALID")

    def test_published_row_not_bound_to_supplier_or_inventory(self):
        w = World()
        w.catalog["catalog"][0]["source"]["provider_id"] = "synthetic-9999"
        self.failed(w.analyze(), "PUBLISHED_SOURCE_UNBOUND")
        w = World()
        w.catalog["catalog"][1]["source"]["provider_id"] = \
            w.catalog["catalog"][0]["source"]["provider_id"]
        self.failed(w.analyze(), "PUBLISHED_SOURCE_UNBOUND")  # a repeated exercise cannot vote twice
        w = World()
        w.inventory["items"][0]["catalog_id"] = "TK-000999"
        self.failed(w.analyze(), "PUBLISHED_INVENTORY_MISMATCH")

    def test_wrong_cardinalities(self):
        w = World()
        self.failed(CW.analyze(w.ledger, w.rows[:-1], w.catalog, w.inventory, PINS),
                    "SUPPLIER_NOT_582")
        w = World()
        w.catalog["catalog"].pop()
        self.failed(w.analyze(), "CATALOG_NOT_226")

    def test_expected_object_digests_are_enforced(self):
        w = World()
        good = {"supplier": CW.digest(w.rows), "catalog": CW.digest(w.catalog),
                "inventory": CW.digest(w.inventory), "ledger": CW.digest(w.ledger)}
        self.assertEqual(w.report(expected_digests=good)["status"],
                         "HISTORICAL_OBSERVATION_ONLY_NOT_APPROVED")
        self.failed(w.analyze(expected_digests=dict(good, catalog="f" * 64)),
                    "EXPECTED_DIGEST_MISMATCH:catalog")

    def test_garbage_input_never_raises(self):
        self.failed(CW.analyze(None, None, None, None, None), None)
        self.failed(CW.analyze({}, [], {}, {}, PINS), None)

    def test_build_crosswalk_raises_value_error_on_unbound_source(self):
        w = World()
        w.catalog["catalog"][0]["source"]["provider"] = "other"
        with self.assertRaisesRegex(ValueError, "PUBLISHED_SOURCE_UNBOUND"):
            CW.build_crosswalk(w.rows, w.catalog, w.inventory, PINS)


class GlossaryProposals(unittest.TestCase):
    def test_namespaced_proposals_are_review_required_and_disabled(self):
        w = World(block_published=False)
        p = w.report(glossary=GLOSSARY)["namespaced_proposals"]
        self.assertEqual(len(p), 18)
        for item in p:
            self.assertTrue(item["review_required"])
            self.assertFalse(item["runtime_enabled"])
            self.assertFalse(item["replaces_app_label"])
            self.assertFalse(item["forced_translation"])
        rules = {x["hard_block_rule"] for x in p}
        self.assertEqual(rules, {None, "FOREARMS_NOT_GRIP", "LOWER_BACK_NOT_RUG"})
        forearms = next(x for x in p if x["hard_block_rule"] == "FOREARMS_NOT_GRIP")
        self.assertEqual(forearms["crosswalk_status_by_field"],
                         {"primary": CW.NO_DATA, "secondary": CW.NO_DATA})
        self.assertGreaterEqual(forearms["accepted_entries_with_term"], 2)

    def test_approved_or_active_glossary_is_ignored_fail_closed(self):
        w = World()
        for change in ({"status": "APPROVED"}, {"runtime_activation": True}):
            r = w.report(glossary=dict(GLOSSARY, **change))
            self.assertEqual(r["namespaced_proposals"], [])
            self.assertIn("GLOSSARY_INVALID_OR_APPROVED_OR_ACTIVE", r["blockers"])
        r = w.report()
        self.assertIn("GLOSSARY_NOT_PROVIDED", r["blockers"])

    def test_non_namespaced_code_is_rejected(self):
        bad = copy.deepcopy(GLOSSARY)
        bad["muscles"]["Forearms"]["code"] = "Grip"
        r = World().report(glossary=bad)
        self.assertEqual(len(r["namespaced_proposals"]), 17)
        self.assertIn("GLOSSARY_TERM_INVALID_OR_NOT_NAMESPACED", r["blockers"])


class OutputAndPurity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.world = World()
        cls.result = cls.world.analyze(glossary=GLOSSARY)

    def test_public_report_has_no_supplier_or_app_strings_or_ids(self):
        text = json.dumps(self.result["report"])
        for secret in ("Supplier 2", "synthetic-0", "Supplier-provided", "supplier-sha256",
                       "Barbell", "barbell", "Forearms", "Lower Back", "Grip", "Rug",
                       "Benen", "Billen", "movekit:", "TK-0", "videoFile", "posters/",
                       "http", "synthetic-proposer", "synthetic text"):
            self.assertNotIn(secret, text, secret)

    def test_private_audit_has_only_catalog_ids_and_status_flags(self):
        text = json.dumps(self.result["private_audit"])
        for secret in ("Supplier 2", "synthetic-0", "Barbell", "barbell", "Forearms", "Grip",
                       "Rug", "Benen", "supplier-sha256", "videoFile", "http", "synthetic text"):
            self.assertNotIn(secret, text, secret)
        self.assertIn("TK-000227", text)
        self.assertEqual(len(self.result["private_audit"]["cases"]), 245)

    def test_sanitizer_rejects_free_text(self):
        for bad in ({"x": "Barbell"}, {"x": ["some text"]}, {"bad key": "ABC"}):
            with self.assertRaisesRegex(ValueError, "REPORT_NOT_SANITIZED"):
                CW._assert_sanitized(bad, False)
        with self.assertRaises(ValueError):
            CW._assert_sanitized({"x": "TK-000227"}, False)
        CW._assert_sanitized({"x": "TK-000227"}, True)

    def test_no_approval_or_enablement_claim_anywhere(self):
        def walk(value):
            if isinstance(value, dict):
                for key, item in value.items():
                    if any(w in key for w in ("approved", "authorized", "enabled", "activated",
                                              "cleared", "writes", "grants", "mutated",
                                              "truth", "goals_supported")) and \
                            key != "auto_mapping_allowed":
                        self.assertIs(item, False, key)
                    walk(item)
            elif isinstance(value, list):
                for item in value:
                    walk(item)
        walk(self.result["report"])
        walk(self.result["private_audit"])

    def test_inputs_not_mutated_and_deterministic(self):
        w = World()
        before = [CW.digest(x) for x in (w.ledger, w.rows, w.catalog, w.inventory, GLOSSARY)]
        a = json.dumps(w.analyze(glossary=GLOSSARY), sort_keys=True)
        b = json.dumps(w.analyze(glossary=GLOSSARY), sort_keys=True)
        after = [CW.digest(x) for x in (w.ledger, w.rows, w.catalog, w.inventory, GLOSSARY)]
        self.assertEqual(before, after)
        self.assertEqual(a, b)
        self.assertEqual(len(w.catalog["catalog"]), 226)

    def test_release_gate_is_untouched_and_unaffected(self):
        source = (TOOLS / "movekit-release-authority-gate.py").read_text(encoding="utf8")
        self.assertNotIn("crosswalk", source.lower())  # decision: independent report only
        w = World()
        before = json.dumps(GATE.prepare_report(w.ledger, w.rows, w.catalog, w.inventory,
                                                GLOSSARY, PINS), sort_keys=True)
        w.analyze(glossary=GLOSSARY)
        after = json.dumps(GATE.prepare_report(w.ledger, w.rows, w.catalog, w.inventory,
                                               GLOSSARY, PINS), sort_keys=True)
        self.assertEqual(before, after)
        self.assertFalse(json.loads(after)["release_authorized"])

    def test_module_has_no_io_beyond_the_explicit_private_cli(self):
        source = (TOOLS / "movekit-v2-source-app-crosswalk.py").read_text(encoding="utf8")
        for banned in ("urllib", "requests", "socket", "subprocess", "supabase", "netlify"):
            self.assertNotIn(banned, source.lower())

    def test_cli_refuses_public_or_unprivate_output_before_reading_anything(self):
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / "licensed"
            (source / ".tk-private-review").mkdir(parents=True)
            ledger = source / ".tk-private-review" / "ledger.json"
            ledger.write_text("{}", encoding="utf8")
            for bad in (CW.ROOT / "out.json", Path(tmp) / "public.json",
                        source / "direct.json"):
                with self.assertRaises(ValueError):
                    CW.run(source, ledger, bad)
            self.assertFalse((CW.ROOT / "out.json").exists())


if __name__ == "__main__":
    unittest.main(verbosity=2)
