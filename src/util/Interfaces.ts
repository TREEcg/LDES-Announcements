import { Literal, Node, URI } from '@treecg/tree-metadata-extraction/src/util/Util';

// AS interfaces
export interface Object {
  '@context'?: string | object;
  '@id': string;
  '@type': string[];
  'name'?: string;
}

export interface Activity extends Object {
  'summary'?: string;
  'actor': Object;
  'object': Object;
}

export type Announce = Activity;

export interface Person extends Object {
  'name': string;
  'url': URI;
}

export interface Link extends Object {
  'href': URI;
  'hreflang'?: string;
  'mediaType'?: string;
  'name'?: string;
}

export interface Add extends Activity {
  'url': Link;
  'object': View | DataSet | DataService | string;
}

// DCAT interface
export interface Resource {
  '@context'?: string | object;
  '@id': string;
  '@type': string[];
  'dcat:contactPoint'?: URI;
  'dct:conformsTo'?: URI;
  'dct:creator'?: URI;
  'dct:description'?: string;
  'dct:identifier'?: string;
  'dct:issued'?: string;
  'dct:license'?: URI;
  'dct:title'?: string;
}

export interface DataSet extends Resource {
  'dct:creator': URI;
  'dct:description': string;
  'dct:identifier': string;
  'dct:issued': string;
  'dct:license': URI;
  'dct:title': string;
  'tree:shape': string;
  'tree:view': URI;
}

export interface DataService extends Resource {
  'dcat:contactPoint': URI;
  'dcat:endpointURL': URI;
  'dcat:servesDataset': URI;
  'dct:conformsTo': URI;
  'dct:creator': URI;
  'dct:description': string;
  'dct:title': string;
}

// LDES/TREE interfaces
export interface View extends Node {
  '@type': string[];
  'void:subset': URI;
  'ldes:configuration': BucketizerConfiguration;
}

export interface BucketizerConfiguration {
  '@context'?: string | object;
  '@type': string[];
  '@id': string;
  'path': URI;
  'pageSize': Literal;
  'bucketizer': URI;
}

