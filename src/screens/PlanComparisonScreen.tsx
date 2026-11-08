import { planResponses, ScenarioId } from '../services/fixtures';
import { useProductionStore } from '../store/productionStore';
import { FeasibilityBadge, Notice, PLAN_BASIS, PLAN_LABEL, qty, ScreenHeader } from '../components/ui';

const KPI_GROUPS: Array<{ title: string; codes: string[] }> = [
  { title: '생산·수요', codes: ['TOTAL_PRODUCTION', 'PLANNED_DEMAND', 'END_INVENTORY_AT_P50', 'OVERTIME_HOURS'] },
  { title: '위험', codes: ['DEMAND_COVERAGE_P80', 'STOCKOUT_QTY', 'SAFETY_STOCK_SHORTFALL', 'MATERIAL_SHORTAGE_ITEMS'] },
  { title: '비용', codes: ['TOTAL_COST', 'MATERIAL_COST', 'REGULAR_LABOR_COST', 'OVERTIME_COST', 'HOLDING_COST'] },
];

const SCENARIOS: Array<{ id: ScenarioId; label: string }> = [
  { id: 'BASE', label: '기본 조건' },
  { id: 'DEMAND_120', label: '수요 +20%' },
];

export default function PlanComparisonScreen() {
  const { scenario, setScenario, selectedPlanId, selectPlan, setStep } = useProductionStore();
  const response = planResponses[scenario];
  const { plans, horizon } = response.export;
  const kpiOf = (planIndex: number, code: string) => plans[planIndex].kpis.find((kpi) => kpi.code === code);
  const causes = (planId: string) =>
    response.comparison.infeasibility_reasons.find((reason) => reason.plan_id === planId)?.causes ?? [];

  return (
    <div className="screen">
      <ScreenHeader
        title="생산계획 비교"
        description={`${horizon.period_from} ~ ${horizon.period_to} 계획안 3개입니다. 시스템은 순위를 매기지 않으며 선택은 담당자가 합니다.`}
      />

      <div className="segmented" role="group" aria-label="계산 조건">
        {SCENARIOS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={scenario === item.id}
            onClick={() => setScenario(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <section className="panel">
        <div className="table-scroll">
          <table className="compare">
            <caption className="visually-hidden">계획안별 지표 비교</caption>
            <thead>
              <tr>
                <th scope="col">지표</th>
                {plans.map((plan) => (
                  <th key={plan.plan_id} scope="col" className={plan.plan_id === selectedPlanId ? 'selected' : ''}>
                    <label className="plan-choice">
                      <input
                        type="radio"
                        name="plan"
                        checked={plan.plan_id === selectedPlanId}
                        onChange={() => selectPlan(plan.plan_id)}
                      />
                      <span>
                        <strong>{PLAN_LABEL[plan.plan_type]}</strong>
                        <small>{PLAN_BASIS[plan.plan_type]}</small>
                      </span>
                    </label>
                    <FeasibilityBadge value={plan.feasibility} />
                  </th>
                ))}
              </tr>
            </thead>
            {KPI_GROUPS.map((group) => (
              <tbody key={group.title}>
                <tr className="group-row">
                  <th colSpan={plans.length + 1} scope="colgroup">
                    {group.title}
                  </th>
                </tr>
                {group.codes.map((code) => (
                  <tr key={code}>
                    <th scope="row">
                      {kpiOf(0, code)?.label} <small>{kpiOf(0, code)?.unit}</small>
                    </th>
                    {plans.map((plan, index) => (
                      <td key={plan.plan_id} className={`num ${plan.plan_id === selectedPlanId ? 'selected' : ''}`}>
                        {qty(kpiOf(index, code)?.value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            ))}
            <tbody>
              <tr className="group-row">
                <th colSpan={plans.length + 1} scope="colgroup">
                  판정 사유
                </th>
              </tr>
              <tr>
                <th scope="row">불가·미확인 원인</th>
                {plans.map((plan) => (
                  <td key={plan.plan_id} className={plan.plan_id === selectedPlanId ? 'selected' : ''}>
                    {causes(plan.plan_id).length === 0
                      ? '없음'
                      : `${causes(plan.plan_id)[0].note}${
                          causes(plan.plan_id).length > 1 ? ` 외 ${causes(plan.plan_id).length - 1}건` : ''
                        }`}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {response.warnings.map((warning) => (
        <Notice key={warning.code}>{warning.detail}</Notice>
      ))}

      <div className="actions">
        <button type="button" className="button" onClick={() => setStep('forecast')}>
          이전
        </button>
        <button type="button" className="button primary" disabled={!selectedPlanId} onClick={() => setStep('diagnosis')}>
          {selectedPlanId ? '선택한 계획 진단' : '계획안을 선택하세요'}
        </button>
      </div>
    </div>
  );
}
