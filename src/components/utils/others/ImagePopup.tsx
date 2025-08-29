// ImagePopup.tsx

import { useEffect } from 'react';
import $ from 'jquery';


(window as any).$ = $;
(window as any).jQuery = $;

import 'magnific-popup/dist/jquery.magnific-popup.js'; // Magnific Popup JS
import 'magnific-popup/dist/magnific-popup.css'; // Magnific Popup CSS

import { API_REMOTE_URL } from '../../services/apiRoutes';
import { useSelector } from 'react-redux';

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
   const environment = useSelector((state) => state.settings?.data?.env);
 
  useEffect(() => {
    
    const timeout = setTimeout(() => { 
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

  let imageUrl = `${API_REMOTE_URL}/public/project_voucher/${branchPad}`; // ডিফল্ট পাথ

// যদি লোকাল পরিবেশে থাকে
if (environment === "local") {
    imageUrl = `${API_REMOTE_URL}/project_voucher/${branchPad}`; // লোকাল পাথ
}


  return (
    <div className="popup-image-group flex gap-1">
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
