export const isUserFeatureEnabled = (
  settings: any,
  feature: 'sidebar_menu' | 'use_filter_parameter',
): boolean => String(settings?.data?.user?.[feature] ?? '') === '1';
