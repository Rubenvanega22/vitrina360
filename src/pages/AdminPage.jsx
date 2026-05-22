import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'

const ADMIN_PASSWORD = 'vitrina2024'
const STORAGE_BUCKET = 'vitrina360'
const SESSION_KEY = 'vitrina360_admin'

const C = {
  bg: '#f4f5f7',
  surface: '#ffffff',
  ink: '#0a0a0a',
  inkSoft: '#5b5b5b',
  inkMute: '#8a8a8a',
  border: '#e1e3e8',
  accent: '#0f1117',
  blue: '#2563eb',
  green: '#16a34a',
  amber: '#d97706',
  red: '#b00020',
  gold: '#b8860b',
}

const formatCOP = (value) => {
  if (value == null) return '—'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0,
  }).format(value)
}

async function uploadPhoto(file, folder) {
  if (!file) return null
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const { error: uploadErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false })

  if (uploadErr) throw new Error(`Subida de foto falló: ${uploadErr.message}`)

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

function AdminPage() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(SESSION_KEY) === 'ok')

  const handleLogin = () => {
    sessionStorage.setItem(SESSION_KEY, 'ok')
    setAuthed(true)
  }
  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY)
    setAuthed(false)
  }

  if (!authed) return <LoginScreen onAuth={handleLogin} />
  return <AdminDashboard onLogout={handleLogout} />
}

function LoginScreen({ onAuth }) {
  const [pwd, setPwd] = useState('')
  const [error, setError] = useState(false)

  const submit = (e) => {
    e.preventDefault()
    if (pwd === ADMIN_PASSWORD) onAuth()
    else { setError(true); setPwd('') }
  }

  return (
    <div style={styles.loginWrap}>
      <form onSubmit={submit} style={styles.loginCard}>
        <p style={styles.loginEyebrow}>Vitrina 360 · Admin</p>
        <h1 style={styles.loginTitle}>Acceso restringido</h1>
        <p style={styles.muted}>Ingresa la contraseña de administrador para continuar.</p>

        <input
          type="password"
          placeholder="Contraseña"
          value={pwd}
          onChange={(e) => { setPwd(e.target.value); setError(false) }}
          style={{ ...styles.input, marginTop: 20 }}
          autoFocus
        />
        {error && <p style={styles.errorText}>Contraseña incorrecta.</p>}

        <button type="submit" style={{ ...styles.btnPrimary, marginTop: 16, width: '100%' }}>
          Entrar
        </button>

        <div style={{ marginTop: 16 }}>
          <Link to="/" style={styles.linkBack}>← Volver al sitio</Link>
        </div>
      </form>
    </div>
  )
}

function AdminDashboard({ onLogout }) {
  const [tab, setTab] = useState('dashboard')
  const [vehicles, setVehicles] = useState([])
  const [properties, setProperties] = useState([])
  const [loadingV, setLoadingV] = useState(true)
  const [loadingP, setLoadingP] = useState(true)

  const loadVehicles = async () => {
    setLoadingV(true)
    const { data } = await supabase.from('vehicles').select('*').order('created_at', { ascending: false })
    setVehicles(data ?? [])
    setLoadingV(false)
  }
  const loadProperties = async () => {
    setLoadingP(true)
    const { data } = await supabase.from('properties').select('*').order('created_at', { ascending: false })
    setProperties(data ?? [])
    setLoadingP(false)
  }

  useEffect(() => {
    loadVehicles()
    loadProperties()
  }, [])

  return (
    <div style={styles.appBg}>
      <header style={styles.topbar}>
        <div style={styles.topbarInner}>
          <Link to="/" style={styles.logo}>
            <span style={styles.logoMark}>V</span>
            <span>Admin <strong style={{ color: C.gold }}>Vitrina 360</strong></span>
          </Link>
          <button onClick={onLogout} style={styles.btnGhost}>Cerrar sesión</button>
        </div>
      </header>

      <nav style={styles.tabsBar}>
        <div style={styles.tabsInner}>
          <button onClick={() => setTab('dashboard')}  style={{ ...styles.tabBtn, ...(tab === 'dashboard' ? styles.tabActive : {}) }}>Dashboard</button>
          <button onClick={() => setTab('vehicles')}   style={{ ...styles.tabBtn, ...(tab === 'vehicles'  ? styles.tabActive : {}) }}>Vehículos</button>
          <button onClick={() => setTab('properties')} style={{ ...styles.tabBtn, ...(tab === 'properties' ? styles.tabActive : {}) }}>Propiedades</button>
        </div>
      </nav>

      <main style={styles.main}>
        {tab === 'dashboard' && (
          <DashboardView vehicles={vehicles} properties={properties} />
        )}
        {tab === 'vehicles' && (
          <VehiclesView list={vehicles} loading={loadingV} reload={loadVehicles} />
        )}
        {tab === 'properties' && (
          <PropertiesView list={properties} loading={loadingP} reload={loadProperties} />
        )}
      </main>
    </div>
  )
}

