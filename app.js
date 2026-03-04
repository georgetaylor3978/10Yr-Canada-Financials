/* ═══════════════════════════════════════════
   10 Year Gov Financials — Dashboard Logic
   Three sections: Revenues, Expenses, Balance Sheet
   v2: Select All/None, distinct colors, data table,
       balance sheet sign convention (assets +, liabilities −)
   ═══════════════════════════════════════════ */

// ── Color palettes — maximally distinct within each theme ──
var COLORS = {
    revenues: [
        '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6',
        '#06b6d4', '#ec4899', '#ef4444', '#22d3ee',
        '#f97316', '#84cc16', '#14b8a6', '#a855f7'
    ],
    expenses: [
        '#f43f5e', '#3b82f6', '#f59e0b', '#10b981',
        '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16',
        '#ef4444', '#f97316', '#22d3ee', '#a855f7',
        '#14b8a6', '#e879f9'
    ],
    balanceSheet: [
        '#3b82f6', '#f43f5e', '#10b981', '#f59e0b',
        '#8b5cf6', '#06b6d4', '#ec4899', '#ef4444',
        '#84cc16', '#22d3ee', '#f97316', '#a855f7',
        '#14b8a6', '#e879f9', '#fbbf24', '#fb923c'
    ]
};

var DATA = null;
var activeTab = 'revenues';
var yearFrom = null;
var yearTo = null;
var allYears = [];

// ── Section state ──
var sections = {
    revenues: { level: 'overview', slicerStates: {}, barChart: null, lineChart: null, categories: [] },
    expenses: { level: 'overview', slicerStates: {}, barChart: null, lineChart: null, categories: [] },
    balanceSheet: { level: 'overview', slicerStates: {}, barChart: null, lineChart: null, categories: [] }
};

// ══════════════════════════════════════════
// INIT
// ══════════════════════════════════════════
async function init() {
    try {
        var resp = await fetch('data.json');
        DATA = await resp.json();
        allYears = DATA.years;
        yearFrom = allYears[0];
        yearTo = allYears[allYears.length - 1];
        populateYearSelectors();
        setupTabs();
        setupYearEvents();
        buildSection('revenues', DATA.revenues);
        buildSection('expenses', DATA.expenses);
        buildSection('balanceSheet', DATA.balanceSheet);
        updateAll();
        document.getElementById('dataStatus').innerHTML = '&#x25CF; Data Loaded';
    } catch (e) {
        console.error('Failed to load data:', e);
        document.getElementById('dataStatus').textContent = '✕ Load Failed';
        document.getElementById('dataStatus').classList.remove('loaded');
    }
}

// ══════════════════════════════════════════
// YEAR SELECTORS
// ══════════════════════════════════════════
function populateYearSelectors() {
    var fromSel = document.getElementById('yearFrom');
    var toSel = document.getElementById('yearTo');
    allYears.forEach(function (y) {
        fromSel.add(new Option(y, y));
        toSel.add(new Option(y, y));
    });
    fromSel.value = yearFrom;
    toSel.value = yearTo;
}

function setupYearEvents() {
    document.getElementById('yearFrom').addEventListener('change', function () {
        yearFrom = this.value;
        if (allYears.indexOf(yearFrom) > allYears.indexOf(yearTo)) {
            yearTo = yearFrom;
            document.getElementById('yearTo').value = yearTo;
        }
        updateAll();
    });
    document.getElementById('yearTo').addEventListener('change', function () {
        yearTo = this.value;
        if (allYears.indexOf(yearTo) < allYears.indexOf(yearFrom)) {
            yearFrom = yearTo;
            document.getElementById('yearFrom').value = yearFrom;
        }
        updateAll();
    });
}

// ══════════════════════════════════════════
// TABS
// ══════════════════════════════════════════
function setupTabs() {
    var btns = document.querySelectorAll('.tab-btn');
    btns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            var tab = btn.getAttribute('data-tab');
            switchTab(tab);
        });
    });
    positionIndicator();
    window.addEventListener('resize', positionIndicator);
}

function switchTab(tab) {
    activeTab = tab;
    document.querySelectorAll('.tab-btn').forEach(function (b) {
        b.classList.toggle('active', b.getAttribute('data-tab') === tab);
    });
    document.querySelectorAll('.tab-section').forEach(function (s) {
        s.classList.toggle('active', s.id === 'section-' + tab);
    });
    positionIndicator();
}

