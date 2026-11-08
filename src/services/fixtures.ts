// 백엔드 계약 저장소의 합성 응답 예시(contracts/examples)를 그대로 쓴다.
// /batches 계열은 기본 설정에서 501 이고 예측·계획 API 는 아직 없으므로, 연결 전까지 이 파일이 서버 역할을 대신한다.
import product01 from '../mocks/01_upload_product_ready.json';
import product02 from '../mocks/02_approve_product.json';
import material03 from '../mocks/03_upload_material_ready.json';
import material04 from '../mocks/04_approve_material.json';
import bom05 from '../mocks/05_upload_bom_ready.json';
import bom06 from '../mocks/06_approve_bom.json';
import inventory07 from '../mocks/07_upload_inventory_ready.json';
import inventory08 from '../mocks/08_approve_inventory.json';
import demand09 from '../mocks/09_upload_demand_mapping_hold.json';
import demand10 from '../mocks/10_revalidate_ready.json';
import demand11 from '../mocks/11_approve_demand.json';
import demand13 from '../mocks/13_upload_demand_has_errors.json';
import products21 from '../mocks/21_list_products.json';
import materials22 from '../mocks/22_list_materials.json';
import boms23 from '../mocks/23_list_boms.json';
import inventory24 from '../mocks/24_list_inventory.json';
import demand25 from '../mocks/25_list_demand.json';
import forecast from '../mocks/forecast_response.json';
import planBase from '../mocks/plan_response.json';
import planWhatIf from '../mocks/plan_response_whatif_demand120.json';
import { BatchDetail, Entity } from '../types/api';
import { ForecastResponse, PlanResponse } from '../types/engine';

const batch = (fixture: unknown) => (fixture as { response: unknown }).response as BatchDetail;

export const uploadFixtures: Record<Entity, BatchDetail> = {
  product: batch(product01),
  material: batch(material03),
  bom: batch(bom05),
  inventory: batch(inventory07),
  monthly_demand: batch(demand09),
};

export const approveFixtures: Record<Entity, BatchDetail> = {
  product: batch(product02),
  material: batch(material04),
  bom: batch(bom06),
  inventory: batch(inventory08),
  monthly_demand: batch(demand11),
};

export const demandRevalidated = batch(demand10);
export const demandWithErrors = batch(demand13);

const items = (fixture: unknown) =>
  (fixture as { response: { items: Array<Record<string, unknown>> } }).response.items;

const flattenBom = (rows: Array<Record<string, unknown>>) =>
  rows.flatMap((bom) =>
    (bom.lines as Array<Record<string, unknown>>).map((line) => ({
      bom_id: bom.bom_id,
      product_id: bom.product_id,
      bom_version: bom.bom_version,
      ...line,
    }))
  );

export const approvedRows: Record<Entity, Array<Record<string, unknown>>> = {
  product: items(products21),
  material: items(materials22),
  bom: flattenBom(items(boms23)),
  inventory: items(inventory24),
  monthly_demand: items(demand25),
};

export const forecastResponse = forecast as unknown as ForecastResponse;

export type ScenarioId = 'BASE' | 'DEMAND_120';

export const planResponses: Record<ScenarioId, PlanResponse> = {
  BASE: planBase as unknown as PlanResponse,
  DEMAND_120: planWhatIf as unknown as PlanResponse,
};
