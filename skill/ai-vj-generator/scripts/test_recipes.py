#!/usr/bin/env python3
"""Tests for recipes.py. Run: python test_recipes.py"""
import os
import re
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import recipes as rc  # noqa: E402

# the words the engine's code-layer lint rejects (validate_project.py CODE_LINT), kept in sync by this test
BAD = re.compile(r"\b(Math\s*\.\s*random|Date|performance|setTimeout|setInterval|requestAnimationFrame|window|document|globalThis|fetch|XMLHttpRequest|WebSocket|localStorage|"
                 r"sessionStorage|indexedDB|navigator|Worker|eval|Function|import|require|process|Reflect|Proxy|constructor|prototype|getPrototypeOf)\b|\b(self|parent|top|location|opener|frames)\s*[.\[]")


class Layers(unittest.TestCase):
    def test_every_recipe_builds_a_layer(self):
        for r in rc.load():
            L = rc.make_layer(r)
            self.assertIn(L["type"], ("code", "shader"))
            self.assertTrue(L["p"]["src"].strip())

    def test_select_variable_accepts_only_listed_options(self):
        r = rc.get("testcard")
        self.assertEqual(rc.make_layer(r, {"card": "grade"})["p"]["v_card"], "grade")
        with self.assertRaises(SystemExit):
            rc.make_layer(r, {"card": "nope"})

    def test_number_variable_rejects_text(self):
        with self.assertRaises(SystemExit):
            rc.make_layer(rc.get("clifford"), {"seeds": "abc"})

    def test_manifest_files_exist_and_ids_unique(self):
        ids = [r["id"] for r in rc.load()]
        self.assertEqual(len(ids), len(set(ids)))
        for r in rc.load():
            self.assertTrue((rc.ROOT / r["file"]).exists(), r["id"])

    def test_code_recipes_avoid_the_engine_lint_words(self):
        for r in rc.load():
            if r["kind"] == "code":
                m = BAD.search(rc.source(r))
                self.assertIsNone(m, f"{r['id']}: {m and m.group(0)}")

    def test_every_recipe_declares_the_fields_the_browser_needs(self):
        for r in rc.load():
            for k in ("id", "kind", "file", "title", "principle", "means", "tier", "loop", "cost"):
                self.assertIn(k, r, f"{r['id']} lacks {k}")


if __name__ == "__main__":
    unittest.main(verbosity=2)
