import { calculateSaju } from './manseryeok.js';
import { interpretSaju } from './interpretation.js';
import translations from './translations.js';

// ===== 전역 상태 =====
let currentSajuData = null; // 현재 계산된 사주 데이터
let currentLang = 'ko'; // 기본 언어

// ===== 로컬 스토리지 키 =====
const HISTORY_KEY = 'saju_history';
const COMMENTS_KEY = 'saju_comments';

// ===== 초기화 =====
document.addEventListener('DOMContentLoaded', () => {
    initLanguage();
});

function initLanguage() {
    // navigator.language에서 언어 코드 추출 (예: 'ko-KR' -> 'ko')
    const userLang = (navigator.language || 'ko').split('-')[0];
    currentLang = translations[userLang] ? userLang : 'ko';

    // UI 번역 적용
    applyTranslations();
}

function applyTranslations() {
    const t = translations[currentLang];

    // data-i18n 속성을 가진 모든 요소 번역
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) {
            el.innerHTML = t[key];
        }
    });

    // placeholder 번역
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (t[key]) {
            el.placeholder = t[key];
        }
    });
}

function getT() {
    return translations[currentLang];
}

// ===== 탭 전환 =====
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabId = btn.dataset.tab;
        const t = getT();

        // 모든 탭 비활성화
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));

        // 선택한 탭 활성화
        btn.classList.add('active');
        document.getElementById(`tab-${tabId}`).classList.remove('hidden');

        // 이력 탭 선택 시 렌더링
        if (tabId === 'history') renderHistory();
        // 댓글 탭 선택 시 렌더링
        if (tabId === 'comments') renderComments();
    });
});

// ===== 사주 계산 =====
document.getElementById('calculate-btn').addEventListener('click', () => {
    try {
        const t = getT();
        const dateInput = document.getElementById('birth-date').value;
        let timeInput = document.getElementById('birth-time').value;
        const longitudeInput = document.getElementById('longitude').value;
        const gender = document.querySelector('input[name="gender"]:checked').value;

        if (!dateInput) {
            alert(t.alert_no_date);
            return;
        }

        // 시간 미입력 시 00:00으로 처리
        if (!timeInput) timeInput = '00:00';

        const [year, month, day] = dateInput.split('-').map(Number);
        const [hour, minute] = timeInput.split(':').map(Number);
        const longitude = parseFloat(longitudeInput);

        if (isNaN(longitude)) {
            alert(t.alert_invalid_longitude);
            return;
        }

        const saju = calculateSaju(year, month, day, hour, minute, {
            longitude: longitude,
            applyTimeCorrection: true
        });

        // 사주 기둥 표시
        document.getElementById('year-pillar').textContent = `${saju.yearPillar} (${saju.yearPillarHanja})`;
        document.getElementById('month-pillar').textContent = `${saju.monthPillar} (${saju.monthPillarHanja})`;
        document.getElementById('day-pillar').textContent = `${saju.dayPillar} (${saju.dayPillarHanja})`;
        document.getElementById('hour-pillar').textContent = `${saju.hourPillar} (${saju.hourPillarHanja})`;

        let details = `${t.solar_bday} ${year}-${month}-${day} ${hour}:${minute}<br>`;
        details += `${t.gender_label} ${gender === 'm' ? t.gender_m : t.gender_f}<br>`;
        details += `${t.longitude_label} ${longitude}°`;
        if (saju.isTimeCorrected && saju.correctedTime) {
            details += `<br>${t.time_correction} ${saju.correctedTime.hour}:${saju.correctedTime.minute})`;
        }

        document.getElementById('details').innerHTML = details;

        const interpretation = interpretSaju(saju, currentLang);
        document.getElementById('interpretation').innerHTML = interpretation;

        // 결과 표시 (AI 결과 초기화)
        document.getElementById('result').classList.remove('hidden');
        document.getElementById('ai-result').classList.add('hidden');
        document.getElementById('ai-content').innerHTML = '';
        document.getElementById('ai-error').classList.add('hidden');

        // 전역 상태 저장
        currentSajuData = {
            year, month, day, hour, minute, gender, longitude,
            yearPillar: `${saju.yearPillar} (${saju.yearPillarHanja})`,
            monthPillar: `${saju.monthPillar} (${saju.monthPillarHanja})`,
            dayPillar: `${saju.dayPillar} (${saju.dayPillarHanja})`,
            hourPillar: `${saju.hourPillar} (${saju.hourPillarHanja})`,
            saju
        };

        // 결과창으로 스크롤
        document.getElementById('result').scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (e) {
        console.error(e);
        const t = getT();
        alert(t.alert_error + e.message);
    }
});

// ===== 복사 버튼 =====
document.getElementById('copy-btn').addEventListener('click', () => {
    const t = getT();
    const yearPillar = document.getElementById('year-pillar').textContent;
    const monthPillar = document.getElementById('month-pillar').textContent;
    const dayPillar = document.getElementById('day-pillar').textContent;
    const hourPillar = document.getElementById('hour-pillar').textContent;

    const detailsHtml = document.getElementById('details').innerHTML;
    const detailsText = detailsHtml.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');

    const textToCopy = `${t.copy_prefix}
--------------------------------------------------
${t.pillar_hour}   |   ${t.pillar_day}   |   ${t.pillar_month}   |   ${t.pillar_year}
${hourPillar} | ${dayPillar} | ${monthPillar} | ${yearPillar}
--------------------------------------------------

${detailsText}

--------------------------------------------------
${t.copy_prompt_title}
${t.copy_prompt_desc}

${t.copy_prompt_main}`;

    navigator.clipboard.writeText(textToCopy).then(() => {
        alert(t.alert_copy_success);
    }).catch(() => {
        const textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        textArea.style.position = "fixed";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            alert('Copied!');
        } catch (err) {
            alert('Failed to copy.');
        }
        document.body.removeChild(textArea);
    });
});

