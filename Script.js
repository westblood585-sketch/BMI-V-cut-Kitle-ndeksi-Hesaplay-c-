/* =========================================================
   VITALS STUDIO — script.js
   BMI hesaplama, birim dönüştürme, gauge + skala + ipuçları
   ========================================================= */

const state = {
  heightCm: 170,
  weightKg: 68,
  age: 28,
  isMale: false,
  isHeightInches: false,
  isWeightLb: false,
  displayedBmi: 0,
};

/* ---------------------------------------------------------
   DOM referansları
   --------------------------------------------------------- */
const heightRange = document.getElementById('heightRange');
const heightValue = document.getElementById('heightValue');
const heightUnitLabel = document.getElementById('heightUnitLabel');
const heightUnitToggle = document.getElementById('heightUnitToggle');

const weightInput = document.getElementById('weightInput');
const weightUnitLabel = document.getElementById('weightUnitLabel');
const weightUnitToggle = document.getElementById('weightUnitToggle');
const weightMinus = document.getElementById('weightMinus');
const weightPlus = document.getElementById('weightPlus');

const genderFemale = document.getElementById('genderFemale');
const genderMale = document.getElementById('genderMale');
const avatarHead = document.querySelector('.avatar__head');
const avatarBodyFemale = document.getElementById('avatarBodyFemale');
const avatarBodyMale = document.getElementById('avatarBodyMale');

const inputError = document.getElementById('inputError');
const calculateBtn = document.getElementById('calculateBtn');
const resetBtn = document.getElementById('resetBtn');
const idealWeightEl = document.getElementById('idealWeight');

const ageInput = document.getElementById('ageInput');
const ageMinus = document.getElementById('ageMinus');
const agePlus = document.getElementById('agePlus');

const bodyFatValueEl = document.getElementById('bodyFatValue');
const bodyFatFillEl = document.getElementById('bodyFatFill');
const bodyFatCategoryEl = document.getElementById('bodyFatCategory');
const bodyFatSectionEl = document.querySelector('.bodyfat-section');

function pulseBodyFatSection() {
  bodyFatSectionEl.classList.remove('is-pulsing');
  void bodyFatSectionEl.offsetWidth; // reflow tetikle, animasyonu tekrar oynat
  bodyFatSectionEl.classList.add('is-pulsing');
}

const bmiValueEl = document.getElementById('bmiValue');
const bmiCategoryEl = document.getElementById('bmiCategory');
const needle = document.getElementById('needle');

const scaleMarker = document.getElementById('scaleMarker');
const scaleMarkerValue = document.getElementById('scaleMarkerValue');
const scaleValueLabel = document.getElementById('scaleValueLabel');

const tipCards = document.querySelectorAll('.tip-card');

const GAUGE = { cx: 120, cy: 120, r: 95, min: 15, max: 40 };
const ZONES = [
  { id: 'zoneUnder', zone: 'under', from: 15, to: 18.5 },
  { id: 'zoneNormal', zone: 'normal', from: 18.5, to: 25 },
  { id: 'zoneOver', zone: 'over', from: 25, to: 30 },
  { id: 'zoneObese', zone: 'obese', from: 30, to: 40 },
];
const ZONE_COLORS = {
  under: '#60a5fa',
  normal: '#34d399',
  over: '#fbbf24',
  obese: '#f87171',
};

/* ---------------------------------------------------------
   Birim dönüşümleri
   --------------------------------------------------------- */
const cmToInches = (cm) => cm / 2.54;
const kgToLb = (kg) => kg * 2.20462;
const lbToKg = (lb) => lb / 2.20462;

/* ---------------------------------------------------------
   Gauge geometrisi
   --------------------------------------------------------- */
function valueToAngle(value) {
  const clamped = Math.min(Math.max(value, GAUGE.min), GAUGE.max);
  const t = (clamped - GAUGE.min) / (GAUGE.max - GAUGE.min);
  return 180 - t * 180;
}
function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
}
function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArcFlag = Math.abs(startAngle - endAngle) <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}
function drawZones() {
  ZONES.forEach((zone) => {
    const startAngle = valueToAngle(zone.from);
    const endAngle = valueToAngle(zone.to);
    document.getElementById(zone.id).setAttribute(
      'd',
      describeArc(GAUGE.cx, GAUGE.cy, GAUGE.r, startAngle, endAngle)
    );
  });
}
function setNeedle(value) {
  const angle = valueToAngle(value);
  const tip = polarToCartesian(GAUGE.cx, GAUGE.cy, GAUGE.r - 28, angle);
  needle.setAttribute('x2', tip.x);
  needle.setAttribute('y2', tip.y);
}

/* ---------------------------------------------------------
   Vücut yağ oranı — Deurenberg formülü (cinsiyete duyarlı)
   Yağ% = 1.20×BMI + 0.23×Yaş − 10.8×cinsiyet(erkek=1) − 5.4
   --------------------------------------------------------- */
