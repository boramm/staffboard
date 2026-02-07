/**
 * command-parser.js - 스마트 키워드 파서
 * 
 * 순서에 상관없이 키워드를 추출하여 명령을 이해
 */

import { isValidCoordinate } from './grid-system.js';
import { getBoardData } from './data-manager.js';

// ===== 동작 키워드 =====
const ACTION_KEYWORDS = {
  move: ['이동', '옮기', '옮겨', '보내', '배치', '넣어', '놓아', '가', '으로'],
  swap: ['바꿔', '바꾸', '교환', '스왑', 'swap', '맞바꿔', '서로'],
  reset: ['초기화', '리셋', 'reset', '원래대로', '처음으로'],
  save: ['저장', 'save', '세이브'],
  undo: ['취소', '되돌려', 'undo', '뒤로'],
  help: ['도움', '도움말', 'help', '뭐', '어떻게', '사용법'],
  // 부서 추가/삭제
  createDept: ['부서 만들', '부서 추가', '부서 생성'],
  deleteDept: ['부서 삭제', '부서 제거'],
  // 직원 추가/삭제
  createEmp: ['직원 추가', '사람 추가', '추가해', '만들어', '생성해'],
  deleteEmp: ['직원 삭제', '사람 삭제', '삭제해'],
  // 시나리오 관련
  scenarioSave: ['시나리오 저장', '스냅샷 저장', '상태 저장'],
  scenarioLoad: ['시나리오 불러', '시나리오 로드', '스냅샷 불러', '상태 불러'],
  scenarioList: ['시나리오 목록', '스냅샷 목록', '저장 목록'],
  scenarioDelete: ['시나리오 삭제', '스냅샷 삭제']
};

// ===== 블록 키워드 (이제 좌표에서 자동 판별됨) =====
// A~T: 좌측(파란), U~AN: 우측(초록)


/**
 * 스마트 명령어 파싱
 * @param {string} text - 사용자 입력
 * @returns {Object} 파싱된 명령 객체
 */
export function parseCommand(text) {
  if (!text || typeof text !== 'string') {
    return { action: 'unknown', original: text, error: '빈 명령어' };
  }
  
  const input = text.trim();
  console.log('[파서] 입력:', input);
  
  // 1. 시나리오 명령어 체크 (더 긴 키워드 우선!)
  if (matchKeywords(input, ACTION_KEYWORDS.scenarioList)) {
    return { action: 'scenarioList', original: input };
  }
  if (matchKeywords(input, ACTION_KEYWORDS.scenarioSave)) {
    const scenarioName = extractScenarioName(input);
    return { action: 'scenarioSave', name: scenarioName, original: input };
  }
  if (matchKeywords(input, ACTION_KEYWORDS.scenarioLoad)) {
    const scenarioName = extractScenarioName(input);
    return { action: 'scenarioLoad', name: scenarioName, original: input };
  }
  if (matchKeywords(input, ACTION_KEYWORDS.scenarioDelete)) {
    const scenarioName = extractScenarioName(input);
    return { action: 'scenarioDelete', name: scenarioName, original: input };
  }
  
  // 2. 기본 특수 명령어 체크
  if (matchKeywords(input, ACTION_KEYWORDS.reset)) {
    return { action: 'reset', original: input };
  }
  if (matchKeywords(input, ACTION_KEYWORDS.save)) {
    return { action: 'save', original: input };
  }
  if (matchKeywords(input, ACTION_KEYWORDS.help)) {
    return { action: 'help', original: input };
  }
  
  // 2-1. 부서 추가 명령어 체크 (예: "A1에 대학본부 부서 만들어줘")
  if (matchKeywords(input, ACTION_KEYWORDS.createDept)) {
    const result = parseCreateDeptCommand(input);
    if (result) return result;
  }
  
  // 2-2. 부서 삭제 명령어 체크
  if (matchKeywords(input, ACTION_KEYWORDS.deleteDept)) {
    const deptName = extractDeptNameFromText(input);
    if (deptName) {
      return { action: 'deleteDept', deptName, original: input };
    }
  }
  
  // 2-3. 직원 추가 명령어 체크 (예: "C3에 홍길동 추가해줘")
  if (matchKeywords(input, ACTION_KEYWORDS.createEmp)) {
    const result = parseCreateEmpCommand(input);
    if (result) return result;
  }
  
  // 2-4. 직원 삭제 명령어 체크
  if (matchKeywords(input, ACTION_KEYWORDS.deleteEmp)) {
    const names = extractNames(input);
    if (names.length > 0) {
      return { action: 'deleteEmp', name: names[0], original: input };
    }
  }
  
  // 3. 키워드 추출
  const names = extractNames(input);
  const coords = extractCoordinates(input);
  const depts = extractDepartments(input);
  const isSwap = matchKeywords(input, ACTION_KEYWORDS.swap);
  
  console.log('[파서] 추출 결과:', { names, coords, depts, isSwap });
  
  // 3. 명령 유형 판별
  
  // 3-1. 자리 교환 (이름 2개 또는 좌표 2개)
  if (isSwap) {
    if (names.length >= 2) {
      return {
        action: 'swap',
        name1: names[0],
        name2: names[1],
        original: input
      };
    }
    if (coords.length >= 2) {
      return {
        action: 'swapCoords',
        coord1: coords[0],
        coord2: coords[1],
        original: input
      };
    }
  }
  
  // 3-2. 이름 + 부서 → 부서로 이동
  if (names.length >= 1 && depts.length >= 1) {
    return {
      action: 'moveToDept',
      name: names[0],
      targetDept: depts[0],
      original: input
    };
  }
  
  // 3-3. 이름 + 좌표 → 좌표로 이동
  if (names.length >= 1 && coords.length >= 1) {
    return {
      action: 'moveToCoord',
      name: names[0],
      coord: coords[0],
      original: input
    };
  }
  
  // 3-4. 좌표 2개 (교환 키워드 없어도) → 좌표 이동
  if (coords.length >= 2) {
    return {
      action: 'moveCoordToCoord',
      from: coords[0],
      to: coords[1],
      original: input
    };
  }
  
  // 3-5. 이름 2개 (교환으로 추정)
  if (names.length >= 2) {
    return {
      action: 'swap',
      name1: names[0],
      name2: names[1],
      original: input,
      guessed: true  // 추측된 명령
    };
  }
  
  // 매칭 실패
  return {
    action: 'unknown',
    original: input,
    error: '명령어를 이해하지 못했습니다',
    parsed: { names, coords, depts }
  };
}


