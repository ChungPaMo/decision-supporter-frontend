import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';
import '../styles/screens.css';

type DataType = 'products' | 'materials' | 'boms' | 'inventory' | 'demand';

export default function MasterDataScreen() {
  const [dataType, setDataType] = useState<DataType>('products');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, [dataType, searchQuery]);

  const loadData = async () => {
    try {
      setLoading(true);
      let result;

      switch (dataType) {
        case 'products':
          result = await apiClient.listProducts(searchQuery || undefined);
          break;
        case 'materials':
          result = await apiClient.listMaterials(searchQuery || undefined);
          break;
        case 'boms':
          result = await apiClient.listBOMs();
          break;
        case 'inventory':
          result = await apiClient.listInventory();
          break;
        case 'demand':
          result = await apiClient.listDemand();
          break;
      }

      setItems(result.items || []);
      setError(null);
    } catch (err: any) {
      setError(err.detail?.message || '데이터 로드 실패');
    } finally {
      setLoading(false);
    }
  };

  const typeLabel: Record<DataType, string> = {
    products: '제품',
    materials: '자재',
    boms: 'BOM',
    inventory: '재고',
    demand: '수요',
  };

  return (
    <div className="screen">
      <div className="card">
        <h2>마스터 데이터</h2>

        <div className="form-group">
          <label>데이터 유형</label>
          <select
            value={dataType}
            onChange={(e) => {
              setDataType(e.target.value as DataType);
              setSearchQuery('');
            }}
            className="input"
          >
            <option value="products">제품</option>
            <option value="materials">자재</option>
            <option value="boms">BOM</option>
            <option value="inventory">재고</option>
            <option value="demand">수요</option>
          </select>
        </div>

        {(dataType === 'products' || dataType === 'materials') && (
          <div className="form-group">
            <input
              type="text"
              placeholder="검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input"
            />
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <p>로드 중...</p>
        ) : items.length === 0 ? (
          <p>데이터가 없습니다.</p>
        ) : (
          <div className="table-wrapper">
            {/* 제품 */}
            {dataType === 'products' && (
              <table className="table">
                <thead>
                  <tr>
                    <th>제품코드</th>
                    <th>제품명</th>
                    <th>단위</th>
                    <th>안전재고</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.product_id}>
                      <td>{item.product_id}</td>
                      <td>{item.product_name}</td>
                      <td>{item.base_unit}</td>
                      <td>{item.safety_stock_qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 자재 */}
            {dataType === 'materials' && (
              <table className="table">
                <thead>
                  <tr>
                    <th>자재코드</th>
                    <th>자재명</th>
                    <th>단위</th>
                    <th>안전재고</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.material_id}>
                      <td>{item.material_id}</td>
                      <td>{item.material_name}</td>
                      <td>{item.base_unit}</td>
                      <td>{item.safety_stock_qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* BOM */}
            {dataType === 'boms' && (
              <div className="bom-list">
                {items.map((bom) => (
                  <div key={bom.bom_id} className="bom-item">
                    <h4>{bom.product_id} - {bom.bom_id} (v{bom.bom_version})</h4>
                    <p className="text-small">
                      상태: {bom.status} | 활성: {bom.is_active ? 'O' : 'X'} | 유효기간: {bom.valid_from} ~{' '}
                      {bom.valid_to || '무기한'}
                    </p>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>순번</th>
                          <th>구성유형</th>
                          <th>코드</th>
                          <th>소요량</th>
                          <th>단위</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bom.lines.map((line: any) => (
                          <tr key={line.line_no}>
                            <td>{line.line_no}</td>
                            <td>{line.component_type}</td>
                            <td>{line.component_id}</td>
                            <td>{line.qty_per}</td>
                            <td>{line.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}

            {/* 재고 */}
            {dataType === 'inventory' && (
              <table className="table">
                <thead>
                  <tr>
                    <th>품목유형</th>
                    <th>품목코드</th>
                    <th>기준일</th>
                    <th>현재고</th>
                    <th>할당재고</th>
                    <th>가용재고</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={`${item.item_type}-${item.item_id}-${item.as_of_date}`}>
                      <td>{item.item_type}</td>
                      <td>{item.item_id}</td>
                      <td>{item.as_of_date}</td>
                      <td>{item.on_hand_qty}</td>
                      <td>{item.allocated_qty}</td>
                      <td>{item.available_qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 수요 */}
            {dataType === 'demand' && (
              <table className="table">
                <thead>
                  <tr>
                    <th>제품코드</th>
                    <th>기준월</th>
                    <th>수요량</th>
                    <th>단위</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={`${item.product_id}-${item.period}`}>
                      <td>{item.product_id}</td>
                      <td>{item.period}</td>
                      <td>{item.demand_qty}</td>
                      <td>{item.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
