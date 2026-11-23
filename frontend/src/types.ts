export interface NamedStat {
  name: string
  students: number
  percentage: number
  rank?: number
}

export interface YearPoint {
  year: number
  students: number
  change: number
  growth: number
  cumulative: number
}

export interface ForecastPoint {
  year: number
  actual: number | null
  predicted: number | null
  lower: number | null
  upper: number | null
  is_forecast: boolean
}

export interface Forecast {
  available: boolean
  method?: string
  method_key?: string
  explanation?: string
  disclaimer?: string
  growth_rate_pct?: number
  historical_cagr_pct?: number
  points: ForecastPoint[]
  next_year?: number
  next_year_predicted?: number | null
  forecast_3y?: number | null
  forecast_5y?: number | null
  forecast_10y?: number | null
  validation?: {
    mae: number | null
    rmse: number | null
    mape: number | null
    note: string
    details: Array<{ year: number; actual: number; forecast: number; error: number; error_pct: number | null }>
  }
  model_comparison?: Array<{ method: string; mae: number | null; rmse: number | null }>
}

export interface Overview {
  data_mode: string
  is_demo: boolean
  total_students: number
  total_registrations: number
  states_count: number
  countries_count: number
  cities_count: number
  districts_count: number
  current_year: number
  previous_year: number
  current_year_students: number
  previous_year_students: number
  yoy_growth: number
  five_year_growth: number
  trend: string
  yearly: YearPoint[]
  top_states: NamedStat[]
  top_cities: NamedStat[]
  top_countries: NamedStat[]
  all_states_count: number
  gender_distribution: NamedStat[]
  class_distribution: NamedStat[]
  status_distribution: NamedStat[]
  school_type_distribution: NamedStat[]
  source_distribution: NamedStat[]
  performance: {
    average_entrance_score: number
    average_percentage: number
    average_previous_percentage: number
    admission_rate: number
    scores_analyzed: number
  }
  forecast: Forecast
  active_filters: Record<string, string>
}

export interface StateInfo {
  state: string
  students: number
  percentage: number
  rank: number
  by_year: Record<string, number>
  growth: number
  yoy_growth: number | null
  trend: string
  top_city: string
  average_score: number
}

export interface CountryInfo {
  country: string
  students: number
  percentage: number
  rank: number
  by_year: Record<string, number>
  growth: number
  trend: string
}

export interface Insight {
  icon: string
  tone: string
  text: string
}

export interface QualityReport {
  score: number
  total_records: number
  records_with_issues: number
  status: string
  breakdown: Array<{ check: string; issues: number; status: string }>
}

export interface FilterOption {
  years: number[]
  states: string[]
  districts: string[]
  cities: string[]
  countries: string[]
  genders: string[]
  classes: string[]
  statuses: string[]
  school_types: string[]
}

export interface StudentRecord {
  id: number
  student_id: string
  application_id: string
  full_name: string
  gender: string
  date_of_birth: string | null
  class_applied: string
  year: number
  country: string
  state: string
  district: string
  city: string
  pincode: string | null
  school_type: string | null
  previous_school: string | null
  entrance_score: number | null
  percentage: number | null
  previous_academic_percentage: number | null
  admission_status: string
  registration_date: string | null
  source_referral: string | null
  is_synthetic: boolean
}

export interface AuthUser {
  id: number
  username: string
  full_name: string
  email: string
  role: string
  rank: number
}

export interface PerformanceReport {
  available: boolean
  summary: {
    average_entrance_score: number
    average_percentage: number
    average_previous_percentage: number
    median_entrance_score: number
    top_score: number
    scores_analyzed: number
    admission_rate: number
  }
  score_bands: NamedStat[]
  by_state: Array<{ state: string; students: number; average_score: number; average_percentage: number; admission_rate: number }>
  by_city: Array<{ city: string; students: number; average_score: number }>
  admission_funnel: NamedStat[]
  class_performance: Array<{ class_applied: string; students: number; average_score: number; average_percentage: number }>
  school_type_performance: Array<{ school_type: string; students: number; average_score: number }>
  source_performance: Array<{ source_referral: string; students: number; average_score: number }>
}

export interface CompareReport {
  year1: number
  year2: number
  total_year1: number
  total_year2: number
  overall_growth: number
  states: Array<{ state: string; year1: number; year2: number; change: number; growth: number; percentage_year1: number; percentage_year2: number }>
  cities: Array<{ city: string; year1: number; year2: number; change: number; growth: number; percentage_year1: number; percentage_year2: number }>
}

export type Page =
  | 'landing' | 'login' | 'dashboard' | 'geography' | 'years' | 'performance'
  | 'forecast' | 'simulator' | 'students' | 'admin' | 'quality'
