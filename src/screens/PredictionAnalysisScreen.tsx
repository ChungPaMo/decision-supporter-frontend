import React from 'react';
import { useProductionStore } from '../store/productionStore';
import '../styles/screens.css';

interface Props {
  onNext: () => void;
}

export default function PredictionAnalysisScreen({ onNext }: Props) {
  const { predictionData } = useProductionStore();

  if (!predictionData) return <div className="screen">데이터 로드 중...</div>;

  return (
    <div className="screen screen-prediction">
      <div className="screen-title">
        <h2>예측 근거 및 불확실성 분석</h2>
        <p className="screen-description">AI가 어떤 데이터와 모델을 사용해 수요를 예측했는지 확인합니다.</p>
      </div>

      <div className="analysis-container">
        {/* 왼쪽: 예측 정보 */}
        <div className="card">
          <h3 className="card-title">수요 예측</h3>

          <div className="prediction-main">
            <div className="prediction-label">다음 주 예상 수요</div>
            <div className="prediction-range">
              <div className="range-value">최소</div>
              <div className="range-number">{predictionData.minValue.toLocaleString()}개</div>
              <div className="range-bar">
                <div className="range-fill"></div>
              </div>
              <div className="range-number">{predictionData.maxValue.toLocaleString()}개</div>
              <div className="range-value">최대</div>
            </div>
            <div className="prediction-point">
              <div className="point-label">예측값</div>
              <div className="point-value">{predictionData.predictedValue.toLocaleString()}개</div>
            </div>
            <div className="confidence-info">
              <span>신뢰구간: {predictionData.confidenceInterval}%</span>
              <span>기준모델 대비 개선율: {predictionData.improvementRate}%</span>
            </div>
          </div>

          <div className="info-table">
            <div className="info-row">
              <span className="label">사용된 모델</span>
              <span className="value">{predictionData.predictionModel}</span>
            </div>
            <div className="info-row">
              <span className="label">학습 기간</span>
              <span className="value">{predictionData.trainingPeriod}</span>
            </div>
          </div>
        </div>

        {/* 오른쪽: 데이터 출처 */}
        <div className="card">
          <h3 className="card-title">데이터 출처 및 규칙</h3>

          <div className="section">
            <h4>사용한 원본 데이터</h4>
            <div className="info-table">
              <div className="info-row">
                <span className="label">파일명</span>
                <span className="value">{predictionData.sourceFile}</span>
              </div>
              <div className="info-row">
                <span className="label">시트/행</span>
                <span className="value">
                  {predictionData.referenceSheet} / 2~1024
                </span>
              </div>
            </div>
          </div>

          <div className="section">
            <h4>적용된 판단 규칙</h4>
            <div className="rules-list">
              {predictionData.appliedRules.map((rule) => (
                <span key={rule} className="badge badge-rule">
                  {rule}
                </span>
              ))}
            </div>
          </div>

          <div className="section">
            <h4>외부 원자재 가격</h4>
            <div className="info-table">
              <div className="info-row">
                <span className="label">데이터</span>
                <span className="value">{predictionData.externalData}</span>
              </div>
              <div className="info-row">
                <span className="label">출처</span>
                <span className="value">{predictionData.dataSource}</span>
              </div>
              <div className="info-row">
                <span className="label">기준일</span>
                <span className="value">{predictionData.dataDate}</span>
              </div>
            </div>
          </div>

          <div className="value-types">
            <div className="value-type">
              <span className="badge badge-assumption">가정값</span>
              <span>모델이 가정한 값</span>
            </div>
            <div className="value-type">
              <span className="badge badge-actual">실측값</span>
              <span>실제 관측된 값</span>
            </div>
          </div>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="button-group">
        <button className="btn btn-primary" onClick={onNext}>
          다음 단계로 →
        </button>
      </div>
    </div>
  );
}
