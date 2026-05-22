import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabase'

const MAX_HISTORY = 20

const WA_GREEN  = '#25d366'
const WA_HEADER = '#128c7e'
const WA_BG     = '#ece5dd'
const WA_USER   = '#dcf8c6'

const INITIAL_MESSAGE =
  '¡Hola! Soy Luisa, tu asesora en Vitrina 360 ✨ Te ayudo a encontrar el vehículo o el inmueble perfecto. ¿Qué buscas hoy?'

const formatCOP = (v) => {
  if (v == null) return 's/precio'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0,
  }).format(v)
}

function buildSystemPrompt({ vehicles, properties }) {
  const v = vehicles ?? []
  const p = properties ?? []

  const vList = v.length
    ? v.map((x) => {
        const parts = [
          `${x.brand ?? ''} ${x.model ?? ''}`.trim(),
          x.year ? `(${x.year})` : null,
          formatCOP(x.price),
          x.km != null ? `${x.km.toLocaleString('es-CO')} km` : null,
          x.color || null,
          x.ciudad || null,
          x.tipo || null,
        ].filter(Boolean)
        return `- ${parts.join(' · ')}`
      }).join('\n')
    : '(sin vehículos publicados)'

  const pList = p.length
    ? p.map((x) => {
        const parts = [
          x.name ?? 'Inmueble',
          x.location || null,
          formatCOP(x.price),
          x.area != null ? `${x.area} m²` : null,
          x.type || null,
        ].filter(Boolean)
        return `- ${parts.join(' · ')}`
      }).join('\n')
    : '(sin propiedades publicadas)'

  return `Eres Luisa, asesora comercial de Vitrina 360, un marketplace colombiano de vehículos e inmuebles.

PERSONALIDAD:
- Colombiana, cálida y cercana sin perder profesionalismo.
- Respuestas cortas: máximo 3 frases por mensaje. Evita textos largos.
- Usas "usted" en el saludo y cuando es formal; cambias a "tú" si el cliente se relaja.
- Si no sabes algo, lo dices con sinceridad.

INVENTARIO ACTUAL:
Vehículos disponibles (${v.length}):
${vList}

Propiedades disponibles (${p.length}):
${pList}

REGLAS ESTRICTAS:
- Solo recomendas inventario listado arriba. NUNCA inventes vehículos o propiedades que no estén en la lista.
- Si el cliente muestra interés real en ver un vehículo o propiedad (quiere visitar, agendar, conocer financiación, separar, ver más fotos), dile textualmente: "Puedes contactar al asesor por WhatsApp al +57 314 536 0734, o haz clic en el botón verde de WhatsApp que está en la parte superior de este chat".
- Precios siempre en pesos colombianos.
- Si preguntan por algo que no está en inventario, ofrece la opción más parecida del catálogo o admite que aún no la tenemos.`
}

async function callLuisa(messages, inventory) {
  const systemPrompt = buildSystemPrompt(inventory)
  const recent = messages.slice(-MAX_HISTORY).map((m) => ({
    role: m.role,
    content: m.content,
  }))

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) {
    throw new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env')
  }

  const functionUrl = `${supabaseUrl}/functions/v1/chat`

  let response
  try {
    response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${anonKey}`,
        'apikey': anonKey,
      },
      body: JSON.stringify({ messages: recent, system: systemPrompt }),
    })
  } catch (fetchErr) {
    throw new Error(`No se pudo alcanzar la función (CORS/red): ${fetchErr.message}`)
  }

  const rawText = await response.text()
  let payload = null
  try { payload = JSON.parse(rawText) } catch { /* not JSON */ }

  if (!response.ok) {
    const reason = payload?.error || rawText.slice(0, 200) || response.statusText
    throw new Error(`Función chat respondió ${response.status}: ${reason}`)
  }
  if (!payload?.text) {
    throw new Error('La función respondió sin campo `text`.')
  }
  return payload.text
}

function Chatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([{ role: 'assistant', content: INITIAL_MESSAGE }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [inventory, setInventory] = useState({ vehicles: [], properties: [] })
  const [inventoryLoaded, setInventoryLoaded] = useState(false)

  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [vRes, pRes] = await Promise.all([
        supabase.from('vehicles')
          .select('brand, model, year, price, km, color, tipo, ciudad')
          .eq('published', true)
          .eq('sold', false),
        supabase.from('properties')
          .select('name, location, price, area, type')
          .eq('published', true)
          .eq('sold', false),
      ])
      if (cancelled) return
      setInventory({
        vehicles: vRes.data ?? [],
        properties: pRes.data ?? [],
      })
      setInventoryLoaded(true)
    }
    load()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, loading])

  useEffect(() => {
    if (isOpen) inputRef.current?.focus()
  }, [isOpen])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return

    const next = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const reply = await callLuisa(next, inventory)
      setMessages((curr) => [...curr, { role: 'assistant', content: reply }])
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const whatsappNumber = (import.meta.env.VITE_WHATSAPP_NUMBER || '573000000000').replace(/\D/g, '')
  const waText = encodeURIComponent('¡Hola! Estuve conversando con Luisa en Vitrina 360 y quisiera más información.')
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${waText}`

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Abrir chat con Luisa"
          style={styles.bubble}
          className="v360-chatbot-bubble"
        >
          <ChatIcon />
        </button>
      )}

      {isOpen && (
        <div role="dialog" aria-label="Chat con Luisa" style={styles.window} className="v360-chatbot-window">
          <header style={styles.header}>
            <div style={styles.avatar}>L</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={styles.name}>Luisa</p>
              <p style={styles.role}>Asesora · Vitrina 360</p>
            </div>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.waPill}
              title="Hablar con un asesor por WhatsApp"
            >
              WhatsApp
            </a>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Cerrar chat"
              style={styles.closeBtn}
            >
              ✕
            </button>
          </header>

          <div ref={scrollRef} style={styles.messages}>
            {messages.map((m, i) => (
              <div key={i} style={{ ...styles.row, justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  ...styles.msg,
                  ...(m.role === 'user' ? styles.msgMine : styles.msgTheirs),
                }}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ ...styles.row, justifyContent: 'flex-start' }}>
                <div style={{ ...styles.msg, ...styles.msgTheirs, fontStyle: 'italic', opacity: 0.65 }}>
                  Luisa está escribiendo…
                </div>
              </div>
            )}
            {error && (
              <div style={styles.errorBox}>
                Disculpa, tuve un problema técnico: {error}
              </div>
            )}
          </div>

          <div style={styles.inputBar}>
            <input
              ref={inputRef}
              style={styles.input}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={inventoryLoaded ? 'Escribe un mensaje…' : 'Cargando inventario…'}
              disabled={loading}
              maxLength={500}
            />
            <button
              type="button"
              onClick={send}
              disabled={!input.trim() || loading}
              aria-label="Enviar mensaje"
              style={{
                ...styles.sendBtn,
                ...(!input.trim() || loading ? styles.sendBtnOff : {}),
              }}
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function ChatIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  )
}