function positionIndicator() {
    var active = document.querySelector('.tab-btn.active');
    var indicator = document.getElementById('tabIndicator');
    if (!active || !indicator) return;
    var bar = document.querySelector('.tab-bar-content');
    var barRect = bar.getBoundingClientRect();
    var btnRect = active.getBoundingClientRect();
    indicator.style.left = (btnRect.left - barRect.left) + 'px';
    indicator.style.width = btnRect.width + 'px';
}

// ══════════════════════════════════════════
// BUILD SECTION
// ══════════════════════════════════════════
function buildSection(sectionKey, data) {
    var sec = sections[sectionKey];
    var cats = getCategoriesForLevel(sectionKey, data, 'overview');
    sec.categories = cats;
    buildLevelDropdown(sectionKey, data);
    buildSlicers(sectionKey, cats);
    setupSectionEvents(sectionKey, data);
}

function getCategoriesForLevel(sectionKey, data, level) {
    var catMap = {};

    if (level === 'overview') {
        if (sectionKey === 'revenues') {
            data.forEach(function (row) {
                var key = row.lvl2 || row.lvl1;
                if (!catMap[key]) catMap[key] = { name: key, values: {} };
                allYears.forEach(function (y) {
                    var v = row.values[y];
                    if (v !== null) catMap[key].values[y] = (catMap[key].values[y] || 0) + v;
                });
            });
        } else if (sectionKey === 'expenses') {
            data.forEach(function (row) {
                var key;
                if (row.lvl2 === 'Program expenses' && row.lvl3 === 'Transfer payments') {
                    key = row.lvl4 || row.lvl3;
                } else if (row.lvl2 === 'Program expenses') {
                    key = row.lvl3 || row.lvl2;
                } else {
                    key = row.lvl2 || row.lvl1;
                }
                if (!catMap[key]) catMap[key] = { name: key, values: {} };
                allYears.forEach(function (y) {
                    var v = row.values[y];
                    if (v !== null) catMap[key].values[y] = (catMap[key].values[y] || 0) + v;
                });
            });
        } else if (sectionKey === 'balanceSheet') {
            // For balance sheet: sign convention — assets positive, liabilities negative
            data.forEach(function (row) {
                var key = row.lvl2 || row.lvl1;
                var sign = (row.lvl1 === 'Liabilities') ? -1 : 1;
                if (!catMap[key]) catMap[key] = { name: key, values: {}, bsType: row.lvl1 };
                allYears.forEach(function (y) {
                    var v = row.values[y];
                    if (v !== null) catMap[key].values[y] = (catMap[key].values[y] || 0) + (v * sign);
                });
            });
        }
    } else {
        data.forEach(function (row) {
            var parentKey, childKey;
            if (sectionKey === 'revenues') {
                parentKey = row.lvl2 || row.lvl1;
                childKey = row.lvl3 || row.lvl4 || row.detail || parentKey;
                if (row.lvl3) childKey = row.lvl4 || row.lvl3;
            } else if (sectionKey === 'expenses') {
                if (row.lvl2 === 'Program expenses' && row.lvl3 === 'Transfer payments') {
                    parentKey = row.lvl4 || row.lvl3;
                    childKey = row.detail || row.lvl4 || row.lvl3;
                } else if (row.lvl2 === 'Program expenses') {
                    parentKey = row.lvl3 || row.lvl2;
                    childKey = row.lvl4 || row.lvl3;
                } else {
                    parentKey = row.lvl2 || row.lvl1;
                    childKey = row.lvl3 || row.lvl2;
                }
            } else {
                parentKey = row.lvl2 || row.lvl1;
                childKey = row.lvl3 || row.lvl4 || row.detail || parentKey;
                if (row.lvl3) childKey = row.lvl4 || row.detail || row.lvl3;
                // Apply BS sign convention on drill-down too
                var sign = (row.lvl1 === 'Liabilities') ? -1 : 1;
                if (parentKey === level) {
                    if (!catMap[childKey]) catMap[childKey] = { name: childKey, values: {} };
                    allYears.forEach(function (y) {
                        var v = row.values[y];
                        if (v !== null) catMap[childKey].values[y] = (catMap[childKey].values[y] || 0) + (v * sign);
                    });
                }
                return; // skip the generic block below for BS
            }

            if (parentKey === level) {
                if (!catMap[childKey]) catMap[childKey] = { name: childKey, values: {} };
                allYears.forEach(function (y) {
                    var v = row.values[y];
                    if (v !== null) catMap[childKey].values[y] = (catMap[childKey].values[y] || 0) + v;
                });
            }
        });
    }

    return Object.values(catMap);
}

