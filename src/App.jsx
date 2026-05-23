import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './supabase'

const C = {
  bg: '#F8F6F1',
  surface: '#ffffff',
  ink: '#1a1a1a',
  inkSoft: '#5b5b5b',
  inkMute: '#8a8a8a',
  border: '#e6dfd1',
  navy: '#0D1B2A',
  navyLight: '#1c2d44',
  gold: '#C8A97A',
  goldDark: '#a88a5f',
  danger: '#b00020',
}

const SERIF = '"Playfair Display", Georgia, "Times New Roman", serif'

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
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav style={styles.nav}>
      <div style={styles.navInner} className="v360-nav-inner">
        <a href="#inicio" style={styles.logo} onClick={() => setMenuOpen(false)}>
          <img src="/logo.png" alt="" style={styles.logoImg} />
          <span style={styles.logoText}>Vitrina 360</span>
        </a>
        <button
          type="button"
          className="v360-hamburger"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuOpen}
          style={styles.hamburger}
        >
          {menuOpen ? '✕' : '☰'}
        </button>
        <ul
          style={styles.navLinks}
          className={`v360-nav-links${menuOpen ? ' v360-nav-open' : ''}`}
          onClick={() => setMenuOpen(false)}
        >
          <li><a href="#vehiculos" style={styles.navLink} className="v360-link">Vehículos</a></li>
          <li><a href="#propiedades" style={styles.navLink} className="v360-link">Propiedades</a></li>
          <li><a href="#quienes-somos" style={styles.navLink} className="v360-link">Quiénes Somos</a></li>
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
    <Link to={`/vehiculo/${v.id}`} style={{ display: 'block', color: 'inherit', textDecoration: 'none', height: '100%' }}>
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
    </Link>
  )
}

function PropertyCard({ p }) {
  return (
    <Link to={`/propiedad/${p.id}`} style={{ display: 'block', color: 'inherit', textDecoration: 'none', height: '100%' }}>
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
    </Link>
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
        <div style={styles.grid} className="v360-grid">
          {items.map(renderCard)}
        </div>
      )}
    </section>
  )
}

function Step({ number, title, text }) {
  return (
    <div style={styles.step}>
      <span style={styles.stepNumber}>{number}</span>
      <h3 style={styles.stepTitle}>{title}</h3>
      <p style={styles.stepText}>{text}</p>
    </div>
  )
}

function AboutSection() {
  return (
    <section id="quienes-somos" style={styles.about}>
      <div style={styles.aboutInner}>
        <header style={styles.aboutHeader}>
          <p style={styles.aboutEyebrow}>Quiénes somos</p>
          <h2 style={styles.aboutTitle}>¿Por qué elegir Vitrina 360?</h2>
          <p style={styles.aboutIntro}>
            Somos la plataforma premium colombiana que vende tu vehículo o propiedad más rápido, con más visibilidad y sin costos anticipados.
          </p>
        </header>

        <div style={styles.aboutGrid} className="v360-about-grid">
          <Step
            number="01"
            title="Exposición 360° total"
            text="Mostramos tu vehículo desde todos los ángulos con fotografía interactiva, video profesional y recorrido virtual. Tu comprador lo ve como si estuviera ahí."
          />
          <Step
            number="02"
            title="Publicidad al comprador correcto"
            text="Creamos campañas en redes sociales segmentadas por ciudad, presupuesto e intereses. No mostramos tu vehículo a todo el mundo, lo mostramos a quien realmente lo va a comprar."
          />
          <Step
            number="03"
            title="Tú negocias directamente"
            text="Cuando hay un interesado serio te conectamos directo con él por WhatsApp. Sin intermediarios, sin demoras, tú cierras el trato a tu precio."
          />
          <Step
            number="04"
            title="Solo pagas cuando vendes"
            text={<>Publicar es <strong style={{ color: C.gold, fontWeight: 600 }}>100% gratis</strong>. Nuestra comisión es del <strong style={{ color: C.gold, fontWeight: 600 }}>3%</strong> en vehículos y <strong style={{ color: C.gold, fontWeight: 600 }}>4%</strong> en propiedades, únicamente cuando la venta se hace efectiva.</>}
          />
        </div>
      </div>
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

      <AboutSection />

      <footer id="contacto" style={styles.footer}>
        <div style={styles.footerInner}>
          <p style={{ margin: 0, fontWeight: 500, color: '#fff', fontSize: 24, fontFamily: SERIF, letterSpacing: 1 }}>
            Vitrina <span style={{ color: C.gold }}>360</span>
          </p>
          <p style={{ margin: '14px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.55)', letterSpacing: 2, textTransform: 'uppercase' }}>
            © {new Date().getFullYear()} · Marketplace de vehículos e inmuebles en Colombia
          </p>
        </div>
      </footer>
    </>
  )
}

