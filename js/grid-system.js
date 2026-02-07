/**
 * grid-system.js - 통합 좌표 시스템 (엑셀 스타일)
 * 
 * 40열 x 13행 = 520셀
 * 
 * 좌표 체계 (엑셀 스타일):
 *   열(Column): A~Z, AA~AN (40개)
 *   행(Row): 1~13
 * 
 * 블록 구분:
 *   좌측 블록: A~T (1~20열)
 *   우측 블록: U~AN (21~40열)
 */

import { BOARD_CONFIG } from './config.js';

// 상수
const TOTAL_COLS = 40;  // 전체 열 개수
const TOTAL_ROWS = 13;  // 전체 행 개수
const LEFT_COLS = 20;   // 좌측 블록 열 개수


/**
 * 열 번호 → 열 문자 변환 (엑셀 스타일)
 * 0='A', 25='Z', 26='AA', 39='AN'
 */
export function colToLetter(col) {
  if (col < 26) {
    return String.fromCharCode(65 + col);  // A~Z
  } else {
    return 'A' + String.fromCharCode(65 + col - 26);  // AA~AN
  }
}


/**
 * 열 문자 → 열 번호 변환
 * 'A'=0, 'Z'=25, 'AA'=26, 'AN'=39
 */
export function letterToCol(letter) {
  const upper = letter.toUpperCase();
  if (upper.length === 1) {
    return upper.charCodeAt(0) - 65;  // A~Z → 0~25
  } else if (upper.length === 2 && upper[0] === 'A') {
    return 26 + (upper.charCodeAt(1) - 65);  // AA~AN → 26~39
  }
  return -1;
}


/**
 * 인덱스 → 좌표 변환
 * @param {number} index - 그리드 인덱스 (0~519)
 * @returns {string} 좌표 문자열 (예: "A1", "AA5", "AN13")
 */
export function indexToCoordinate(index) {
  if (index < 0 || index >= TOTAL_COLS * TOTAL_ROWS) {
    console.warn(`[indexToCoordinate] 유효하지 않은 인덱스: ${index}`);
    return null;
  }
  
  const col = index % TOTAL_COLS;
  const row = Math.floor(index / TOTAL_COLS);
  
  return colToLetter(col) + (row + 1);
}


/**
 * 좌표 → 인덱스 변환
 * @param {string} coord - 좌표 문자열 (예: "C5", "AA3")
 * @returns {number} 그리드 인덱스 (0~519), 실패 시 -1
 */
export function coordinateToIndex(coord) {
  const parsed = parseCoordinate(coord);
  if (!parsed) return -1;
  
  return parsed.rowIndex * TOTAL_COLS + parsed.colIndex;
}


/**
 * 좌표 유효성 검사
 * @param {string} coord - 좌표 문자열
 * @returns {boolean} 유효 여부
 */
export function isValidCoordinate(coord) {
  if (typeof coord !== 'string' || coord.length < 2) {
    return false;
  }
  
  const parsed = parseCoordinate(coord);
  if (!parsed) return false;
  
  return parsed.colIndex >= 0 && parsed.colIndex < TOTAL_COLS &&
         parsed.rowIndex >= 0 && parsed.rowIndex < TOTAL_ROWS;
}


/**
 * 좌표 파싱
 * @param {string} coord - 좌표 문자열 (예: "C5", "AA3")
 * @returns {Object|null} { col, row, colIndex, rowIndex, block }
 */
export function parseCoordinate(coord) {
  if (!coord || typeof coord !== 'string') return null;
  
  const upper = coord.toUpperCase().trim();
  
  // 정규식: A~Z 또는 AA~AZ + 1~13
  const match = upper.match(/^([A-Z]{1,2})(1[0-3]|[1-9])$/);
  if (!match) return null;
  
  const colLetter = match[1];
  const rowNumber = parseInt(match[2], 10);
  
  const colIndex = letterToCol(colLetter);
  if (colIndex < 0 || colIndex >= TOTAL_COLS) return null;
  
  const rowIndex = rowNumber - 1;
  if (rowIndex < 0 || rowIndex >= TOTAL_ROWS) return null;
  
  // 블록 판별 (1~20열: left, 21~40열: right)
  const block = colIndex < LEFT_COLS ? 'left' : 'right';
  
  return {
    col: colLetter,
    row: rowNumber,
    colIndex,
    rowIndex,
    block,
    coordinate: colLetter + rowNumber
  };
}


