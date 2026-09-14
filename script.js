const map = L.map('map').setView([48.3794, 31.1656], 6);
// ============ АДРЕС БЭКЕНДА ============
// Пока локально, потом заменим на адрес Render после деплоя
const API_BASE = 'https://air-alert-map-api.onrender.com';
// ============ СОСТОЯНИЕ НАСТРОЕК ============
const settings = {
    mapTheme: localStorage.getItem('mapTheme') || 'dark',
    showRoutes: localStorage.getItem('showRoutes') !== 'false',
    showPrediction: localStorage.getItem('showPrediction') !== 'false',
    showTail: localStorage.getItem('showTail') !== 'false',
    soundEnabled: localStorage.getItem('soundEnabled') === 'true',
    showHistory: localStorage.getItem('showHistory') === 'true'
};

const filters = { shahed: true, rocket: true, aircraft: true, recon: true, other: true };
// ============================================

// ============ ПЕРЕКЛЮЧАТЕЛЬ КАРТ ============
const CARTO_KEY = 'cb1_3kcy_1_086e1744e5a52fae9ed58e8b';

const MAPS = {
    dark:      { name: 'Тёмная',     icon: '🌙', layer: L.tileLayer(`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`, { attribution: '© OpenStreetMap © CARTO', subdomains: 'abcd', maxZoom: 19 }) },
    light:     { name: 'Светлая',    icon: '☀️', layer: L.tileLayer(`https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`, { attribution: '© OpenStreetMap © CARTO', subdomains: 'abcd', maxZoom: 19 }) },
    satellite: { name: 'Спутник',    icon: '🛰', layer: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: 'Tiles © Esri', maxZoom: 19 }) },
    osm:       { name: 'Стандартная', icon: '🗺', layer: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors', maxZoom: 19 }) },
    terrain:   { name: 'Рельеф',     icon: '⛰', layer: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { attribution: '© OpenTopoMap (CC-BY-SA)', maxZoom: 17 }) }
};

if (!MAPS[settings.mapTheme]) settings.mapTheme = 'dark';
MAPS[settings.mapTheme].layer.addTo(map);
// ============================================

// ============ ПАНЕЛЬ НАСТРОЕК ============
const SettingsControl = L.Control.extend({
    options: { position: 'bottomright' },
    onAdd: function() {
        const container = L.DomUtil.create('div', 'settings-panel');
        const btn = L.DomUtil.create('button', 'settings-btn', container);
        btn.innerHTML = '⚙';
        btn.title = 'Настройки';

        const menu = L.DomUtil.create('div', 'settings-menu', container);
        menu.style.display = 'none';

        const titleMap = L.DomUtil.create('div', 'settings-title', menu);
        titleMap.textContent = 'Тип карты';

        Object.entries(MAPS).forEach(([key, m]) => {
            const item = L.DomUtil.create('div', 'settings-item', menu);
            item.dataset.key = key;
            if (key === settings.mapTheme) item.classList.add('active');
            item.innerHTML = `<span class="settings-item-icon">${m.icon}</span><span>${m.name}</span>`;

            item.onclick = (e) => {
                e.stopPropagation();
                if (MAPS[settings.mapTheme]) map.removeLayer(MAPS[settings.mapTheme].layer);
                settings.mapTheme = key;
                MAPS[key].layer.addTo(map);
                localStorage.setItem('mapTheme', key);
                menu.querySelectorAll('.settings-item[data-key]').forEach(el => el.classList.remove('active'));
                item.classList.add('active');
            };
        });

        const titleDisplay = L.DomUtil.create('div', 'settings-title', menu);
        titleDisplay.style.marginTop = '8px';
        titleDisplay.textContent = 'Отображение';

        const toggles = [
    { key: 'showRoutes',     label: '🛣 Маршруты целей' },
    { key: 'showPrediction', label: '🔮 Прогноз траектории' },
    { key: 'showTail',       label: '👣 Хвост за целью' },
    { key: 'soundEnabled',   label: '🔊 Звук уведомлений' },
    { key: 'showHistory',    label: '📊 История за 24ч' }
];

        toggles.forEach(t => {
            const row = L.DomUtil.create('div', 'settings-toggle', menu);
            if (settings[t.key]) row.classList.add('active');
            row.innerHTML = `<span>${t.label}</span><span class="toggle-switch"></span>`;

            row.onclick = (e) => {
                e.stopPropagation();
                settings[t.key] = !settings[t.key];
                localStorage.setItem(t.key, settings[t.key]);
                row.classList.toggle('active', settings[t.key]);

                if (t.key === 'showRoutes') {
                    Object.values(activeMarkers).forEach(m => {
                        if (!m.routeLine) return;
                        if (settings.showRoutes) {
                            if (filters[m.category] && !map.hasLayer(m.routeLine)) m.routeLine.addTo(map);
                        } else {
                            if (map.hasLayer(m.routeLine)) map.removeLayer(m.routeLine);
                        }
                    });
                }
                if (t.key === 'showPrediction') {
                    Object.values(activeMarkers).forEach(m => {
                        if (!m.predictedLine) return;
                        if (settings.showPrediction) {
                            if (filters[m.category] && !map.hasLayer(m.predictedLine)) m.predictedLine.addTo(map);
                        } else {
                            if (map.hasLayer(m.predictedLine)) map.removeLayer(m.predictedLine);
                        }
                    });
                }
                if (t.key === 'showTail') {
    Object.values(activeMarkers).forEach(m => {
        if (!m.tailLine) return;
        if (settings.showTail) {
            if (filters[m.category] && !map.hasLayer(m.tailLine)) m.tailLine.addTo(map);
        } else {
            if (map.hasLayer(m.tailLine)) map.removeLayer(m.tailLine);
        }
    });
}
                if (t.key === 'showHistory') {
                    if (settings.showHistory) {
                        historyLayer.addTo(map);
                        renderHistory();
                    } else {
                        map.removeLayer(historyLayer);
                    }
                }
            };
        });

        btn.onclick = (e) => {
            e.stopPropagation();
            menu.style.display = (menu.style.display === 'none') ? 'block' : 'none';
        };

        L.DomEvent.disableClickPropagation(container);
        return container;
    }
});
new SettingsControl().addTo(map);
// ============================================

