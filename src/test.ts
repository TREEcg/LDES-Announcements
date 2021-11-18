import path from 'path';
import { Collection } from '@treecg/tree-metadata-extraction/src/util/Util';
import { Store } from 'n3';
import { extractAnnouncementsMetadata } from './lib/Extraction';
import { AnnouncementConfig, createViewAnnouncement } from './lib/Writer';
import { View, DataSet, DataService, Announce } from './util/Interfaces';
import { writeJSONLDToTurtleSync } from './util/Util';
import { LDP, TREE } from './util/Vocabularies';
const rdfRetrieval = require('@dexagod/rdf-retrieval');

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

async function executeRetrievingAllAnouncementsv2(uri: string) {
  const store = await fetchAllResources(uri);
  const data = await extractAnnouncementsMetadata(store);
  const json: (Announce | View | DataSet | DataService | Collection)[] = [];
  data.announcements.forEach(value => {
    json.push(value);
  });
  data.views.forEach(value => {
    json.push(value);
    const collectionQuad = store.getQuads(null, TREE.view, value['@id'], null)[0];
    const collection: Collection = {
      '@id': collectionQuad.subject.id,
      '@context': { '@vocab': TREE.namespace },
      view: [{ '@id': collectionQuad.object.id }]
    };
    json.push(collection);
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

async function writeAnnouncement() {
  const inbox = 'https://tree.linkeddatafragments.org/announcements/';

  const substringConfig = {
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

  const basicConfig: Record<string, any> = { ...substringConfig };
  delete basicConfig.property_path;
  basicConfig.fragmentation_strategy = 'basic';

  // Choose config here
  const config = substringConfig;

  // Store has te be created based on the config
  const rootFileName = config.fragmentation_strategy === 'substring' || config.fragmentation_strategy === 'subject-page' ? 'root.ttl' : '0.ttl';
  // TODO: '../data/' MUST be replaced by config.storage in LDES action
  const storageLocation = path.join(module.path, config.storage, rootFileName);
  const store = await rdfRetrieval.getResourceAsStore(path.join(module.path, '../data/', rootFileName));
  const announcementConfig: AnnouncementConfig = {
    bucketizer: config.fragmentation_strategy,
    creatorName: config.git_username,
    creatorURL: `https://github.com/${config.git_username}`,
    originalLDESURL: config.url,
    pageSize: config.fragmentation_page_size.toString(),
    // Note that this will be empty in the case of the basic one -> EDIT SHAPE
    propertyPath: config.property_path,
    viewId: `${config.gh_pages_url + config.storage}/${rootFileName}`
  };

  const announcementJson = await createViewAnnouncement(store, announcementConfig);
  const currentInboxResponse = await fetch(inbox, {
    method: 'HEAD'
  });
  const parse = require('parse-link-header');
  const linkHeaders = parse(currentInboxResponse.headers.get('link'));
  const inboxLink = linkHeaders[LDP.inbox];
  if (!inboxLink) {
    throw new Error('No http://www.w3.org/ns/ldp#inbox Link Header present.');
  }
  const location = `${inboxLink.url}/`;
  // Send request to server
  const response = await fetch(location, {
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
// Execute reading all announcements using root?
executeRetrievingAllAnouncementsv2('https://tree.linkeddatafragments.org/announcements/1636985640000/');
// Execute writing based on output of LDES-action
// writeAnnouncement();