function estimateBodyFat(bmi, age, isMale) {
  const sexValue = isMale ? 1 : 0;
  const raw = 1.2 * bmi + 0.23 * age - 10.8 * sexValue - 5.4;
  return Math.min(Math.max(raw, 3), 60);
}

function getBodyFatCategory(fatPercent, isMale) {
  const bounds = isMale
    ? { low: 8, healthy: 24, high: 31 }
    : { low: 21, healthy: 32, high: 39 };

  if (fatPercent < bounds.low) return { zone: 'under', label: 'Düşük' };
  if (fatPercent < bounds.healthy) return { zone: 'normal', label: 'Sağlıklı Aralık' };
  if (fatPercent < bounds.high) return { zone: 'over', label: 'Yüksek' };
  return { zone: 'obese', label: 'Çok Yüksek' };
}

function updateBodyFat(bmi) {
  const age = state.age;
  const fatPercent = estimateBodyFat(bmi, age, state.isMale);
  const { zone, label } = getBodyFatCategory(fatPercent, state.isMale);

  bodyFatValueEl.textContent = `${fatPercent.toFixed(1)}%`;
  bodyFatFillEl.style.width = `${Math.min((fatPercent / 50) * 100, 100)}%`;
  bodyFatFillEl.style.background = ZONE_COLORS[zone];
  bodyFatCategoryEl.textContent = `${label} (${state.isMale ? 'erkek' : 'kadın'} referans aralığı)`;
}

/* ---------------------------------------------------------
   Kategori
   --------------------------------------------------------- */
function getCategory(bmi) {
  if (bmi < 18.5) return { zone: 'under', label: 'Zayıf' };
  if (bmi < 25) return { zone: 'normal', label: 'Normal Kilo' };
  if (bmi < 30) return { zone: 'over', label: 'Fazla Kilolu' };
  return { zone: 'obese', label: 'Obez' };
}

/* ---------------------------------------------------------
   Sayaç (count-up) animasyonu
   --------------------------------------------------------- */