// ============ МАСКА УКРАИНЫ ============
async function addUkraineMask() {
    try {
        const resp = await fetch('https://raw.githubusercontent.com/R-CoderDotCom/data/main/ukraine.geojson');
        const ukraine = await resp.json();
        const geometry = ukraine.features[0].geometry;
        const rings = [];
        if (geometry.type === 'Polygon') rings.push(geometry.coordinates[0]);
        else if (geometry.type === 'MultiPolygon') geometry.coordinates.forEach(poly => rings.push(poly[0]));
        const holes = rings.map(ring => ring.map(([lng, lat]) => [lat, lng]));
        const world = [[90, -180], [90, 180], [-90, 180], [-90, -180], [90, -180]];

        L.polygon([world, ...holes], {
            stroke: false, fillColor: '#0b0b1a', fillOpacity: 0.72, interactive: false, smoothFactor: 0
        }).addTo(map);

        L.geoJSON(ukraine, {
            style: { color: '#ffffff', weight: 1.2, opacity: 0.55, fill: false, interactive: false },
            smoothFactor: 0
        }).addTo(map);

        console.log('Маска Украины добавлена');
    } catch (e) { console.error('Маска не загрузилась:', e); }
}
addUkraineMask();
// ============================================

// ============ ОККУПИРОВАННЫЕ ТЕРРИТОРИИ ============
async function addOccupiedTerritories() {
    const sources = [
        { url: 'https://raw.githubusercontent.com/cyterat/deepstate-map-data/main/deepstate-map-data.geojson.gz', gzip: true },
        { url: 'https://raw.githubusercontent.com/cyterat/deepstate-map-data/main/data/deepstatemap_data_latest.geojson', gzip: false }
    ];
    for (const src of sources) {
        try {
            let text;
            if (src.gzip) {
                const resp = await fetch(src.url);
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                const blob = await resp.blob();
                const ds = new DecompressionStream('gzip');
                const decompressed = blob.stream().pipeThrough(ds);
                text = await new Response(decompressed).text();
            } else {
                const resp = await fetch(src.url);
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                text = await resp.text();
            }
            const geojson = JSON.parse(text);
            const features = geojson.features || [];
            if (features.length === 0) throw new Error('пусто');
            const dates = features.map(f => f.properties?.date).filter(Boolean).sort();
            const latestDate = dates[dates.length - 1];
            const latestFeatures = dates.length > 0 ? features.filter(f => f.properties?.date === latestDate) : features;
            if (latestFeatures.length === 0) throw new Error('нет актуальной даты');

            L.geoJSON(latestFeatures, {
                style: { color: '#ff6600', weight: 1.5, opacity: 0.8, fillColor: '#ff6600', fillOpacity: 0.25, interactive: false },
                smoothFactor: 0
            }).addTo(map);
            L.geoJSON(latestFeatures, {
                style: { color: '#ff2222', weight: 3, opacity: 0.9, fill: false, interactive: false },
                smoothFactor: 0
            }).addTo(map);

            console.log(`✅ Линия фронта загружена${latestDate ? ` (${latestDate})` : ''}`);
            return;
        } catch (e) { console.warn(`❌ Источник линии фронта: ${e.message}`); }
    }
}
addOccupiedTerritories();
// ============================================

