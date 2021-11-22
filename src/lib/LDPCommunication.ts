import { getResourceAsStore } from '@dexagod/rdf-retrieval';
import { extractMetadata } from '@treecg/tree-metadata-extraction';
import { Store } from 'n3';
import { Announce } from '../util/Interfaces';
import { LDP } from '../util/Vocabularies';
const parse = require('parse-link-header');

/** *************************************
 * Title: LDPCommunication
 * Description: Reading and writing to an LDP hosting announcements
 * Author: Wout Slabbinck (wout.slabbinck@ugent.be)
 * Created on 18/11/2021
 *****************************************/
/**
 * Fetch all the announcement IRIs in an announcement LDES in an LDP
 * @param inbox the LDP Container uri which contains the announcement LDES
 * @return {Promise<string[]>}
 */
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

/**
 * Fetch the LDP Resource IRIs of an LDP container
 * @param containerUri
 * @returns {Promise<any[]>}
 */
async function fetchResourceIds(containerUri: string): Promise<string []> {
  const store: Store = await getResourceAsStore(containerUri);
  return store.getObjects(containerUri, LDP.contains, null).map((object: any): string => object.id);
}

/**
 * Creates an N3 Store given multiple resource Ids (where a resource id is a string uri)
 * @param resourceIds           The ids of a Resource
 * @returns {Promise<Store>}    A store containing the resources.
 */
async function createResourceStore(resourceIds: string []): Promise<Store> {
  const store = new Store();
  await Promise.all(resourceIds.map(async (id): Promise<void> => {
    const announcementStore = await getResourceAsStore(id);
    store.addQuads(announcementStore.getQuads(null, null, null, null));
  }));
  return store;
}

/**
 * Fetching all announcements from an LDES of announcements in LDP
 * @param uri URI of the LDP container which contains the root (root.ttl) of the LDES
 * @returns {Promise<Store<Quad, Quad, Quad, Quad>>} store containing all announcements
 */
export async function fetchAllAnnouncements(uri: string): Promise<Store> {
  const resourceIds = await fetchAnnouncementIds(uri);
  return await createResourceStore(resourceIds);
}

export async function postAnnouncement(announcement: Announce, rootURI: string): Promise<any> {
  const rootResponse = await fetch(rootURI, {
    method: 'HEAD'
  });
  const linkHeaders = parse(rootResponse.headers.get('link'));
  if (!linkHeaders) {
    throw new Error('No Link Header present.');
  }
  const inboxLink = linkHeaders[LDP.inbox];
  if (!inboxLink) {
    throw new Error('No http://www.w3.org/ns/ldp#inbox Link Header present.');
  }
  // Location is the current inbox which can be written to
  const location = `${inboxLink.url}/`;
  const response = await fetch(location, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/ld+json',
      Link: '<http://www.w3.org/ns/ldp#Resource>; rel="type"'
    },
    body: JSON.stringify(announcement)
  });
  return response;
}
