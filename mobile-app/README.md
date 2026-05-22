# CashBookBD Mobile

React Native/Expo WebView app shell for the existing CashBookBD web app.

## Run

```bash
npm install
npm start
```

For web preview, Expo runs on `http://localhost:8080` because that origin is allowed by the backend CORS config:

```bash
npm run web
```

If you ever need the local API proxy, set `EXPO_PUBLIC_API_PROXY_URL=http://localhost:3001` and run `npm run proxy` in another terminal.

Set `EXPO_PUBLIC_WEB_URL` if the app should open a different web host.

```bash
EXPO_PUBLIC_WEB_URL=https://app.cashbookbd.com npm start
```

## Included

- Single native WebView
- Existing web UI/design
- Loading indicator
- Reload view when the web page cannot be opened
