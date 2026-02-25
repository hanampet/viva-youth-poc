# Ailix Voice - AI 심리 케어 PoC

AI 기반 음성 심리 상담 데모 애플리케이션

## 기술 스택

- **Frontend:** React + TypeScript + Vite
- **Styling:** Tailwind CSS v4 + Framer Motion
- **Voice AI:** Gemini 2.5 Flash Native Audio (WebSocket)
- **Port:** 9400

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

```bash
cp .env.example .env
```

`.env` 파일을 열고 Gemini API 키를 설정:

```
VITE_GEMINI_API_KEY=your_api_key_here
```

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:9400 접속

## 사용 방법

1. 브라우저에서 마이크 권한 허용
2. "세션 시작" 버튼 클릭
3. 음성으로 AI와 대화
4. 운영자 패널에서 세션 단계 모니터링
5. "영상 재생" 버튼으로 힐링 세션 전환 가능

## 프로젝트 구조

```
src/
├── components/
│   ├── layout/          # Header, ClientView, OperatorView
│   ├── client/          # HealingObject (AI Orb)
│   └── operator/        # StateFlow, ChatLog, DebugConsole, ControlPanel
├── hooks/               # useGeminiLive, useAudioCapture, useAudioPlayback
├── contexts/            # SessionContext (전역 상태)
├── lib/
│   ├── gemini/          # WebSocket 클라이언트
│   └── audio/           # 오디오 캡처/재생
├── types/               # TypeScript 타입 정의
├── constants/           # 세션 단계, 시스템 프롬프트
└── styles/              # Tailwind CSS 설정
```

## 세션 단계

1. **IDLE** - 대기
2. **WELCOME** - 환영/인사
3. **SATISFACTION_CHECK** - 만족도 확인
4. **EMOTION_RELEASE** - 감정 해소
5. **DEEP_EXPLORATION** - 심층 탐색
6. **REFLECTION** - 성찰
7. **HEALING_PREP** - 힐링 준비
8. **OUTRO** - 맺음말

## 빌드

```bash
npm run build
```

빌드 결과물은 `dist/` 디렉토리에 생성됩니다.
