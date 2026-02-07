/**
 * config.js - 교직원 현황판 V2 기본 설정
 * 
 * 모든 설정값을 중앙에서 관리합니다.
 */

// ===== 보드 설정 =====
export const BOARD_CONFIG = {
  // 좌/우 블록 정보
  blocks: {
    left: { cols: 20, rows: 13, total: 260 },
    right: { cols: 20, rows: 13, total: 260 }
  },
  
  // 카드 비율 (가로:세로 = 3:4, 증명사진 비율)
  cardRatio: '3 / 4',
  cardMinHeight: '62px',
  
  // 그리드 간격
  gridGap: {
    row: '10px',   // 상하 간격
    col: '6px'     // 좌우 간격
  },
  
  // 출력 설정
  printSize: 'A1',
  printOrientation: 'landscape'
};


// ===== 부서 순서 및 블록 배정 =====
// 삼육대학교 조직도 기준
export const DEPT_ORDER = [
  // 좌측 블록 (left)
  { name: '대학본부', block: 'left' },
  { name: '교목실', block: 'left' },
  { name: '교무처', block: 'left' },
  { name: '학생처', block: 'left' },
  { name: '기획처', block: 'left' },
  { name: '총무처', block: 'left' },
  { name: '입학홍보처', block: 'left' },
  { name: '대외협력처', block: 'left' },
  
  // 우측 블록 (right)
  { name: '사무처', block: 'right' },
  { name: '도서관', block: 'right' },
  { name: '정보전산원', block: 'right' },
  { name: '교육혁신원', block: 'right' },
  { name: '대학혁신지원사업단', block: 'right' },
  { name: '창업지원단', block: 'right' },
  { name: '산학협력단', block: 'right' },
  { name: '평생교육원', block: 'right' }
];


// ===== 부서 색상 =====
export const DEPT_COLORS = {
  default: {
    bg: 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
    text: '#ffffff'
  },
  parentOrg: {
    borderBottom: '3px solid #fbbf24'
  }
};


// ===== 유틸리티 함수 =====

/**
 * 고유 ID 생성
 * @param {string} prefix - ID 앞에 붙일 접두사 (예: 'emp', 'dept')
 * @returns {string} 고유 ID
 */
export function genId(prefix = 'id') {
  return `${prefix}_${crypto.randomUUID()}`;
}


/**
 * 현재 날짜/시간 반환
 * @returns {string} YYYY-MM-DD HH:mm:ss 형식의 문자열
 */
export function getCurrentDateTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}


/**
 * ISO 형식 날짜/시간 반환
 * @returns {string} ISO 8601 형식의 문자열
 */
export function getCurrentDateTimeISO() {
  return new Date().toISOString();
}


// ===== 테스트 (콘솔에서 확인) =====
console.log('[config.js] 로드 완료');
console.log('[config.js] BOARD_CONFIG:', BOARD_CONFIG);
console.log('[config.js] genId() 테스트:', genId('emp'), genId('dept'));
console.log('[config.js] getCurrentDateTime():', getCurrentDateTime());
