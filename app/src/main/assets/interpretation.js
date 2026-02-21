
export const FIVE_ELEMENTS = {
    WOOD: '목(Wood)',
    FIRE: '화(Fire)',
    EARTH: '토(Earth)',
    METAL: '금(Metal)',
    WATER: '수(Water)'
};

const STEMS = {
    '갑': { element: FIVE_ELEMENTS.WOOD, polarity: '+', name: '갑목' },
    '을': { element: FIVE_ELEMENTS.WOOD, polarity: '-', name: '을목' },
    '병': { element: FIVE_ELEMENTS.FIRE, polarity: '+', name: '병화' },
    '정': { element: FIVE_ELEMENTS.FIRE, polarity: '-', name: '정화' },
    '무': { element: FIVE_ELEMENTS.EARTH, polarity: '+', name: '무토' },
    '기': { element: FIVE_ELEMENTS.EARTH, polarity: '-', name: '기토' },
    '경': { element: FIVE_ELEMENTS.METAL, polarity: '+', name: '경금' },
    '신': { element: FIVE_ELEMENTS.METAL, polarity: '-', name: '신금' },
    '임': { element: FIVE_ELEMENTS.WATER, polarity: '+', name: '임수' },
    '계': { element: FIVE_ELEMENTS.WATER, polarity: '-', name: '계수' }
};

const BRANCHES = {
    '자': { element: FIVE_ELEMENTS.WATER, name: '자수', animal: '쥐' },
    '축': { element: FIVE_ELEMENTS.EARTH, name: '축토', animal: '소' },
    '인': { element: FIVE_ELEMENTS.WOOD, name: '인목', animal: '호랑이' },
    '묘': { element: FIVE_ELEMENTS.WOOD, name: '묘목', animal: '토끼' },
    '진': { element: FIVE_ELEMENTS.EARTH, name: '진토', animal: '용' },
    '사': { element: FIVE_ELEMENTS.FIRE, name: '사화', animal: '뱀' },
    '오': { element: FIVE_ELEMENTS.FIRE, name: '오화', animal: '말' },
    '미': { element: FIVE_ELEMENTS.EARTH, name: '미토', animal: '양' },
    '신': { element: FIVE_ELEMENTS.METAL, name: '신금', animal: '원숭이' },
    '유': { element: FIVE_ELEMENTS.METAL, name: '유금', animal: '닭' },
    '술': { element: FIVE_ELEMENTS.EARTH, name: '술토', animal: '개' },
    '해': { element: FIVE_ELEMENTS.WATER, name: '해수', animal: '돼지' }
};