/**
 * 키워드 매칭 확인
 */
function matchKeywords(text, keywords) {
  const lower = text.toLowerCase();
  return keywords.some(kw => lower.includes(kw.toLowerCase()));
}


/**
 * 이름 추출 (boardData의 직원 이름과 매칭)
 */
function extractNames(text) {
  const boardData = getBoardData();
  if (!boardData?.employees) return [];
  
  const found = [];
  const employeeNames = boardData.employees.map(e => e.name);
  
  // 직원 이름 직접 매칭
  for (const name of employeeNames) {
    if (text.includes(name) && !found.includes(name)) {
      found.push(name);
    }
  }
  
  // 이름을 찾지 못했으면 한글 2-3자 패턴으로 추출
  if (found.length === 0) {
    const pattern = /[가-힣]{2,3}/g;
    const matches = text.match(pattern) || [];
    
    // 부서명, 동작어 제외
    const excludeWords = ['이동', '옮기', '바꿔', '교환', '자리', '위치', '으로', '에게', 
                          '우측', '좌측', '오른', '왼쪽', '초록', '파란', '블록'];
    
    for (const match of matches) {
      if (!excludeWords.includes(match) && !found.includes(match)) {
        // 부서명인지 확인
        const isDept = boardData.departments?.some(d => 
          d.dept.includes(match) || (d.subDept && d.subDept.includes(match))
        );
        if (!isDept) {
          found.push(match);
        }
      }
    }
  }
  
  return found;
}


/**
 * 좌표 추출 (엑셀 스타일: A1~AN13)
 */
function extractCoordinates(text) {
  // A~Z 또는 AA~AN + 1~13
  const pattern = /\b([A-Z]{1,2})(1[0-3]|[1-9])\b/gi;
  const matches = text.match(pattern) || [];
  
  // 대문자로 변환하고 유효한 좌표만 필터링
  return matches
    .map(m => m.toUpperCase())
    .filter(coord => {
      // AN까지만 유효 (40열)
      const col = coord.replace(/[0-9]/g, '');
      if (col.length === 1) return true;  // A~Z
      if (col.length === 2 && col[0] === 'A' && col[1] <= 'N') return true;  // AA~AN
      return false;
    });
}


/**
 * 시나리오 이름 추출
 * 따옴표 안의 텍스트 또는 키워드 뒤의 텍스트
 */
