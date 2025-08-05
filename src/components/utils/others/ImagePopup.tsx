// ImagePopup.tsx

import { useEffect } from 'react';
import $ from 'jquery';

// ✅ jQuery গ্লোবালে সেট করা (এইটা অবশ্যই magnifc-popup এর আগে)
(window as any).$ = $;
(window as any).jQuery = $;

import 'magnific-popup/dist/jquery.magnific-popup.js'; // Magnific Popup JS
import 'magnific-popup/dist/magnific-popup.css'; // Magnific Popup CSS

import { API_REMOTE_URL } from '../../services/apiRoutes';

// ✅ টাইপসক্রিপ্টের জন্য টাইপ ডিক্লেয়ার
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
  useEffect(() => {
    // DOM রেন্ডার হওয়ার পরে Magnific Popup ইনিশিয়ালাইজ
    const timeout = setTimeout(() => {
      console.log('Initializing Magnific Popup...');

      ($('.popup-image-group') as any).magnificPopup({
        delegate: 'a:not([data-pdf])', // PDF বাদ দাও
        type: 'image',
        gallery: {
          enabled: true,
        },
        image: {
          verticalFit: true,
        },
        zoom: {
          enabled: true,
          duration: 300,
          easing: 'ease-in-out',
        },
        callbacks: {
          open: function () {
            $('.mfp-wrap').css('z-index', 999999);
            $('.mfp-bg').css('z-index', 999998);
          },
        },
      });
    }, 0);

    return () => clearTimeout(timeout); // cleanup
  }, [voucher_image]);

  if (!branchPad || !voucher_image) return null;

  const images = voucher_image.split('|');

  const isPDF = (img: string) => img.toLowerCase().endsWith('.pdf');

  return (
    <div className="popup-image-group flex gap-1">
      {images.map((img, index) =>
        isPDF(img) ? (
          <a
            key={index}
            href={`${API_REMOTE_URL}/public/project_voucher/${branchPad}/voucher/${img}`}
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
            href={`${API_REMOTE_URL}/public/project_voucher/${branchPad}/voucher/${img}`}
            title={`Voucher Image ${index + 1}`}
          >
            <img
              src={`${API_REMOTE_URL}/public/project_voucher/${branchPad}/thumbnail/${img}`}
              alt={`Voucher ${index + 1}`}
              width="30"
              className="border rounded-sm shadow-sm hover:shadow-md transition-shadow duration-300"
            />
          </a>
        ),
      )}
    </div>
  );
};

export default ImagePopup;
