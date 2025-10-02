// ImagePopup.tsx
import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { API_REMOTE_URL } from '../../services/apiRoutes';

declare global {
  interface JQuery {
    magnificPopup(options?: any): JQuery;
  }
}

interface Props {
  branchPad: string;
  voucher_image: string;
  title: string;
}

const ImagePopup = ({ branchPad, voucher_image, title }: Props) => {
  const environment = useSelector((state: any) => state.settings?.data?.env);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const initedRef = useRef(false); // avoid double init in StrictMode dev

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    (async () => {
      if (typeof window === 'undefined') return;       // SSR guard
      if (!rootRef.current) return;

      // 1) Load jQuery and attach to window BEFORE loading the plugin
      const jQmod: any = await import('jquery');
      const jQuery = jQmod.default || jQmod;
      (window as any).$ = jQuery;
      (window as any).jQuery = jQuery;

      // 2) Now load the plugin and CSS (order matters)
      await import('magnific-popup/dist/jquery.magnific-popup.js');
      await import('magnific-popup/dist/magnific-popup.css');

      const $ = jQuery;
      const $root = $(rootRef.current);

      if (initedRef.current) return; // guard against StrictMode double-effect
      initedRef.current = true;

      // 3) Initialize
      $root.magnificPopup({
        delegate: 'a:not([data-pdf])',
        type: 'image',
        gallery: { enabled: true },
        image: { verticalFit: true },
        zoom: { enabled: true, duration: 300, easing: 'ease-in-out' },
        callbacks: {
          open: function () {
            $('.mfp-wrap').css('z-index', 999999);
            $('.mfp-bg').css('z-index', 999998);
          },
        },
      });

      // 4) Cleanup on unmount
      cleanup = () => {
        try { $root.magnificPopup('destroy'); } catch {}
      };
    })();

    return () => cleanup?.();
  }, []); // initialize once

  if (!branchPad || !voucher_image) return null;

  const images = voucher_image.split('|');
  const isPDF = (img: string) => img.toLowerCase().endsWith('.pdf');

  let imageUrl = `${API_REMOTE_URL}/public/project_voucher/${branchPad}`;
  if (environment === 'local') {
    imageUrl = `${API_REMOTE_URL}/project_voucher/${branchPad}`;
  }

  return (
    <div ref={rootRef} className="popup-image-group flex gap-1">
      {images.map((img, index) =>
        isPDF(img) ? (
          <a
            key={index}
            href={`${imageUrl}/voucher/${img}`}
            title={title}
            target="_blank"
            rel="noopener noreferrer"
            data-pdf="true"
          >
            📄 Doc {index + 1}
          </a>
        ) : (
          <a
            key={index}
            href={`${imageUrl}/voucher/${img}`}
            title={`Voucher Image ${index + 1}`}
          >
            <img
              src={`${imageUrl}/thumbnail/${img}`}
              alt={`Voucher ${index + 1}`}
              width={30}
              className="border rounded-sm shadow-sm hover:shadow-md transition-shadow duration-300"
            />
          </a>
        )
      )}
    </div>
  );
};

export default ImagePopup;
