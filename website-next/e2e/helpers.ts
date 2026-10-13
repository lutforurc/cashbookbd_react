export const OWNER = { email: 'e2e.owner@cashbookbd.test', password: 'e2e-secret' };
export const VIEWER = { email: 'e2e.viewer@cashbookbd.test', password: 'e2e-secret' };

export const PORT = process.env.E2E_PORT ?? '3000';

export const host = (label: string) => `http://${label}.cashbookbd.test:${PORT}`;

export const OWNER_STATE = '.auth/owner.json';
export const VIEWER_STATE = '.auth/viewer.json';

/** An explicitly empty session, so a spec starts signed out. */
export const ANONYMOUS = { cookies: [] as never[], origins: [] as never[] };
