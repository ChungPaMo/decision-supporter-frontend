import { ChangeEvent, useState } from 'react';
import { BatchDetail, Entity, ValidationResult } from '../types/api';
import {
  approveFixtures,
  approvedRows,
  demandRevalidated,
  demandWithErrors,
  uploadFixtures,
} from '../services/fixtures';
import { apiClient } from '../services/api';
import { allApproved, ENTITY_ORDER, mastersApproved, useProductionStore } from '../store/productionStore';
import { BatchBadge, ENTITY_LABEL, errorMessage, Notice, qty, ROLE_CODE, ScreenHeader } from '../components/ui';

const HIDDEN_COLUMNS = new Set(['location', 'review_required', 'batch_id', 'source_type']);

function RowsTable({ rows, caption }: { rows: Array<Record<string, unknown>>; caption: string }) {
  const columns = Object.keys(rows[0] ?? {}).filter((key) => !HIDDEN_COLUMNS.has(key));
  if (rows.length === 0) return null;
  return (
    <div className="table-scroll">
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {columns.map((column) => (
                <td key={column}>{row[column] === null ? '-' : String(row[column])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ValidationView({ validation }: { validation: ValidationResult }) {
  return (
    <>
      {validation.sheets.map((sheet, index) => (
        <div key={index} className="stack">
          {sheet.issues.length > 0 && (
            <div className="table-scroll">
              <table>
                <caption>
                  검증 결과 {sheet.issues.length} / 전체 {qty(sheet.issues_total)}건
                </caption>
                <thead>
                  <tr>
                    <th scope="col">구분</th>
                    <th scope="col">위치</th>
                    <th scope="col">코드</th>
                    <th scope="col">내용</th>
                    <th scope="col">원본값</th>
                  </tr>
                </thead>
                <tbody>
                  {sheet.issues.map((issue, issueIndex) => (
                    <tr key={issueIndex}>
                      <td>{issue.severity === 'ERROR' ? '오류' : '경고'}</td>
                      <td>{issue.location.cell_ref ?? `${issue.location.row}행`}</td>
                      <td className="code">{issue.code}</td>
                      <td>{issue.message}</td>
                      <td>{issue.raw_value || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <RowsTable
            rows={sheet.records.slice(0, 10)}
            caption={`레코드 미리보기 ${Math.min(sheet.records.length, 10)} / 전체 ${qty(sheet.records_total)}건`}
          />
        </div>
      ))}
    </>
  );
}

function BatchPanel({ entity, batch }: { entity: Entity; batch: BatchDetail }) {
  const setBatch = useProductionStore((state) => state.setBatch);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [actor, setActor] = useState('REVIEWER-01');
  const [rejectReason, setRejectReason] = useState('');

  const holds = batch.validation.sheets.flatMap((sheet) => sheet.holds);
  const canRevalidate = holds.length > 0 && holds.every((hold) => overrides[hold.field]);
  const actorValid = ROLE_CODE.test(actor);
  const finished = batch.status === 'APPROVED' || batch.status === 'REJECTED';

  const approve = () => setBatch(entity, approveFixtures[entity]);
  const reject = () =>
    setBatch(entity, {
      ...batch,
      status: 'REJECTED',
      rejected_by: actor,
      rejected_at: new Date().toISOString(),
      reject_reason: rejectReason,
    });

  return (
    <section className="panel stack" aria-label={`${ENTITY_LABEL[entity]} 배치`}>
      <div className="panel-heading">
        <div>
          <h3>{batch.file.name}</h3>
          <p className="muted">
            버전 {batch.version} · 오류 {batch.validation.blocking_error_count}건 · 경고 {batch.validation.warning_count}건
          </p>
        </div>
        <BatchBadge status={batch.status} />
      </div>

      {batch.status === 'MAPPING_HOLD' && (
        <div className="stack">
          {holds.map((hold) => (
            <label key={hold.field} className="field">
              <span>{hold.message}</span>
              <select
                value={overrides[hold.field] ?? ''}
                onChange={(event) => setOverrides({ ...overrides, [hold.field]: event.target.value })}
              >
                <option value="">원본 열 선택</option>
                {hold.candidates.map((candidate) => (
                  <option key={candidate} value={candidate}>
                    {candidate}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <div className="actions">
            <button
              type="button"
              className="button primary"
              disabled={!canRevalidate}
              onClick={() => setBatch(entity, demandRevalidated)}
            >
              지정한 열로 재검증
            </button>
          </div>
        </div>
      )}

      {batch.status === 'HAS_ERRORS' && (
        <Notice tone="bad">
          {batch.approval_blockers.map((blocker) => blocker.message).join(' ')} 셀 단위 수정 기능은 없으므로 원본 파일을 고쳐 새로
          업로드합니다.
        </Notice>
      )}

      {batch.status === 'APPROVED' ? (
        <>
          <Notice tone="ok">
            {batch.approved_by} 승인 완료 · {qty(batch.approved_record_count)}건 반영
          </Notice>
          <RowsTable rows={approvedRows[entity]} caption="승인된 데이터" />
        </>
      ) : (
        <ValidationView validation={batch.validation} />
      )}

      {batch.status === 'REJECTED' && (
        <>
          <Notice tone="muted">
            {batch.rejected_by} 반려 · 사유: {batch.reject_reason}
          </Notice>
          <div className="actions">
            <button type="button" className="button" onClick={() => setBatch(entity, undefined)}>
              새 파일 올리기
            </button>
          </div>
        </>
      )}

      {!finished && (
        <div className="decision">
          <label className="field">
            <span>승인자 역할 코드</span>
            <input
              value={actor}
              aria-invalid={!actorValid}
              onChange={(event) => setActor(event.target.value)}
            />
            <small className={actorValid ? 'muted' : 'field-error'}>
              {actorValid ? '실명이 아닌 역할 코드를 입력합니다.' : '영문·숫자로 된 역할 코드만 입력할 수 있습니다.'}
            </small>
          </label>
          <label className="field">
            <span>반려 사유</span>
            <input value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} />
          </label>
          <div className="actions">
            <button type="button" className="button" disabled={!actorValid || !rejectReason.trim()} onClick={reject}>
              반려
            </button>
            <button
              type="button"
              className="button primary"
              disabled={!actorValid || batch.approval_blockers.length > 0}
              onClick={approve}
            >
              검증 결과 승인
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default function DataUploadScreen() {
  const { activeEntity, setActiveEntity, batches, setBatch, setStep } = useProductionStore();
  const [preview, setPreview] = useState<{ entity: Entity; result: ValidationResult } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const batch = batches[activeEntity];
  const locked = (entity: Entity) =>
    entity !== 'product' && entity !== 'material' && !mastersApproved(batches);
  const shownPreview = preview?.entity === activeEntity ? preview.result : null;

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setPreviewing(true);
    setPreview(null);
    setPreviewError(null);
    try {
      setPreview({ entity: activeEntity, result: await apiClient.previewBatch(file, activeEntity) });
    } catch (error) {
      setPreviewError(errorMessage(error));
    } finally {
      setPreviewing(false);
    }
  };

  const fillAll = () => ENTITY_ORDER.forEach((entity) => setBatch(entity, approveFixtures[entity]));

  return (
    <div className="screen">
      <ScreenHeader
        title="데이터 등록·승인"
        description="제품·자재를 먼저 승인한 뒤 BOM·재고·월별 수요를 올립니다. 승인된 데이터만 예측과 계획에 쓰입니다."
      />

      <div className="data-layout">
        <aside className="entity-list" aria-label="데이터 종류">
          <ul>
            {ENTITY_ORDER.map((entity) => (
              <li key={entity}>
                <button
                  type="button"
                  className={entity === activeEntity ? 'active' : ''}
                  aria-current={entity === activeEntity ? 'true' : undefined}
                  onClick={() => setActiveEntity(entity)}
                >
                  <span>{ENTITY_LABEL[entity]}</span>
                  {batches[entity] ? (
                    <BatchBadge status={batches[entity]!.status} />
                  ) : (
                    <small className="muted">{locked(entity) ? '선행 승인 필요' : '미등록'}</small>
                  )}
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="button full" onClick={fillAll}>
            예시 데이터 전체 승인
          </button>
        </aside>

        <div className="stack">
          {!batch && (
            <section className="panel stack">
              <h3>{ENTITY_LABEL[activeEntity]} 파일 등록</h3>
              {locked(activeEntity) ? (
                <Notice tone="warn">제품과 자재를 먼저 승인해야 등록할 수 있습니다.</Notice>
              ) : (
                <div className="actions start">
                  <button
                    type="button"
                    className="button primary"
                    onClick={() => setBatch(activeEntity, uploadFixtures[activeEntity])}
                  >
                    예시 파일로 시작
                  </button>
                  {activeEntity === 'monthly_demand' && (
                    <button type="button" className="button" onClick={() => setBatch(activeEntity, demandWithErrors)}>
                      오류가 있는 예시 보기
                    </button>
                  )}
                  <label className="button">
                    {previewing ? '검증 중…' : '내 파일 검증 (CSV·XLSX)'}
                    <input type="file" accept=".csv,.xlsx" className="visually-hidden" onChange={handleFile} />
                  </label>
                </div>
              )}
              {previewError && <Notice tone="bad">{previewError}</Notice>}
              {shownPreview && (
                <>
                  <Notice tone="info">
                    검증만 수행했습니다. 저장·승인 API 는 서버에서 아직 준비되지 않았습니다. (판정: {shownPreview.status})
                  </Notice>
                  <ValidationView validation={shownPreview} />
                </>
              )}
            </section>
          )}

          {batch && <BatchPanel key={`${activeEntity}-${batch.version}-${batch.status}`} entity={activeEntity} batch={batch} />}
        </div>
      </div>

      <div className="actions">
        <button type="button" className="button primary" disabled={!allApproved(batches)} onClick={() => setStep('forecast')}>
          수요 예측 확인
        </button>
      </div>
    </div>
  );
}
