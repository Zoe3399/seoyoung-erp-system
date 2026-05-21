# 경남차유리 업무관리

경남차유리 자동차 유리 업무를 위한 ERP 프로토타입입니다.

현재 단계는 클라이언트에게 화면 흐름을 빠르게 보여주기 위한 프론트엔드 중심 프로토타입입니다. DB/API는 프로토타입 방향이 확정된 뒤 붙이는 것을 기본 방향으로 둡니다.

## Tech Stack

- Web: React + TypeScript + Vite
- API: NestJS + TypeScript
- Database: PostgreSQL + Prisma
- Package manager: npm workspaces

## Quick Start

로컬 기본 환경값은 `.env`에 들어 있습니다. 실제 운영 비밀값은 넣지 않고, 지금은 프로토타입 실행용 placeholder만 둡니다.

먼저 Node.js LTS를 설치해야 합니다.

- [Windows Node.js/npm 설치](docs/windows-node-setup.md)

처음 한 번만 의존성을 설치합니다.

```powershell
npm install
```

프로토타입 화면 실행:

```powershell
npm run dev
```

기본 주소:

- Web: http://localhost:5173

Node.js/npm을 직접 설치하지 않고 Docker로 실행하려면:

```powershell
docker compose up
```

빌드:

```powershell
npm run build
```

빌드 전 전체 점검:

```powershell
npm run check
```

빌드까지 포함한 테스트:

```powershell
npm run build:test
```

빌드 결과 확인:

```powershell
npm run preview
```

의존성 설치 없이 단독 HTML 프로토타입만 빠르게 확인해야 할 때:

```powershell
npm run dev:static
```

정적 프로토타입 주소:

- http://127.0.0.1:5174

## DB/API

DB는 프로토타입 화면과 업무 흐름이 확정된 뒤 연결합니다.

필요해졌을 때 사용할 명령:

```powershell
npm run dev:api
npm run db:generate
npm run db:migrate
npm run db:studio
```

## Deployment Direction

프로토타입 단계에서는 프론트엔드만 정적 배포하는 방식이 가장 저렴하고 단순합니다.

추천 흐름:

1. 프로토타입: Cloudflare Pages 또는 Vercel에 정적 배포
2. MVP 내부 사용: Cloudflare Pages + Supabase
3. API가 필요해지는 단계: Railway, Render, Fly.io 같은 저가 서버 또는 국내 VPS 검토

현재 프로토타입 기준 배포 설정:

- Root directory: 저장소 루트
- Build command: `npm run build`
- Output directory: `apps/web/dist`

## Design Docs

- [포트폴리오 노션 정리본](docs/portfolio-notion-summary.md)
- [프로젝트 작업 로그](docs/project-work-log.md)
- [MVP Design](docs/mvp-design.md)
- [MVP V2 Design](docs/mvp-v2-design.md)
- [사용자 Flow](docs/user-flow.md)
- [UI/UX 및 사용자 Flow 비교 분석](docs/ui-ux-flow-comparison.md)
- [Client Questionnaire](docs/client-questionnaire.md)
- [Build Check](docs/build-check.md)
- [프론트 컴포넌트](docs/frontend-components.md)
- [Windows Node Setup](docs/windows-node-setup.md)
- [Docker Dev](docs/docker-dev.md)
- [Deployment Options](docs/deployment-options.md)
- [Global ERP Reference Analysis](docs/reference-global-erp-analysis.md)

## Project Structure

```text
apps/
  api/    NestJS backend
  web/    React frontend
packages/
  database/ Prisma schema and generated client
```
