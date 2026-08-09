import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <span className="footer-logo">
            <span className="logo-bracket">&lt;</span>XG<span className="logo-bracket">/&gt; <span  className="footer-copy">xgalvanize.ca {new Date().getFullYear()}</span></span>
          </span>
     {/*      <span className="footer-copy">
            xgalvanize.ca {new Date().getFullYear()}
          </span> */}
        </div>
        <div className="footer-links">
          <a
            href="https://chat.xgalvanize.ca"
            target="_blank"
            rel="noreferrer"
            className="footer-link"
          >
            AI Chat -&gt;
          </a>
        </div>
      </div>
    </footer>
  )
}
