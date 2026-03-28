import { jsPDF } from 'jspdf';

/* ─── Design tokens ─────────────────────────────── */
const C = {
    bg:       [19,  21,  29],
    panel:    [28,  31,  43],
    border:   [42,  46,  62],
    text:     [220, 222, 230],
    muted:    [120, 124, 140],
    blue:     [59,  130, 246],
    green:    [76,  175, 80],
    red:      [244, 67,  54],
    orange:   [255, 152, 0],
    white:    [255, 255, 255],
};

const setFill  = (doc, rgb) => doc.setFillColor(...rgb);
const setDraw  = (doc, rgb) => doc.setDrawColor(...rgb);
const setTxt   = (doc, rgb) => doc.setTextColor(...rgb);
const W = 210; // A4 width mm

/* ─── Header banner ─────────────────────────────── */
function drawHeader(doc, title, subtitle) {
    // Dark background banner
    setFill(doc, C.panel);
    doc.rect(0, 0, W, 28, 'F');

    // Accent strip
    setFill(doc, C.blue);
    doc.rect(0, 0, 4, 28, 'F');

    setTxt(doc, C.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('🚚 Supply Chain AI — ' + title, 10, 11);

    setTxt(doc, C.muted);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(subtitle, 10, 19);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 10, 24);

    // Right watermark
    setTxt(doc, [...C.blue, 60]);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('CONFIDENTIAL', W - 10, 24, { align: 'right' });
}

/* ─── Section heading ───────────────────────────── */
function drawSection(doc, label, y) {
    setFill(doc, C.border);
    doc.rect(8, y, W - 16, 7, 'F');
    setTxt(doc, C.blue);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(label.toUpperCase(), 12, y + 5);
    return y + 11;
}

/* ─── KPI row ───────────────────────────────────── */
function drawKpiRow(doc, kpis, y) {
    const boxW = (W - 16 - (kpis.length - 1) * 4) / kpis.length;
    kpis.forEach((kpi, i) => {
        const x = 8 + i * (boxW + 4);
        setFill(doc, C.panel);
        setDraw(doc, C.border);
        doc.setLineWidth(0.3);
        doc.rect(x, y, boxW, 18, 'FD');

        setTxt(doc, C.muted);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.text(kpi.label, x + 4, y + 6);

        setTxt(doc, kpi.color || C.white);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text(String(kpi.value), x + 4, y + 14);
    });
    return y + 22;
}

/* ─── Row in a table ─────────────────────────────── */
function drawTableRow(doc, cols, y, shade) {
    if (shade) { setFill(doc, [24, 27, 38]); doc.rect(8, y, W - 16, 7, 'F'); }
    cols.forEach(({ text, x, w, align = 'left', color }) => {
        setTxt(doc, color || C.text);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.text(String(text ?? '—'), align === 'right' ? x + w - 1 : x + 2, y + 5, { align, maxWidth: w - 3 });
    });
    return y + 7;
}

/* ─── Table header ───────────────────────────────── */
function drawTableHeader(doc, cols, y) {
    setFill(doc, C.border);
    doc.rect(8, y, W - 16, 7, 'F');
    cols.forEach(({ label, x, w, align = 'left' }) => {
        setTxt(doc, C.muted);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.text(label.toUpperCase(), align === 'right' ? x + w - 1 : x + 2, y + 5, { align });
    });
    return y + 7;
}

/* ─── Horizontal bar ─────────────────────────────── */
function drawBar(doc, label, value, max, color, y) {
    setTxt(doc, C.muted);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(label, 10, y + 4);

    const barX = 60, barW = W - 68, barH = 5;
    setFill(doc, C.border);
    doc.rect(barX, y, barW, barH, 'F');
    const fill = Math.max(2, (value / max) * barW);
    setFill(doc, color);
    doc.rect(barX, y, fill, barH, 'F');

    setTxt(doc, C.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(`${value}%`, W - 10, y + 4, { align: 'right' });
    return y + 8;
}

/* ─── Footer ─────────────────────────────────────── */
function drawFooter(doc) {
    const pages = doc.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
        doc.setPage(p);
        setFill(doc, C.panel);
        doc.rect(0, 287, W, 10, 'F');
        setTxt(doc, C.muted);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.text('Supply Chain AI Platform — Confidential', 10, 293);
        doc.text(`Page ${p} / ${pages}`, W - 10, 293, { align: 'right' });
    }
}

