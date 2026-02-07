/**
 * data-manager.js - 데이터 관리자
 * 
 * JSON 로드/저장, CRUD 함수
 */

import { coordinateToIndex, indexToCoordinate, isValidCoordinate, parseCoordinate, getBlockFromCoordinate, toLocalCoordinate, fromLocalIndex } from './grid-system.js';
import { getCurrentDateTime } from './config.js';

// ===== 전역 데이터 =====
let boardData = null;

const STORAGE_KEY = 'staffboard_v2';
const DATA_URL = './data/employees.json';


// ===== 데이터 접근자 =====

/**
 * 현재 boardData 반환
 * @returns {Object} boardData
 */
export function getBoardData() {
  return boardData;
}

/**
 * boardData 설정
 * @param {Object} data 
 */
export function setBoardData(data) {
  boardData = data;
}


// ===== 데이터 로드/저장 =====

/**
 * JSON 파일에서 데이터 로드
 * @returns {Promise<Object>} boardData
 */
export async function loadData() {
  try {
    // 캐시 무시하고 항상 새 파일 로드
    const response = await fetch(DATA_URL + '?t=' + Date.now(), {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    boardData = await response.json();
    console.log('[loadData] 데이터 로드 성공:', boardData);
    console.log(`[loadData] 부서 ${boardData.departments?.length || 0}개, 직원 ${boardData.employees?.length || 0}명`);
    
    return boardData;
  } catch (error) {
    console.error('[loadData] 데이터 로드 실패:', error);
    alert('데이터를 불러오는데 실패했습니다: ' + error.message);
    return null;
  }
}


/**
 * localStorage에 데이터 저장
 */
export function saveToLocalStorage() {
  if (!boardData) {
    console.warn('[saveToLocalStorage] 저장할 데이터가 없습니다');
    return false;
  }
  
  try {
    boardData.lastUpdated = getCurrentDateTime();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(boardData));
    console.log('[saveToLocalStorage] 저장 완료:', boardData.lastUpdated);
    return true;
  } catch (error) {
    console.error('[saveToLocalStorage] 저장 실패:', error);
    return false;
  }
}


/**
 * localStorage에서 데이터 불러오기
 * 없으면 JSON 파일에서 로드
 * @returns {Promise<Object>} boardData
 */
export async function loadFromLocalStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    
    if (saved) {
      boardData = JSON.parse(saved);
      console.log('[loadFromLocalStorage] localStorage에서 로드:', boardData.lastUpdated);
      return boardData;
    }
    
    console.log('[loadFromLocalStorage] localStorage 데이터 없음, JSON 파일에서 로드');
    return await loadData();
  } catch (error) {
    console.error('[loadFromLocalStorage] 로드 실패:', error);
    return await loadData();
  }
}


/**
 * localStorage 데이터 초기화 (원본 JSON으로 복구)
 * @returns {Promise<Object>} boardData
 */
export async function resetToOriginal() {
  localStorage.removeItem(STORAGE_KEY);
  console.log('[resetToOriginal] localStorage 초기화');
  return await loadData();
}


// ===== 검색 함수 =====

/**
 * ID로 직원 찾기
 * @param {string} id - 직원 ID
 * @returns {Object|null} 직원 객체
 */
export function findEmployeeById(id) {
  if (!boardData?.employees) return null;
  return boardData.employees.find(emp => emp.id === id) || null;
}


/**
 * 이름으로 직원 찾기 (부분 일치)
 * @param {string} name - 직원 이름 (부분 문자열)
 * @returns {Array} 일치하는 직원 목록
 */
export function findEmployeeByName(name) {
  if (!boardData?.employees || !name) return [];
  
  const searchName = name.trim().toLowerCase();
  return boardData.employees.filter(emp => 
    emp.name.toLowerCase().includes(searchName)
  );
}


/**
 * 좌표로 직원/부서 찾기 (엑셀 스타일 좌표)
 * @param {string} coord - 좌표 (예: "A3", "U1", "AA5")
 * @param {string} block - 블록 (선택, 좌표에서 자동 판별)
 * @returns {Object|null} 직원 또는 부서 객체
 */
