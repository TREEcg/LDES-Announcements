import { getResourceAsStore } from '@dexagod/rdf-retrieval';
import { extractMetadata } from '@treecg/tree-metadata-extraction';
import { Store } from 'n3';
import { LDP } from '../util/Vocabularies';
import { extractAnnouncementsMetadata } from './Extraction';

/** *************************************
 * Title: LDPCommunication
 * Description: Reading and writing to an LDP hosting announcements
 * Author: Wout Slabbinck (wout.slabbinck@ugent.be)
 * Created on 18/11/2021
 *****************************************/
// todo: test writer first (@reverse property and shit)
async function fetchAnnouncementIds(inbox: string): Promise<string[]> {
  const ids: string[] = [];
  // Get root
  const rootUri = `${inbox}root.ttl`;
  const store: Store = await getResourceAsStore(rootUri);

  // Create list of all relations
  const treeMetadata = await extractMetadata(store.getQuads(null, null, null, null));
  const relations: string[] = [];
  treeMetadata.relations.forEach((value): void => {
    // For some reason there can be multiple nodes in a relation according to treeMetadata extraction
    const nodes = value.node.map((node: any): void => node['@id']);
    relations.push(...nodes);
  });
  // Get announcement ids of all relations
  for (const relationUri of relations) {
    ids.push(...await fetchResourceIds(relationUri));
  }
  return ids;
}

async function fetchResourceIds(containerUri: string): Promise<string []> {
  const store: Store = await getResourceAsStore(containerUri);
  return store.getObjects(containerUri, LDP.contains, null).map((object: any) => object.id);
}

/**
 * Creates an N3 Store given multiple resource Ids (where a resource id is a string uri)
 * @param resourceIds           The ids of a Resource
 * @returns {Promise<Store>}    A store containing the resources.
 */
async function createResourceStore(resourceIds: string []): Promise<Store> {
  const store = new Store();
  await Promise.all(resourceIds.map(async id => {
    const announcementStore = await getResourceAsStore(id);
    store.addQuads(announcementStore.getQuads(null, null, null, null));
  }));
  return store;
}

async function fetchAllResources(uri: string): Promise<Store> {
  const resourceIds = await fetchAnnouncementIds(uri);
  return await createResourceStore(resourceIds);
}
async function execute() {
  const store = await fetchAllResources('https://tree.linkeddatafragments.org/announcements/');
  const announcements = await extractAnnouncementsMetadata(store);
}
execute();
