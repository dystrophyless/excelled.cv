# Novio deployment

GitHub Actions tests the FastAPI API against PostgreSQL, runs frontend lint and Playwright, and starts the API image with the production Docker Compose settings. Only a successful run on `main` publishes the tested API image to the rolling `aws-deploy` prerelease. Its OCI revision label records the source commit.

1. Link the GitHub repository in Vercel with the Vite preset, root directory `frontend`, and production branch `main`. Identify the public production HTTPS URL.
2. In AWS Stockholm, create the SecureString parameter `/novio/production/resend-api-key` with the standard `aws/ssm` key. Upload [aws.yaml](aws.yaml) in the CloudFormation console. Supply the Git SHA containing the bootstrap scripts and the Vercel URL as `FrontendOrigin`, without a trailing slash. Acknowledge the scoped IAM role. The default Resend sender has recipient restrictions.
3. Set `NOVIO_API_ORIGIN` in Vercel's production environment to the stack's `Url` output. Deploy the frontend. Confirm a direct SPA route loads and check the proxy with `bash deploy/smoke.sh https://VERCEL_HOST https://VERCEL_HOST`. Check sign-in and a CV upload with a test account.

API requests use the frontend origin through the Vercel rewrite. Keep the production backend variable scoped to production. A Vercel preview without a backend can display the SPA and returns HTTP 503 for API requests.

EC2 stores PostgreSQL (including CVs), credentials, and TLS state on retained encrypted EBS. A systemd timer checks for releases every five minutes, verifies the asset's SHA-256, runs schema upgrades, and replaces the application containers. A failed startup or smoke check restores the previous image and skips the failed asset. Publish a corrected asset to retry. Schema changes need to stay compatible with the previous image during a release. EC2's system log includes deployment diagnostics.

CloudFormation parameters such as `BootstrapRevision`, `FrontendOrigin` and `ResendFromEmail` are first-boot settings. Updating CloudFormation parameters alone does not rerun cloud-init on the live instance. GitHub Actions needs no AWS keys.
