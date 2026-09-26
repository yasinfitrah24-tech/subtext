import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from './Nav.module.css';

const LOGO_SVG = (
  <svg width="32" height="32" viewBox="0 0 48 48" fill="none" aria-hidden="true">
    <path d="M24 4L40 10V23C40 33 33 40.5 24 44C15 40.5 8 33 8 23V10Z" fill="#161F31" stroke="#F2A93B" strokeWidth="3.4" strokeLinejoin="round"/>
    <path d="M18 18L13 24L18 30" stroke="#F3F1EC" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M30 18L35 24L30 30" stroke="#F3F1EC" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M24 16.5V26" stroke="#F2A93B" strokeWidth="3.4" strokeLinecap="round"/>
    <circle cx="24" cy="31" r="2.1" fill="#F2A93B"/>
  </svg>
);

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/demo', label: 'Demo' },
  { href: '/setup', label: 'Setup' },
];

export default function Nav() {
  const router = useRouter();

  return (
    <nav className={styles.nav}>
      <Link href="/" className={styles.logo}>
        {LOGO_SVG}
        <span className={styles.logoText}>Subtext</span>
      </Link>
      <div className={styles.links}>
        {NAV_LINKS.map(({ href, label }) => {
          const active = router.pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={styles.link}
              style={{
                borderBottom: active ? '2px solid #F2A93B' : '2px solid transparent',
                color: active ? '#F3F1EC' : '#AEBBD0',
                fontWeight: active ? 600 : 400,
              }}
            >
              {label}
            </Link>
          );
        })}
        <a
          href="https://github.com/yasinfitrah24-tech/subtext"
          className={styles.ghBtn}
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
      </div>
    </nav>
  );
}
