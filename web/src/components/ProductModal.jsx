import { useEffect, useState } from 'react'
import { money } from '../lib/format'

export default function ProductModal({ product, onClose, onAdd }) {
  const [qty, setQty] = useState(1)

  useEffect(() => {
    if (product) setQty(1)
  }, [product])

  if (!product) return null

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <button className="sheet-close" onClick={onClose} aria-label="Close">
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="detail-media">
          {product.thumbnail_url ? (
            <img src={product.thumbnail_url} alt="" />
          ) : (
            <span className="material-symbols-outlined card-placeholder">local_cafe</span>
          )}
        </div>

        <div className="detail-body">
          <h2>{product.name}</h2>
          <p className="price price-lg">{money(product.price)}</p>
          {product.description && <p className="muted">{product.description}</p>}

          {product.tags?.length > 0 && (
            <div className="tag-row">
              {product.tags.map((t) => (
                <span key={t} className="tag">{t}</span>
              ))}
            </div>
          )}

          <div className="qty-row">
            <div className="stepper">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Fewer">
                <span className="material-symbols-outlined">remove</span>
              </button>
              <span className="stepper-value">{qty}</span>
              <button onClick={() => setQty((q) => Math.min(99, q + 1))} aria-label="More">
                <span className="material-symbols-outlined">add</span>
              </button>
            </div>
            <button className="btn-primary grow" onClick={() => onAdd(product, qty)}>
              Add · {money(Number(product.price) * qty)}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