// ============ ТРЕВОГИ ПО ОБЛАСТЯМ ============
let regionsGeoJSON = null;
const alertsLayer = L.layerGroup().addTo(map);

async function loadRegionsGeoJSON() {
    try {
        const resp = await fetch('regions.geojson');
        regionsGeoJSON = await resp.json();
        console.log(`Загружено ${regionsGeoJSON.features.length} областей`);
    } catch (e) { console.error('Не удалось загрузить regions.geojson:', e); }
}

async function updateAlertsLayer() {
    if (!regionsGeoJSON) return;
    try {
        const resp = await fetch(`${API_BASE}/api/alerts`);
        if (!resp.ok) { console.warn('Сервер тревог не готов:', resp.status); return; }
        const data = await resp.json();
        if (!data || !data.states) { console.warn('Нет поля states'); return; }

        const alertRegions = new Set();
        data.states.forEach(s => {
            if (s.alert === true && s.name_en) alertRegions.add(s.name_en.toLowerCase().trim());
        });

        alertsLayer.clearLayers();
        let cnt = 0;
        regionsGeoJSON.features.forEach(feature => {
            const shapeName = (feature.properties.shapeName || '').toLowerCase().trim();
            if (alertRegions.has(shapeName)) {
                cnt++;
                L.geoJSON(feature, {
                    style: { color: '#ff0000', weight: 2, opacity: 0.9, fillColor: '#ff0000', fillOpacity: 0.4, interactive: false },
                    smoothFactor: 0
                }).addTo(alertsLayer);
            }
        });
        console.log(`Подсвечено областей: ${cnt}`);
    } catch (e) { console.error('Ошибка загрузки тревог:', e); }
}
// ============================================

// ============ СЛОИ ============
const targetsLayer = L.layerGroup().addTo(map);
const historyLayer = L.layerGroup();
const historyRenderer = L.canvas({ padding: 0.5 });
const activeMarkers = {};

const targetHistory = [];
const HISTORY_MAX_AGE = 24 * 60 * 60 * 1000;
const HISTORY_MAX_POINTS = 3000;

// ============ КАТЕГОРИИ / СТИЛИ ============
function getTargetCategory(target) {
    const text = ((target.type || '') + ' ' + (target.label || '')).toLowerCase();
    if (text.includes('шахед') || text.includes('shahed') || text.includes('герань') || text.includes('тахед')) return 'shahed';
    if (text.includes('реактив') || text.includes('ракет') || text.includes('калібр') || text.includes('калибр') || text.includes('искандер') || text.includes('кинжал')) return 'rocket';
    if (text.includes('розвід') || text.includes('развед') || text.includes('разведыв')) return 'recon';
    if (text.includes('такт') || text.includes('авіація') || text.includes('авиация') || text.includes('aircraft')) return 'aircraft';
    return 'other';
}

const CATEGORY_STYLE = {
    shahed:   { color: '#ff8800', glow: '#ffaa33', emoji: '✈' },
    rocket:   { color: '#ffcc00', glow: '#ffe066', emoji: '🚀' },
    recon:    { color: '#00ccff', glow: '#66ddff', emoji: '🛸' },
    aircraft: { color: '#ff2222', glow: '#ff6666', emoji: '🛩' },
    other:    { color: '#ff4444', glow: '#ff8888', emoji: '●' }
};

function getTargetStyle(target) { return CATEGORY_STYLE[getTargetCategory(target)]; }

