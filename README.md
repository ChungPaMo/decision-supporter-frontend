# 수요 계획 관리 시스템 - 프론트엔드

흑백 모노톤으로 설계된 심플한 React 기반 웹 UI입니다.

## 기능

- **파일 업로드**: CSV/Excel 파일을 업로드하여 자동 검증
- **배치 관리**: 업로드된 파일의 검증 상태 추적 및 승인 프로세스
- **마스터 데이터 조회**: 제품, 자재, BOM, 재고, 수요 조회
- **오류 처리**: 열 매핑 보류, 검증 오류 명확한 표시
- **Excel 다운로드**: 계획 결과를 Excel로 출력

## 프로젝트 구조

```
src/
├── App.tsx                 # 메인 애플리케이션
├── screens/               # 화면 컴포넌트
│   ├── UploadScreen.tsx
│   ├── BatchDetailScreen.tsx
│   ├── BatchListScreen.tsx
│   └── MasterDataScreen.tsx
├── services/
│   └── api.ts            # API 클라이언트
├── types/
│   └── api.ts            # TypeScript 타입 정의
└── styles/
    ├── App.css           # 메인 스타일
    └── screens.css       # 화면별 스타일

index.html               # HTML 진입점
vite.config.ts          # Vite 설정
tsconfig.json           # TypeScript 설정
package.json            # 의존성
```

## 필수 API 엔드포인트

| 기능 | 엔드포인트 | 메서드 |
|---|---|---|
| 파일 업로드 | `/batches` | POST |
| 배치 조회 | `/batches` | GET |
| 배치 상세 | `/batches/{batch_id}` | GET |
| 열 재검증 | `/batches/{batch_id}/revalidate` | POST |
| 승인 | `/batches/{batch_id}/approve` | POST |
| 반려 | `/batches/{batch_id}/reject` | POST |
| 제품 조회 | `/products` | GET |
| 자재 조회 | `/materials` | GET |
| BOM 조회 | `/boms` | GET |
| 재고 조회 | `/inventory` | GET |
| 수요 조회 | `/demand/monthly` | GET |
| Excel 다운로드 | `/exports/plans/xlsx` | POST |

## 설치

```powershell
cd decision-supporter-frontend

# 의존성 설치
npm install

# 또는 yarn
yarn install
```

## 개발 서버 실행

### 1. 백엔드 서버 시작

```powershell
cd ../decision-supporter/backend
.\..\venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### 2. 프론트엔드 개발 서버 시작

```powershell
cd decision-supporter-frontend
npm run dev
```

브라우저에서 `http://localhost:5173` 으로 접속합니다.

## CORS 설정

프론트엔드와 백엔드가 다른 포트에서 실행 중이므로, 백엔드의 `.env` 파일에 다음을 추가하세요:

```
CORS_ALLOW_ORIGINS=http://localhost:5173
```

## 빌드

```powershell
npm run build
```

`dist/` 디렉토리에 프로덕션 빌드가 생성됩니다.

## 프리뷰

```powershell
npm run preview
```

## 지원되는 파일 형식

- CSV (UTF-8, 쉼표 구분)
- Excel (.xlsx)
- 최대 파일 크기: 5MB

## 상태 플로우

```
업로드
  ↓
[MAPPING_HOLD] → 열 선택 → 재검증
[HAS_ERRORS]  → 파일 수정 후 재업로드
[READY_FOR_APPROVAL] → 승인/반려
  ↓
[APPROVED] 또는 [REJECTED]
```

## 환경 변수

`.env` 파일에 설정:

```
VITE_API_URL=http://127.0.0.1:8000
```

## 주요 특징

- **흑백 모노톤 디자인**: 심플하고 명확한 UI
- **반응형**: 데스크톱, 태블릿, 모바일 지원
- **명확한 오류 표시**: 검증 오류 위치를 셀 주소로 표시
- **상태 기반 UI**: 각 상태에 맞는 화면 제공
- **TypeScript**: 타입 안전성 확보

## 라이선스

MIT