const DAY_MASTER_INTERPRETATIONS = {
    '갑': "당신은 '갑목(큰 나무)'의 기운을 타고났습니다. 진취적이고 곧게 뻗어나가려는 성향이 강하며, 리더십과 책임감이 있습니다. 어진 마음(인)을 중요시하며, 굽히기보다는 부러지는 것을 택하는 강직함이 있습니다.",
    '을': "당신은 '을목(화초/넝쿨)'의 기운을 타고났습니다. 유연하고 적응력이 뛰어나며 끈기가 있습니다. 생명력이 강하고 주변 환경과 잘 어우러지며, 실속을 챙길 줄 아는 현명함이 있습니다.",
    '병': "당신은 '병화(태양)'의 기운을 타고났습니다. 밝고 열정적이며 공명정대합니다. 숨기는 것이 없고 매사에 적극적이며, 사람들에게 따뜻한 에너지를 주는 중심적인 존재가 되기를 원합니다.",
    '정': "당신은 '정화(촛불/달빛)'의 기운을 타고났습니다. 따뜻하고 섬세하며 희생정신이 있습니다. 겉으로는 조용해 보여도 내면에는 뜨거운 열정을 품고 있으며, 집중력이 뛰어나고 예술적 감각이 있을 수 있습니다.",
    '무': "당신은 '무토(큰 산/광야)'의 기운을 타고났습니다. 묵직하고 신용을 중시하며 포용력이 있습니다. 변화에 신중하고 보수적인 편이지만, 한번 믿음을 주면 끝까지 지키는 듬직한 면이 있습니다.",
    '기': "당신은 '기토(논밭/정원)'의 기운을 타고났습니다. 현실적이고 실속이 있으며 다재다능합니다. 어머니 대지처럼 만물을 길러내는 포용력이 있고, 중재자 역할을 잘하며 자기 관리에 철저합니다.",
    '경': "당신은 '경금(바위/원석)'의 기운을 타고났습니다. 의리가 있고 결단력이 강하며 공사 구분이 확실합니다. 강인한 정신력으로 한번 마음먹은 일은 끝까지 밀고 나가는 추진력이 있습니다.",
    '신': "당신은 '신금(보석/칼날)'의 기운을 타고났습니다. 예리하고 섬세하며 깔끔한 성향입니다. 자존심이 강하고 냉철한 판단력을 가지고 있으며, 자신을 빛내려는 욕구가 강해 미적 감각이 뛰어납니다.",
    '임': "당신은 '임수(큰 바다/강물)'의 기운을 타고났습니다. 지혜롭고 유연하며 스케일이 큽니다. 흐르는 물처럼 환경에 잘 적응하고 친화력이 좋으나, 속을 알 수 없는 깊은 면모도 가지고 있습니다.",
    '계': "당신은 '계수(단비/시냇물)'의 기운을 타고났습니다. 지혜롭고 아이디어가 많으며 감수성이 풍부합니다. 조용히 스며들어 만물을 적시는 비처럼, 부드러운 카리스마와 뛰어난 적응력을 가지고 있습니다."
};

export function interpretSaju(saju) {
    const pillars = [saju.yearPillar, saju.monthPillar, saju.dayPillar, saju.hourPillar];
    const elementsCount = {
        [FIVE_ELEMENTS.WOOD]: 0,
        [FIVE_ELEMENTS.FIRE]: 0,
        [FIVE_ELEMENTS.EARTH]: 0,
        [FIVE_ELEMENTS.METAL]: 0,
        [FIVE_ELEMENTS.WATER]: 0
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

    let interpretation = `<h3>🌟 팔자 풀이</h3>`;

    // 1. Day Master Interpretation
    if (dayStem && DAY_MASTER_INTERPRETATIONS[dayStem]) {
        interpretation += `<h4>일간(나)의 성향</h4>`;
        interpretation += `<p>${DAY_MASTER_INTERPRETATIONS[dayStem]}</p>`;
    }

    // 2. Five Elements Distribution
    interpretation += `<h4>오행(Five Elements) 분포</h4>`;
    interpretation += `<ul class="elements-list">`;
    for (const [element, count] of Object.entries(elementsCount)) {
        interpretation += `<li>${element}: ${count}개</li>`;
    }
    interpretation += `</ul>`;

    // 3. Missing or Excessive Elements
    const missing = Object.entries(elementsCount).filter(([_, count]) => count === 0).map(([e, _]) => e);
    const excessive = Object.entries(elementsCount).filter(([_, count]) => count >= 3).map(([e, _]) => e);

    if (missing.length > 0) {
        interpretation += `<p>💡 <strong>부족한 기운:</strong> ${missing.join(', ')}</p>`;
        interpretation += `<p class="advice">부족한 기운을 보충하는 색상이나 소품을 활용하거나, 해당 기운이 가진 덕목(예: 목-인자함, 화-예의, 토-신용, 금-의리, 수-지혜)을 의식적으로 기르면 좋습니다.</p>`;
    }

    if (excessive.length > 0) {
        interpretation += `<p>⚠️ <strong>과한 기운:</strong> ${excessive.join(', ')}</p>`;
        interpretation += `<p class="advice">특정 기운이 너무 강하면 편중된 성향이 나타날 수 있으니, 조화를 이루도록 노력하는 것이 좋습니다.</p>`;
    }

    return interpretation;
}
