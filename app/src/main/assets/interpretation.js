import translations from './translations.js';

export function interpretSaju(saju, lang = 'ko') {
    const t = translations[lang] || translations['ko'];
    const STEMS = {
        '갑': { element: t.five_elements.WOOD, polarity: '+', name: '갑목' },
        '을': { element: t.five_elements.WOOD, polarity: '-', name: '을목' },
        '병': { element: t.five_elements.FIRE, polarity: '+', name: '병화' },
        '정': { element: t.five_elements.FIRE, polarity: '-', name: '정화' },
        '무': { element: t.five_elements.EARTH, polarity: '+', name: '무토' },
        '기': { element: t.five_elements.EARTH, polarity: '-', name: '기토' },
        '경': { element: t.five_elements.METAL, polarity: '+', name: '경금' },
        '신': { element: t.five_elements.METAL, polarity: '-', name: '신금' },
        '임': { element: t.five_elements.WATER, polarity: '+', name: '임수' },
        '계': { element: t.five_elements.WATER, polarity: '-', name: '계수' }
    };

    const BRANCHES = {
        '자': { element: t.five_elements.WATER, name: '자수', animal: '쥐' },
        '축': { element: t.five_elements.EARTH, name: '축토', animal: '소' },
        '인': { element: t.five_elements.WOOD, name: '인목', animal: '호랑이' },
        '묘': { element: t.five_elements.WOOD, name: '묘목', animal: '토끼' },
        '진': { element: t.five_elements.EARTH, name: '진토', animal: '용' },
        '사': { element: t.five_elements.FIRE, name: '사화', animal: '뱀' },
        '오': { element: t.five_elements.FIRE, name: '오화', animal: '말' },
        '미': { element: t.five_elements.EARTH, name: '미토', animal: '양' },
        '신': { element: t.five_elements.METAL, name: '신금', animal: '원숭이' },
        '유': { element: t.five_elements.METAL, name: '유금', animal: '닭' },
        '술': { element: t.five_elements.EARTH, name: '술토', animal: '개' },
        '해': { element: t.five_elements.WATER, name: '해수', animal: '돼지' }
    };

    const pillars = [saju.yearPillar, saju.monthPillar, saju.dayPillar, saju.hourPillar];
    const elementsCount = {
        [t.five_elements.WOOD]: 0,
        [t.five_elements.FIRE]: 0,
        [t.five_elements.EARTH]: 0,
        [t.five_elements.METAL]: 0,
        [t.five_elements.WATER]: 0
    };

    let dayStem = '';

    pillars.forEach((pillar, index) => {
        if (!pillar) return;
        const stemChar = pillar.charAt(0);
        const branchChar = pillar.charAt(1);

        if (STEMS[stemChar]) elementsCount[STEMS[stemChar].element]++;
        if (BRANCHES[branchChar]) elementsCount[BRANCHES[branchChar].element]++;

        // Day Pillar is index 2
        if (index === 2) dayStem = stemChar;
    });

    let interpretation = `<h3>${t.interpret_title}</h3>`;

    // 1. Day Master Interpretation
    if (dayStem && t.day_master_interpret[dayStem]) {
        interpretation += `<h4>${t.interpret_day_master}</h4>`;
        interpretation += `<p>${t.day_master_interpret[dayStem]}</p>`;
    }

    // 2. Five Elements Distribution
    interpretation += `<h4>${t.interpret_five_elements}</h4>`;
    interpretation += `<ul class="elements-list">`;
    for (const [element, count] of Object.entries(elementsCount)) {
        interpretation += `<li>${element}: ${count}</li>`;
    }
    interpretation += `</ul>`;

    // 3. Missing or Excessive Elements
    const missing = Object.entries(elementsCount).filter(([_, count]) => count === 0).map(([e, _]) => e);
    const excessive = Object.entries(elementsCount).filter(([_, count]) => count >= 3).map(([e, _]) => e);

    if (missing.length > 0) {
        interpretation += `<p>💡 <strong>${t.interpret_missing}</strong> ${missing.join(', ')}</p>`;
        interpretation += `<p class="advice">${t.interpret_missing_advice}</p>`;
    }

    if (excessive.length > 0) {
        interpretation += `<p>⚠️ <strong>${t.interpret_excessive}</strong> ${excessive.join(', ')}</p>`;
        interpretation += `<p class="advice">${t.interpret_excessive_advice}</p>`;
    }

    return interpretation;
}
