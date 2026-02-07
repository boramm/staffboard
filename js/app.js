/**
 * app.js - 메인 앱 (명령 실행 엔진)
 * 
 * 파싱된 명령을 실제로 실행
 */

import { BOARD_CONFIG } from './config.js';
import { coordinateToIndex } from './grid-system.js';
import {
  loadFromLocalStorage,
  resetToOriginal,
  saveToLocalStorage,
  getBoardData,
  findEmployeeByName,
  findByCoordinate,
  findDepartmentByName,
  moveEmployee,
  swapEmployees,
  swapByCoordinates,
  moveEmployeeToDept,
  getOccupiedCoordinates,
  addDepartment,
  removeDepartment,
  addEmployee,
  removeEmployee
} from './data-manager.js';
import { renderBoard, highlightCard, highlightCards } from './renderer.js';
import { parseCommand, getResultMessage } from './command-parser.js';
import {
  saveScenario,
  loadScenarioByName,
  deleteScenarioByName,
  formatScenarioList,
  getScenarioByName
} from './scenario-manager.js';


// ===== 명령 실행 =====

/**
 * 파싱된 명령 객체 실행
 * @param {Object} cmdObj - parseCommand() 결과
 * @returns {Object} { success: boolean, message: string }
 */
export function executeCommand(cmdObj) {
  console.log('[executeCommand] 실행:', cmdObj);
  
  try {
    switch (cmdObj.action) {
      case 'moveToDept':
        return moveToDept(cmdObj.name, cmdObj.targetDept);
      
      case 'moveToCoord':
        return moveToCoord(cmdObj.name, cmdObj.coord, cmdObj.block);
      
      case 'moveCoordToCoord':
        return moveCoordToCoord(cmdObj.from, cmdObj.to, cmdObj.block);
      
      case 'swap':
        return swapByNames(cmdObj.name1, cmdObj.name2);
      
      case 'swapCoords':
        return swapCoordPositions(cmdObj.coord1, cmdObj.coord2, cmdObj.block);
      
      case 'reset':
        return resetBoard();
      
      case 'save':
        return saveBoard();
      
      case 'help':
        return { success: true, message: getHelpText() };
      
      // ===== 시나리오 명령어 =====
      case 'scenarioSave':
        return handleScenarioSave(cmdObj.name);
      
      case 'scenarioLoad':
        return handleScenarioLoad(cmdObj.name);
      
      case 'scenarioDelete':
        return handleScenarioDelete(cmdObj.name);
      
      case 'scenarioList':
        return handleScenarioList();
      
      case 'createDept':
        return handleCreateDept(cmdObj.deptName, cmdObj.coord);
      
      case 'deleteDept':
        return handleDeleteDept(cmdObj.deptName);
      
      case 'createEmp':
        return handleCreateEmp(cmdObj.name, cmdObj.coord, cmdObj.position);
      
      case 'deleteEmp':
        return handleDeleteEmp(cmdObj.name);
      
      case 'unknown':
      default:
        return {
          success: false,
          message: cmdObj.error || '알 수 없는 명령입니다'
        };
    }
  } catch (error) {
    console.error('[executeCommand] 오류:', error);
    return {
      success: false,
      message: `오류 발생: ${error.message}`
    };
  }
}


/**
 * 이름으로 직원을 부서로 이동
 */
function moveToDept(name, targetDept) {
  // 디버깅: boardData 상태 확인
  const boardData = getBoardData();
  console.log('[moveToDept] boardData:', boardData);
  console.log('[moveToDept] 검색 이름:', name);
  
  // 직원 찾기
  const employees = findEmployeeByName(name);
  console.log('[moveToDept] 검색 결과:', employees);
  
  if (!employees || employees.length === 0) {
    return { success: false, message: `'${name}'님을 찾을 수 없습니다` };
  }
  
  const emp = employees[0]; // 첫 번째 일치 직원
  
  // 부서 찾기
  const dept = findDepartmentByName(targetDept);
  if (!dept) {
    return { success: false, message: `'${targetDept}' 부서를 찾을 수 없습니다` };
  }
  
  // 이동 실행
  const success = moveEmployeeToDept(emp.id, targetDept);
  
  if (success) {
    renderBoard();
    
    // 이동된 위치 하이라이트
    const updatedEmp = findEmployeeByName(name)[0];
    if (updatedEmp) {
      highlightCard(updatedEmp.location.coordinate, updatedEmp.location.block);
    }
    
    return { success: true, message: `${name}님을 ${targetDept}(으)로 이동했습니다` };
  }
  
  return { success: false, message: '이동 실패' };
}