// ===== AI 상세 풀이 요청 =====
document.getElementById('ai-btn').addEventListener('click', async () => {
    const t = getT();
    if (!currentSajuData) {
        alert(t.alert_need_calc);
        return;
    }

    // Android 앱 내 결제 요청
    if (typeof Android !== 'undefined' && Android.startPayment) {
        Android.startPayment();
    } else {
        // 앱 환경이 아닐 경우 (브라우저 테스트용)
        if (confirm(t.alert_confirm_payment)) {
            onPaymentSuccess();
        }
    }
});

// 결제 성공 시 호출되는 함수 (Android native에서 호출)
window.onPaymentSuccess = async function () {
    const t = getT();
    const aiResultDiv = document.getElementById('ai-result');
    const aiLoadingDiv = document.getElementById('ai-loading');
    const aiContentDiv = document.getElementById('ai-content');
    const aiErrorDiv = document.getElementById('ai-error');
    const aiBtn = document.getElementById('ai-btn');

    // UI 초기화 및 로딩 표시
    aiResultDiv.classList.remove('hidden');
    aiLoadingDiv.classList.remove('hidden');
    aiContentDiv.innerHTML = '';
    aiErrorDiv.classList.add('hidden');
    aiBtn.disabled = true;

    // 스크롤
    aiResultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const { year, month, day, hour, minute, gender, longitude } = currentSajuData;
    const { yearPillar, monthPillar, dayPillar, hourPillar } = currentSajuData;

    // 사주 명식 정보 구성
    const birthDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    const language = currentLang === 'ko' ? 'ko' : 'en'; // 서버는 현재 한국어/영어만 주로 대응

    try {
        // Firebase Functions 호출
        const response = await fetch(
            'https://us-central1-birthcode-60426.cloudfunctions.net/analyzeSaju',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    birthDate: birthDate,
                    aiModel: 'Claude',
                    language: language
                })
            }
        );

        if (!response.ok) {
            throw new Error(`Server Error: ${response.status}`);
        }

        const data = await response.json();

        // 결과 렌더링
        aiLoadingDiv.classList.add('hidden');

        const sections = [
            { key: 'overall', title: t.ai_section_overall, content: data.overall },
            { key: 'parent', title: t.ai_section_parent, content: data.parent },
            { key: 'marriage', title: t.ai_section_marriage, content: data.marriage },
            { key: 'child', title: t.ai_section_child, content: data.child },
            { key: 'money', title: t.ai_section_money, content: data.money },
            { key: 'laterLife', title: t.ai_section_later, content: data.laterLife }
        ];

        let html = '';
        sections.forEach(sec => {
            if (sec.content) {
                html += `
                <div class="fortune-section">
                    <h4>${sec.title}</h4>
                    <p>${sec.content.replace(/\n/g, '<br>')}</p>
                </div>`;
            }
        });

        aiContentDiv.innerHTML = html;

        // 이력에 AI 결과 저장
        saveHistory({
            birthDate: `${year}-${month}-${day} ${hour}:${minute}`,
            gender: gender === 'm' ? t.gender_m : t.gender_f,
            yearPillar, monthPillar, dayPillar, hourPillar,
            aiResult: data,
            timestamp: Date.now()
        });

    } catch (err) {
        console.error('AI Request Failed:', err);
        aiLoadingDiv.classList.add('hidden');
        aiErrorDiv.classList.remove('hidden');
        aiErrorDiv.textContent = `Error: ${err.message}`;
    } finally {
        aiBtn.disabled = false;
    }
};