function buildLevelDropdown(sectionKey, data) {
    var prefix = sectionKey === 'revenues' ? 'rev' : sectionKey === 'expenses' ? 'exp' : 'bs';
    var sel = document.getElementById(prefix + '-level');
    while (sel.options.length > 1) sel.remove(1);
    var topCats = getCategoriesForLevel(sectionKey, data, 'overview');
    topCats.forEach(function (cat) {
        sel.add(new Option('Drill into: ' + cat.name, cat.name));
    });
}

// ══════════════════════════════════════════
// SLICERS — Select All / None toggle
// ══════════════════════════════════════════
function buildSlicers(sectionKey, cats) {
    var prefix = sectionKey === 'revenues' ? 'rev' : sectionKey === 'expenses' ? 'exp' : 'bs';
    var container = document.getElementById(prefix + '-slicers');
    container.innerHTML = '';
    var colors = COLORS[sectionKey];
    var sec = sections[sectionKey];

    // All / None toggle button
    var allBtn = document.createElement('button');
    allBtn.className = 'slicer-btn-selectall';
    allBtn.textContent = '✓ Select All';
    allBtn.addEventListener('click', function () {
        var allSelected = cats.every(function (c) { return sec.slicerStates[c.name]; });
        var newState = !allSelected;
        cats.forEach(function (c) { sec.slicerStates[c.name] = newState; });
        updateToggleBtnLabel(allBtn, sec, cats);
        refreshSlicerUI(sectionKey, cats);
        updateSection(sectionKey);
    });
    container.appendChild(allBtn);

    cats.forEach(function (cat, idx) {
        if (sec.slicerStates[cat.name] === undefined) {
            sec.slicerStates[cat.name] = true;
        }
        var btn = document.createElement('button');
        var color = colors[idx % colors.length];
        btn.className = 'slicer-btn' + (sec.slicerStates[cat.name] ? ' active' : ' deselected');
        btn.innerHTML = '<span class="slicer-dot" style="background:' + color + '"></span>' + truncate(cat.name, 30);
        btn.setAttribute('title', cat.name);
        if (sec.slicerStates[cat.name]) {
            btn.style.background = hexToRgba(color, 0.15);
            btn.style.borderColor = hexToRgba(color, 0.4);
            btn.style.color = lighten(color);
        }
        btn.setAttribute('data-cat', cat.name);
        btn.addEventListener('click', function () {
            sec.slicerStates[cat.name] = !sec.slicerStates[cat.name];
            updateToggleBtnLabel(allBtn, sec, cats);
            refreshSlicerUI(sectionKey, cats);
            updateSection(sectionKey);
        });
        container.appendChild(btn);
    });

    updateToggleBtnLabel(allBtn, sec, cats);
}

function updateToggleBtnLabel(allBtn, sec, cats) {
    var allSelected = cats.every(function (c) { return sec.slicerStates[c.name]; });
    if (allSelected) {
        allBtn.textContent = '✕ Select None';
        allBtn.classList.add('mode-none');
    } else {
        allBtn.textContent = '✓ Select All';
        allBtn.classList.remove('mode-none');
    }
}

function refreshSlicerUI(sectionKey, cats) {
    var prefix = sectionKey === 'revenues' ? 'rev' : sectionKey === 'expenses' ? 'exp' : 'bs';
    var container = document.getElementById(prefix + '-slicers');
    var colors = COLORS[sectionKey];
    var sec = sections[sectionKey];
    var btns = container.querySelectorAll('.slicer-btn');
    btns.forEach(function (btn, idx) {
        var catName = btn.getAttribute('data-cat');
        var isActive = sec.slicerStates[catName];
        var color = colors[idx % colors.length];
        btn.classList.toggle('active', isActive);
        btn.classList.toggle('deselected', !isActive);
        if (isActive) {
            btn.style.background = hexToRgba(color, 0.15);
            btn.style.borderColor = hexToRgba(color, 0.4);
            btn.style.color = lighten(color);
        } else {
            btn.style.background = '';
            btn.style.borderColor = '';
            btn.style.color = '';
        }
    });
}

