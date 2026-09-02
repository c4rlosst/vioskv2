import { useEffect, useState } from 'react'

export default function FilterModal({ isOpen, onClose, allTags, filters, onApply }) {
  const [draft, setDraft] = useState(filters)

  useEffect(() => {
    if (isOpen) setDraft(filters)
  }, [isOpen, filters])

  if (!isOpen) return null

  const toggleTag = (tag) =>
    setDraft((d) => ({
      ...d,
      tags: d.tags.includes(tag) ? d.tags.filter((t) => t !== tag) : [...d.tags, tag],
    }))

  const numberOrNull = (v) => (v === '' ? null : Number(v))

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>Filter</h2>
          <button className="sheet-close static" onClick={onClose} aria-label="Close">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="sheet-body">
          <h3 className="field-label">Price</h3>
          <div className="price-inputs">
            <label>
              <span className="muted small">Lowest</span>
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={draft.priceMin ?? ''}
                placeholder="0"
                onChange={(e) => setDraft({ ...draft, priceMin: numberOrNull(e.target.value) })}
              />
            </label>
            <label>
              <span className="muted small">Highest</span>
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={draft.priceMax ?? ''}
                placeholder="Any"
                onChange={(e) => setDraft({ ...draft, priceMax: numberOrNull(e.target.value) })}
              />
            </label>
          </div>

          {allTags.length > 0 && (
            <>
              <h3 className="field-label">Tags</h3>
              <div className="tag-row wrap">
                {allTags.map((t) => (
                  <button
                    key={t}
                    className={`chip${draft.tags.includes(t) ? ' is-on' : ''}`}
                    onClick={() => toggleTag(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="sheet-foot">
          <button
            className="btn-quiet"
            onClick={() => setDraft({ priceMin: null, priceMax: null, tags: [] })}
          >
            Reset
          </button>
          <button
            className="btn-primary grow"
            onClick={() => {
              onApply(draft)
              onClose()
            }}
          >
            Show results
          </button>
        </div>
      </div>
    </div>
  )
}
