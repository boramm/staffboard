# 📊 교직원 현황판 (Staff Allocation Dashboard)

교직원 인사배치 시뮬레이션 및 현황 관리 시스템

🔗 **[라이브 데모](https://boramm.github.io/staffboard/)** ← 클릭해서 바로 확인!

---

## ✨ 주요 기능

- **시각화 보드**: 20×13 그리드로 260명 이상 관리 가능
- **자연어 명령**: "홍길동을 학생처로 이동" 같은 텍스트 명령
- **드래그 앤 드롭**: 마우스로 빠른 재배치
- **시나리오 관리**: 여러 인사이동 안을 저장하고 비교
- **인쇄 출력**: A1 사이즈 보고서 생성

## 📸 스크린샷

![현황판 메인 화면](img/screenshot.png)

*샘플 데이터로 구성된 교직원 배치 현황*

---

## 🚀 빠른 시작

### 옵션 1: 라이브 데모 (권장)
👉 **[여기를 클릭하세요](https://boramm.github.io/staffboard/)**

### 옵션 2: 로컬 실행
```bash
git clone https://github.com/boramm/staffboard.git
cd staffboard

# 웹서버 실행 (CORS 에러 방지)
python3 -m http.server 8000

# 브라우저에서 http://localhost:8000 접속
```

---

## 🛠️ 기술 스택

- Vanilla JavaScript (ES6+)
- HTML5 Drag & Drop API
- CSS Grid Layout
- LocalStorage

---

## 🎯 프로젝트 목적

실무 HR 시스템 개발 역량을 보여주기 위한 포트폴리오 프로젝트입니다.

**참고**: 데모 버전은 샘플 데이터를 사용합니다. 실제 구현에서는 한국 대학교에서 15개 이상 부서의 260명 이상 직원을 관리했습니다.

---

## 👤 개발자

**이보람 (Boram Lee)**
- 💼 HR Operations & Systems Specialist
- 🎓 Data Science, Ewha Womans University
- 📍 Seoul, Korea → Australia
- 💻 [GitHub](https://github.com/boramm)

---

## 📄 라이선스

MIT License

---

**⭐ 이 프로젝트가 도움이 되셨다면 Star를 눌러주세요!**