function setupSectionEvents(sectionKey, data) {
    var prefix = sectionKey === 'revenues' ? 'rev' : sectionKey === 'expenses' ? 'exp' : 'bs';
    document.getElementById(prefix + '-level').addEventListener('change', function () {
        var val = this.value;
        var sec = sections[sectionKey];
        sec.level = val;
        sec.slicerStates = {};
        var cats = getCategoriesForLevel(sectionKey, data, val);
        sec.categories = cats;
        buildSlicers(sectionKey, cats);
        updateSection(sectionKey);
    });
}

// ══════════════════════════════════════════
// UPDATE
// ══════════════════════════════════════════
function updateAll() {
    updateSection('revenues');
    updateSection('expenses');
    updateSection('balanceSheet');
}

function updateSection(sectionKey) {
    var sec = sections[sectionKey];
    var filteredYears = getFilteredYears();
    var activeCats = sec.categories.filter(function (c) { return sec.slicerStates[c.name]; });
    var colors = COLORS[sectionKey];

    // Map active cats to their original index for correct color
    var activeCatsWithColor = activeCats.map(function (c) {
        var origIdx = sec.categories.indexOf(c);
        return { cat: c, color: colors[origIdx % colors.length] };
    });

    updateCards(sectionKey, sec.categories, activeCats, filteredYears);

    if (sectionKey === 'balanceSheet') {
        updateBalanceSheetBarChart(activeCatsWithColor, filteredYears);
        updateBalanceSheetLineChart(activeCatsWithColor, filteredYears);
    } else {
        updateBarChart(sectionKey, activeCatsWithColor, filteredYears);
        updateLineChart(sectionKey, activeCatsWithColor, filteredYears);
    }

    updateDataTable(sectionKey, activeCats, filteredYears, colors);
}

function getFilteredYears() {
    var fromIdx = allYears.indexOf(yearFrom);
    var toIdx = allYears.indexOf(yearTo);
    if (fromIdx < 0) fromIdx = 0;
    if (toIdx < 0) toIdx = allYears.length - 1;
    return allYears.slice(fromIdx, toIdx + 1);
}

// ══════════════════════════════════════════
// SUMMARY CARDS
// ══════════════════════════════════════════
function updateCards(sectionKey, allCats, activeCats, years) {
    var prefix = sectionKey === 'revenues' ? 'rev' : sectionKey === 'expenses' ? 'exp' : 'bs';
    var lastYear = years[years.length - 1];
    var firstYear = years[0];

    if (sectionKey === 'balanceSheet') {
        updateBalanceSheetCards(years, lastYear, firstYear);
        return;
    }

    var latestTotal = 0;
    activeCats.forEach(function (c) { latestTotal += (c.values[lastYear] || 0); });
    document.getElementById(prefix + '-latest-val').textContent = formatDollars(latestTotal);
    document.getElementById(prefix + '-latest-year').textContent = lastYear;

    var firstTotal = 0;
    activeCats.forEach(function (c) { firstTotal += (c.values[firstYear] || 0); });
    if (firstTotal !== 0) {
        var growthPct = ((latestTotal - firstTotal) / Math.abs(firstTotal)) * 100;
        var el = document.getElementById(prefix + '-growth');
        el.textContent = (growthPct >= 0 ? '+' : '') + growthPct.toFixed(1) + '%';
        el.className = 'card-value ' + (growthPct >= 0 ? 'positive' : 'negative');
    } else {
        document.getElementById(prefix + '-growth').textContent = '—';
        document.getElementById(prefix + '-growth').className = 'card-value';
    }

    var n = years.length - 1;
    if (n > 0 && firstTotal > 0 && latestTotal > 0) {
        var cagr = (Math.pow(latestTotal / firstTotal, 1 / n) - 1) * 100;
        document.getElementById(prefix + '-avg-growth').textContent = cagr.toFixed(1) + '%';
    } else {
        document.getElementById(prefix + '-avg-growth').textContent = '—';
    }

    var largestVal = 0, largestName = '—';
    activeCats.forEach(function (c) {
        var v = Math.abs(c.values[lastYear] || 0);
        if (v > largestVal) { largestVal = v; largestName = c.name; }
    });
    document.getElementById(prefix + '-largest').textContent = formatDollars(largestVal);
    document.getElementById(prefix + '-largest-name').textContent = truncate(largestName, 40);
}

