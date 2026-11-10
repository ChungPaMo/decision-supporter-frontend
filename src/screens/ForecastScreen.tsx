import { FormEvent, useEffect, useRef, useState } from 'react';
import { apiClient } from '../services/api';
import { ForecastExecution, ForecastExecutionSummary, ForecastRunParameters, ForecastRunReply } from '../types/engine';
import { useProductionStore } from '../store/productionStore';
import { errorMessage, Notice, qty, ScreenHeader } from '../components/ui';

const KEY = 'chungpamo.forecast-selection.v1';
const LABEL = { OK: '예측 완료', PARTIAL: '일부 제품 제외', DATA_INSUFFICIENT: '예측 데이터 부족', INPUT_INVALID: '예측 입력 오류', FAILED: '예측 실행 실패' };

function remember(id: string) { try { localStorage.setItem(KEY, id); } catch { /* ID 저장은 선택 사항 */ } }
function lastId() {
  try {
    const value = localStorage.getItem(KEY) || '';
    return /^[0-9a-f-]{36}$/i.test(value) ? value : undefined;
  } catch { return undefined; }
}
function defaultDate() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), 0)).toISOString().slice(0, 10);
}

export default function ForecastScreen() {
  const setStep = useProductionStore((state) => state.setStep);
  const [parameters, setParameters] = useState<ForecastRunParameters>({ trained_until: defaultDate(), horizon_months: 3, p50_method: 'MA12', min_history_months: 12, random_seed: 42 });
  const [history, setHistory] = useState<ForecastExecutionSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [execution, setExecution] = useState<ForecastExecution | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reused, setReused] = useState(false);
  const alive = useRef(true);
  const working = useRef(false);
  const result = execution?.result;
  const run = result?.run;

  async function page(nextOffset: number, preferred?: string) {
    const response = await apiClient.forecastHistory(20, nextOffset);
    if (!alive.current) return;
    setHistory(response.items); setTotal(response.total); setOffset(nextOffset);
    const id = preferred || response.items[0]?.execution_id;
    if (id) {
      try {
        const detail = await apiClient.getForecast(id);
        if (alive.current) { setExecution(detail); setParameters(detail.parameters); remember(detail.execution_id); }
      } catch (failure) {
        // A deleted/invalid remembered ID never supplies cached results.
        if (preferred && response.items[0] && (failure as { detail?: { code?: string } }).detail?.code === 'FORECAST_NOT_FOUND') {
          const detail = await apiClient.getForecast(response.items[0].execution_id);
          if (alive.current) { setExecution(detail); setParameters(detail.parameters); remember(detail.execution_id); }
        } else { throw failure; }
      }
    } else { setExecution(null); }
  }

  async function refresh(nextOffset = offset, preferred?: string) {
    if (working.current) return;
    working.current = true; setBusy(true); setError(''); setReused(false);
    try { await page(nextOffset, preferred); }
    catch (failure) { if (alive.current) { setExecution(null); setError(errorMessage(failure)); } }
    finally { working.current = false; if (alive.current) setBusy(false); }
  }

  useEffect(() => {
    alive.current = true;
    void refresh(0, lastId());
    return () => { alive.current = false; };
  }, []);

  async function start(event: FormEvent) {
    event.preventDefault();
    if (working.current) return;
    working.current = true; setBusy(true); setError(''); setExecution(null); setReused(false);
    try {
      let reply: ForecastRunReply;
      try { reply = await apiClient.runForecast(parameters); }
      catch (failure) {
        const stored = failure as Partial<ForecastRunReply>;
        if (!stored.execution) throw failure;
        reply = stored as ForecastRunReply;
      }
      if (!alive.current) return;
      setExecution(reply.execution); setReused(reply.reused); remember(reply.execution.execution_id);
      await page(0, reply.execution.execution_id);
    } catch (failure) {
      if (alive.current) setError(errorMessage(failure));
    } finally { working.current = false; if (alive.current) setBusy(false); }
  }

  const choices = execution && !history.some((item) => item.execution_id === execution.execution_id) ? [execution, ...history] : history;
  return <div className="screen">
    <ScreenHeader title="승인 수요 예측" description="승인된 월별 수요만 기준일까지 조회해 예측하고, 입력 지문·모델 버전·결과를 서버에 저장합니다." />
    <form className="panel stack" onSubmit={(event) => void start(event)}>
      <fieldset className="stack" disabled={busy}><legend>예측 실행 조건</legend>
        <label className="field"><span>학습 기준일 (월말)</span><input type="date" required value={parameters.trained_until}
          onChange={(event) => setParameters({ ...parameters, trained_until: event.target.value })} /></label>
        <label className="field"><span>예측 기간 (개월)</span><select aria-label="예측 기간 (개월)" value={parameters.horizon_months}
          onChange={(event) => setParameters({ ...parameters, horizon_months: Number(event.target.value) })}>
          {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}개월</option>)}</select></label>
        <label className="field"><span>P50 방식</span><select aria-label="P50 방식" value={parameters.p50_method}
          onChange={(event) => setParameters({ ...parameters, p50_method: event.target.value as 'MA12' | 'LGBM_L1' })}>
          <option value="MA12">MA12 — 최근 12개월 평균</option><option value="LGBM_L1">LGBM_L1 — LightGBM 점예측</option></select></label>
        <label className="field"><span>최소 이력 (개월)</span><input type="number" required min={12} max={120} value={parameters.min_history_months ?? 12}
          onChange={(event) => setParameters({ ...parameters, min_history_months: Number(event.target.value) })} /></label>
        <label className="field"><span>재현 시드</span><input type="number" required min={0} max={2147483647} value={parameters.random_seed ?? 42}
          onChange={(event) => setParameters({ ...parameters, random_seed: Number(event.target.value) })} /></label>
        <button type="submit" className="button primary">예측 실행</button>
      </fieldset>
      <p className="muted">4~12개월 예측은 검증 범위 밖 경고가 붙습니다. 동일 입력·설정·엔진 버전의 완료 결과는 재사용하며 실패 실행은 재시도합니다.</p>
    </form>
    {busy && <div role="status"><Notice>서버에서 실행 또는 조회 중입니다…</Notice></div>}
    {error && <div role="alert"><Notice tone="bad">{error}</Notice></div>}
    {reused && <Notice>동일 입력의 저장된 실행 결과를 재사용했습니다.</Notice>}
    <section className="panel stack"><h3>예측 실행 이력</h3>
      <button className="button" disabled={busy} onClick={() => void refresh(offset, execution?.execution_id)}>실행 이력 새로고침</button>
      <label className="field"><span>저장된 실행</span><select aria-label="저장된 실행" disabled={busy || !choices.length} value={execution?.execution_id ?? ''}
        onChange={(event) => void refresh(offset, event.target.value)}>
        <option value="">실행 선택</option>{choices.map((item) => <option key={item.execution_id} value={item.execution_id}>
          {item.created_at} · {LABEL[item.status]} · {item.parameters.p50_method} · {item.execution_id}
        </option>)}</select></label>
      {!total && !busy && <p>저장된 실행 이력이 없습니다.</p>}
      <div className="actions"><button className="button" disabled={busy || offset === 0} onClick={() => void refresh(Math.max(0, offset - 20))}>이전 실행 20개</button>
        <span>전체 {total}개</span><button className="button" disabled={busy || offset + 20 >= total} onClick={() => void refresh(offset + 20)}>다음 실행 20개</button></div>
    </section>
    {execution && <section className="panel stack" aria-label="저장된 예측 결과">
      <h3>{LABEL[execution.status]}</h3>
      {execution.status === 'PARTIAL' && <Notice tone="warn">일부 제품이 제외됐습니다. 예측된 제품과 제외 사유를 함께 확인하세요.</Notice>}
      {execution.status === 'DATA_INSUFFICIENT' && <Notice tone="warn">예측에 필요한 데이터가 부족합니다. 생성된 예측으로 간주할 수 없습니다.</Notice>}
      {execution.status === 'INPUT_INVALID' && <Notice tone="bad">입력 조건이 유효하지 않아 예측을 만들지 않았습니다.</Notice>}
      {execution.status === 'FAILED' && <Notice tone="bad">{execution.failure?.message} ({execution.failure?.code}) 예측 결과가 저장되지 않았습니다.</Notice>}
      <dl className="meta-grid">
        <div><dt>실행 ID</dt><dd>{execution.execution_id}</dd></div>
        <div><dt>학습 기준일</dt><dd>{execution.parameters.trained_until}</dd></div>
        <div><dt>예측 기간</dt><dd>{execution.parameters.horizon_months}개월</dd></div>
        <div><dt>P50 방식</dt><dd>{execution.parameters.p50_method}</dd></div>
        <div><dt>입력 행 수</dt><dd>{execution.input_row_count}</dd></div>
        <div><dt>예측 행 수</dt><dd>{execution.forecast_count}</dd></div>
        <div><dt>P80·P90 모델</dt><dd>{execution.quantile_model_version ?? '예측 미생성'}</dd></div>
        <div><dt>데이터 구분</dt><dd>{run?.data_classification ?? '없음'}</dd></div>
      </dl>
      <p>입력 digest: <span className="code">{execution.input_digest}</span></p>
      {result && result.forecasts.length > 0 && <div className="table-scroll"><table>
        <caption>제품별 월 예측 수요 (P50/P80/P90)</caption>
        <thead><tr><th>제품코드</th><th>대상월</th><th>P50</th><th>P80</th><th>P90</th></tr></thead>
        <tbody>{result.forecasts.map((row) => <tr key={`${row.product_id}-${row.target_month}`}>
          <td>{row.product_id}</td><td>{row.target_month}</td><td>{qty(row.p50)}</td><td>{qty(row.p80)}</td><td>{qty(row.p90)}</td>
        </tr>)}</tbody>
      </table></div>}
      {result && <>
        {result.skipped.length > 0 && <div><h4>제외 제품</h4><ul>{result.skipped.map((item) => <li key={item.product_id}>{item.product_id} · {item.reason_code} · {item.detail}</li>)}</ul></div>}
        {result.warnings.length > 0 && <div><h4>경고</h4><ul>{result.warnings.map((item, i) => <li key={i}>{item.code} · {item.detail}</li>)}</ul></div>}
        {result.adjustments.length > 0 && <div><h4>분위수 보정</h4><ul>{result.adjustments.map((item, i) => <li key={i}>{item.product_id} {item.target_month} · {item.code}</li>)}</ul></div>}
        {result.errors.length > 0 && <div><h4>실행 오류</h4><ul>{result.errors.map((item, i) => <li key={i}>{item.code} · {item.loc} · {item.detail}</li>)}</ul></div>}
      </>}
      <details><summary>입력 배치·버전 및 엔진 재현 정보</summary>
        <ul>{execution.input_batches.map((batch) => <li key={batch.batch_id}>{batch.batch_id} · v{batch.batch_version} · {batch.source_sha256}</li>)}</ul>
        <pre style={{ overflowX: 'auto' }}>{JSON.stringify(execution.runtime_identity, null, 2)}</pre>
      </details>
    </section>}
    <Notice tone="info">계획 비교·진단·계획 승인은 별도의 예시입니다. 위 실제 예측 결과와 연결되지 않았습니다.</Notice>
    <div className="actions"><button className="button" onClick={() => setStep('data')}>데이터 등록으로</button>
      <button className="button" onClick={() => setStep('plans')}>별도 계획 예시 보기</button></div>
  </div>;
}