export function findByCoordinate(coord, block = null) {
  if (!boardData || !isValidCoordinate(coord)) return null;
  
  const upperCoord = coord.toUpperCase();
  // 블록이 지정되지 않으면 좌표에서 자동 판별
  const targetBlock = block || getBlockFromCoordinate(upperCoord);
  
  // 직원에서 먼저 검색
  const employee = boardData.employees?.find(emp => 
    emp.location.coordinate === upperCoord
  );
  if (employee) return { type: 'employee', data: employee };
  
  // 부서에서 검색
  const department = boardData.departments?.find(dept =>
    dept.location.coordinate === upperCoord
  );
  if (department) return { type: 'department', data: department };
  
  return null;
}


/**
 * 좌표로 직원만 찾기 (기존 호환성)
 * @param {string} coord - 좌표 (예: "A3")
 * @param {string} block - 블록 ("left" | "right")
 * @returns {Object|null} 직원 객체
 */
export function findEmployeeByCoordinate(coord, block = 'left') {
  const result = findByCoordinate(coord, block);
  return result?.type === 'employee' ? result.data : null;
}


/**
 * 부서 이름으로 부서 찾기
 * @param {string} deptName - 부서명
 * @returns {Object|null} 부서 객체
 */
export function findDepartmentByName(deptName) {
  if (!boardData?.departments || !deptName) return null;
  
  const searchName = deptName.trim().toLowerCase();
  return boardData.departments.find(dept =>
    dept.dept.toLowerCase().includes(searchName)
  ) || null;
}


/**
 * 특정 좌표가 비어있는지 확인 (엑셀 스타일 좌표)
 * @param {string} coord - 좌표
 * @returns {boolean} 비어있으면 true
 */
export function isCoordinateEmpty(coord) {
  return findByCoordinate(coord) === null;
}


/**
 * 사용 중인 모든 좌표 반환
 * @param {string} block - 블록 ("left" | "right" | "all")
 * @returns {Set<string>} 좌표 Set
 */
export function getOccupiedCoordinates(block = 'all') {
  const coords = new Set();
  
  if (!boardData) return coords;
  
  // 부서 좌표
  boardData.departments?.forEach(dept => {
    if (block === 'all' || dept.location.block === block) {
      coords.add(dept.location.coordinate);
    }
  });
  
  // 직원 좌표
  boardData.employees?.forEach(emp => {
    if (block === 'all' || emp.location.block === block) {
      coords.add(emp.location.coordinate);
    }
  });
  
  return coords;
}


// ===== 수정 함수 =====

/**
 * 직원 위치 변경
 * @param {string} empId - 직원 ID
 * @param {string} newCoord - 새 좌표 (엑셀 스타일, 블록 자동 판별)
 * @param {string} newBlock - 새 블록 (선택, 좌표에서 자동 판별)
 * @returns {boolean} 성공 여부
 */
export function moveEmployee(empId, newCoord, newBlock = null) {
  const employee = findEmployeeById(empId);
  
  if (!employee) {
    console.warn(`[moveEmployee] 직원을 찾을 수 없음: ${empId}`);
    return false;
  }
  
  if (!isValidCoordinate(newCoord)) {
    console.warn(`[moveEmployee] 유효하지 않은 좌표: ${newCoord}`);
    return false;
  }
  
  const upperCoord = newCoord.toUpperCase();
  // 좌표에서 블록 자동 판별 (A~T: left, U~AN: right)
  const targetBlock = newBlock || getBlockFromCoordinate(upperCoord);
  
  // 대상 좌표가 비어있는지 확인
  if (!isCoordinateEmpty(upperCoord)) {
    console.warn(`[moveEmployee] 대상 좌표가 비어있지 않음: ${upperCoord}`);
    return false;
  }
  
  // 위치 업데이트
  const oldLocation = { ...employee.location };
  employee.location.coordinate = upperCoord;
  employee.location.block = targetBlock;
  employee.location.index = coordinateToIndex(upperCoord);
  
  console.log(`[moveEmployee] ${employee.name}: ${oldLocation.coordinate} → ${upperCoord}`);
  
  // 자동 저장
  saveToLocalStorage();
  
  return true;
}


/**
 * 두 직원의 위치 교환
 * @param {string} empId1 - 첫 번째 직원 ID
 * @param {string} empId2 - 두 번째 직원 ID
 * @returns {boolean} 성공 여부
 */
