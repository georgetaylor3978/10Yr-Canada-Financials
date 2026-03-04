/**
 * convert-data.js — CSV → JSON converter for 10 Year Gov Financials
 * Reads cdeif-tycfi-2025.csv and outputs data.json
 */
const fs = require('fs');
const path = require('path');

const CSV_FILE = path.join(__dirname, 'cdeif-tycfi-2025.csv');
const OUT_FILE = path.join(__dirname, 'data.json');

// ── Parse CSV (handles quoted fields with commas) ──
function parseCSV(text) {
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const rows = [];
    for (const line of lines) {
        if (!line.trim()) continue;
        const fields = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (inQuotes) {
                if (ch === '"' && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else if (ch === '"') {
                    inQuotes = false;
                } else {
                    current += ch;
                }
            } else {
                if (ch === '"') {
                    inQuotes = true;
                } else if (ch === ',') {
                    fields.push(current.trim());
                    current = '';
                } else {
                    current += ch;
                }
            }
        }
        fields.push(current.trim());
        rows.push(fields);
    }
    return rows;
}

// ── Main ──
const raw = fs.readFileSync(CSV_FILE, 'utf-8');
const rows = parseCSV(raw);
const header = rows[0];

// Find year columns (pattern: YYYY/YYYY)
const yearCols = [];
for (let i = 0; i < header.length; i++) {
    if (/^\d{4}\/\d{4}$/.test(header[i])) {
        yearCols.push({ idx: i, label: header[i] });
    }
}
console.log(`Found ${yearCols.length} year columns: ${yearCols.map(y => y.label).join(', ')}`);

// Column indices
const COL = {
    finStmt: 0,    // Fin-stmt_Etat-consolide_eng
    lvl1: 2,       // Section-lvl1_niv1_eng
    lvl2: 4,       // Section-lvl2_niv2_eng
    lvl3: 6,       // Section-lvl3_niv3_eng
    lvl4: 8,       // Section-lvl4_niv4_eng
    detail: 10,    // Type-detail_eng
};

function buildRecord(row) {
    const values = {};
    for (const yc of yearCols) {
        const v = row[yc.idx];
        values[yc.label] = v === '' ? null : Number(v);
    }
    return {
        finStmt: row[COL.finStmt] || '',
        lvl1: row[COL.lvl1] || '',
        lvl2: row[COL.lvl2] || '',
        lvl3: row[COL.lvl3] || '',
        lvl4: row[COL.lvl4] || '',
        detail: row[COL.detail] || '',
        values
    };
}

const revenues = [];
const expenses = [];
const balanceSheet = [];
const otherStatements = [];

for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 12) continue;
    const rec = buildRecord(row);

    // Revenues and Expenses come from Statement of Operations
    if (rec.finStmt.includes('Statement of Operations')) {
        if (rec.lvl1 === 'Revenues') {
            revenues.push(rec);
        } else if (rec.lvl1 === 'Expenses') {
            expenses.push(rec);
        } else {
            otherStatements.push(rec);
        }
    }
    // Balance Sheet
    else if (rec.finStmt.includes('Statement of Financial Position')) {
        balanceSheet.push(rec);
    }
    // Other statements (for potential future use)
    else {
        otherStatements.push(rec);
    }
}

const output = {
    years: yearCols.map(y => y.label),
    revenues,
    expenses,
    balanceSheet,
    otherStatements
};

fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2), 'utf-8');
console.log(`\nOutput: ${OUT_FILE}`);
console.log(`  Revenues:         ${revenues.length} rows`);
console.log(`  Expenses:         ${expenses.length} rows`);
console.log(`  Balance Sheet:    ${balanceSheet.length} rows`);
console.log(`  Other Statements: ${otherStatements.length} rows`);
console.log('\nDone!');
