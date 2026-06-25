import { Link } from 'react-router-dom';
import { FOOTER } from '../data';

const COLUMNS: { title: string; links: readonly string[] }[] = [
  { title: 'Product', links: FOOTER.product },
  { title: 'Company', links: FOOTER.company },
  { title: 'Legal', links: FOOTER.legal },
];

export function Footer() {
  return (
    <footer className="border-t border-line/70 bg-surface/30">
      <div className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-accent-400 to-accent-700 text-sm font-bold text-white">P</span>
              <span className="text-sm font-semibold tracking-tight text-content">Pixel Academy</span>
            </div>
            <p className="mt-4 max-w-xs text-sm text-content-tertiary">
              The GST-native operating system for India’s webinar-led creative agencies.
            </p>
            <Link to="/login" className="mt-5 inline-flex rounded-full bg-accent/15 px-4 py-2 text-xs font-medium text-accent-200 transition-colors hover:bg-accent/25">
              Launch the app →
            </Link>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="text-2xs font-semibold uppercase tracking-[0.18em] text-content-tertiary">{col.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l}>
                    <a href="#top" className="text-sm text-content-secondary transition-colors hover:text-content">{l}</a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-line/60 pt-6 text-xs text-content-tertiary sm:flex-row">
          <p>© {new Date().getFullYear()} Pixel Academy. Made in India 🇮🇳 · GST-compliant invoicing.</p>
          <p className="flex items-center gap-4">
            <a href="#top" className="transition-colors hover:text-content">Privacy</a>
            <a href="#top" className="transition-colors hover:text-content">Terms</a>
            <a href="#top" className="transition-colors hover:text-content">Status</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