export function swapEmployees(empId1, empId2) {
  const emp1 = findEmployeeById(empId1);
  const emp2 = findEmployeeById(empId2);
  
  if (!emp1 || !emp2) {
    console.warn(`[swapEmployees] 직원을 찾을 수 없음`);
    return false;
  }
  
  // 위치 정보 임시 저장
  const loc1 = { ...emp1.location };
  const loc2 = { ...emp2.location };
  
  // 교환
  emp1.location = loc2;
  emp2.location = loc1;
  
  console.log(`[swapEmployees] ${emp1.name}(${loc1.coordinate}) ↔ ${emp2.name}(${loc2.coordinate})`);
  
  // 자동 저장
  saveToLocalStorage();
  
  return true;
}


/**
 * 좌표 기반으로 두 위치 교환 (직원 또는 부서)
 * @param {string} coord1 - 첫 번째 좌표
 * @param {string} coord2 - 두 번째 좌표
 * @param {string} block - 블록 ("left" | "right")
 * @returns {boolean} 성공 여부
 */
export function swapByCoordinates(coord1, coord2, block = 'left') {
  const item1 = findByCoordinate(coord1, block);
  const item2 = findByCoordinate(coord2, block);
  
  if (!item1 || !item2) {
    console.warn(`[swapByCoordinates] 해당 좌표에 항목이 없음`);
    return false;
  }
  
  // 위치 정보 임시 저장
  const loc1 = { ...item1.data.location };
  const loc2 = { ...item2.data.location };
  
  // 교환
  item1.data.location = loc2;
  item2.data.location = loc1;
  
  const name1 = item1.data.name || item1.data.dept;
  const name2 = item2.data.name || item2.data.dept;
  console.log(`[swapByCoordinates] ${name1}(${coord1}) ↔ ${name2}(${coord2})`);
  
  // 자동 저장
  saveToLocalStorage();
  
  return true;
}


/**
 * 직원을 특정 부서로 이동
 * @param {string} empId - 직원 ID
 * @param {string} deptName - 대상 부서명
 * @returns {boolean} 성공 여부
 */
export function moveEmployeeToDept(empId, deptName) {
  const employee = findEmployeeById(empId);
  const department = findDepartmentByName(deptName);
  
  if (!employee) {
    console.warn(`[moveEmployeeToDept] 직원을 찾을 수 없음: ${empId}`);
    return false;
  }
  
  if (!department) {
    console.warn(`[moveEmployeeToDept] 부서를 찾을 수 없음: ${deptName}`);
    return false;
  }
  
  // 부서 근처 빈 좌표 찾기
  const deptCoord = department.location.coordinate;
  const deptBlock = department.location.block;
  const occupiedCoords = getOccupiedCoordinates(deptBlock);
  
  // 부서 좌표 근처에서 빈 자리 찾기 (간단한 선형 탐색)
  const deptIndex = coordinateToIndex(deptCoord);
  let newCoord = null;
  
  for (let offset = 1; offset < 260; offset++) {
    const testIndex = deptIndex + offset;
    if (testIndex >= 260) break;
    
    const testCoord = indexToCoordinate(testIndex);
    if (testCoord && !occupiedCoords.has(testCoord)) {
      newCoord = testCoord;
      break;
    }
  }
  
  if (!newCoord) {
    console.warn(`[moveEmployeeToDept] 빈 좌표를 찾을 수 없음`);
    return false;
  }
  
  // 이전 부서 members에서 제거
  const oldDept = findDepartmentByName(employee.dept);
  if (oldDept && oldDept.members) {
    oldDept.members = oldDept.members.filter(id => id !== empId);
  }
  
  // 새 부서 members에 추가
  if (!department.members) department.members = [];
  if (!department.members.includes(empId)) {
    department.members.push(empId);
  }
  
  // 직원 정보 업데이트
  const oldDeptName = employee.dept;
  employee.dept = department.dept;
  employee.subDept = department.subDept || '';
  employee.location.coordinate = newCoord;
  employee.location.block = deptBlock;
  employee.location.index = coordinateToIndex(newCoord);
  
  console.log(`[moveEmployeeToDept] ${employee.name}: ${oldDeptName} → ${department.dept} (${newCoord})`);
  
  // 자동 저장
  saveToLocalStorage();
  
  return true;
}


/**
 * 새 부서 추가
 * @param {Object} deptInfo - 부서 정보 { dept, subDept, coordinate, block, isParentOrg }
 * @returns {Object|null} 추가된 부서 객체
 */