/**
 * 이름으로 직원을 좌표로 이동
 */
function moveToCoord(name, coord, block) {
  // 직원 찾기
  const employees = findEmployeeByName(name);
  console.log('[moveToCoord]', name, '→', coord);
  
  if (!employees || employees.length === 0) {
    return { success: false, message: `'${name}'님을 찾을 수 없습니다` };
  }
  
  const emp = employees[0];
  
  // 이동 실행 (블록은 좌표에서 자동 판별)
  const success = moveEmployee(emp.id, coord);
  
  if (success) {
    renderBoard();
    highlightCard(coord);
    return { success: true, message: `${name}님을 ${coord}(으)로 이동했습니다` };
  }
  
  // 대상 좌표가 비어있지 않은 경우 자동 교환 제안
  const existing = findByCoordinate(coord);
  if (existing) {
    const existingName = existing.data.name || existing.data.dept;
    return { 
      success: false, 
      message: `${coord}에 이미 ${existingName}이(가) 있습니다. "${name}이랑 ${existingName} 바꿔"를 시도해보세요.`
    };
  }
  
  return { success: false, message: '이동 실패' };
}


/**
 * 좌표에서 좌표로 이동
 */
function moveCoordToCoord(fromCoord, toCoord, block) {
  // 출발 좌표에서 항목 찾기
  const fromItem = findByCoordinate(fromCoord, block);
  if (!fromItem) {
    return { success: false, message: `${fromCoord}에 아무것도 없습니다` };
  }
  
  // 도착 좌표가 비어있는지 확인
  const toItem = findByCoordinate(toCoord, block);
  if (toItem) {
    const toName = toItem.data.name || toItem.data.dept;
    return { 
      success: false, 
      message: `${toCoord}에 이미 ${toName}이(가) 있습니다`
    };
  }
  
  // 직원인 경우만 이동 가능
  if (fromItem.type !== 'employee') {
    return { success: false, message: '부서 카드는 이동할 수 없습니다' };
  }
  
  const success = moveEmployee(fromItem.data.id, toCoord, block);
  
  if (success) {
    renderBoard();
    highlightCard(toCoord, block);
    return { success: true, message: `${fromCoord}를 ${toCoord}(으)로 이동했습니다` };
  }
  
  return { success: false, message: '이동 실패' };
}


/**
 * 이름으로 두 직원 자리 교환
 */
function swapByNames(name1, name2) {
  // 직원 찾기
  const emp1List = findEmployeeByName(name1);
  const emp2List = findEmployeeByName(name2);
  
  if (!emp1List || emp1List.length === 0) {
    return { success: false, message: `'${name1}'님을 찾을 수 없습니다` };
  }
  if (!emp2List || emp2List.length === 0) {
    return { success: false, message: `'${name2}'님을 찾을 수 없습니다` };
  }
  
  const emp1 = emp1List[0];
  const emp2 = emp2List[0];
  
  // 교환 실행
  const success = swapEmployees(emp1.id, emp2.id);
  
  if (success) {
    renderBoard();
    highlightCards([
      { coord: emp1.location.coordinate, block: emp1.location.block },
      { coord: emp2.location.coordinate, block: emp2.location.block }
    ]);
    return { success: true, message: `${name1}님과 ${name2}님의 자리를 바꿨습니다` };
  }
  
  return { success: false, message: '교환 실패' };
}


/**
 * 좌표로 두 위치 교환
 */
function swapCoordPositions(coord1, coord2, block) {
  const success = swapByCoordinates(coord1, coord2, block);
  
  if (success) {
    renderBoard();
    highlightCards([
      { coord: coord1, block },
      { coord: coord2, block }
    ]);
    return { success: true, message: `${coord1}과 ${coord2}의 자리를 바꿨습니다` };
  }
  
  return { success: false, message: '해당 좌표에 교환할 항목이 없습니다' };
}


/**
 * 보드 초기화 (원본 데이터로 복구)
 */
async function resetBoard() {
  await resetToOriginal();
  renderBoard();
  return { success: true, message: '원본 데이터로 초기화했습니다' };
}


/**
 * 보드 저장
 */
function saveBoard() {
  const success = saveToLocalStorage();
  return { 
    success, 
    message: success ? '저장되었습니다' : '저장 실패'
  };
}


// ===== 시나리오 핸들러 =====

/**
 * 시나리오 저장
 */
