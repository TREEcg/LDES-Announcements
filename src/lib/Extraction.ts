// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/** *************************************
 * Title: Extraction
 * Description: Extraction of announcements, views, datasets and dataservices
 * Author: Wout Slabbinck (wout.slabbinck@ugent.be)
 * Created on 8/11/2021
*****************************************/
import { extractMetadata } from '@treecg/tree-metadata-extraction';
import { Node } from '@treecg/tree-metadata-extraction/src/util/Util';
import * as N3 from 'n3';
import {
  Announce,
  DataService,
  DataSet,
  View,
  BucketizerConfiguration, ReverseCollection
} from '../util/Interfaces';
import { makeViewContext, retrieveTerm } from '../util/Util';
import { AS, DCAT, DCT, LDES, RDF, TREE } from '../util/Vocabularies';

export async function extractAnnouncementsMetadata(store: N3.Store):
Promise<{ announcements: Map<string, Announce> ;
  datasets: Map<string, DataSet> ;
  dataServices: Map<string, DataService> ;
  views: Map<string, View>; }> {
  const announcementIds = extractAnnouncementIds(store);
  const datasetIds = extractDatasetIds(store);
  const dataServiceIds = extractDataServiceIds(store);
  const viewIds = extractViewIds(store);

  const announcements: Map<string, Announce> = new Map();
  const datasets: Map<string, DataSet> = new Map();
  const dataServices: Map<string, DataService> = new Map();
  const views: Map<string, View> = new Map();
  for (const id of announcementIds) {
    announcements.set(id, extractAnnouncement(store, id));
  }
  for (const id of datasetIds) {
    datasets.set(id, extractDataset(store, id));
  }
  for (const id of dataServiceIds) {
    dataServices.set(id, extractDataService(store, id));
  }
  const treeMetadata = await extractMetadata(store.getQuads(null, null, null, null));

  for (const id of viewIds) {
    views.set(id, extractView(store, id, treeMetadata));
  }
  return { announcements, datasets, dataServices, views };
}

function extractAnnouncementIds(store: N3.Store): string[] {
  const ids: string[] = [];
  ids.push(...store.getQuads(null, RDF.type, AS.Announce, null).map(quad => quad.subject.id));
  return ids;
}

/**
 * Extract the Dataset Ids from the store
 * @param store
 * @returns {any}
 */
function extractDatasetIds(store: N3.Store): string[] {
  const ids: string[] = [];
  // Due to the shape, both should give the same result, this might be pointless to do both?
  ids.push(...store.getQuads(null, RDF.type, DCAT.Dataset, null).map(quad => quad.subject.id));
  ids.push(...store.getQuads(null, RDF.type, LDES.EventStream, null).map(quad => quad.subject.id));
  return Array.from(new Set(ids));
}

function extractDataServiceIds(store: N3.Store): string[] {
  const ids: string[] = [];
  ids.push(...store.getQuads(null, RDF.type, DCAT.DataService, null).map(quad => quad.subject.id));

  return ids;
}

function extractViewIds(store: N3.Store): string[] {
  const ids: string[] = [];

  ids.push(...store.getQuads(null, RDF.type, TREE.Node, null).map(quad => quad.subject.id));
  return ids;
}

function extractAnnouncement(store: N3.Store, id: string): Announce {
  const announcement: Announce = {
    '@context': { '@vocab': AS.namespace },
    '@id': id,
    '@type': store.getQuads(id, RDF.type, null, null).map(quad => quad.object.id),
    actor: store.getQuads(id, AS.actor, null, null).map(quad => retrieveTerm(store, quad.object))[0],
    object: store.getQuads(id, AS.object, null, null).map(quad => retrieveTerm(store, quad.object))[0]
  };
  return announcement;
}