function DashboardView({ vehicles, properties }) {
  const pubV  = vehicles.filter(v => v.published).length
  const soldV = vehicles.filter(v => v.sold).length
  const pubP  = properties.filter(p => p.published).length
  const soldP = properties.filter(p => p.sold).length

  return (
    <div>
      <h2 style={styles.sectionTitle}>Resumen</h2>
      <div style={styles.statsGrid}>
        <StatCard label="Total vehículos"          value={vehicles.length} />
        <StatCard label="Vehículos publicados"     value={pubV}  accent={C.green} />
        <StatCard label="Vehículos vendidos"       value={soldV} accent={C.amber} />
        <StatCard label="Total propiedades"        value={properties.length} />
        <StatCard label="Propiedades publicadas"   value={pubP}  accent={C.green} />
        <StatCard label="Propiedades vendidas"     value={soldP} accent={C.amber} />
      </div>
    </div>
  )
}

function StatCard({ label, value, accent }) {
  return (
    <div style={styles.statCard}>
      <p style={styles.statLabel}>{label}</p>
      <p style={{ ...styles.statValue, ...(accent ? { color: accent } : {}) }}>{value}</p>
    </div>
  )
}

function VehiclesView({ list, loading, reload }) {
  return (
    <div>
      <h2 style={styles.sectionTitle}>Agregar vehículo</h2>
      <VehicleForm onCreated={reload} />
      <h2 style={{ ...styles.sectionTitle, marginTop: 40 }}>Vehículos en el sistema</h2>
      {loading ? <p style={styles.muted}>Cargando…</p> : <VehiclesList list={list} reload={reload} />}
    </div>
  )
}

const VEHICLE_INITIAL = {
  brand: '', model: '', year: '', price: '', km: '', color: '', tag: '',
  descripcion: '', ciudad: '', tipo: '', transmision: '', combustible: '',
  puertas: '', cilindrada: '',
  published: true,
}

