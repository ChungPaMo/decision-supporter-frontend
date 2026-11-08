// 생산계획 관련 타입

export interface UploadedData {
  fileName: string;
  uploadDate: string;
  rawData: any[][];
  headers: string[];
}

export interface FieldMapping {
  originalField: string;
  standardField: string;
  status: 'confirmed' | 'pending' | 'error';
  selectedUnit?: string;
}

export interface ValidationIssue {
  type: 'duplicate' | 'date_format' | 'missing_required' | 'unit_mismatch';
  message: string;
  rowIndex?: number;
  fieldName?: string;
}

export interface PlanCondition {
  expectedDemand: number;
  currentStock: number;
  safetyStock: number;
  regularCapacity: number;
}

export interface ProductionPlan {
  planType: 'standard' | 'stable' | 'cost_reduction';
  title: string;
  description: string;
  productionQty: number;
  regularProduction: number;
  overtimeProduction: number;
  outsourcing: number;
  additionalMaterials: number;
  expectedCost: number;
  endingStock: number;
  constraintViolations: number;
}

export interface PredictionData {
  nextWeekDemand: number;
  predictedValue: number;
  minValue: number;
  maxValue: number;
  confidenceInterval: number;
  improvementRate: number;
  predictionModel: string;
  trainingPeriod: string;
  sourceFile: string;
  referenceSheet: string;
  appliedRules: string[];
  externalData: string;
  dataSource: string;
  dataDate: string;
}

export interface ExecutionIssue {
  code: string;
  title: string;
  description: string;
  requiredValue: number;
  availableValue: number;
  shortage: number;
  solutions: Solution[];
}

export interface Solution {
  id: string;
  title: string;
  description: string;
}

export interface ApprovalRecord {
  date: string;
  planType: string;
  approver: string;
  fileName: string;
}

export interface AppState {
  // 업로드 데이터
  uploadedData: UploadedData | null;
  fieldMappings: FieldMapping[];
  validationIssues: ValidationIssue[];

  // 생산계획
  planCondition: PlanCondition;
  plans: ProductionPlan[];
  selectedPlanType: 'standard' | 'stable' | 'cost_reduction' | null;

  // 예측 데이터
  predictionData: PredictionData | null;

  // 진단 정보
  executionIssues: ExecutionIssue[];
  selectedSolutions: Set<string>;

  // 승인
  approvalRecords: ApprovalRecord[];
  currentStep: 'upload' | 'planning' | 'prediction' | 'diagnosis' | 'approval';
}