function extractScenarioName(text) {
  // 따옴표 안의 텍스트 추출
  const quoteMatch = text.match(/["']([^"']+)["']/);
  if (quoteMatch) return quoteMatch[1].trim();
  
  // 키워드 다음의 텍스트 추출
  const keywords = ['시나리오', '스냅샷', '저장', '불러', '삭제', '로드'];
  for (const kw of keywords) {
    const idx = text.lastIndexOf(kw);
    if (idx !== -1) {
      const after = text.slice(idx + kw.length).trim();
      // 조사 제거 후 반환
      const cleaned = after.replace(/^[을를으로에서]/g, '').trim();
      if (cleaned && cleaned.length > 0) {
        return cleaned;
      }
    }
  }
  
  return null;
}


/**
 * 부서명 추출 (boardData의 부서와 매칭)
 */
function extractDepartments(text) {
  const boardData = getBoardData();
  if (!boardData?.departments) return [];
  
  const found = [];
  
  for (const dept of boardData.departments) {
    // 부서명 매칭
    if (dept.dept && text.includes(dept.dept) && !found.includes(dept.dept)) {
      found.push(dept.dept);
    }
    // 하위부서명 매칭
    if (dept.subDept && text.includes(dept.subDept) && !found.includes(dept.subDept)) {
      found.push(dept.subDept);
    }
  }
  
  return found;
}


/**
 * 명령어 결과 메시지 생성
 */
export function getResultMessage(cmdObj, success) {
  if (!success) {
    return `❌ ${cmdObj.error || '명령 실행 실패'}`;
  }
  
  switch (cmdObj.action) {
    case 'moveToDept':
      return `✅ ${cmdObj.name}님을 ${cmdObj.targetDept}(으)로 이동했습니다`;
    case 'moveToCoord':
      return `✅ ${cmdObj.name}님을 ${cmdObj.coord}(으)로 이동했습니다`;
    case 'moveCoordToCoord':
      return `✅ ${cmdObj.from}을 ${cmdObj.to}(으)로 이동했습니다`;
    case 'swap':
      return `✅ ${cmdObj.name1}님과 ${cmdObj.name2}님의 자리를 바꿨습니다`;
    case 'swapCoords':
      return `✅ ${cmdObj.coord1}과 ${cmdObj.coord2}의 자리를 바꿨습니다`;
    case 'reset':
      return `✅ 원본 데이터로 초기화했습니다`;
    case 'save':
      return `✅ 저장되었습니다`;
    case 'help':
      return getHelpMessage();
    case 'scenarioSave':
      return `✅ 시나리오 "${cmdObj.name}"(으)로 저장했습니다`;
    case 'scenarioLoad':
      return `✅ 시나리오 "${cmdObj.name}"(을)를 불러왔습니다`;
    case 'scenarioDelete':
      return `✅ 시나리오 "${cmdObj.name}"(을)를 삭제했습니다`;
    case 'scenarioList':
      return cmdObj.message || '시나리오 목록';
    case 'createDept':
      return `✅ "${cmdObj.deptName}" 부서를 ${cmdObj.coord}에 추가했습니다`;
    case 'deleteDept':
      return `✅ "${cmdObj.deptName}" 부서를 삭제했습니다`;
    case 'createEmp':
      return `✅ "${cmdObj.name}" 직원을 ${cmdObj.coord}에 추가했습니다`;
    case 'deleteEmp':
      return `✅ "${cmdObj.name}" 직원을 삭제했습니다`;
    default:
      return `❓ 알 수 없는 명령: ${cmdObj.original}`;
  }
}


/**
 * 도움말 메시지
 */
function getHelpMessage() {
  return `📖 사용 가능한 명령어:
• "홍길동 C3" - 좌측(파란) 블록으로 이동
• "홍길동 U1" - 우측(초록) 블록으로 이동
• "홍길동 AA5" - 우측 블록 AA5로 이동
• "홍길동 학생처" - 부서로 이동
• "홍길동 김철수 바꿔" - 자리 교환
• "초기화" - 원본으로 복구
• "저장" - 현재 상태 저장

📁 시나리오 명령어:
• "시나리오 저장 이름" - 현재 상태 저장
• "시나리오 불러 이름" - 저장된 상태 불러오기
• "시나리오 목록" - 저장된 목록 보기
• "시나리오 삭제 이름" - 삭제

📍 좌표 안내:
• A~T: 좌측(파란) 블록
• U~AN: 우측(초록) 블록

🏢 부서 명령어:
• "A1에 대학본부 만들어" - 부서 추가
• "부서 삭제 교무처" - 부서 삭제`;
}