const styles = {
  // NAVBAR — dark navy with white + gold
  nav: {
    position: 'sticky',
    top: 0,
    zIndex: 50,
    background: C.navy,
    borderBottom: `1px solid rgba(200, 169, 122, 0.18)`,
  },
  navInner: {
    maxWidth: 1240,
    margin: '0 auto',
    padding: '18px 28px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 24,
  },
  logo: { display: 'flex', alignItems: 'center', gap: 12, color: '#fff' },
  hamburger: {
    display: 'none',
    background: 'transparent',
    border: 'none',
    color: '#fff',
    fontSize: 22,
    cursor: 'pointer',
    padding: 8,
    lineHeight: 1,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImg: {
    height: 52,
    width: 'auto',
    display: 'block',
    borderRadius: 8,
    background: '#ffffff',
    padding: 4,
    objectFit: 'contain',
  },
  logoMark: {
    width: 40, height: 40, borderRadius: 4,
    background: C.gold, color: C.navy,
    fontWeight: 700, fontSize: 20,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    letterSpacing: 0.5,
    fontFamily: SERIF,
  },
  logoText: {
    fontSize: 20,
    letterSpacing: 2,
    fontWeight: 600,
    fontFamily: SERIF,
    color: '#fff',
  },
  navLinks: { display: 'flex', gap: 36 },
  navLink: {
    fontSize: 12,
    fontWeight: 500,
    color: 'rgba(255,255,255,0.82)',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  // HERO — dark navy with cream/gold text
  hero: {
    background: `linear-gradient(180deg, ${C.navy} 0%, ${C.navyLight} 100%)`,
    color: '#fff',
    position: 'relative',
  },
  heroInner: {
    maxWidth: 1240,
    margin: '0 auto',
    padding: '128px 28px 112px',
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 3.5,
    textTransform: 'uppercase',
    color: C.gold,
    margin: '0 0 22px',
    fontWeight: 600,
  },
  heroTitle: {
    fontSize: 'clamp(26px, 6.5vw, 68px)',
    lineHeight: 1.15,
    letterSpacing: -0.6,
    color: '#fff',
    margin: '0 0 22px',
    fontWeight: 500,
    maxWidth: 900,
    fontFamily: SERIF,
  },
  heroSubtitle: {
    fontSize: 'clamp(15px, 1.8vw, 18px)',
    lineHeight: 1.75,
    color: 'rgba(255,255,255,0.78)',
    margin: 0,
    maxWidth: 620,
  },

  // SECTIONS
  main: { maxWidth: 1240, margin: '0 auto', padding: '0 28px' },
  section: { padding: '96px 0' },
  sectionHeader: {
    marginBottom: 56,
    paddingBottom: 24,
    borderBottom: `1px solid ${C.border}`,
  },
  sectionTitle: {
    fontSize: 'clamp(32px, 4.2vw, 48px)',
    margin: 0,
    color: C.ink,
    fontWeight: 500,
    letterSpacing: -0.4,
    fontFamily: SERIF,
    lineHeight: 1.1,
  },

  // GRID
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: 32,
  },

  // CARDS
  card: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 4,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 2px 6px rgba(13, 27, 42, 0.04), 0 12px 32px rgba(13, 27, 42, 0.05)',
    height: '100%',
  },
  cardMedia: {
    position: 'relative',
    aspectRatio: '4 / 3',
    background: '#e8e3d4',
    overflow: 'hidden',
  },
  cardImg: { width: '100%', height: '100%', objectFit: 'cover' },
  cardImgPlaceholder: {
    width: '100%', height: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: C.inkMute, fontSize: 13,
    fontStyle: 'italic',
  },
  badge: {
    position: 'absolute', top: 16, left: 16,
    background: C.navy, color: '#fff',
    fontSize: 10, letterSpacing: 2, textTransform: 'uppercase',
    padding: '7px 12px', borderRadius: 2, fontWeight: 600,
    border: `1px solid ${C.gold}`,
  },
  cardBody: {
    padding: 26,
    display: 'flex', flexDirection: 'column', gap: 10,
    flex: 1,
  },
  cardTitle: {
    fontSize: 21, margin: 0,
    color: C.ink, fontWeight: 500, letterSpacing: -0.2,
    fontFamily: SERIF,
    lineHeight: 1.25,
  },
  cardMeta: {
    fontSize: 13, color: C.inkSoft, margin: 0,
    display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center',
    letterSpacing: 0.2,
  },
  metaTag: {
    background: '#f0ece1',
    padding: '3px 10px', borderRadius: 2,
    fontSize: 10.5, color: C.ink, fontWeight: 600,
    marginRight: 4,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  dot: { color: '#d2cbb9' },
  cardPrice: {
    marginTop: 'auto', paddingTop: 18,
    fontSize: 24, fontWeight: 600,
    color: C.gold, letterSpacing: 0, margin: 0,
    fontFamily: SERIF,
    borderTop: `1px solid ${C.border}`,
  },

  muted: { color: C.inkSoft, fontSize: 14, margin: 0, fontStyle: 'italic' },
  error: {
    color: C.danger, fontSize: 14, margin: '0 0 16px',
    padding: '14px 16px',
    background: '#fdf1f3',
    border: '1px solid #f6c8ce',
    borderRadius: 2,
  },

  // ABOUT / QUIÉNES SOMOS
  about: {
    background: C.navy,
    color: '#fff',
    padding: '96px 0',
  },
  aboutInner: {
    maxWidth: 1240,
    margin: '0 auto',
    padding: '0 28px',
  },
  aboutHeader: {
    textAlign: 'center',
    maxWidth: 760,
    margin: '0 auto 64px',
  },
  aboutEyebrow: {
    fontSize: 11,
    letterSpacing: 3.5,
    textTransform: 'uppercase',
    color: C.gold,
    margin: '0 0 18px',
    fontWeight: 600,
  },
  aboutTitle: {
    fontSize: 'clamp(26px, 4.5vw, 46px)',
    margin: '0 0 22px',
    color: '#fff',
    fontWeight: 500,
    letterSpacing: -0.5,
    fontFamily: SERIF,
    lineHeight: 1.15,
  },
  aboutIntro: {
    fontSize: 'clamp(15px, 1.8vw, 18px)',
    lineHeight: 1.75,
    color: 'rgba(255,255,255,0.78)',
    margin: 0,
  },
  aboutGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 24,
  },
  step: {
    textAlign: 'left',
    padding: '32px 28px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(200, 169, 122, 0.18)',
    borderRadius: 6,
    display: 'flex',
    flexDirection: 'column',
  },
  stepNumber: {
    fontSize: 48,
    fontWeight: 500,
    color: C.gold,
    letterSpacing: -1,
    fontFamily: SERIF,
    display: 'block',
    marginBottom: 14,
    lineHeight: 1,
  },
  stepTitle: {
    fontSize: 19,
    margin: '0 0 12px',
    color: '#fff',
    fontWeight: 500,
    letterSpacing: -0.2,
    fontFamily: SERIF,
    lineHeight: 1.25,
  },
  stepText: {
    fontSize: 14,
    lineHeight: 1.7,
    color: 'rgba(255,255,255,0.72)',
    margin: 0,
  },

  // FOOTER — dark navy
  footer: {
    background: C.navy,
    color: '#fff',
    marginTop: 0,
  },
  footerInner: {
    maxWidth: 1240,
    margin: '0 auto',
    padding: '64px 28px',
    textAlign: 'center',
  },
}

export default App
