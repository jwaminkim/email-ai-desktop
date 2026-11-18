# 이메일 AI 답장 도우미 (v2 - Gmail 스타일)

Gmail처럼 사이드바/목록/읽기창 구조로, 메일을 읽고 [AI 답장 초안 생성] 버튼을 누르면
분석과 답장 초안이 만들어지고, 사람이 검토·수정한 뒤 [보내기]로 실제 발송하는 앱입니다.

## 첫 실행 순서 (강제)
1. Gmail 로그인
2. AI 모델 선택/설정 (Ollama / Claude API키 / Claude Pro·Max 구독(개인용) / GPT / Gemini)
3. 받은메일 화면 진입

## 개발 환경 실행
```bash
npm install
npm run dev
```

## 배포용 설치파일 만들기
```bash
npm run dist:win   # release/ 에 .exe 생성
npm run dist:mac    # release/ 에 .dmg 생성 (Mac에서 실행)
```

## Google Cloud 설정 (관리자가 한 번만)
1. https://console.cloud.google.com → 새 프로젝트
2. Gmail API 활성화
3. OAuth 클라이언트 ID 생성 (유형: 데스크톱 앱) → Client ID/Secret 발급
4. **OAuth 동의 화면에서 테스트 사용자로 실제 사용할 동료들의 Google 계정을 추가**
   (gmail.send 권한 때문에, 검증 안 된 앱은 테스트 사용자로 등록된 계정만 로그인 가능. 최대 100명)
5. **`electron/googleCredentials.ts` 파일을 열어서 발급받은 Client ID/Secret을 입력** 후 저장
   → 이렇게 하면 사용자는 아무것도 입력할 필요 없이 "Gmail로 로그인" 버튼만 누르면 됩니다.
   (이 값을 채운 뒤에 `npm run dist:win`/`dist:mac`으로 빌드해야 값이 설치파일에 포함됩니다)

## 자세한 사용법
`매뉴얼.html` 파일을 열어보세요 — 개발자용 실행법과 최종 사용자용 사용법이 모두 정리되어 있습니다.