/* ════════════════════════════════════════════════
   PUBLIC API
   ════════════════════════════════════════════════ */

/**
 * Generate a complete Analytics PDF and trigger download.
 * @param {Object} opts
 * @param {Array}  opts.shipments      - raw shipment objects from backend
 * @param {Array}  opts.heatmapZones   - risk zones from AI service
 * @param {Array}  opts.alerts         - current alerts
 * @param {number} opts.highRiskCount
 */
export function exportAnalyticsPDF({ shipments = [], heatmapZones = [], alerts = [], highRiskCount = 0 }) {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    setFill(doc, C.bg);
    doc.rect(0, 0, W, 297, 'F');

    drawHeader(doc, 'Analytics Report', 'Comprehensive logistics performance & risk analysis');

    let y = 34;

    /* KPI strip */
    const avgRisk = shipments.length > 0
        ? (shipments.reduce((a, s) => a + (s.riskScore || 0), 0) / shipments.length).toFixed(1)
        : 0;
    const rerouted = shipments.filter(s => s.isRerouted).length;
    const delivered = shipments.filter(s => s.status === 'DELIVERED').length;

    y = drawKpiRow(doc, [
        { label: 'Total Dispatches',     value: shipments.length, color: C.blue },
        { label: 'Avg. Risk Score',       value: `${avgRisk}%`,    color: avgRisk > 50 ? C.red : C.green },
        { label: 'AI Reroutes Issued',    value: rerouted,         color: C.orange },
        { label: 'High Risk Zones',       value: highRiskCount,    color: C.red },
        { label: 'Delivered',             value: delivered,        color: C.green },
        { label: 'Active Alerts',         value: alerts.length,    color: C.orange },
    ], y);

    /* Status breakdown */
    y = drawSection(doc, 'Shipment Status Breakdown', y);
    const statuses = ['IN_TRANSIT', 'DELAYED', 'REROUTED', 'DELIVERED', 'ON_HOLD'];
    const statusColors = { IN_TRANSIT: C.green, DELAYED: C.red, REROUTED: C.orange, DELIVERED: C.blue, ON_HOLD: [156, 163, 175] };
    const cols = [
        { label: 'Status',  x: 8,   w: 60 },
        { label: 'Count',   x: 68,  w: 30, align: 'right' },
        { label: 'Share %', x: 98,  w: 30, align: 'right' },
        { label: 'Bar',     x: 128, w: 74 },
    ];
    y = drawTableHeader(doc, cols, y);
    const maxCnt = Math.max(...statuses.map(s => shipments.filter(sh => sh.status === s).length), 1);
    statuses.forEach((s, i) => {
        const cnt = shipments.filter(sh => sh.status === s).length;
        const pct = shipments.length > 0 ? ((cnt / shipments.length) * 100).toFixed(1) : '0.0';
        const barW = (cnt / maxCnt) * 70;
        // mini bar inside cell
        y = drawTableRow(doc, [
            { text: s.replace('_', ' '), x: 8,  w: 60, color: statusColors[s] },
            { text: cnt,                  x: 68, w: 30, align: 'right' },
            { text: `${pct}%`,           x: 98, w: 30, align: 'right' },
        ], y, i % 2 === 0);
        // draw bar over that row
        setFill(doc, statusColors[s]);
        doc.rect(130, y - 5.5, Math.max(1, barW), 4, 'F');
    });
    y += 4;

    /* Risk distribution */
    y = drawSection(doc, 'Risk Score Distribution', y);
    const riskBands = [
        { label: 'Low Risk (0–30)',    count: shipments.filter(s=>(s.riskScore||0)<=30).length,                                    color: C.green  },
        { label: 'Medium (31–60)',     count: shipments.filter(s=>(s.riskScore||0)>30&&(s.riskScore||0)<=60).length,               color: C.orange },
        { label: 'High Risk (61–100)', count: shipments.filter(s=>(s.riskScore||0)>60).length,                                     color: C.red    },
    ];
    riskBands.forEach(rb => {
        const max = shipments.length || 1;
        y = drawBar(doc, rb.label, Math.round((rb.count / max) * 100), 100, rb.color, y);
    });
    y += 4;

    /* Active heatmap zones table */
    if (heatmapZones.length > 0) {
        y = drawSection(doc, `Active Risk Zones (${heatmapZones.length})`, y);
        const zoneCols = [
            { label: 'Zone ID',   x: 8,   w: 24 },
            { label: 'Type',      x: 32,  w: 36 },
            { label: 'Lat',       x: 68,  w: 28, align: 'right' },
            { label: 'Lng',       x: 96,  w: 28, align: 'right' },
            { label: 'Radius km', x: 124, w: 28, align: 'right' },
            { label: 'Intensity', x: 152, w: 28, align: 'right' },
            { label: 'Level',     x: 180, w: 22 },
        ];
        y = drawTableHeader(doc, zoneCols, y);
        heatmapZones.forEach((zone, i) => {
            if (y > 270) { doc.addPage(); setFill(doc, C.bg); doc.rect(0,0,W,297,'F'); y = 10; }
            const level = zone.intensity > 70 ? 'CRITICAL' : zone.intensity > 40 ? 'HIGH' : 'MEDIUM';
            const lColor = zone.intensity > 70 ? C.red : zone.intensity > 40 ? C.orange : [234,179,8];
            const tColor = zone.type === 'WEATHER' ? C.blue : zone.type === 'TRAFFIC' ? [234,179,8] : C.red;
            y = drawTableRow(doc, [
                { text: zone.id,                    x: 8,   w: 24 },
                { text: zone.type,                  x: 32,  w: 36, color: tColor },
                { text: zone.lat?.toFixed(2),        x: 68,  w: 28, align: 'right' },
                { text: zone.lng?.toFixed(2),        x: 96,  w: 28, align: 'right' },
                { text: zone.radius_km,              x: 124, w: 28, align: 'right' },
                { text: `${zone.intensity?.toFixed(0)}%`, x: 152, w: 28, align: 'right' },
                { text: level,                       x: 180, w: 22, color: lColor },
            ], y, i % 2 === 0);
        });
        y += 4;
    }

    /* Shipment list */
    if (shipments.length > 0) {
        if (y > 240) { doc.addPage(); setFill(doc, C.bg); doc.rect(0,0,W,297,'F'); y = 10; }
        y = drawSection(doc, `All Shipments (${shipments.length})`, y);
        const shipCols = [
            { label: 'ID',          x: 8,   w: 16 },
            { label: 'Name',        x: 24,  w: 36 },
            { label: 'Origin',      x: 60,  w: 34 },
            { label: 'Destination', x: 94,  w: 34 },
            { label: 'Status',      x: 128, w: 28 },
            { label: 'Risk',        x: 156, w: 18, align: 'right' },
            { label: 'Rerouted',    x: 174, w: 20 },
        ];
        y = drawTableHeader(doc, shipCols, y);
        shipments.forEach((s, i) => {
            if (y > 275) { doc.addPage(); setFill(doc, C.bg); doc.rect(0,0,W,297,'F'); y = 10; y = drawTableHeader(doc, shipCols, y); }
            const sColor = s.status === 'DELIVERED' ? C.blue : s.status === 'DELAYED' ? C.red : s.status === 'IN_TRANSIT' ? C.green : C.orange;
            y = drawTableRow(doc, [
                { text: `#${s.id}`,          x: 8,   w: 16 },
                { text: s.name || '—',        x: 24,  w: 36 },
                { text: s.origin || '—',      x: 60,  w: 34 },
                { text: s.destination || '—', x: 94,  w: 34 },
                { text: s.status,             x: 128, w: 28, color: sColor },
                { text: `${s.riskScore ?? 0}%`, x: 156, w: 18, align: 'right', color: (s.riskScore||0)>60?C.red:(s.riskScore||0)>30?C.orange:C.green },
                { text: s.isRerouted ? '✓' : '—', x: 174, w: 20, color: s.isRerouted ? C.orange : C.muted },
            ], y, i % 2 === 0);
        });
    }

    drawFooter(doc);
    doc.save(`supply_chain_analytics_${new Date().toISOString().slice(0,10)}.pdf`);
}


