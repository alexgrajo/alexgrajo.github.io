# Authentication and request flow

This is a public static portfolio, not an application with user accounts.

## Components

- `index.html` contains the redesigned homepage, CSS, and links to local images.
- `script.js` handles the mobile menu, current year, and optional photo tilt. It makes no authentication requests.
- `upwork.html` remains the existing secondary portfolio page.
- `experience.js` and `vendor/three.module.min.js` are legacy visual experience assets. The redesigned homepage does not load them.

## Request flow

1. A visitor requests the public homepage from the static host.
2. The browser parses the HTML and applies the embedded stylesheet and requests local images, favicon, and `script.js`. The embedded CSS needs no separate network request.
3. JavaScript updates navigation state and the displayed year. Internal links scroll to sections; project details use native HTML disclosure controls.
4. The email link delegates to the visitor’s email application. Upwork and GitHub links open those external services, which manage their own authentication.

## Credentials and tokens

The redesigned homepage has no login component, authentication middleware, protected API, session cookie, password storage, OAuth callback, JWT, refresh token, or API key. It does not collect credentials or store tokens in browser storage. The contact email address is intentionally public contact information, not a secret.

The previous compiled homepage used localStorage for appearance preferences such as `mode` and `palette-*`; those were UI preferences rather than authentication tokens. Its module-preload code contained a standard `fetch` credentials option, which by itself did not implement a login flow.

Repository editing and deployment access are separate from visitor access. GitHub manages that access outside the public website; no GitHub credential is included in the new homepage. Repository files alone cannot establish the account’s private GitHub settings or external provider session policies.
