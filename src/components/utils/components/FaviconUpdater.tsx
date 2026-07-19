import { useEffect } from 'react';
import { API_REMOTE_URL } from '../../services/apiRoutes';
import { resolveAssetUrl } from '../../services/resolveAssetUrl';

interface Props {
  companyName?: string;
  companyLogo?: string;
}

const FaviconUpdater = ({ companyName, companyLogo }: Props) => {
  useEffect(() => {
    const slugify = (text: string) => {
      return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
    };

    const logoFaviconUrl = resolveAssetUrl(companyLogo);
    const api_remote_url =  API_REMOTE_URL  

    const dynamicFaviconUrl = companyName
      ? `${api_remote_url}/public/backend/${slugify(companyName)}.png`
      : '';
    const fallbackFaviconUrl = `${api_remote_url}/public/backend/nibir-nirman.png`;

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
  }, [companyName, companyLogo]);

  return null; // This component doesn't render anything
};

export default FaviconUpdater;
