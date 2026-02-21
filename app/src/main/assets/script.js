import { calculateSaju } from './manseryeok.js';
import { interpretSaju } from './interpretation.js';

// ===== 전역 상태 =====
let currentSajuData = null; // 현재 계산된 사주 데이터

// ===== 로컬 스토리지 키 =====
const HISTORY_KEY = 'saju_history';
const COMMENTS_KEY = 'saju_comments';

// ===== 탭 전환 =====
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabId = btn.dataset.tab;
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
        const dateInput = document.getElementById('birth-date').value;
        let timeInput = document.getElementById('birth-time').value;
        const longitudeInput = document.getElementById('longitude').value;
        const gender = document.querySelector('input[name="gender"]:checked').value;

        if (!dateInput) {
            alert('생년월일을 입력해주세요.');
            return;
        }

        // 시간 미입력 시 00:00으로 처리
        if (!timeInput) timeInput = '00:00';

        const [year, month, day] = dateInput.split('-').map(Number);
        const [hour, minute] = timeInput.split(':').map(Number);
        const longitude = parseFloat(longitudeInput);

        if (isNaN(longitude)) {
            alert('경도를 올바르게 입력해주세요.');
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

        let details = `양력 생일: ${year}년 ${month}월 ${day}일 ${hour}시 ${minute}분<br>`;
        details += `성별: ${gender === 'm' ? '남성' : '여성'}<br>`;
        details += `출생지 경도: ${longitude}°`;
        if (saju.isTimeCorrected && saju.correctedTime) {
            details += `<br>(진태양시 보정: ${saju.correctedTime.hour}시 ${saju.correctedTime.minute}분)`;
        }

        document.getElementById('details').innerHTML = details;

        const interpretation = interpretSaju(saju);
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
        alert('오류가 발생했습니다: ' + e.message);
    }
});

// ===== 복사 버튼 =====
document.getElementById('copy-btn').addEventListener('click', () => {
    const yearPillar = document.getElementById('year-pillar').textContent;
    const monthPillar = document.getElementById('month-pillar').textContent;
    const dayPillar = document.getElementById('day-pillar').textContent;
    const hourPillar = document.getElementById('hour-pillar').textContent;

    const detailsHtml = document.getElementById('details').innerHTML;
    const detailsText = detailsHtml.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');

    const interpretationText = document.getElementById('interpretation').innerText;

    const textToCopy = `[사주 명식 정보]
--------------------------------------------------
시주   |   일주   |   월주   |   년주
${hourPillar} | ${dayPillar} | ${monthPillar} | ${yearPillar}
--------------------------------------------------

${detailsText}

--------------------------------------------------
[AI 사주 분석 요청 프롬프트]
※ 아래 내용을 복사하여 AI(ChatGPT, Claude 등)에게 붙여넣으면 상세한 사주 풀이를 받을 수 있습니다.

"위의 사주 명식 정보를 바탕으로 저의 사주를 상세하게 풀이해주세요.
명리학적 이론(음양오행의 조화, 십성, 격국, 용신 등)을 근거로 분석하되, 이해하기 쉽게 설명 부탁드립니다.

다음 8가지 항목으로 목차를 나누어 구체적으로 답변해주세요:

1. 🧠 성격 (타고난 기질, 장단점, 내면 심리)
2. 👶 출생 및 초년운 (성장 과정, 학업운)
3. 👪 부모운 (부모님과의 유대 관계, 덕)
4. 💘 연애운 (연애 스타일, 나에게 맞는 이성상)
5. 💍 배우자운 (결혼 시기, 배우자의 특징 및 능력)
6. 👨‍👩‍👧‍👦 자녀운 (자녀와의 관계, 자녀의 특징)
7. 💰 재물운 (직업 적성, 정재/편재운, 부자 가능성)
8. 👴 노년운 (건강, 은퇴 후의 삶)

마지막으로, 제 사주에서 부족한 기운을 보완할 수 있는 현대적인 개운법(행운의 색, 숫자, 취미 등)도 조언해주세요."`;

    navigator.clipboard.writeText(textToCopy).then(() => {
        alert('AI 분석용 프롬프트가 포함된 사주 정보가 복사되었습니다.\nChatGPT나 Claude 등에 붙여넣어 보세요!');
    }).catch(() => {
        const textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        textArea.style.position = "fixed";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            alert('결과가 복사되었습니다.');
        } catch (err) {
            alert('복사에 실패했습니다.');
        }
        document.body.removeChild(textArea);
    });
});

