"""Extra unit tests for the additional forecasting candidates."""
from __future__ import annotations

import unittest

from backend.services.forecasting import (
    METHOD_LABELS,
    _fit,
    _holt_smooth,
    _predict,
    forecast,
)


class ExtraForecastTests(unittest.TestCase):
    def test_method_labels(self):
        self.assertEqual(METHOD_LABELS["linear"], "Linear regression (OLS)")
        self.assertEqual(METHOD_LABELS["exponential"], "Exponential trend (log-linear)")
        self.assertEqual(METHOD_LABELS["moving_average"], "Moving average (3-year)")
        self.assertEqual(METHOD_LABELS["holt"], "Holt's linear exponential smoothing")

    def test_model_comparison_has_all_four_candidates_sorted(self):
        result = forecast([2022, 2023, 2024, 2025, 2026], [2900, 3050, 3250, 3480, 3800], 10)
        self.assertTrue(result["available"])
        comparison = result["model_comparison"]
        self.assertEqual(len(comparison), 4)
        self.assertEqual(
            {row["method"] for row in comparison}, set(METHOD_LABELS.values())
        )
        maes = [row["mae"] for row in comparison]
        self.assertEqual(maes, sorted(maes))
        for row in comparison:
            self.assertIn("rmse", row)

    def test_moving_average_is_constant_last_three_average(self):
        years = [2022, 2023, 2024, 2025, 2026]
        values = [2900, 3050, 3250, 3480, 3800]
        slope, intercept, fitted = _fit(years, values, "moving_average")
        self.assertEqual(slope, 0.0)
        self.assertAlmostEqual(intercept, sum(values[-3:]) / 3)
        self.assertEqual(fitted, [intercept] * len(values))
        self.assertAlmostEqual(_predict("moving_average", slope, intercept, 99), intercept)

    def test_holt_fit_is_rebased_to_first_year(self):
        years = [2022, 2023, 2024, 2025, 2026]
        values = [100.0, 120.0, 140.0, 160.0, 180.0]
        slope, intercept, _ = _fit(years, values, "holt")
        # Perfectly linear data: final level 180, trend 20 -> level at year 0 is 100.
        self.assertAlmostEqual(slope, 20.0)
        self.assertAlmostEqual(intercept, 100.0)
        self.assertAlmostEqual(_predict("holt", slope, intercept, 4), 180.0)
        self.assertAlmostEqual(_predict("holt", slope, intercept, 5), 200.0)

    def test_holt_grid_search_minimises_sse(self):
        values = [100.0, 118.0, 145.0, 170.0, 199.0]
        results = [
            _holt_smooth(values, alpha, beta)[2]
            for alpha in (0.2, 0.4, 0.6, 0.8)
            for beta in (0.1, 0.3, 0.5)
        ]
        self.assertEqual(len(results), 12)
        slope, intercept, _ = _fit([2022, 2023, 2024, 2025, 2026], values, "holt")
        self.assertGreater(slope, 0)
        self.assertAlmostEqual(
            _predict("holt", slope, intercept, 5),
            _predict("holt", slope, intercept, 4) + slope,
        )

    def test_decreasing_series_explanation_and_intervals(self):
        result = forecast([2022, 2023, 2024, 2025, 2026], [5000, 4700, 4400, 4100, 3800], 5)
        self.assertIn("downward", result["explanation"])
        for point in result["points"]:
            if point["is_forecast"]:
                self.assertGreaterEqual(point["lower"], 0)
                self.assertLessEqual(point["lower"], point["predicted"])
                self.assertLessEqual(point["predicted"], point["upper"])


if __name__ == "__main__":
    unittest.main()
