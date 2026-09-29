import { cache } from 'react';
import { publicGet } from './api';
import type {
  PageResponse,
  ProductResponse,
  ProductsResponse,
  SiteShellResponse,
  SitemapResponse,
} from './site-types';

/**
 * Per-request memoised reads of the public site API. cache() means the layout
 * and a page asking for the same thing issue one fetch, not two.
 */
export const getShell = cache(() => publicGet<SiteShellResponse>(''));
export const getHome = cache(() => publicGet<PageResponse>('/home'));
export const getProducts = cache(() => publicGet<ProductsResponse>('/products'));
export const getSitemap = cache(() => publicGet<SitemapResponse>('/sitemap'));

export const getPage = cache((slug: string) =>
  publicGet<PageResponse>(`/pages/${encodeURIComponent(slug)}`),
);

export const getProduct = cache((id: number) => publicGet<ProductResponse>(`/products/${id}`));
