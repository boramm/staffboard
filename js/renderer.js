/**
 * renderer.js - 카드 렌더러
 * 
 * 부서/직원 카드를 화면에 그리기
 */

import { getBoardData } from './data-manager.js';
import { coordinateToIndex, getBlockFromCoordinate } from './grid-system.js';

// ===== 상수 =====
const PLACEHOLDER_PHOTO = '📷';

// 사진 캐시 (IndexedDB에서 로드)
let photoCache = {};


/**
 * 전체 보드 렌더링
 * boardData를 읽어서 좌/우 블록에 카드 배치
 */
export async function renderBoard() {
  const boardData = getBoardData();
  
  if (!boardData) {
    console.warn('[renderBoard] boardData가 없습니다');
    return;
  }
  
  console.log('[renderBoard] 렌더링 시작...');
  
  // IndexedDB에서 사진 로드
  try {
    const { getAllPhotos } = await import('./photo-manager.js');
    photoCache = await getAllPhotos();
    console.log('[renderBoard] 사진 로드:', Object.keys(photoCache).length, '개');
  } catch (e) {
    console.warn('[renderBoard] 사진 로드 실패:', e);
  }
  
  // 기존 카드 제거
  clearBoard();
  
  // 부서 카드 렌더링
  boardData.departments?.forEach(dept => {
    const cell = getCellByCoordinate(dept.location.coordinate, dept.location.block);
    if (cell) {
      const card = createDeptCard(dept);
      cell.appendChild(card);
    }
  });
  
  // 직원 카드 렌더링
  boardData.employees?.forEach(emp => {
    const cell = getCellByCoordinate(emp.location.coordinate, emp.location.block);
    if (cell) {
      const card = createEmpCard(emp);
      cell.appendChild(card);
    }
  });
  
  // 드래그 앤 드롭 활성화 (동적 import로 순환 참조 방지)
  import('./drag-handler.js').then(module => {
    module.enableCardDrag();
  });
  
  console.log('[renderBoard] 렌더링 완료');
}


/**
 * 모든 카드 제거 (셀은 유지)
 */
export function clearBoard() {
  const leftBlock = document.getElementById('leftBlock');
  const rightBlock = document.getElementById('rightBlock');
  
  [leftBlock, rightBlock].forEach(block => {
    if (!block) return;
    
    block.querySelectorAll('.grid-cell').forEach(cell => {
      // coord-label만 남기고 카드 제거
      const cards = cell.querySelectorAll('.dept-card, .emp-card');
      cards.forEach(card => card.remove());
    });
  });
}


/**
 * 좌표로 셀 요소 찾기 (엑셀 스타일, 블록 자동 판별)
 * @param {string} coord - 좌표 (예: "A1", "U1", "AA5")
 * @param {string} block - 블록 (선택, 좌표에서 자동 판별)
 * @returns {HTMLElement|null} 셀 요소
 */
export function getCellByCoordinate(coord, block = null) {
  const upperCoord = coord.toUpperCase();
  // 블록이 지정되지 않으면 좌표에서 자동 판별
  const targetBlock = block || getBlockFromCoordinate(upperCoord);
  const blockId = targetBlock === 'left' ? 'leftBlock' : 'rightBlock';
  const blockEl = document.getElementById(blockId);
  
  if (!blockEl) return null;
  
  return blockEl.querySelector(`.grid-cell[data-coord="${upperCoord}"]`);
}


/**
 * 부서 카드 HTML 생성
 * @param {Object} dept - 부서 데이터
 * @returns {HTMLElement} 부서 카드 요소
 */
export function createDeptCard(dept) {
  const card = document.createElement('div');
  card.className = 'dept-card';
  card.dataset.id = dept.id;
  card.dataset.type = 'department';
  
  // 상위부서면 노란 밑줄 클래스 추가
  if (dept.isParentOrg) {
    card.classList.add('parent-org');
  }
  
  // 부서명 (displayName이 있으면 사용, 없으면 dept 사용)
  const deptName = document.createElement('div');
  deptName.className = 'dept-name';
  deptName.style.whiteSpace = 'pre-line';
  deptName.textContent = dept.displayName || dept.dept;
  card.appendChild(deptName);
  
  // 하위 팀명 (있으면)
  if (dept.subDept) {
    const subDept = document.createElement('div');
    subDept.className = 'sub';
    subDept.textContent = dept.subDept;
    card.appendChild(subDept);
  }
  
  // 더블클릭으로 부서명 편집
  card.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    openDeptEditor(dept, card);
  });
  
  return card;
}

