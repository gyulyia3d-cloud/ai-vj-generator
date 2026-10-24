#!/usr/bin/env python3
"""Tests for the optical flow in analyze_video.py. Run: python test_analyze_video.py

Scenes with a known answer: a smooth random texture is panned, zoomed and rotated by a known amount,
and the measured flow must give it back. The numpy backend always runs; the OpenCV one runs when cv2 imports."""
import os
import sys
import unittest

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import analyze_video as AV  # noqa: E402

W, H, FPS = 96, 54, 8


def texture(seed=3, size=(180, 240)):
    rng = np.random.default_rng(seed)
    t = rng.random(size).astype(np.float32)
    for _ in range(3):
        t = AV._box(t, 2)
    t -= t.min()
    return t / t.max()


TEX = texture()
YY, XX = np.mgrid[0:H, 0:W].astype(np.float32)
CX, CY = (W - 1) / 2, (H - 1) / 2
BACKENDS = ["numpy"] + (["opencv"] if AV.flow_backend("auto")[0] == "opencv" else [])


def frames(fn, n=6):
    """fn(k) -> (x, y): the texture coordinates that pixel (XX, YY) shows at step k."""
    return np.stack([AV._sample(TEX, x + 60, y + 60) for x, y in (fn(k) for k in range(n))])


class Flow(unittest.TestCase):
    def on_each(self, g, check, cuts=()):
        for b in BACKENDS:
            with self.subTest(backend=b):
                check(AV.flow_motion(g, FPS, cuts, b))

    def test_pan_right(self):
        g = frames(lambda k: (XX - 2 * k, YY))  # content moves right 2 px per step

        def check(r):
            self.assertIn("moves right", r["dominant_motion"])
            self.assertAlmostEqual(r["pan_widths_per_s"]["x"], 2 * FPS / W, delta=0.04)
            self.assertAlmostEqual(r["pan_widths_per_s"]["y"], 0.0, delta=0.03)
            self.assertGreater(r["coherence"], 0.8)
        self.on_each(g, check)

    def test_pan_down(self):
        g = frames(lambda k: (XX, YY - 2 * k))

        def check(r):
            self.assertIn("moves down", r["dominant_motion"])
            self.assertGreater(r["pan_widths_per_s"]["y"], 0.1)
        self.on_each(g, check)

    def test_zoom_in(self):
        s = 0.03  # +3 % scale per step
        g = frames(lambda k: (CX + (XX - CX) / (1 + s * k), CY + (YY - CY) / (1 + s * k)), n=5)

        def check(r):
            self.assertIn("zoom in", r["dominant_motion"])
            self.assertAlmostEqual(r["zoom_per_s"], s * FPS, delta=0.15)   # sub-pixel flow on a smooth texture: right sign and order, not exact
            self.assertLess(r["coherence"], 0.5)                          # radial motion cancels out in the mean
        self.on_each(g, check)

    def test_zoom_out_has_opposite_sign(self):
        s = 0.03
        g = frames(lambda k: (CX + (XX - CX) * (1 + s * k), CY + (YY - CY) * (1 + s * k)), n=5)

        def check(r):
            self.assertIn("zoom out", r["dominant_motion"])
            self.assertLess(r["zoom_per_s"], 0)
        self.on_each(g, check)

    def test_rotation_clockwise(self):
        a = np.radians(2.0)  # per step, clockwise on screen (y down)

        def fn(k):
            c, s = np.cos(-a * k), np.sin(-a * k)
            return CX + c * (XX - CX) - s * (YY - CY), CY + s * (XX - CX) + c * (YY - CY)
        g = frames(fn, n=5)

        def check(r):
            self.assertIn("rotation clockwise", r["dominant_motion"])
            self.assertAlmostEqual(r["rotation_deg_per_s"], 2.0 * FPS, delta=6.0)
        self.on_each(g, check)

    def test_zoom_about_a_corner_names_both_effects(self):
        s = 0.03  # zoom anchored at the top-left corner: the centre of the frame drifts, so it is a pan and a zoom at once
        g = frames(lambda k: (XX / (1 + s * k), YY / (1 + s * k)), n=5)

        def check(r):
            self.assertIn("zoom in", r["dominant_motion"])
            self.assertIn("pan", r["dominant_motion"])
        self.on_each(g, check)

    def test_static(self):
        g = frames(lambda k: (XX, YY))

        def check(r):
            self.assertTrue(r["dominant_motion"].startswith("static"))
            self.assertEqual(r["moving_share"], 0.0)
        self.on_each(g, check)

    def test_local_motion_is_not_called_a_pan(self):
        # only the right half moves (down); the left half is still
        g = frames(lambda k: (XX, np.where(XX > W / 2, YY - 2 * k, YY)))

        def check(r):
            self.assertTrue(r["dominant_motion"].startswith("local"))   # local_share is not asserted: it differs by backend (numpy noisier)
            self.assertLess(r["moving_share"], 0.7)
        self.on_each(g, check)

    def test_cuts_are_skipped(self):
        # two shots that both pan right; the pair across the cut (an unrelated picture) would read as garbage
        g = np.concatenate([frames(lambda k: (XX - 2 * k, YY), 3), 1 - frames(lambda k: (XX - 2 * k + 20, YY + 20), 3)])

        def check(r):
            self.assertEqual(r["pairs_skipped_at_cuts"], 1)
            self.assertIn("moves right", r["dominant_motion"])
        self.on_each(g, check, cuts=[2.5 / FPS])

    def test_explicit_opencv_without_cv2_is_an_error_not_a_silent_switch(self):
        if AV.flow_backend("auto")[0] == "opencv":
            self.skipTest("cv2 is installed")
        with self.assertRaises(SystemExit):
            AV.flow_backend("opencv")

    def test_too_few_samples(self):
        self.assertIn("note", AV.flow_motion(frames(lambda k: (XX, YY), 1), FPS, (), "numpy"))


if __name__ == "__main__":
    unittest.main(verbosity=1)
