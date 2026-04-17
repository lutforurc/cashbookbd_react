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
  onRemoveImage?: (imageName: string) => void;
  removingImage?: string | null;
}

const ImagePopup = ({
  branchPad,
  voucher_image,
  title,
  onRemoveImage,
  removingImage,
}: Props) => {
  const environment = useSelector((state: any) => state.settings?.data?.env);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const initedRef = useRef(false);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    (async () => {
      if (typeof window === 'undefined') return;
      if (!rootRef.current) return;

      const jQmod: any = await import('jquery');
      const jQuery = jQmod.default || jQmod;
      (window as any).$ = jQuery;
      (window as any).jQuery = jQuery;

      await import('magnific-popup/dist/jquery.magnific-popup.js');
      await import('magnific-popup/dist/magnific-popup.css');

      const $ = jQuery;
      const $root = $(rootRef.current);

      if (initedRef.current) return;
      initedRef.current = true;

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

      cleanup = () => {
        try {
          $root.magnificPopup('destroy');
        } catch {}
      };
    })();

    return () => cleanup?.();
  }, []);

  if (!branchPad || !voucher_image) return null;

  const images = voucher_image.split('|').filter(Boolean);
  const isPDF = (img: string) => img.toLowerCase().endsWith('.pdf');

  let imageUrl = `${API_REMOTE_URL}/public/project_voucher/${branchPad}`;
  if (environment === 'local') {
    imageUrl = `${API_REMOTE_URL}/project_voucher/${branchPad}`;
  }

  return (
    <div ref={rootRef} className="popup-image-group flex flex-wrap gap-1">
      {images.map((img, index) =>
        isPDF(img) ? (
          <div key={index} className="relative inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1">
            <a
              href={`${imageUrl}/voucher/${img}`}
              title={title}
              target="_blank"
              rel="noopener noreferrer"
              data-pdf="true"
              className="text-xs text-blue-700"
            >
              Doc {index + 1}
            </a>
            {onRemoveImage && (
              <button
                type="button"
                onClick={() => onRemoveImage(img)}
                disabled={removingImage === img}
                className="rounded px-1 text-xs font-bold text-slate-400 transition hover:bg-slate-100 hover:text-red-500 disabled:cursor-not-allowed disabled:text-slate-300"
                aria-label={`Remove ${img}`}
              >
                {removingImage === img ? '...' : 'x'}
              </button>
            )}
          </div>
        ) : (
          <div key={index} className="relative inline-flex">
            <a
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
            {onRemoveImage && (
              <button
                type="button"
                onClick={() => onRemoveImage(img)}
                disabled={removingImage === img}
                className="absolute -right-1 -top-1 rounded-full border border-white bg-white px-1 text-[10px] font-bold leading-none text-slate-500 shadow-sm transition hover:text-red-500 disabled:cursor-not-allowed disabled:text-slate-300"
                aria-label={`Remove ${img}`}
              >
                {removingImage === img ? '...' : 'x'}
              </button>
            )}
          </div>
        )
      )}
    </div>
  );
};

export default ImagePopup;
