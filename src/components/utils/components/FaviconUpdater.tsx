import { useEffect } from 'react';
import { API_REMOTE_URL } from '../../services/apiRoutes';

interface Props {
  companyName?: string;
  companyLogo?: string;
}

const resolveImageUrl = (path?: string) => {
  if (!path) return '';
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  return `${API_REMOTE_URL}/${path.replace(/^\/+/, '').replace(/^public\//i, '')}`;
};

const FaviconUpdater = ({ companyName, companyLogo }: Props) => {
  useEffect(() => {
    const slugify = (text: string) => {
      return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
    };

    const logoFaviconUrl = resolveImageUrl(companyLogo);
    const api_remote_url =  API_REMOTE_URL  

    const dynamicFaviconUrl = companyName
      ? `${api_remote_url}/public/backend/${slugify(companyName)}.png`
      : '';
    const fallbackFaviconUrl = `${api_remote_url}/public/backend/nibir-nirman.png`;

    const updateFavicon = (url: string) => {
      const timestamp = new Date().getTime(); // prevent caching
      const finalUrl = `${url}?v=${timestamp}`;

      let link = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
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
