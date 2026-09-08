import Logo from './Logo'
import Monogram from './Monogram'

export default function Header({
  businessName,
  logoUrl,
  storeName,
  tableLabel,
  onChangeTable,
  search,
  onSearchChange,
  cartCount,
  cartTotal,
  onCartClick,
}) {
  return (
    <>
    <header className="header">
      {/* oversized mark, clipped by the header's rounded corners */}
      <Logo className="header-watermark" aria-hidden="true" />

      <div className="header-bar">
        <button className="icon-btn" onClick={onChangeTable} aria-label="Change table">
          <span className="material-symbols-outlined">table_restaurant</span>
        </button>

        {logoUrl ? (
          <img src={logoUrl} alt="" className="header-logo-img" />
        ) : (
          <Monogram name={businessName} className="header-monogram" />
        )}

        <button className="basket" onClick={onCartClick} aria-label="Your order">
          {cartCount > 0 && <span className="basket-total">{cartTotal.toFixed(2)}</span>}
          <span className="basket-icon">
            <span className="material-symbols-outlined">shopping_bag</span>
            {cartCount > 0 && <span className="icon-badge">{cartCount}</span>}
          </span>
        </button>
      </div>

      <div className="header-title">
        <h1>{businessName ?? 'Menu'}</h1>
        <p>
          {storeName}
          <span className="dot-sep" />
          {tableLabel}
        </p>
      </div>

    </header>

      <div className="search-wrap">
        <label className="search">
          <span className="material-symbols-outlined">search</span>
          <input
            type="search"
            value={search}
            placeholder="Search the menu"
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="search-clear"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          )}
        </label>
      </div>
    </>
  )
}
