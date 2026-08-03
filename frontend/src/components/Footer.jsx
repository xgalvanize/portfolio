import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <span className="footer-logo">
          <span className="logo-bracket">&lt;</span>XG<span className="logo-bracket">/&gt;</span>
        </span>
        <span className="footer-copy">
          xgalvanize.ca &mdash; {new Date().getFullYear()}
        </span>
        <a href="#contact" className="footer-link">
          Contact
        </a>
        <a
          href="https://chat.xgalvanize.ca"
          target="_blank"
          rel="noreferrer"
          className="footer-link"
        >
          chat.xgalvanize.ca ↗
        </a>
      </div>
    </footer>
  )
}
