# AskFirst

A family purchase-request app built with the [DeepSpace SDK](https://github.com/deepdotspace). Children request items with a checkout link; parents review and decide. AskFirst never handles payments or card details.

## Features

- Child profiles with PIN-based demo selection, avatars, and monthly allowances
- Purchase requests with item details, price, category, and required retailer checkout URL
- Live parent inbox with approve or deny decisions and optional feedback notes
- Allowance tracking that counts approved requests
- AI safety and hidden-cost assessments backed by web research and source links
- Parent can generate an assessment for pending or already-decided requests; it never changes the decision
- Google OAuth sign-in for parent access

The fingerprint control is a demo of a future biometric flow, not device authentication. AI assessments are guidance for the parent and may be incomplete or wrong.

## Development

Requires a supported Node.js version listed in `package.json` and npm 11.6 or later.

```bash
npm install
npx deepspace auth login
npm run dev
```

`npm run dev` starts the Vite frontend and local Cloudflare Worker environment. Local development values are managed in `.dev.vars`; do not commit that file.

## Testing

```bash
npm run test:unit   # Vitest unit tests
npm run type-check  # TypeScript check
npm run lint        # ESLint
npm run validate    # Type-check and unit tests
```

## Deployment

Sign in to the DeepSpace CLI, commit the changes you intend to deploy, and deploy from a clean worktree:

```bash
npx deepspace auth login
npm run deploy
```

The deployed app uses the name configured in `wrangler.toml` and is hosted on DeepSpace.
