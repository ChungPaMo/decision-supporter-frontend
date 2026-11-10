import { ReactNode } from 'react';
import { Step, useProductionStore } from '../store/productionStore';

const STEPS: Array<{ id: Step; label: string }> = [
  { id: 'data', label: '데이터 등록·승인' },
  { id: 'forecast', label: '수요 예측 확인' },
  { id: 'plans', label: '생산계획 비교 (예시)' },
  { id: 'diagnosis', label: '실행 가능성 진단 (예시)' },
  { id: 'approval', label: '승인 및 Excel 출력 (예시)' },
];

export default function MainLayout({ children }: { children: ReactNode }) {
  const { step, setStep, selectedPlanId } = useProductionStore();
  const stepIndex = STEPS.findIndex((item) => item.id === step);

  const isOpen = (id: Step) => {
    if (id === 'data' || id === 'forecast' || id === 'plans') return true;
    return selectedPlanId !== null;
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>생산계획 의사결정 시스템</h1>
          <p>데이터 등록·승인·수요 예측은 실제 서버 저장 · 계획·진단은 별도 예시 · 출력물은 DEMO/UNVERIFIED</p>
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
        <main className={`app-main app-main-${step}`}>
          {['plans', 'diagnosis', 'approval'].includes(step) && <div className="notice notice-warn">계획·진단·계획 승인은 별도 예시이며 실제 예측 결과와 연결되지 않았습니다.</div>}
          {children}
        </main>
      </div>
    </div>
  );
}
