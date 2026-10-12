# 프렙 카페 운영 기록

현재 구현 범위는 개발 계획의 EPIC 1·2다. 판매 조회·추가·정정, 메뉴 수익성, 일·월 손익, 운영비 추가·정정, 재료 입고·폐기, 기준일 잔량과 변동 내역이 실제 자료와 브라우저 저장소로 동작한다. EPIC 1은 사용자 승인으로 완료했으며 EPIC 2는 자동 검사 통과 후 사용자 확인 대기다.

## 실행

Node.js 24.x에서 프로젝트 폴더를 열고 다음 명령을 실행한다.

```powershell
npm ci --cache .npm-cache
npm run dev
```

브라우저에서 `http://127.0.0.1:5173/`을 연다. 같은 주소·브라우저 프로필로 다시 접속해야 저장한 기록을 이어 볼 수 있다. `localhost` 등 다른 주소는 다른 보관소다. 서버를 종료해도 브라우저 기록이 자동 삭제되지는 않는다.

## 검사

```powershell
npm run release
```

계산·저장 검사와 타입 검사, 실행 파일 생성을 수행한다. 실제 브라우저 검사는 아래 순서로 수행한다. 검사 브라우저는 운영 브라우저와 분리된 임시 환경을 사용한다.

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path (Get-Location) '.playwright'
npx playwright install chromium
npm run test:e2e
```

자동 검사 결과와 사용자 직접 확인은 `docs/05_테스트결과.md`에 구분해 기록한다. `docs/04_개발계획.md`의 EPIC 상태는 사용자 확인 후 변경한다.

## 자료·사용 범위

초기 공개 자료는 `date/매장운영데이터.json`과 동일한 가상 샘플 하나다. 엑셀을 함께 가져오지 않는다. IndexedDB 저장소 이름은 `prep-cafe-operations`이며 운영 자료를 원격 서비스로 전송하지 않는다. 배포한 앱이 실제 운영 백업을 공개 파일로 포함하지 않도록 관리해야 한다.

기간 손익은 `/#/dashboard`, 비용 관리는 `/#/expenses`, 입고·폐기 등록은 `/#/inventory`에서 사용할 수 있다. 운영비는 귀속일에 반영하고 월 계획을 중복 차감하지 않는다. 입고·폐기는 수량만 바꾸며 비용을 자동 추가하지 않는다. 실제 재고 입력·전체 백업·복원과 GitHub 보관·Vercel 배포는 EPIC 3에 남아 있다.

기준 문서: PRD `docs/01_PRD.md`, FRD `docs/02_FRD.md`, TRD `docs/03_TRD.md`, 개발 계획 `docs/04_개발계획.md`.