// ===== 이력 관리 =====
function getHistory() {
    try {
        return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    } catch {
        return [];
    }
}

function saveHistory(entry) {
    const history = getHistory();
    history.unshift(entry); // 최신 항목을 앞에 추가
    // 최대 50개만 보관
    if (history.length > 50) history.splice(50);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

window.clearHistory = function () {
    const t = getT();
    if (confirm(t.alert_confirm_clear_history)) {
        localStorage.removeItem(HISTORY_KEY);
        renderHistory();
    }
};

window.deleteHistoryItem = function (index) {
    const history = getHistory();
    history.splice(index, 1);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    renderHistory();
};

window.openHistoryModal = function (index) {
    const t = getT();
    const history = getHistory();
    const item = history[index];
    if (!item) return;

    const modal = document.getElementById('history-modal');
    const modalBody = document.getElementById('modal-body');

    let html = `
        <h3 style="color: var(--primary); margin-bottom: 12px;">📅 ${item.birthDate} (${item.gender || ''})</h3>
        <p style="font-size:12px; color: var(--text-secondary); margin-bottom: 14px;">${formatDate(item.timestamp)}</p>
        <div class="modal-pillar-row">
            <div class="modal-pillar">
                <span class="modal-pillar-label">${t.pillar_hour}</span>
                <span class="modal-pillar-value">${item.hourPillar?.split(' ')[0] || '--'}</span>
            </div>
            <div class="modal-pillar">
                <span class="modal-pillar-label">${t.pillar_day}</span>
                <span class="modal-pillar-value">${item.dayPillar?.split(' ')[0] || '--'}</span>
            </div>
            <div class="modal-pillar">
                <span class="modal-pillar-label">${t.pillar_month}</span>
                <span class="modal-pillar-value">${item.monthPillar?.split(' ')[0] || '--'}</span>
            </div>
            <div class="modal-pillar">
                <span class="modal-pillar-label">${t.pillar_year}</span>
                <span class="modal-pillar-value">${item.yearPillar?.split(' ')[0] || '--'}</span>
            </div>
        </div>
        <button class="btn-success-small" onclick="copyHistory(${index})" style="margin-bottom: 16px; width: 100%;">${t.btn_copy_short}</button>`;

    if (item.aiResult) {
        html += `<h4 style="color: var(--ai-color); margin: 14px 0 10px;">🤖 ${t.ai_badge}</h4>`;
        const sections = [
            { title: t.ai_section_overall, content: item.aiResult.overall },
            { title: t.ai_section_parent, content: item.aiResult.parent },
            { title: t.ai_section_marriage, content: item.aiResult.marriage },
            { title: t.ai_section_child, content: item.aiResult.child },
            { title: t.ai_section_money, content: item.aiResult.money },
            { title: t.ai_section_later, content: item.aiResult.laterLife }
        ];
        sections.forEach(sec => {
            if (sec.content) {
                html += `
                <div class="modal-fortune-section">
                    <h4>${sec.title}</h4>
                    <p>${sec.content.replace(/\n/g, '<br>')}</p>
                </div>`;
            }
        });
    } else {
        html += `<p style="color: var(--text-secondary); font-size: 14px; margin-top: 14px; text-align: center;">${t.ai_result_none}</p>`;
    }

    modalBody.innerHTML = html;
    modal.classList.remove('hidden');
};

window.closeHistoryModal = function () {
    document.getElementById('history-modal').classList.add('hidden');
};

window.copyHistory = function (index) {
    const t = getT();
    const history = getHistory();
    const item = history[index];
    if (!item) return;

    let textToCopy = `${t.copy_prefix}
--------------------------------------------------
ID: ${formatDate(item.timestamp)}
BD: ${item.birthDate} (${item.gender || ''})
--------------------------------------------------
${t.pillar_hour}   |   ${t.pillar_day}   |   ${t.pillar_month}   |   ${t.pillar_year}
${item.hourPillar?.split(' ')[0] || '--'} | ${item.dayPillar?.split(' ')[0] || '--'} | ${item.monthPillar?.split(' ')[0] || '--'} | ${item.yearPillar?.split(' ')[0] || '--'}
--------------------------------------------------
`;

    if (item.aiResult) {
        textToCopy += `\n[${t.ai_badge}]\n`;
        const sections = [
            { title: t.ai_section_overall, content: item.aiResult.overall },
            { title: t.ai_section_parent, content: item.aiResult.parent },
            { title: t.ai_section_marriage, content: item.aiResult.marriage },
            { title: t.ai_section_child, content: item.aiResult.child },
            { title: t.ai_section_money, content: item.aiResult.money },
            { title: t.ai_section_later, content: item.aiResult.laterLife }
        ];
        sections.forEach(sec => {
            if (sec.content) {
                textToCopy += `\n${sec.title}\n${sec.content}\n`;
            }
        });
    }

    navigator.clipboard.writeText(textToCopy).then(() => {
        alert(t.alert_copy_success);
    }).catch(err => {
        console.error('Copy Failed:', err);
    });
};

function renderHistory() {
    const list = document.getElementById('history-list');
    const history = getHistory();
    const t = getT();

    if (history.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <p>🔮</p>
                <p>${t.history_empty}</p>
            </div>`;
        return;
    }

    let html = '';
    history.forEach((item, index) => {
        html += `
        <div class="history-item" onclick="openHistoryModal(${index})">
            <div class="history-item-header">
                <div>
                    <div class="history-item-date">${item.birthDate} ${item.gender || ''}</div>
                    <div class="history-item-time">${formatDate(item.timestamp)}</div>
                </div>
                <button class="history-delete-btn" onclick="event.stopPropagation(); deleteHistoryItem(${index})">🗑</button>
            </div>
            <div class="history-item-pillars">
                ${t.pillar_hour} ${item.hourPillar?.split(' ')[0] || '--'} / 
                ${t.pillar_day} ${item.dayPillar?.split(' ')[0] || '--'} / 
                ${t.pillar_month} ${item.monthPillar?.split(' ')[0] || '--'} / 
                ${t.pillar_year} ${item.yearPillar?.split(' ')[0] || '--'}
            </div>
        </div>`;
    });

    list.innerHTML = html;
}

// ===== 댓글 관리 =====
function getComments() {
    try {
        return JSON.parse(localStorage.getItem(COMMENTS_KEY) || '[]');
    } catch {
        return [];
    }
}

// 글자 수 카운터
const commentTextarea = document.getElementById('comment-text');
if (commentTextarea) {
    commentTextarea.addEventListener('input', () => {
        document.getElementById('char-count').textContent = commentTextarea.value.length;
    });
}

window.submitComment = function () {
    const t = getT();
    const nameInput = document.getElementById('comment-name');
    const textInput = document.getElementById('comment-text');
    const name = nameInput.value.trim() || 'Anonymous';
    const text = textInput.value.trim();

    if (!text) {
        alert('Check input');
        return;
    }

    const comments = getComments();
    comments.unshift({
        id: Date.now(),
        name,
        text,
        timestamp: Date.now()
    });

    localStorage.setItem(COMMENTS_KEY, JSON.stringify(comments));

    // 입력 초기화
    nameInput.value = '';
    textInput.value = '';
    document.getElementById('char-count').textContent = '0';

    renderComments();
};

window.deleteComment = function (id) {
    const t = getT();
    if (!confirm(t.alert_confirm_delete_comment)) return;
    let comments = getComments();
    comments = comments.filter(c => c.id !== id);
    localStorage.setItem(COMMENTS_KEY, JSON.stringify(comments));
    renderComments();
};

function renderComments() {
    const list = document.getElementById('comments-list');
    const comments = getComments();
    const t = getT();

    if (comments.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <p>💬</p>
                <p>${t.comments_empty}</p>
            </div>`;
        return;
    }

    let html = '';
    comments.forEach(comment => {
        html += `
        <div class="comment-item">
            <div class="comment-item-header">
                <span class="comment-author">${escapeHtml(comment.name)}</span>
                <div style="display:flex; align-items:center; gap:8px;">
                    <span class="comment-time">${formatDate(comment.timestamp)}</span>
                    <button class="comment-delete-btn" onclick="deleteComment(${comment.id})">${t.btn_delete}</button>
                </div>
            </div>
            <div class="comment-text">${escapeHtml(comment.text).replace(/\n/g, '<br>')}</div>
        </div>`;
    });

    list.innerHTML = html;
}

// ===== 유틸리티 =====
function formatDate(timestamp) {
    const d = new Date(timestamp);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
