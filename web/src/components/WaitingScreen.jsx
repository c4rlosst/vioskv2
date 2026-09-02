import { money } from '../lib/format'

export default function WaitingScreen({ order, tableLabel, businessName, onOrderMore }) {
  return (
    <div className="waiting">
      <div className="waiting-card">
        <div className="pulse">
          <span className="material-symbols-outlined">room_service</span>
        </div>

        <h1>Order sent</h1>
        <p className="muted">
          Someone from {businessName ?? 'the team'} is on their way to {tableLabel} to confirm it
          with you.
        </p>

        <ul className="lines compact bordered">
          {order.items.map((i, index) => (
            <li key={index} className="line">
              <span className="line-qty">{i.quantity}×</span>
              <span className="line-main">{i.name}</span>
              <span className="line-total">{money(Number(i.price) * i.quantity)}</span>
            </li>
          ))}
        </ul>

        <div className="total-row big">
          <span>Total</span>
          <strong>{money(order.total)}</strong>
        </div>

        <p className="muted small centre">
          Pay at the end of your meal. Show this screen if staff ask.
        </p>

        <button className="btn-quiet block" onClick={onOrderMore}>
          Order something else
        </button>
      </div>
    </div>
  )
}
