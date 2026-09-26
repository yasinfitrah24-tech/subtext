import Link from 'next/link';
import Layout from '../components/Layout';
import styles from '../styles/NotFound.module.css';

export default function NotFound() {
  return (
    <Layout title="404 — Page not found">
      <section className={styles.container}>
        <div className={styles.code}>404</div>
        <div className={styles.headline}>Page not found.</div>
        <div className={styles.italic}>This repo looks clean.</div>
        <p className={styles.body}>
          The page you&rsquo;re looking for doesn&rsquo;t exist — or was already scanned and found safe.
        </p>
        <div className={styles.pre}>
          <code>{`[SAFE] score=0/100  findings=0`}</code>
        </div>
        <Link href="/" className={styles.btn}>
          ← Back to home
        </Link>
      </section>
    </Layout>
  );
}
