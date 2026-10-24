# Logbrief assessment

Logbrief is a small, dependency-free Node.js CLI that summarizes a local JSONL
log export by service and severity. This repository contains the runnable
demo, synthetic fixtures, automated tests, and a five-page Thally documentation
site.

## Get the source

Source repository: [Logbrief assessment](https://github.com/lukasa1993/logbrief-thally-assessment).
Clone the source and enter the project directory:

```bash
git clone https://github.com/lukasa1993/logbrief-thally-assessment
cd logbrief-thally-assessment
```

## Run the demo

Use Node.js 24.19.0, the version tested for this project. From this directory:

```bash
node demo/logbrief.mjs demo/examples/release.jsonl
node demo/logbrief.mjs demo/examples/release.jsonl --service checkout --min-level error
```

The first command reads six records and matches all six. It reports two
catalog records, four checkout records, and three errors overall. The second
matches the two checkout errors.

No package installation, account, API key, or network request is needed to
run the CLI. It leaves the input file unchanged. See the
[quickstart](src/content/quickstart.mdx) for exact output and the
[CLI reference](src/content/reference/cli.mdx) for validation rules and exit
codes.

## Run the tests

```bash
node --test demo/logbrief.test.mjs
```

The verified run passed all 12 tests. They cover counts, severity and service
filters, no matches, empty input, line endings, invalid records, read errors,
and argument handling. The downloadable
[demo ZIP](public/downloads/logbrief-demo.zip) was extracted and its test suite
also passed.

All fixtures are synthetic. Logbrief is an assessment demo, not a production
monitoring system; it does not collect logs, diagnose incidents, compare files
automatically, or redact service names.

## Set up the documentation site

The website has dependencies separate from the dependency-free CLI. Use
Node.js 24.19.0 and npm, then install the checked-in lockfile:

```bash
npm ci
```

If installation is interrupted, preserve the lockfile and authored files.
The [build article](src/content/articles/build-logbrief-docs.mdx) records the
environment-specific recovery used during this assessment. Those constrained
installation options are not the recommended default.

## Validate and preview the site

Run the content and type checks:

```bash
npx --yes --package=@thallylabs/cli@0.8.124 thally check --ci .
npm run typecheck
```

Start a development preview:

```bash
npm run dev
```

The configured local address is `http://localhost:3040`. Before publication,
check navigation, the demo download, code blocks, and narrow-screen layout.

For a production build and local production preview:

```bash
npm run build
npm run start
```

Run `npm run start` only after a successful build. No API keys are required
for these docs; AI chat is disabled. If optional services are added, keep
credentials in `.env.local` or hosting secret storage, never in source.

## Documentation source

- [Introduction](src/content/introduction.mdx)
- [Working quickstart](src/content/quickstart.mdx)
- [Practical comparison guide](src/content/guides/compare-release-logs.mdx)
- [CLI reference](src/content/reference/cli.mdx)
- [Setup and publishing article](src/content/articles/build-logbrief-docs.mdx)

Navigation is in `docs.json`; site identity is in `src/data/site.ts`.

The active GitHub workflow validates pull requests or a manual run with
read-only repository permissions. Scheduled and agent starter workflows are
retained as inactive reference files under `reference/starter-workflows/`.

## Verification and publication status

Verified by automated execution:

- All 12 demo tests pass.
- Four documented command/JSON pairs match the actual output exactly.
- Thally CLI 0.8.124 reports zero errors and zero warnings.
- Runtime-source generation succeeds for the five MDX pages.
- A fresh non-incremental TypeScript check passed on 24 October 2026
  (`tsc --noEmit --incremental false`, exit 0 in 8.04 seconds, with a 768 MB
  Node heap cap).

The production webpack build was deliberately stopped after 180 seconds
while still compiling, without a reported product error. The development
server became ready, but its page request disconnected before an HTTP
response was received. The production build, rendered HTML, screenshots,
and managed publication remain unverified.

Published documentation and article URLs are pending. The source repository
linked above is separate from a Thally Cloud deployment; do not treat a
repository or local preview as a confirmed managed publication.

## Provenance and license

The Logbrief demo and documentation were prepared with AI assistance.
Command examples and test results were checked by automation; they are not
claims of personal execution by Luka.

The documentation framework comes from the official
[Thally starter](https://github.com/thallylabs/starter), scaffolded with
`create-thally-docs@0.10.121`. Runtime-owned files are a generated snapshot of
[thallylabs/thally](https://github.com/thallylabs/thally), pinned in
`starter-release.json` to commit
`2e0943562b12047c446a4e48c2a5570b0dd3de26`. Preserve that manifest and follow
`AGENTS.md` for ownership boundaries rather than hand-editing the runtime.

The upstream [MIT license](LICENSE) and its copyright notice are preserved.