function handleScenarioSave(name) {
  if (!name) {
    // 이름이 없으면 현재 날짜/시간으로 자동 생성
    const now = new Date();
    name = `${now.getMonth() + 1}월${now.getDate()}일_${now.getHours()}시${now.getMinutes()}분`;
  }
  
  const scenario = saveScenario(name);
  
  if (scenario) {
    return { success: true, message: `📁 시나리오 "${name}"(으)로 저장했습니다` };
  }
  
  return { success: false, message: '시나리오 저장 실패' };
}


/**
 * 시나리오 불러오기
 */
function handleScenarioLoad(name) {
  if (!name) {
    return { success: false, message: '불러올 시나리오 이름을 입력해주세요' };
  }
  
  const scenario = getScenarioByName(name);
  if (!scenario) {
    return { success: false, message: `'${name}' 시나리오를 찾을 수 없습니다` };
  }
  
  const success = loadScenarioByName(name);
  
  if (success) {
    renderBoard();
    return { success: true, message: `📁 시나리오 "${scenario.name}"(을)를 불러왔습니다` };
  }
  
  return { success: false, message: '시나리오 불러오기 실패' };
}


/**
 * 시나리오 삭제
 */
function handleScenarioDelete(name) {
  if (!name) {
    return { success: false, message: '삭제할 시나리오 이름을 입력해주세요' };
  }
  
  const scenario = getScenarioByName(name);
  if (!scenario) {
    return { success: false, message: `'${name}' 시나리오를 찾을 수 없습니다` };
  }
  
  const success = deleteScenarioByName(name);
  
  if (success) {
    return { success: true, message: `🗑️ 시나리오 "${scenario.name}"(을)를 삭제했습니다` };
  }
  
  return { success: false, message: '시나리오 삭제 실패' };
}


/**
 * 시나리오 목록 표시
 */
function handleScenarioList() {
  const listText = formatScenarioList();
  return { success: true, message: listText };
}


/**
 * 부서 추가 핸들러
 */
function handleCreateDept(deptName, coord) {
  // 해당 좌표에 이미 뭔가 있는지 확인
  const existing = findByCoordinate(coord);
  
  if (existing) {
    return {
      success: false,
      message: `❌ ${coord}에 이미 "${existing.data.name || existing.data.dept}"이(가) 있습니다. 먼저 이동시켜주세요.`
    };
  }
  
  const newDept = addDepartment({
    dept: deptName,
    coordinate: coord,
    isParentOrg: false
  });
  
  if (newDept) {
    renderBoard();
    highlightCard(coord);
    return {
      success: true,
      message: `✅ "${deptName}" 부서를 ${coord}에 추가했습니다`
    };
  }
  
  return {
    success: false,
    message: `❌ 부서 추가 실패`
  };
}


/**
 * 부서 삭제 핸들러
 */
function handleDeleteDept(deptName) {
  const boardData = getBoardData();
  const dept = boardData.departments.find(d => d.dept === deptName || d.displayName === deptName);
  
  if (!dept) {
    return {
      success: false,
      message: `❌ "${deptName}" 부서를 찾을 수 없습니다`
    };
  }
  
  const removed = removeDepartment(dept.id);
  
  if (removed) {
    renderBoard();
    return {
      success: true,
      message: `✅ "${deptName}" 부서를 삭제했습니다`
    };
  }
  
  return {
    success: false,
    message: `❌ 부서 삭제 실패`
  };
}


/**
 * 직원 추가 핸들러
 */
function handleCreateEmp(name, coord, position = '') {
  // 해당 좌표에 이미 뭔가 있는지 확인
  const existing = findByCoordinate(coord);
  
  if (existing) {
    return {
      success: false,
      message: `❌ ${coord}에 이미 "${existing.data.name || existing.data.dept}"이(가) 있습니다`
    };
  }
  
  const newEmp = addEmployee({
    name: name,
    position: position,
    coordinate: coord,
    empType: 'regular'
  });
  
  if (newEmp) {
    renderBoard();
    highlightCard(coord);
    return {
      success: true,
      message: `✅ "${name}" 직원을 ${coord}에 추가했습니다`
    };
  }
  
  return {
    success: false,
    message: `❌ 직원 추가 실패`
  };
}


/**
 * 직원 삭제 핸들러
 */
