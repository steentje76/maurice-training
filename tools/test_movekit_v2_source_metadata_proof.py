#!/usr/bin/env python3
"""Synthetic G1 tests: whole-term supplier evidence matching. No private data."""
import importlib.util
import sys
import unittest
from pathlib import Path
sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("mk_proof", HERE / "movekit-v2-source-metadata-proof.py")
P = importlib.util.module_from_spec(spec)
spec.loader.exec_module(P)


def hit(text, phrase):
    return P.mentions(P.tokens(text), phrase)


class WholeTermEvidence(unittest.TestCase):
    def test_substrings_are_not_mentions(self):
        self.assertFalse(hit("Throw the ball", "row"))
        self.assertFalse(hit("He dipped low", "dip"))
        self.assertFalse(hit("Pressure builds", "press"))
        self.assertFalse(hit("Bench-pressed", "press"))
        self.assertFalse(hit("squatted", "squat"))
        self.assertFalse(hit("Grow strong", "row"))

    def test_real_phrases_survive_punctuation_and_case(self):
        self.assertTrue(hit("Start in a PUSH-UP position", "push-up"))
        self.assertTrue(hit("push up", "push-up"))
        self.assertTrue(hit("Pull‑Up bar", "pull-up"))              # non-breaking hyphen
        self.assertTrue(hit("a Wide–Stance setup", "wide-stance"))  # en dash
        self.assertTrue(hit("Step inside the Trap Bar.", "trap bar"))
        self.assertTrue(hit("trap  bar,", "trap bar"))
        self.assertTrue(hit("Dip belt (extra weight)", "extra weight"))
        self.assertTrue(hit("Inverted V shape", "inverted v"))

    def test_plural_only_on_last_word(self):
        self.assertTrue(hit("do 10 pull-ups", "pull-up"))
        self.assertTrue(hit("two rows", "row"))
        self.assertTrue(hit("many dips", "dip"))
        self.assertFalse(hit("traps bar", "trap bar"))
        self.assertFalse(hit("rowing", "row"))

    def test_underscore_is_separator_digits_are_word_chars(self):
        self.assertTrue(hit("my_row_machine", "row"))
        self.assertFalse(hit("row2", "row"))

    def test_code_point_safe(self):
        self.assertTrue(hit("ＲＯＷ now", "row"))            # fullwidth ROW (NFKC)
        self.assertTrue(hit("Zürich Sprint", "zürich"))
        self.assertTrue(hit("Zürich Sprint", "ZÜRICH"))
        self.assertFalse(hit("Zürichs", "zür"))
        self.assertTrue(hit("\U0001F3CB lift", "lift"))                  # astral neighbour
        self.assertTrue(hit("été run", "été"))      # decomposed vs composed
        self.assertFalse(hit("anything", ""))
        self.assertFalse(hit("anything", "---"))

    def test_phrase_does_not_span_separate_fields(self):
        fields = [P.tokens(t) for t in ("Dip", "belt")]
        self.assertFalse(any(P.mentions(f, "dip belt") for f in fields))

    def test_known_rule_terms_match_themselves(self):
        for cid, (_, words, _, _) in P.RULES.items():
            for w in words:
                self.assertTrue(P.tokens(w), (cid, w))
                self.assertTrue(P.mentions(P.tokens("x " + w + " y"), w), (cid, w))

    def test_report_wording_is_mention_only(self):
        supplier = {"slug": "s", "name": "Push-Up Row", "shortDescription": "",
                    "instructions": ["Do a push-up."], "equipment": ["Dumbbells"],
                    "primaryMuscles": ["Chest"], "movementPattern": []}
        sha = P.src_sha(supplier)
        saved = dict(P.RULES)
        try:
            P.RULES.clear()
            P.RULES["TK-000900"] = ("s", ["push-up", "row"], [], "MULTIPHASE_MOVEMENT")
            owner = {"routes": [{"catalog_id": "TK-000900", "provider_id": "s",
                                 "supplier_record_sha256": sha, "owner_choice": "meta",
                                 "owner_note": ""}]
                     + [{"catalog_id": f"X{i}", "provider_id": f"o{i}", "owner_choice": "apart"}
                        for i in range(25)]}
            ledger = {"entries": [{"catalog_id": "TK-000900", "provider_id": "s",
                                   "supplier_record_sha256": sha}]
                      + [{"catalog_id": f"L{i}", "provider_id": f"l{i}"} for i in range(355)]}
            out = P.reconcile(owner, ledger, [supplier] + [{"slug": f"p{i}"} for i in range(581)])
        finally:
            P.RULES.clear()
            P.RULES.update(saved)
        item = out["corrections"][0]
        self.assertEqual(item["evidence_kind"], "SUPPLIER_TEXT_TERM_MENTION_ONLY")
        self.assertIn("does NOT prove", item["evidence_note"])
        self.assertEqual(out["evidence_matching"], "unicode_whole_word_mention_only")
        self.assertEqual(item["supplier_equipment_unchanged"], ["Dumbbells"])
        self.assertFalse(item["safe_for_automatic_import"])


if __name__ == "__main__":
    unittest.main()