/**
 * 부서 추가 명령어 파싱
 * 예: "A1에 대학본부 만들어줘", "대학본부를 A1에 추가해"
 */
function parseCreateDeptCommand(text) {
  // 좌표 추출
  const coordMatch = text.match(/([A-Za-z]{1,2})(\d{1,2})/);
  if (!coordMatch) return null;
  
  const coord = (coordMatch[1] + coordMatch[2]).toUpperCase();
  if (!isValidCoordinate(coord)) return null;
  
  // 부서명 추출 (따옴표 안의 텍스트 또는 한글 단어)
  let deptName = null;
  
  // 1. 따옴표 안의 텍스트
  const quotedMatch = text.match(/["'`""]([^"'`""]+)["'`""]/);
  if (quotedMatch) {
    deptName = quotedMatch[1].trim();
  }
  
  // 2. 따옴표 없으면 좌표와 키워드 제외한 한글 단어
  if (!deptName) {
    // 좌표, 만들어, 추가, 생성, 에, 를, 을 등 제거
    let cleaned = text
      .replace(/[A-Za-z]{1,2}\d{1,2}/g, '')  // 좌표 제거
      .replace(/만들어|추가해|생성해|부서|에|를|을|줘|주세요|해줘/g, '')
      .trim();
    
    // 남은 한글 단어 추출
    const koreanMatch = cleaned.match(/[가-힣]+/g);
    if (koreanMatch && koreanMatch.length > 0) {
      // 가장 긴 단어를 부서명으로
      deptName = koreanMatch.reduce((a, b) => a.length >= b.length ? a : b);
    }
  }
  
  if (!deptName || deptName.length < 2) return null;
  
  return {
    action: 'createDept',
    deptName: deptName,
    coord: coord,
    original: text
  };
}


/**
 * 텍스트에서 부서명 추출 (삭제용)
 */
function extractDeptNameFromText(text) {
  const boardData = getBoardData();
  if (!boardData?.departments) return null;
  
  // 기존 부서명과 매칭
  for (const dept of boardData.departments) {
    if (text.includes(dept.dept)) {
      return dept.dept;
    }
  }
  
  // 따옴표 안의 텍스트
  const quotedMatch = text.match(/["'`""]([^"'`""]+)["'`""]/);
  if (quotedMatch) {
    return quotedMatch[1].trim();
  }
  
  return null;
}


/**
 * 직원 추가 명령어 파싱
 * 예: "C3에 홍길동 추가해줘", "홍길동(팀장) C3에 추가"
 */
function parseCreateEmpCommand(text) {
  // 좌표 추출
  const coordMatch = text.match(/([A-Za-z]{1,2})(\d{1,2})/);
  if (!coordMatch) return null;
  
  const coord = (coordMatch[1] + coordMatch[2]).toUpperCase();
  if (!isValidCoordinate(coord)) return null;
  
  // 이름과 직위 추출
  let name = null;
  let position = '';
  
  // 1. "홍길동(팀장)" 형태
  const nameWithPosMatch = text.match(/([가-힣]{2,4})\s*[\(（]([^)）]+)[\)）]/);
  if (nameWithPosMatch) {
    name = nameWithPosMatch[1];
    position = nameWithPosMatch[2];
  }
  
  // 2. 따옴표 안의 텍스트
  if (!name) {
    const quotedMatch = text.match(/["'`""]([^"'`""]+)["'`""]/);
    if (quotedMatch) {
      name = quotedMatch[1].trim();
    }
  }
  
  // 3. 한글 이름만 (2~4글자)
  if (!name) {
    // 좌표, 추가, 만들어 등 키워드 제거 후 한글 이름 찾기
    let cleaned = text
      .replace(/[A-Za-z]{1,2}\d{1,2}/g, '')  // 좌표 제거
      .replace(/추가해|만들어|생성해|직원|사람|에|를|을|줘|주세요|해줘/g, '')
      .trim();
    
    const koreanNames = cleaned.match(/[가-힣]{2,4}/g);
    if (koreanNames && koreanNames.length > 0) {
      // 첫 번째 한글 단어를 이름으로
      name = koreanNames[0];
    }
  }
  
  if (!name || name.length < 2) return null;
  
  return {
    action: 'createEmp',
    name: name,
    position: position,
    coord: coord,
    original: text
  };
}


// ===== 초기화 로그 =====
console.log('[command-parser.js] 스마트 키워드 파서 로드 완료');
