import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';
import '../styles/screens.css';

interface BatchListScreenProps {
  onSelectBatch: (batchId: string) => void;
}

export default function BatchListScreen({ onSelectBatch }: BatchListScreenProps) {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    loadBatches();
  }, [statusFilter]);

  const loadBatches = async () => {
    try {
      setLoading(true);
      const result = await apiClient.listBatches(statusFilter || undefined);
      setBatches(result.items || []);
      setError(null);
    } catch (err: any) {
      setError(err.detail?.message || '배치 목록 로드 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen">
      <div className="card">
        <h2>배치 관리</h2>

        <div className="form-group">
          <label>상태 필터</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input"
          >
            <option value="">전체</option>
            <option value="MAPPING_HOLD">열 매핑 필요</option>
            <option value="HAS_ERRORS">검증 오류</option>
            <option value="READY_FOR_APPROVAL">승인 대기</option>
            <option value="APPROVED">승인됨</option>
            <option value="REJECTED">반려됨</option>
          </select>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <p>로드 중...</p>
        ) : batches.length === 0 ? (
          <p>배치가 없습니다.</p>
        ) : (
          <div className="list">
            {batches.map((batch) => (
              <div key={batch.batch_id} className="list-item" onClick={() => onSelectBatch(batch.batch_id)}>
                <div className="list-header">
                  <span className="batch-id">{batch.batch_id.substring(0, 8)}...</span>
                  <span className={`status status-${batch.status.toLowerCase()}`}>
                    {statusLabel(batch.status)}
                  </span>
                </div>
                <div className="list-meta">
                  <span>{batch.file.name}</span>
                  <span>{new Date(batch.created_at).toLocaleDateString('ko-KR')}</span>
                  <span>{batch.entity}</span>
                </div>
              </div>
            ))}
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
