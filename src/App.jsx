import { useEffect, useState } from 'react'
import { supabase } from './supabase'

const C = {
  bg: '#fafaf7',
  surface: '#ffffff',
  ink: '#0a0a0a',
  inkSoft: '#5b5b5b',
  inkMute: '#8a8a8a',
  border: '#e7e5e0',
  accent: '#0f1117',
  gold: '#b8860b',
  danger: '#b00020',
}

const formatCOP = (value) => {
  if (value == null) return '—'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value)
}

const formatNumber = (value, suffix) => {
  if (value == null) return '—'
  return `${new Intl.NumberFormat('es-CO').format(value)}${suffix}`
}

function Navbar() {
  return (
    <nav style={styles.nav}>
      <div style={styles.navInner} className="v360-nav-inner">
        <a href="#inicio" style={styles.logo}>
          <span style={styles.logoMark}>V</span>
          <span style={styles.logoText}>Vitrina<strong style={{ color: C.gold }}> 360</strong></span>
        </a>
        <ul style={styles.navLinks} className="v360-nav-links">
          <li><a href="#vehiculos" style={styles.navLink} className="v360-link">Vehículos</a></li>
          <li><a href="#propiedades" style={styles.navLink} className="v360-link">Propiedades</a></li>
          <li><a href="#contacto" style={styles.navLink} className="v360-link">Contacto</a></li>
        </ul>
      </div>
    </nav>
  )
}

function Hero() {
  return (
    <section id="inicio" style={styles.hero}>
      <div style={styles.heroInner} className="v360-hero-inner">
        <p style={styles.eyebrow}>Marketplace premium · Colombia</p>
        <h1 style={styles.heroTitle}>Vehículos e inmuebles, en una sola vitrina.</h1>
        <p style={styles.heroSubtitle}>
          Explora carros e inmuebles con recorridos 360°, fotografía profesional y atención directa con el propietario.
        </p>
      </div>
    </section>
  )
}

function VehicleCard({ v }) {
  const title = [v.brand, v.model].filter(Boolean).join(' ') || 'Vehículo'
  return (
    <article style={styles.card} className="v360-card">
      <div style={styles.cardMedia}>
        {v.img_exterior
          ? <img src={v.img_exterior} alt={title} loading="lazy" style={styles.cardImg} />
          : <div style={styles.cardImgPlaceholder}>Sin imagen</div>}
        {v.tag && <span style={styles.badge}>{v.tag}</span>}
      </div>
      <div style={styles.cardBody}>
        <h3 style={styles.cardTitle}>{title}</h3>
        <p style={styles.cardMeta}>
          {v.year != null && <span>{v.year}</span>}
          {v.year != null && v.km != null && <span style={styles.dot}>·</span>}
          {v.km != null && <span>{formatNumber(v.km, ' km')}</span>}
          {v.color && <><span style={styles.dot}>·</span><span>{v.color}</span></>}
        </p>
        <p style={styles.cardPrice}>{formatCOP(v.price)}</p>
      </div>
    </article>
  )
}

function PropertyCard({ p }) {
  return (
    <article style={styles.card} className="v360-card">
      <div style={styles.cardMedia}>
        {p.img
          ? <img src={p.img} alt={p.name || 'Propiedad'} loading="lazy" style={styles.cardImg} />
          : <div style={styles.cardImgPlaceholder}>Sin imagen</div>}
        {p.tag && <span style={styles.badge}>{p.tag}</span>}
      </div>
      <div style={styles.cardBody}>
        <h3 style={styles.cardTitle}>{p.name || 'Propiedad'}</h3>
        <p style={styles.cardMeta}>
          {p.type && <span style={styles.metaTag}>{p.type}</span>}
          {p.location && <span>{p.location}</span>}
          {p.location && p.area != null && <span style={styles.dot}>·</span>}
          {p.area != null && <span>{formatNumber(p.area, ' m²')}</span>}
        </p>
        <p style={styles.cardPrice}>{formatCOP(p.price)}</p>
      </div>
    </article>
  )
}

function Section({ id, eyebrow, title, error, loading, items, emptyText, renderCard }) {
  return (
    <section id={id} style={styles.section} className="v360-section">
      <header style={styles.sectionHeader}>
        <p style={styles.eyebrow}>{eyebrow}</p>
        <h2 style={styles.sectionTitle}>{title}</h2>
      </header>
      {error && <p style={styles.error}>No pudimos cargar los datos: {error}</p>}
      {loading && !error && <p style={styles.muted}>Cargando…</p>}
      {!loading && !error && items.length === 0 && <p style={styles.muted}>{emptyText}</p>}
      {!loading && !error && items.length > 0 && (
        <div style={styles.grid}>
          {items.map(renderCard)}
        </div>
      )}
    </section>
  )
}

