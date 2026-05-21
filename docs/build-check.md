# 빌드 전 점검 스크립트

프로토타입을 클라이언트에게 보여주거나 배포하기 전에 아래 명령으로 기본 오류를 먼저 확인합니다.

## 처음 한 번

```powershell
npm install
```

## 빠른 사전 점검

```powershell
npm run check
```

확인하는 내용:

- Node.js 버전
- `package.json` 문법과 필수 script
- `.env.example`, `.env` 기본 항목
- 웹 프로토타입 주요 파일 존재 여부
- TypeScript 타입 체크

## 빌드까지 한 번에 테스트

```powershell
npm run build:test
```

이 명령은 사전 점검 후 실제 프론트엔드 빌드까지 실행합니다.

## 실제 빌드

```powershell
npm run build
```

`npm run build`를 실행하면 자동으로 최소 사전 점검이 먼저 실행됩니다. 문제가 있으면 빌드 전에 멈춥니다.

## 배포 서비스 설정

Cloudflare Pages 같은 정적 배포 서비스에서는 아래처럼 설정합니다.

- Root directory: 저장소 루트
- Build command: `npm run build`
- Output directory: `apps/web/dist`

DB/API가 붙기 전까지는 이 방식으로 화면 프로토타입만 저렴하게 공유할 수 있습니다.
