// 공통 타입
export interface ApiError {
  detail: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

// 배치 관련
export type BatchStatus = 'MAPPING_HOLD' | 'HAS_ERRORS' | 'READY_FOR_APPROVAL' | 'APPROVED' | 'REJECTED';
export type Entity = 'product' | 'material' | 'bom' | 'inventory' | 'monthly_demand';

export interface BatchDetail {
  batch_id: string;
  entity: Entity;
  status: BatchStatus;
  version: number;
  file: {
    name: string;
    sha256: string;
    size_bytes: number;
    format: string;
  };
  result_digest: string;
  approval_blockers: Array<{ code: string; message: string }>;
  validation: ValidationResult;
  approved_by?: string;
  approved_at?: string;
  approved_record_count?: number;
  rejected_by?: string;
  rejected_at?: string;
  reject_reason?: string;
}

export interface ValidationResult {
  entity: Entity;
  status: BatchStatus;
  approval_required: boolean;
  auto_approve: boolean;
  master_data_checked: boolean;
  blocking_error_count: number;
  warning_count: number;
  sheets: ValidationSheet[];
}

export interface ValidationSheet {
  name: string;
  status: 'HOLD' | 'MAPPED' | 'ERROR';
  holds: ValidationHold[];
  issues: ValidationIssue[];
  records: any[];
  valid_records: number;
  issues_total: number;
  records_total: number;
}

export interface ValidationHold {
  code: string;
  message: string;
  field: string;
  candidates: string[];
}

export interface ValidationIssue {
  severity: 'ERROR' | 'WARNING';
  code: string;
  message: string;
  field: string;
  location: {
    sheet: string;
    row: number;
    col: number;
    cell_ref: string;
  };
  raw_value: string;
}

// 마스터 데이터
export interface Product {
  product_id: string;
  product_name: string;
  base_unit: string;
  product_type?: 'FINISHED' | 'SEMI_FINISHED';
  safety_stock_qty: string;
  batch_id: string;
}

export interface Material {
  material_id: string;
  material_name: string;
  base_unit: string;
  safety_stock_qty: string;
  batch_id: string;
}

export interface BOM {
  bom_id: string;
  product_id: string;
  bom_version: string;
  status: 'APPROVED' | 'DRAFT';
  is_active: boolean;
  valid_from: string;
  valid_to?: string;
  lines: BOMLine[];
}

export interface BOMLine {
  line_no: number;
  component_type: 'MATERIAL' | 'PRODUCT';
  component_id: string;
  qty_per: string;
  unit: string;
  scrap_rate: string;
}

export interface Inventory {
  item_type: 'PRODUCT' | 'MATERIAL';
  item_id: string;
  as_of_date: string;
  on_hand_qty: string;
  allocated_qty: string;
  available_qty: string;
  unit: string;
  batch_id: string;
}

export interface DemandRow {
  product_id: string;
  period: string;
  demand_qty: string;
  unit: string;
}