function createIcon(iconUrl, target) {
    if (!iconUrl) {
        const style = getTargetStyle(target || {});
        return L.divIcon({
            className: 'plane-icon',
            html: `<div style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;background:${style.color};border-radius:50%;border:2px solid #fff;box-shadow:0 0 12px ${style.glow},0 0 4px ${style.glow};font-size:16px;line-height:1;">${style.emoji}</div>`,
            iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -16]
        });
    }
    return L.divIcon({
        className: 'plane-icon',
        html: `<img src="${iconUrl}" style="width:32px;height:32px;filter: drop-shadow(0 0 6px rgba(255,80,80,0.9));">`,
        iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -16]
    });
}
// ============ КАРТОЧКА ЦЕЛИ В ПОПАПЕ ============
function buildPopupHtml(target, actualBearing) {
    const style = getTargetStyle(target);
    const speed = target.speed_kmh || 0;
    const speedPct = Math.min(100, (speed / 900) * 100); // шкала до 900 км/ч
    const arrows = ['↑','↗','→','↘','↓','↙','←','↖'];
    const arrow = arrows[Math.round(((actualBearing || 0) % 360) / 45) % 8];

    return `
        <div class="target-popup">
            <div class="tp-header">
                <span class="tp-emoji" style="background:${style.color}">${style.emoji}</span>
                <span class="tp-label">${target.label || 'Цель'}</span>
            </div>
            <div class="tp-row">
                <span class="tp-key">Скорость</span>
                <span class="tp-val">${speed || '?'} км/ч</span>
            </div>
            <div class="tp-bar">
                <div class="tp-bar-fill" style="width:${speedPct}%;background:${style.color}"></div>
            </div>
            <div class="tp-row">
                <span class="tp-key">Курс</span>
                <span class="tp-val">${arrow} ${Math.round(actualBearing || 0)}°</span>
            </div>
            <div class="tp-row">
                <span class="tp-key">Тип</span>
                <span class="tp-val">${target.type || '—'}</span>
            </div>
        </div>
    `;
}
// ============================================
// ============================================

// ============ ЗВУК ============
function playNotificationSound() {
    if (!settings.soundEnabled) return;
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 880;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.start(); osc.stop(ctx.currentTime + 0.35);
    } catch (e) {}
}
// ============================================

// ============ ГЕОМЕТРИЯ / ТРЕКИНГ ============
// Направление между двумя точками (в градусах, 0 = север)
function bearingBetween(lat1, lon1, lat2, lon2) {
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    const brng = Math.atan2(y, x) * 180 / Math.PI;
    return (brng + 360) % 360;
}

// Расстояние в км (формула гаверсинуса)
function distanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
}

// Прогноз на основе фактического движения. Для кружащих целей — отключается.
function predictPath(lat, lon, trackHistory, category, totalMinutes = 15, stepMin = 5) {
    // Авиация и разведка кружат — им прогноз не строим
    if (category === 'aircraft' || category === 'recon') return [];
    if (!trackHistory || trackHistory.length < 2) return [];

    const p1 = trackHistory[trackHistory.length - 2];
    const p2 = trackHistory[trackHistory.length - 1];

    const actualBearing = bearingBetween(p1.lat, p1.lon, p2.lat, p2.lon);
    const dist = distanceKm(p1.lat, p1.lon, p2.lat, p2.lon);
    const dtSec = (p2.ts - p1.ts) / 1000;
    if (dtSec < 1) return [];

    const speedKmh = (dist / dtSec) * 3600;

    // Детектор кружения: за последние 3 точки разворот > 60° — прогноз отключается
    if (trackHistory.length >= 3) {
        const p0 = trackHistory[trackHistory.length - 3];
        const prevBearing = bearingBetween(p0.lat, p0.lon, p1.lat, p1.lon);
        let diff = Math.abs(actualBearing - prevBearing);
        if (diff > 180) diff = 360 - diff;
        if (diff > 60) return [];
    }

    // Медленные цели (< 100 км/ч) не прогнозируем
    if (speedKmh < 100) return [];

    const points = [[lat, lon]];
    const bearingRad = actualBearing * Math.PI / 180;
    const latRad = lat * Math.PI / 180;

    for (let m = stepMin; m <= totalMinutes; m += stepMin) {
        const hours = m / 60;
        const distKm = speedKmh * hours;
        const dLat = (distKm / 111) * Math.cos(bearingRad);
        const dLon = (distKm / (111 * Math.cos(latRad))) * Math.sin(bearingRad);
        points.push([lat + dLat, lon + dLon]);
    }
    return points;
}
// ============================================

