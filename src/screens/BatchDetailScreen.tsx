import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';
import { BatchDetail } from '../types/api';
import '../styles/screens.css';

interface BatchDetailScreenProps {
  batchId: string;
  onBack: () => void;
}

export default function BatchDetailScreen({ batchId, onBack }: BatchDetailScreenProps) {
  const [batch, setBatch] = useState<BatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [columnOverrides, setColumnOverrides] = useState<Record<string, string>>({});
  const [approver, setApprover] = useState('REVIEWER-01');
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    loadBatch();
  }, [batchId]);

  const loadBatch = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getBatch(batchId);
      setBatch(data);
      setError(null);
    } catch (err: any) {
      setError(err.detail?.message || '배치 로드 실패');
    } finally {
      setLoading(false);
    }
  };

  const handleRevalidate = async () => {
    if (!batch) return;
    try {
      setActionLoading(true);
      const result = await apiClient.revalidateBatch(batchId, {
        expected_version: batch.version,
        column_overrides: columnOverrides,
      });
      setBatch(result);
      setColumnOverrides({});
    } catch (err: any) {
      setError(err.detail?.message || '재검증 실패');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!batch) return;
    try {
      setActionLoading(true);
      const result = await apiClient.approveBatch(batchId, approver, batch.result_digest);
      setBatch(result);
    } catch (err: any) {
      setError(err.detail?.message || '승인 실패');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!batch) return;
    try {
      setActionLoading(true);
      const result = await apiClient.rejectBatch(batchId, approver, rejectReason);
      setBatch(result);
      setRejectReason('');
    } catch (err: any) {
      setError(err.detail?.message || '반려 실패');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="screen"><div className="card">로드 중...</div></div>;
  if (!batch) return <div className="screen"><div className="card">배치를 찾을 수 없습니다.</div></div>;

  const sheet = batch.validation.sheets[0];

  return (
    <div className="screen">
      <div className="card">
        <button onClick={onBack} className="btn-back">← 돌아가기</button>

        <h2>배치 상세: {batch.batch_id.substring(0, 8)}...</h2>

        <div className="batch-meta">
          <div className="meta-row">
            <span className="label">상태:</span>
            <span className={`status status-${batch.status.toLowerCase()}`}>
              {statusLabel(batch.status)}
            </span>
          </div>
          <div className="meta-row">
            <span className="label">파일:</span>
            <span>{batch.file.name} ({batch.file.size_bytes} bytes)</span>
          </div>
          <div className="meta-row">
            <span className="label">버전:</span>
            <span>{batch.version}</span>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {/* MAPPING_HOLD: 열 선택 필요 */}
        {batch.status === 'MAPPING_HOLD' && sheet?.holds && (
          <div className="section">
            <h3>📌 열 매핑 필요</h3>
            <p className="text-small">다음 필드에 해당하는 열을 선택해주세요:</p>
            {sheet.holds.map((hold) => (
              <div key={hold.field} className="hold-item">
                <label>{hold.field}</label>
                <select
                  value={columnOverrides[hold.field] || ''}
                  onChange={(e) =>
                    setColumnOverrides({
                      ...columnOverrides,
                      [hold.field]: e.target.value,
                    })
                  }
                  className="input"
                >
                  <option value="">선택...</option>
                  {hold.candidates.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <button onClick={handleRevalidate} disabled={actionLoading} className="btn btn-primary">
              {actionLoading ? '처리 중...' : '재검증'}
            </button>
          </div>
        )}

        {/* HAS_ERRORS: 검증 오류 표시 */}
        {batch.status === 'HAS_ERRORS' && sheet?.issues && (
          <div className="section">
            <h3>⚠️ 검증 오류 ({sheet.issues.length}건)</h3>
            <div className="issues-list">
              {sheet.issues.map((issue, idx) => (
                <div key={idx} className="issue-item">
                  <div className="issue-header">
                    <span className="code">{issue.code}</span>
                    <span className="cell">{issue.location.cell_ref}</span>
                  </div>
                  <p>{issue.message}</p>
                </div>
              ))}
            </div>
            <p className="text-small">원본 파일을 수정하여 다시 업로드하거나, 필요시 마스터 데이터를 먼저 승인하세요.</p>
            <button onClick={onBack} className="btn btn-secondary">
              돌아가기
            </button>
          </div>
        )}

        {/* READY_FOR_APPROVAL: 검증 완료, 승인 대기 */}
        {batch.status === 'READY_FOR_APPROVAL' && sheet?.records && (
          <div className="section">
            <h3>✓ 검증 완료</h3>
            <p className="text-small">
              유효 레코드: {sheet.valid_records} / {sheet.records_total}
            </p>

            {sheet.records.length > 0 && (
              <div className="records-preview">
                <h4>미리보기 ({Math.min(5, sheet.records.length)}건)</h4>
                <table className="table">
                  <tbody>
                    {sheet.records.slice(0, 5).map((record, idx) => (
                      <tr key={idx}>
                        {Object.values(record).slice(0, 4).map((val, i) => (
                          <td key={i}>{String(val)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="approval-section">
              <label>승인자</label>
              <input
                type="text"
                value={approver}
                onChange={(e) => setApprover(e.target.value)}
                className="input"
              />
              <button
                onClick={handleApprove}
                disabled={actionLoading || batch.approval_blockers.length > 0}
                className="btn btn-success"
              >
                {actionLoading ? '처리 중...' : '승인'}
              </button>
            </div>

            <details className="reject-section">
              <summary>반려</summary>
              <textarea
                placeholder="반려 사유"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="input"
              />
              <button
                onClick={handleReject}
                disabled={actionLoading || !rejectReason}
                className="btn btn-danger"
              >
                반려하기
              </button>
            </details>
          </div>
        )}

        {/* APPROVED: 승인 완료 */}
        {batch.status === 'APPROVED' && (
          <div className="section">
            <h3>✓ 승인 완료</h3>
            <div className="approval-info">
              <p>승인자: {batch.approved_by}</p>
              <p>승인 시간: {new Date(batch.approved_at!).toLocaleString('ko-KR')}</p>
              <p>레코드 수: {batch.approved_record_count}</p>
            </div>
          </div>
        )}

        {/* REJECTED: 반려 */}
        {batch.status === 'REJECTED' && (
          <div className="section">
            <h3>✗ 반려됨</h3>
            <div className="rejection-info">
              <p>반려자: {batch.rejected_by}</p>
              <p>반려 시간: {new Date(batch.rejected_at!).toLocaleString('ko-KR')}</p>
              <p>사유: {batch.reject_reason}</p>
            </div>
            <button onClick={onBack} className="btn btn-primary">
              돌아가기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    MAPPING_HOLD: '열 매핑 필요',
    HAS_ERRORS: '검증 오류',
    READY_FOR_APPROVAL: '승인 대기',
    APPROVED: '승인됨',
    REJECTED: '반려됨',
  };
  return labels[status] || status;
}
