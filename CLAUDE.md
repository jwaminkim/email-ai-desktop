# CLAUDE.md — email-ai-desktop 프로젝트 규칙

이 문서는 email-ai-desktop(Gmail 이메일 AI 분석/답장 도우미, Electron + React + TypeScript) 프로젝트에서
Claude Code가 따라야 하는 규칙입니다. 모든 세션에서 자동으로 로드되며, 사용자가 별도로 다시 지시하지
않아도 항상 적용합니다.

**프로젝트 구조 요약**:
- `electron/` — 메인 프로세스(Node/CommonJS, `tsc -p electron`으로 `dist-electron/`에 컴파일). Gmail API 연동(`gmail.ts`), AI 프로바이더(`providers/`), IPC 핸들러(`main.ts`), `preload.ts`.
- `src/` — 렌더러(React + Vite). `global.d.ts`에 `window.api` 타입 계약 정의.
- IPC 계약은 항상 3곳이 함께 맞아야 함: `electron/main.ts`(핸들러) ↔ `electron/preload.ts`(브릿지) ↔ `src/global.d.ts`(타입).
- 현재 이 폴더는 git 저장소가 아님(2026-08-12 기준). git 초기화 전까지 "브랜치" 기록은 생략한다.

---

## 규칙 0. 전역 공통 규칙 참조 (모든 프로젝트 공통)

아래 전역 규칙 파일을 먼저 읽고 그 내용을 우선 적용한다. 이 파일(프로젝트 CLAUDE.md)의 규칙은
전역 규칙을 보완/재정의(override)하는 용도이며, 두 문서가 충돌하면 이 프로젝트 CLAUDE.md가 우선한다.

@D:\ClaudeCode Output\Global\CLAUDE.md

전역 규칙 파일에는 응답 절차(분석→설계→계획→승인→구현→테스트), 실수 로그 관리 방식, 시니어 리뷰 체크리스트,
서브에이전트 모델 매핑, effort 자동 조절, 프로젝트 외부 산출물 저장 경로 등 모든 프로젝트에 공통 적용되는
규칙이 정의되어 있다. 아래 규칙들은 이 프로젝트에만 적용되는 세부/보충 사항이다.

---

## 규칙 1. 응답 기본 절차 — 이 프로젝트 보충 사항

기본 절차(분석 → 설계 → 계획 → 승인 → 구현 → 테스트)는 전역 규칙 1을 그대로 따른다. 이 프로젝트에서
단계별로 참고할 사항만 아래에 보충한다.

- **분석**: `electron/main.ts`·`preload.ts`, `src/global.d.ts`(IPC 타입 계약), 관련 `src` 컴포넌트를 우선 확인한다.
- **설계**(medium 이상): IPC 계약을 바꾸는 작업이면 `main.ts`/`preload.ts`/`global.d.ts` 3곳의 변경 지점을 먼저 정리하고 시작한다. 새 AI Provider 추가처럼 high 난이도인 경우 옵션별 트레이드오프까지 제시한 뒤 방향을 확정한다.
- **테스트**: `npm run dev`로 확인, 패키징 검증이 필요하면 `npm run dist:win`. 요청 전에는 임의로 빌드/배포하지 않는다.

작업 완료 후에는 이 프로젝트의 handoff.md(전역 handoff.md 템플릿 형식)에 기록한다.

---

## 규칙 2. 실수/이슈 기록

전역 규칙 2를 따른다 — 실수/이슈는 이 프로젝트 루트의 [mistake-log.md](mistake-log.md)에 기록하고,
작업 전 먼저 확인해서 같은 실수를 반복하지 않는다.

---

## 규칙 3. 시니어 개발자 관점 리뷰 — 이 프로젝트 추가 체크리스트

전역 규칙 3의 공통 체크리스트에 더해, 이 프로젝트에서는 아래도 함께 확인한다.

- **IPC 계약 동기화**: `electron/main.ts`(핸들러 시그니처) ↔ `electron/preload.ts`(노출 함수) ↔ `src/global.d.ts`(`window.api` 타입)가 서로 어긋나지 않는가.
- **ESM-only 패키지 주의**: `electron/`은 CommonJS(`tsc -p electron`, `module: CommonJS`)로 컴파일됨. `"type": "module"`인 ESM 전용 패키지(예: `@anthropic-ai/claude-agent-sdk`)를 정적 `import`로 쓰면 런타임에 `ERR_REQUIRE_ESM`이 발생하므로, 함수 내부에서 동적 `import()`로 불러온다.
- **새 AI Provider 추가 시** `electron/providers/index.ts`의 switch, `electron/providers/types.ts`의 `ProviderId`/`ProviderSettings` 갱신이 함께 되었는가 (하나만 빠뜨리면 조용히 실패).
- **Gmail API 데이터 처리**: 첨부파일/인라인 이미지 등 base64url ↔ 표준 base64 변환이 필요한 지점을 놓치지 않았는가. `format: "full"` 요청 시 payload 트리를 재귀 순회해야 하는 부분(멀티파트 메일)을 빠뜨리지 않았는가.
- **신뢰할 수 없는 외부 콘텐츠 렌더링**: 메일 HTML처럼 외부에서 온 콘텐츠를 렌더러에 그대로 꽂을 때 XSS/스크립트 실행 경로가 열려있지 않은가 (예: `<iframe sandbox>`에 `allow-scripts`를 넣지 않았는지 확인).
- **패키징 영향**: `package.json`의 `build.files`(`dist/**`, `dist-electron/**`)에 새로 추가한 리소스가 포함되는가, `electron-builder` 결과물에 영향이 없는가.
- **null/예외 처리 누락**: 헤더 필드 부재(`From`/`To`/`Message-ID` 없음), Gmail 인증 미완료, 프로바이더 미설정 등 "조용히 실패"할 수 있는 경로가 없는가.

---

## 규칙 4. 서브에이전트 모델 사용 규칙

전역 규칙 4를 그대로 따른다 (이 프로젝트만의 보충 사항 없음).

---

## 규칙 5. 작업 난이도에 따른 effort 자동 조절 — 이 프로젝트 기준 예시

전역 규칙 5의 기준을 이 프로젝트에 대입하면 대략 아래와 같다.

- **low**: 단순 조회, 문구/스타일 수정, 설정값 1~2개 변경 등
- **medium**: 단일 화면 기능 추가/버그 수정, IPC 계약 변경처럼 electron+preload+타입+컴포넌트 여러 파일에 걸친 일반적인 변경
- **high**: 새 AI Provider 추가, Gmail 인증/OAuth 흐름 변경, 아키텍처 영향이 있는 구조 변경

---

## 규칙 6. 프로젝트와 별개인 산출물의 저장 위치

전역 규칙 6을 따른다 — 이 프로젝트의 산출물 경로는 아래와 같다.

```
D:\ClaudeCode Output\email-ai-desktop\
```

---

## 참고: 작업 이력

모든 작업 요청은 이 프로젝트 루트의 [handoff.md](handoff.md)에 기록된다 (규칙 1). 작성 형식은
전역 템플릿(`D:\ClaudeCode Output\Global\handoff.md`)을 따른다.
