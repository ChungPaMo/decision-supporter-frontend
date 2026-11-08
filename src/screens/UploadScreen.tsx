import React, { useState } from 'react';
import { apiClient } from '../services/api';
import { Entity, BatchDetail } from '../types/api';
import '../styles/screens.css';

interface UploadScreenProps {
  onBatchCreated: (batchId: string) => void;
}

export default function UploadScreen({ onBatchCreated }: UploadScreenProps) {
  const [file, setFile] = useState<File | null>(null);
  const [entity, setEntity] = useState<Entity>('monthly_demand');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const entities: { value: Entity; label: string }[] = [
    { value: 'monthly_demand', label: '월별 수요' },
    { value: 'product', label: '제품 마스터' },
    { value: 'material', label: '자재 마스터' },
    { value: 'bom', label: 'BOM' },
    { value: 'inventory', label: '재고' },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setFile(f || null);
    setError(null);
    setSuccess(null);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('파일을 선택해주세요.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.uploadBatch(file, entity, {
        source_type: 'CLIENT_UPLOAD',
      });
      setSuccess(`업로드 완료: ${result.batch_id}`);
      setFile(null);
      setTimeout(() => onBatchCreated(result.batch_id), 1000);
    } catch (err: any) {
      setError(err.detail?.message || '업로드 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen">
      <div className="card">
        <h2>파일 업로드</h2>

        <div className="form-group">
          <label>데이터 유형</label>
          <select
            value={entity}
            onChange={(e) => setEntity(e.target.value as Entity)}
            className="input"
          >
            {entities.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>파일 선택</label>
          <input
            type="file"
            accept=".csv,.xlsx"
            onChange={handleFileChange}
            className="input"
            disabled={loading}
          />
          {file && <p className="text-small">{file.name} ({(file.size / 1024).toFixed(2)} KB)</p>}
        </div>

        <button
          onClick={handleUpload}
          disabled={!file || loading}
          className="btn btn-primary"
        >
          {loading ? '업로드 중...' : '업로드'}
        </button>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="info-box">
          <h3>지원 파일</h3>
          <ul>
            <li>CSV 파일 (UTF-8, 쉼표 구분)</li>
            <li>Excel 파일 (.xlsx)</li>
            <li>최대 크기: 5MB</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
