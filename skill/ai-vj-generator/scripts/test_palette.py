#!/usr/bin/env python3
"""Tests for palette.py. Run: python test_palette.py"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import palette as pl  # noqa: E402


def run(*argv):
    a = pl.build_parser().parse_args(list(argv))
    return pl.COMMANDS[a.cmd](a)


class Maths(unittest.TestCase):
    def test_white_and_black(self):
        L, C, _ = pl.hex_to_oklch("#FFFFFF")
        self.assertAlmostEqual(L, 1.0, places=2)
        self.assertLess(C, 0.01)
        self.assertAlmostEqual(pl.hex_to_oklch("#000000")[0], 0.0, places=3)

    def test_contrast_black_white_is_21(self):
        self.assertAlmostEqual(pl.contrast("#000000", "#FFFFFF"), 21.0, places=1)

    def test_round_trip_through_oklab(self):
        for hx in ("#FF5A1F", "#1F3BFF", "#7B8794", "#E9E4D8"):
            r, g, b = (pl.srgb_to_lin(c) for c in pl.hex_to_rgb(hx))
            back = pl.oklab_to_lin(*pl.lin_to_oklab(r, g, b))
            for x, y in zip((r, g, b), back):
                self.assertAlmostEqual(x, y, places=5)

    def test_known_oklab_values(self):
        # reference: pure sRGB red is L 0.628, C 0.2577, h 29.2 in OKLCH
        L, C, h = pl.hex_to_oklch("#FF0000")
        self.assertAlmostEqual(L, 0.628, places=2)
        self.assertAlmostEqual(C, 0.2577, places=2)
        self.assertAlmostEqual(h, 29.2, delta=0.6)

    def test_gamut_mapping_keeps_lightness_and_valid_hex(self):
        hx, C = pl.oklch_to_hex(0.9, 0.35, 200)          # far outside sRGB
        self.assertRegex(hx, r"^#[0-9A-F]{6}$")
        self.assertLess(C, 0.35)
        self.assertAlmostEqual(pl.hex_to_oklch(hx)[0], 0.9, delta=0.02)


class Cli(unittest.TestCase):
    def test_json_flag_after_the_subcommand(self):
        pl.build_parser().parse_args(["scheme", "--hue", "10", "--scheme", "mono", "--json"])


class Commands(unittest.TestCase):
    def test_ramp_is_monotonic_in_lightness(self):
        r = run("ramp", "--hue", "265", "--chroma", "0.1", "--steps", "7")["ramp"]
        ls = [pl.hex_to_oklch(x["hex"])[0] for x in r]
        self.assertEqual(ls, sorted(ls))

    def test_scheme_has_roles_and_is_led_safe(self):
        d = run("scheme", "--hue", "40", "--scheme", "complement", "--surface", "led")
        for k in ("bg", "primary", "secondary", "accent", "field"):
            self.assertIn(k, d)
        self.assertGreaterEqual(d["checks"]["contrast"]["primary:bg"], 7.0)
        self.assertEqual(d["checks"]["warnings"], [])
        self.assertLessEqual(pl.hex_to_oklch(d["primary"]["hex"])[0], 0.95)

    def test_hue_is_required(self):
        with self.assertRaises(SystemExit):
            run("scheme", "--scheme", "triad")

    def test_check_flags_problems(self):
        d = run("check", "--bg", "#202020", "--primary", "#C0C0C0", "--secondary", "#B0B0B0", "--accent", "#999999", "--surface", "led")
        text = " ".join(d["warnings"])
        self.assertIn("bg lightness", text)
        self.assertIn("tiers merge", text)
        self.assertIn("accent chroma", text)

    def test_tetrad_gives_second_accent(self):
        self.assertIn("accent2", run("scheme", "--hue", "10", "--scheme", "tetrad"))


class BadInput(unittest.TestCase):
    def test_bad_hex_exits_cleanly(self):
        with self.assertRaises(SystemExit) as cm:
            run("convert", "#GGG")
        self.assertIn("bad colour", str(cm.exception))

    def test_short_hex_expands(self):
        self.assertEqual(pl.hex_to_rgb("#fff"), (1.0, 1.0, 1.0))

    def test_zero_chroma_and_negative_hue_are_fine(self):
        d = run("scheme", "--hue", "-30", "--scheme", "triad", "--chroma", "0")
        self.assertRegex(d["accent"]["hex"], r"^#[0-9A-F]{6}$")


if __name__ == "__main__":
    unittest.main(verbosity=2)
