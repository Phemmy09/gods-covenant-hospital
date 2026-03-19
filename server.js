// ============================================================
//  GOD'S COVENANT HOSPITAL — Backend Server
//  - Serves the website on http://localhost:3000
//  - AI chatbot via OpenAI
//  - Logs every contact to GCH-Contacts.xlsx
//
//  HOW TO RUN:
//    1. npm install          (first time only)
//    2. npm start            (or double-click start-server.bat)
//
//  HOW TO EDIT BOT BEHAVIOUR:
//    Edit chatbot-config.js — no need to touch this file.
// ============================================================

require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const fs       = require('fs');
const OpenAI   = require('openai');
const ExcelJS  = require('exceljs');
const config   = require('./chatbot-config');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // serve index.html, style.css etc.

// ── OpenAI client ─────────────────────────────────────────
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Excel file path ───────────────────────────────────────
const EXCEL_PATH = path.join(__dirname, config.excel.filename);

// ── Create Excel with styled header if it doesn't exist ──
async function initExcel() {
  if (fs.existsSync(EXCEL_PATH)) return;
  const wb = new ExcelJS.Workbook();
  wb.creator = "God's Covenant Hospital";
  const ws = wb.addWorksheet(config.excel.sheetName);

  ws.columns = [
    { header: 'Date',         key: 'date',    width: 18 },
    { header: 'Time',         key: 'time',    width: 12 },
    { header: 'Name',         key: 'name',    width: 28 },
    { header: 'Email',        key: 'email',   width: 32 },
    { header: 'Phone',        key: 'phone',   width: 18 },
    { header: 'Address',      key: 'address', width: 35 },
    { header: 'Inquiry Type', key: 'inquiry', width: 28 },
    { header: 'Source',       key: 'source',  width: 18 },
  ];

  // Style header row — navy background, white bold text
  const headerRow = ws.getRow(1);
  headerRow.font  = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  headerRow.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E2D40' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 22;

  await wb.xlsx.writeFile(EXCEL_PATH);
  console.log(`✅ Created ${config.excel.filename}`);
}

// ── Append one contact row to the Excel file ─────────────
async function appendContact(contact) {
  const wb = new ExcelJS.Workbook();
  if (fs.existsSync(EXCEL_PATH)) {
    await wb.xlsx.readFile(EXCEL_PATH);
  }
  let ws = wb.getWorksheet(config.excel.sheetName);
  if (!ws) {
    ws = wb.addWorksheet(config.excel.sheetName);
    ws.columns = [
      { header: 'Date', key: 'date', width: 18 },
      { header: 'Time', key: 'time', width: 12 },
      { header: 'Name', key: 'name', width: 28 },
      { header: 'Email', key: 'email', width: 32 },
      { header: 'Phone', key: 'phone', width: 18 },
      { header: 'Address', key: 'address', width: 35 },
      { header: 'Inquiry Type', key: 'inquiry', width: 28 },
      { header: 'Source', key: 'source', width: 18 },
    ];
  }

  const now = new Date();
  const row = ws.addRow({
    date:    now.toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' }),
    time:    now.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' }),
    name:    contact.name    || '',
    email:   contact.email   || '',
    phone:   contact.phone   || '',
    address: contact.address || '',
    inquiry: contact.inquiry || '',
    source:  contact.source  || 'chatbot',
  });

  // Zebra stripe: light orange for every alternate data row
  const dataRowNum = ws.rowCount;
  if (dataRowNum % 2 === 0) {
    row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF4EE' } };
  }

  await wb.xlsx.writeFile(EXCEL_PATH);
}

// ──────────────────────────────────────────────────────────
//  API ROUTES
// ──────────────────────────────────────────────────────────

// POST /api/save-contact  — save contact to Excel + console log
app.post('/api/save-contact', async (req, res) => {
  try {
    const { name, phone, email, source } = req.body;
    await appendContact(req.body);
    console.log(`📋 New contact: ${name || 'unknown'} | ${phone || ''} | ${email || ''} | source: ${source || 'chatbot'}`);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Save contact error:', err.message);
    res.status(500).json({ error: 'Failed to save contact' });
  }
});

// POST /api/chat  — forward messages to OpenAI and return reply
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, contactName } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array required' });
    }

    // Build system message, optionally personalised with the contact's name
    const systemContent = config.systemPrompt +
      (contactName ? `\n\nYou are currently speaking with ${contactName}. Use their first name occasionally.` : '');

    const completion = await openai.chat.completions.create({
      model:       config.openai.model,
      max_tokens:  config.openai.max_tokens,
      temperature: config.openai.temperature,
      messages: [
        { role: 'system', content: systemContent },
        ...messages,
      ],
    });

    const reply = completion.choices[0].message.content;
    console.log(`💬 AI reply to ${contactName || 'visitor'}: ${reply.substring(0, 60)}…`);
    res.json({ reply });

  } catch (err) {
    console.error('❌ Chat error:', err.message);
    res.status(500).json({
      error: "I'm having trouble connecting right now. Please call 08033254690 for immediate assistance."
    });
  }
});

// GET /api/contacts/download  — download the Excel file
app.get('/api/contacts/download', (req, res) => {
  if (fs.existsSync(EXCEL_PATH)) {
    const filename = `GCH-Contacts-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.download(EXCEL_PATH, filename);
  } else {
    res.status(404).json({ error: 'No contacts file yet. Wait for the first submission.' });
  }
});

// ── Start ─────────────────────────────────────────────────
const PORT = process.env.PORT || config.server.port;
app.listen(PORT, async () => {
  await initExcel();
  console.log('\n╔════════════════════════════════════════╗');
  console.log("║  God's Covenant Hospital — Server Ready ║");
  console.log('╚════════════════════════════════════════╝');
  console.log(`🌐  Website  ➜  http://localhost:${PORT}`);
  console.log(`💬  Chat API ➜  http://localhost:${PORT}/api/chat`);
  console.log(`📊  Contacts ➜  ${config.excel.filename}`);
  console.log(`🔑  Model    ➜  ${config.openai.model}\n`);
});
