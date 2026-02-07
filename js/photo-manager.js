/**
 * photo-manager.js - 직원 사진 관리 모듈
 * 
 * 기능:
 * - IndexedDB에 사진 저장
 * - 드래그 앤 드롭 업로드
 * - 얼굴 위치 조정 (photoPosY)
 * - 일괄 업로드 지원
 */

import { getBoardData, saveToLocalStorage } from './data-manager.js';
import { renderBoard } from './renderer.js';

// ===== IndexedDB 설정 =====
const DB_NAME = 'staffboard_photos';
const DB_VERSION = 1;
const STORE_NAME = 'photos';

let db = null;

/**
 * IndexedDB 초기화
 */
export async function initPhotoManager() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => {
      console.error('[photo-manager] DB 열기 실패:', request.error);
      reject(request.error);
    };
    
    request.onsuccess = () => {
      db = request.result;
      console.log('[photo-manager] DB 연결 성공');
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'empId' });
        store.createIndex('name', 'name', { unique: false });
        console.log('[photo-manager] photos 스토어 생성');
      }
    };
  });
}

/**
 * 사진 저장 (IndexedDB)
 * @param {string} empId - 직원 ID
 * @param {string} empName - 직원 이름
 * @param {string} photoData - Base64 이미지 데이터
 */
export async function savePhoto(empId, empName, photoData) {
  if (!db) await initPhotoManager();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const data = {
      empId,
      name: empName,
      photo: photoData,
      updatedAt: new Date().toISOString()
    };
    
    const request = store.put(data);
    
    request.onsuccess = () => {
      console.log(`[photo-manager] 사진 저장: ${empName}`);
      resolve(true);
    };
    
    request.onerror = () => {
      console.error('[photo-manager] 사진 저장 실패:', request.error);
      reject(request.error);
    };
  });
}

/**
 * 사진 불러오기 (IndexedDB)
 * @param {string} empId - 직원 ID
 * @returns {string|null} Base64 이미지 데이터
 */
