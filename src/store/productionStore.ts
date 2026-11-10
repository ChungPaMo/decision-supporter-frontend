import { create } from 'zustand';
import { BatchDetail, Entity } from '../types/api';
import { PlanApproval } from '../types/engine';
import { ScenarioId } from '../services/fixtures';

export type Step = 'data' | 'forecast' | 'plans' | 'diagnosis' | 'approval';

export const ENTITY_ORDER: Entity[] = ['product', 'material', 'bom', 'inventory', 'monthly_demand'];

interface ProductionState {
  step: Step;
  activeEntity: Entity;
  batches: Partial<Record<Entity, BatchDetail>>;
  approvedEntities: Partial<Record<Entity, boolean>>;
  synced: boolean;
  setWorkspace: (batches: Partial<Record<Entity, BatchDetail>>, approvedEntities: Partial<Record<Entity, boolean>>, synced: boolean) => void;
  setSynced: (synced: boolean) => void;
  scenario: ScenarioId;
  selectedPlanId: string | null;
  approvals: PlanApproval[];
  setStep: (step: Step) => void;
  setActiveEntity: (entity: Entity) => void;
  setBatch: (entity: Entity, batch: BatchDetail | undefined) => void;
  setScenario: (scenario: ScenarioId) => void;
  selectPlan: (planId: string) => void;
  addApproval: (approval: PlanApproval) => void;
}

export const useProductionStore = create<ProductionState>((set) => ({
  step: typeof window !== 'undefined' && window.location.hash === '#forecast' ? 'forecast' : 'data',
  activeEntity: 'product',
  batches: {},
  approvedEntities: {},
  synced: false,
  setWorkspace: (batches, approvedEntities, synced) => set({ batches, approvedEntities, synced }),
  setSynced: (synced) => set({ synced }),
  scenario: 'BASE',
  selectedPlanId: null,
  approvals: [],
  setStep: (step) => {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${step === 'forecast' ? '#forecast' : ''}`);
    set({ step });
  },
  setActiveEntity: (activeEntity) => set({ activeEntity }),
  setBatch: (entity, batch) => set((state) => ({ batches: { ...state.batches, [entity]: batch } })),
  setScenario: (scenario) => set({ scenario }),
  selectPlan: (selectedPlanId) => set({ selectedPlanId }),
  addApproval: (approval) => set((state) => ({ approvals: [approval, ...state.approvals] })),
}));

export const allApproved = (batches: Partial<Record<Entity, BatchDetail>>) =>
  ENTITY_ORDER.every((entity) => batches[entity]?.status === 'APPROVED');

export const mastersApproved = (batches: Partial<Record<Entity, BatchDetail>>) =>
  batches.product?.status === 'APPROVED' && batches.material?.status === 'APPROVED';
