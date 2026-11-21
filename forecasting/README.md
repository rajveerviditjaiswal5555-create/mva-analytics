# Forecasting Layer

Implementation: `backend/services/forecasting.py`

## Method selection

For each candidate model — ordinary least squares (linear) and log-linear (exponential/compound growth) — the module performs **rolling-origin validation**:

1. For k = 2 … n−1, fit the model on the first k years.
2. Predict year k+1 (which the model has never seen).
3. Compare prediction with the actual value.
4. Select the model with the lowest MAE across those held-out predictions.

## Outputs

- Annual actual + predicted points, with the forecast segment clearly flagged.
- Approximate 95% interval using residual standard deviation and leverage.
- MAE, RMSE and MAPE from the rolling back-test, with a year-by-year error table.
- Plain-language explanation of the chosen trend.
- 1/2/3/5/10-year horizon values.

## Scenario simulator

`what_if(current, growth_pct, horizon)` compounds `current × (1 + r)^n`. `scenario_series()` produces four standard scenarios: Declining (−10%), Conservative (+5%), Normal (+10%) and Optimistic (+20%). These are illustrative simulations, distinct from the statistically fitted forecast.

## Honesty rule

Every forecast response contains `disclaimer: "ESTIMATE ONLY — predictions are statistical projections, not guaranteed registration numbers."` The UI repeats this on the dashboard, forecast page, public site and PDF reports.