function App() {
  const [vehicles, setVehicles] = useState([])
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState({ vehicles: true, properties: true })
  const [errors, setErrors] = useState({ vehicles: null, properties: null })

  useEffect(() => {
    supabase
      .from('vehicles')
      .select('*')
      .eq('published', true)
      .eq('sold', false)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setErrors(e => ({ ...e, vehicles: error.message }))
        else setVehicles(data ?? [])
        setLoading(s => ({ ...s, vehicles: false }))
      })

    supabase
      .from('properties')
      .select('*')
      .eq('published', true)
      .eq('sold', false)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setErrors(e => ({ ...e, properties: error.message }))
        else setProperties(data ?? [])
        setLoading(s => ({ ...s, properties: false }))
      })
  }, [])

  return (
    <>
      <Navbar />
      <Hero />
      <main style={styles.main} className="v360-main">
        <Section
          id="vehiculos"
          eyebrow="Catálogo"
          title="Vehículos disponibles"
          error={errors.vehicles}
          loading={loading.vehicles}
          items={vehicles}
          emptyText="Aún no hay vehículos publicados."
          renderCard={(v) => <VehicleCard key={v.id} v={v} />}
        />

        <Section
          id="propiedades"
          eyebrow="Inmuebles"
          title="Propiedades destacadas"
          error={errors.properties}
          loading={loading.properties}
          items={properties}
          emptyText="Aún no hay propiedades publicadas."
          renderCard={(p) => <PropertyCard key={p.id} p={p} />}
        />
      </main>

      <footer id="contacto" style={styles.footer}>
        <div style={styles.footerInner}>
          <p style={{ margin: 0, fontWeight: 600, color: C.ink }}>Vitrina <span style={{ color: C.gold }}>360</span></p>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: C.inkSoft }}>
            © {new Date().getFullYear()} · Marketplace de vehículos e inmuebles en Colombia
          </p>
        </div>
      </footer>
    </>
  )
}

const styles = {
  nav: {
    position: 'sticky',
    top: 0,
    zIndex: 50,
    background: 'rgba(250, 250, 247, 0.85)',
    backdropFilter: 'saturate(180%) blur(12px)',
    WebkitBackdropFilter: 'saturate(180%) blur(12px)',
    borderBottom: `1px solid ${C.border}`,
  },
  navInner: {
    maxWidth: 1240,
    margin: '0 auto',
    padding: '14px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 24,
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
  navLinks: { display: 'flex', gap: 28 },
  navLink: { fontSize: 14, fontWeight: 500, color: C.ink },

  hero: {
    background: 'linear-gradient(180deg, #f4f1ea 0%, #fafaf7 100%)',
    borderBottom: `1px solid ${C.border}`,
  },
  heroInner: {
    maxWidth: 1240,
    margin: '0 auto',
    padding: '96px 24px 72px',
  },
  eyebrow: {
    fontSize: 12, letterSpacing: 2.5, textTransform: 'uppercase',
    color: C.gold, margin: '0 0 14px', fontWeight: 700,
  },
  heroTitle: {
    fontSize: 'clamp(32px, 5.5vw, 60px)',
    lineHeight: 1.04,
    letterSpacing: -1.2,
    color: C.ink,
    margin: '0 0 18px',
    fontWeight: 700,
    maxWidth: 900,
  },
  heroSubtitle: {
    fontSize: 'clamp(15px, 1.8vw, 18px)',
    lineHeight: 1.6,
    color: C.inkSoft,
    margin: 0,
    maxWidth: 620,
  },

  main: { maxWidth: 1240, margin: '0 auto', padding: '0 24px' },
  section: { padding: '64px 0' },
  sectionHeader: { marginBottom: 32 },
  sectionTitle: {
    fontSize: 'clamp(26px, 3.5vw, 38px)',
    margin: 0,
    color: C.ink,
    fontWeight: 700,
    letterSpacing: -0.6,
  },

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 20,
  },
  card: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 14,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  cardMedia: {
    position: 'relative',
    aspectRatio: '4 / 3',
    background: '#ece9e2',
    overflow: 'hidden',
  },
  cardImg: { width: '100%', height: '100%', objectFit: 'cover' },
  cardImgPlaceholder: {
    width: '100%', height: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: C.inkMute, fontSize: 13,
  },
  badge: {
    position: 'absolute', top: 12, left: 12,
    background: C.ink, color: '#fff',
    fontSize: 10.5, letterSpacing: 1.2, textTransform: 'uppercase',
    padding: '6px 10px', borderRadius: 999, fontWeight: 700,
  },
  cardBody: {
    padding: 18,
    display: 'flex', flexDirection: 'column', gap: 6,
    flex: 1,
  },
  cardTitle: {
    fontSize: 17, margin: 0,
    color: C.ink, fontWeight: 600, letterSpacing: -0.2,
  },
  cardMeta: {
    fontSize: 13, color: C.inkSoft, margin: 0,
    display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center',
  },
  metaTag: {
    background: '#f1efe8',
    padding: '2px 8px', borderRadius: 6,
    fontSize: 12, color: C.ink, fontWeight: 500,
    marginRight: 4,
  },
  dot: { color: '#cfcfcf' },
  cardPrice: {
    marginTop: 'auto', paddingTop: 14,
    fontSize: 20, fontWeight: 700,
    color: C.ink, letterSpacing: -0.3, margin: 0,
  },

  muted: { color: C.inkSoft, fontSize: 14, margin: 0 },
  error: {
    color: C.danger, fontSize: 14, margin: '0 0 16px',
    padding: '12px 14px',
    background: '#fdecee',
    border: '1px solid #f6c8ce',
    borderRadius: 8,
  },

  footer: {
    borderTop: `1px solid ${C.border}`,
    marginTop: 40,
    background: '#f4f1ea',
  },
  footerInner: {
    maxWidth: 1240,
    margin: '0 auto',
    padding: '36px 24px',
    textAlign: 'center',
  },
}

export default App