function VehicleForm({ onCreated }) {
  const [form, setForm] = useState(VEHICLE_INITIAL)
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const set = (key) => (e) =>
    setForm((s) => ({ ...s, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setError(null); setSuccess(false)
    try {
      let imgUrl = null
      if (file) imgUrl = await uploadPhoto(file, 'vehicles')

      const payload = {
        brand: form.brand || null,
        model: form.model || null,
        year:  form.year  ? parseInt(form.year, 10)  : null,
        price: form.price ? parseInt(form.price, 10) : null,
        km:    form.km    ? parseInt(form.km, 10)    : null,
        color: form.color || null,
        tag:   form.tag   || null,
        descripcion: form.descripcion || null,
        ciudad:      form.ciudad      || null,
        tipo:        form.tipo        || null,
        transmision: form.transmision || null,
        combustible: form.combustible || null,
        puertas:     form.puertas ? parseInt(form.puertas, 10) : null,
        cilindrada:  form.cilindrada  || null,
        published: form.published,
        sold: false,
        img_exterior: imgUrl,
      }
      const { error: insertErr } = await supabase.from('vehicles').insert(payload)
      if (insertErr) throw insertErr

      setForm(VEHICLE_INITIAL)
      setFile(null)
      setSuccess(true)
      onCreated()
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} style={styles.card}>
      <div style={styles.formGrid}>
        <Field label="Marca *">         <input style={styles.input} value={form.brand} onChange={set('brand')} required placeholder="Mazda" /></Field>
        <Field label="Modelo *">        <input style={styles.input} value={form.model} onChange={set('model')} required placeholder="CX-30 Touring 2.0" /></Field>
        <Field label="Año">             <input style={styles.input} type="number" value={form.year}  onChange={set('year')}  placeholder="2023" /></Field>
        <Field label="Precio (COP) *">  <input style={styles.input} type="number" value={form.price} onChange={set('price')} required placeholder="105000000" /></Field>
        <Field label="Kilometraje">     <input style={styles.input} type="number" value={form.km}    onChange={set('km')}    placeholder="28500" /></Field>
        <Field label="Color">           <input style={styles.input} value={form.color} onChange={set('color')} placeholder="Gris Polymetal" /></Field>
        <Field label="Ciudad">          <input style={styles.input} value={form.ciudad} onChange={set('ciudad')} placeholder="Medellín" /></Field>
        <Field label="Tipo">
          <select style={styles.input} value={form.tipo} onChange={set('tipo')}>
            <option value="">Seleccionar…</option>
            <option value="carro">Carro</option>
            <option value="moto">Moto</option>
            <option value="camioneta">Camioneta</option>
            <option value="camión">Camión</option>
          </select>
        </Field>
        <Field label="Transmisión">
          <select style={styles.input} value={form.transmision} onChange={set('transmision')}>
            <option value="">Seleccionar…</option>
            <option value="manual">Manual</option>
            <option value="automática">Automática</option>
          </select>
        </Field>
        <Field label="Combustible">
          <select style={styles.input} value={form.combustible} onChange={set('combustible')}>
            <option value="">Seleccionar…</option>
            <option value="gasolina">Gasolina</option>
            <option value="diesel">Diesel</option>
            <option value="eléctrico">Eléctrico</option>
            <option value="híbrido">Híbrido</option>
          </select>
        </Field>
        <Field label="Cilindrada">      <input style={styles.input} value={form.cilindrada} onChange={set('cilindrada')} placeholder="2.0" /></Field>
        <Field label="Puertas">         <input style={styles.input} type="number" min="1" max="8" value={form.puertas} onChange={set('puertas')} placeholder="4" /></Field>
        <Field label="Etiqueta">        <input style={styles.input} value={form.tag}   onChange={set('tag')}   placeholder="Destacado" /></Field>
        <Field label="Foto exterior">
          <input style={styles.fileInput} type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </Field>
        <label style={{ ...styles.field, gridColumn: '1 / -1' }}>
          <span style={styles.fieldLabel}>Descripción</span>
          <textarea
            style={{ ...styles.input, minHeight: 110, resize: 'vertical', fontFamily: 'inherit' }}
            value={form.descripcion}
            onChange={set('descripcion')}
            placeholder="Estado general, mantenimiento, extras, garantía, historial de revisiones…"
          />
        </label>
      </div>
      <label style={styles.checkboxRow}>
        <input type="checkbox" checked={form.published} onChange={set('published')} />
        <span>Publicar inmediatamente</span>
      </label>

      {error && <div style={styles.alertError}>{error}</div>}
      {success && <div style={styles.alertSuccess}>Vehículo creado correctamente.</div>}

      <div style={styles.formActions}>
        <button type="submit" style={styles.btnPrimary} disabled={busy}>
          {busy ? 'Guardando…' : 'Agregar vehículo'}
        </button>
      </div>
    </form>
  )
}

function VehiclesList({ list, reload }) {
  if (list.length === 0) return <p style={styles.muted}>Aún no hay vehículos registrados.</p>

  const togglePublished = async (v) => {
    await supabase.from('vehicles').update({ published: !v.published }).eq('id', v.id)
    reload()
  }
  const toggleSold = async (v) => {
    await supabase.from('vehicles').update({ sold: !v.sold }).eq('id', v.id)
    reload()
  }

  return (
    <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Foto</th>
            <th style={styles.th}>Vehículo</th>
            <th style={styles.th}>Precio</th>
            <th style={styles.th}>Estado</th>
            <th style={styles.th}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {list.map((v) => (
            <tr key={v.id} style={styles.tr}>
              <td style={styles.td}>
                {v.img_exterior
                  ? <img src={v.img_exterior} style={styles.thumbImg} alt="" />
                  : <div style={styles.thumbImgPlaceholder}>—</div>}
              </td>
              <td style={styles.td}>
                <strong>{v.brand} {v.model}</strong>
                <div style={styles.tdMeta}>
                  {v.year ?? '—'} · {v.km != null ? `${v.km.toLocaleString('es-CO')} km` : '—'}
                </div>
              </td>
              <td style={styles.td}>{formatCOP(v.price)}</td>
              <td style={styles.td}>
                <span style={{ ...styles.statusBadge, ...(v.published ? styles.statusOk : styles.statusOff) }}>
                  {v.published ? 'Publicado' : 'Oculto'}
                </span>
                {v.sold && <span style={{ ...styles.statusBadge, ...styles.statusSold, marginLeft: 6 }}>Vendido</span>}
              </td>
              <td style={styles.td}>
                <button onClick={() => togglePublished(v)} style={styles.btnSecondary}>
                  {v.published ? 'Despublicar' : 'Publicar'}
                </button>
                <button onClick={() => toggleSold(v)} style={{ ...styles.btnSecondary, marginLeft: 8 }}>
                  {v.sold ? 'Marcar disponible' : 'Marcar vendido'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PropertiesView({ list, loading, reload }) {
  return (
    <div>
      <h2 style={styles.sectionTitle}>Agregar propiedad</h2>
      <PropertyForm onCreated={reload} />
      <h2 style={{ ...styles.sectionTitle, marginTop: 40 }}>Propiedades en el sistema</h2>
      {loading ? <p style={styles.muted}>Cargando…</p> : <PropertiesList list={list} reload={reload} />}
    </div>
  )
}

const PROPERTY_INITIAL = { name: '', location: '', price: '', area: '', type: '', tag: '', published: true }

function PropertyForm({ onCreated }) {
  const [form, setForm] = useState(PROPERTY_INITIAL)
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const set = (key) => (e) =>
    setForm((s) => ({ ...s, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setError(null); setSuccess(false)
    try {
      let imgUrl = null
      if (file) imgUrl = await uploadPhoto(file, 'properties')

      const payload = {
        name:     form.name     || null,
        location: form.location || null,
        price:    form.price ? parseInt(form.price, 10) : null,
        area:     form.area  ? parseInt(form.area, 10)  : null,
        type:     form.type     || null,
        tag:      form.tag      || null,
        published: form.published,
        sold: false,
        img: imgUrl,
      }
      const { error: insertErr } = await supabase.from('properties').insert(payload)
      if (insertErr) throw insertErr

      setForm(PROPERTY_INITIAL)
      setFile(null)
      setSuccess(true)
      onCreated()
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} style={styles.card}>
      <div style={styles.formGrid}>
        <Field label="Nombre *">        <input style={styles.input} value={form.name} onChange={set('name')} required placeholder="Apartamento moderno..." /></Field>
        <Field label="Ubicación *">     <input style={styles.input} value={form.location} onChange={set('location')} required placeholder="El Poblado, Medellín" /></Field>
        <Field label="Precio (COP) *">  <input style={styles.input} type="number" value={form.price} onChange={set('price')} required placeholder="620000000" /></Field>
        <Field label="Área (m²)">       <input style={styles.input} type="number" value={form.area} onChange={set('area')} placeholder="95" /></Field>
        <Field label="Tipo">            <input style={styles.input} value={form.type} onChange={set('type')} placeholder="Apartamento" /></Field>
        <Field label="Etiqueta">        <input style={styles.input} value={form.tag} onChange={set('tag')} placeholder="Tour 360°" /></Field>
        <Field label="Foto principal">
          <input style={styles.fileInput} type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </Field>
      </div>
      <label style={styles.checkboxRow}>
        <input type="checkbox" checked={form.published} onChange={set('published')} />
        <span>Publicar inmediatamente</span>
      </label>

      {error && <div style={styles.alertError}>{error}</div>}
      {success && <div style={styles.alertSuccess}>Propiedad creada correctamente.</div>}

      <div style={styles.formActions}>
        <button type="submit" style={styles.btnPrimary} disabled={busy}>
          {busy ? 'Guardando…' : 'Agregar propiedad'}
        </button>
      </div>
    </form>
  )
}

function PropertiesList({ list, reload }) {
  if (list.length === 0) return <p style={styles.muted}>Aún no hay propiedades registradas.</p>

  const togglePublished = async (p) => {
    await supabase.from('properties').update({ published: !p.published }).eq('id', p.id)
    reload()
  }
  const toggleSold = async (p) => {
    await supabase.from('properties').update({ sold: !p.sold }).eq('id', p.id)
    reload()
  }

  return (
    <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Foto</th>
            <th style={styles.th}>Propiedad</th>
            <th style={styles.th}>Precio</th>
            <th style={styles.th}>Estado</th>
            <th style={styles.th}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {list.map((p) => (
            <tr key={p.id} style={styles.tr}>
              <td style={styles.td}>
                {p.img
                  ? <img src={p.img} style={styles.thumbImg} alt="" />
                  : <div style={styles.thumbImgPlaceholder}>—</div>}
              </td>
              <td style={styles.td}>
                <strong>{p.name}</strong>
                <div style={styles.tdMeta}>
                  {p.location ?? '—'} · {p.area != null ? `${p.area} m²` : '—'}
                </div>
              </td>
              <td style={styles.td}>{formatCOP(p.price)}</td>
              <td style={styles.td}>
                <span style={{ ...styles.statusBadge, ...(p.published ? styles.statusOk : styles.statusOff) }}>
                  {p.published ? 'Publicada' : 'Oculta'}
                </span>
                {p.sold && <span style={{ ...styles.statusBadge, ...styles.statusSold, marginLeft: 6 }}>Vendida</span>}
              </td>
              <td style={styles.td}>
                <button onClick={() => togglePublished(p)} style={styles.btnSecondary}>
                  {p.published ? 'Despublicar' : 'Publicar'}
                </button>
                <button onClick={() => toggleSold(p)} style={{ ...styles.btnSecondary, marginLeft: 8 }}>
                  {p.sold ? 'Marcar disponible' : 'Marcar vendida'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label style={styles.field}>
      <span style={styles.fieldLabel}>{label}</span>
      {children}
    </label>
  )
}

const styles = {
  appBg: { minHeight: '100vh', background: C.bg },

  loginWrap: {
    minHeight: '100vh',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(180deg, #f4f1ea 0%, #fafaf7 100%)',
    padding: 24,
  },
  loginCard: {
    width: '100%', maxWidth: 380,
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    padding: 32,
  },
  loginEyebrow: {
    fontSize: 12, letterSpacing: 2.5, textTransform: 'uppercase',
    color: C.gold, margin: '0 0 8px', fontWeight: 700,
  },
  loginTitle: {
    fontSize: 24, margin: '0 0 10px', color: C.ink,
    fontWeight: 700, letterSpacing: -0.4,
  },

  topbar: { background: C.surface, borderBottom: `1px solid ${C.border}` },
  topbarInner: {
    maxWidth: 1240, margin: '0 auto',
    padding: '14px 24px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  logo: {
    display: 'flex', alignItems: 'center', gap: 10,
    color: C.ink, textDecoration: 'none', fontSize: 15,
  },
  logoMark: {
    width: 34, height: 34, borderRadius: 9,
    background: C.accent, color: '#fff',
    fontWeight: 800, fontSize: 16,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  },

  tabsBar: { background: C.surface, borderBottom: `1px solid ${C.border}` },
  tabsInner: {
    maxWidth: 1240, margin: '0 auto',
    padding: '0 24px',
    display: 'flex', gap: 4,
  },
  tabBtn: {
    padding: '14px 20px',
    background: 'transparent', border: 'none',
    borderBottom: '2px solid transparent',
    color: C.inkSoft, fontSize: 14, fontWeight: 500,
    cursor: 'pointer',
  },
  tabActive: { color: C.ink, borderBottomColor: C.ink, fontWeight: 600 },

  main: { maxWidth: 1240, margin: '0 auto', padding: '32px 24px 60px' },
  sectionTitle: {
    fontSize: 22, margin: '0 0 16px', color: C.ink,
    fontWeight: 700, letterSpacing: -0.3,
  },

  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 16,
  },
  statCard: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    padding: 20,
  },
  statLabel: {
    fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase',
    color: C.inkMute, margin: '0 0 8px', fontWeight: 600,
  },
  statValue: {
    fontSize: 32, fontWeight: 700, color: C.ink, margin: 0, letterSpacing: -0.5,
  },

  card: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    padding: 24,
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 14,
  },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  fieldLabel: { fontSize: 12, color: C.inkSoft, fontWeight: 600, letterSpacing: 0.2 },
  input: {
    padding: '10px 12px',
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    fontSize: 14, background: '#fff', color: C.ink,
    outline: 'none', fontFamily: 'inherit',
  },
  fileInput: { fontSize: 13, color: C.inkSoft, padding: '8px 0' },
  checkboxRow: {
    display: 'flex', gap: 8, alignItems: 'center',
    marginTop: 16, fontSize: 14, color: C.ink, cursor: 'pointer',
  },
  formActions: { marginTop: 18, display: 'flex', gap: 12 },

  btnPrimary: {
    padding: '10px 18px',
    background: C.ink, color: '#fff',
    border: 'none', borderRadius: 8,
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  btnSecondary: {
    padding: '7px 12px',
    background: '#fff',
    border: `1px solid ${C.border}`,
    borderRadius: 7,
    fontSize: 13, color: C.ink, fontWeight: 500, cursor: 'pointer',
  },
  btnGhost: {
    padding: '8px 14px',
    background: 'transparent',
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    fontSize: 13, color: C.ink, fontWeight: 500, cursor: 'pointer',
  },
  linkBack: { color: C.inkSoft, fontSize: 13, textDecoration: 'none' },

  alertError: {
    marginTop: 16, padding: '10px 14px',
    background: '#fdecee', border: '1px solid #f6c8ce',
    color: C.red, borderRadius: 8, fontSize: 13,
  },
  alertSuccess: {
    marginTop: 16, padding: '10px 14px',
    background: '#e7f7ed', border: '1px solid #b9e2c8',
    color: C.green, borderRadius: 8, fontSize: 13,
  },
  errorText: { color: C.red, fontSize: 13, margin: '10px 0 0' },
  muted: { color: C.inkSoft, fontSize: 14, margin: 0 },

  tableWrap: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    overflow: 'auto',
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: {
    textAlign: 'left',
    padding: '12px 14px',
    background: '#f8f9fb',
    color: C.inkSoft,
    fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase',
    fontWeight: 700,
    borderBottom: `1px solid ${C.border}`,
  },
  tr: { borderBottom: `1px solid ${C.border}` },
  td: { padding: '14px', verticalAlign: 'middle', color: C.ink },
  tdMeta: { color: C.inkSoft, fontSize: 12, marginTop: 2 },
  thumbImg: { width: 64, height: 48, objectFit: 'cover', borderRadius: 6, display: 'block' },
  thumbImgPlaceholder: {
    width: 64, height: 48,
    background: '#ece9e2', borderRadius: 6,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: C.inkMute, fontSize: 12,
  },

  statusBadge: {
    display: 'inline-block',
    fontSize: 10, letterSpacing: 1, textTransform: 'uppercase',
    padding: '4px 8px', borderRadius: 999, fontWeight: 700,
  },
  statusOk:   { background: '#e7f7ed', color: C.green },
  statusOff:  { background: '#f4f5f7', color: C.inkSoft },
  statusSold: { background: '#fef3e2', color: C.amber },
}

export default AdminPage
