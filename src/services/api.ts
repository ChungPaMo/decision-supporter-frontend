import { BatchDetail, Entity, ValidationResult } from '../types/api';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

class ApiClient {
  private async request<T>(
    method: string,
    path: string,
    options?: {
      headers?: Record<string, string>;
      body?: any;
      formData?: FormData;
    }
  ): Promise<T> {
    const url = `${API_BASE}${path}`;
    const config: RequestInit = { method };

    if (options?.formData) {
      config.body = options.formData;
    } else if (options?.body) {
      config.headers = { 'Content-Type': 'application/json', ...options.headers };
      config.body = JSON.stringify(options.body);
    } else {
      config.headers = options?.headers;
    }

    const res = await fetch(url, config);
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: { code: 'NETWORK_ERROR', message: res.statusText } }));
      throw error;
    }
    return res.json();
  }

  // 건강 체크
  async health() {
    return this.request('GET', '/health');
  }

  // 저장 없는 검증. /batches 가 501 인 동안 실제 서버에 붙는 유일한 업로드 경로
  async previewBatch(file: File, entity: Entity): Promise<ValidationResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('entity', entity);
    return this.request('POST', '/ingest/preview', { formData });
  }

  // 파일 업로드 (검증)
  async uploadBatch(
    file: File,
    entity: Entity = 'monthly_demand',
    options?: {
      default_unit?: string;
      column_overrides?: Record<string, string>;
      sheet?: string;
      source_type?: string;
      source_note?: string;
      created_by?: string;
    }
  ): Promise<BatchDetail> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('entity', entity);
    if (options?.default_unit) formData.append('default_unit', options.default_unit);
    if (options?.column_overrides) formData.append('column_overrides', JSON.stringify(options.column_overrides));
    if (options?.sheet) formData.append('sheet', options.sheet);
    if (options?.source_type) formData.append('source_type', options.source_type);
    if (options?.source_note) formData.append('source_note', options.source_note);
    if (options?.created_by) formData.append('created_by', options.created_by);

    return this.request('POST', '/batches', { formData });
  }

  // 배치 목록
  async listBatches(status?: string, limit = 20, offset = 0) {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    params.append('limit', String(limit));
    params.append('offset', String(offset));
    return this.request('GET', `/batches?${params}`);
  }

  // 배치 상세
  async getBatch(batchId: string): Promise<BatchDetail> {
    return this.request('GET', `/batches/${batchId}`);
  }

  // 재검증
  async revalidateBatch(
    batchId: string,
    data: {
      expected_version: number;
      column_overrides?: Record<string, string>;
      default_unit?: string;
      sheet?: string;
    }
  ): Promise<BatchDetail> {
    return this.request('POST', `/batches/${batchId}/revalidate`, { body: data });
  }

  // 승인
  async approveBatch(batchId: string, approved_by: string, expected_result_digest: string): Promise<BatchDetail> {
    return this.request('POST', `/batches/${batchId}/approve`, {
      body: { approved_by, expected_result_digest },
    });
  }

  // 반려
  async rejectBatch(batchId: string, rejected_by: string, reason: string): Promise<BatchDetail> {
    return this.request('POST', `/batches/${batchId}/reject`, {
      body: { rejected_by, reason },
    });
  }

  // 제품 조회
  async listProducts(q?: string, limit = 20, offset = 0) {
    const params = new URLSearchParams();
    if (q) params.append('q', q);
    params.append('limit', String(limit));
    params.append('offset', String(offset));
    return this.request('GET', `/products?${params}`);
  }

  // 자재 조회
  async listMaterials(q?: string, limit = 20, offset = 0) {
    const params = new URLSearchParams();
    if (q) params.append('q', q);
    params.append('limit', String(limit));
    params.append('offset', String(offset));
    return this.request('GET', `/materials?${params}`);
  }

  // BOM 조회
  async listBOMs(productId?: string, activeOnly = true, limit = 20, offset = 0) {
    const params = new URLSearchParams();
    if (productId) params.append('product_id', productId);
    params.append('active_only', String(activeOnly));
    params.append('limit', String(limit));
    params.append('offset', String(offset));
    return this.request('GET', `/boms?${params}`);
  }

  // 재고 조회
  async listInventory(itemType?: string, itemId?: string, limit = 20, offset = 0) {
    const params = new URLSearchParams();
    if (itemType) params.append('item_type', itemType);
    if (itemId) params.append('item_id', itemId);
    params.append('limit', String(limit));
    params.append('offset', String(offset));
    return this.request('GET', `/inventory?${params}`);
  }

  // 월별 수요 조회
  async listDemand(productId?: string, limit = 20, offset = 0) {
    const params = new URLSearchParams();
    if (productId) params.append('product_id', productId);
    params.append('limit', String(limit));
    params.append('offset', String(offset));
    return this.request('GET', `/demand/monthly?${params}`);
  }

  // Excel 다운로드
  async downloadPlanXlsx(planJson: unknown): Promise<string> {
    const res = await fetch(`${API_BASE}/exports/plans/xlsx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(planJson),
    });

    if (!res.ok) {
      const error = await res.json();
      throw error;
    }

    const header = res.headers.get('Content-Disposition') ?? '';
    const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/);
    const asciiMatch = header.match(/filename="([^"]+)"/);
    const filename = utf8Match ? decodeURIComponent(utf8Match[1]) : asciiMatch?.[1] ?? 'DEMO_UNVERIFIED_plan_export.xlsx';

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return filename;
  }
}

export const apiClient = new ApiClient();