/**
 * Generate a single-shipment details PDF and trigger download.
 * @param {Object} shipment  - the mapped display object from ShipmentManagement
 */
export function exportShipmentPDF(shipment) {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    setFill(doc, C.bg);
    doc.rect(0, 0, W, 297, 'F');

    drawHeader(doc, 'Shipment Report', `Tracking ID: ${shipment.id}  |  ${shipment.origin || 'Unknown'} → ${shipment.destination || 'Unknown'}`);

    let y = 34;

    /* KPI strip */
    const riskColor = (shipment.risk || 0) > 60 ? C.red : (shipment.risk || 0) > 30 ? C.orange : C.green;
    y = drawKpiRow(doc, [
        { label: 'Tracking ID',  value: shipment.id,            color: C.blue },
        { label: 'Status',       value: shipment.status,        color: shipment.status === 'DELIVERED' ? C.blue : shipment.status === 'DELAYED' ? C.red : C.green },
        { label: 'Risk Score',   value: `${shipment.risk ?? 0}%`, color: riskColor },
        { label: 'AI Rerouted',  value: shipment.isRerouted ? 'YES' : 'NO', color: shipment.isRerouted ? C.orange : C.muted },
    ], y);

    /* Details section */
    y = drawSection(doc, 'Shipment Details', y);
    const fields = [
        { label: 'Tracking ID',    value: shipment.id },
        { label: 'Cargo Name',     value: shipment.name || 'N/A' },
        { label: 'Origin',         value: shipment.origin || 'N/A' },
        { label: 'Destination',    value: shipment.destination || 'N/A' },
        { label: 'Current Status', value: shipment.status },
        { label: 'Current Location', value: shipment.location || 'N/A' },
        { label: 'ETA',            value: shipment.eta || 'N/A' },
        { label: 'Risk Score',     value: `${shipment.risk ?? 0}%` },
        { label: 'AI Rerouted',    value: shipment.isRerouted ? 'Yes — alternate path active' : 'No' },
        { label: 'GPS Latitude',   value: shipment.currentLat != null ? `${shipment.currentLat}°` : 'Unavailable' },
        { label: 'GPS Longitude',  value: shipment.currentLng != null ? `${shipment.currentLng}°` : 'Unavailable' },
    ];
    fields.forEach((f, i) => {
        if (i % 2 === 0) { setFill(doc, [24, 27, 38]); doc.rect(8, y, W - 16, 8, 'F'); }
        setTxt(doc, C.muted);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.text(f.label, 12, y + 5.5);
        setTxt(doc, C.text);
        doc.setFont('helvetica', 'bold');
        doc.text(String(f.value), 75, y + 5.5);
        y += 8;
    });
    y += 6;

    /* Risk bar */
    y = drawSection(doc, 'Risk Assessment', y);
    y = drawBar(doc, 'Overall Risk Score', shipment.risk ?? 0, 100, riskColor, y);
    y += 6;

    /* Risk interpretation */
    setFill(doc, C.panel);
    setDraw(doc, riskColor);
    doc.setLineWidth(0.4);
    doc.rect(8, y, W - 16, 22, 'FD');
    setTxt(doc, riskColor);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const riskLabel = (shipment.risk || 0) > 60 ? 'HIGH RISK' : (shipment.risk || 0) > 30 ? 'MEDIUM RISK' : 'LOW RISK';
    doc.text(`Risk Level: ${riskLabel}`, 14, y + 8);
    setTxt(doc, C.muted);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    const advice = (shipment.risk || 0) > 60
        ? 'Immediate attention required. Consider AI rerouting or delay protocol.'
        : (shipment.risk || 0) > 30
            ? 'Moderate risk detected. Monitor closely and prepare contingency measures.'
            : 'Shipment on optimal path. No immediate action required.';
    doc.text(advice, 14, y + 16);
    y += 28;

    /* Timestamp & signature block */
    y = drawSection(doc, 'Report Metadata', y);
    const meta = [
        { label: 'Generated At',  value: new Date().toLocaleString() },
        { label: 'Generated By',  value: 'Supply Chain AI — Admin Dashboard' },
        { label: 'Report Type',   value: 'Individual Shipment Report' },
        { label: 'Confidentiality', value: 'Internal Use Only' },
    ];
    meta.forEach((m, i) => {
        if (i % 2 === 0) { setFill(doc, [24, 27, 38]); doc.rect(8, y, W - 16, 8, 'F'); }
        setTxt(doc, C.muted);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.text(m.label, 12, y + 5.5);
        setTxt(doc, C.text);
        doc.setFont('helvetica', 'bold');
        doc.text(m.value, 75, y + 5.5);
        y += 8;
    });

    drawFooter(doc);
    doc.save(`shipment_report_${shipment.id}_${new Date().toISOString().slice(0,10)}.pdf`);
}