function updateBalanceSheetCards(years, lastYear, firstYear) {
    // Use raw data for cards (unsigned) so we get real totals
    var data = DATA.balanceSheet;
    var totalLiab = 0, totalFA = 0, totalNFA = 0;
    var firstLiab = 0, firstFA = 0, firstNFA = 0;

    data.forEach(function (row) {
        var latest = row.values[lastYear] || 0;
        var first = row.values[firstYear] || 0;
        if (row.lvl1 === 'Liabilities') {
            totalLiab += latest;
            firstLiab += first;
        } else if (row.lvl1 === 'Financial assets') {
            totalFA += latest;
            firstFA += first;
        } else if (row.lvl1 === 'Non-financial assets') {
            totalNFA += latest;
            firstNFA += first;
        }
    });

    var totalAssets = totalFA + totalNFA;
    var firstAssets = firstFA + firstNFA;
    var deficit = totalLiab - totalAssets; // accumulated deficit (positive = deficit)
    var firstDeficit = firstLiab - firstAssets;

    document.getElementById('bs-liabilities').textContent = formatDollars(totalLiab);
    document.getElementById('bs-liab-year').textContent = lastYear;
    document.getElementById('bs-assets').textContent = formatDollars(totalAssets);
    document.getElementById('bs-asset-year').textContent = lastYear;
    document.getElementById('bs-netdebt').textContent = formatDollars(deficit);
    document.getElementById('bs-netdebt').className = 'card-value negative';

    if (firstDeficit !== 0) {
        var debtGrowth = ((deficit - firstDeficit) / Math.abs(firstDeficit)) * 100;
        var el = document.getElementById('bs-debt-growth');
        el.textContent = (debtGrowth >= 0 ? '+' : '') + debtGrowth.toFixed(1) + '%';
        el.className = 'card-value ' + (debtGrowth >= 0 ? 'negative' : 'positive');
    } else {
        document.getElementById('bs-debt-growth').textContent = '—';
    }
}

// ══════════════════════════════════════════
// BAR CHART — Revenue & Expenses (stacked)
// ══════════════════════════════════════════
function updateBarChart(sectionKey, activeCatsWithColor, years) {
    var prefix = sectionKey === 'revenues' ? 'rev' : 'exp';
    var canvasId = prefix + '-bar-chart';
    var sec = sections[sectionKey];

    if (sec.barChart) { sec.barChart.destroy(); sec.barChart = null; }

    var datasets = activeCatsWithColor.map(function (item) {
        return {
            label: truncate(item.cat.name, 28),
            data: years.map(function (y) { return item.cat.values[y] || 0; }),
            backgroundColor: hexToRgba(item.color, 0.75),
            borderColor: item.color,
            borderWidth: 1,
            borderRadius: 3,
        };
    });

    var ctx = document.getElementById(canvasId).getContext('2d');
    sec.barChart = new Chart(ctx, {
        type: 'bar',
        data: { labels: years, datasets: datasets },
        options: barChartOptions(true)
    });
}

// ══════════════════════════════════════════
// BAR CHART — Balance Sheet (grouped, not stacked)
// Assets positive (above 0), Liabilities negative (below 0)
// ══════════════════════════════════════════
function updateBalanceSheetBarChart(activeCatsWithColor, years) {
    var sec = sections.balanceSheet;
    if (sec.barChart) { sec.barChart.destroy(); sec.barChart = null; }

    var datasets = activeCatsWithColor.map(function (item) {
        return {
            label: truncate(item.cat.name, 28),
            data: years.map(function (y) { return item.cat.values[y] || 0; }),
            backgroundColor: hexToRgba(item.color, 0.75),
            borderColor: item.color,
            borderWidth: 1,
            borderRadius: 3,
        };
    });

    // Add accumulated deficit line
    var deficitData = years.map(function (y) {
        var sum = 0;
        activeCatsWithColor.forEach(function (item) { sum += (item.cat.values[y] || 0); });
        return sum;
    });

    datasets.push({
        label: 'Accumulated Deficit',
        data: deficitData,
        type: 'line',
        borderColor: '#f0f4fc',
        backgroundColor: 'transparent',
        borderWidth: 3,
        borderDash: [6, 4],
        pointRadius: 5,
        pointBackgroundColor: '#f0f4fc',
        pointBorderColor: '#0a0e17',
        pointBorderWidth: 2,
        tension: 0.3,
        order: -1
    });

    var ctx = document.getElementById('bs-bar-chart').getContext('2d');
    sec.barChart = new Chart(ctx, {
        type: 'bar',
        data: { labels: years, datasets: datasets },
        options: barChartOptions(true)
    });
}

