import { useState, useCallback } from 'react';
import Layout from '../components/Layout';
import styles from '../styles/Setup.module.css';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);
  return (
    <button
      className={`${styles.copyBtn} ${copied ? styles.copyDone : ''}`}
      onClick={copy}
      aria-label={copied ? 'Copied' : 'Copy to clipboard'}
      title={copied ? 'Copied' : 'Copy'}
    >
      {copied ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="12" height="12" rx="3" />
          <path d="M15 5.5V5a2 2 0 0 0-2-2H6a3 3 0 0 0-3 3v7a2 2 0 0 0 2 2h.5" />
        </svg>
      )}
    </button>
  );
}

export default function SetupPage() {
  return (
    <Layout title="Setup" description="Install and configure Subtext — the prompt injection scanner for AI coding agents.">
      {/* ── Header ── */}
      <section className={styles.header}>
        <div className={styles.eyebrow}>SETUP</div>
        <h1 className={styles.h1}>Get started in two steps.</h1>
        <div className={styles.italic}>Zero agents run during install.</div>
        <p className={styles.body}>
          The scanner runs in your terminal — it never calls an external API during the scan. The Granite Guardian judge step is optional and only activates when you configure watsonx or Ollama.
        </p>
      </section>

      {/* ── Install ── */}
      <section className={styles.section}>
        <div className={styles.sectionNum}>01</div>
        <h2 className={styles.h2}>Install the scanner</h2>
        <p className={styles.body}>Clone the repo and install dependencies from the <code className={styles.ic}>/scanner</code> folder.</p>
        <div className={styles.codeBlock}>
          <div className={styles.codeHeader}>
            <span>Terminal</span>
            <CopyButton text={`git clone https://github.com/yasinfitrah24-tech/subtext.git\ncd subtext/scanner\nnpm install\nnpm run build`} />
          </div>
          <pre className={styles.pre}><code>{`git clone https://github.com/yasinfitrah24-tech/subtext.git
cd subtext/scanner
npm install
npm run build`}</code></pre>
        </div>
        <p className={styles.note}>The CLI is now available as <code className={styles.ic}>node dist/index.js</code> or via <code className={styles.ic}>npx ts-node src/index.ts</code>.</p>
      </section>

      {/* ── Scan a repo ── */}
      <section className={styles.section}>
        <div className={styles.sectionNum}>02</div>
        <h2 className={styles.h2}>Scan a repo</h2>
        <p className={styles.body}>Point the scanner at any local directory. It reads every text file and returns a score, verdict, and list of findings.</p>
        <div className={styles.codeBlock}>
          <div className={styles.codeHeader}>
            <span>Scan a cloned repo</span>
            <CopyButton text={`# Scan a cloned repo\nnpx ts-node src/index.ts ../some-repo --verbose\n\n# With the Granite Guardian judge step (requires Ollama or watsonx env vars)\nnpx ts-node src/index.ts ../some-repo --judge --verbose\n\n# Write clean copies of flagged files to ./clean (originals untouched)\nnpx ts-node src/index.ts ../some-repo --sanitize ./clean`} />
          </div>
          <pre className={styles.pre}><code>{`# Scan a cloned repo
npx ts-node src/index.ts ../some-repo --verbose

# With the Granite Guardian judge step (requires Ollama or watsonx env vars)
npx ts-node src/index.ts ../some-repo --judge --verbose

# Write clean copies of flagged files to ./clean (originals untouched)
npx ts-node src/index.ts ../some-repo --sanitize ./clean`}</code></pre>
        </div>
        <p className={styles.note}>Exit code <code className={styles.ic}>2</code> means <strong>BLOCK</strong> — safe for CI pipelines. <code className={styles.ic}>--sanitize</code> writes a clean copy of each flagged file plus <code className={styles.ic}>SUBTEXT_CHANGES.md</code>, and never touches the originals.</p>
      </section>

      {/* ── Bob Security Gate ── */}
      <section className={styles.section}>
        <div className={styles.sectionNum}>03</div>
        <h2 className={styles.h2}>Use with IBM Bob</h2>
        <p className={styles.body}>
          Bob&rsquo;s <strong>Security Gate</strong> mode treats repo content as data and never as instructions. It runs Subtext automatically and only hands off to Agent mode when the verdict is SAFE.
        </p>
        <div className={styles.codeBlock}>
          <div className={styles.codeHeader}>
            <span>Bob workflow</span>
            <CopyButton text={`# In Bob: switch to Security Gate mode, then:\n1. Paste or provide the repo path\n2. Bob runs subtext scan automatically\n3. Findings surface before any agent reads the files\n4. SAFE → continue in Agent mode\n   REVIEW/BLOCK → inspect findings first`} />
          </div>
          <pre className={styles.pre}><code>{`# In Bob: switch to Security Gate mode, then:
1. Paste or provide the repo path
2. Bob runs subtext scan automatically
3. Findings surface before any agent reads the files
4. SAFE → continue in Agent mode
   REVIEW/BLOCK → inspect findings first`}</code></pre>
        </div>
      </section>

      {/* ── Optional: Granite Guardian ── */}
      <section className={styles.section}>
        <div className={styles.sectionNum}>04</div>
        <h2 className={styles.h2}>Optional: Granite Guardian</h2>
        <p className={styles.body}>The rule engine runs in under 1 ms. For borderline cases you can escalate flagged snippets to IBM Granite Guardian for a second opinion.</p>

        <div className={styles.providerGrid}>
          <div className={styles.providerCard}>
            <div className={styles.providerTitle}>Ollama (local)</div>
            <div className={styles.providerDesc}>Pull <code className={styles.ic}>granite4.1-guardian:8b-q4_K_M</code> and set <code className={styles.ic}>OLLAMA_URL</code>.</div>
            <div className={styles.codeBlock}>
              <div className={styles.codeHeader}>
                <span />
                <CopyButton text={`ollama pull granite4.1-guardian:8b-q4_K_M\n# .env\nOLLAMA_URL=http://localhost:11434`} />
              </div>
              <pre className={styles.pre}><code>{`ollama pull granite4.1-guardian:8b-q4_K_M
# .env
OLLAMA_URL=http://localhost:11434`}</code></pre>
            </div>
          </div>
          <div className={styles.providerCard}>
            <div className={styles.providerTitle}>watsonx.ai (cloud)</div>
            <div className={styles.providerDesc}>Set three env vars. The scanner exchanges your API key for an IAM token automatically.</div>
            <div className={styles.codeBlock}>
              <div className={styles.codeHeader}>
                <span />
                <CopyButton text={`# .env\nWATSONX_API_KEY=your-ibm-cloud-api-key\nWATSONX_PROJECT_ID=your-project-id\nWATSONX_URL=https://us-south.ml.cloud.ibm.com`} />
              </div>
              <pre className={styles.pre}><code>{`# .env
WATSONX_API_KEY=your-ibm-cloud-api-key
WATSONX_PROJECT_ID=your-project-id
WATSONX_URL=https://us-south.ml.cloud.ibm.com`}</code></pre>
            </div>
          </div>
        </div>

        <div className={styles.noteCard}>
          <span className={styles.noteIcon}>ℹ</span>
          <span>If neither provider is configured, the scanner falls back to a cached keyword heuristic and labels results as <code className={styles.ic}>provider: cached</code>. This is the default on Vercel.</span>
        </div>
      </section>

      {/* ── CI integration ── */}
      <section className={styles.section}>
        <div className={styles.sectionNum}>05</div>
        <h2 className={styles.h2}>CI / pre-merge gate</h2>
        <p className={styles.body}>Add Subtext as a CI step to block BLOCK-verdict PRs before they&rsquo;re merged.</p>
        <div className={styles.codeBlock}>
          <div className={styles.codeHeader}>
            <span>GitHub Actions example</span>
            <CopyButton text={`- name: Scan for prompt injections\n  run: |\n    cd scanner\n    npm ci\n    npm run build\n    node dist/index.js ../. --verbose\n  # Exit code 2 = BLOCK — fails the workflow`} />
          </div>
          <pre className={styles.pre}><code>{`- name: Scan for prompt injections
  run: |
    cd scanner
    npm ci
    npm run build
    node dist/index.js ../. --verbose
  # Exit code 2 = BLOCK — fails the workflow`}</code></pre>
        </div>
      </section>
    </Layout>
  );
}
