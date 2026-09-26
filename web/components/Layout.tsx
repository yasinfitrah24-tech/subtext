import Nav from './Nav';
import Head from 'next/head';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export default function Layout({ children, title, description }: LayoutProps) {
  const pageTitle = title ? `${title} — Subtext` : 'Subtext: scan the repo before your agent reads it';
  const pageDesc = description ?? 'Subtext finds hidden prompt injection attacks before your AI coding agent obeys them.';

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" type="image/png" href="/favicon-32.png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </Head>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
        <Nav />
        <main style={{ flexGrow: 1 }}>
          {children}
        </main>
        <footer style={{
          padding: '40px clamp(24px, 8vw, 120px)',
          borderTop: '1px solid #1E2940',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          fontSize: '14px',
          color: '#7F8CA3',
        }}>
          <span>Built with IBM Bob + Granite</span>
          <span>MIT License · <a href="https://github.com/ibm-build-lab/subtext" style={{ color: '#7F8CA3' }}>GitHub</a></span>
        </footer>
      </div>
    </>
  );
}
