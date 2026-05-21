# Docker로 프로토타입 실행

개발 PC에 Node.js/npm을 직접 설치하지 않고 실행하고 싶다면 Docker Desktop을 사용할 수 있습니다.

## 처음 한 번

Docker Desktop을 설치합니다.

- https://www.docker.com/products/docker-desktop/

설치 후 새 터미널에서 확인합니다.

```powershell
docker --version
docker compose version
```

## 웹 프로토타입 실행

프로젝트 폴더에서 아래 명령을 실행합니다.

```powershell
docker compose up
```

첫 실행 때 컨테이너 안에서 `npm install`이 자동으로 실행됩니다. 이후 브라우저에서 접속합니다.

- http://localhost:5173

종료:

```powershell
docker compose down
```

## DB까지 함께 켜야 할 때

지금은 DB 없이 프로토타입을 보는 단계라 기본 실행에는 DB를 포함하지 않았습니다.

나중에 DB가 필요해지면 아래처럼 실행합니다.

```powershell
docker compose --profile db up
```

## 언제 Docker가 좋은가

- PC마다 Node.js/npm 버전이 달라서 실행이 깨지는 것을 줄이고 싶을 때
- 새 개발자가 프로젝트를 빠르게 실행해야 할 때
- 백엔드와 DB까지 붙어서 로컬 환경을 맞춰야 할 때

## 지금 단계의 결론

프로토타입만 보여주는 단계에서는 둘 중 하나면 충분합니다.

- Node.js 설치 가능: `npm install` 후 `npm run dev`
- Node.js 설치 없이 통일 실행: Docker Desktop 설치 후 `docker compose up`

실제 서버 배포는 로컬 개발환경과 별개로 배포 서비스가 빌드합니다. 그래서 클라이언트 확인용 화면 배포만 할 때는 Cloudflare Pages 같은 정적 배포가 더 단순합니다.
