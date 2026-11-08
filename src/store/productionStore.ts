import { create } from 'zustand';
import { AppState, PlanCondition, ProductionPlan, PredictionData, ExecutionIssue, ApprovalRecord } from '../types/production';

// 예시 데이터
const mockPlans: ProductionPlan[] = [
  {
    planType: 'standard',
    title: '기준형',
    description: '기본 생산계획',
    productionQty: 900,
    regularProduction: 800,
    overtimeProduction: 0,
    outsourcing: 100,
    additionalMaterials: 300,
    expectedCost: 4500000,
    endingStock: 200,
    constraintViolations: 0,
  },
  {
    planType: 'stable',
    title: '안정형',
    description: '결품 위험 최소화',
    productionQty: 950,
    regularProduction: 750,
    overtimeProduction: 100,
    outsourcing: 100,
    additionalMaterials: 350,
    expectedCost: 5200000,
    endingStock: 250,
    constraintViolations: 0,
  },
  {
    planType: 'cost_reduction',
    title: '비용절감형',
    description: '운영비 최소화',
    productionQty: 850,
    regularProduction: 800,
    overtimeProduction: 0,
    outsourcing: 50,
    additionalMaterials: 250,
    expectedCost: 3800000,
    endingStock: 150,
    constraintViolations: 1,
  },
];

const mockPredictionData: PredictionData = {
  nextWeekDemand: 1000,
  predictedValue: 1000,
  minValue: 900,
  maxValue: 1100,
  confidenceInterval: 95,
  improvementRate: 12.5,
  predictionModel: 'ARIMA + ML Ensemble',
  trainingPeriod: '2022-01 ~ 2024-11',
  sourceFile: '월별_수요_2024.xlsx',
  referenceSheet: 'Sheet1',
  appliedRules: ['R1', 'R2', 'R3', 'R5'],
  externalData: '원자재 시세',
  dataSource: 'KITA',
  dataDate: '2024-11-08',
};

const mockExecutionIssues: ExecutionIssue[] = [
  {
    code: 'R1',
    title: '생산능력 초과',
    description: '필요한 생산량이 정규 생산능력을 초과합니다.',
    requiredValue: 900,
    availableValue: 800,
    shortage: 100,
    solutions: [
      { id: 's1', title: '외주 생산 추가', description: '외부 협력사를 통한 추가 생산' },
      { id: 's2', title: '특근 추가', description: '근무 시간 연장을 통한 생산량 증가' },
    ],
  },
  {
    code: 'R2',
    title: '자재 부족',
    description: '필요한 원자재가 현재 확보 가능한 수량을 초과합니다.',
    requiredValue: 300,
    availableValue: 200,
    shortage: 100,
    solutions: [
      { id: 's3', title: '원자재 선구매', description: '필요 자재의 선제적 구입' },
      { id: 's4', title: '공급사 추가', description: '새로운 공급사 발굴' },
    ],
  },
];

interface ProductionStore extends AppState {
  // 액션들
  setUploadedData: (data: any) => void;
  setFieldMappings: (mappings: any[]) => void;
  setValidationIssues: (issues: any[]) => void;
  setPlanCondition: (condition: PlanCondition) => void;
  setSelectedPlan: (planType: string) => void;
  setPredictionData: (data: PredictionData) => void;
  setExecutionIssues: (issues: ExecutionIssue[]) => void;
  toggleSolution: (solutionId: string) => void;
  setCurrentStep: (step: string) => void;
  addApprovalRecord: (record: ApprovalRecord) => void;
  resetAll: () => void;
}

const initialState: AppState = {
  uploadedData: null,
  fieldMappings: [],
  validationIssues: [],
  planCondition: {
    expectedDemand: 1000,
    currentStock: 200,
    safetyStock: 100,
    regularCapacity: 800,
  },
  plans: mockPlans,
  selectedPlanType: null,
  predictionData: mockPredictionData,
  executionIssues: mockExecutionIssues,
  selectedSolutions: new Set(),
  approvalRecords: [],
  currentStep: 'upload',
};

export const useProductionStore = create<ProductionStore>((set) => ({
  ...initialState,

  setUploadedData: (data) => set({ uploadedData: data }),

  setFieldMappings: (mappings) => set({ fieldMappings: mappings }),

  setValidationIssues: (issues) => set({ validationIssues: issues }),

  setPlanCondition: (condition) => set({ planCondition: condition }),

  setSelectedPlan: (planType) => set({ selectedPlanType: planType as any }),

  setPredictionData: (data) => set({ predictionData: data }),

  setExecutionIssues: (issues) => set({ executionIssues: issues }),

  toggleSolution: (solutionId) =>
    set((state) => {
      const newSet = new Set(state.selectedSolutions);
      if (newSet.has(solutionId)) {
        newSet.delete(solutionId);
      } else {
        newSet.add(solutionId);
      }
      return { selectedSolutions: newSet };
    }),

  setCurrentStep: (step) => set({ currentStep: step as any }),

  addApprovalRecord: (record) =>
    set((state) => ({
      approvalRecords: [record, ...state.approvalRecords],
    })),

  resetAll: () => set(initialState),
}));