function barChartOptions(stacked) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
            legend: {
                display: true,
                position: 'bottom',
                labels: {
                    color: '#8b95b0',
                    font: { family: 'Inter', size: 10 },
                    padding: 10,
                    boxWidth: 10,
                    usePointStyle: true,
                    pointStyle: 'rectRounded'
                }
            },
            tooltip: {
                backgroundColor: 'rgba(15, 21, 32, 0.95)',
                titleColor: '#f0f4fc',
                bodyColor: '#8b95b0',
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1,
                cornerRadius: 8,
                padding: 12,
                callbacks: {
                    label: function (ctx) {
                        return ctx.dataset.label + ': ' + formatDollars(ctx.parsed.y);
                    }
                }
            }
        },
        scales: {
            x: {
                stacked: stacked,
                grid: { color: 'rgba(255,255,255,0.04)' },
                ticks: { color: '#5a6580', font: { family: 'Inter', size: 11 } }
            },
            y: {
                stacked: stacked,
                grid: { color: 'rgba(255,255,255,0.04)' },
                ticks: {
                    color: '#5a6580',
                    font: { family: 'Inter', size: 11 },
                    callback: function (v) { return formatAxis(v); }
                }
            }
        }
    };
}

// ══════════════════════════════════════════
// LINE CHART — Revenue & Expenses
// ══════════════════════════════════════════
function updateLineChart(sectionKey, activeCatsWithColor, years) {
    var prefix = sectionKey === 'revenues' ? 'rev' : 'exp';
    var canvasId = prefix + '-line-chart';
    var sec = sections[sectionKey];

    if (sec.lineChart) { sec.lineChart.destroy(); sec.lineChart = null; }

    var datasets = [];

    activeCatsWithColor.forEach(function (item, idx) {
        datasets.push({
            label: truncate(item.cat.name, 28),
            data: years.map(function (y) { return item.cat.values[y] || 0; }),
            borderColor: item.color,
            backgroundColor: hexToRgba(item.color, 0.05),
            borderWidth: 2.5,
            fill: false,
            tension: 0.3,
            pointRadius: 4,
            pointHoverRadius: 7,
            pointBackgroundColor: item.color,
            order: idx
        });
    });

    var ctx = document.getElementById(canvasId).getContext('2d');
    sec.lineChart = new Chart(ctx, {
        type: 'line',
        data: { labels: years, datasets: datasets },
        options: lineChartOptions()
    });
}

// ══════════════════════════════════════════
// LINE CHART — Balance Sheet
// ══════════════════════════════════════════
function updateBalanceSheetLineChart(activeCatsWithColor, years) {
    var sec = sections.balanceSheet;
    if (sec.lineChart) { sec.lineChart.destroy(); sec.lineChart = null; }

    var datasets = [];

    // Individual lines
    activeCatsWithColor.forEach(function (item, idx) {
        datasets.push({
            label: truncate(item.cat.name, 28),
            data: years.map(function (y) { return item.cat.values[y] || 0; }),
            borderColor: item.color,
            backgroundColor: 'transparent',
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: item.color,
            order: idx + 1
        });
    });

    // Accumulated deficit line (sum of all)
    var deficitData = years.map(function (y) {
        var sum = 0;
        activeCatsWithColor.forEach(function (item) { sum += (item.cat.values[y] || 0); });
        return sum;
    });

    datasets.unshift({
        label: 'Accumulated Deficit',
        data: deficitData,
        borderColor: '#f0f4fc',
        backgroundColor: 'rgba(240, 244, 252, 0.06)',
        borderWidth: 3,
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 7,
        pointBackgroundColor: '#f0f4fc',
        order: 0
    });

    var ctx = document.getElementById('bs-line-chart').getContext('2d');
    sec.lineChart = new Chart(ctx, {
        type: 'line',
        data: { labels: years, datasets: datasets },
        options: lineChartOptions()
    });
}

