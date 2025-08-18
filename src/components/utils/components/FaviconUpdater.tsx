import { useEffect } from 'react';

interface Props {
  companyName?: string;
}

const FaviconUpdater = ({ companyName }: Props) => {
  useEffect(() => {
    if (!companyName) return;

    const slugify = (text: string) => {
      return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
    };

    const sluggedName = slugify(companyName);
    const dynamicFaviconUrl = `https://nibirnirman.cashbookbd.com/public/backend/${sluggedName}.png`;
    const fallbackFaviconUrl = 'https://nibirnirman.cashbookbd.com/public/backend/nibir-nirman.png';

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

    const img = new Image();
    img.src = dynamicFaviconUrl;

    img.onload = () => {
      updateFavicon(dynamicFaviconUrl);
    };

    img.onerror = () => {
      console.warn('⚠️ Failed to load dynamic favicon. Falling back.');
      updateFavicon(fallbackFaviconUrl);
    };
  }, [companyName]);

  return null; // This component doesn't render anything
};

export default FaviconUpdater;