// ============ АНИМАЦИЯ ============
function shortestAngleDiff(from, to) {
    let diff = to - from;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    return diff;
}

function animationLoop() {
    const now = performance.now();
    Object.values(activeMarkers).forEach(m => {
        const t = Math.min((now - m.lastUpdate) / 5000, 1);
        // Целевая позиция (куда стремимся)
        const targetLat = m.fromLat + (m.toLat - m.fromLat) * t;
        const targetLon = m.fromLon + (m.toLon - m.fromLon) * t;

        // EMA-сглаживание: маркер плавно подтягивается к целевой позиции
        if (m.renderedLat === undefined) {
            m.renderedLat = targetLat;
            m.renderedLon = targetLon;
        } else {
            // Коэффициент подтягивания: 0.15 — плавно, 0.4 — быстро
            const K = 0.15;
            m.renderedLat += (targetLat - m.renderedLat) * K;
            m.renderedLon += (targetLon - m.renderedLon) * K;
        }
        m.marker.setLatLng([m.renderedLat, m.renderedLon]);

        // Сглаживание поворота
        const targetBearing = m.fromBearing + shortestAngleDiff(m.fromBearing, m.toBearing) * t;
        if (m.lastRenderedBearing === undefined) m.lastRenderedBearing = targetBearing;
        const smoothBearing = m.lastRenderedBearing + shortestAngleDiff(m.lastRenderedBearing, targetBearing) * 0.15;
        m.lastRenderedBearing = smoothBearing;
        m.marker.setRotationAngle(smoothBearing - 45);
        m.currentBearing = smoothBearing;
    });
    requestAnimationFrame(animationLoop);
}
// ============================================

// ============ ИСТОРИЯ ============
function pushHistory(target) {
    targetHistory.push({ lat: target.pos[0], lon: target.pos[1], cat: getTargetCategory(target), ts: Date.now() });
    const now = Date.now();
    while (targetHistory.length && (now - targetHistory[0].ts) > HISTORY_MAX_AGE) targetHistory.shift();
    while (targetHistory.length > HISTORY_MAX_POINTS) targetHistory.shift();
}

function renderHistory() {
    historyLayer.clearLayers();
    if (!settings.showHistory) return;
    targetHistory.forEach(p => {
        L.circleMarker([p.lat, p.lon], {
            radius: 18, stroke: false, fillColor: '#ff4444', fillOpacity: 0.05,
            interactive: false, renderer: historyRenderer
        }).addTo(historyLayer);
    });
}
// ============================================

// ============ СПИСОК ЦЕЛЕЙ ============
const targetsListEl = document.getElementById('targets-list');

function renderTargetsList(targets) {
    if (!targetsListEl) return;
    const visible = targets.filter(t => filters[getTargetCategory(t)]);
    if (visible.length === 0) {
        targetsListEl.innerHTML = '<div class="empty">Нет активных целей</div>';
        return;
    }
    const order = { rocket: 1, shahed: 2, aircraft: 3, recon: 4, other: 5 };
    visible.sort((a, b) => {
        const ca = order[getTargetCategory(a)] || 9;
        const cb = order[getTargetCategory(b)] || 9;
        if (ca !== cb) return ca - cb;
        return (b.speed_kmh || 0) - (a.speed_kmh || 0);
    });

    targetsListEl.innerHTML = visible.map(t => {
        const style = CATEGORY_STYLE[getTargetCategory(t)];
        const label = t.label || t.type || 'Цель';
        const speed = t.speed_kmh ? `${t.speed_kmh} км/ч` : '';
        return `
            <div class="target-item" data-id="${t.id}">
                <div class="target-item-name">
                    <span style="color:${style.color};font-size:14px">${style.emoji}</span>
                    <span>${label}</span>
                </div>
                <div class="target-item-speed">${speed}</div>
            </div>`;
    }).join('');

    targetsListEl.querySelectorAll('.target-item').forEach(el => {
        el.addEventListener('click', () => {
            const m = activeMarkers[el.dataset.id];
            if (m) {
                const pos = m.marker.getLatLng();
                map.flyTo([pos.lat, pos.lng], 10, { duration: 1.2 });
                m.marker.openPopup();
            }
        });
    });
}

