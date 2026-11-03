// Versão plana: mesmo conteúdo, em HTML de verdade. Serve pra quem não tem WebGL,
// pra quem prefere ler assim e pra leitor de tela. Não carrega three.js.
import { COPY, PROJECTS, SITE_HOME, WHATSAPP, printUrl } from './data/projects.js'

export default function Flat({ reason, canBook }) {
  return (
    <main className="flat">
      <header className="flat-head">
        <p className="flat-eyebrow">guilherme dias · portfólio</p>
        <h1>{COPY.openingTitle.join(' ')}</h1>
        <p className="flat-lead">{COPY.openingLead}</p>
        <p className="flat-note">
          {reason === 'webgl'
            ? 'Este navegador não abriu o livro em 3D, então as páginas estão aqui, em sequência.'
            : reason === 'tela'
              ? 'Nesta tela o livro ficaria pequeno demais pra ler, então as páginas estão aqui, em sequência. Com o celular em pé, o livro volta.'
              : reason === 'contexto'
                ? 'O navegador interrompeu o 3D, então as páginas estão aqui, em sequência.'
                : COPY.openingNote}
        </p>
        {canBook ? (
          <p className="flat-note">
            <a href="./">ver como livro</a>
          </p>
        ) : null}
      </header>

      <ol className="flat-list">
        {PROJECTS.map((p) => (
          <li key={p.id} id={p.id}>
            <article className="flat-page">
              {p.print ? (
                <img
                  src={printUrl(p.print, 800)}
                  srcSet={`${printUrl(p.print, 640)} 640w, ${printUrl(p.print, 800)} 800w, ${printUrl(p.print, 1440)} 1440w`}
                  sizes="(max-width: 860px) 100vw, 800px"
                  width="1440"
                  height="900"
                  loading="lazy"
                  decoding="async"
                  alt={p.alt}
                />
              ) : null}
              <div className="flat-body">
                <p className="flat-num">{p.num} / 07 · {p.kind}</p>
                <h2>{p.name}</h2>
                <p className="flat-status">
                  <span className={`flat-led is-${p.led}`} aria-hidden="true" />
                  {p.status}
                </p>
                <p className="flat-tag">{p.tagline}</p>
                <dl>
                  <dt>papel</dt>
                  <dd>{p.role}</dd>
                  <dt>stack</dt>
                  <dd>{p.stack.join(' · ')}</dd>
                </dl>
                {p.links.length ? (
                  <p className="flat-links">
                    {p.links.map((l) => (
                      <a key={l.href} href={l.href} {...(l.href.startsWith('http') ? { target: '_blank', rel: 'noopener' } : {})}>
                        {l.label}
                        {l.href.startsWith('http') ? <span aria-hidden="true"> ↗</span> : null}
                      </a>
                    ))}
                  </p>
                ) : null}
              </div>
            </article>
          </li>
        ))}
      </ol>

      <footer className="flat-foot">
        <h2>{COPY.endTitle.join(' ')}</h2>
        <p className="flat-links">
          <a href={WHATSAPP} target="_blank" rel="noopener">chamar no WhatsApp <span aria-hidden="true">↗</span></a>
          <a href={SITE_HOME}>voltar pro site</a>
        </p>
      </footer>
    </main>
  )
}
