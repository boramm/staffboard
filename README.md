# 📊 교직원 현황판 (Staff Allocation Dashboard)

교직원 인사배치 시뮬레이션 및 현황 관리 시스템

🔗 **[Live Demo](https://boramm.github.io/staffboard/)** ← Click to see it in action!

---

## 🌏 Language / 언어

**Interface**: Korean (한국어)  
**Purpose**: Designed for Korean university HR management system

This project demonstrates real-world HR operations tools used in Korean educational institutions. The interface and sample data are in Korean to reflect authentic use cases.

---

## ✨ Key Features / 주요 기능

- **Visual Board**: 20×13 grid layout for 260+ employees  
  **시각화 보드**: 260명 이상 직원 배치 관리
  
- **Natural Language Commands**: "Move employee to department"  
  **자연어 명령**: "홍길동을 학생처로 이동"
  
- **Drag & Drop**: Quick rearrangement with mouse  
  **드래그 앤 드롭**: 마우스로 빠른 재배치
  
- **Scenario Management**: Save and compare multiple layouts  
  **시나리오 관리**: 여러 인사이동 안 저장 및 비교
  
- **Print Export**: A1-size professional reports  
  **인쇄 출력**: A1 사이즈 보고서 생성

---

## 📸 Screenshots / 스크린샷

![Staff Dashboard](img/screenshot.png)

*Sample data showing organizational structure with 50+ employees across 8 departments*

---

## 🚀 Quick Start

### Option 1: View Live Demo (Recommended)
👉 **[https://boramm.github.io/staffboard/](https://boramm.github.io/staffboard/)**

### Option 2: Run Locally
```bash
git clone https://github.com/boramm/staffboard.git
cd staffboard

# Start local server (required to avoid CORS errors)
python3 -m http.server 8000

# Open browser: http://localhost:8000
```

---

## 🛠️ Tech Stack

- **Frontend**: Vanilla JavaScript (ES6+)
- **UI**: HTML5, CSS3 (Grid Layout)
- **Interactions**: HTML5 Drag & Drop API
- **Storage**: LocalStorage + IndexedDB
- **Architecture**: Modular ES6 modules

---

## 💡 Usage Examples

### Moving Employees
```
Command: "김철수를 학생처로 이동"
Result: Employee relocates to Student Affairs department
```

### Position Swap
```
Command: "홍길동이랑 이영희 자리 바꿔"
Result: Two employees exchange positions
```

### Coordinate-based Movement
```
Command: "A3을 B5로 이동"
Result: Card at A3 moves to B5
```

---

## 🎯 Project Background / 프로젝트 배경

Built to demonstrate practical HR systems development skills for HRIS positions.

**Real Implementation Context**:
- Managed 260+ employees across 15+ departments
- Used at a Korean university for organizational planning
- Reduced manual placement time by 80%
- Enabled side-by-side comparison of reorganization proposals

**Demo Version**:
- Sample data with anonymized names
- 50 employees across 8 departments
- All core features functional

---

## 👤 Author / 개발자

**Boram Lee (이보람)**
- 💼 HR Operations & Systems Specialist
- 🎓 M.S. in Data Science, Ewha Womans University
- 📍 Seoul, Korea → Australia (relocating)
- 💻 [GitHub](https://github.com/boramm)
- 💌 Building practical tools for HR professionals

---

## 📄 License

MIT License - feel free to use for learning purposes

---

## 🙏 Acknowledgments

This project was developed to solve real pain points in university HR operations, demonstrating how technical skills can streamline administrative workflows.

---

**⭐ If you find this project interesting, please star the repository!**
