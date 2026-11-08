import { forecastResponse } from '../services/fixtures';
import { useProductionStore } from '../store/productionStore';
import { Notice, qty, ScreenHeader } from '../components/ui';

export default function ForecastScreen() {
  const setStep = useProductionStore((state) => state.setStep);
  const { run, forecasts, skipped, adjustments, warnings, status } = forecastResponse;

  const meta: Array<[string, string]> = [
    ['학습 기준일', run.trained_until],
    ['예측 기간', `${run.horizon_months}개월`],
    ['P50 방식', run.p50_method],
    ['P80·P90 모델', run.quantile_model_version],
    ['데이터 구분', run.data_classification],
    ['실행 ID', run.run_id],
  ];

  return (
    <div className="screen">
      <ScreenHeader
        title="수요 예측 확인"
        description="승인된 월별 수요로 만든 제품별 예측입니다. 계획안은 이 분위수를 기준으로 계산됩니다."
      />

      {status === 'PARTIAL' && (
        <Notice tone="warn">일부 제품은 이력이 부족해 예측에서 제외되었습니다. 제외 제품은 아래에서 확인하세요.</Notice>
      )}

      <section className="panel">
        <dl className="meta-grid">
          {meta.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="panel">
        <div className="table-scroll">
          <table>
            <caption>제품별 월 예측 수요 (P50 중앙값 · P80·P90 상위 분위)</caption>
            <thead>
              <tr>
                <th scope="col">제품코드</th>
                <th scope="col">대상월</th>
                <th scope="col" className="num">
                  P50
                </th>
                <th scope="col" className="num">
                  P80
                </th>
                <th scope="col" className="num">
                  P90
                </th>
              </tr>
            </thead>
            <tbody>
              {forecasts.map((row) => (
                <tr key={`${row.product_id}-${row.target_month}`}>
                  <td>{row.product_id}</td>
                  <td>{row.target_month}</td>
                  <td className="num">{qty(row.p50)}</td>
                  <td className="num">{qty(row.p80)}</td>
                  <td className="num">{qty(row.p90)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel stack">
        <h3>예측에서 알아야 할 점</h3>
        <ul className="plain-list">
          {skipped.map((item) => (
            <li key={item.product_id}>
              <strong>{item.product_id} 제외</strong> {item.detail}
            </li>
          ))}
          {adjustments.map((item) => (
            <li key={`${item.product_id}-${item.target_month}`}>
              <strong>
                {item.product_id} {item.target_month} 보정
              </strong>{' '}
              분위수가 뒤집혀 P80 을 P50 이상으로 맞췄습니다.
            </li>
          ))}
          {warnings.map((item) => (
            <li key={item.code}>
              <strong>{item.code}</strong> {item.detail}
            </li>
          ))}
        </ul>
      </section>

      <div className="actions">
        <button type="button" className="button" onClick={() => setStep('data')}>
          이전
        </button>
        <button type="button" className="button primary" onClick={() => setStep('plans')}>
          생산계획 비교
        </button>
      </div>
    </div>
  );
}