function extractDataset(store: N3.Store, id: string): DataSet {
  const dataset: DataSet = {
    '@context': { dct: DCT.namespace, dcat: DCAT.namespace, tree: TREE.namespace, ldes: LDES.namespace },
    '@id': id,
    '@type': store.getQuads(id, RDF.type, null, null).map(quad => quad.object.id),
    'dct:conformsTo': store.getQuads(id, DCT.conformsTo, null, null).map(quad => retrieveTerm(store, quad.object))[0],
    'dct:creator': store.getQuads(id, DCT.creator, null, null).map(quad => retrieveTerm(store, quad.object))[0],
    'dct:description': store.getQuads(id, DCT.description, null, null).map(quad => retrieveTerm(store, quad.object))[0],
    'dct:identifier': store.getQuads(id, DCT.identifier, null, null).map(quad => retrieveTerm(store, quad.object))[0],
    'dct:issued': store.getQuads(id, DCT.issued, null, null).map(quad => retrieveTerm(store, quad.object))[0],
    'dct:license': store.getQuads(id, DCT.license, null, null).map(quad => retrieveTerm(store, quad.object))[0],
    'dct:title': store.getQuads(id, DCT.title, null, null).map(quad => retrieveTerm(store, quad.object))[0],
    'tree:shape': store.getQuads(id, TREE.shape, null, null).map(quad => retrieveTerm(store, quad.object))[0],
    'tree:view': store.getQuads(id, TREE.view, null, null).map(quad => retrieveTerm(store, quad.object))[0]
  };
  return dataset;
}

function extractDataService(store: N3.Store, id: string): DataService {
  const dataService: DataService = {
    '@context': { dct: DCT.namespace, dcat: DCAT.namespace },
    '@id': id,
    '@type': store.getQuads(id, RDF.type, null, null).map(quad => quad.object.id),
    'dcat:contactPoint': store.getQuads(id, DCAT.contactPoint, null, null).map(quad => retrieveTerm(store, quad.object))[0],
    'dcat:endpointURL': store.getQuads(id, DCAT.endpointURL, null, null).map(quad => retrieveTerm(store, quad.object))[0],
    'dcat:servesDataset': store.getQuads(id, DCAT.servesDataset, null, null).map(quad => retrieveTerm(store, quad.object))[0],
    'dct:conformsTo': store.getQuads(id, DCT.conformsTo, null, null).map(quad => retrieveTerm(store, quad.object))[0],
    'dct:creator': store.getQuads(id, DCT.creator, null, null).map(quad => retrieveTerm(store, quad.object))[0],
    'dct:description': store.getQuads(id, DCT.description, null, null).map(quad => retrieveTerm(store, quad.object))[0],
    'dct:title': store.getQuads(id, DCT.title, null, null).map(quad => retrieveTerm(store, quad.object))[0]
  };
  return dataService;
}

function extractView(store: N3.Store, id: string, treeMetadata: { nodes: Map<any, any>; collections: Map<any, any> }): View {
  const configurationId = store.getQuads(id, LDES.configuration, null, null)[0].object.id;
  const collectionId = store.getQuads(null, TREE.view, id, null)[0].subject.id;
  const node: Node = treeMetadata.nodes.get(id)!;

  const reverseCollection: ReverseCollection = {
    '@context': { '@vocab': TREE.namespace },
    view: { '@id': collectionId }
  };
  const bucketizerConfiguration: BucketizerConfiguration = {
    '@id': configurationId,
    '@context': { '@vocab': LDES.namespace, path: TREE.path },
    '@type': store.getQuads(configurationId, RDF.type, null, null).map(quad => quad.object.id),
    bucketizer: store.getQuads(configurationId, LDES.bucketizer, null, null).map(quad => retrieveTerm(store, quad.object))[0],
    pageSize: store.getQuads(configurationId, LDES.pageSize, null, null).map(quad => retrieveTerm(store, quad.object))[0],
    path: store.getQuads(configurationId, TREE.path, null, null).map(quad => retrieveTerm(store, quad.object))[0]
  };
  const viewContext = makeViewContext(node['@context']);
  const view: View = {
    '@context': viewContext,
    '@id': id,
    '@type': node['@type'] ? node['@type'] : store.getQuads(id, RDF.type, null, null).map(quad => quad.object.id),
    'ldes:configuration': bucketizerConfiguration,
    'dct:isVersionOf': store.getQuads(id, DCT.isVersionOf, null, null).map(quad => retrieveTerm(store, quad.object))[0],
    'dct:issued': store.getQuads(id, DCT.issued, null, null).map(quad => retrieveTerm(store, quad.object))[0],
    '@reverse': reverseCollection,
    conditionalImport: node.conditionalImport,
    import: node.import,
    importStream: node.import,
    retentionPolicy: node.retentionPolicy,
    search: node.search
  };
  return view;
}
