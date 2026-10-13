import Link from 'next/link';
import { getShell } from '@/lib/site-data';

export const dynamic = 'force-dynamic';

/**
 * The public 404. It is deliberately public: a visitor is shown what is wrong
 * with the website, never the admin's login page.
 */
export default async function NotFound() {
  const shell = await getShell();
  const known = shell.ok;
  const published = known && shell.data.site.published;

  let title = 'Page not found';
  let message = 'This page is not available on this website.';

  if (known && !published) {
    title = 'Website not published yet';
    message = 'This company website is not available yet. Please check back soon.';
  } else if (!known) {
    title = 'Website not available';
    message = 'No company website is served at this address.';
  }

  return (
    <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', textAlign: 'center', padding: 24 }}>
      <div>
        <h1 style={{ fontSize: '1.6rem' }}>{title}</h1>
        <p className="muted">{message}</p>
        <p><Link className="btn btn-primary" href="/">Go to the home page</Link></p>
      </div>
    </div>
  );
}
