/**
 * ===== scenario-manager.js =====
 * 시나리오(스냅샷) 관리 모듈
 * 보드 상태를 저장하고 불러오는 기능
 */

import { getBoardData, setBoardData, saveToLocalStorage } from './data-manager.js';
import { genId, getCurrentDateTime } from './config.js';

// ===== 상수 =====
const SCENARIOS_KEY = 'staffboard_v2_scenarios';

// ===== 시나리오 목록 관리 =====

/**
 * 저장된 모든 시나리오 목록 가져오기
 * @returns {Array} 시나리오 목록
 */
export function getScenarios() {
  try {
    const data = localStorage.getItem(SCENARIOS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('[scenario-manager] 시나리오 목록 로드 실패:', e);
    return [];
  }
}

/**
 * 시나리오 목록 저장
 * @param {Array} scenarios - 시나리오 목록
 */
function saveScenarios(scenarios) {
  try {
    localStorage.setItem(SCENARIOS_KEY, JSON.stringify(scenarios));
    console.log('[scenario-manager] 시나리오 목록 저장 완료:', scenarios.length, '개');
  } catch (e) {
    console.error('[scenario-manager] 시나리오 목록 저장 실패:', e);
  }
}

// ===== 시나리오 CRUD =====

/**
 * 현재 보드 상태를 새 시나리오로 저장
 * @param {string} name - 시나리오 이름
 * @param {string} [description] - 설명 (선택)
 * @returns {Object|null} 저장된 시나리오 또는 null
 */
export function saveScenario(name, description = '') {
  if (!name || name.trim() === '') {
    console.error('[scenario-manager] 시나리오 이름이 필요합니다');
    return null;
  }

  const boardData = getBoardData();
  if (!boardData) {
    console.error('[scenario-manager] 저장할 보드 데이터가 없습니다');
    return null;
  }

  const scenarios = getScenarios();
  
  const newScenario = {
    id: genId('scenario'),
    name: name.trim(),
    description: description.trim(),
    createdAt: getCurrentDateTime(),
    updatedAt: getCurrentDateTime(),
    data: JSON.parse(JSON.stringify(boardData)) // deep copy
  };

  scenarios.unshift(newScenario); // 최신순으로 앞에 추가
  saveScenarios(scenarios);

  console.log('[scenario-manager] 시나리오 저장 완료:', newScenario.name);
  return newScenario;
}

/**
 * 시나리오 불러오기 (현재 보드에 적용)
 * @param {string} scenarioId - 시나리오 ID
 * @returns {boolean} 성공 여부
 */
export function loadScenario(scenarioId) {
  const scenarios = getScenarios();
  const scenario = scenarios.find(s => s.id === scenarioId);

  if (!scenario) {
    console.error('[scenario-manager] 시나리오를 찾을 수 없습니다:', scenarioId);
    return false;
  }

  // 보드 데이터 교체
  setBoardData(scenario.data);
  saveToLocalStorage();

  console.log('[scenario-manager] 시나리오 불러오기 완료:', scenario.name);
  return true;
}

/**
 * 이름으로 시나리오 불러오기
 * @param {string} name - 시나리오 이름
 * @returns {boolean} 성공 여부
 */
export function loadScenarioByName(name) {
  const scenarios = getScenarios();
  const scenario = scenarios.find(s => s.name === name || s.name.includes(name));

  if (!scenario) {
    console.error('[scenario-manager] 시나리오를 찾을 수 없습니다:', name);
    return false;
  }

  setBoardData(scenario.data);
  saveToLocalStorage();

  console.log('[scenario-manager] 시나리오 불러오기 완료:', scenario.name);
  return true;
}

/**
 * 시나리오 삭제
 * @param {string} scenarioId - 시나리오 ID
 * @returns {boolean} 성공 여부
 */
export function deleteScenario(scenarioId) {
  const scenarios = getScenarios();
  const index = scenarios.findIndex(s => s.id === scenarioId);

  if (index === -1) {
    console.error('[scenario-manager] 삭제할 시나리오를 찾을 수 없습니다:', scenarioId);
    return false;
  }

  const deleted = scenarios.splice(index, 1)[0];
  saveScenarios(scenarios);

  console.log('[scenario-manager] 시나리오 삭제 완료:', deleted.name);
  return true;
}

/**
 * 이름으로 시나리오 삭제
 * @param {string} name - 시나리오 이름
 * @returns {boolean} 성공 여부
 */
export function deleteScenarioByName(name) {
  const scenarios = getScenarios();
  const index = scenarios.findIndex(s => s.name === name || s.name.includes(name));

  if (index === -1) {
    console.error('[scenario-manager] 삭제할 시나리오를 찾을 수 없습니다:', name);
    return false;
  }

  const deleted = scenarios.splice(index, 1)[0];
  saveScenarios(scenarios);

  console.log('[scenario-manager] 시나리오 삭제 완료:', deleted.name);
  return true;
}

/**
 * 시나리오 이름 변경
 * @param {string} scenarioId - 시나리오 ID
 * @param {string} newName - 새 이름
 * @returns {boolean} 성공 여부
 */
export function renameScenario(scenarioId, newName) {
  if (!newName || newName.trim() === '') {
    console.error('[scenario-manager] 새 이름이 필요합니다');
    return false;
  }

  const scenarios = getScenarios();
  const scenario = scenarios.find(s => s.id === scenarioId);

  if (!scenario) {
    console.error('[scenario-manager] 시나리오를 찾을 수 없습니다:', scenarioId);
    return false;
  }

  const oldName = scenario.name;
  scenario.name = newName.trim();
  scenario.updatedAt = getCurrentDateTime();
  saveScenarios(scenarios);

  console.log('[scenario-manager] 시나리오 이름 변경:', oldName, '->', newName);
  return true;
}

/**
 * 시나리오 설명 수정
 * @param {string} scenarioId - 시나리오 ID
 * @param {string} newDescription - 새 설명
 * @returns {boolean} 성공 여부
 */
export function updateScenarioDescription(scenarioId, newDescription) {
  const scenarios = getScenarios();
  const scenario = scenarios.find(s => s.id === scenarioId);

  if (!scenario) {
    console.error('[scenario-manager] 시나리오를 찾을 수 없습니다:', scenarioId);
    return false;
  }

  scenario.description = (newDescription || '').trim();
  scenario.updatedAt = getCurrentDateTime();
  saveScenarios(scenarios);

  console.log('[scenario-manager] 시나리오 설명 수정 완료:', scenario.name);
  return true;
}

// ===== 유틸리티 =====

/**
 * 시나리오 개수 가져오기
 * @returns {number} 시나리오 개수
 */
export function getScenarioCount() {
  return getScenarios().length;
}

/**
 * 시나리오 ID로 검색
 * @param {string} scenarioId - 시나리오 ID
 * @returns {Object|null} 시나리오 객체 또는 null
 */
export function getScenarioById(scenarioId) {
  const scenarios = getScenarios();
  return scenarios.find(s => s.id === scenarioId) || null;
}

/**
 * 시나리오 이름으로 검색
 * @param {string} name - 시나리오 이름
 * @returns {Object|null} 시나리오 객체 또는 null
 */
export function getScenarioByName(name) {
  const scenarios = getScenarios();
  return scenarios.find(s => s.name === name || s.name.includes(name)) || null;
}

/**
 * 시나리오 목록을 포맷된 문자열로 반환
 * @returns {string} 시나리오 목록 문자열
 */
export function formatScenarioList() {
  const scenarios = getScenarios();
  
  if (scenarios.length === 0) {
    return '저장된 시나리오가 없습니다.';
  }

  const lines = ['📁 저장된 시나리오 목록:'];
  scenarios.forEach((s, i) => {
    const desc = s.description ? ` - ${s.description}` : '';
    lines.push(`  ${i + 1}. ${s.name}${desc} (${s.createdAt})`);
  });

  return lines.join('\n');
}

/**
 * 모든 시나리오 삭제 (주의!)
 * @returns {boolean} 성공 여부
 */
export function clearAllScenarios() {
  try {
    localStorage.removeItem(SCENARIOS_KEY);
    console.log('[scenario-manager] 모든 시나리오 삭제 완료');
    return true;
  } catch (e) {
    console.error('[scenario-manager] 시나리오 삭제 실패:', e);
    return false;
  }
}

// ===== 모듈 로드 확인 =====
console.log('[scenario-manager.js] 로드 완료');
console.log('[scenario-manager.js] 저장된 시나리오:', getScenarioCount(), '개');
