/**
 * drag-handler.js - HTML5 Drag & Drop 핸들러
 * 
 * 심플한 드래그 앤 드롭: 위치만 교환
 */

import { getBoardData, saveToLocalStorage } from './data-manager.js';
import { renderBoard } from './renderer.js';
import { getBlockFromCoordinate } from './grid-system.js';

// 드래그 중인 아이템 정보
let draggedItem = null;

/**
 * 드래그 앤 드롭 초기화
 * 모든 그리드 셀에 드롭 이벤트 등록
 */
export function initDragAndDrop() {
  const cells = document.querySelectorAll('.grid-cell');
  
  cells.forEach(cell => {
    // 드롭 허용
    cell.addEventListener('dragover', handleDragOver);
    cell.addEventListener('dragenter', handleDragEnter);
    cell.addEventListener('dragleave', handleDragLeave);
    cell.addEventListener('drop', handleDrop);
  });
  
  console.log('[drag-handler] 드래그 앤 드롭 초기화 완료');
}

/**
 * 카드에 드래그 속성 부여
 * renderBoard() 후에 호출
 */
export function enableCardDrag() {
  const cards = document.querySelectorAll('.dept-card, .emp-card');
  
  cards.forEach(card => {
    card.draggable = true;
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);
  });
  
  console.log('[drag-handler] 카드 드래그 활성화:', cards.length, '개');
}

/**
 * 드래그 시작
 */
function handleDragStart(e) {
  const card = e.target.closest('.dept-card, .emp-card');
  if (!card) return;
  
  const cell = card.closest('.grid-cell');
  const coord = cell.dataset.coord;
  const type = card.classList.contains('dept-card') ? 'department' : 'employee';
  const id = card.dataset.id;
  
  draggedItem = { type, id, coord };
  
  // 드래그 이미지 설정
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', JSON.stringify(draggedItem));
  
  // 드래그 중 스타일
  card.classList.add('dragging');
  
  console.log('[drag] 시작:', draggedItem);
}

/**
 * 드래그 종료
 */
function handleDragEnd(e) {
  const card = e.target.closest('.dept-card, .emp-card');
  if (card) {
    card.classList.remove('dragging');
  }
  draggedItem = null;
}

/**
 * 드래그 오버 (드롭 허용)
 */
function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

/**
 * 드래그 진입
 */
function handleDragEnter(e) {
  e.preventDefault();
  const cell = e.target.closest('.grid-cell');
  if (cell) {
    cell.classList.add('drag-over');
  }
}

/**
 * 드래그 이탈
 */
function handleDragLeave(e) {
  const cell = e.target.closest('.grid-cell');
  if (cell) {
    cell.classList.remove('drag-over');
  }
}

/**
 * 드롭 처리
 */
function handleDrop(e) {
  e.preventDefault();
  
  const cell = e.target.closest('.grid-cell');
  if (!cell) return;
  
  cell.classList.remove('drag-over');
  
  if (!draggedItem) return;
  
  const targetCoord = cell.dataset.coord;
  const sourceCoord = draggedItem.coord;
  
  // 같은 위치면 무시
  if (targetCoord === sourceCoord) return;
  
  console.log('[drop]', sourceCoord, '→', targetCoord);
  
  // 위치 교환 실행
  swapLocations(sourceCoord, targetCoord);
  
  // 다시 렌더링
  renderBoard();
  
  // 저장
  saveToLocalStorage();
  
  draggedItem = null;
}

/**
 * 두 좌표의 아이템 위치 교환
 * boardData에서 location만 변경
 */
function swapLocations(coord1, coord2) {
  const boardData = getBoardData();
  if (!boardData) return;
  
  // coord1에 있는 아이템 찾기
  const item1 = findItemByCoord(boardData, coord1);
  // coord2에 있는 아이템 찾기
  const item2 = findItemByCoord(boardData, coord2);
  
  // item1의 위치를 coord2로
  if (item1) {
    item1.location.coordinate = coord2;
    item1.location.block = getBlockFromCoordinate(coord2);
  }
  
  // item2의 위치를 coord1로 (있으면)
  if (item2) {
    item2.location.coordinate = coord1;
    item2.location.block = getBlockFromCoordinate(coord1);
  }
  
  console.log('[swap] 완료:', coord1, '↔', coord2);
}

/**
 * 좌표로 아이템 찾기 (부서 또는 직원)
 */
function findItemByCoord(boardData, coord) {
  const upperCoord = coord.toUpperCase();
  
  // 부서에서 찾기
  const dept = boardData.departments?.find(d => 
    d.location?.coordinate?.toUpperCase() === upperCoord
  );
  if (dept) return dept;
  
  // 직원에서 찾기
  const emp = boardData.employees?.find(e => 
    e.location?.coordinate?.toUpperCase() === upperCoord
  );
  return emp || null;
}

// ===== 모듈 로드 확인 =====
console.log('[drag-handler.js] 로드 완료');
