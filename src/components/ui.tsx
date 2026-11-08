import { ReactNode } from 'react';
import { BatchStatus, Entity } from '../types/api';
import { Feasibility, PlanType } from '../types/engine';

export const ENTITY_LABEL: Record<Entity, string> = {
  product: '제품',
  material: '자재',
  bom: 'BOM',
  inventory: '재고',
  monthly_demand: '월별 수요',
};

export const PLAN_LABEL: Record<PlanType, string> = {
  BASELINE: '기준형',
  STABLE: '안정형',
  COST_SAVING: '비용절감형',
};

export const PLAN_BASIS: Record<PlanType, string> = {
  BASELINE: 'P50 수요 · 잔업 허용',
  STABLE: 'P80 수요 · 잔업 허용',
  COST_SAVING: 'P50 수요 · 잔업 없이 선생산',
};

const BATCH_STATUS: Record<BatchStatus, { label: string; tone: Tone }> = {
  MAPPING_HOLD: { label: '열 지정 필요', tone: 'warn' },
  HAS_ERRORS: { label: '오류 있음', tone: 'bad' },
  READY_FOR_APPROVAL: { label: '승인 대기', tone: 'info' },
  APPROVED: { label: '승인됨', tone: 'ok' },
  REJECTED: { label: '반려됨', tone: 'muted' },
};

const FEASIBILITY: Record<Feasibility, { label: string; tone: Tone }> = {
  FEASIBLE: { label: '실행 가능', tone: 'ok' },
  UNVERIFIED: { label: '확인 필요', tone: 'warn' },
  INFEASIBLE: { label: '실행 불가', tone: 'bad' },
};

type Tone = 'ok' | 'warn' | 'bad' | 'info' | 'muted';

export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export const BatchBadge = ({ status }: { status: BatchStatus }) => (
  <Badge tone={BATCH_STATUS[status].tone}>{BATCH_STATUS[status].label}</Badge>
);

export const FeasibilityBadge = ({ value }: { value: Feasibility }) => (
  <Badge tone={FEASIBILITY[value].tone}>{FEASIBILITY[value].label}</Badge>
);

export function Notice({ tone = 'info', children }: { tone?: Tone; children: ReactNode }) {
  return <div className={`notice notice-${tone}`}>{children}</div>;
}

export function ScreenHeader({ title, description }: { title: string; description: string }) {
  return (
    <header className="screen-header">
      <h2>{title}</h2>
      <p>{description}</p>
    </header>
  );
}

// 수량은 문자열 그대로 두고 천 단위 구분만 넣는다. 값이 없으면 0 이 아니라 미산출이다.
export function qty(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '미산출';
  const [whole, fraction] = String(value).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fraction ? `${grouped}.${fraction}` : grouped;
}

export function errorMessage(error: unknown): string {
  const detail = (error as { detail?: { code?: string; message?: string } })?.detail;
  if (detail?.message) return `${detail.message} (${detail.code})`;
  return '서버에 연결할 수 없습니다. 백엔드 실행 여부와 CORS_ALLOW_ORIGINS 설정을 확인해 주세요.';
}

export const ROLE_CODE = /^[A-Za-z0-9][A-Za-z0-9_.-]{1,59}$/;