export function addDepartment(deptInfo) {
  if (!boardData) {
    console.warn('[addDepartment] boardData가 없습니다');
    return null;
  }
  
  const { dept, subDept = '', coordinate, block = null, isParentOrg = false } = deptInfo;
  
  if (!dept || !coordinate) {
    console.warn('[addDepartment] 부서명과 좌표가 필요합니다');
    return null;
  }
  
  // 좌표 유효성 검사
  if (!isValidCoordinate(coordinate)) {
    console.warn('[addDepartment] 유효하지 않은 좌표:', coordinate);
    return null;
  }
  
  // 중복 좌표 체크
  if (!isCoordinateEmpty(coordinate)) {
    console.warn('[addDepartment] 해당 좌표에 이미 항목이 있습니다:', coordinate);
    return null;
  }
  
  const upperCoord = coordinate.toUpperCase();
  const targetBlock = block || getBlockFromCoordinate(upperCoord);
  
  const newDept = {
    id: 'dept_' + crypto.randomUUID().slice(0, 8),
    dept: dept,
    displayName: dept,
    subDept: subDept,
    isParentOrg: isParentOrg,
    location: {
      coordinate: upperCoord,
      block: targetBlock,
      index: coordinateToIndex(upperCoord)
    },
    members: []
  };
  
  boardData.departments.push(newDept);
  saveToLocalStorage();
  
  console.log(`[addDepartment] 부서 추가: ${dept} at ${upperCoord}`);
  return newDept;
}


/**
 * 부서 삭제
 * @param {string} deptId - 부서 ID
 * @returns {boolean} 성공 여부
 */
export function removeDepartment(deptId) {
  if (!boardData?.departments) return false;
  
  const index = boardData.departments.findIndex(d => d.id === deptId);
  if (index === -1) {
    console.warn('[removeDepartment] 부서를 찾을 수 없음:', deptId);
    return false;
  }
  
  const removed = boardData.departments.splice(index, 1)[0];
  saveToLocalStorage();
  
  console.log(`[removeDepartment] 부서 삭제: ${removed.dept}`);
  return true;
}


/**
 * 새 직원 추가
 * @param {Object} empInfo - 직원 정보 { name, position, empType, coordinate, block, dept }
 * @returns {Object|null} 추가된 직원 객체
 */
export function addEmployee(empInfo) {
  if (!boardData) {
    console.warn('[addEmployee] boardData가 없습니다');
    return null;
  }
  
  const { name, position = '', empType = 'regular', coordinate, block = null, dept = '' } = empInfo;
  
  if (!name || !coordinate) {
    console.warn('[addEmployee] 이름과 좌표가 필요합니다');
    return null;
  }
  
  // 좌표 유효성 검사
  if (!isValidCoordinate(coordinate)) {
    console.warn('[addEmployee] 유효하지 않은 좌표:', coordinate);
    return null;
  }
  
  // 중복 좌표 체크
  if (!isCoordinateEmpty(coordinate)) {
    console.warn('[addEmployee] 해당 좌표에 이미 항목이 있습니다:', coordinate);
    return null;
  }
  
  const upperCoord = coordinate.toUpperCase();
  const targetBlock = block || getBlockFromCoordinate(upperCoord);
  
  const newEmp = {
    id: 'emp_' + crypto.randomUUID().slice(0, 8),
    name: name,
    position: position,
    empType: empType,  // 'regular', 'contract', 'functional'
    dept: dept,
    subDept: '',
    photo: null,
    photoPosY: 30,
    location: {
      coordinate: upperCoord,
      block: targetBlock,
      index: coordinateToIndex(upperCoord)
    }
  };
  
  boardData.employees.push(newEmp);
  saveToLocalStorage();
  
  console.log(`[addEmployee] 직원 추가: ${name} at ${upperCoord}`);
  return newEmp;
}


/**
 * 직원 삭제
 * @param {string} empId - 직원 ID
 * @returns {boolean} 성공 여부
 */
export function removeEmployee(empId) {
  if (!boardData?.employees) return false;
  
  const index = boardData.employees.findIndex(e => e.id === empId);
  if (index === -1) {
    console.warn('[removeEmployee] 직원을 찾을 수 없음:', empId);
    return false;
  }
  
  const removed = boardData.employees.splice(index, 1)[0];
  saveToLocalStorage();
  
  console.log(`[removeEmployee] 직원 삭제: ${removed.name}`);
  return true;
}


// ===== 초기화 로그 =====
console.log('[data-manager.js] 로드 완료');
