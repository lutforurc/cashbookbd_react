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
  openPdfInNewTab?: boolean;
}

const ImagePopup = ({
  branchPad,
  voucher_image,
  title,
  onRemoveImage,
  removingImage,
  openPdfInNewTab = true,
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
  const removeButtonClass =
    'inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-slate-200 bg-white px-1 text-[10px] font-bold leading-none text-slate-500 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:shadow-none dark:hover:border-red-500/40 dark:hover:bg-red-500/10 dark:hover:text-red-300 dark:disabled:border-slate-700 dark:disabled:bg-slate-800/60 dark:disabled:text-slate-500';

  let imageUrl = `${API_REMOTE_URL}/public/project_voucher/${branchPad}`;
  if (environment === 'local') {
    imageUrl = `${API_REMOTE_URL}/project_voucher/${branchPad}`;
  }

  return (
    <div ref={rootRef} className="popup-image-group flex flex-wrap items-center gap-1.5 max-w-30">
      {images.map((img, index) =>
        isPDF(img) ? (
          <div key={index} className="relative inline-flex items-center gap-1">
            <a
              href={`${imageUrl}/voucher/${img}`}
              title={title}
              target={openPdfInNewTab ? '_blank' : undefined}
              rel={openPdfInNewTab ? 'noopener noreferrer' : undefined}
              data-pdf="true"
              className="inline-flex h-6 items-center rounded border border-slate-200 bg-white px-2 text-xs font-medium text-primary shadow-sm transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary dark:border-slate-600 dark:bg-slate-800 dark:text-blue-300 dark:shadow-none dark:hover:border-blue-400/50 dark:hover:bg-blue-500/10 dark:hover:text-blue-200"
            >
              Doc {index + 1}
            </a>
            {onRemoveImage && (
              <button
                type="button"
                onClick={() => onRemoveImage(img)}
                disabled={removingImage === img}
                className={removeButtonClass}
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
                className="h-8 w-8 rounded-sm border border-slate-200 bg-white object-cover p-0.5 shadow-sm transition hover:border-primary/50 hover:shadow-md dark:border-slate-600 dark:bg-slate-800 dark:shadow-none dark:hover:border-blue-400/60"
              />
            </a>
            {onRemoveImage && (
              <button
                type="button"
                onClick={() => onRemoveImage(img)}
                disabled={removingImage === img}
                className={`absolute -right-1.5 -top-1.5 ${removeButtonClass}`}
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
