import { money } from '../lib/format'

/**
 * foodpanda's image-led grid: the photo is the card. No border, no
 * shadow, no panel — just the image, then name, then price. The add
 * control is a white circle sitting on the image's lower-right.
 *
 * Items with no photo fall back to a neutral tile of the same
 * proportion so the grid keeps its rhythm.
 */
function Tile({ product, quantity, onOpen, onAdd, onSetQuantity }) {
  const inCart = quantity > 0

  return (
    <article
      className="tile"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(product)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen(product)
        }
      }}
    >
      <div className="tile-media">
        {product.thumbnail_url ? (
          <img src={product.thumbnail_url} alt="" loading="lazy" />
        ) : (
          <span className="tile-fallback material-symbols-outlined">restaurant</span>
        )}

        {inCart ? (
          <div className="tile-stepper" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => onSetQuantity(product.id, quantity - 1)}
              aria-label={quantity === 1 ? `Remove ${product.name}` : `One fewer ${product.name}`}
            >
              <span className="material-symbols-outlined">
                {quantity === 1 ? 'delete' : 'remove'}
              </span>
            </button>
            <span className="tile-qty">{quantity}</span>
            <button
              onClick={() => onSetQuantity(product.id, quantity + 1)}
              aria-label={`One more ${product.name}`}
            >
              <span className="material-symbols-outlined">add</span>
            </button>
          </div>
        ) : (
          <button
            className="tile-add"
            aria-label={`Add ${product.name}`}
            onClick={(e) => {
              e.stopPropagation()
              onAdd(product, 1)
            }}
          >
            <span className="material-symbols-outlined">add</span>
          </button>
        )}
      </div>

      <h3 className="tile-name">{product.name}</h3>
      <p className="tile-price">{money(product.price)}</p>
    </article>
  )
}

/** Items with no photo: a compact row, so they don't leave holes in the grid. */
function PlainRow({ product, quantity, onOpen, onAdd, onSetQuantity }) {
  const inCart = quantity > 0
  return (
    <li className="plain">
      <div
        className="plain-row"
        role="button"
        tabIndex={0}
        onClick={() => onOpen(product)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onOpen(product)
          }
        }}
      >
        <div className="plain-text">
          <h3 className="plain-name">{product.name}</h3>
          {product.description && <p className="plain-desc">{product.description}</p>}
        </div>
        <span className="plain-price">{money(product.price)}</span>

        {inCart ? (
          <div className="plain-stepper" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => onSetQuantity(product.id, quantity - 1)}
              aria-label={quantity === 1 ? `Remove ${product.name}` : `One fewer ${product.name}`}
            >
              <span className="material-symbols-outlined">
                {quantity === 1 ? 'delete' : 'remove'}
              </span>
            </button>
            <span className="plain-qty">{quantity}</span>
            <button
              onClick={() => onSetQuantity(product.id, quantity + 1)}
              aria-label={`One more ${product.name}`}
            >
              <span className="material-symbols-outlined">add</span>
            </button>
          </div>
        ) : (
          <button
            className="plain-add"
            aria-label={`Add ${product.name}`}
            onClick={(e) => {
              e.stopPropagation()
              onAdd(product, 1)
            }}
          >
            <span className="material-symbols-outlined">add</span>
          </button>
        )}
      </div>
    </li>
  )
}

export default function MenuGrid({
  sections,
  quantities,
  onOpen,
  onAdd,
  onSetQuantity,
  onClear,
  showClear,
}) {
  const isEmpty = sections.every((s) => s.items.length === 0)

  if (isEmpty) {
    return (
      <div className="empty">
        <span className="material-symbols-outlined big-icon">search_off</span>
        <p>Nothing on the menu matches that.</p>
        {showClear && (
          <button className="btn-quiet" onClick={onClear}>
            Clear filters
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="menu">
      {sections.map((section) =>
        section.items.length === 0 ? null : (
          <section key={section.id} className="menu-section">
            <header className="menu-heading">
              <h2>{section.name}</h2>
              <p>
                {section.items.length} item{section.items.length === 1 ? '' : 's'} on the menu
              </p>
            </header>

            {section.withPhoto.length > 0 && (
              <div className="tiles">
                {section.withPhoto.map((p) => (
                  <Tile
                    key={p.id}
                    product={p}
                    quantity={quantities[p.id] ?? 0}
                    onOpen={onOpen}
                    onAdd={onAdd}
                    onSetQuantity={onSetQuantity}
                  />
                ))}
              </div>
            )}

            {section.noPhoto.length > 0 && (
              <ul className="plain-list">
                {section.noPhoto.map((p) => (
                  <PlainRow
                    key={p.id}
                    product={p}
                    quantity={quantities[p.id] ?? 0}
                    onOpen={onOpen}
                    onAdd={onAdd}
                    onSetQuantity={onSetQuantity}
                  />
                ))}
              </ul>
            )}
          </section>
        ),
      )}
    </div>
  )
}
