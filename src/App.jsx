import { useEffect, useState } from 'react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8092/api'

async function apiRequest(path, options = {}) {
  const token = localStorage.getItem('access_token')
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`
  const response = await fetch(`${API_URL}${path}`, { ...options, headers })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Request failed')
  return data
}

function Login({ onLogin }) {
  const [registerMode, setRegisterMode] = useState(false)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function submit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')
    if (registerMode && password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    try {
      const result = await apiRequest(registerMode ? '/auth/register' : '/auth/login', {
        method: 'POST',
        body: JSON.stringify(registerMode
          ? { username, email, password }
          : { identifier, password }),
      })
      if (registerMode) {
        setRegisterMode(false)
        setIdentifier(username)
        setPassword('')
        setConfirmPassword('')
        setSuccess('Account created successfully. Please log in.')
      } else {
        localStorage.setItem('access_token', result.tokens.access_token)
        localStorage.setItem('refresh_token', result.tokens.refresh_token)
        onLogin(result.user)
      }
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-showcase">
        <div className="ambient ambient-one" /><div className="ambient ambient-two" />
        <div className="clay-orbit"><div className="clay-core" /><span className="orbit-dot dot-one" /><span className="orbit-dot dot-two" /></div>
        <p className="eyebrow">Workspace</p>
        <h1>Make every<br /><em>product move.</em></h1>
        <p className="showcase-copy">A focused command center for inventory, decisions, and growth.</p>
        <div className="showcase-meta"><span>01</span><span>Inventory intelligence</span><span className="meta-line" /></div>
      </section>
      <section className="auth-panel">
        <div className="auth-form">
          <p className="eyebrow">{registerMode ? 'New workspace access' : 'Welcome back'}</p>
          <h2>{registerMode ? 'Create your account' : 'Sign in to continue'}</h2>
          <p className="muted">{registerMode ? 'Set up your account and start managing products.' : 'Enter your credentials to open your workspace.'}</p>
          <form onSubmit={submit} className="form-stack">
            {error && <div className="alert"><span>!</span>{error}</div>}
            {success && <div className="success"><span>✓</span>{success}</div>}
            {registerMode ? (
              <>
                <label>Username<input value={username} onChange={(event) => setUsername(event.target.value)} minLength="3" maxLength="100" required /></label>
                <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength="255" required /></label>
              </>
            ) : (
              <label>Username or email<input value={identifier} onChange={(event) => setIdentifier(event.target.value)} required /></label>
            )}
            <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength="8" required /></label>
            {registerMode && <label>Confirm password<input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength="8" required /></label>}
            <button className="primary submit-button" type="submit">{registerMode ? 'Create account' : 'Enter workspace'} <span>→</span></button>
            <button className="link-button" type="button" onClick={() => { setRegisterMode(!registerMode); setError(''); setSuccess('') }}>
              {registerMode ? 'Already have an account? Login' : 'Create a new account'}
            </button>
            {!registerMode && <div className="admin-note"><strong>Admin access</strong><span>Username: <b>admin</b></span><span>Password: <b>password</b></span><small>Admin accounts are fixed. Registered users have view-only access.</small></div>}
          </form>
        </div>
        <footer className="auth-footer"><span>Secure access</span><span>© 2026</span></footer>
      </section>
    </main>
  )
}

function Dashboard({ user, onLogout }) {
  const isAdmin = user.role === 'admin'
  const emptyForm = { product_name: '', description: '', price: '', quantity: '' }
  const [products, setProducts] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState(null)
  const [pendingAction, setPendingAction] = useState(null)

  function notify(message, type = 'success') {
    setNotice({ message, type })
    window.setTimeout(() => setNotice(null), 3600)
  }

  async function loadProducts() {
    try {
      const result = await apiRequest('/products')
      setProducts(result.data || [])
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  useEffect(() => { loadProducts() }, [])

  function changeForm(event) {
    setForm({ ...form, [event.target.name]: event.target.value })
  }

  async function saveProduct(event) {
    event.preventDefault()
    setPendingAction({
      type: editingId ? 'update' : 'add',
      title: editingId ? 'Update this product?' : 'Add this product?',
      description: editingId
        ? 'Your changes will replace the current product details.'
        : 'This product will be added to your catalog.',
      confirmLabel: editingId ? 'Yes, update it' : 'Yes, add it',
      payload: { ...form, editingId },
    })
  }

  async function confirmSaveProduct() {
    const action = pendingAction
    if (!action || !['add', 'update'].includes(action.type)) return
    setError('')
    try {
      await apiRequest(action.payload.editingId ? `/products/${action.payload.editingId}` : '/products', {
        method: action.payload.editingId ? 'PUT' : 'POST',
        body: JSON.stringify({
          product_name: action.payload.product_name,
          description: action.payload.description,
          price: action.payload.price,
          quantity: action.payload.quantity,
        }),
      })
      setForm(emptyForm)
      setEditingId(null)
      await loadProducts()
      setPendingAction(null)
      notify(action.payload.editingId ? 'Product updated and catalog refreshed.' : 'Product added to your catalog.')
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  function editProduct(product) {
    setEditingId(product.id)
    setForm({
      product_name: product.product_name,
      description: product.description || '',
      price: product.price,
      quantity: product.quantity,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function deleteProduct(id) {
    const product = products.find((item) => item.id === id)
    setPendingAction({
      type: 'delete',
      title: 'Remove this product?',
      description: `"${product?.product_name || 'This product'}" will be permanently removed from your catalog.`,
      confirmLabel: 'Yes, remove it',
      productId: id,
    })
  }

  async function confirmDeleteProduct() {
    if (!pendingAction || pendingAction.type !== 'delete') return
    try {
      await apiRequest(`/products/${pendingAction.productId}`, { method: 'DELETE' })
      await loadProducts()
      setPendingAction(null)
      notify('Product removed from the catalog.', 'info')
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function logout() {
    try {
      await apiRequest('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: localStorage.getItem('refresh_token') }),
      })
    } catch {
      // The local session is still cleared if the server session has expired.
    }
    localStorage.clear()
    onLogout()
  }

  return (
    <div className="page-shell">
      <header className="topbar">
        <div className="dashboard-label">Dashboard</div>
        <div className="topbar-actions"><span className="online-status"><i />All systems operational</span><button className="secondary" onClick={logout}>Sign out</button></div>
      </header>
      {notice && <div className={`toast ${notice.type}`}><span>{notice.type === 'success' ? '✓' : 'i'}</span>{notice.message}<button onClick={() => setNotice(null)}>×</button></div>}
      <main className="dashboard-grid">
        <section className="dashboard-content">
          <div className="dashboard-heading"><div><p className="eyebrow">Overview / Today</p><h1>Good day, {user.username}.</h1><p className="muted">Here’s what’s happening with your inventory.</p>{!isAdmin && <div className="read-only-banner">Read-only access · You can view the catalog but cannot change products.</div>}</div><div className="date-stamp">01 OCT 2026<br /><small>MANILA · GMT+8</small></div></div>
          <div className="metric-row"><div className="metric"><span>Total products</span><strong>{products.length}</strong><small className="positive">↑ Live catalog</small></div><div className="metric accent"><span>Inventory status</span><strong>Active</strong><small className="positive">● All systems ready</small></div><div className="metric clay-metric"><div className="mini-clay" /><span>Workspace</span><strong>Healthy</strong><small>Synced just now</small></div></div>
          {isAdmin && <section className="workspace-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Inventory</p>
            <h2>{editingId ? 'Edit product' : 'Add product'}</h2>
          </div>
          {editingId && <button className="secondary" onClick={() => { setEditingId(null); setForm(emptyForm) }}>Cancel</button>}
        </div>
        {error && <div className="alert">{error}</div>}
        <form onSubmit={saveProduct} className="form-stack">
          <div className="form-grid">
            <label>Product name<input name="product_name" maxLength="100" value={form.product_name} onChange={changeForm} required /></label>
            <label>Price<input name="price" type="number" min="0" step="0.01" value={form.price} onChange={changeForm} required /></label>
            <label>Quantity<input name="quantity" type="number" min="0" step="1" value={form.quantity} onChange={changeForm} required /></label>
          </div>
          <label>Description<textarea name="description" value={form.description} onChange={changeForm} /></label>
          <button className="primary action-button" type="submit">{editingId ? 'Update product' : 'Add product'}</button>
        </form>
          </section>}
          <section className="workspace-section table-section">
        <div className="section-heading"><div><p className="eyebrow">Catalog</p><h2>Product list</h2></div><span className="count">{products.length} items</span></div>
        {products.length === 0 ? <p className="muted">No products yet.</p> : (
          <div className="table-wrap"><table><thead><tr><th>Name</th><th>Description</th><th>Price</th><th>Quantity</th><th>Created at</th><th>Actions</th></tr></thead>
            <tbody>{products.map((product) => (
              <tr key={product.id}><td><strong>{product.product_name}</strong></td><td>{product.description || '—'}</td><td>₱{Number(product.price).toFixed(2)}</td><td>{product.quantity}</td><td className="created-at">{product.created_at || '—'}</td>
                <td className="actions">{isAdmin ? <><button className="secondary small" onClick={() => editProduct(product)}>Edit</button><button className="danger small" onClick={() => deleteProduct(product.id)}>Delete</button></> : <span className="view-only">View only</span>}</td>
              </tr>
            ))}</tbody></table></div>
        )}
          </section>
        </section>
      </main>
      {pendingAction && <div className="modal-backdrop"><div className="confirm-modal"><div className={`modal-icon ${pendingAction.type}`}>{pendingAction.type === 'delete' ? '!' : '✓'}</div><p className="eyebrow">Confirm action</p><h2>{pendingAction.title}</h2><p className="muted">{pendingAction.description}</p><div className="modal-actions"><button className="secondary" onClick={() => setPendingAction(null)}>Cancel</button><button className={pendingAction.type === 'delete' ? 'danger' : 'primary'} onClick={pendingAction.type === 'delete' ? confirmDeleteProduct : confirmSaveProduct}>{pendingAction.confirmLabel}</button></div></div></div>}
    </div>
  )
}

function App() {
  const [user, setUser] = useState(null)
  return user ? <Dashboard user={user} onLogout={() => setUser(null)} /> : <Login onLogin={setUser} />
}

export default App