/**
 * 좌표에서 블록 판별
 * @param {string} coord - 좌표
 * @returns {string} 'left' 또는 'right'
 */
export function getBlockFromCoordinate(coord) {
  const parsed = parseCoordinate(coord);
  return parsed ? parsed.block : 'left';
}


/**
 * 블록 내 로컬 좌표로 변환
 * @param {string} coord - 전체 좌표 (예: "AA3")
 * @returns {Object} { localCol, localRow, localIndex }
 */
export function toLocalCoordinate(coord) {
  const parsed = parseCoordinate(coord);
  if (!parsed) return null;
  
  const localCol = parsed.block === 'left' 
    ? parsed.colIndex 
    : parsed.colIndex - LEFT_COLS;
  
  return {
    localCol,
    localRow: parsed.rowIndex,
    localIndex: parsed.rowIndex * LEFT_COLS + localCol,
    block: parsed.block
  };
}


/**
 * 블록 + 로컬 인덱스 → 전체 좌표
 * @param {string} block - 'left' 또는 'right'
 * @param {number} localIndex - 블록 내 인덱스 (0~259)
 * @returns {string} 전체 좌표
 */
export function fromLocalIndex(block, localIndex) {
  const localCol = localIndex % LEFT_COLS;
  const row = Math.floor(localIndex / LEFT_COLS);
  
  const globalCol = block === 'left' ? localCol : localCol + LEFT_COLS;
  
  return colToLetter(globalCol) + (row + 1);
}


/**
 * 두 좌표 사이의 거리 계산
 */
export function getDistance(coord1, coord2) {
  const pos1 = parseCoordinate(coord1);
  const pos2 = parseCoordinate(coord2);
  
  if (!pos1 || !pos2) return null;
  
  const dx = Math.abs(pos2.colIndex - pos1.colIndex);
  const dy = Math.abs(pos2.rowIndex - pos1.rowIndex);
  
  return { dx, dy, distance: Math.sqrt(dx * dx + dy * dy) };
}


/**
 * 주변 빈 좌표 찾기
 */
export function findNearestEmpty(startCoord, occupiedCoords, maxRadius = 10) {
  const start = parseCoordinate(startCoord);
  if (!start) return null;
  
  if (!occupiedCoords.has(startCoord.toUpperCase())) {
    return startCoord.toUpperCase();
  }
  
  for (let r = 1; r <= maxRadius; r++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
        
        const newCol = start.colIndex + dx;
        const newRow = start.rowIndex + dy;
        
        if (newCol < 0 || newCol >= TOTAL_COLS) continue;
        if (newRow < 0 || newRow >= TOTAL_ROWS) continue;
        
        const newCoord = colToLetter(newCol) + (newRow + 1);
        
        if (!occupiedCoords.has(newCoord)) {
          return newCoord;
        }
      }
    }
  }
  
  return null;
}


// ===== 테스트 =====
console.log('=== grid-system.js (40열 통합) 테스트 ===');
console.log('colToLetter(0):', colToLetter(0));     // A
console.log('colToLetter(19):', colToLetter(19));   // T (좌측 끝)
console.log('colToLetter(20):', colToLetter(20));   // U (우측 시작)
console.log('colToLetter(25):', colToLetter(25));   // Z
console.log('colToLetter(26):', colToLetter(26));   // AA
console.log('colToLetter(39):', colToLetter(39));   // AN (우측 끝)

console.log('letterToCol("A"):', letterToCol('A'));   // 0
console.log('letterToCol("T"):', letterToCol('T'));   // 19
console.log('letterToCol("U"):', letterToCol('U'));   // 20
console.log('letterToCol("AA"):', letterToCol('AA')); // 26
console.log('letterToCol("AN"):', letterToCol('AN')); // 39

console.log('indexToCoordinate(0):', indexToCoordinate(0));     // A1
console.log('indexToCoordinate(19):', indexToCoordinate(19));   // T1
console.log('indexToCoordinate(20):', indexToCoordinate(20));   // U1
console.log('indexToCoordinate(39):', indexToCoordinate(39));   // AN1
console.log('indexToCoordinate(519):', indexToCoordinate(519)); // AN13

console.log('parseCoordinate("A1"):', parseCoordinate('A1'));
console.log('parseCoordinate("U1"):', parseCoordinate('U1'));
console.log('parseCoordinate("AA5"):', parseCoordinate('AA5'));

console.log('=== grid-system.js 로드 완료 ===');
