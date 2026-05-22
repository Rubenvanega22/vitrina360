import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../supabase'

const C = {
  bg: '#fafaf7',
  surface: '#ffffff',
  ink: '#0a0a0a',
  inkSoft: '#5b5b5b',
  inkMute: '#8a8a8a',
  border: '#e7e5e0',
  accent: '#0f1117',
  gold: '#b8860b',
  green: '#2e7d32',
  amber: '#d97706',
  red: '#b00020',
  whatsapp: '#25d366',
}

const formatCOP = (value) => {
  if (value == null) return '—'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value)
}

const formatNumber = (value, suffix = '') => {
  if (value == null) return '—'
  return `${new Intl.NumberFormat('es-CO').format(value)}${suffix}`
}

const PHOTO_VIEWS = [
  { key: 'img_exterior', label: 'Exterior' },
  { key: 'img_interior', label: 'Interior' },
  { key: 'img_engine',   label: 'Motor' },
  { key: 'img_trunk',    label: 'Baúl' },
]

const PERITAJE_FIELDS = [
  { key: 'motor',      label: 'Motor' },
  { key: 'carroceria', label: 'Carrocería' },
  { key: 'frenos',     label: 'Frenos' },
  { key: 'pintura',    label: 'Pintura' },
]

function parseFrames(raw) {
  if (raw == null) return []
  if (Array.isArray(raw)) return raw.filter(Boolean)
  if (typeof raw === 'string') {
    const s = raw.trim()
    if (!s) return []
    // JSON array: ["url1","url2"]
    if (s.startsWith('[')) {
      try {
        const parsed = JSON.parse(s)
        if (Array.isArray(parsed)) return parsed.filter(Boolean)
      } catch {}
    }
    // Postgres array literal: {"url1","url2"} or {url1,url2}
    if (s.startsWith('{') && s.endsWith('}')) {
      return s
        .slice(1, -1)
        .split(',')
        .map((p) => p.trim().replace(/^"(.*)"$/, '$1'))
        .filter(Boolean)
    }
    // Single URL fallback
    return [s]
  }
  return []
}

function Viewer360({ frames }) {
  const [index, setIndex] = useState(0)
  const [dragging, setDragging] = useState(false)
  const dragStartRef = useRef(null)

  if (!frames || frames.length === 0) return null

  const onPointerDown = (e) => {
    dragStartRef.current = { startX: e.clientX, startIndex: index }
    setDragging(true)
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch {}
  }
  const onPointerMove = (e) => {
    if (!dragStartRef.current) return
    const delta = e.clientX - dragStartRef.current.startX
    const pxPerFrame = 12
    const offset = Math.round(delta / pxPerFrame)
    let next = (dragStartRef.current.startIndex + offset) % frames.length
    if (next < 0) next += frames.length
    setIndex(next)
  }
  const onPointerUp = (e) => {
    dragStartRef.current = null
    setDragging(false)
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch {}
  }

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{
        position: 'relative',
        aspectRatio: '16 / 10',
        background: '#0e0e10',
        borderRadius: 16,
        overflow: 'hidden',
        cursor: dragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        touchAction: 'none',
      }}
    >
      <img
        src={frames[index]}
        alt={`Vista 360° ${index + 1} de ${frames.length}`}
        draggable={false}
        style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
      />
      <div style={{
        position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(10, 10, 14, 0.7)', color: '#fff',
        padding: '6px 14px', borderRadius: 999,
        fontSize: 12, letterSpacing: 0.4, fontWeight: 500,
        backdropFilter: 'blur(8px)',
      }}>
        {index + 1} / {frames.length} · arrastra para girar
      </div>
    </div>
  )
}

