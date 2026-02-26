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

### 4. 서버 실행 및 중지

```
bash start.sh # 실행
bash stop.sh # 중지
```

브라우저에서 https://viva-youth.meninblox.com/ 접속

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

---

# Ailix XR 힐링룸 PoC 서비스 설명서

링크: https://viva-youth.meninblox.com/

---

## 1. 서비스 개요

XR 힐링룸에서 상담을 마친 내담자와 AI(Ailix)가 실시간 음성 대화를 통해 감정 상태를 파악하고, 맞춤형 힐링 영상을 추천하는 서비스입니다.

---

## 2. 화면 구성

### 내담자 화면 (좌측)
- Aurora 오브제: AI 상태를 시각적으로 표현 (대기/듣는중/말하는중)
- Live 표시: 세션 활성화 상태

### 운영자 화면 (우측)
- 세션 단계 표시 (맞이→마음살핌→변화느끼기→쉼안내→마무리)
- AI-사용자 대화 내용 실시간 표시
- 세션 시작/종료, 일시정지/재개 버튼
- 디버그 로그 (단계 전환, AI 의도 요약)

---

## 3. 사용 AI 모델

- 실시간 음성 대화: Gemini 2.5 Flash Native Audio
- 단계 분석/요약: Gemini 2.5 Flash

---

## 4. 대화 흐름 (5단계)

1. 맞이: 환영 인사 + 상담에서 어떤 이야기 나눴는지 질문
2. 마음 살핌: 현재 감정 상태 파악 (후련한지, 무거운지)
3. 변화 느끼기: 처음 왔을 때와 지금 비교
4. 쉼 안내: 감정에 맞는 힐링 영상 추천
   - 후련함 → 희망의 바다
   - 불안/우울 → 치유의 숲
   - 복합감정 → 비 오는 정원
5. 마무리: 따뜻한 배웅 인사

---

## 5. 운영 방법

1. [세션 시작] 클릭 → AI가 자동으로 대화 시작
2. 내담자와 AI 대화 진행 (단계 자동 전환)
3. AI가 힐링 영상 추천하면 → [일시정지] 클릭 → 외부 영상 재생
4. 영상 종료 후 → [재개] 클릭 → AI가 마무리 인사
5. [세션 종료] 클릭
