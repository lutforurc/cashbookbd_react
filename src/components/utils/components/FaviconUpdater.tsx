import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { API_REMOTE_URL } from '../../services/apiRoutes';
import { resolveAssetUrl } from '../../services/resolveAssetUrl';

interface Props {
  companyName?: string;
  companyLogo?: string;
  companyLogoDark?: string;
}

const FaviconUpdater = ({ companyName, companyLogo, companyLogoDark }: Props) => {
  const environment = useSelector((state: any) => state.settings?.data?.env);
  const [prefersDarkScheme, setPrefersDarkScheme] = useState(
    () => window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false,
  );

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media?.addEventListener) return;

    const onChange = (event: MediaQueryListEvent) => setPrefersDarkScheme(event.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const slugify = (text: string) => {
      return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
    };

    // The tab strip follows the OS/browser theme, not the app theme, so the
    // favicon variant is chosen by prefers-color-scheme. Each variant falls
    // back to the other when only one logo is uploaded.
    const activeLogo = prefersDarkScheme
      ? companyLogoDark || companyLogo
      : companyLogo || companyLogoDark;
    const logoFaviconUrl = resolveAssetUrl(activeLogo, environment);
    const api_remote_url =  API_REMOTE_URL  

    const dynamicFaviconUrl = companyName
      ? `${api_remote_url}/public/backend/${slugify(companyName)}.png`
      : '';
    // Before login there is no company to brand the tab with, so the bundled
    // CashBookBD icon stays — never another tenant's logo.
    const fallbackFaviconUrl = '/favicon.ico';

    const updateFavicon = (url: string) => {
      const timestamp = new Date().getTime(); // prevent caching
      const finalUrl = `${url}?v=${timestamp}`;

      let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }

      // index.html declares type="image/svg+xml"; reusing that tag for a PNG
      // logo leaves the declared type contradicting the file, and browsers
      // drop the icon. Let the browser sniff it instead.
      link.removeAttribute('type');
      link.href = finalUrl;
    };

    if (logoFaviconUrl) {
      updateFavicon(logoFaviconUrl);
      return;
    }

    if (!dynamicFaviconUrl) {
      updateFavicon(fallbackFaviconUrl);
      return;
    }

    const img = new Image();
    img.src = dynamicFaviconUrl;

    img.onload = () => {
      updateFavicon(dynamicFaviconUrl);
    };

    img.onerror = () => {
      console.warn('⚠️ Failed to load dynamic favicon. Falling back.');
      updateFavicon(fallbackFaviconUrl);
    };
  }, [companyName, companyLogo, companyLogoDark, environment, prefersDarkScheme]);

  return null; // This component doesn't render anything
};

export default FaviconUpdater;
