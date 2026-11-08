import { ReactNode } from 'react';
import { allApproved, Step, useProductionStore } from '../store/productionStore';

const STEPS: Array<{ id: Step; label: string }> = [
  { id: 'data', label: '데이터 등록·승인' },
  { id: 'forecast', label: '수요 예측 확인' },
  { id: 'plans', label: '생산계획 비교' },
  { id: 'diagnosis', label: '실행 가능성 진단' },
  { id: 'approval', label: '승인 및 Excel 출력' },
];

export default function MainLayout({ children }: { children: ReactNode }) {
  const { step, setStep, batches, selectedPlanId } = useProductionStore();
  const stepIndex = STEPS.findIndex((item) => item.id === step);

  const isOpen = (id: Step) => {
    if (id === 'data') return true;
    if (id === 'forecast' || id === 'plans') return allApproved(batches);
    return allApproved(batches) && selectedPlanId !== null;
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>생산계획 의사결정 시스템</h1>
          <p>합성 예시 데이터 · 출력물은 DEMO/UNVERIFIED</p>
        </div>
        <div
          className="app-progress"
          role="progressbar"
          aria-label="진행 단계"
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={stepIndex + 1}
        >
          <span>
            {stepIndex + 1} / {STEPS.length} 단계
          </span>
          <div className="app-progress-track">
            <div style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }} />
          </div>
        </div>
      </header>

      <div className="app-body">
        <nav className="app-nav" aria-label="업무 단계">
          <ol>
            {STEPS.map((item, index) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={item.id === step ? 'active' : ''}
                  aria-current={item.id === step ? 'step' : undefined}
                  disabled={!isOpen(item.id)}
                  onClick={() => setStep(item.id)}
                >
                  <span className="step-number">{index + 1}</span>
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
        <main className={`app-main app-main-${step}`}>{children}</main>
      </div>
    </div>
  );
}
