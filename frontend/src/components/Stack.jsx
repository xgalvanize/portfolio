import './Stack.css'

const STACK = [
  {
    category: 'Frontend',
    accent: '#818cf8',
    items: ['React', 'Vite', 'CSS Grid & Flexbox', 'Responsive Design'],
  },
  {
    category: 'Backend',
    accent: '#34d399',
    items: ['FastAPI', 'Django', 'Node.js', 'Express'],
  },
  {
    category: 'APIs & Real-time',
    accent: '#f59e0b',
    items: ['REST', 'GraphQL', 'WebSockets', 'Server-Sent Events'],
  },
  {
    category: 'Database',
    accent: '#f97316',
    items: ['MongoDB', 'PostgreSQL', 'Mongoose', 'Motor (async)'],
  },
  {
    category: 'DevOps & Cloud',
    accent: '#06b6d4',
    items: ['Docker', 'Kubernetes (k3s)', 'Cloudflare Tunnels', 'Nginx'],
  },
  {
    category: 'AI & Tooling',
    accent: '#a78bfa',
    items: ['GitHub Copilot', 'Ollama (LLM)', 'Firebase', 'LLM Integration'],
  },
  {
    category: 'Environment',
    accent: '#fb7185',
    items: ['Manjaro Linux', 'VS Code', 'Git', 'Zsh / Bash'],
  },
]

export default function Stack() {
  return (
    <section className="stack" id="stack">
      <div className="section-inner">
        <p className="section-label">Capabilities</p>
        <h2 className="section-title">Tech Stack</h2>
        <p className="section-sub">
          A broad toolkit spanning the full delivery lifecycle — from pixel to cluster.
        </p>

        <div className="stack-grid">
          {STACK.map(({ category, accent, items }) => (
            <div
              className="stack-card"
              key={category}
              style={{ '--card-accent': accent }}
            >
              <div className="stack-category">{category}</div>
              <div className="stack-tags">
                {items.map(item => (
                  <span className="stack-tag" key={item}>{item}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
