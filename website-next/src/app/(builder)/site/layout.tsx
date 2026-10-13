// The builder is a client application: it reads a token from a cookie and calls
// the site API with it. There is no server-side auth to do here.
export const dynamic = 'force-dynamic';

export default function BuilderLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
