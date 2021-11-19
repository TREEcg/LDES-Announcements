/** *************************************
 * Title: Writer
 * Description: Creation of announcements, views (, datasets and dataservices)
 * Author: Wout Slabbinck (wout.slabbinck@ugent.be)
 * Created on 9/11/2021
 *****************************************/

import { extractMetadata } from '@treecg/tree-metadata-extraction';
import { Collection } from '@treecg/tree-metadata-extraction/src/util/Util';
import * as N3 from 'n3';
import rdfParser from 'rdf-parse';
import { Announce, BucketizerConfiguration, ReverseCollection, View } from '../util/Interfaces';
import { makeViewContext } from '../util/Util';
import { AS, LDES, TREE, XSD } from '../util/Vocabularies';
const rdfRetrieval = require('@dexagod/rdf-retrieval');

const bucketizermap: Map<string, string> = new Map<string, string>([
  [ 'substring', 'https://w3id.org/ldes#SubstringBucketizer' ],
  [ 'basic', 'https://w3id.org/ldes#BasicBucketizer' ],
  [ 'subjectpage', 'https://w3id.org/ldes#SubjectPageBucketizer' ]
]);

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
export interface AnnouncementConfig {
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
 * @param config contains the required parameters
 * @returns {Promise<{view: View, collection: Collection>}
 */
async function createView(store: N3.Store, config: AnnouncementConfig): Promise<View> {
  const bucketizer = bucketizermap.get(config.bucketizer);

  if (!bucketizer) {
    const options: string[] = [];

    bucketizermap.forEach((value, key): void => {
      options.push(key);
    });
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
    '@id': `#bucketizerConfig`
  };

  const treeMeta = await extractMetadata(store.getQuads(null, null, null, null));
  // Get the view
  const node = treeMeta.nodes.get(config.viewId);

  if (!node) {
    throw new Error(`The tree:node (a view) ${config.viewId} was not found in the store.`);
  }
  const collection: Collection = {
    '@id': config.originalLDESURL
  };

  const reverse: ReverseCollection = {
    '@context': { '@vocab': TREE.namespace },
    view: collection
  };

  const viewConfig: View = {
    'dct:isVersionOf': { '@id': config.viewId },
    'dct:issued': { '@value': new Date().toISOString(), '@type': XSD.dateTime },
    '@context': makeViewContext(node['@context']),
    '@id': `#view`,
    '@type': node['@type'] ? node['@type'] : [],
    'ldes:configuration': bucketizerConfig,
    '@reverse': reverse,
    conditionalImport: node.conditionalImport,
    import: node.import,
    importStream: node.import,
    retentionPolicy: node.retentionPolicy,
    search: node.search
  };

  return viewConfig;
}

function createAnnouncement(config: AnnouncementConfig): Announce {
  const asContext = { '@vocab': AS.namespace };

  // Create Announcement
  const announcement: Announce = {
    '@context': asContext,
    '@id': `#announce`,
    '@type': [ AS.Announce ],
    actor: { '@id': config.creatorURL },
    object: 'temp'
  };

  return announcement;
}

/**
 * Creates a view announcement, which can be send to an inbox
 * @param store contains the triples of the view
 * @param config contains the required parameters
 * @returns {Promise<string>}
 */
export async function createViewAnnouncement(store: N3.Store, config: AnnouncementConfig): Promise<Announce> {
  const view = await createView(store, config);
  const announcement = createAnnouncement(config);

  // Add the view (which can be done as uri or as view object)
  announcement.object = view;

  // Transform jsonld to text (Not possible currently due to relative URLs like #view)
  const announcementJsonLd = JSON.stringify(announcement);
  const textStream = require('streamify-string')(announcementJsonLd);
  const stream = rdfParser.parse(textStream, { contentType: 'application/ld+json' });
  const text: string = await rdfRetrieval.quadStreamToString(stream);
  return announcement;
}
