import React, { useState } from 'react';
import { useProductionStore } from '../store/productionStore';
import '../styles/screens.css';

interface Props {
  onNext: () => void;
}

export default function DiagnosisScreen({ onNext }: Props) {
  const { selectedPlanType, plans, executionIssues, selectedSolutions, toggleSolution } = useProductionStore();
  const [hasRecalculated, setHasRecalculated] = useState(false);

  const selectedPlan = plans.find((p) => p.planType === selectedPlanType);
  const isExecutable = selectedPlan && selectedPlan.constraintViolations === 0 && !hasRecalculated;

  const handleRecalculate = () => {
    setHasRecalculated(true);
  };

  return (
    <div className="screen screen-diagnosis">
      <div className="screen-title">
        <h2>실행 불가 원인 진단</h2>
        <p className="screen-description">생산계획이 실행 불가능한 이유와 해결 방법을 확인합니다.</p>
      </div>

      {/* 선택한 계획안 상태 */}
      <div className="diagnosis-header">
        <div className="plan-status">
          <span className="label">선택한 계획안:</span>
          <span className="value">{selectedPlan?.title}</span>
        </div>
        <div className={`execution-status ${selectedPlan?.constraintViolations === 0 ? 'executable' : 'not-executable'}`}>
          {selectedPlan?.constraintViolations === 0 ? (
            <>✓ 실행 가능</>
          ) : (
            <>⚠️ 실행 불가능 ({selectedPlan?.constraintViolations}건)</>
          )}
        </div>
      </div>

      {/* 실행 불가능 경고 */}
      {selectedPlan && selectedPlan.constraintViolations > 0 && (
        <div className="warning-box">
          <div className="warning-title">🔴 실행 불가능한 제약조건</div>
          <div className="warning-content">
            현재 선택한 계획안은 {selectedPlan.constraintViolations}건의 제약조건 위반이 있습니다. 아래의 해결 방법을 선택하여 재계산할 수 있습니다.
          </div>
        </div>
      )}

      {/* 문제 및 해결책 */}
      <div className="issues-container">
        {executionIssues.map((issue) => (
          <div key={issue.code} className="issue-card">
            <div className="issue-header">
              <div className="issue-code">{issue.code}</div>
              <h3>{issue.title}</h3>
            </div>

            <div className="issue-problem">
              <h4>문제</h4>
              <p>{issue.description}</p>
              <div className="problem-details">
                <div className="detail-item">
                  <span className="detail-label">필요량</span>
                  <span className="detail-value">{issue.requiredValue.toLocaleString()}개</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">확보 가능량</span>
                  <span className="detail-value">{issue.availableValue.toLocaleString()}개</span>
                </div>
                <div className="detail-item shortage">
                  <span className="detail-label">부족량</span>
                  <span className="detail-value">{issue.shortage.toLocaleString()}개</span>
                </div>
              </div>
            </div>

            <div className="issue-solutions">
              <h4>해결 방법</h4>
              <div className="solutions-grid">
                {issue.solutions.map((solution) => (
                  <label key={solution.id} className="solution-item">
                    <input
                      type="checkbox"
                      checked={selectedSolutions.has(solution.id)}
                      onChange={() => toggleSolution(solution.id)}
                    />
                    <div className="solution-content">
                      <div className="solution-title">{solution.title}</div>
                      <div className="solution-description">{solution.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 재계산 결과 */}
      {hasRecalculated && (
        <div className="recalculation-result success">
          <div className="result-icon">✓</div>
          <div className="result-content">
            <h3>재계산 완료</h3>
            <p>선택한 해결 방법을 적용하여 계획을 재계산했습니다. 현재 계획안은 실행 가능합니다.</p>
          </div>
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="button-group">
        {selectedSolutions.size > 0 && !hasRecalculated && (
          <button className="btn btn-secondary" onClick={handleRecalculate}>
            🔄 재계산
          </button>
        )}
        <button className="btn btn-primary" onClick={onNext} disabled={selectedPlan?.constraintViolations === 0 ? false : !hasRecalculated}>
          다음 단계로 →
        </button>
      </div>
    </div>
  );
}
