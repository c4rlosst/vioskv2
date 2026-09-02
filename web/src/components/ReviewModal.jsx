import { useState } from 'react'
import { money, cartTotal } from '../lib/format'

export default function ReviewModal({ isOpen, onClose, items, tableLabel, submitting, onSubmit }) {
  const [note, setNote] = useState('')
  const [failure, setFailure] = useState(null)

  if (!isOpen) return null

  const send = async () => {
    setFailure(null)
    const result = await onSubmit(note)
    if (!result.ok) setFailure(result.message)
  }

  return (
    <div className="sheet-backdrop" onClick={submitting ? undefined : onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>Send to {tableLabel}</h2>
          {!submitting && (
            <button className="sheet-close static" onClick={onClose} aria-label="Close">
              <span className="material-symbols-outlined">close</span>
            </button>
          )}
        </div>

        <div className="sheet-body">
          <ul className="lines compact">
            {items.map((i) => (
              <li key={i.id} className="line">
                <span className="line-qty">{i.quantity}×</span>
                <span className="line-main">{i.name}</span>
                <span className="line-total">{money(Number(i.price) * i.quantity)}</span>
              </li>
            ))}
          </ul>

          <label className="field">
            <span className="field-label">Anything we should know?</span>
            <textarea
              rows={2}
              value={note}
              placeholder="Allergies, less ice, separate plates…"
              onChange={(e) => setNote(e.target.value)}
            />
          </label>

          {failure && (
            <p className="error-note">
              <span className="material-symbols-outlined">error</span>
              {failure}
            </p>
          )}
        </div>

        <div className="sheet-foot column">
          <div className="total-row">
            <span>Total</span>
            <strong>{money(cartTotal(items))}</strong>
          </div>
          <button className="btn-primary block" disabled={submitting} onClick={send}>
            {submitting ? 'Sending…' : 'Send order'}
          </button>
          <p className="muted small centre">
            A staff member will come over to confirm it with you.
          </p>
        </div>
      </div>
    </div>
  )
}
