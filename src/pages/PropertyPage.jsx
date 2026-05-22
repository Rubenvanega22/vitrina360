import { useEffect, useState } from 'react'
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

const formatArea = (value) => {
  if (value == null) return '—'
  return `${new Intl.NumberFormat('es-CO').format(value)} m²`
}

function PropertyPage() {
  const { id } = useParams()
  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    async function load() {
      const { data: p, error: pErr } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (cancelled) return
      if (pErr) {
        setError(pErr.message)
        setLoading(false)
        return
      }
      if (!p) {
        setError('not_found')
        setLoading(false)
        return
      }
      setProperty(p)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [id])

  if (loading) {
    return (
      <>
        <TopBar />
        <main style={styles.main}>
          <p style={styles.muted}>Cargando propiedad…</p>
        </main>
      </>
    )
  }

  if (error === 'not_found' || !property) {
    return (
      <>
        <TopBar />
        <main style={styles.main}>
          <h1 style={styles.title}>Propiedad no encontrada</h1>
          <p style={styles.muted}>La propiedad que buscas ya no está disponible o el enlace es inválido.</p>
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
          <p style={styles.error}>No pudimos cargar la propiedad: {error}</p>
        </main>
      </>
    )
  }

  const whatsappNumber = (import.meta.env.VITE_WHATSAPP_NUMBER || '573000000000').replace(/\D/g, '')
  const whatsappText = encodeURIComponent(
    `¡Hola! Estoy interesado en ${property.name || 'la propiedad'} en ${property.location || ''} que vi en Vitrina 360 por ${formatCOP(property.price)}. ¿Aún está disponible?`
  )
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappText}`

  const mapSrc = property.location
    ? `https://maps.google.com/maps?q=${encodeURIComponent(property.location)}&t=&z=14&ie=UTF8&iwloc=&output=embed`
    : null

  return (
    <>
      <TopBar />

      <main style={styles.main}>
        {/* HEADER */}
        <header style={styles.header}>
          <div>
            <p style={styles.eyebrow}>
              {property.tag ? property.tag : property.type || 'Inmueble Vitrina 360'}
            </p>
            <h1 style={styles.title}>{property.name || 'Propiedad'}</h1>
            <p style={styles.subtitle}>
              {property.location && <span>{property.location}</span>}
              {property.location && property.area != null && <span style={styles.dot}>·</span>}
              {property.area != null && <span>{formatArea(property.area)}</span>}
              {property.type && <><span style={styles.dot}>·</span><span>{property.type}</span></>}
            </p>
          </div>
          <div style={styles.priceBox}>
            <span style={styles.priceLabel}>Precio</span>
            <span style={styles.price}>{formatCOP(property.price)}</span>
          </div>
        </header>

        {/* PHOTO + ASIDE */}
        <section style={styles.layout} className="v360-vehicle-layout">
          <div>
            <div style={styles.heroPhoto}>
              {property.img
                ? <img src={property.img} alt={property.name || 'Propiedad'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={styles.placeholder}>Sin imagen disponible</div>}
            </div>
          </div>

          <aside style={styles.aside}>
            <div style={styles.asideBlock}>
              <p style={styles.asideLabel}>Contacta al asesor</p>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" style={styles.whatsappBtn}>
                <span style={styles.whatsappIcon} aria-hidden="true">✓</span>
                Escribir por WhatsApp
              </a>
              <p style={styles.asideHint}>Agenda una visita o solicita información de financiación.</p>
            </div>

            <dl style={styles.specs}>
              <SpecRow label="Tipo"      value={property.type} />
              <SpecRow label="Ubicación" value={property.location} />
              <SpecRow label="Área"      value={property.area != null ? formatArea(property.area) : null} />
              {property.tag && <SpecRow label="Categoría" value={property.tag} />}
            </dl>
          </aside>
        </section>

        {/* TOUR VIRTUAL */}
        {property.tour_url && (
          <section style={styles.section}>
            <header style={styles.sectionHeader}>
              <p style={styles.eyebrow}>Tour virtual</p>
              <h2 style={styles.sectionTitle}>Recorre la propiedad en 360°</h2>
            </header>
            <div style={styles.embedFrame}>
              <iframe
                src={property.tour_url}
                title="Tour virtual de la propiedad"
                allow="accelerometer; gyroscope; fullscreen; vr; xr-spatial-tracking"
                allowFullScreen
                loading="lazy"
                style={{ width: '100%', height: '100%', border: 0 }}
              />
            </div>
          </section>
        )}

        {/* MAPA */}
        {mapSrc && (
          <section style={styles.section}>
            <header style={styles.sectionHeader}>
              <p style={styles.eyebrow}>Ubicación</p>
              <h2 style={styles.sectionTitle}>{property.location}</h2>
            </header>
            <div style={styles.embedFrame}>
              <iframe
                src={mapSrc}
                title={`Mapa de ${property.location}`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                style={{ width: '100%', height: '100%', border: 0 }}
              />
            </div>
          </section>
        )}
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
  },
  whatsappIcon: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 22, height: 22, borderRadius: '50%',
    background: 'rgba(255,255,255,0.22)',
    fontSize: 12, fontWeight: 800,
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

  embedFrame: {
    width: '100%',
    aspectRatio: '16 / 9',
    background: '#0e0e10',
    borderRadius: 16,
    overflow: 'hidden',
    border: `1px solid ${C.border}`,
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

export default PropertyPage
