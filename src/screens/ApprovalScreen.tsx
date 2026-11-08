import React, { useState } from 'react';
import { useProductionStore } from '../store/productionStore';
import '../styles/screens.css';

interface Props {
  onComplete: () => void;
}

export default function ApprovalScreen({ onComplete }: Props) {
  const { selectedPlanType, plans, approvalRecords, addApprovalRecord } = useProductionStore();
  const [approverName, setApproverName] = useState('');
  const [approvalNote, setApprovalNote] = useState('');
  const [isApproved, setIsApproved] = useState(false);

  const selectedPlan = plans.find((p) => p.planType === selectedPlanType);

  const handleApproval = () => {
    if (!approverName) {
      alert('승인자를 입력해주세요.');
      return;
    }

    addApprovalRecord({
      date: new Date().toLocaleString('ko-KR'),
      planType: selectedPlan?.title || '',
      approver: approverName,
      fileName: `Plan_${selectedPlanType}_${new Date().getTime()}.xlsx`,
    });

    setIsApproved(true);
    setTimeout(onComplete, 2000);
  };

  const handleExcelDownload = () => {
    alert('Excel 파일 다운로드: Plan_' + selectedPlanType + '.xlsx');
  };

  if (isApproved) {
    return (
      <div className="screen screen-approval">
        <div className="approval-success">
          <div className="success-icon">✓</div>
          <h2>승인이 완료되었습니다</h2>
          <p>생산계획이 최종 승인되고 저장되었습니다.</p>
          <div className="approval-details">
            <div className="detail-item">
              <span className="label">승인자:</span>
              <span className="value">{approverName}</span>
            </div>
            <div className="detail-item">
              <span className="label">승인 시간:</span>
              <span className="value">{new Date().toLocaleString('ko-KR')}</span>
            </div>
            <div className="detail-item">
              <span className="label">계획안:</span>
              <span className="value">{selectedPlan?.title}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen screen-approval">
      <div className="screen-title">
        <h2>최종 승인 및 Excel 출력</h2>
        <p className="screen-description">선택된 생산계획을 최종 승인하고 이력을 관리합니다.</p>
      </div>

      {/* 계획안 요약 */}
      <div className="card">
        <h3 className="card-title">생산계획 요약</h3>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="label">선택한 계획안</span>
            <span className="value large">{selectedPlan?.title}</span>
          </div>
          <div className="summary-item">
            <span className="label">생산량</span>
            <span className="value">{selectedPlan?.productionQty.toLocaleString()}개</span>
          </div>
          <div className="summary-item">
            <span className="label">예상 운영비</span>
            <span className="value">₩{((selectedPlan?.expectedCost || 0) / 1000000).toFixed(1)}M</span>
          </div>
          <div className="summary-item">
            <span className="label">기말재고</span>
            <span className="value">{selectedPlan?.endingStock.toLocaleString()}개</span>
          </div>
          <div className="summary-item">
            <span className="label">제약조건 위반</span>
            <span className={`value ${selectedPlan?.constraintViolations === 0 ? 'status-ok' : 'status-error'}`}>
              {selectedPlan?.constraintViolations}건
            </span>
          </div>
        </div>
      </div>

      {/* 승인 정보 입력 */}
      <div className="card">
        <h3 className="card-title">승인 정보</h3>
        <div className="form-group">
          <label>승인자 이름</label>
          <input
            type="text"
            value={approverName}
            onChange={(e) => setApproverName(e.target.value)}
            placeholder="예: 관리자, 부장"
            className="input"
          />
        </div>
        <div className="form-group">
          <label>승인 메모 (선택)</label>
          <textarea
            value={approvalNote}
            onChange={(e) => setApprovalNote(e.target.value)}
            placeholder="승인 시 특이사항이나 메모를 입력해주세요."
            className="input"
            rows={3}
          />
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="button-group">
        <button className="btn btn-secondary" onClick={handleExcelDownload}>
          📥 Excel 다운로드
        </button>
        <button className="btn btn-primary" onClick={handleApproval} disabled={!approverName}>
          ✓ 최종 승인
        </button>
      </div>

      {/* 승인 이력 */}
      <div className="card">
        <h3 className="card-title">승인 이력</h3>
        {approvalRecords.length === 0 ? (
          <p className="empty-message">아직 승인 기록이 없습니다.</p>
        ) : (
          <div className="table-wrapper">
            <table className="history-table">
              <thead>
                <tr>
                  <th>날짜</th>
                  <th>계획안</th>
                  <th>승인자</th>
                  <th>파일</th>
                </tr>
              </thead>
              <tbody>
                {approvalRecords.map((record, idx) => (
                  <tr key={idx}>
                    <td>{record.date}</td>
                    <td>{record.planType}</td>
                    <td>{record.approver}</td>
                    <td>
                      <button className="link-btn">📥 {record.fileName}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
