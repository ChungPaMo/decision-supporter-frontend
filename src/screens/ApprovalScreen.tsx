import { useState } from 'react';
import { apiClient } from '../services/api';
import { planResponses } from '../services/fixtures';
import { useProductionStore } from '../store/productionStore';
import { errorMessage, FeasibilityBadge, Notice, PLAN_LABEL, qty, ROLE_CODE, ScreenHeader } from '../components/ui';

const SUMMARY_KPIS = ['TOTAL_PRODUCTION', 'TOTAL_COST', 'END_INVENTORY_AT_P50', 'DEMAND_COVERAGE_P80'];

export default function ApprovalScreen() {
  const { scenario, selectedPlanId, approvals, addApproval, setStep } = useProductionStore();
  const [actor, setActor] = useState('REVIEWER-01');
  const [acknowledged, setAcknowledged] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);
  const [approvedNow, setApprovedNow] = useState(false);

  const response = planResponses[scenario];
  const plan = response.export.plans.find((item) => item.plan_id === selectedPlanId);
  if (!plan) return null;

  const planLabel = PLAN_LABEL[plan.plan_type];
  const actorValid = ROLE_CODE.test(actor);
  const blocked = plan.feasibility === 'INFEASIBLE';
  const needsAck = plan.feasibility === 'UNVERIFIED';
  const canApprove = actorValid && !blocked && (!needsAck || acknowledged) && !approvedNow;

  const approve = () => {
    addApproval({
      at: new Date().toLocaleString('ko-KR'),
      planLabel,
      scenarioLabel: response.scenario.label,
      actor,
      inputDigest: response.input_digest,
    });
    setApprovedNow(true);
  };

  const download = async () => {
    setExporting(true);
    setExportResult(null);
    try {
      const filename = await apiClient.downloadPlanXlsx(response.export);
      setExportResult({ tone: 'ok', text: `${filename} 파일을 내려받았습니다.` });
    } catch (error) {
      setExportResult({ tone: 'bad', text: errorMessage(error) });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="screen">
      <ScreenHeader
        title="승인 및 Excel 출력"
        description="선택한 계획을 확인하고 승인 기록을 남긴 뒤 비교 결과를 Excel 로 내려받습니다."
      />

      <section className="panel stack">
        <div className="panel-heading">
          <div>
            <h3>{planLabel}</h3>
            <p className="muted">{response.scenario.label} 조건</p>
          </div>
          <FeasibilityBadge value={plan.feasibility} />
        </div>
        <dl className="meta-grid">
          {SUMMARY_KPIS.map((code) => {
            const kpi = plan.kpis.find((item) => item.code === code);
            return (
              <div key={code}>
                <dt>{kpi?.label}</dt>
                <dd>
                  {qty(kpi?.value)} {kpi?.value !== null ? kpi?.unit : ''}
                </dd>
              </div>
            );
          })}
        </dl>
      </section>

      <section className="panel stack">
        <h3>계획 승인</h3>
        {blocked && <Notice tone="bad">실행 불가 계획은 승인할 수 없습니다. 다른 안이나 조건을 선택하세요.</Notice>}
        {needsAck && (
          <label className="check">
            <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} />
            <span>미확인 제약을 진단 화면에서 확인했고, 이를 감수하고 승인합니다.</span>
          </label>
        )}
        <label className="field narrow">
          <span>승인자 역할 코드</span>
          <input value={actor} aria-invalid={!actorValid} onChange={(event) => setActor(event.target.value)} />
          {!actorValid && <small className="field-error">영문·숫자로 된 역할 코드만 입력할 수 있습니다.</small>}
        </label>
        {approvedNow && <Notice tone="ok">{planLabel} 승인이 기록되었습니다.</Notice>}
        <div className="actions">
          <button type="button" className="button primary" disabled={!canApprove} onClick={approve}>
            이 계획 승인
          </button>
        </div>
        {approvals.length > 0 && (
          <div className="table-scroll">
            <table>
              <caption>승인 기록</caption>
              <thead>
                <tr>
                  <th scope="col">일시</th>
                  <th scope="col">계획안</th>
                  <th scope="col">조건</th>
                  <th scope="col">승인자</th>
                </tr>
              </thead>
              <tbody>
                {approvals.map((record, index) => (
                  <tr key={index}>
                    <td>{record.at}</td>
                    <td>{record.planLabel}</td>
                    <td>{record.scenarioLabel}</td>
                    <td>{record.actor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted">계획 승인 저장 API 가 아직 없어 이 기록은 현재 브라우저 세션에만 남습니다.</p>
      </section>

      <section className="panel stack">
        <h3>Excel 출력</h3>
        <Notice tone="warn">
          이 파일은 DEMO/UNVERIFIED 이며 공식 문서가 아닙니다. 승인 여부와 관계없이 계획안 전체의 비교 결과가 담깁니다.
        </Notice>
        {exportResult && <Notice tone={exportResult.tone}>{exportResult.text}</Notice>}
        <div className="actions">
          <button type="button" className="button" onClick={() => setStep('diagnosis')}>
            이전
          </button>
          <button type="button" className="button primary" disabled={exporting} onClick={download}>
            {exporting ? '생성 중…' : 'Excel 다운로드'}
          </button>
        </div>
      </section>
    </div>
  );
}
