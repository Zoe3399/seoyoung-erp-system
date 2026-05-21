# Windows Node.js/npm 설치

`npm`은 Python의 `pip` 같은 역할을 하는 Node.js 패키지 관리자입니다. 이 프로젝트는 Python이 아니라 Node.js 기반이라서 `pip`가 아니라 `npm`을 사용합니다.

## 증상

아래 메시지가 나오면 Node.js/npm이 설치되어 있지 않거나 PATH에 잡히지 않은 상태입니다.

```text
'npm' is not recognized as an internal or external command
```

## 설치 방법

1. 공식 Node.js 다운로드 페이지로 이동합니다.
   - https://nodejs.org/en/download
2. Windows Installer를 선택합니다.
3. LTS 버전을 설치합니다.
4. 설치 중 `npm package manager`와 `Add to PATH` 옵션이 포함되어 있는지 확인합니다.
5. 설치가 끝나면 열려 있던 명령 프롬프트를 닫고 새로 엽니다.

## 설치 확인

새 명령 프롬프트에서 아래 명령을 실행합니다.

```powershell
node -v
npm -v
```

두 명령 모두 버전이 나오면 정상입니다.

## 프로젝트 실행

프로젝트 폴더로 이동한 뒤 실행합니다.

```powershell
cd C:\Users\박승주\Desktop\seoyoung-erp-system
npm install
npm run check
npm run dev
```

## 자주 헷갈리는 점

아래 명령은 잘못된 명령입니다.

```powershell
npm pip intsall
```

올바른 명령은 아래입니다.

```powershell
npm install
```

그래도 `npm`을 못 찾으면 Node.js를 다시 설치하면서 PATH 옵션이 켜져 있는지 확인합니다.
