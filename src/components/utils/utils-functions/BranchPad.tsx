import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { API_REMOTE_URL } from '../../services/apiRoutes';
import { chartDateTime } from './formatDate';

const loadedImageUrls = new Set<string>();
const imageLoadPromises = new Map<string, Promise<string>>();
const isDebugEnabled = import.meta.env.DEV;

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

const BranchPad = () => {
  const settings = useSelector((state: any) => state.settings.data);
  const branch = settings?.branch;
  const useCustomImage = Number(branch?.pad_heading_print) === 3;
  const [cachedImageSrc, setCachedImageSrc] = useState('');


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
            .replace(/^public\//i, '')}`
      : '';

  useEffect(() => {
    let isMounted = true;

    const loadCachedImage = async () => {
      if (!resolvedImagePath) {
        logBranchPad('no image path resolved');
        setCachedImageSrc('');
        return;
      }

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
      {useCustomImage && cachedImageSrc ? (
        <div className="mb-4">
          <img
            src={cachedImageSrc}
            alt={branch?.name || 'Pad header'}
            className="mx-auto max-h-32 w-full object-contain"
          />
        </div>
      ) : (
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-center uppercase">{branch?.name}</h1>
          <div className="mt-2 text-center">
            <div>
              <span>{branch?.address}</span>
            </div>
            <div>
              <span>{branch?.phone}</span>
            </div>
          </div>
        </div>
      )}
      <div className='border-t-2 border-gray-900 -mt-4'></div>
      <div className='flex justify-between'>
       <div></div>
        <div >
          <span className="text-xs">Printed At:</span>{' '}
          <span className="text-xs">{chartDateTime(new Date().toISOString())}</span>
        </div>
      </div>
    </div>
  );
};

export default BranchPad;
