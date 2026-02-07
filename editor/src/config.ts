import { resolve, join } from 'path';

export const PROJECT_ROOT = resolve(import.meta.dir, '../..');
export const BUNDLES_DIR = join(PROJECT_ROOT, 'bundles');
export const RANVIER_JSON = join(PROJECT_ROOT, 'ranvier.json');
export const PORT = parseInt(process.env.PORT || '3000');
