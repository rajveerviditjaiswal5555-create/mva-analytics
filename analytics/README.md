# Analytics Layer

All analysis lives in `backend/services/analytics.py` and is computed from `fetch_rows(db, filters)`.

## Metric definitions

| Metric | Definition |
|---|---|
| Students | Count of rows in the filtered dataset |
| registrations | Same as students (one registration per record) |
| State / country / city share | `count / total × 100`, rounded to one decimal |
| Year-over-year growth | `(current_year − previous_year) / previous_year × 100` |
| Five-year growth | `(last_year − first_year) / first_year × 100` |
| Rank | Position when sorted by count descending, ties by name |
| Trend | `increasing` / `decreasing` / `stable` based on average annual change (>0.2% of total) |
| Growth classification (states) | `growing` / `declining` / `stable` with a ±5% threshold |
| Admission rate | `Admitted / total × 100` |

## Data quality

`data_quality()` checks missing required fields, incorrect types, score bounds (0–500), percentage bounds (0–100), invalid/impossible dates, missing pincodes and missing previous percentages, plus duplicate student and application IDs. The score is `100 × clean_records / total_records`.

## Insights

`insights()` generates sentences only from computed values: YoY change, leading state, fastest-growing qualifying state (≥50 records), forecast direction, average performance and geographic breadth. When data is insufficient, no claim is made.