function handleDeleteEmp(name) {
  const employees = findEmployeeByName(name);
  
  if (employees.length === 0) {
    return {
      success: false,
      message: `❌ "${name}" 직원을 찾을 수 없습니다`
    };
  }
  
  // 정확히 일치하는 직원 찾기
  const exactMatch = employees.find(e => e.name === name) || employees[0];
  const removed = removeEmployee(exactMatch.id);
  
  if (removed) {
    renderBoard();
    return {
      success: true,
      message: `✅ "${exactMatch.name}" 직원을 삭제했습니다`
    };
  }
  
  return {
    success: false,
    message: `❌ 직원 삭제 실패`
  };
}


/**
 * 도움말 텍스트
 */
function getHelpText() {
  return `📖 명령어 예시:
• 홍길동 C3 → 좌측(파란) 블록으로 이동
• 홍길동 U1 → 우측(초록) 블록으로 이동
• 홍길동 AA5 → 우측 블록 AA5로 이동
• 홍길동 학생처 → 부서로 이동
• 홍길동 김철수 바꿔 → 자리 교환
• 초기화 → 원본 복구

🏢 부서:
• A1에 대학본부 만들어 → 부서 추가
• 부서 삭제 교무처 → 부서 삭제

📁 시나리오:
• 시나리오 저장 백업1 → 현재 상태 저장
• 시나리오 불러 백업1 → 저장된 상태 불러오기
• 시나리오 목록 → 저장 목록 보기
• 시나리오 삭제 백업1 → 삭제

📍 좌표: A~T(좌측), U~AN(우측)`;
}


// ===== 초기화 함수 =====

/**
 * 앱 초기화
 * @param {Object} options - 옵션
 */
export async function initApp(options = {}) {
  console.log('[initApp] 앱 초기화 시작...');
  
  // 데이터 로드
  const data = await loadFromLocalStorage();
  
  if (!data) {
    console.error('[initApp] 데이터 로드 실패');
    return false;
  }
  
  console.log(`[initApp] 데이터 로드 완료 - 부서: ${data.departments?.length}개, 직원: ${data.employees?.length}명`);
  
  // 기본 상위 조직 부서 자동 추가 (없으면)
  ensureDefaultParentOrgs();
  
  // 보드 렌더링
  renderBoard();
  
  console.log('[initApp] 앱 초기화 완료');
  return true;
}


/**
 * 기본 상위 조직 부서 확인 및 추가
 */
function ensureDefaultParentOrgs() {
  const boardData = getBoardData();
  if (!boardData) return;
  
  let changed = false;
  
  // A1: 대학본부 (좌측 블록)
  const a1Dept = boardData.departments?.find(d => d.location.coordinate === 'A1');
  const hasDaehak = boardData.departments?.some(d => d.dept === '대학본부');
  
  if (!hasDaehak) {
    // A1에 다른 부서가 있으면 B1으로 밀기
    if (a1Dept && a1Dept.dept !== '대학본부') {
      a1Dept.location.coordinate = 'B1';
      a1Dept.location.index = 1;
      console.log('[initApp]', a1Dept.dept, '→ B1으로 이동');
    }
    
    // 대학본부 추가
    const newDept = {
      id: 'dept_' + crypto.randomUUID().slice(0, 8),
      dept: '대학본부',
      displayName: '대학본부',
      subDept: '',
      isParentOrg: true,
      location: { coordinate: 'A1', block: 'left', index: 0 },
      members: []
    };
    boardData.departments.push(newDept);
    console.log('[initApp] 대학본부 추가 (A1)');
    changed = true;
  }
  
  // U1: 총장직속기관 (우측 블록)
  const u1Dept = boardData.departments?.find(d => d.location.coordinate === 'U1');
  const hasChongjang = boardData.departments?.some(d => d.dept === '총장직속기관');
  
  if (!hasChongjang) {
    // U1에 다른 부서가 있으면 V1으로 밀기
    if (u1Dept && u1Dept.dept !== '총장직속기관') {
      u1Dept.location.coordinate = 'V1';
      u1Dept.location.index = 261;
      console.log('[initApp]', u1Dept.dept, '→ V1으로 이동');
    }
    
    // 총장직속기관 추가
    const newDept = {
      id: 'dept_' + crypto.randomUUID().slice(0, 8),
      dept: '총장직속기관',
      displayName: '총장직속기관',
      subDept: '',
      isParentOrg: true,
      location: { coordinate: 'U1', block: 'right', index: 260 },
      members: []
    };
    boardData.departments.push(newDept);
    console.log('[initApp] 총장직속기관 추가 (U1)');
    changed = true;
  }
  
  // 변경이 있으면 저장
  if (changed) {
    saveToLocalStorage();
  }
}


// ===== 초기화 로그 =====
console.log('[app.js] 로드 완료');
