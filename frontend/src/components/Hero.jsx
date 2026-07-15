import { useState, useEffect } from 'react'
import './Hero.css'

const ROLES = [
  'Full-Stack Development',
  'MERN Stack',
  'FastAPI & Django',
  'Kubernetes Deployment',
  'AI-Integrated Applications',
]

function useTypewriter(items, typeSpeed = 75, deleteSpeed = 38, pause = 2400) {
  const [text, setText] = useState('')
  const [phase, setPhase] = useState('typing')
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const target = items[idx]
    let timeout

    if (phase === 'typing') {
      if (text.length < target.length) {
        timeout = setTimeout(() => setText(target.slice(0, text.length + 1)), typeSpeed)
      } else {
        timeout = setTimeout(() => setPhase('deleting'), pause)
      }
    } else {
      if (text.length > 0) {
        timeout = setTimeout(() => setText(text.slice(0, -1)), deleteSpeed)
      } else {
        setIdx((i) => (i + 1) % items.length)
        setPhase('typing')
      }
    }

    return () => clearTimeout(timeout)
  }, [text, phase, idx, items, typeSpeed, deleteSpeed, pause])

  return text
}

export default function Hero() {
  const role = useTypewriter(ROLES)

  return (
    <section className="hero" id="about">
      <div className="hero-inner">
        <div className="hero-eyebrow">
          <span className="eyebrow-dot" />
          Available for work
        </div>

        <h1 className="hero-name">XGalvanize</h1>

        <p className="hero-role">
          <span>{role}</span>
          <span className="hero-cursor">|</span>
        </p>

        <p className="hero-desc">
          Building robust full-stack applications with modern web technologies,
          AI integrations, and cloud-native deployments on Kubernetes.
        </p>

        <div className="hero-cta">
          <a href="#projects" className="btn-primary">View Projects</a>
          <a href="#stack"    className="btn-ghost">Tech Stack</a>
        </div>
      </div>

      <div className="hero-terminal" aria-hidden="true">
        <div className="terminal-bar">
          <span className="dot dot-red"    />
          <span className="dot dot-yellow" />
          <span className="dot dot-green"  />
          <span className="terminal-title">zsh — ~/projects</span>
        </div>
        <div className="terminal-body">
          <p className="t-line">
            <span className="t-prompt">❯</span>
            <span className="t-cmd"> kubectl get pods -n chatbot</span>
          </p>
          <p className="t-line t-out">NAME                          READY   STATUS</p>
          <p className="t-line t-out">chatbot-frontend-xxx&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;1/1&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="t-green">Running</span></p>
          <p className="t-line t-out">chatbot-backend-xxx&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;1/1&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="t-green">Running</span></p>
          <p className="t-line t-out">chatbot-cloudflared-xxx&nbsp;&nbsp;&nbsp;1/1&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="t-green">Running</span></p>
          <p className="t-line t-spacer" />
          <p className="t-line">
            <span className="t-prompt">❯</span>
            <span className="t-cmd"> curl https://chat.xgalvanize.ca/health</span>
          </p>
          <p className="t-line t-out t-json">
            {'{'}&#8203;"status":"<span className="t-green">ok</span>","model":"phi4-mini"{'}'}
          </p>
          <p className="t-line t-spacer" />
          <p className="t-line">
            <span className="t-prompt">❯</span>
            <span className="t-blink"> █</span>
          </p>
        </div>
      </div>
    </section>
  )
}
