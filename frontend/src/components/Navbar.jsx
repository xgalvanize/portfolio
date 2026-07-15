import { useState, useEffect } from 'react'
import './Navbar.css'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const close = () => setMenuOpen(false)

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="nav-inner">
        <a href="#" className="nav-logo" onClick={close}>
          <span className="logo-bracket">&lt;</span>XG<span className="logo-bracket">/&gt;</span>
        </a>

        <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
          <a href="#about"    onClick={close}>About</a>
          <a href="#stack"    onClick={close}>Stack</a>
          <a href="#projects" onClick={close}>Projects</a>
          <a
            href="https://chat.xgalvanize.ca"
            target="_blank"
            rel="noreferrer"
            className="nav-cta"
            onClick={close}
          >
            Try Chat ↗
          </a>
        </div>

        <button
          className={`nav-burger ${menuOpen ? 'open' : ''}`}
          onClick={() => setMenuOpen(v => !v)}
          aria-label="Toggle menu"
        >
          <span /><span /><span />
        </button>
      </div>
    </nav>
  )
}
