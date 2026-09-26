import Layout from '../components/Layout';
import styles from '../styles/Setup.module.css';

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
          <div className={styles.codeHeader}>Terminal</div>
          <pre className={styles.pre}><code>{`git clone https://github.com/ibm-build-lab/subtext.git
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
          <div className={styles.codeHeader}>Scan a cloned repo</div>
          <pre className={styles.pre}><code>{`# Scan a cloned repo
npx ts-node src/index.ts ../some-repo --verbose

# With the Granite Guardian judge step (requires Ollama or watsonx env vars)
npx ts-node src/index.ts ../some-repo --judge --verbose`}</code></pre>
        </div>
        <p className={styles.note}>Exit code <code className={styles.ic}>2</code> means <strong>BLOCK</strong> — safe for CI pipelines.</p>
      </section>

      {/* ── Bob Security Gate ── */}
      <section className={styles.section}>
        <div className={styles.sectionNum}>03</div>
        <h2 className={styles.h2}>Use with IBM Bob</h2>
        <p className={styles.body}>
          Bob&rsquo;s <strong>Security Gate</strong> mode treats repo content as data and never as instructions. It runs Subtext automatically and only hands off to Agent mode when the verdict is SAFE.
        </p>
        <div className={styles.codeBlock}>
          <div className={styles.codeHeader}>Bob workflow</div>
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
              <pre className={styles.pre}><code>{`ollama pull granite4.1-guardian:8b-q4_K_M
# .env
OLLAMA_URL=http://localhost:11434`}</code></pre>
            </div>
          </div>
          <div className={styles.providerCard}>
            <div className={styles.providerTitle}>watsonx.ai (cloud)</div>
            <div className={styles.providerDesc}>Set three env vars. The scanner exchanges your API key for an IAM token automatically.</div>
            <div className={styles.codeBlock}>
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
          <div className={styles.codeHeader}>GitHub Actions example</div>
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