// ===== AI 상세 풀이 요청 =====
document.getElementById('ai-btn').addEventListener('click', async () => {
    if (!currentSajuData) {
        alert('먼저 사주를 계산해주세요.');
        return;
    }

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
    const language = navigator.language || 'ko';

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
            throw new Error(`서버 오류: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // 결과 렌더링
        aiLoadingDiv.classList.add('hidden');

        const sections = [
            { key: 'overall', title: '🌟 전체운', content: data.overall },
            { key: 'parent', title: '👪 부모운', content: data.parent },
            { key: 'marriage', title: '💍 배우자운', content: data.marriage },
            { key: 'child', title: '👶 자녀운', content: data.child },
            { key: 'money', title: '💰 재물운', content: data.money },
            { key: 'laterLife', title: '👴 노년운', content: data.laterLife }
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
            birthDate: `${year}년 ${month}월 ${day}일 ${hour}시`,
            gender: gender === 'm' ? '남성' : '여성',
            yearPillar, monthPillar, dayPillar, hourPillar,
            aiResult: data,
            timestamp: Date.now()
        });

    } catch (err) {
        console.error('AI 요청 실패:', err);
        aiLoadingDiv.classList.add('hidden');
        aiErrorDiv.classList.remove('hidden');
        aiErrorDiv.textContent = `AI 분석 중 오류가 발생했습니다.\n${err.message}`;
    } finally {
        aiBtn.disabled = false;
    }
});

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
    if (confirm('이력을 모두 삭제하시겠습니까?')) {
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
    const history = getHistory();
    const item = history[index];
    if (!item) return;

    const modal = document.getElementById('history-modal');
    const modalBody = document.getElementById('modal-body');

    let html = `
        <h3 style="color: var(--primary); margin-bottom: 12px;">📅 ${item.birthDate} (${item.gender || ''})</h3>
        <p style="font-size:12px; color: var(--text-secondary); margin-bottom: 14px;">조회: ${formatDate(item.timestamp)}</p>
        <div class="modal-pillar-row">
            <div class="modal-pillar">
                <span class="modal-pillar-label">시주</span>
                <span class="modal-pillar-value">${item.hourPillar?.split(' ')[0] || '--'}</span>
            </div>
            <div class="modal-pillar">
                <span class="modal-pillar-label">일주</span>
                <span class="modal-pillar-value">${item.dayPillar?.split(' ')[0] || '--'}</span>
            </div>
            <div class="modal-pillar">
                <span class="modal-pillar-label">월주</span>
                <span class="modal-pillar-value">${item.monthPillar?.split(' ')[0] || '--'}</span>
            </div>
            <div class="modal-pillar">
                <span class="modal-pillar-label">년주</span>
                <span class="modal-pillar-value">${item.yearPillar?.split(' ')[0] || '--'}</span>
            </div>
        </div>`;

    if (item.aiResult) {
        html += `<h4 style="color: var(--ai-color); margin: 14px 0 10px;">🤖 AI 분석 결과</h4>`;
        const sections = [
            { title: '🌟 전체운', content: item.aiResult.overall },
            { title: '👪 부모운', content: item.aiResult.parent },
            { title: '💍 배우자운', content: item.aiResult.marriage },
            { title: '👶 자녀운', content: item.aiResult.child },
            { title: '💰 재물운', content: item.aiResult.money },
            { title: '👴 노년운', content: item.aiResult.laterLife }
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
        html += `<p style="color: var(--text-secondary); font-size: 14px; margin-top: 14px; text-align: center;">AI 분석 결과가 없습니다.</p>`;
    }

    modalBody.innerHTML = html;
    modal.classList.remove('hidden');
};

window.closeHistoryModal = function () {
    document.getElementById('history-modal').classList.add('hidden');
};

function renderHistory() {
    const list = document.getElementById('history-list');
    const history = getHistory();

    if (history.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <p>🔮</p>
                <p>아직 조회한 사주가 없습니다.<br>'사주보기' 탭에서 사주를 조회해보세요!</p>
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
                시주 ${item.hourPillar?.split(' ')[0] || '--'} / 
                일주 ${item.dayPillar?.split(' ')[0] || '--'} / 
                월주 ${item.monthPillar?.split(' ')[0] || '--'} / 
                년주 ${item.yearPillar?.split(' ')[0] || '--'}
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
    const nameInput = document.getElementById('comment-name');
    const textInput = document.getElementById('comment-text');
    const name = nameInput.value.trim() || '익명';
    const text = textInput.value.trim();

    if (!text) {
        alert('댓글 내용을 입력해주세요.');
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
    if (!confirm('이 댓글을 삭제하시겠습니까?')) return;
    let comments = getComments();
    comments = comments.filter(c => c.id !== id);
    localStorage.setItem(COMMENTS_KEY, JSON.stringify(comments));
    renderComments();
};

function renderComments() {
    const list = document.getElementById('comments-list');
    const comments = getComments();

    if (comments.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <p>💬</p>
                <p>아직 댓글이 없습니다.<br>첫 번째 댓글을 남겨보세요!</p>
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
                    <button class="comment-delete-btn" onclick="deleteComment(${comment.id})">삭제</button>
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