function animateBmiNumber(from, to) {
  const duration = 500;
  const startTime = performance.now();

  function frame(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = from + (to - from) * eased;
    bmiValueEl.textContent = current.toFixed(1);
    if (progress < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/* ---------------------------------------------------------
   Skala işaretçisi
   --------------------------------------------------------- */
function updateScaleMarker(bmi) {
  const clamped = Math.min(Math.max(bmi, GAUGE.min), GAUGE.max);
  const percent = ((clamped - GAUGE.min) / (GAUGE.max - GAUGE.min)) * 100;
  scaleMarker.style.left = `${percent}%`;
  scaleMarkerValue.textContent = bmi.toFixed(1);
  scaleValueLabel.textContent = `BMI ${bmi.toFixed(1)}`;
}

/* ---------------------------------------------------------
   İpucu kartlarını güncelle
   --------------------------------------------------------- */
function updateTipCards(activeZone) {
  tipCards.forEach((card) => {
    card.classList.toggle('is-active', card.dataset.zone === activeZone);
  });
}

/* ---------------------------------------------------------
   İdeal kilo aralığı
   --------------------------------------------------------- */
function updateIdealWeight(heightCm) {
  const heightM = heightCm / 100;
  const minKg = 18.5 * heightM * heightM;
  const maxKg = 24.9 * heightM * heightM;

  const format = (kg) => state.isWeightLb ? `${kgToLb(kg).toFixed(1)} lb` : `${kg.toFixed(1)} kg`;
  idealWeightEl.innerHTML = `İdeal kilo aralığın: <strong>${format(minKg)} – ${format(maxKg)}</strong>`;
}

/* ---------------------------------------------------------
   Ana hesaplama ve render
   --------------------------------------------------------- */
function calculateAndRender() {
  const isInvalid = !state.weightKg || state.weightKg <= 0 || !state.heightCm || state.heightCm <= 0;

  if (isInvalid) {
    inputError.classList.remove('is-hidden');
    bmiValueEl.textContent = '0.0';
    bmiCategoryEl.textContent = 'Değerlerini gir';
    bmiCategoryEl.removeAttribute('data-zone');
    return;
  }
  inputError.classList.add('is-hidden');

  const heightM = state.heightCm / 100;
  const bmi = state.weightKg / (heightM * heightM);
  const { zone, label } = getCategory(bmi);

  animateBmiNumber(state.displayedBmi, bmi);
  state.displayedBmi = bmi;

  bmiCategoryEl.textContent = label;
  bmiCategoryEl.setAttribute('data-zone', zone);

  setNeedle(bmi);
  updateScaleMarker(bmi);
  updateTipCards(zone);
  updateIdealWeight(state.heightCm);
  updateBodyFat(bmi);

  avatarHead.style.stroke = ZONE_COLORS[zone];
  avatarBodyFemale.style.stroke = ZONE_COLORS[zone];
  avatarBodyMale.style.stroke = ZONE_COLORS[zone];
}

/* ---------------------------------------------------------
   Boy slider + birim toggle
   --------------------------------------------------------- */
function renderHeightDisplay() {
  if (state.isHeightInches) {
    heightValue.textContent = cmToInches(state.heightCm).toFixed(1);
    heightUnitLabel.textContent = ' inç';
  } else {
    heightValue.textContent = state.heightCm;
    heightUnitLabel.textContent = ' cm';
  }
}

heightRange.addEventListener('input', () => {
  state.heightCm = Number(heightRange.value);
  renderHeightDisplay();
  calculateAndRender();
});

heightUnitToggle.addEventListener('click', () => {
  state.isHeightInches = !state.isHeightInches;
  renderHeightDisplay();
});

/* ---------------------------------------------------------
   Kilo input + birim toggle + stepper
   --------------------------------------------------------- */
function renderWeightDisplay() {
  const displayValue = state.isWeightLb ? kgToLb(state.weightKg) : state.weightKg;
  weightInput.value = Math.round(displayValue * 10) / 10;
  weightUnitLabel.textContent = state.isWeightLb ? 'lb' : 'kg';
}

weightInput.addEventListener('input', () => {
  const rawValue = Number(weightInput.value);
  state.weightKg = state.isWeightLb ? lbToKg(rawValue) : rawValue;
  calculateAndRender();
});

weightUnitToggle.addEventListener('click', () => {
  state.isWeightLb = !state.isWeightLb;
  renderWeightDisplay();
});

weightMinus.addEventListener('click', () => {
  const step = state.isWeightLb ? 1 : 1;
  const current = Number(weightInput.value);
  weightInput.value = Math.max(1, current - step);
  weightInput.dispatchEvent(new Event('input'));
});
weightPlus.addEventListener('click', () => {
  const step = state.isWeightLb ? 1 : 1;
  const current = Number(weightInput.value);
  weightInput.value = current + step;
  weightInput.dispatchEvent(new Event('input'));
});

/* ---------------------------------------------------------
   Cinsiyet toggle (sadece avatar görseli için)
   --------------------------------------------------------- */
genderFemale.addEventListener('click', () => {
  genderFemale.classList.add('is-active');
  genderFemale.setAttribute('aria-pressed', 'true');
  genderMale.classList.remove('is-active');
  genderMale.setAttribute('aria-pressed', 'false');

  avatarBodyFemale.classList.remove('is-hidden');
  avatarBodyMale.classList.add('is-hidden');

  state.isMale = false;
  calculateAndRender();
  pulseBodyFatSection();
});
genderMale.addEventListener('click', () => {
  genderMale.classList.add('is-active');
  genderMale.setAttribute('aria-pressed', 'true');
  genderFemale.classList.remove('is-active');
  genderFemale.setAttribute('aria-pressed', 'false');

  avatarBodyMale.classList.remove('is-hidden');
  avatarBodyFemale.classList.add('is-hidden');

  state.isMale = true;
  calculateAndRender();
  pulseBodyFatSection();
});

/* ---------------------------------------------------------
   Yaş stepper
   --------------------------------------------------------- */
ageInput.addEventListener('input', () => {
  state.age = Number(ageInput.value) || 0;
  calculateAndRender();
});
ageMinus.addEventListener('click', () => {
  ageInput.value = Math.max(10, Number(ageInput.value) - 1);
  ageInput.dispatchEvent(new Event('input'));
});
agePlus.addEventListener('click', () => {
  ageInput.value = Math.min(100, Number(ageInput.value) + 1);
  ageInput.dispatchEvent(new Event('input'));
});

/* ---------------------------------------------------------
   Hesapla butonu — ripple efekti + pulse
   --------------------------------------------------------- */
calculateBtn.addEventListener('click', (event) => {
  const rect = calculateBtn.getBoundingClientRect();
  const ripple = document.createElement('span');
  const size = Math.max(rect.width, rect.height);
  ripple.className = 'ripple';
  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
  ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
  calculateBtn.appendChild(ripple);
  setTimeout(() => ripple.remove(), 650);

  calculateAndRender();
});

/* ---------------------------------------------------------
   Sıfırla
   --------------------------------------------------------- */
resetBtn.addEventListener('click', () => {
  state.heightCm = 170;
  state.weightKg = 68;
  state.age = 28;
  state.isMale = false;
  state.isHeightInches = false;
  state.isWeightLb = false;
  state.displayedBmi = 0;

  heightRange.value = 170;
  ageInput.value = 28;
  genderFemale.click();
  renderHeightDisplay();
  renderWeightDisplay();
  calculateAndRender();
});

/* ---------------------------------------------------------
   İlk yükleme
   --------------------------------------------------------- */
drawZones();
renderHeightDisplay();
renderWeightDisplay();
calculateAndRender();