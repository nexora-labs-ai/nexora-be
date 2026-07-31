# GitHub Actions and Mezon setup

The repository contains four workflows:

- `Backend CI`: required PR checks for formatting/lint, type safety, Prisma, unit coverage,
  PostgreSQL/Redis end-to-end tests, production dependency audit, and Docker build.
- `Release`: verifies an existing release tag, publishes the image to GHCR, and creates a signed
  provenance attestation.
- `Deploy`: manually triggers a provider deploy hook through a protected GitHub Environment and
  optionally waits for the application health endpoint.
- `Mezon Notifications`: reports PR, review, CI, release, and deployment results to a Mezon channel.

## 1. Create the Mezon webhook

1. In Mezon, open the destination channel.
2. Select **Edit Channel** → **Integrations** → **New Webhook**.
3. Choose the webhook name/avatar and copy its webhook URL.
4. In GitHub, open **Settings** → **Secrets and variables** → **Actions**.
5. Create a repository secret named `MEZON_WEBHOOK_URL` containing the full copied URL.

Do not put the Mezon URL in source code, logs, repository variables, or PR comments. A fork PR cannot
read this secret; its CI completion can still be reported by the safe `workflow_run` notification.

## 2. Configure deployment environments

Create GitHub Environments named `staging` and `production`.

For each environment, configure:

| Kind     | Name                 | Value                                                           |
| -------- | -------------------- | --------------------------------------------------------------- |
| Secret   | `DEPLOY_WEBHOOK_URL` | Provider deploy-hook URL                                        |
| Variable | `APP_URL`            | Public application URL                                          |
| Variable | `APP_HEALTH_URL`     | Full health URL, e.g. `https://api.example.com/api/health/live` |

For `production`, enable required reviewers, prevent self-review, and restrict deployment branches or
tags. The Deploy workflow intentionally remains manual because this repository does not identify a
deployment provider. The provider hook must already be configured to deploy the intended repository,
branch, or GHCR image.

## 3. Protect merge branches

Create rulesets for `main` and `dev` with:

- Require a pull request before merging.
- Require at least one approval (two for `main` if the team size allows it).
- Dismiss stale approvals when new commits are pushed.
- Require review from Code Owners after a `CODEOWNERS` file is added.
- Require all conversations to be resolved.
- Require the `CI Gate` status check and require the branch to be up to date.
- Block force pushes and branch deletion.
- Restrict direct pushes to maintainers or release automation.

`CI Gate` is the stable aggregate check. Requiring only this check avoids updating the ruleset whenever
the internal CI job graph changes.

## 4. Release and deploy

1. Merge only after `CI Gate` passes.
2. Create an annotated SemVer tag such as `v1.2.3`.
3. Publish a GitHub Release for that tag. The `Release` workflow re-runs all checks and publishes:
   `ghcr.io/<owner>/<repository>:1.2.3`, `:1.2`, `:sha-...`, and `:latest` for stable releases.
4. Run the `Deploy` workflow, select the environment, and approve the protected environment when
   prompted.
5. Confirm the health verification and Mezon deployment notification.

The manual Release dispatch is only for retrying an existing tag; it does not create tags or GitHub
Releases.
