import type { RNPlugin } from '@remnote/plugin-sdk';
import { CATALOG_KEY, CatalogRepository } from './core/catalog';
export function catalogRepository(plugin: RNPlugin) {
  let initialSync: Promise<void> | undefined;
  return new CatalogRepository({ wait: () => initialSync ??= plugin.app.waitForInitialSync().catch(error => {
    initialSync = undefined;
    throw error;
  }),
    read: () => plugin.storage.getSynced(CATALOG_KEY),
    write: value => plugin.storage.setSynced(CATALOG_KEY, value) });
}