export async function getPhoto(empId) {
  if (!db) await initPhotoManager();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(empId);
    
    request.onsuccess = () => {
      resolve(request.result?.photo || null);
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * 모든 사진 불러오기
 * @returns {Object} { empId: photoData, ... }
 */
export async function getAllPhotos() {
  if (!db) await initPhotoManager();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    
    request.onsuccess = () => {
      const photos = {};
      request.result.forEach(item => {
        photos[item.empId] = item.photo;
      });
      resolve(photos);
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * 사진 삭제
 * @param {string} empId - 직원 ID
 */
export async function deletePhoto(empId) {
  if (!db) await initPhotoManager();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(empId);
    
    request.onsuccess = () => {
      console.log(`[photo-manager] 사진 삭제: ${empId}`);
      resolve(true);
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * 파일을 Base64로 변환
 * @param {File} file - 이미지 파일
 * @returns {Promise<string>} Base64 데이터
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * 이미지 리사이즈 (최대 크기 제한)
 * @param {string} base64 - 원본 Base64
 * @param {number} maxWidth - 최대 너비
 * @param {number} maxHeight - 최대 높이
 * @returns {Promise<string>} 리사이즈된 Base64
 */
export function resizeImage(base64, maxWidth = 200, maxHeight = 300) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      
      // 비율 유지하며 리사이즈
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.src = base64;
  });
}

/**
 * 직원에게 사진 할당
 * @param {string} empId - 직원 ID
 * @param {File} file - 이미지 파일
 */
export async function assignPhotoToEmployee(empId, file) {
  const boardData = getBoardData();
  const emp = boardData.employees?.find(e => e.id === empId);
  
  if (!emp) {
    console.error('[photo-manager] 직원을 찾을 수 없습니다:', empId);
    return false;
  }
  
  try {
    // Base64 변환 및 리사이즈
    let base64 = await fileToBase64(file);
    base64 = await resizeImage(base64);
    
    // IndexedDB에 저장
    await savePhoto(empId, emp.name, base64);
    
    // boardData에 photo 경로 표시 (실제 데이터는 IndexedDB)
    emp.photo = `indexeddb://${empId}`;
    saveToLocalStorage();
    
    return true;
  } catch (error) {
    console.error('[photo-manager] 사진 할당 실패:', error);
    return false;
  }
}

/**
 * 파일명으로 직원 매칭 (일괄 업로드용)
 * 파일명 형식: "홍길동.jpg" 또는 "홍길동_기획팀.jpg"
 * @param {string} filename - 파일명
 * @returns {Object|null} 매칭된 직원
 */
export function matchEmployeeByFilename(filename) {
  const boardData = getBoardData();
  if (!boardData?.employees) return null;
  
  // 확장자 제거
  const nameOnly = filename.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '');
  
  // 이름 추출 (언더스코어나 공백으로 구분된 경우 첫 번째 부분)
  const namePart = nameOnly.split(/[_\s]/)[0];
  
  // 직원 찾기
  return boardData.employees.find(e => e.name === namePart) || null;
}

/**
 * 일괄 업로드 처리
 * @param {FileList|File[]} files - 이미지 파일 목록
 * @returns {Object} { success: number, failed: number, results: [] }
 */
export async function bulkUpload(files) {
  const results = {
    success: 0,
    failed: 0,
    results: []
  };
  
  for (const file of files) {
    const emp = matchEmployeeByFilename(file.name);
    
    if (emp) {
      const success = await assignPhotoToEmployee(emp.id, file);
      if (success) {
        results.success++;
        results.results.push({ name: emp.name, status: 'success' });
      } else {
        results.failed++;
        results.results.push({ name: file.name, status: 'error' });
      }
    } else {
      results.failed++;
      results.results.push({ name: file.name, status: 'not_found' });
    }
  }
  
  // 렌더링 갱신
  if (results.success > 0) {
    renderBoard();
  }
  
  console.log(`[photo-manager] 일괄 업로드 완료: 성공 ${results.success}, 실패 ${results.failed}`);
  return results;
}

/**
 * 얼굴 위치 조정 (photoPosY)
 * @param {string} empId - 직원 ID
 * @param {number} posY - Y 위치 (0~100, 기본값 30)
 */
export function adjustPhotoPosition(empId, posY) {
  const boardData = getBoardData();
  const emp = boardData.employees?.find(e => e.id === empId);
  
  if (!emp) {
    console.error('[photo-manager] 직원을 찾을 수 없습니다:', empId);
    return false;
  }
  
  // 범위 제한
  emp.photoPosY = Math.max(0, Math.min(100, posY));
  saveToLocalStorage();
  
  console.log(`[photo-manager] ${emp.name} 사진 위치: ${emp.photoPosY}%`);
  return true;
}

/**
 * 사진 편집 모달 열기
 * @param {string} empId - 직원 ID
 */
export function openPhotoEditor(empId) {
  const boardData = getBoardData();
  const emp = boardData.employees?.find(e => e.id === empId);
  
  if (!emp) return;
  
  // 모달 HTML 생성
  const modal = document.createElement('div');
  modal.className = 'photo-editor-modal';
  modal.innerHTML = `
    <div class="photo-editor-content">
      <div class="photo-editor-header">
        <h3>📷 ${emp.name} 사진 편집</h3>
        <button class="btn-close-modal">✕</button>
      </div>
      <div class="photo-editor-body">
        <div class="photo-preview" id="photoPreview">
          <div class="photo-placeholder">📷 사진을 드래그하거나 클릭하세요</div>
        </div>
        <input type="file" id="photoFileInput" accept="image/*" style="display:none">
        <div class="photo-controls">
          <label>얼굴 위치 조정:</label>
          <input type="range" id="photoPosYSlider" min="0" max="100" value="${emp.photoPosY || 30}">
          <span id="photoPosYValue">${emp.photoPosY || 30}%</span>
        </div>
      </div>
      <div class="photo-editor-footer">
        <button class="btn-delete-photo">🗑️ 삭제</button>
        <button class="btn-save-photo">💾 저장</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // 현재 사진 표시
  loadPhotoPreview(empId, modal);
  
  // 이벤트 바인딩
  bindPhotoEditorEvents(modal, empId);
}

/**
 * 사진 프리뷰 로드
 */
async function loadPhotoPreview(empId, modal) {
  const preview = modal.querySelector('#photoPreview');
  const photo = await getPhoto(empId);
  
  if (photo) {
    const boardData = getBoardData();
    const emp = boardData.employees?.find(e => e.id === empId);
    const posY = emp?.photoPosY || 30;
    
    preview.innerHTML = `<img src="${photo}" style="object-position: center ${posY}%">`;
  }
}

/**
 * 사진 편집 이벤트 바인딩
 */
function bindPhotoEditorEvents(modal, empId) {
  const preview = modal.querySelector('#photoPreview');
  const fileInput = modal.querySelector('#photoFileInput');
  const slider = modal.querySelector('#photoPosYSlider');
  const valueDisplay = modal.querySelector('#photoPosYValue');
  
  // 닫기
  modal.querySelector('.btn-close-modal').addEventListener('click', () => {
    modal.remove();
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
  
  // 클릭으로 파일 선택
  preview.addEventListener('click', () => {
    fileInput.click();
  });
  
  // 드래그 앤 드롭
  preview.addEventListener('dragover', (e) => {
    e.preventDefault();
    preview.classList.add('drag-over');
  });
  
  preview.addEventListener('dragleave', () => {
    preview.classList.remove('drag-over');
  });
  
  preview.addEventListener('drop', async (e) => {
    e.preventDefault();
    preview.classList.remove('drag-over');
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      await handlePhotoUpload(empId, file, modal);
    }
  });
  
  // 파일 선택
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      await handlePhotoUpload(empId, file, modal);
    }
  });
  
  // 위치 조정
  slider.addEventListener('input', (e) => {
    const value = e.target.value;
    valueDisplay.textContent = `${value}%`;
    
    const img = preview.querySelector('img');
    if (img) {
      img.style.objectPosition = `center ${value}%`;
    }
  });
  
  // 저장
  modal.querySelector('.btn-save-photo').addEventListener('click', () => {
    const posY = parseInt(slider.value);
    adjustPhotoPosition(empId, posY);
    renderBoard();
    modal.remove();
  });
  
  // 삭제
  modal.querySelector('.btn-delete-photo').addEventListener('click', async () => {
    if (confirm('사진을 삭제할까요?')) {
      await deletePhoto(empId);
      
      const boardData = getBoardData();
      const emp = boardData.employees?.find(e => e.id === empId);
      if (emp) {
        emp.photo = null;
        saveToLocalStorage();
      }
      
      renderBoard();
      modal.remove();
    }
  });
}

/**
 * 사진 업로드 처리
 */
async function handlePhotoUpload(empId, file, modal) {
  const preview = modal.querySelector('#photoPreview');
  
  try {
    let base64 = await fileToBase64(file);
    base64 = await resizeImage(base64);
    
    // IndexedDB에 저장
    const boardData = getBoardData();
    const emp = boardData.employees?.find(e => e.id === empId);
    await savePhoto(empId, emp?.name || empId, base64);
    
    // boardData 업데이트
    if (emp) {
      emp.photo = `indexeddb://${empId}`;
      saveToLocalStorage();
    }
    
    // 프리뷰 업데이트
    const posY = modal.querySelector('#photoPosYSlider').value;
    preview.innerHTML = `<img src="${base64}" style="object-position: center ${posY}%">`;
    
  } catch (error) {
    console.error('[photo-manager] 업로드 실패:', error);
    alert('사진 업로드에 실패했습니다.');
  }
}

