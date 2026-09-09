'use client'
import { useState } from 'react'

export default function VariantBNav({ spotsFraction }: { spotsFraction: string }) {
  const [open, setOpen] = useState(false)

  return (
    <nav className="vb-nav">
      <div className="vb-nav-inner">
        <a href="/" className="vb-wordmark">KLIKS<span>.</span></a>
        <div className="vb-nav-right">
          <div className="vb-pill">
            <span className="vb-dot" />
            <span>{spotsFraction} audits left</span>
          </div>
          <button
            type="button"
            className="vb-hamburger"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen(o => !o)}
          >
            <span /><span /><span />
          </button>
        </div>
      </div>
      {open && (
        <div className="vb-nav-menu">
          <a href="/" onClick={() => setOpen(false)}>Back to homepage</a>
          <a href="#audit-form" onClick={() => setOpen(false)}>Request my free audit</a>
        </div>
      )}
    </nav>
  )
}