function lineChartOptions() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
            legend: {
                display: true,
                position: 'bottom',
                labels: {
                    color: '#8b95b0',
                    font: { family: 'Inter', size: 10 },
                    padding: 10,
                    boxWidth: 10,
                    usePointStyle: true
                }
            },
            tooltip: {
                backgroundColor: 'rgba(15, 21, 32, 0.95)',
                titleColor: '#f0f4fc',
                bodyColor: '#8b95b0',
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1,
                cornerRadius: 8,
                padding: 12,
                callbacks: {
                    label: function (ctx) {
                        return ctx.dataset.label + ': ' + formatDollars(ctx.parsed.y);
                    }
                }
            }
        },
        scales: {
            x: {
                grid: { color: 'rgba(255,255,255,0.04)' },
                ticks: { color: '#5a6580', font: { family: 'Inter', size: 11 } }
            },
            y: {
                grid: { color: 'rgba(255,255,255,0.04)' },
                ticks: {
                    color: '#5a6580',
                    font: { family: 'Inter', size: 11 },
                    callback: function (v) { return formatAxis(v); }
                }
            }
        }
    };
}

// ══════════════════════════════════════════
// DATA TABLE
// ══════════════════════════════════════════
function updateDataTable(sectionKey, activeCats, years, colors) {
    var prefix = sectionKey === 'revenues' ? 'rev' : sectionKey === 'expenses' ? 'exp' : 'bs';
    var container = document.getElementById(prefix + '-table');
    var sec = sections[sectionKey];

    if (activeCats.length === 0 || years.length === 0) {
        container.innerHTML = '<p style="color:#5a6580;padding:12px;font-size:0.85rem;">Select categories to view data.</p>';
        return;
    }

    var html = '<table class="data-table"><thead><tr><th>Category</th>';
    years.forEach(function (y) { html += '<th>' + y + '</th>'; });
    html += '</tr></thead><tbody>';

    activeCats.forEach(function (cat) {
        html += '<tr><td>' + truncate(cat.name, 45) + '</td>';
        years.forEach(function (y) {
            var v = cat.values[y] || 0;
            var cls = v < 0 ? ' class="negative"' : '';
            html += '<td' + cls + '>' + formatTableNum(v) + '</td>';
        });
        html += '</tr>';
    });

    // Total row
    html += '<tr class="total-row"><td><strong>Total</strong></td>';
    years.forEach(function (y) {
        var total = 0;
        activeCats.forEach(function (c) { total += (c.values[y] || 0); });
        var cls = total < 0 ? ' class="negative"' : '';
        html += '<td' + cls + '><strong>' + formatTableNum(total) + '</strong></td>';
    });
    html += '</tr>';

    html += '</tbody></table>';
    container.innerHTML = html;
}

// ══════════════════════════════════════════
// FORMATTERS
// ══════════════════════════════════════════
function formatDollars(val) {
    if (val === null || val === undefined || isNaN(val)) return '—';
    var absVal = Math.abs(val);
    var sign = val < 0 ? '-' : '';
    if (absVal >= 1000000) {
        return sign + '$' + (absVal / 1000000).toFixed(2) + 'T';
    } else if (absVal >= 1000) {
        return sign + '$' + (absVal / 1000).toFixed(1) + 'B';
    } else if (absVal >= 1) {
        return sign + '$' + absVal.toFixed(0) + 'M';
    } else {
        return sign + '$' + absVal.toFixed(1) + 'M';
    }
}

function formatAxis(val) {
    if (val === 0) return '0';
    var absVal = Math.abs(val);
    var sign = val < 0 ? '-' : '';
    if (absVal >= 1000000) {
        return sign + '$' + (absVal / 1000000).toFixed(1) + 'T';
    } else if (absVal >= 1000) {
        return sign + '$' + (absVal / 1000).toFixed(0) + 'B';
    } else {
        return sign + '$' + absVal.toFixed(0) + 'M';
    }
}

function formatTableNum(val) {
    if (val === null || val === undefined || isNaN(val)) return '—';
    var sign = val < 0 ? '-' : '';
    var absVal = Math.abs(val);
    // Format with thousands separators
    var formatted = Math.round(absVal).toLocaleString('en-US');
    return sign + '$' + formatted;
}

function truncate(str, max) {
    if (!str) return '';
    return str.length > max ? str.substring(0, max - 1) + '…' : str;
}

function hexToRgba(hex, alpha) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}

function lighten(hex) {
    var r = Math.min(255, parseInt(hex.slice(1, 3), 16) + 60);
    var g = Math.min(255, parseInt(hex.slice(3, 5), 16) + 60);
    var b = Math.min(255, parseInt(hex.slice(5, 7), 16) + 60);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
}

// ── Start ──
init();
