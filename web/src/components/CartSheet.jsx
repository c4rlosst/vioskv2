import { money, cartTotal } from '../lib/format'

export default function CartSheet({ isOpen, onClose, items, onSetQuantity, onReview }) {
  if (!isOpen) return null

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>Your order</h2>
          <button className="sheet-close static" onClick={onClose} aria-label="Close">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="sheet-body">
          {items.length === 0 ? (
            <p className="muted">Nothing added yet.</p>
          ) : (
            <ul className="lines">
              {items.map((i) => (
                <li key={i.id} className="line">
                  <div className="line-main">
                    <span className="line-name">{i.name}</span>
                    <span className="muted small">{money(i.price)} each</span>
                  </div>
                  <div className="stepper small">
                    <button onClick={() => onSetQuantity(i.id, i.quantity - 1)} aria-label="Fewer">
                      <span className="material-symbols-outlined">
                        {i.quantity === 1 ? 'delete' : 'remove'}
                      </span>
                    </button>
                    <span className="stepper-value">{i.quantity}</span>
                    <button onClick={() => onSetQuantity(i.id, i.quantity + 1)} aria-label="More">
                      <span className="material-symbols-outlined">add</span>
                    </button>
                  </div>
                  <span className="line-total">{money(Number(i.price) * i.quantity)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="sheet-foot column">
            <div className="total-row">
              <span>Total</span>
              <strong>{money(cartTotal(items))}</strong>
            </div>
            <button className="btn-primary block" onClick={onReview}>
              Review and send
            </button>
            <p className="muted small centre">You will pay at the end of your meal.</p>
          </div>
        )}
      </div>
    </div>
  )
}
