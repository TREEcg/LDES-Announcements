import { Collection, Literal, Node, URI } from '@treecg/tree-metadata-extraction/src/util/Util';

// AS interfaces

export interface Announce {
  '@context'?: string | object;
  '@id': string;
  '@type': string[];
  'actor': URI;
  'object': View | DataSet | DataService | URI;
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
  'dct:issued'?: Literal;
  'dct:license'?: URI;
  'dct:title'?: string;
}

export interface DataSet extends Resource {
  'dct:creator': URI;
  'dct:description': string;
  'dct:identifier': string;
  'dct:issued': Literal;
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

export interface ReverseCollection {
  '@context'?: string | object;
  'view': Collection;
}

// LDES/TREE interfaces
export interface View extends Node {
  '@type': string[];
  'dct:isVersionOf': URI;
  'dct:issued': Literal;
  'ldes:configuration': BucketizerConfiguration;
  '@reverse': ReverseCollection;
}

export interface BucketizerConfiguration {
  '@context'?: string | object;
  '@type': string[];
  '@id': string;
  'path': URI;
  'pageSize': Literal;
  'bucketizer': URI;
}