document.querySelectorAll('#filters input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
        filters[cb.dataset.cat] = cb.checked;
        applyFilters();
    });
});

function applyFilters() {
    Object.values(activeMarkers).forEach(m => {
        const visible = filters[m.category];
        const onMap = map.hasLayer(m.marker);
        if (visible && !onMap) m.marker.addTo(targetsLayer);
        if (!visible && onMap) targetsLayer.removeLayer(m.marker);

        if (m.routeLine) {
            if (visible && settings.showRoutes && !map.hasLayer(m.routeLine)) m.routeLine.addTo(map);
            if ((!visible || !settings.showRoutes) && map.hasLayer(m.routeLine)) map.removeLayer(m.routeLine);
        }
        if (m.predictedLine) {
            if (visible && settings.showPrediction && !map.hasLayer(m.predictedLine)) m.predictedLine.addTo(map);
            if ((!visible || !settings.showPrediction) && map.hasLayer(m.predictedLine)) map.removeLayer(m.predictedLine);
        }
    });
    fetch(`${API_BASE}/api/targets`)
        .then(r => r.json())
        .then(d => { if (d && d.targets) renderTargetsList(d.targets); })
        .catch(() => {});
}

const sidePanel = document.getElementById('side-panel');
const sideCollapse = document.getElementById('side-collapse');
if (sideCollapse && sidePanel) {
    sideCollapse.addEventListener('click', (e) => {
        e.stopPropagation();
        sidePanel.classList.toggle('collapsed');
        sideCollapse.textContent = sidePanel.classList.contains('collapsed') ? '+' : '–';
    });
}
// На мобильных — тап по шапке панели выдвигает её
const sideHeader = document.getElementById('side-header');
if (sideHeader && sidePanel) {
    sideHeader.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
            e.stopPropagation();
            sidePanel.classList.toggle('open');
        }
    });
}

// При старте на мобильном — панель закрыта
if (window.innerWidth <= 768 && sidePanel) {
    sidePanel.classList.remove('open');
}
// ============================================

