// docs/engine_forecast_plan_contract.md, docs/api_contract_exports.md 기준.
// 수량은 정밀도 보존을 위해 전부 문자열이며 화면에서 계산하지 않는다.

export interface ForecastRow {
  product_id: string;
  target_month: string;
  horizon: number;
  p50: string;
  p80: string;
  p90: string;
}

export interface ForecastResponse {
  status: 'OK' | 'PARTIAL' | 'DATA_INSUFFICIENT' | 'INPUT_INVALID';
  run: {
    run_id: string;
    engine: string;
    p50_method: string;
    quantile_model_version: string;
    trained_until: string;
    horizon_months: number;
    data_classification: string | null;
    input_digest: string;
    random_seed: number;
    generated_at: string;
  } | null;
  forecasts: ForecastRow[];
  skipped: Array<{ product_id: string; reason_code: string; detail: string; observed_months: number | null }>;
  adjustments: Array<{ product_id: string; target_month: string; code: string }>;
  warnings: Array<{ code: string; detail: string }>;
  errors: Array<{ code: string; detail: string; loc?: string | null }>;
}

export interface ForecastRunParameters {
  trained_until: string;
  horizon_months: number;
  p50_method: 'MA12' | 'LGBM_L1';
  min_history_months?: number;
  random_seed?: number;
}

export interface ForecastExecutionSummary {
  execution_id: string;
  status: ForecastResponse['status'] | 'FAILED';
  input_digest: string;
  dedup_key: string;
  parameters: ForecastRunParameters;
  runtime_identity: Record<string, unknown>;
  quantile_model_version: string | null;
  input_row_count: number;
  forecast_count: number;
  created_at: string;
  finished_at: string;
}

export interface ForecastExecution extends ForecastExecutionSummary {
  result: ForecastResponse | null;
  failure: { code: string; message: string } | null;
  input_batches: Array<{ batch_id: string; batch_version: number; source_sha256: string; result_digest: string | null; approved_at: string }>;
}

export interface ForecastRunReply {
  execution: ForecastExecution;
  reused: boolean;
}

export type Feasibility = 'FEASIBLE' | 'INFEASIBLE' | 'UNVERIFIED';
export type PlanType = 'BASELINE' | 'STABLE' | 'COST_SAVING';

export interface Kpi {
  code: string;
  label: string;
  value: string | null;
  unit: string;
}

export interface Constraint {
  constraint_id: string;
  label: string;
  dimension: string;
  strength: 'HARD' | 'SOFT';
  status: 'SATISFIED' | 'VIOLATED' | 'UNVERIFIED';
  period: string;
  limit_value: string | null;
  used_value: string | null;
  unit: string;
  note: string | null;
}

export interface PlanResult {
  plan_id: string;
  plan_type: PlanType;
  feasibility: Feasibility;
  kpis: Kpi[];
  production: Array<{
    product_id: string;
    product_name: string;
    period: string;
    planned_qty: string | null;
    unit: string;
    demand_qty: string | null;
    ending_inventory_qty: string | null;
  }>;
  materials: Array<{
    material_id: string;
    material_name: string;
    period: string;
    required_qty: string | null;
    available_qty: string | null;
    shortage_qty: string | null;
    unit: string;
  }>;
  constraints: Constraint[];
  assumptions: string[];
}

export interface PlanExport {
  title: string;
  export_name: string;
  horizon: { period_from: string; period_to: string };
  plans: PlanResult[];
  [key: string]: unknown;
}

export interface PlanResponse {
  status: 'OK' | 'INPUT_INVALID' | 'DATA_INSUFFICIENT';
  input_digest: string;
  scenario: { scenario_id: string; label: string };
  warnings: Array<{ code: string; detail: string }>;
  comparison: {
    comparable_plan_ids: string[];
    ranking: null;
    infeasibility_reasons: Array<{
      plan_id: string;
      feasibility: Feasibility;
      causes: Array<{ constraint_id: string; status: string; note: string }>;
    }>;
  };
  export: PlanExport;
}

export interface PlanApproval {
  at: string;
  planLabel: string;
  scenarioLabel: string;
  actor: string;
  inputDigest: string;
}
