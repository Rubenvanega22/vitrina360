// Edge Function: chat — proxy entre el frontend y Anthropic.
// La clave ANTHROPIC_API_KEY vive solo en el servidor (Supabase Secrets).

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const MODEL = 'claude-haiku-4-5-20251001'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Solo se acepta POST.' }, 405)
  }
  if (!ANTHROPIC_API_KEY) {
    return jsonResponse({ error: 'ANTHROPIC_API_KEY no configurada en el servidor.' }, 500)
  }

  let body: { messages?: unknown; system?: unknown }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'JSON inválido.' }, 400)
  }

  const { messages, system } = body
  if (!Array.isArray(messages) || messages.length === 0) {
    return jsonResponse({ error: 'messages debe ser un array no vacío.' }, 400)
  }
  if (typeof system !== 'string') {
    return jsonResponse({ error: 'system debe ser un string.' }, 400)
  }

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 600,
        system,
        messages,
      }),
    })

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text()
      return jsonResponse(
        { error: `Anthropic ${anthropicRes.status}: ${errText.slice(0, 300)}` },
        502,
      )
    }

    const data = await anthropicRes.json()
    const text = data?.content?.[0]?.text ?? ''
    return jsonResponse({ text })
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500)
  }
})
