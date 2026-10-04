# SƏDA — presentation demo

[Open the live demo](https://kulieff21.github.io/seda-agent-evaluation-demo/)

A static, sanitized replica of the SƏDA audio-store interface for presentations.
It keeps the original products, product photography and store flows, presented in a
redesigned "listening room" visual system (light and dark themes, motion that respects
`prefers-reduced-motion`). It is **not the application used in the private evaluation**.

There is no backend, database, authentication service, payment processing or email delivery.
All products, people, addresses and orders are fictional. Account and commerce actions
run in the browser and persist only in localStorage. Password fields are simulated:
their values are never stored or transmitted. Use fictional data only.

## Presenting

- The hero plays the four featured models like tracks; hover the photo to pause, or pick one.
- Browse the eight-product collection as a tracklist: hovering a row loads it on the listening stand.
  Search, filter and sort as before; switch themes from the header.
- Drag the **Adaptiv sakitlik** slider to see how noise cancellation removes ambient noise (schematic).
- Open a product detail page and add products to the cart.
- Open **Hesab** and choose **Demo müştəri** to view the sample customer, orders and warranty.
- Choose **Demo Studio** on the login screen to explore inventory, order progression and review moderation.
- Checkout creates a fictional order. `SALAM10` gives 10% off; `TEKSES20` gives 20% off once per demo profile.
- Support manuals download as local text files. The media preview resolves only fictional sample links and makes no request.
- **Demonu sıfırla** in the footer restores sample data before another presentation.

Product and account routes support direct links, reload and browser Back under the GitHub Pages repository path.
Known views have static entry points; the Pages 404 document restores dynamic warranty routes.
After all page assets have loaded, app interactions work without a network connection.
A new browser page still needs its initial HTML, JavaScript, styles and local media from the host.

Product photos are served as WebP derivatives (same pixel size) of the PNG masters in
`src/assets/images/`. Display type is Bricolage Grotesque, with IBM Plex Sans and Plex Mono (OFL).

## Development

Node.js 22 or newer:

```sh
npm ci
npm run dev
npm run verify
npm run preview
```

Vite serves the app at `/seda-agent-evaluation-demo/`. `npm run verify` runs local-flow
tests, type checking, a production build and static-release checks. Only React and React DOM
are production dependencies. No private repository history, server files, experiment evidence,
challenge definitions or evaluation tooling is included.

## Deployment

The `pages.yml` workflow verifies the app and publishes `dist` through GitHub Pages
on pushes to `main`. The repository Pages source must be **GitHub Actions**.