function PeritajeBar({ label, value }) {
  const v = typeof value === 'number' ? Math.max(0, Math.min(100, value)) : null
  const color = v == null ? C.inkMute : v >= 80 ? C.green : v >= 50 ? C.gold : C.amber
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <span style={{ fontSize: 14, color: C.ink, fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 14, color, fontWeight: 700 }}>
          {v != null ? `${v}%` : 'N/D'}
        </span>
      </div>
      <div style={{ height: 8, background: '#ece9e2', borderRadius: 999, overflow: 'hidden' }}>
        {v != null && (
          <div style={{
            height: '100%',
            width: `${v}%`,
            background: color,
            borderRadius: 999,
            transition: 'width 0.7s cubic-bezier(0.2, 0.8, 0.2, 1)',
          }} />
        )}
      </div>
    </div>
  )
}

function VehiclePage() {
  const { id } = useParams()
  const [vehicle, setVehicle] = useState(null)
  const [peritaje, setPeritaje] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [activeView, setActiveView] = useState('img_exterior')
  const audioRef = useRef(null)
  const [audioPlaying, setAudioPlaying] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    async function load() {
      const { data: v, error: vErr } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (cancelled) return
      if (vErr) {
        setError(vErr.message)
        setLoading(false)
        return
      }
      if (!v) {
        setError('not_found')
        setLoading(false)
        return
      }

      console.log('[VehiclePage] vehículo cargado:', v)
      console.log('[VehiclePage] fotos_360 raw value:', v.fotos_360)
      console.log('[VehiclePage] fotos_360 typeof:', typeof v.fotos_360)
      console.log('[VehiclePage] fotos_360 isArray:', Array.isArray(v.fotos_360))
      if (Array.isArray(v.fotos_360)) {
        console.log('[VehiclePage] fotos_360 length:', v.fotos_360.length)
        console.log('[VehiclePage] fotos_360[0]:', v.fotos_360[0])
      }
      console.log('[VehiclePage] frames parsed:', parseFrames(v.fotos_360))

      setVehicle(v)

      const { data: p } = await supabase
        .from('peritaje')
        .select('*')
        .eq('vehicle_id', id)
        .maybeSingle()
      if (cancelled) return
      setPeritaje(p)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [id])

  const toggleAudio = () => {
    const el = audioRef.current
    if (!el) return
    if (audioPlaying) el.pause()
    else el.play().catch(() => setAudioPlaying(false))
  }

  if (loading) {
    return (
      <>
        <TopBar />
        <main style={styles.main}>
          <p style={styles.muted}>Cargando vehículo…</p>
        </main>
      </>
    )
  }

  if (error === 'not_found' || !vehicle) {
    return (
      <>
        <TopBar />
        <main style={styles.main}>
          <h1 style={styles.title}>Vehículo no encontrado</h1>
          <p style={styles.muted}>El vehículo que buscas ya no está disponible o el enlace es inválido.</p>
          <Link to="/" style={{ ...styles.btnSecondary, marginTop: 16, display: 'inline-block' }}>
            Volver al catálogo
          </Link>
        </main>
      </>
    )
  }

  if (error) {
    return (
      <>
        <TopBar />
        <main style={styles.main}>
          <p style={styles.error}>No pudimos cargar el vehículo: {error}</p>
        </main>
      </>
    )
  }

  const title = [vehicle.brand, vehicle.model].filter(Boolean).join(' ') || 'Vehículo'
  const activePhoto = vehicle[activeView] || vehicle.img_exterior
  const frames = parseFrames(vehicle.fotos_360)

  const whatsappNumber = (import.meta.env.VITE_WHATSAPP_NUMBER || '573000000000').replace(/\D/g, '')
  const whatsappText = encodeURIComponent(
    `¡Hola! Estoy interesado en el ${title} ${vehicle.year ?? ''} que vi en Vitrina 360 por ${formatCOP(vehicle.price)}. ¿Aún está disponible?`
  )
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappText}`

  return (
    <>
      <TopBar />

      <main style={styles.main}>
        {/* HEADER */}
        <header style={styles.header}>
          <div>
            <p style={styles.eyebrow}>
              {vehicle.tag ? vehicle.tag : 'Catálogo Vitrina 360'}
            </p>
            <h1 style={styles.title}>{title}</h1>
            <p style={styles.subtitle}>
              {vehicle.year != null && <span>{vehicle.year}</span>}
              {vehicle.year != null && vehicle.km != null && <span style={styles.dot}>·</span>}
              {vehicle.km != null && <span>{formatNumber(vehicle.km, ' km')}</span>}
              {vehicle.color && <><span style={styles.dot}>·</span><span>{vehicle.color}</span></>}
            </p>
          </div>
          <div style={styles.priceBox}>
            <span style={styles.priceLabel}>Precio</span>
            <span style={styles.price}>{formatCOP(vehicle.price)}</span>
          </div>
        </header>

        {/* GALLERY + ACTIONS */}
        <section style={styles.layout} className="v360-vehicle-layout">
          <div>
            {activeView === '360' && frames.length > 0 ? (
              <Viewer360 frames={frames} />
            ) : (
              <div style={styles.heroPhoto}>
                {activePhoto
                  ? <img src={activePhoto} alt={`${title} — ${activeView}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={styles.placeholder}>Sin imagen disponible</div>}
              </div>
            )}
            <div style={{
              ...styles.tabs,
              gridTemplateColumns: `repeat(${frames.length > 0 ? 5 : 4}, 1fr)`,
            }}>
              {PHOTO_VIEWS.map((view) => {
                const hasPhoto = !!vehicle[view.key]
                const isActive = activeView === view.key
                return (
                  <button
                    key={view.key}
                    type="button"
                    onClick={() => hasPhoto && setActiveView(view.key)}
                    disabled={!hasPhoto}
                    style={{
                      ...styles.tab,
                      ...(isActive ? styles.tabActive : {}),
                      ...(!hasPhoto ? styles.tabDisabled : {}),
                    }}
                  >
                    {view.label}
                  </button>
                )
              })}
              {frames.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveView('360')}
                  style={{
                    ...styles.tab,
                    ...(activeView === '360' ? styles.tabActive : {}),
                  }}
                >
                  360°
                </button>
              )}
            </div>
          </div>

          <aside style={styles.aside}>
            <div style={styles.asideBlock}>
              <p style={styles.asideLabel}>Contacta al vendedor</p>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" style={styles.whatsappBtn}>
                <span style={styles.whatsappIcon} aria-hidden="true">✓</span>
                Escribir por WhatsApp
              </a>
              <p style={styles.asideHint}>Te responderemos con disponibilidad y opciones de financiación.</p>
            </div>

            {vehicle.audio_url && (
              <div style={styles.asideBlock}>
                <p style={styles.asideLabel}>Descripción en audio</p>
                <button type="button" onClick={toggleAudio} style={styles.audioBtn}>
                  <span style={styles.audioIcon} aria-hidden="true">{audioPlaying ? '❚❚' : '▶'}</span>
                  {audioPlaying ? 'Pausar audio' : 'Escuchar descripción'}
                </button>
                <audio
                  ref={audioRef}
                  src={vehicle.audio_url}
                  preload="metadata"
                  onPlay={() => setAudioPlaying(true)}
                  onPause={() => setAudioPlaying(false)}
                  onEnded={() => setAudioPlaying(false)}
                />
              </div>
            )}

            <dl style={styles.specs}>
              <SpecRow label="Marca"        value={vehicle.brand} />
              <SpecRow label="Modelo"       value={vehicle.model} />
              <SpecRow label="Año"          value={vehicle.year} />
              <SpecRow label="Kilometraje"  value={vehicle.km != null ? formatNumber(vehicle.km, ' km') : null} />
              <SpecRow label="Color"        value={vehicle.color} />
            </dl>
          </aside>
        </section>

        {/* DESCRIPCIÓN */}
        {vehicle.descripcion && (
          <section style={styles.section}>
            <header style={styles.sectionHeader}>
              <p style={styles.eyebrow}>Descripción</p>
              <h2 style={styles.sectionTitle}>Sobre este vehículo</h2>
            </header>
            <div style={styles.descriptionBlock}>
              <p style={styles.descriptionText}>{vehicle.descripcion}</p>
            </div>
          </section>
        )}

        {/* 360 VIEWER */}
        {frames.length > 0 && (
          <section style={styles.section}>
            <header style={styles.sectionHeader}>
              <p style={styles.eyebrow}>Vista 360°</p>
              <h2 style={styles.sectionTitle}>Gira el vehículo arrastrando</h2>
            </header>
            <Viewer360 frames={frames} />
          </section>
        )}

        {/* PERITAJE */}
        <section style={styles.section}>
          <header style={styles.sectionHeader}>
            <p style={styles.eyebrow}>Peritaje técnico</p>
            <h2 style={styles.sectionTitle}>Estado mecánico y estético</h2>
          </header>
          {peritaje ? (
            <div style={styles.peritajeCard}>
              {PERITAJE_FIELDS.map((f) => (
                <PeritajeBar key={f.key} label={f.label} value={peritaje[f.key]} />
              ))}
            </div>
          ) : (
            <p style={styles.muted}>Peritaje aún no disponible para este vehículo.</p>
          )}
        </section>
      </main>

      <footer style={styles.footer}>
        <p style={{ margin: 0, fontSize: 13, color: C.inkSoft }}>
          © {new Date().getFullYear()} · Vitrina <span style={{ color: C.gold }}>360</span> — Colombia
        </p>
      </footer>
    </>
  )
}

