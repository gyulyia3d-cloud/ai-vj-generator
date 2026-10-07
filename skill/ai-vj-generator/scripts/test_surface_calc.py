#!/usr/bin/env python3
"""Tests for surface_calc.py. Run: python test_surface_calc.py"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import surface_calc as sc  # noqa: E402


def run(*argv):
    a = sc.build_parser().parse_args(list(argv))
    return sc.COMMANDS[a.cmd](a)


class Cli(unittest.TestCase):
    def test_json_flag_after_the_subcommand(self):
        a = sc.build_parser().parse_args(["loop", "--bpm", "120", "--json"])
        self.assertTrue(a.json)


class Led(unittest.TestCase):
    def test_cabinets_to_pixel_map(self):
        d = run("led", "--pitch", "3.91", "--cols", "20", "--rows", "8")
        self.assertEqual(d["cabinet_px"], [128, 128])
        self.assertEqual(d["pixel_map"], [2560, 1024])
        self.assertEqual(d["total_pixels"], 2560 * 1024)
        self.assertEqual(d["aspect"], "5:2")
        self.assertEqual(d["ports_1gbe"], 5)
        self.assertTrue(d["fits_one_uhd_output"])

    def test_metres_round_to_cabinets(self):
        d = run("led", "--pitch", "3.91", "--width-m", "10", "--height-m", "4")
        self.assertEqual(d["cabinets"], [20, 8])
        self.assertEqual(d["size_m"], [10.0, 4.0])

    def test_datasheet_pixels_override_nominal_pitch(self):
        d = run("led", "--pitch", "3.9", "--cab-px-w", "128", "--cols", "2", "--rows", "1")
        self.assertEqual(d["cabinet_px"], [128, 128])
        self.assertNotIn("nominal", " ".join(d["assumptions"]))

    def test_oversize_warns(self):
        d = run("led", "--pitch", "2.6", "--cols", "40", "--rows", "10")
        self.assertFalse(d["fits_one_uhd_output"])
        self.assertTrue(any("exceeds one 3840x2160" in w for w in d["warnings"]))

    def test_strip_warns(self):
        d = run("led", "--pitch", "3.91", "--cols", "40", "--rows", "4")
        self.assertTrue(any("ultra-wide" in w for w in d["warnings"]))


class Blend(unittest.TestCase):
    def test_two_projectors_matches_touchdesigner_chapter(self):
        d = run("blend", "--proj", "1920x1080", "--n", "2", "--overlap", "256")
        self.assertEqual(d["content_full_raster_px"], [3840, 1080])
        self.assertEqual(d["content_visible_px"], [3584, 1080])
        self.assertEqual(d["discard_each_outer_edge_px"], 128)
        self.assertEqual([c["start"] for c in d["crop_ranges_in_full_raster"]], [128, 1792])
        self.assertEqual(d["crop_ranges_in_full_raster"][1]["end"], 3712)

    def test_three_projectors(self):
        d = run("blend", "--n", "3", "--overlap", "200")
        self.assertEqual(d["content_visible_px"][0], 5360)
        self.assertEqual([c["start"] for c in d["crop_ranges_in_full_raster"]], [200, 1920, 3640])

    def test_vertical_axis(self):
        d = run("blend", "--n", "2", "--overlap", "108", "--axis", "y")
        self.assertEqual(d["content_visible_px"], [1920, 2052])

    def test_ramp_is_symmetric_and_monotonic(self):
        t = sc.ramp_table(256)
        self.assertEqual(t[0]["alpha_linear"], 0)
        self.assertEqual(t[-1]["alpha_linear"], 1)
        self.assertAlmostEqual(t[4]["alpha_linear"], 0.5)
        v = [r["alpha_gamma_corrected"] for r in t]
        self.assertEqual(v, sorted(v))
        for i in range(len(t)):
            self.assertAlmostEqual(t[i]["alpha_linear"] + t[-1 - i]["alpha_linear"], 1.0, places=3)


class Loop(unittest.TestCase):
    def test_exact_loop(self):
        d = run("loop", "--bpm", "128", "--bars", "4", "--fps", "30")
        self.assertEqual(d["seconds"], 7.5)
        self.assertEqual(d["frames_rounded"], 225)
        self.assertEqual(d["frame_error"], 0)
        self.assertEqual(d["warnings"], [])

    def test_schema_doc_example_132_bpm(self):
        d = run("loop", "--bpm", "132", "--bars", "4", "--fps", "30")
        self.assertEqual(d["frames_rounded"], 218)
        self.assertAlmostEqual(d["frame_error"], -0.182, places=2)
        self.assertTrue(d["warnings"])

    def test_options_list_only_integer_loops(self):
        d = run("loop", "--bpm", "120", "--bars", "4", "--fps", "30")
        self.assertTrue(d["integer_frame_options"])
        for o in d["integer_frame_options"]:
            self.assertAlmostEqual(60 / 120 * 4 * o["bars"] * o["fps"], o["frames"], places=6)

    def test_refresh_judder(self):
        ok = run("loop", "--bpm", "120", "--fps", "30", "--refresh", "60")
        self.assertFalse(ok["warnings"])
        bad = run("loop", "--bpm", "120", "--fps", "25", "--refresh", "60")
        self.assertTrue(bad["warnings"])


class Aspect(unittest.TestCase):
    def test_strip(self):
        d = run("aspect", "--w", "5120", "--h", "500")
        self.assertEqual(d["family"], "ultra-wide strip")
        self.assertAlmostEqual(d["unit_scale_k"], 500 / 1080, places=3)
        self.assertAlmostEqual(d["strip_modules"]["count"], 10.24)

    def test_portrait_and_standard(self):
        self.assertEqual(run("aspect", "--w", "1080", "--h", "1920")["ratio"], "9:16")
        self.assertEqual(run("aspect", "--w", "1920", "--h", "1080")["unit_scale_k"], 1.0)


class Legibility(unittest.TestCase):
    def test_p39_at_15m(self):
        d = run("legibility", "--pitch", "3.9", "--dist", "15")
        self.assertEqual(d["cap_height_min"]["px"], 20)
        self.assertEqual(d["cap_height_comfortable"]["px"], 40)
        self.assertEqual(d["line_weight_min_px"], 3)

    def test_pattern_period_cycles_per_degree(self):
        d = run("legibility", "--pitch", "3.9", "--dist", "15")
        self.assertEqual(d["pattern_period"]["best_read_px"], 17)      # 4 cpd at 15 m = 65 mm = ~17 px
        self.assertEqual(d["pattern_period"]["invisible_below_px"], 2)  # 30 cpd = 8.7 mm = ~2 px

    def test_too_close_warns(self):
        d = run("legibility", "--pitch", "10", "--dist", "5")
        self.assertTrue(d["warnings"])


class Pixelmap(unittest.TestCase):
    def test_universes(self):
        d = run("pixelmap", "--px", "2040", "--fps", "30")
        self.assertEqual(d["pixels_per_universe"], 170)
        self.assertEqual(d["universes"], 12)
        self.assertAlmostEqual(d["wire_mbps"], 12 * 530 * 8 * 30 / 1e6, places=2)

    def test_rgbw_uses_512_slots(self):
        d = run("pixelmap", "--px", "128", "--channels", "4")
        self.assertEqual(d["pixels_per_universe"], 128)
        self.assertEqual(d["universes"], 1)


class Projection(unittest.TestCase):
    def test_image_size_from_throw(self):
        d = run("projection", "--throw", "1.5", "--dist", "12", "--lumens", "12000", "--ambient", "20", "--reflectance", "0.3")
        self.assertEqual(d["image_size_m"], [8.0, 4.5])
        self.assertEqual(d["illuminance_lux"], round(12000 / 36))
        self.assertEqual(d["apparent_luminance_nits"], round(12000 / 36 * 0.3 / 3.141592653589793))
        self.assertIn("contrast_ratio_est", d)

    def test_tiling_count(self):
        d = run("projection", "--image-width", "8", "--surface", "20x6", "--overlap", "0.15")
        self.assertEqual(d["projectors"]["x"], 3)


class BadInput(unittest.TestCase):
    """Every zero or negative quantity must exit with a message, never a traceback."""

    def exits(self, *argv):
        with self.assertRaises(SystemExit) as cm:
            run(*argv)
        self.assertIn("must be", str(cm.exception))

    def test_zero_pitch(self):
        self.exits("led", "--pitch", "0", "--cols", "2", "--rows", "2")

    def test_zero_cols(self):
        self.exits("led", "--pitch", "3.9", "--cols", "0", "--rows", "2")

    def test_zero_bpm(self):
        self.exits("loop", "--bpm", "0")

    def test_zero_width(self):
        self.exits("aspect", "--w", "0", "--h", "100")

    def test_zero_distance(self):
        self.exits("legibility", "--pitch", "3.9", "--dist", "0")

    def test_zero_pixels(self):
        self.exits("pixelmap", "--px", "0")

    def test_bars_outside_engine_set_warns(self):
        d = run("loop", "--bpm", "128", "--bars", "3")
        self.assertTrue(any("not one of" in w for w in d["warnings"]))

    def test_single_projector_warns(self):
        d = run("blend", "--n", "1", "--overlap", "100")
        self.assertTrue(any("single projector" in w for w in d["warnings"]))


if __name__ == "__main__":
    unittest.main(verbosity=2)