/**
 * 일괄 업로드 모달 열기
 */
export function openBulkUploadModal() {
  const modal = document.createElement('div');
  modal.className = 'photo-editor-modal';
  modal.innerHTML = `
    <div class="photo-editor-content bulk-upload">
      <div class="photo-editor-header">
        <h3>📁 사진 일괄 업로드</h3>
        <button class="btn-close-modal">✕</button>
      </div>
      <div class="photo-editor-body">
        <div class="bulk-upload-zone" id="bulkUploadZone">
          <div class="upload-icon">📷</div>
          <div class="upload-text">이미지 파일을 드래그하세요</div>
          <div class="upload-hint">파일명이 직원 이름과 같아야 합니다<br>(예: 홍길동.jpg)</div>
        </div>
        <input type="file" id="bulkFileInput" accept="image/*" multiple style="display:none">
        <div class="bulk-upload-results" id="bulkResults" style="display:none">
          <div class="result-summary"></div>
          <ul class="result-list"></ul>
        </div>
      </div>
      <div class="photo-editor-footer">
        <button class="btn-select-files">📂 파일 선택</button>
        <button class="btn-close-bulk">닫기</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  const zone = modal.querySelector('#bulkUploadZone');
  const fileInput = modal.querySelector('#bulkFileInput');
  const resultsDiv = modal.querySelector('#bulkResults');
  
  // 닫기
  modal.querySelector('.btn-close-modal').addEventListener('click', () => modal.remove());
  modal.querySelector('.btn-close-bulk').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
  
  // 파일 선택 버튼
  modal.querySelector('.btn-select-files').addEventListener('click', () => {
    fileInput.click();
  });
  
  // 드래그 앤 드롭
  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });
  
  zone.addEventListener('dragleave', () => {
    zone.classList.remove('drag-over');
  });
  
  zone.addEventListener('drop', async (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) {
      await processBulkUpload(files, resultsDiv);
    }
  });
  
  // 파일 선택
  fileInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      await processBulkUpload(files, resultsDiv);
    }
  });
}

/**
 * 일괄 업로드 처리 및 결과 표시
 * 매칭 실패한 파일은 수동 선택 가능
 */
async function processBulkUpload(files, resultsDiv) {
  resultsDiv.style.display = 'block';
  resultsDiv.querySelector('.result-summary').textContent = '업로드 중...';
  resultsDiv.querySelector('.result-list').innerHTML = '';
  
  const boardData = getBoardData();
  const results = {
    success: 0,
    failed: 0,
    results: [],
    unmatchedFiles: []  // 매칭 안 된 파일 저장
  };
  
  for (const file of files) {
    const emp = matchEmployeeByFilename(file.name);
    
    if (emp) {
      const success = await assignPhotoToEmployee(emp.id, file);
      if (success) {
        results.success++;
        results.results.push({ name: emp.name, status: 'success' });
      } else {
        results.failed++;
        results.results.push({ name: file.name, status: 'error' });
      }
    } else {
      // 매칭 안 된 파일은 수동 선택용으로 저장
      results.unmatchedFiles.push(file);
      results.results.push({ name: file.name, status: 'not_found', file });
    }
  }
  
  // 렌더링 갱신
  if (results.success > 0) {
    renderBoard();
  }
  
  // 결과 표시
  resultsDiv.querySelector('.result-summary').textContent = 
    `✅ 성공: ${results.success}개 / ⚠️ 수동 선택 필요: ${results.unmatchedFiles.length}개`;
  
  const list = resultsDiv.querySelector('.result-list');
  results.results.forEach(r => {
    const li = document.createElement('li');
    
    if (r.status === 'success') {
      li.className = 'success';
      li.textContent = `✅ ${r.name}`;
    } else if (r.status === 'not_found') {
      li.className = 'pending';
      li.innerHTML = `
        <span>📷 ${r.name}</span>
        <select class="emp-select" data-filename="${r.name}">
          <option value="">-- 직원 선택 --</option>
          ${boardData.employees.map(e => `<option value="${e.id}">${e.name} (${e.dept})</option>`).join('')}
        </select>
        <button class="btn-assign-photo" data-filename="${r.name}">할당</button>
      `;
      
      // 파일 데이터 저장
      li.dataset.file = r.name;
      li._file = r.file;
    } else {
      li.className = 'failed';
      li.textContent = `❌ ${r.name} (오류)`;
    }
    
    list.appendChild(li);
  });
  
  // 수동 할당 버튼 이벤트
  list.querySelectorAll('.btn-assign-photo').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const filename = btn.dataset.filename;
      const li = btn.closest('li');
      const select = li.querySelector('.emp-select');
      const empId = select.value;
      
      if (!empId) {
        alert('직원을 선택해주세요');
        return;
      }
      
      const file = li._file;
      if (file) {
        const success = await assignPhotoToEmployee(empId, file);
        if (success) {
          li.className = 'success';
          const emp = boardData.employees.find(e => e.id === empId);
          li.innerHTML = `✅ ${emp?.name || filename}`;
          renderBoard();
        }
      }
    });
  });
}

// ===== 모듈 로드 확인 =====
console.log('[photo-manager.js] 로드 완료');
