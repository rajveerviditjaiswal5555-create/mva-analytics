"""Unit tests for the pure-Python forecasting module (no server required)."""
from __future__ import annotations

import unittest

from backend.services.forecasting import (
    classify_growth, forecast, scenario_series, what_if,
)


class ForecastTests(unittest.TestCase):
    def test_increasing_series(self):
        years = [2022, 2023, 2024, 2025, 2026]
        counts = [2900, 3050, 3250, 3480, 3800]
        result = forecast(years, counts, 10)
        self.assertTrue(result["available"])
        self.assertEqual(len([p for p in result["points"] if p["is_forecast"]]), 10)
        self.assertGreater(result["next_year_predicted"], counts[-1])
        self.assertIsNotNone(result["validation"]["mae"])
        self.assertIsNotNone(result["validation"]["rmse"])
        self.assertTrue(result["disclaimer"].startswith("ESTIMATE"))

    def test_forecast_confidence_interval_ordering(self):
        result = forecast([2022, 2023, 2024, 2025, 2026], [100, 110, 121, 133, 146], 5)
        for point in result["points"]:
            if point["is_forecast"]:
                self.assertLessEqual(point["lower"], point["predicted"])
                self.assertLessEqual(point["predicted"], point["upper"])

    def test_decreasing_series(self):
        result = forecast([2022, 2023, 2024, 2025, 2026], [5000, 4700, 4400, 4100, 3800], 3)
        self.assertLess(result["next_year_predicted"], 3800)
        self.assertIn("downward", result["explanation"])

    def test_insufficient_history(self):
        result = forecast([2026], [100], 5)
        self.assertFalse(result["available"])

    def test_what_if_compounding(self):
        result = what_if(1000, 10, 3)
        self.assertEqual(result["points"][0]["students"], 1000)
        self.assertAlmostEqual(result["points"][1]["students"], 1100)
        self.assertAlmostEqual(result["points"][3]["students"], 1331, delta=0.1)

    def test_scenarios(self):
        scenarios = scenario_series(1000, 2)
        self.assertEqual(len(scenarios), 4)
        self.assertLess(scenarios["Declining (-10%)"][2]["students"], 1000)
        self.assertGreater(scenarios["Optimistic (+20%)"][2]["students"], 1000)

    def test_classify_growth(self):
        self.assertEqual(classify_growth(100, 120), "growing")
        self.assertEqual(classify_growth(100, 80), "declining")
        self.assertEqual(classify_growth(100, 102), "stable")


if __name__ == "__main__":
    unittest.main()
