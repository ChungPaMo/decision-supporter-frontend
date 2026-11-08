import React, { useState } from 'react';
import { useProductionStore } from '../store/productionStore';
import '../styles/screens.css';

interface Props {
  onNext: () => void;
  onAnalyze: (planType: string) => void;
}

export default function PlanComparisonScreen({ onNext, onAnalyze }: Props) {
  const { planCondition, plans, selectedPlanType, setSelectedPlan, setPlanCondition } = useProductionStore();
  const [showConditionModal, setShowConditionModal] = useState(false);
  const [tempCondition, setTempCondition] = useState(planCondition);

  const handleConditionChange = () => {
    setPlanCondition(tempCondition);
    setShowConditionModal(false);
  };

  return (
    <div className="screen screen-comparison">
      <div className="screen-title">
        <h2>생산계획 비교 및 승인</h2>
        <p className="screen-description">AI가 생성한 세 가지 생산계획을 비교하여 최적의 계획을 선택합니다.</p>
      </div>

      {/* 생산 조건 */}
      <div className="condition-card">
        <div className="condition-header">
          <h3>생산 조건</h3>
          <button className="btn-small" onClick={() => setShowConditionModal(true)}>
            조건 변경
          </button>
        </div>
        <div className="condition-grid">
          <div className="condition-item">
            <div className="label">예상 수요</div>
            <div className="value">{planCondition.expectedDemand.toLocaleString()}개</div>
          </div>
          <div className="condition-item">
            <div className="label">현재고</div>
            <div className="value">{planCondition.currentStock.toLocaleString()}개</div>
          </div>
          <div className="condition-item">
            <div className="label">안전재고</div>
            <div className="value">{planCondition.safetyStock.toLocaleString()}개</div>
          </div>
          <div className="condition-item">
            <div className="label">정규 CAPA</div>
            <div className="value">{planCondition.regularCapacity.toLocaleString()}개/월</div>
          </div>
        </div>
      </div>

      {/* 계획안 카드들 */}
      <div className="plans-container">
        {plans.map((plan) => (
          <div
            key={plan.planType}
            className={`plan-card ${selectedPlanType === plan.planType ? 'selected' : ''}`}
            onClick={() => setSelectedPlan(plan.planType)}
          >
            <div className="plan-header">
              <h3>{plan.title}</h3>
              <p className="plan-subtitle">{plan.description}</p>
            </div>

            <div className="plan-metrics">
              <div className="metric">
                <span className="metric-label">생산량</span>
                <span className="metric-value">{plan.productionQty.toLocaleString()}개</span>
              </div>
              <div className="metric">
                <span className="metric-label">정규 생산</span>
                <span className="metric-value">{plan.regularProduction.toLocaleString()}개</span>
              </div>
              <div className="metric">
                <span className="metric-label">특근</span>
                <span className="metric-value">{plan.overtimeProduction.toLocaleString()}개</span>
              </div>
              <div className="metric">
                <span className="metric-label">외주</span>
                <span className="metric-value">{plan.outsourcing.toLocaleString()}개</span>
              </div>
              <div className="metric">
                <span className="metric-label">추가 자재</span>
                <span className="metric-value">{plan.additionalMaterials.toLocaleString()}kg</span>
              </div>
              <div className="metric">
                <span className="metric-label">운영비</span>
                <span className="metric-value metric-cost">
                  ₩{(plan.expectedCost / 1000000).toFixed(1)}M
                </span>
              </div>
              <div className="metric">
                <span className="metric-label">기말재고</span>
                <span className="metric-value">{plan.endingStock.toLocaleString()}개</span>
              </div>
              <div className="metric">
                <span className="metric-label">제약 위반</span>
                <span className="metric-value metric-violation">{plan.constraintViolations}건</span>
              </div>
            </div>

            <button
              className="btn-analyze"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPlan(plan.planType);
                onAnalyze(plan.planType);
              }}
            >
              상세 분석 →
            </button>
          </div>
        ))}
      </div>

      {/* 액션 버튼 */}
      <div className="button-group">
        <button className="btn btn-secondary">📥 Excel 미리보기</button>
        <button className="btn btn-primary" onClick={onNext} disabled={!selectedPlanType}>
          선택 완료 →
        </button>
      </div>

      {/* 조건 변경 모달 */}
      {showConditionModal && (
        <div className="modal-overlay" onClick={() => setShowConditionModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>생산 조건 변경</h3>
            <div className="modal-form">
              <div className="form-group">
                <label>예상 수요 (개)</label>
                <input
                  type="number"
                  value={tempCondition.expectedDemand}
                  onChange={(e) => setTempCondition({ ...tempCondition, expectedDemand: parseInt(e.target.value) })}
                />
              </div>
              <div className="form-group">
                <label>현재고 (개)</label>
                <input
                  type="number"
                  value={tempCondition.currentStock}
                  onChange={(e) => setTempCondition({ ...tempCondition, currentStock: parseInt(e.target.value) })}
                />
              </div>
              <div className="form-group">
                <label>안전재고 (개)</label>
                <input
                  type="number"
                  value={tempCondition.safetyStock}
                  onChange={(e) => setTempCondition({ ...tempCondition, safetyStock: parseInt(e.target.value) })}
                />
              </div>
              <div className="form-group">
                <label>정규 CAPA (개/월)</label>
                <input
                  type="number"
                  value={tempCondition.regularCapacity}
                  onChange={(e) => setTempCondition({ ...tempCondition, regularCapacity: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div className="modal-buttons">
              <button className="btn btn-secondary" onClick={() => setShowConditionModal(false)}>
                취소
              </button>
              <button className="btn btn-primary" onClick={handleConditionChange}>
                적용
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
