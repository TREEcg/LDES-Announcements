import path from 'path';
import { Relation } from '@treecg/tree-metadata-extraction/dist/util/Util';
import { Store } from 'n3';
import { extractAnnouncementsMetadata } from './lib/Extraction';
import { AnnouncementConfig, createViewAnnouncement } from './lib/Writer';
import { Activity, View, DataSet, DataService } from './util/Interfaces';
import { writeJSONLDToTurtleSync } from './util/Util';
import { LDP } from './util/Vocabularies';
const rdfRetrieval = require('@dexagod/rdf-retrieval');

/**
 * Fetches all resources ids from an announcement container which should contain an actual announcement.
 * This method is mainly made to marginally limit internet traffic.
 * @param announcementsUri
 * @returns {Promise<string[]>}
 */
export async function fetchAnnouncementIds(announcementsUri: string): Promise<string []> {
  return await fetchFilteredResourceIds(announcementsUri, [ LDP.constrainedBy ]);
}

/**
 * Fetches all the Resource Ids from an LDP container apart from the resources which are object from a triple in the style
 * <containerUri> <predicate> <object>.
 * Here the predicate is an element of predicates.
 * @param containerUri          Uri of an LDP container
 * @param predicates            List of predicates
 * @returns {Promise<any>}      List of filtered Resource Ids
 */
export async function fetchFilteredResourceIds(containerUri: string, predicates: string []): Promise<string []> {
  const store: Store = await rdfRetrieval.getResourceAsStore(containerUri);

  const toRemoveIds: string [] = [];

  for (const predicate of predicates) {
    toRemoveIds.push(...store.getObjects(containerUri, predicate, null).map((object: any) => object.id));
  }
  // Filter out the Resource ids
  const resourceIds: string [] = store.getObjects(containerUri, LDP.contains, null).map((object: any) => object.id);
  const intermediaryIds = new Set(resourceIds);
  toRemoveIds.forEach(id => intermediaryIds.delete(id));
  return Array.from(intermediaryIds);
}

// Can also be more modular by calling fetchFilteredREsourceIds(uri, [])
export async function fetchResourceIds(containerUri: string): Promise<string []> {
  const store: Store = await rdfRetrieval.getResourceAsStore(containerUri);
  return store.getObjects(containerUri, LDP.contains, null).map((object: any) => object.id);
}

/**
 * Creates an N3 Store given multiple resource Ids (where a resource id is a string uri)
 * @param resourceIds           The ids of a Resource
 * @returns {Promise<Store>}    A store containing the resources.
 */
export async function createResourceStore(resourceIds: string []): Promise<Store> {
  const store = new Store();
  await Promise.all(resourceIds.map(async id => {
    const announcementStore = await rdfRetrieval.getResourceAsStore(id);
    store.addQuads(announcementStore.getQuads(null, null, null, null));
  }));
  return store;
}

// Can also be more modular by calling fetchAllResourcesFiltered(uri, [])
export async function fetchAllResources(uri: string): Promise<Store> {
  const resourceIds = await fetchResourceIds(uri);
  return await createResourceStore(resourceIds);
}

export async function fetchAllResourcesFiltered(uri: string, predicates: string[]): Promise<Store> {
  const resourceIds = await fetchFilteredResourceIds(uri, predicates);
  return await createResourceStore(resourceIds);
}

async function executeRetrievingAllAnouncementsv2(uri: string) {
  const store = await fetchAllResources(uri);
  const data = await extractAnnouncementsMetadata(store);
  const json: (Activity | View | Relation | DataSet | DataService)[] = [];

  data.announcements.forEach(value => {
    json.push(value);
  });
  data.views.forEach(value => {
    json.push(value.view);
    value.relations.forEach(value => {
      json.push(value);
    });
  });
  data.datasets.forEach(value => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    value['dct:title'] = { '@value': value['dct:title']['@value'], '@language': value['dct:title']['@language'] };
    json.push(value);
  });
  data.dataServices.forEach(value => {
    json.push(value);
  });

  writeJSONLDToTurtleSync(JSON.stringify(json), 'test.ttl');
}

async function execute() {
  const store = await rdfRetrieval.getResourceAsStore(path.join(module.path, '../data/gemeente.ttl'));
  const inbox = 'https://tree.linkeddatafragments.org/inbox/';
  const name = `test${new Date().toISOString()}.ttl`;

  const config = {
    url: 'https://smartdata.dev-vlaanderen.be/base/gemeente',
    storage: 'output',
    gh_pages_branch: '',
    gh_pages_url: 'https://test/',
    git_username: 'woutslabbinck',
    git_email: 'wout.slabbinck@ugent.be',
    fragmentation_strategy: 'substring',
    fragmentation_page_size: 100,
    datasource_strategy: 'ldes-client',
    property_path: '<http://www.w3.org/2000/01/rdf-schema#label>',
    stream_data: true,
    timeout: 3_600_000
  };
  const announcementConfig: AnnouncementConfig = {
    bucketizer: config.fragmentation_strategy,
    creatorName: config.git_username,
    creatorURL: `https://github.com/${config.git_username}`,
    originalLDESURL: config.url,
    pageSize: config.fragmentation_page_size.toString(),
    // Note that this will be empty in the case of the basic one -> EDIT SHAPE
    propertyPath: config.property_path,
    // Note that the generated view id with basic is 0.ttl instead of root.ttl -> MAKE A HELPER FUNCTION
    viewId: `${config.gh_pages_url + config.storage}/root.ttl`,
    inboxLocation: '',
    fileName: ''
  };

  const announcementJson = await createViewAnnouncement(store, announcementConfig);

  // Send request to server
  const response = await fetch(inbox, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/ld+json',
      Link: '<http://www.w3.org/ns/ldp#Resource>; rel="type"'
    },
    body: announcementJson

  });
  console.log(response.status);
  console.log(response.statusText);
  console.log(response.headers);
}

execute();
executeRetrievingAllAnouncementsv2('https://tree.linkeddatafragments.org/inbox/');
