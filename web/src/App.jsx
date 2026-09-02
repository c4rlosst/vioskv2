import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase'
import { cartCount, cartTotal } from './lib/format'
import Header from './components/Header'
import MenuGrid from './components/MenuGrid'
import MenuSkeleton from './components/MenuSkeleton'
import ProductModal from './components/ProductModal'
import FilterModal from './components/FilterModal'
import CartSheet from './components/CartSheet'
import ReviewModal from './components/ReviewModal'
import WaitingScreen from './components/WaitingScreen'
import TablePicker from './components/TablePicker'

// One QR per store. The sticker encodes ?s=<store qr_token>; the guest
// then picks which table they're at.
const tokenFromUrl = () =>
  new URLSearchParams(window.location.search).get('s') ??
  new URLSearchParams(window.location.search).get('t')

const EMPTY_FILTERS = { priceMin: null, priceMax: null, tags: [] }

export default function App() {
  const [token] = useState(tokenFromUrl)
  const [store, setStore] = useState(null)
  const [tables, setTables] = useState([])
  const [table, setTable] = useState(null)
  const [business, setBusiness] = useState(null)
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [cart, setCart] = useState([])
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [activeCategory, setActiveCategory] = useState('all')

  const [openProduct, setOpenProduct] = useState(null)
  const [isFilterOpen, setFilterOpen] = useState(false)
  const [isCartOpen, setCartOpen] = useState(false)
  const [isReviewOpen, setReviewOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [placedOrder, setPlacedOrder] = useState(null)

  // ── Load everything the table needs, in one pass ────────────────────────
  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!token) {
        setError('no-token')
        setLoading(false)
        return
      }

      // Which store is this QR for?
      const { data: storeRow, error: storeErr } = await supabase
        .from('stores')
        .select('id, name, business_id')
        .eq('qr_token', token)
        .maybeSingle()

      if (cancelled) return

      if (storeErr || !storeRow) {
        setError('bad-token')
        setLoading(false)
        return
      }

      const businessId = storeRow.business_id

      const [bizRes, catRes, prodRes, tableRes] = await Promise.all([
        supabase
          .from('businesses')
          .select('id, name, logo_url, theme')
          .eq('id', businessId)
          .single(),
        supabase
          .from('categories')
          .select('id, name, sort_order')
          .eq('business_id', businessId)
          .order('sort_order'),
        supabase
          .from('products')
          .select('id, name, description, price, thumbnail_url, tags, category_id, sort_order')
          .eq('business_id', businessId)
          .order('sort_order'),
        supabase
          .from('store_tables')
          .select('id, label')
          .eq('store_id', storeRow.id)
          .order('label'),
      ])

      if (cancelled) return

      if (bizRes.error || prodRes.error) {
        setError('load-failed')
        setLoading(false)
        return
      }

      setStore(storeRow)
      setTables(tableRes.data ?? [])
      setBusiness(bizRes.data)
      setCategories(catRes.data ?? [])
      setProducts(prodRes.data ?? [])
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [token])

  // ── Apply the business's theme, exactly like Viosk did from Sheets ──────
  useEffect(() => {
    if (!business?.theme) return
    Object.entries(business.theme).forEach(([name, value]) => {
      if (!name || !value) return
      const prop = name.startsWith('--') ? name : `--${name}`
      document.documentElement.style.setProperty(prop, String(value))
    })
    if (business.name) document.title = `${business.name} · Order`
  }, [business])

  // ── Cart ────────────────────────────────────────────────────────────────
  const addToCart = useCallback((product, quantity = 1) => {
    setCart((current) => {
      const existing = current.find((i) => i.id === product.id)
      if (existing) {
        return current.map((i) =>
          i.id === product.id ? { ...i, quantity: i.quantity + quantity } : i,
        )
      }
      return [...current, { ...product, quantity }]
    })
  }, [])

  const setQuantity = useCallback((productId, quantity) => {
    setCart((current) =>
      quantity <= 0
        ? current.filter((i) => i.id !== productId)
        : current.map((i) => (i.id === productId ? { ...i, quantity } : i)),
    )
  }, [])

  const allTags = useMemo(() => {
    const set = new Set()
    products.forEach((p) => (p.tags ?? []).forEach((t) => set.add(t)))
    return [...set].sort()
  }, [products])

  const visibleProducts = useMemo(() => {
    const q = search.trim().toLowerCase()
    return products.filter((p) => {
      if (activeCategory !== 'all' && p.category_id !== activeCategory) return false
      if (q) {
        const haystack = `${p.name} ${p.description ?? ''} ${(p.tags ?? []).join(' ')}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      const price = Number(p.price) || 0
      if (filters.priceMin !== null && price < filters.priceMin) return false
      if (filters.priceMax !== null && price > filters.priceMax) return false
      if (filters.tags.length && !filters.tags.some((t) => (p.tags ?? []).includes(t)))
        return false
      return true
    })
  }, [products, search, filters, activeCategory])

  const quantities = useMemo(
    () => Object.fromEntries(cart.map((i) => [i.id, i.quantity])),
    [cart],
  )

  const sections = useMemo(() => {
    const wanted =
      activeCategory === 'all' ? categories : categories.filter((c) => c.id === activeCategory)
    const split = (items) => ({
      items,
      withPhoto: items.filter((p) => p.thumbnail_url),
      noPhoto: items.filter((p) => !p.thumbnail_url),
    })
    const grouped = wanted.map((c) => ({
      id: c.id,
      name: c.name,
      ...split(visibleProducts.filter((p) => p.category_id === c.id)),
    }))
    const loose = visibleProducts.filter((p) => !p.category_id)
    return loose.length ? [...grouped, { id: 'other', name: 'More', ...split(loose) }] : grouped
  }, [categories, visibleProducts, activeCategory])

  const filtersActive =
    filters.tags.length > 0 || filters.priceMin !== null || filters.priceMax !== null

  // ── Send the order. The server prices it; we only send ids and counts. ──
  const submitOrder = async (note) => {
    setSubmitting(true)
    const { data, error: rpcError } = await supabase.rpc('submit_guest_order', {
      p_store_token: token,
      p_table_id: table.id,
      p_items: cart.map((i) => ({ product_id: i.id, quantity: i.quantity })),
      p_note: note || null,
    })
    setSubmitting(false)

    if (rpcError) {
      return { ok: false, message: rpcError.message }
    }

    setPlacedOrder({
      ...data,
      items: cart.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
      total: cartTotal(cart),
    })
    setCart([])
    setReviewOpen(false)
    setCartOpen(false)
    return { ok: true }
  }

  // ── Screens ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <>
        <header className="header">
          <div className="header-bar">
            <span className="sk-dark sk-icon" />
            <span className="sk-dark sk-logo" />
            <span className="sk-dark sk-icon" />
          </div>
          <div className="header-title">
            <span className="sk-dark sk-title" />
            <span className="sk-dark sk-sub" />
          </div>
          <div className="search is-loading" />
        </header>
        <main className="main">
          <MenuSkeleton />
        </main>
      </>
    )
  }

  if (error) {
    const messages = {
      'no-token': {
        title: 'Scan the code to start',
        body: 'This page opens by scanning the QR code in the store, so we know which menu to show you.',
      },
      'bad-token': {
        title: 'That code did not work',
        body: 'The QR code may be out of date. Please ask a staff member for help.',
      },
      'load-failed': {
        title: 'Could not load the menu',
        body: 'Something went wrong on our side. Try again in a moment.',
      },
    }
    const m = messages[error] ?? messages['load-failed']
    return (
      <div className="screen-centre">
        <span className="material-symbols-outlined big-icon">qr_code_scanner</span>
        <h1>{m.title}</h1>
        <p className="muted">{m.body}</p>
      </div>
    )
  }

  if (!table) {
    return (
      <TablePicker
        businessName={business?.name}
        logoUrl={business?.logo_url}
        storeName={store?.name}
        tables={tables}
        onPick={setTable}
      />
    )
  }

  if (placedOrder) {
    return (
      <WaitingScreen
        order={placedOrder}
        tableLabel={table.label}
        businessName={business?.name}
        onOrderMore={() => setPlacedOrder(null)}
      />
    )
  }

  return (
    <>
      <Header
        businessName={business?.name}
        logoUrl={business?.logo_url}
        storeName={store?.name}
        tableLabel={table.label}
        onChangeTable={() => setTable(null)}
        search={search}
        onSearchChange={setSearch}
        cartCount={cartCount(cart)}
        cartTotal={cartTotal(cart)}
        onCartClick={() => setCartOpen(true)}
      />

      <main className="main">
        <div className="nav-row">
          <nav className="chips" aria-label="Categories">
            <button
              className={`chip${activeCategory === 'all' ? ' is-on' : ''}`}
              onClick={() => setActiveCategory('all')}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                className={`chip${activeCategory === c.id ? ' is-on' : ''}`}
                onClick={() => setActiveCategory(c.id)}
              >
                {c.name}
              </button>
            ))}
          </nav>

          <button
            className={`filter-btn${filtersActive ? ' is-active' : ''}`}
            onClick={() => setFilterOpen(true)}
            aria-label="Filter the menu"
          >
            <span className="material-symbols-outlined">filter_alt</span>
            {filtersActive && <span className="dot" />}
          </button>
        </div>

        <MenuGrid
          sections={sections}
          quantities={quantities}
          onOpen={setOpenProduct}
          onAdd={addToCart}
          onSetQuantity={setQuantity}
          onClear={() => {
            setSearch('')
            setFilters(EMPTY_FILTERS)
            setActiveCategory('all')
          }}
          showClear={Boolean(search) || filtersActive || activeCategory !== 'all'}
        />
      </main>

      {cart.length > 0 && (
        <button className="cart-bar" onClick={() => setCartOpen(true)}>
          <span className="cart-bar-count">{cartCount(cart)}</span>
          <span>View order</span>
          <span className="cart-bar-total">{cartTotal(cart).toFixed(2)}</span>
        </button>
      )}

      <ProductModal
        product={openProduct}
        onClose={() => setOpenProduct(null)}
        onAdd={(p, qty) => {
          addToCart(p, qty)
          setOpenProduct(null)
        }}
      />

      <FilterModal
        isOpen={isFilterOpen}
        onClose={() => setFilterOpen(false)}
        allTags={allTags}
        filters={filters}
        onApply={setFilters}
      />

      <CartSheet
        isOpen={isCartOpen}
        onClose={() => setCartOpen(false)}
        items={cart}
        onSetQuantity={setQuantity}
        onReview={() => {
          setCartOpen(false)
          setReviewOpen(true)
        }}
      />

      <ReviewModal
        isOpen={isReviewOpen}
        onClose={() => setReviewOpen(false)}
        items={cart}
        tableLabel={table.label}
        submitting={submitting}
        onSubmit={submitOrder}
      />
    </>
  )
}
