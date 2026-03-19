// ============================================================
//  Netlify Function: /api/chat
//  Forwards conversation to OpenAI and returns AI reply.
//  To change bot behaviour, edit /chatbot-config.js
// ============================================================

const OpenAI  = require('openai');
const config  = require('./chatbot-config');

exports.handler = async (event) => {
  // Allow preflight CORS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders() };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(), body: 'Method Not Allowed' };
  }

  try {
    const { messages, contactName } = JSON.parse(event.body || '{}');
    if (!Array.isArray(messages)) {
      return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'messages array required' }) };
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      body: JSON.stringify({ reply }),
    };

  } catch (err) {
    console.error('Chat function error:', err.message);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      body: JSON.stringify({ error: "I'm having trouble right now. Please call 08033254690." }),
    };
  }
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}
