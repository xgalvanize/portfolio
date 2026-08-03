import { useEffect, useState } from 'react'
import './Contact.css'

export default function AdminInbox() {
  const [token, setToken] = useState(() => localStorage.getItem('xg-admin-token') || '')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadMessages = async () => {
    if (!token) {
      setItems([])
      setError('Enter an admin token to view messages.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const resp = await fetch('/api/contact/admin/messages?limit=50', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        throw new Error(payload.detail || 'Unable to load messages.')
      }
      setItems(payload.items || [])
    } catch (err) {
      setItems([])
      setError(err.message || 'Unable to load messages.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) {
      loadMessages()
    }
  }, [token])

  const onSaveToken = () => {
    const next = token.trim()
    localStorage.setItem('xg-admin-token', next)
    setToken(next)
  }

  const onDelete = async (id) => {
    if (!token) return
    if (!window.confirm('Delete this message?')) return

    try {
      const resp = await fetch(`/api/contact/admin/messages/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        throw new Error(payload.detail || 'Unable to delete message.')
      }
      setItems((prev) => prev.filter((item) => (item._id?.$oid || item._id) !== id))
    } catch (err) {
      setError(err.message || 'Unable to delete message.')
    }
  }

  return (
    <section className="contact" id="admin-inbox">
      <div className="section-inner">
        <p className="section-label">Admin</p>
        <h2 className="section-title">Inbox</h2>
        <p className="section-sub">
          Review recent portfolio contact messages from your self-hosted deployment.
        </p>

        <div className="contact-form" style={{ display: 'block' }}>
          <div className="contact-actions" style={{ marginBottom: '1rem' }}>
            <input
              className="contact-field"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Admin bearer token"
              style={{ maxWidth: '420px' }}
            />
            <button className="contact-submit" type="button" onClick={onSaveToken}>
              Load messages
            </button>
          </div>

          {error && <p className="contact-status error">{error}</p>}

          {loading ? (
            <p className="contact-status ok">Loading...</p>
          ) : items.length === 0 ? (
            <p className="contact-status">No messages yet.</p>
          ) : (
            <div className="admin-list">
              {items.map((item) => (
                <article className="admin-card" key={item._id?.$oid || item._id || item.createdAt}>
                  <div className="admin-meta">
                    <strong>{item.name}</strong>
                    <span>{item.email}</span>
                    <span>{new Date(item.createdAt).toLocaleString()}</span>
                    <button className="admin-delete-btn" type="button" onClick={() => onDelete(item._id?.$oid || item._id)}>
                      Delete
                    </button>
                  </div>
                  <p>{item.message}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
