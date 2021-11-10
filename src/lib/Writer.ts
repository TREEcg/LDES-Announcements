import * as path from 'path';
import { extractMetadata } from '@treecg/tree-metadata-extraction';
import { Relation } from '@treecg/tree-metadata-extraction/dist/util/Util';
import * as N3 from 'n3';
import rdfParser from 'rdf-parse';
import { Add, Announce, BucketizerConfiguration, Link, Person, View } from './util/ActivityStream';
import { makeViewContext, writeJSONLDToTurtleSync } from './util/Util';
import { AS, LDES, TREE, XSD } from './util/Vocabularies';

const bucketizermap: Map<string, string> = new Map<string, string>([
  [ 'substring', 'https://w3id.org/ldes#SubstringBucketizer' ],
  [ 'basic', 'https://w3id.org/ldes#BasicBucketizer' ],
  [ 'subjectpage', 'https://w3id.org/ldes#SubjectPageBucketizer' ]
]);

const inbox = 'https://tree.linkeddatafragments.org/inbox/';
const name = `test${new Date().toISOString()}.ttl`;

/**
 * @interface AnnouncementConfig
 * @member creatorName The name of the person who initiated the LDES action
 * @member creatorURL The URL of the person (which is an foaf:Agent)
 * @member propertyPath The SHACL property path used in the bucketizer
 * @member pageSize The number of members per page used in the bucketizer
 * @member bucketizer The type of bucketizer used
 * @member viewId The URL of the root node
 * @member originalLDESURL The URL of the original ldes:EventStream (or tree:Collection)
 */
interface AnnouncementConfig {
  creatorName: string;
  creatorURL: string;
  propertyPath: string;
  pageSize: string;
  bucketizer: string;
  viewId: string;
  originalLDESURL: string;
}

/**
 * Creates the view that accompanies an announcement
 * @param store contains the triples of the view
 * @param config contains the paramaters req
 * @returns {Promise<{view: View, relations: Map<string, Relation>}>}
 */
async function createView(store: N3.Store, config: AnnouncementConfig):
Promise<{ view: View; relations: Map<string, Relation> }> {
  // TODO  maybe give relative URL in context for all @ids?
  const bucketizer = bucketizermap.get(config.bucketizer);

  if (!bucketizer) {
    const options: string[] = [];

    bucketizermap.forEach((value, key) => options.push(key));
    throw new Error(`${config.bucketizer} is not a valid bucketizer. valid options are: ${options}.`);
  }

  // Remove angle brackets when present from the property path
  const regex = /<?([^>]*)>?/gu.exec(config.propertyPath);
  let propertyPath: string;

  if (regex) {
    propertyPath = regex[1];
  } else {
    propertyPath = config.propertyPath;
  }
  const bucketizerConfig: BucketizerConfiguration = {
    '@type': [ LDES.BucketizerConfiguration ],
    '@context': { '@vocab': LDES.namespace, path: TREE.path },
    pageSize: { '@value': config.pageSize, '@type': XSD.positiveInteger },
    path: { '@id': propertyPath },
    bucketizer: { '@id': bucketizer },
    '@id': `${inbox + name}#bucketizerConfig`
  };

  const treeMeta = await extractMetadata(store.getQuads(null, null, null, null));
  // Get the view
  const node = treeMeta.nodes.get(config.viewId);

  if (!node) {
    throw new Error(`The tree:node (a view) ${config.viewId} was not found in the store.`);
  }
  const viewConfig: View = {
    '@context': makeViewContext(node['@context']),
    '@id': `${inbox + name}#view`,
    '@type': node['@type'] ? node['@type'] : [],
    'ldes:configuration': bucketizerConfig,
    'void:subset': { '@id': config.originalLDESURL },
    conditionalImport: node.conditionalImport,
    import: node.import,
    importStream: node.import,
    relation: node.relation,
    retentionPolicy: node.retentionPolicy,
    search: node.search
  };
  const relations: Map<string, Relation> = new Map();

  viewConfig.relation?.forEach(relationId => {
    relations.set(relationId['@id'], treeMeta.relations.get(relationId['@id']));
  });

  return { view: viewConfig, relations };
}

function createAnnouncement(config: AnnouncementConfig): Announce {
  const permanentUri = inbox + name;
  const asContext = { '@vocab': AS.namespace };
  // Create Link
  const link: Link = {
    '@context': asContext,
    '@id': `${permanentUri}#link`,
    '@type': [ AS.Link ],
    href: { '@id': config.originalLDESURL },
    // Todo
    name: 'To be replaced: currently this links to the original LDES as the rest is not implemented yet.'
  };

  // Create Person
  const person: Person = {
    '@context': asContext,
    '@id': `${permanentUri}#person`,
    '@type': [ AS.Person ],
    name: config.creatorName,
    url: { '@id': config.creatorURL }
  };

  // Create Add
  const add: Add = {
    '@context': asContext,
    '@id': `${permanentUri}#add`,
    '@type': [ AS.Add ],
    actor: person,
    // Todo
    object: 'TODO: should I do this here or later? Maybe with an URI instead of string?',
    url: link
  };

  // Create Announcement
  const announcement: Announce = {
    '@context': asContext,
    '@id': `${permanentUri}#announce`,
    '@type': [ AS.Announce ],
    actor: person,
    object: add
  };

  return announcement;
}

const rdfRetrieval = require('@dexagod/rdf-retrieval');

async function execute() {
  const store = await rdfRetrieval.getResourceAsStore(path.join(module.path, '../data/gemeente.ttl'));
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
    viewId: `${config.gh_pages_url + config.storage}/root.ttl`
  };
  const view = await createView(store, announcementConfig);
  // From the view object and its relations: make one graph
  const jsonList = [];

  // Add view
  jsonList.push(view.view);
  view.relations.forEach((value, key) => {
    jsonList.push(value);
  });
  const viewJsonLD = JSON.stringify(jsonList);

  // Create announcement
  const announcement = createAnnouncement(announcementConfig);

  // Add the view (which can be done as uri or as view object)
  announcement.object.object = view.view;
  const announcementJsonList = [];

  announcementJsonList.push(announcement);
  view.relations.forEach((value, key) => {
    announcementJsonList.push(value);
  });
  const announcementJsonLd = JSON.stringify(announcementJsonList);

  // Transform jsonld to text
  const textStream = require('streamify-string')(announcementJsonLd);
  const stream = rdfParser.parse(textStream, { contentType: 'application/ld+json' });

  const text = await rdfRetrieval.quadStreamToString(stream);
  // Console.log(text);

  // Write view to turtle file
  const dataPath = path.join(module.path, '../data/');

  writeJSONLDToTurtleSync(viewJsonLD, path.join(dataPath, 'gemeente_view.ttl'));
  // Write announcement to turtle file
  writeJSONLDToTurtleSync(announcementJsonLd, path.join(dataPath, 'gemeente_announcement.ttl'));

  // Send request to server
  // json ld needs other names
  // const response = await fetch(inbox, {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/ld+json',
  //     Link: '<http://www.w3.org/ns/ldp#Resource>; rel="type"',
  //     slug: name,
  //   },
  //   body: announcementJsonLd,
  // });
  const response = await fetch(inbox, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/turtle',
      Link: '<http://www.w3.org/ns/ldp#Resource>; rel="type"',
      slug: name
    },
    body: text

  });

  console.log(response.status);
  console.log(response.statusText);
}

execute();
