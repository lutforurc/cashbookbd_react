import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { API_REMOTE_URL } from '../../services/apiRoutes';
import { PrintBranch, hasPrintBranch, usePrintBranch } from './printBranch';
import { formatMobile, useMobileFormat } from './mobileFormat';

const loadedImageUrls = new Set<string>();
const imageLoadPromises = new Map<string, Promise<string>>();
const isDebugEnabled = import.meta.env.DEV;
const shouldStripPublicPrefix = /^(https?:\/\/)?(localhost|127\.0\.0\.1|cashbook_api\.test)(:\d+)?$/i.test(
  API_REMOTE_URL,
);

const logBranchPad = (message: string, details?: unknown) => {
  if (!isDebugEnabled) {
    return;
  }

  if (details === undefined) {
    console.debug(`[BranchPad] ${message}`);
    return;
  }

  console.debug(`[BranchPad] ${message}`, details);
};

const describeImageSource = (url: string) => {
  if (loadedImageUrls.has(url)) {
    return 'memory-cache';
  }

  if (imageLoadPromises.has(url)) {
    return 'in-flight';
  }

  return 'network';
};

const preloadImage = (url: string) => {
  if (loadedImageUrls.has(url)) {
    logBranchPad('memory cache hit', { url });
    return Promise.resolve(url);
  }

  const existingPromise = imageLoadPromises.get(url);
  if (existingPromise) {
    logBranchPad('reusing in-flight preload', { url });
    return existingPromise;
  }

  const loadPromise = new Promise<string>((resolve, reject) => {
    const image = new Image();

    logBranchPad('starting preload', { url });

    image.onload = () => {
      loadedImageUrls.add(url);
      imageLoadPromises.delete(url);
      logBranchPad('preload complete', { url });
      resolve(url);
    };

    image.onerror = (event) => {
      imageLoadPromises.delete(url);
      logBranchPad('preload failed', { url, event });
      reject(new Error(`Failed to preload image: ${url}`));
    };

    image.src = url;
  });

  imageLoadPromises.set(url, loadPromise);
  return loadPromise;
};

type Props = {
  /** The branch the report is about; falls back to the logged-in user's. */
  branch?: PrintBranch;
};

const BranchPad: React.FC<Props> = ({ branch: printBranch }) => {
  const settings = useSelector((state: any) => state.settings.data);
  const branch = settings?.branch;
  // Stationery that already carries the letterhead: the report draws none and
  // reserves the depth the branch measured, so nothing lands on top of it.
  const usesPreprintedPad = branch?.pad_print_mode === 'preprinted';
  const measuredPadHeight = Number(branch?.preprinted_pad_height);
  const paddingForPreprintedPad =
    Number.isFinite(measuredPadHeight) && measuredPadHeight >= 0 ? measuredPadHeight : 150;
  const useCustomImage = !usesPreprintedPad && Number(branch?.pad_heading_print) === 3;
  const [cachedImageSrc, setCachedImageSrc] = useState('');

  // A report pulled for another branch heads the page with that branch's own
  // details. Address and phone come from the override too — falling back to the
  // session branch's would put one branch's name over another's address.
  const resolvedBranch = usePrintBranch(printBranch);
  const overridden = hasPrintBranch(resolvedBranch);
  const mobileFormat = useMobileFormat();
  const headingName = overridden ? resolvedBranch?.name : branch?.name;
  const headingAddress = overridden ? resolvedBranch?.address : branch?.address;
  const headingPhone = formatMobile(overridden ? resolvedBranch?.phone : branch?.phone, mobileFormat);


  const imagePath =
    branch?.pad_header_image ||
    branch?.pad_heading_image ||
    branch?.letterhead_image ||
    branch?.pad_image ||
    branch?.header_image ||
    '';



  const resolvedImagePath =
    typeof imagePath === 'string' && imagePath
      ? /^(https?:|data:|blob:)/i.test(imagePath)
        ? imagePath
        : `${API_REMOTE_URL}/${imagePath
            .replace(/^\/+/, '')
            .replace(shouldStripPublicPrefix ? /^public\//i : /$^/, '')}`
      : '';

  useEffect(() => {
    let isMounted = true;

    const loadCachedImage = async () => {
      if (!resolvedImagePath) {
        logBranchPad('no image path resolved');
        setCachedImageSrc('');
        return;
      }

      logBranchPad('resolved image path', {
        imagePath,
        resolvedImagePath,
        source: describeImageSource(resolvedImagePath),
        shouldStripPublicPrefix,
      });

      if (/^(data:|blob:)/i.test(resolvedImagePath) || typeof window === 'undefined') {
        logBranchPad('using direct image source', { url: resolvedImagePath });
        setCachedImageSrc(resolvedImagePath);
        return;
      }

      if (loadedImageUrls.has(resolvedImagePath)) {
        logBranchPad('using preloaded image source', { url: resolvedImagePath });
        setCachedImageSrc(resolvedImagePath);
        return;
      }

      try {
        await preloadImage(resolvedImagePath);
        if (isMounted) {
          logBranchPad('setting preloaded image source', { url: resolvedImagePath });
          setCachedImageSrc(resolvedImagePath);
        }
      } catch (error) {
        if (isMounted) {
          logBranchPad('falling back to raw image source after preload error', {
            url: resolvedImagePath,
            error,
            source: describeImageSource(resolvedImagePath),
          });
          setCachedImageSrc(resolvedImagePath);
        }
      }
    };

    void loadCachedImage();

    return () => {
      isMounted = false;
    };
  }, [resolvedImagePath]);

  return (
    <div>
      {usesPreprintedPad ? (
        <div style={{ height: `${paddingForPreprintedPad}px` }} />
      ) : useCustomImage && cachedImageSrc ? (
        <div className="mb-4">
          <img
            src={cachedImageSrc}
            alt={headingName || 'Pad header'}
            className="mx-auto max-h-32 w-full object-contain"
          />
        </div>
      ) : (
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-center uppercase">{headingName}</h1>
          <div className="mt-2 text-center">
            <div>
              <span>{headingAddress}</span>
            </div>
            <div>
              <span>{headingPhone}</span>
            </div>
          </div>
        </div>
      )}
      {/* The rule belongs to the letterhead, so printed stationery draws it. */}
      {!usesPreprintedPad && <div className='border-t-2 border-gray-900 -mt-4'></div>}
      {/* A row held the print time on its right, with an empty div on the left
          to push it there. The time is in the footer now, beside the page
          count, so the row had nothing left to hold. */}
    </div>
  );
};

export default BranchPad;
