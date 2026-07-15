import './Projects.css'

const PROJECTS = [
  {
    name: 'XGalvanize Chat',
    url: 'https://chat.xgalvanize.ca',
    desc: 'A streaming AI chatbot powered by phi4-mini via Ollama. Features Firebase authentication integrated with a custom JWT identity service, Wikipedia topic cards surfaced from user messages, and a fully responsive React frontend — all running on a self-hosted k3s cluster exposed through a Cloudflare Tunnel.',
    tags: ['React', 'FastAPI', 'Firebase', 'Kubernetes', 'Ollama', 'Docker', 'Cloudflare'],
    status: 'live',
  },
  {
    name: 'XGalvanize Identity',
    desc: 'A standalone authentication microservice that exchanges Firebase ID tokens for short-lived custom JWTs with refresh-token rotation. Built as a shared identity layer for multiple applications within the same Kubernetes cluster, backed by MongoDB.',
    tags: ['FastAPI', 'Firebase Admin SDK', 'MongoDB', 'JWT', 'Kubernetes', 'Docker'],
    status: 'live',
  },
  {
    name: 'XGalvanize Portfolio',
    url: 'https://xgalvanize.ca',
    desc: 'This site. A single-page portfolio built with React and Vite, containerised with Docker, and deployed on the same k3s home cluster via Cloudflare Tunnel — zero cloud bills, full control.',
    tags: ['React', 'Vite', 'Docker', 'Kubernetes', 'Nginx', 'Cloudflare'],
    status: 'live',
  },
]

export default function Projects() {
  return (
    <section className="projects" id="projects">
      <div className="section-inner">
        <p className="section-label">Work</p>
        <h2 className="section-title">Projects</h2>
        <p className="section-sub">
          Self-hosted, production-deployed applications running on a home Kubernetes cluster.
        </p>

        <div className="projects-grid">
          {PROJECTS.map(({ name, url, desc, tags, status }) => (
            <article className="project-card" key={name}>
              <div className="project-header">
                <div className="project-name-row">
                  <h3 className="project-name">{name}</h3>
                  {status === 'live' && (
                    <span className="project-live">
                      <span className="live-dot" />
                      live
                    </span>
                  )}
                </div>
                {url && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="project-url"
                  >
                    {url.replace('https://', '')} ↗
                  </a>
                )}
              </div>

              <p className="project-desc">{desc}</p>

              <div className="project-tags">
                {tags.map(t => (
                  <span className="project-tag" key={t}>{t}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
