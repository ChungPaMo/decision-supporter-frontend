import React, { useState } from 'react';
import { useProductionStore } from '../store/productionStore';
import '../styles/screens.css';

interface Props {
  onNext: () => void;
}

export default function DataUploadScreen({ onNext }: Props) {
  const { uploadedData, fieldMappings, validationIssues, setUploadedData, setFieldMappings, setValidationIssues } =
    useProductionStore();
  const [selectedMapping, setSelectedMapping] = useState<string | null>(null);

  const mockRawData = [
    ['품번', '품명', '수량', '납품일', '단위'],
    ['A001', '히터 A', '100', '2024-11-15', 'EA'],
    ['A002', '냉각기 B', '200', '2024-11-20', 'EA'],
    ['A003', '펌프 C', '150', '2024-11-25', '개'],
  ];

  const mockMappings = [
    { originalField: '품번', standardField: '품목코드', status: 'confirmed' as const },
    { originalField: '품명', standardField: '품명', status: 'confirmed' as const },
    { originalField: '수량', standardField: '수량', status: 'pending' as const, selectedUnit: 'EA' },
    { originalField: '납품일', standardField: '납기', status: 'pending' as const },
    { originalField: '단위', standardField: '단위', status: 'error' as const },
  ];

  const mockIssues = [
    { type: 'unit_mismatch' as const, message: '3행: 단위 불일치 (개 vs EA)', rowIndex: 3 },
  ];

  const handleUpload = () => {
    setUploadedData({
      fileName: '수요_2024_11.xlsx',
      uploadDate: '2024-11-08 14:30',
      rawData: mockRawData,
      headers: mockRawData[0],
    });
    setFieldMappings(mockMappings);
    setValidationIssues(mockIssues);
  };

  const handleMappingChange = (idx: number, newStatus: string) => {
    const updated = [...mockMappings];
    updated[idx].status = newStatus as any;
    setFieldMappings(updated);
  };

  // Demo mode: allow progression even with pending items
  const hasPending = false;

  return (
    <div className="screen screen-upload">
      <div className="screen-title">
        <h2>데이터 업로드 및 검토</h2>
        <p className="screen-description">엑셀 파일을 업로드하고 AI가 자동으로 분류한 필드를 검토합니다.</p>
      </div>

      {!uploadedData ? (
        <div className="upload-zone-card">
          <div className="upload-zone">
            <div className="upload-icon">📁</div>
            <h3>엑셀 파일 업로드</h3>
            <p>CSV 또는 XLSX 파일을 드래그하거나 클릭하여 업로드</p>
            <input type="file" className="file-input" onChange={handleUpload} accept=".csv,.xlsx" />
            <button className="btn-upload" onClick={handleUpload}>
              샘플 데이터로 데모 시작
            </button>
          </div>
        </div>
      ) : (
        <div className="upload-content">
          {/* 파일 정보 */}
          <div className="file-info-card">
            <div className="file-header">
              <div>
                <h3 className="file-name">{uploadedData.fileName}</h3>
                <p className="file-date">업로드 일시: {uploadedData.uploadDate}</p>
              </div>
              <button className="btn-change" onClick={() => setUploadedData(null)}>
                파일 변경
              </button>
            </div>
          </div>

          {/* 원본 데이터 미리보기 */}
          <div className="row-2">
            <div className="card">
              <h3 className="card-title">원본 데이터</h3>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      {uploadedData.headers.map((h, i) => (
                        <th key={i}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {uploadedData.rawData.slice(1).map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td key={j}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 필드 매핑 */}
            <div className="card">
              <h3 className="card-title">필드 매핑</h3>
              <div className="mapping-list">
                {mockMappings.map((mapping, idx) => (
                  <div key={idx} className="mapping-item">
                    <div className="mapping-from">{mapping.originalField}</div>
                    <div className="mapping-arrow">→</div>
                    <div className="mapping-to">{mapping.standardField}</div>
                    <div className={`status-badge status-${mapping.status}`}>{mapping.status}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 검증 결과 */}
          <div className="card">
            <h3 className="card-title">검증 결과</h3>
            {mockIssues.length === 0 ? (
              <div className="validation-success">
                <div className="success-icon">✓</div>
                <p>모든 검증 항목을 통과했습니다.</p>
              </div>
            ) : (
              <div className="validation-issues">
                {mockIssues.map((issue, idx) => (
                  <div key={idx} className="issue-item issue-warning">
                    <span className="issue-label">⚠️ {issue.type}</span>
                    <span className="issue-message">{issue.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 액션 버튼 */}
          <div className="button-group">
            <button
              className="btn btn-primary"
              onClick={onNext}
              disabled={hasPending}
              title={hasPending ? '보류 항목을 모두 확정해야 합니다.' : '다음 단계로 진행'}
            >
              확정 후 다음 →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