/**
 * 부서명 편집 모달 열기
 */
function openDeptEditor(dept, card) {
  // 기존 모달 제거
  const existingModal = document.querySelector('.dept-editor-modal');
  if (existingModal) existingModal.remove();
  
  const deptId = dept.id;  // ID 저장 (클로저 안전)
  
  const modal = document.createElement('div');
  modal.className = 'dept-editor-modal';
  modal.innerHTML = `
    <div class="dept-editor-content" onclick="event.stopPropagation()">
      <div class="dept-editor-header">
        <h3>부서 편집</h3>
        <button class="btn-close-modal" type="button">✕</button>
      </div>
      <div class="dept-editor-body">
        <label>부서명 (줄바꿈 가능)</label>
        <textarea class="dept-name-input" rows="2" placeholder="예: 공통기기&#10;실험실">${dept.displayName || dept.dept}</textarea>
        
        <label style="margin-top: 12px;">부제목 (작은 글씨, 선택)</label>
        <input type="text" class="dept-sub-input" placeholder="예: 교수학습개발센터" value="${dept.subDept || ''}">
        
        <label style="margin-top: 12px;">
          <input type="checkbox" class="dept-parent-checkbox" ${dept.isParentOrg ? 'checked' : ''}>
          상위 조직 (노란 밑줄)
        </label>
        
        <p class="hint">Enter로 줄바꿈, 저장 버튼으로 저장</p>
      </div>
      <div class="dept-editor-footer">
        <button class="btn-cancel" type="button">취소</button>
        <button class="btn-save" type="button">저장</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // 모달이 추가된 후 약간의 딜레이
  requestAnimationFrame(() => {
    modal.style.opacity = '1';
  });
  
  const textarea = modal.querySelector('.dept-name-input');
  const subInput = modal.querySelector('.dept-sub-input');
  const parentCheckbox = modal.querySelector('.dept-parent-checkbox');
  const closeBtn = modal.querySelector('.btn-close-modal');
  const cancelBtn = modal.querySelector('.btn-cancel');
  const saveBtn = modal.querySelector('.btn-save');
  
  // 포커스는 약간 딜레이
  setTimeout(() => {
    textarea.focus();
    textarea.select();
  }, 100);
  
  // 닫기 함수
  const closeModal = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    modal.remove();
  };
  
  // 이벤트 리스너
  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  
  // 배경 클릭 시 닫기 (content 내부 클릭은 제외)
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal(e);
    }
  });
  
  // ESC 키로 닫기
  const handleKeydown = (e) => {
    if (e.key === 'Escape') {
      closeModal(e);
      document.removeEventListener('keydown', handleKeydown);
    }
  };
  document.addEventListener('keydown', handleKeydown);
  
  // 저장
  saveBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const newName = textarea.value.trim();
    const newSubDept = subInput.value.trim();
    const isParent = parentCheckbox.checked;
    
    if (newName) {
      // boardData에서 해당 부서를 ID로 찾아서 수정
      const boardData = getBoardData();
      const targetDept = boardData.departments.find(d => d.id === deptId);
      
      if (targetDept) {
        targetDept.displayName = newName;
        targetDept.subDept = newSubDept;
        targetDept.isParentOrg = isParent;
        
        // 카드 UI 업데이트
        const nameEl = card.querySelector('.dept-name');
        if (nameEl) nameEl.textContent = newName;
        
        // 부제목 업데이트
        let subEl = card.querySelector('.sub');
        if (newSubDept) {
          if (!subEl) {
            subEl = document.createElement('div');
            subEl.className = 'sub';
            card.appendChild(subEl);
          }
          subEl.textContent = newSubDept;
        } else if (subEl) {
          subEl.remove();
        }
        
        // 상위 조직 클래스 업데이트
        if (isParent) {
          card.classList.add('parent-org');
        } else {
          card.classList.remove('parent-org');
        }
        
        // localStorage에 저장
        const { saveToLocalStorage } = await import('./data-manager.js');
        saveToLocalStorage();
        console.log('[부서 수정]', targetDept.dept, '→', newName, newSubDept ? `(${newSubDept})` : '');
      }
    }
    
    document.removeEventListener('keydown', handleKeydown);
    closeModal(e);
  });
}


/**
 * 직종 분류 (정규직/계약직/기능직)
 * @param {Object} emp - 직원 데이터
 * @returns {string} 'regular' | 'contract' | 'functional'
 */
function getEmpType(emp) {
  // 1. empType 필드가 있으면 우선 사용 (엑셀 "직종" 컬럼에서 변환)
  if (emp.empType) {
    return emp.empType;
  }
  
  // 2. 없으면 position에서 추론 (호환성 유지)
  const pos = emp.position || '';
  if (pos.includes('계약') || pos.includes('촉탁') || pos.includes('무기')) {
    return 'contract';
  }
  if (pos === '기능직') {
    return 'functional';
  }
  return 'regular';  // 정규직 (기본값)
}

/**
 * 팀장급 여부 판단 (팀장, 처장만)
 */
function isLeader(position) {
  const pos = position || '';
  return pos.includes('팀장') || pos.includes('처장');
}

/**
 * 직원 카드 HTML 생성
 * @param {Object} emp - 직원 데이터
 * @returns {HTMLElement} 직원 카드 요소
 */
export function createEmpCard(emp) {
  const card = document.createElement('div');
  card.className = 'emp-card';
  card.dataset.id = emp.id;
  card.dataset.type = 'employee';
  
  // 직종 분류 클래스 추가 (정규직/계약직/기능직)
  const empType = getEmpType(emp);
  card.classList.add(empType);
  
  // 팀장급 클래스 추가
  if (isLeader(emp.position)) {
    card.classList.add('leader');
  }
  
  // 사진 영역
  const photoDiv = document.createElement('div');
  photoDiv.className = 'emp-photo';
  
  // IndexedDB에서 사진 가져오기 또는 기존 photo 사용
  let photoSrc = null;
  if (emp.photo?.startsWith('indexeddb://')) {
    photoSrc = photoCache[emp.id] || null;
  } else if (emp.photo) {
    photoSrc = emp.photo;
  }
  
  if (photoSrc) {
    const img = document.createElement('img');
    img.src = photoSrc;
    img.alt = emp.name;
    img.style.objectPosition = `center ${emp.photoPosY || 30}%`;
    photoDiv.appendChild(img);
  } else {
    // 사진 없으면 placeholder
    const placeholder = document.createElement('div');
    placeholder.className = 'photo-placeholder';
    placeholder.textContent = PLACEHOLDER_PHOTO;
    photoDiv.appendChild(placeholder);
  }
  card.appendChild(photoDiv);
  
  // 정보 영역
  const infoDiv = document.createElement('div');
  infoDiv.className = 'emp-info';
  
  // 이름 (팀장급은 ⭐ 추가)
  const nameDiv = document.createElement('div');
  nameDiv.className = 'emp-name';
  nameDiv.textContent = isLeader(emp.position) ? `${emp.name}⭐` : emp.name;
  infoDiv.appendChild(nameDiv);
  
  // 직위 (축약)
  if (emp.position) {
    const posDiv = document.createElement('div');
    posDiv.className = 'emp-position';
    posDiv.textContent = emp.position;
    infoDiv.appendChild(posDiv);
  }
  
  card.appendChild(infoDiv);
  
  return card;
}


/**
 * 특정 좌표의 카드에 하이라이트 효과
 * @param {string} coord - 좌표 (엑셀 스타일)
 * @param {string} block - 블록 (선택, 좌표에서 자동 판별)
 * @param {number} duration - 지속 시간 (ms)
 */
export function highlightCard(coord, block = null, duration = 2000) {
  const cell = getCellByCoordinate(coord, block);
  if (!cell) return;
  
  const card = cell.querySelector('.dept-card, .emp-card');
  if (!card) return;
  
  card.classList.add('highlight');
  
  setTimeout(() => {
    card.classList.remove('highlight');
  }, duration);
}


/**
 * 여러 카드 하이라이트
 * @param {Array} items - [{coord, block}, ...]
 * @param {number} duration - 지속 시간 (ms)
 */
export function highlightCards(items, duration = 2000) {
  items.forEach(item => {
    highlightCard(item.coord, item.block, duration);
  });
}


/**
 * 카드 이동 애니메이션
 * @param {string} fromCoord - 시작 좌표
 * @param {string} toCoord - 목표 좌표
 * @param {string} block - 블록
 */
export function animateCardMove(fromCoord, toCoord, block) {
  // TODO: 추후 구현 (CSS transition 활용)
  console.log(`[animateCardMove] ${fromCoord} → ${toCoord}`);
}


// ===== 초기화 로그 =====
console.log('[renderer.js] 로드 완료');