// ============ ЗАГРУЗКА ЦЕЛЕЙ ============
async function loadTargets() {
    try {
        const response = await fetch(`${API_BASE}/api/targets`);
        const data = await response.json();
        if (!data || !data.targets) return;

        const seenIds = new Set();
        const now = performance.now();
        const isFirstLoad = !loadTargets._didFirstLoad;
        let newTargetsCount = 0;

        updateStats(data.targets);
        renderTargetsList(data.targets);

        data.targets.forEach(target => {
            if (!target.pos || target.pos.length !== 2) return;
            const [lat, lon] = target.pos;
            const apiBearing = target.bearing || 0;
            const id = target.id;
            const cat = getTargetCategory(target);
            seenIds.add(id);

            pushHistory(target);

            const iconUrl = target.icon ? `https://aviacontrol.com.ua/${target.icon}` : null;
            const visible = filters[cat];

            if (activeMarkers[id]) {
                const m = activeMarkers[id];
                const cur = m.marker.getLatLng();
                m.fromLat = cur.lat; m.fromLon = cur.lng;
                m.toLat = lat; m.toLon = lon;

                // ANTI-JUMP
                const curReal = m.trackHistory && m.trackHistory.length
                    ? m.trackHistory[m.trackHistory.length - 1]
                    : { lat: cur.lat, lon: cur.lng, ts: now - 5000 };
                const jumpDist = distanceKm(curReal.lat, curReal.lon, lat, lon);
                const dtSecJump = (now - curReal.ts) / 1000;
                const maxPossible = ((target.speed_kmh || 500) / 3600) * dtSecJump * 3;
                if (jumpDist > maxPossible && jumpDist > 5) {
                    console.warn(`⚠️ Anti-jump: цель ${id} прыгнула ${jumpDist.toFixed(1)} км`);
                    return;
                }

                // История
                if (!m.trackHistory) m.trackHistory = [];
                m.trackHistory.push({ lat, lon, ts: now });
                if (m.trackHistory.length > 30) m.trackHistory.shift(); // 30 точек ≈ 2.5 мин

                let actualBearing = apiBearing;
                if (m.trackHistory.length >= 2) {
                    const p1 = m.trackHistory[m.trackHistory.length - 2];
                    const p2 = m.trackHistory[m.trackHistory.length - 1];
                    const d = distanceKm(p1.lat, p1.lon, p2.lat, p2.lon);
                    if (d > 0.1) actualBearing = bearingBetween(p1.lat, p1.lon, p2.lat, p2.lon);
                }

                m.fromBearing = m.currentBearing ?? m.toBearing;
                m.toBearing = actualBearing;
                m.lastUpdate = now;
                m.category = cat;

                // Карточка в попапе
                m.marker.setPopupContent(buildPopupHtml(target, actualBearing));

                // Обновляем маршрут (от aviacontrol)
                if (m.routeLine && target.route && target.route.length > 1) {
                    m.routeLine.setLatLngs(target.route);
                }

                // === ХВОСТ ЗА ЦЕЛЬЮ ===
                if (m.trackHistory.length > 2) {
                    const tailPoints = m.trackHistory.map(p => [p.lat, p.lon]);
                    if (m.tailLine) {
                        m.tailLine.setLatLngs(tailPoints);
                        m.tailLine.setStyle({ color: getTargetStyle(target).color });
                    } else {
                        m.tailLine = L.polyline(tailPoints, {
                            color: getTargetStyle(target).color,
                            weight: 2,
                            opacity: 0.35,
                            interactive: false,
                            className: 'tail-line'
                        });
                        if (visible && settings.showTail) m.tailLine.addTo(map);
                    }
                }

                // Прогноз
                const predictedPoints = predictPath(lat, lon, m.trackHistory, cat);
                if (m.predictedLine) {
                    if (predictedPoints.length > 1) {
                        m.predictedLine.setLatLngs(predictedPoints);
                        m.predictedLine.setStyle({ color: getTargetStyle(target).color });
                    } else if (map.hasLayer(m.predictedLine)) {
                        map.removeLayer(m.predictedLine);
                        m.predictedLine = null;
                    }
                } else if (predictedPoints.length > 1) {
                    m.predictedLine = L.polyline(predictedPoints, {
                        color: getTargetStyle(target).color,
                        weight: 2, opacity: 0.5, dashArray: '3,8', interactive: false
                    });
                    if (visible && settings.showPrediction) m.predictedLine.addTo(map);
                }
            } else {
                newTargetsCount++;
                const marker = L.marker([lat, lon], {
                    icon: createIcon(iconUrl, target),
                    rotationAngle: apiBearing - 45,
                    rotationOrigin: 'center center'
                }).bindPopup(buildPopupHtml(target, apiBearing));

                if (visible) marker.addTo(targetsLayer);

                // Маршрут
                let routeLine = null;
                if (target.route && target.route.length > 1) {
                    routeLine = L.polyline(target.route, {
                        color: getTargetStyle(target).color,
                        weight: 2, opacity: 0.55, dashArray: '6,6', interactive: false
                    });
                    if (visible && settings.showRoutes) routeLine.addTo(map);
                }

                activeMarkers[id] = {
                    marker, routeLine, predictedLine: null, tailLine: null, category: cat,
                    trackHistory: [{ lat, lon, ts: now }],
                    fromLat: lat, fromLon: lon, toLat: lat, toLon: lon,
                    fromBearing: apiBearing, toBearing: apiBearing,
                    currentBearing: apiBearing, lastUpdate: now
                };
            }
        });

        // Удаление пропавших целей
        Object.keys(activeMarkers).forEach(id => {
            const m = activeMarkers[id];
            if (!seenIds.has(id)) {
                if (!m.missingSince) m.missingSince = Date.now();
                const missingSec = (Date.now() - m.missingSince) / 1000;
                if (missingSec > 15) {
                    targetsLayer.removeLayer(m.marker);
                    if (m.routeLine && map.hasLayer(m.routeLine)) map.removeLayer(m.routeLine);
                    if (m.predictedLine && map.hasLayer(m.predictedLine)) map.removeLayer(m.predictedLine);
                    if (m.tailLine && map.hasLayer(m.tailLine)) map.removeLayer(m.tailLine);
                    delete activeMarkers[id];
                }
            } else {
                m.missingSince = null;
            }
        });

        if (!isFirstLoad && newTargetsCount > 0) playNotificationSound();
        loadTargets._didFirstLoad = true;

               if (settings.showHistory) renderHistory();
    } catch (error) {
        console.error("Ошибка целей:", error);
    }
}
// ============================================

