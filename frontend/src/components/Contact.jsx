import { useEffect, useRef, useState } from 'react'
import './Contact.css'

const INITIAL_FORM = {
  name: '',
  email: '',
  message: '',
}

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || ''

function emitContactSuccessAnalytics() {
  const detail = { event: 'contact_message_sent', ts: Date.now() }
  window.dispatchEvent(new CustomEvent('xg:contact-message-sent', { detail }))

  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push({ event: 'contact_message_sent' })
  }
}

export default function Contact() {
  const [form, setForm] = useState(INITIAL_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState({ type: '', text: '' })
  const [startedAt, setStartedAt] = useState(Date.now())
  const [website, setWebsite] = useState('')
  const [turnstileToken, setTurnstileToken] = useState('')
  const turnstileContainerRef = useRef(null)
  const turnstileWidgetIdRef = useRef(null)

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return

    const renderWidget = () => {
      if (!window.turnstile || !turnstileContainerRef.current || turnstileWidgetIdRef.current !== null) {
        return
      }

      turnstileWidgetIdRef.current = window.turnstile.render(turnstileContainerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (token) => setTurnstileToken(token || ''),
        'expired-callback': () => setTurnstileToken(''),
        'error-callback': () => setTurnstileToken(''),
      })
    }

    renderWidget()
    if (!window.turnstile) {
      const script = document.createElement('script')
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      script.async = true
      script.defer = true
      script.onload = renderWidget
      document.head.appendChild(script)
    }
  }, [])

  const resetBotChecks = () => {
    setStartedAt(Date.now())
    setWebsite('')
    setTurnstileToken('')
    if (window.turnstile && turnstileWidgetIdRef.current !== null) {
      window.turnstile.reset(turnstileWidgetIdRef.current)
    }
  }

  const onChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return

    const name = form.name.trim()
    const email = form.email.trim()
    const message = form.message.trim()

    if (!name || !email || !message) {
      setStatus({ type: 'error', text: 'Please fill in all fields.' })
      return
    }

    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      setStatus({ type: 'error', text: 'Please complete the captcha challenge.' })
      return
    }

    setSubmitting(true)
    setStatus({ type: '', text: '' })

    try {
      const resp = await fetch('/api/contact/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          message,
          website,
          startedAt,
          turnstileToken,
        }),
      })

      const payload = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        throw new Error(payload.detail || 'Unable to send message right now.')
      }

      setForm(INITIAL_FORM)
      setStatus({ type: 'ok', text: 'Message sent. Thanks for reaching out.' })
      emitContactSuccessAnalytics()
      resetBotChecks()
    } catch (err) {
      setStatus({ type: 'error', text: err.message || 'Unable to send message right now.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="contact" id="contact">
      <div className="section-inner">
        <p className="section-label">Contact</p>
        <h2 className="section-title">Send A Message</h2>
        <p className="section-sub">
          Tell me what you are building, what is blocked, or what you want shipped next.
        </p>

        <form className="contact-form" onSubmit={onSubmit} noValidate>
          <label className="contact-field">
            <span>Name</span>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={onChange}
              maxLength={80}
              autoComplete="name"
              required
            />
          </label>

          <label className="contact-field">
            <span>Email</span>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={onChange}
              maxLength={160}
              autoComplete="email"
              required
            />
          </label>

          <label className="contact-field contact-field-full">
            <span>Message</span>
            <textarea
              name="message"
              value={form.message}
              onChange={onChange}
              rows={6}
              maxLength={2000}
              required
            />
          </label>

          <div className="contact-honeypot" aria-hidden="true">
            <input
              tabIndex={-1}
              type="text"
              name="website"
              value={website}
              autoComplete="off"
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>

          {TURNSTILE_SITE_KEY && (
            <div className="contact-field-full">
              <div ref={turnstileContainerRef} className="contact-turnstile" />
            </div>
          )}

          <div className="contact-actions contact-field-full">
            <button className="contact-submit" type="submit" disabled={submitting}>
              {submitting ? 'Sending...' : 'Send Message'}
            </button>
            {status.text && (
              <p className={`contact-status ${status.type === 'error' ? 'error' : 'ok'}`}>
                {status.text}
              </p>
            )}
          </div>
        </form>
      </div>
    </section>
  )
}