function TopBar() {
  return (
    <nav style={styles.topbar}>
      <div style={styles.topbarInner}>
        <Link to="/" style={styles.logo}>
          <span style={styles.logoMark}>V</span>
          <span style={styles.logoText}>Vitrina<strong style={{ color: C.gold }}> 360</strong></span>
        </Link>
        <Link to="/" style={styles.backLink} className="v360-link">← Volver al catálogo</Link>
      </div>
    </nav>
  )
}

function SpecRow({ label, value }) {
  return (
    <div style={styles.specRow}>
      <dt style={styles.specLabel}>{label}</dt>
      <dd style={styles.specValue}>{value ?? '—'}</dd>
    </div>
  )
}

const styles = {
  topbar: {
    position: 'sticky', top: 0, zIndex: 50,
    background: 'rgba(250, 250, 247, 0.88)',
    backdropFilter: 'saturate(180%) blur(12px)',
    WebkitBackdropFilter: 'saturate(180%) blur(12px)',
    borderBottom: `1px solid ${C.border}`,
  },
  topbarInner: {
    maxWidth: 1240, margin: '0 auto',
    padding: '14px 24px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16,
  },
  logo: { display: 'flex', alignItems: 'center', gap: 10, color: C.ink },
  logoMark: {
    width: 36, height: 36, borderRadius: 10,
    background: C.accent, color: '#fff',
    fontWeight: 800, fontSize: 18,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    letterSpacing: 0.5,
  },
  logoText: { fontSize: 17, letterSpacing: 0.3, fontWeight: 500 },
  backLink: { fontSize: 14, color: C.ink, fontWeight: 500 },

  main: { maxWidth: 1240, margin: '0 auto', padding: '40px 24px 64px' },

  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
    flexWrap: 'wrap', gap: 24,
    paddingBottom: 28, borderBottom: `1px solid ${C.border}`, marginBottom: 36,
  },
  eyebrow: {
    fontSize: 12, letterSpacing: 2.5, textTransform: 'uppercase',
    color: C.gold, margin: '0 0 10px', fontWeight: 700,
  },
  title: {
    fontSize: 'clamp(28px, 4.5vw, 46px)',
    margin: 0, color: C.ink,
    fontWeight: 700, letterSpacing: -1, lineHeight: 1.1,
  },
  subtitle: {
    fontSize: 15, color: C.inkSoft, margin: '12px 0 0',
    display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center',
  },
  dot: { color: '#cfcfcf' },
  priceBox: {
    display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4,
    minWidth: 200,
  },
  priceLabel: {
    fontSize: 11, letterSpacing: 2, textTransform: 'uppercase',
    color: C.inkMute, fontWeight: 600,
  },
  price: {
    fontSize: 'clamp(24px, 3.2vw, 34px)',
    fontWeight: 700, color: C.ink, letterSpacing: -0.6,
  },

  layout: {
    display: 'grid',
    gridTemplateColumns: '1.5fr 1fr',
    gap: 32,
    marginBottom: 48,
  },

  heroPhoto: {
    aspectRatio: '4 / 3',
    background: '#ece9e2',
    borderRadius: 16,
    overflow: 'hidden',
    border: `1px solid ${C.border}`,
  },
  placeholder: {
    width: '100%', height: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: C.inkMute, fontSize: 14,
  },
  tabs: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 8,
    marginTop: 12,
  },
  tab: {
    padding: '12px 14px',
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    fontSize: 13, fontWeight: 600,
    color: C.ink, letterSpacing: 0.2,
    transition: 'all 0.2s ease',
  },
  tabActive: {
    background: C.ink,
    color: '#fff',
    borderColor: C.ink,
  },
  tabDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },

  aside: { display: 'flex', flexDirection: 'column', gap: 20 },
  asideBlock: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 14,
    padding: 20,
  },
  asideLabel: {
    fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase',
    color: C.inkMute, margin: '0 0 12px', fontWeight: 700,
  },
  asideHint: {
    fontSize: 12, color: C.inkSoft,
    margin: '12px 0 0', lineHeight: 1.5,
  },

  whatsappBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    width: '100%', padding: '14px 16px',
    background: C.whatsapp, color: '#fff',
    border: 'none', borderRadius: 10,
    fontSize: 15, fontWeight: 700, letterSpacing: 0.2,
    textDecoration: 'none',
    boxShadow: '0 4px 14px rgba(37, 211, 102, 0.35)',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  },
  whatsappIcon: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 22, height: 22, borderRadius: '50%',
    background: 'rgba(255,255,255,0.22)',
    fontSize: 12, fontWeight: 800,
  },

  audioBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    width: '100%', padding: '12px 16px',
    background: C.accent, color: '#fff',
    border: 'none', borderRadius: 10,
    fontSize: 14, fontWeight: 600, letterSpacing: 0.2,
  },
  audioIcon: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 22, height: 22, borderRadius: '50%',
    background: 'rgba(255,255,255,0.18)',
    fontSize: 10,
  },

  specs: {
    margin: 0, padding: 20,
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 14,
    display: 'grid', gap: 10,
  },
  specRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12,
    paddingBottom: 8, borderBottom: `1px dashed ${C.border}`,
  },
  specLabel: { margin: 0, fontSize: 13, color: C.inkSoft, letterSpacing: 0.2 },
  specValue: { margin: 0, fontSize: 14, color: C.ink, fontWeight: 600, textAlign: 'right' },

  section: { padding: '48px 0', borderTop: `1px solid ${C.border}` },
  sectionHeader: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 'clamp(22px, 3vw, 30px)',
    margin: 0, color: C.ink,
    fontWeight: 700, letterSpacing: -0.5,
  },
  peritajeCard: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    padding: 28,
  },
  descriptionBlock: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    padding: 28,
    maxWidth: 900,
  },
  descriptionText: {
    margin: 0,
    fontSize: 15,
    lineHeight: 1.7,
    color: C.ink,
    whiteSpace: 'pre-wrap',
  },

  muted: { color: C.inkSoft, fontSize: 14, margin: 0 },
  error: {
    color: C.red, fontSize: 14, margin: 0,
    padding: '12px 14px',
    background: '#fdecee',
    border: '1px solid #f6c8ce',
    borderRadius: 8,
  },
  btnSecondary: {
    padding: '12px 18px', background: C.ink, color: '#fff',
    borderRadius: 10, fontWeight: 600, fontSize: 14,
  },

  footer: {
    borderTop: `1px solid ${C.border}`,
    background: '#f4f1ea',
    padding: '28px 24px',
    textAlign: 'center',
    marginTop: 40,
  },
}

export default VehiclePage
