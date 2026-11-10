import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { BatchDetail, BatchSummary, Entity, ValidationResult } from '../types/api';
import { apiClient } from '../services/api';
import { ENTITY_ORDER, useProductionStore } from '../store/productionStore';
import { BatchBadge, ENTITY_LABEL, errorMessage, Notice, qty, ROLE_CODE, ScreenHeader } from '../components/ui';

const HIDDEN_COLUMNS = new Set(['location', 'review_required', 'batch_id', 'source_type', 'lines']);
const SELECTION_KEY = 'chungpamo.batch-selection.v1';

function selections(): Partial<Record<Entity, string>> {
  try {
    const value = JSON.parse(localStorage.getItem(SELECTION_KEY) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch { return {}; }
}

function remember(entity: Entity, id: string) {
  // 승인 상태는 저장하지 않는다. ID는 재조회 대상 선택에만 사용한다.
  try { localStorage.setItem(SELECTION_KEY, JSON.stringify({ ...selections(), [entity]: id })); } catch { /* 저장소가 막혀도 서버 재조회 가능 */ }
}

function RowsTable({ rows, caption }: { rows: Array<Record<string, unknown>>; caption: string }) {
  const columns = Object.keys(rows[0] ?? {}).filter((key) => !HIDDEN_COLUMNS.has(key));
  if (!rows.length) return <p className="muted">조회된 데이터가 없습니다.</p>;
  return <div className="table-scroll"><table><caption>{caption}</caption>
    <thead><tr>{columns.map((key) => <th key={key}>{key}</th>)}</tr></thead>
    <tbody>{rows.map((row, i) => <tr key={i}>{columns.map((key) => <td key={key}>{row[key] == null ? '-' : String(row[key])}</td>)}</tr>)}</tbody>
  </table></div>;
}

function ValidationView({ validation }: { validation: ValidationResult }) {
  return <>{validation.sheets.map((sheet, i) => <div key={i} className="stack">
    <h4>{sheet.name}</h4>
    {sheet.issues.length > 0 && <div className="table-scroll"><table>
      <caption>검증 결과 {sheet.issues.length} / 전체 {qty(sheet.issues_total)}건</caption>
      <thead><tr><th>구분</th><th>위치</th><th>코드</th><th>내용</th><th>원본값</th></tr></thead>
      <tbody>{sheet.issues.map((issue, j) => <tr key={j}>
        <td>{issue.severity === 'ERROR' ? '오류' : '경고'}</td><td>{issue.location?.cell_ref ?? (issue.location?.row ? `${issue.location.row}행` : '파일 전체')}</td>
        <td>{issue.code}</td><td>{issue.message}</td><td>{issue.raw_value || '-'}</td>
      </tr>)}</tbody>
    </table></div>}
    <RowsTable rows={sheet.records.slice(0, 10)} caption={`레코드 미리보기 (전체 ${qty(sheet.records_total)}건)`} />
  </div>)}</>;
}

function failureMessage(error: unknown) {
  const detail = (error as { detail?: { code?: string; details?: Array<{ loc?: string[]; message?: string }> } })?.detail;
  const code = detail?.code;
  const base = errorMessage(error);
  if (code === 'REQUEST_INVALID' && Array.isArray(detail?.details)) {
    return `${base} ${detail.details.map((item) => `${item.loc?.join('.') ?? ''}: ${item.message ?? ''}`).join(' / ')}`;
  }
  if (code === 'RESULT_CHANGED' || code === 'VERSION_CONFLICT') return `${base} 최신 상태를 다시 확인한 뒤 재요청하세요.`;
  if (code === 'PERSISTENCE_DISABLED') return `${base} 서버의 저장 기능이 꺼져 있습니다. 승인은 처리되지 않았습니다.`;
  if (code === 'DB_UNAVAILABLE') return `${base} DB 연결 복구 후 다시 조회하세요.`;
  return base;
}

type Action = (operation: () => Promise<BatchDetail>) => Promise<void>;

function BatchPanel({ batch, disabled, act }: { batch: BatchDetail; disabled: boolean; act: Action }) {
  const [overrides, setOverrides] = useState({ ...batch.settings.column_overrides });
  const [unit, setUnit] = useState(batch.settings.default_unit ?? '');
  const [sheet, setSheet] = useState(batch.settings.sheet ?? '');
  const [actor, setActor] = useState('REVIEWER-01');
  const [reason, setReason] = useState('');
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [readError, setReadError] = useState('');
  const finished = batch.status === 'APPROVED' || batch.status === 'REJECTED';
  const holds = batch.validation?.sheets.flatMap((s) => s.holds) ?? [];
  const actorValid = ROLE_CODE.test(actor);

  useEffect(() => {
    let current = true;
    if (batch.status === 'APPROVED') {
      apiClient.approvedData(batch.entity).then((data) => {
        if (current) setRows(data.filter((row) => row.batch_id === batch.batch_id));
      }).catch((error) => { if (current) setReadError(failureMessage(error)); });
    }
    return () => { current = false; };
  }, [batch.batch_id, batch.entity, batch.status]);

  return <section className="panel stack" aria-label={`${ENTITY_LABEL[batch.entity]} 배치`}>
    <div className="panel-heading"><div><h3>{batch.file.name}</h3>
      <p className="muted">버전 {batch.version} · 배치 {batch.batch_id}</p></div><BatchBadge status={batch.status} /></div>
    {batch.status === 'HAS_ERRORS' && <Notice tone="bad">
      {batch.approval_blockers.map((item) => item.message).join(' ')} 원본 오류는 파일을 수정해 다시 등록하세요. 마스터 승인 후에는 이 배치를 재검증할 수 있습니다.
    </Notice>}
    {batch.validation ? <ValidationView validation={batch.validation} /> : <Notice tone="warn">검증 요약이 없습니다. 서버 상태를 다시 조회하세요.</Notice>}
    {batch.status === 'APPROVED' && <>
      <Notice tone="ok">{batch.approved_by} 승인 완료 · {qty(batch.approved_record_count)}건 반영</Notice>
      {readError ? <Notice tone="bad">{readError}</Notice> : <RowsTable rows={rows} caption="서버 승인 데이터 조회 (최대 100개 항목 중 선택 배치)" />}
    </>}
    {batch.status === 'REJECTED' && <Notice tone="muted">{batch.rejected_by} 반려 · 사유: {batch.reject_reason}</Notice>}
    {!finished && <fieldset className="stack" disabled={disabled}>
      <legend>재검증 설정</legend>
      {holds.map((hold, i) => <label className="field" key={`${hold.field}-${i}`}><span>{hold.message}</span>
        <input aria-label={`${hold.field} 매핑 열`} list={`columns-${i}`} value={overrides[hold.field] ?? ''}
          onChange={(e) => setOverrides({ ...overrides, [hold.field]: e.target.value })} placeholder="원본 헤더 또는 열 문자" />
        <datalist id={`columns-${i}`}>{hold.candidates.map((c) => <option key={c} value={c} />)}</datalist>
      </label>)}
      <label className="field"><span>기본 단위 (선택)</span><input value={unit} onChange={(e) => setUnit(e.target.value)} /></label>
      <label className="field"><span>시트 (비우면 전체)</span><input value={sheet} onChange={(e) => setSheet(e.target.value)} /></label>
      <button className="button" type="button" onClick={() => void act(() => apiClient.revalidateBatch(batch.batch_id, {
        expected_version: batch.version, column_overrides: Object.fromEntries(Object.entries(overrides).filter(([, value]) => value.trim())),
        default_unit: unit.trim() || null, sheet: sheet.trim() || null,
      }))}>서버 재검증</button>
      <label className="field"><span>승인자 역할 코드</span><input value={actor} onChange={(e) => setActor(e.target.value)} aria-invalid={!actorValid} /></label>
      <label className="field"><span>반려 사유</span><input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} /></label>
      <div className="actions">
        <button type="button" className="button" disabled={!actorValid || !reason.trim()}
          onClick={() => void act(() => apiClient.rejectBatch(batch.batch_id, actor, reason))}>반려</button>
        <button type="button" className="button primary"
          disabled={!actorValid || batch.status !== 'READY_FOR_APPROVAL' || batch.approval_blockers.length > 0 || !batch.result_digest || !batch.validation}
          onClick={() => void act(() => apiClient.approveBatch(batch.batch_id, actor, batch.result_digest!))}>검증 결과 승인</button>
      </div>
    </fieldset>}
  </section>;
}

export default function DataUploadScreen() {
  const { activeEntity, setActiveEntity, batches, setBatch, setWorkspace, approvedEntities, synced, setSynced, setStep } = useProductionStore();
  const [history, setHistory] = useState<BatchSummary[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [source, setSource] = useState('CLIENT_UPLOAD');
  const [sourceNote, setSourceNote] = useState('');
  const alive = useRef(true);
  const working = useRef(false);
  const batch = batches[activeEntity];
  const locked = activeEntity !== 'product' && activeEntity !== 'material' && !(approvedEntities.product && approvedEntities.material);

  async function load() {
    const list = await apiClient.allBatches();
    const ids = selections();
    const details: Partial<Record<Entity, BatchDetail>> = {};
    const approved: Partial<Record<Entity, boolean>> = {};
    await Promise.all(ENTITY_ORDER.map(async (entity) => {
      const candidates = list.filter((item) => item.entity === entity);
      approved[entity] = candidates.some((item) => item.status === 'APPROVED');
      const selected = candidates.find((item) => item.batch_id === ids[entity]) ?? candidates[0];
      if (selected) details[entity] = await apiClient.getBatch(selected.batch_id);
    }));
    if (alive.current) { setHistory(list); setWorkspace(details, approved, true); }
  }

  async function refresh() {
    if (working.current) return;
    working.current = true; setBusy(true); setSynced(false); setMessage('');
    try { await load(); } catch (error) { if (alive.current) setMessage(failureMessage(error)); }
    finally { working.current = false; if (alive.current) setBusy(false); }
  }

  useEffect(() => {
    alive.current = true;
    void refresh();
    return () => { alive.current = false; };
  }, []);

  const act: Action = async (operation) => {
    if (working.current || !synced) return;
    working.current = true; setBusy(true); setMessage('');
    try {
      const updated = await operation();
      remember(updated.entity, updated.batch_id);
      if (alive.current) setBatch(updated.entity, updated);
      await load();
    } catch (error) {
      const code = (error as { detail?: { code?: string } })?.detail?.code;
      if (code === 'VERSION_CONFLICT' || code === 'RESULT_CHANGED' || code === 'ALREADY_APPROVED' || code === 'BATCH_FINALIZED') {
        try { await load(); } catch { if (alive.current) setSynced(false); }
      } else if (code === 'PERSISTENCE_DISABLED' || code === 'DB_UNAVAILABLE' || code === 'NETWORK_ERROR' || !code) {
        if (alive.current) setSynced(false);
      }
      if (alive.current) setMessage(failureMessage(error));
    } finally { working.current = false; if (alive.current) setBusy(false); }
  };

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) void act(() => apiClient.uploadBatch(file, activeEntity, { source_type: source, source_note: sourceNote }));
  };

  async function selectBatch(id: string) {
    if (working.current || !id) return;
    working.current = true; setBusy(true); setMessage('');
    try {
      const detail = await apiClient.getBatch(id);
      remember(detail.entity, id); setBatch(detail.entity, detail);
    } catch (error) { setMessage(failureMessage(error)); setSynced(false); }
    finally { working.current = false; setBusy(false); }
  }

  return <div className="screen">
    <ScreenHeader title="데이터 등록·승인" description="파일을 서버에 등록하고 검증 결과를 확인해 승인합니다. 제품·자재 승인 후 BOM·재고·월별 수요를 등록하세요." />
    <div className="actions"><button className="button" disabled={busy} onClick={() => void refresh()}>서버 상태 다시 조회</button>
      <span role="status">{busy ? '서버 처리 중…' : synced ? '서버 상태 조회 완료' : '서버 상태 확인 필요'}</span></div>
    {message && <div role="alert"><Notice tone="bad">{message}</Notice></div>}
    {!synced && !busy && <Notice tone="warn">서버 연결을 확인한 후 다시 조회하세요. 확인 전에는 등록·승인을 할 수 없습니다.</Notice>}
    <div className="data-layout"><aside className="entity-list" aria-label="데이터 종류"><ul>
      {ENTITY_ORDER.map((entity) => <li key={entity}><button type="button" disabled={busy} className={entity === activeEntity ? 'active' : ''}
        aria-current={entity === activeEntity ? 'true' : undefined} onClick={() => setActiveEntity(entity)}>
        <span>{ENTITY_LABEL[entity]}</span>{batches[entity] ? <BatchBadge status={batches[entity]!.status} /> : <small>미등록</small>}
      </button></li>)}
    </ul></aside><div className="stack">
      <section className="panel stack"><h3>{ENTITY_LABEL[activeEntity]} 파일 등록</h3>
        {locked && <Notice tone="warn">제품과 자재를 먼저 승인해야 등록할 수 있습니다.</Notice>}
        <fieldset disabled={busy || !synced || locked} className="stack"><legend>CSV/XLSX 업로드</legend>
          <label className="field"><span>데이터 출처</span><select aria-label="데이터 출처" value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="CLIENT_UPLOAD">기업 업로드</option><option value="SYNTHETIC">합성 데이터</option><option value="PUBLIC_DEMAND">공개 수요 데이터</option>
          </select></label>
          <label className="field"><span>출처 설명</span><input value={sourceNote} onChange={(e) => setSourceNote(e.target.value)} /></label>
          <label className="field"><span>등록 파일 (CSV/XLSX)</span><input type="file" accept=".csv,.xlsx" onChange={handleFile}
            disabled={source !== 'CLIENT_UPLOAD' && !sourceNote.trim()} /></label>
        </fieldset>
      </section>
      <label className="field"><span>배치 이력</span><select aria-label="배치 이력" disabled={busy || !synced} value={batch?.batch_id ?? ''} onChange={(e) => void selectBatch(e.target.value)}>
        <option value="">등록된 배치 선택</option>{history.filter((item) => item.entity === activeEntity).map((item) =>
          <option key={item.batch_id} value={item.batch_id}>{item.file.name} · {item.status} · v{item.version} · {item.batch_id.slice(0, 8)}</option>)}
      </select></label>
      {batch && <BatchPanel key={`${batch.batch_id}-${batch.version}`} batch={batch} disabled={busy || !synced} act={act} />}
    </div></div>
    <Notice tone="info">승인된 월별 수요는 실제 예측에 사용됩니다. 계획·진단은 별도 예시입니다.</Notice>
    <div className="actions"><button className="button primary" disabled={busy || !synced || !approvedEntities.monthly_demand}
      onClick={() => setStep('forecast')}>승인 수요 예측</button></div>
  </div>;
}