const styles = {
  bubble: {
    position: 'fixed',
    bottom: 24, right: 24,
    width: 60, height: 60,
    borderRadius: '50%',
    background: WA_GREEN,
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 8px 24px rgba(37, 211, 102, 0.45)',
    zIndex: 1000,
  },
  window: {
    position: 'fixed',
    bottom: 24, right: 24,
    width: 360,
    maxWidth: 'calc(100vw - 32px)',
    height: 560,
    maxHeight: 'calc(100vh - 48px)',
    background: '#fff',
    borderRadius: 14,
    boxShadow: '0 18px 48px rgba(10, 10, 14, 0.22)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    zIndex: 1000,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#0a0a0a',
  },
  header: {
    background: WA_HEADER,
    color: '#fff',
    padding: '12px 14px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 38, height: 38,
    borderRadius: '50%',
    background: '#fff',
    color: WA_HEADER,
    display: 'inline-flex',
    alignItems: 'center', justifyContent: 'center',
    fontWeight: 800,
    fontSize: 17,
    flex: '0 0 auto',
  },
  name: { margin: 0, fontSize: 15, fontWeight: 700, lineHeight: 1.2 },
  role: { margin: '2px 0 0', fontSize: 11.5, opacity: 0.85 },
  waPill: {
    background: WA_GREEN,
    color: '#fff',
    padding: '6px 12px',
    borderRadius: 999,
    textDecoration: 'none',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.2,
    flex: '0 0 auto',
  },
  closeBtn: {
    background: 'transparent',
    color: '#fff',
    border: 'none',
    fontSize: 18,
    cursor: 'pointer',
    padding: '4px 8px',
    flex: '0 0 auto',
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: 12,
    background: WA_BG,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  row: { display: 'flex', width: '100%' },
  msg: {
    maxWidth: '80%',
    padding: '8px 12px',
    borderRadius: 12,
    fontSize: 14,
    lineHeight: 1.45,
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
    boxShadow: '0 1px 1px rgba(0,0,0,0.06)',
  },
  msgMine:   { background: WA_USER, color: '#0a0a0a', borderTopRightRadius: 4 },
  msgTheirs: { background: '#fff',  color: '#0a0a0a', borderTopLeftRadius: 4 },
  errorBox: {
    background: '#fdecee',
    color: '#b00020',
    border: '1px solid #f6c8ce',
    padding: '8px 10px',
    borderRadius: 8,
    fontSize: 12.5,
    marginTop: 4,
  },
  inputBar: {
    display: 'flex',
    gap: 8,
    padding: 10,
    background: '#f0f0f0',
    borderTop: '1px solid #d0d0d0',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    padding: '10px 14px',
    border: '1px solid #d0d0d0',
    borderRadius: 22,
    fontSize: 14,
    outline: 'none',
    background: '#fff',
    fontFamily: 'inherit',
    color: '#0a0a0a',
  },
  sendBtn: {
    width: 40, height: 40,
    borderRadius: '50%',
    background: WA_GREEN,
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    fontSize: 14,
    display: 'inline-flex',
    alignItems: 'center', justifyContent: 'center',
    flex: '0 0 auto',
  },
  sendBtnOff: { background: '#b5dec5', cursor: 'not-allowed' },
}

export default Chatbot
