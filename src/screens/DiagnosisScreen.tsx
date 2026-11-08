import { planResponses } from '../services/fixtures';
import { useProductionStore } from '../store/productionStore';
import { Badge, FeasibilityBadge, Notice, PLAN_LABEL, qty, ScreenHeader } from '../components/ui';
import { Constraint, Feasibility } from '../types/engine';

const SUMMARY: Record<Feasibility, string> = {
  FEASIBLE: '필수 제약을 모두 충족합니다. 권장 제약 미달이 있으면 아래에 표시됩니다.',
  UNVERIFIED: '위반은 없지만 데이터가 부족해 조달 가능 여부 등을 확인하지 못한 제약이 있습니다.',
  INFEASIBLE: '필수 제약 위반이 있어 이 계획은 그대로 실행할 수 없습니다.',
};

const statusBadge = (status: Constraint['status']) =>
  status === 'VIOLATED' ? <Badge tone="bad">위반</Badge> : <Badge tone="warn">미확인</Badge>;

export default function DiagnosisScreen() {
  const { scenario, selectedPlanId, setStep } = useProductionStore();
  const response = planResponses[scenario];
  const plan = response.export.plans.find((item) => item.plan_id === selectedPlanId);
  if (!plan) return null;

  const open = plan.constraints
    .filter((constraint) => constraint.status !== 'SATISFIED')
    .sort((a, b) => Number(b.status === 'VIOLATED') - Number(a.status === 'VIOLATED'));

  return (
    <div className="screen">
      <ScreenHeader
        title="실행 가능성 진단"
        description={`${response.scenario.label} 조건의 ${PLAN_LABEL[plan.plan_type]} 제약 판정입니다.`}
      />

      <section className="panel verdict">
        <div>
          <h3>{PLAN_LABEL[plan.plan_type]}</h3>
          <p>{SUMMARY[plan.feasibility]}</p>
        </div>
        <FeasibilityBadge value={plan.feasibility} />
      </section>

      <section className="panel">
        {open.length === 0 ? (
          <Notice tone="ok">전체 {plan.constraints.length}개 제약을 모두 충족합니다.</Notice>
        ) : (
          <div className="table-scroll">
            <table>
              <caption>
                확인이 필요한 제약 {open.length}건 / 전체 {plan.constraints.length}건
              </caption>
              <thead>
                <tr>
                  <th scope="col">판정</th>
                  <th scope="col">강도</th>
                  <th scope="col">항목</th>
                  <th scope="col">기간</th>
                  <th scope="col" className="num">
                    한도
                  </th>
                  <th scope="col" className="num">
                    사용
                  </th>
                  <th scope="col">원인</th>
                </tr>
              </thead>
              <tbody>
                {open.map((constraint) => (
                  <tr key={constraint.constraint_id}>
                    <td>{statusBadge(constraint.status)}</td>
                    <td>{constraint.strength === 'HARD' ? '필수' : '권장'}</td>
                    <td>{constraint.label}</td>
                    <td>{constraint.period}</td>
                    <td className="num">
                      {qty(constraint.limit_value)} {constraint.unit}
                    </td>
                    <td className="num">
                      {qty(constraint.used_value)} {constraint.unit}
                    </td>
                    <td>{constraint.note ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <details className="panel">
        <summary>제품별 생산계획</summary>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">제품</th>
                <th scope="col">기간</th>
                <th scope="col" className="num">
                  계획수량
                </th>
                <th scope="col" className="num">
                  수요기준
                </th>
                <th scope="col" className="num">
                  기말재고
                </th>
              </tr>
            </thead>
            <tbody>
              {plan.production.map((row) => (
                <tr key={`${row.product_id}-${row.period}`}>
                  <td>{row.product_name}</td>
                  <td>{row.period}</td>
                  <td className="num">
                    {qty(row.planned_qty)} {row.unit}
                  </td>
                  <td className="num">
                    {qty(row.demand_qty)} {row.unit}
                  </td>
                  <td className="num">
                    {qty(row.ending_inventory_qty)} {row.unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <details className="panel">
        <summary>자재 소요량과 부족량</summary>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">자재</th>
                <th scope="col">기간</th>
                <th scope="col" className="num">
                  소요량
                </th>
                <th scope="col" className="num">
                  가용량
                </th>
                <th scope="col" className="num">
                  부족량
                </th>
              </tr>
            </thead>
            <tbody>
              {plan.materials.map((row) => (
                <tr key={`${row.material_id}-${row.period}`}>
                  <td>{row.material_name}</td>
                  <td>{row.period}</td>
                  <td className="num">
                    {qty(row.required_qty)} {row.unit}
                  </td>
                  <td className="num">
                    {qty(row.available_qty)} {row.unit}
                  </td>
                  <td className="num">
                    {qty(row.shortage_qty)} {row.unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <details className="panel">
        <summary>계산 가정</summary>
        <ul className="plain-list">
          {plan.assumptions.map((assumption) => (
            <li key={assumption}>{assumption}</li>
          ))}
        </ul>
      </details>

      <div className="actions">
        <button type="button" className="button" onClick={() => setStep('plans')}>
          다른 안·조건 비교
        </button>
        <button type="button" className="button primary" onClick={() => setStep('approval')}>
          승인 및 출력
        </button>
      </div>
    </div>
  );
}