// ============ СЧЁТЧИК ============
function updateStats(targets) {
    const valid = targets.filter(t => t.pos && t.pos.length === 2);
    document.getElementById('target-count').textContent = valid.length;
    const counts = {};
    valid.forEach(t => {
        const label = t.label || t.type || 'Неизвестно';
        counts[label] = (counts[label] || 0) + 1;
    });
    document.getElementById('target-breakdown').innerHTML = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([l, c]) => `<div class="breakdown-item"><span>${l}</span><span>${c}</span></div>`)
        .join('');
}
// ============================================

// ============ ПОИСК ============
let searchMarker = null;
let searchTimeout = null;
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
const searchClear = document.getElementById('search-clear');

function updateClearButton() {
    if (searchClear) searchClear.style.display = searchMarker ? 'flex' : 'none';
}
function clearSearchMarker() {
    if (searchMarker) { map.removeLayer(searchMarker); searchMarker = null; updateClearButton(); }
}
if (searchInput && searchResults) {
    searchInput.addEventListener('input', () => {
        const q = searchInput.value.trim();
        clearTimeout(searchTimeout);
        if (q.length < 2) { searchResults.classList.remove('active'); searchResults.innerHTML = ''; return; }
        searchTimeout = setTimeout(() => performSearch(q), 400);
    });
    document.addEventListener('click', (e) => {
        if (!document.getElementById('search-panel').contains(e.target)) searchResults.classList.remove('active');
    });
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { searchResults.classList.remove('active'); searchInput.blur(); }
    });
}
if (searchClear) {
    searchClear.addEventListener('click', () => {
        searchInput.value = ''; clearSearchMarker(); searchInput.focus();
    });
}

async function performSearch(query) {
    searchResults.innerHTML = '<div class="search-result-item loading">Ищу...</div>';
    searchResults.classList.add('active');
    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=ua&limit=7&accept-language=uk,ru,en`;
        const resp = await fetch(url);
        const results = await resp.json();
        if (results.length === 0) {
            searchResults.innerHTML = '<div class="search-result-item loading">Ничего не найдено</div>';
            return;
        }
        searchResults.innerHTML = results.map((r, i) => {
            const parts = r.display_name.split(', ');
            return `<div class="search-result-item" data-idx="${i}">
                <div class="result-name">${parts[0]}</div>
                <div class="result-region">${parts.slice(1).join(', ')}</div>
            </div>`;
        }).join('');
        searchResults.querySelectorAll('.search-result-item').forEach(el => {
            el.addEventListener('click', () => {
                const r = results[parseInt(el.dataset.idx)];
                goToLocation(parseFloat(r.lat), parseFloat(r.lon), r.display_name);
            });
        });
    } catch (e) {
        searchResults.innerHTML = '<div class="search-result-item loading">Ошибка поиска</div>';
    }
}

function goToLocation(lat, lon, name) {
    if (searchMarker) map.removeLayer(searchMarker);
    map.flyTo([lat, lon], 12, { duration: 1.2 });
    searchMarker = L.marker([lat, lon], {
        icon: L.divIcon({
            className: 'search-marker',
            html: '<div style="background:#ff4444;width:14px;height:14px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 8px rgba(0,0,0,0.8);cursor:pointer;"></div>',
            iconSize: [20, 20], iconAnchor: [10, 10]
        })
    }).addTo(map);
    searchMarker.on('click', () => clearSearchMarker());
    searchMarker.bindPopup(`<b>${name.split(',')[0]}</b><br><small style="color:#888">Кликни по точке, чтобы убрать</small>`).openPopup();
    searchResults.classList.remove('active');
    searchInput.value = name.split(',')[0];
    updateClearButton();
}
// ============================================

// ============ ЗАПУСК ============
animationLoop();
loadTargets();
setInterval(loadTargets, 5000);

loadRegionsGeoJSON().then(() => {
    setTimeout(updateAlertsLayer, 2000);
    setInterval(updateAlertsLayer, 25000);
});

if (settings.showHistory) historyLayer.addTo(map);
// ============ PWA: SERVICE WORKER ============
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then((reg) => console.log('✅ Service Worker зарегистрирован:', reg.scope))
            .catch((err) => console.warn('⚠️ Service Worker не зарегистрирован:', err));
    });
}
// ============================================