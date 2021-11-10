/** *************************************
 * Title: Util
 * Description: Utility functions for extracting terms
 * Author: Wout Slabbinck (wout.slabbinck@ugent.be)
 * Created on 29/10/2021
 *****************************************/

import fs from 'fs';
import * as N3 from 'n3';
import { Writer } from 'n3';
import rdfParser from 'rdf-parse';
import { LDES, RDF, TREE, VOID } from './Vocabularies';

export interface Literal {
  '@value': string;
  '@type'?: string;
  '@language'?: string;
}

/**
 * Retrieve base object
 * @param store
 * @param term
 */
export function retrieveTerm(store: N3.Store, term: N3.Term) {
  return retrieveFullObject(store, term, false);
}

/**
 * Recursively retrieve data by following all available predicates
 * @param store
 * @param term
 * @param recursive
 * @param processedIds
 */
function retrieveFullObject(store: N3.Store, term: N3.Term, recursive = true, processedIds: string[] = []) {
  switch (term.termType) {
    case 'Literal':
      return createLiteral(store, term);
    case 'BlankNode':
      if (recursive) {
        return createObject(store, term, processedIds);
      }

      return { '@id': term.id };

    case 'NamedNode':
      if (recursive) {
        return createObject(store, term as N3.NamedNode, processedIds);
      }

      return { '@id': term.id };

    default:
      // We do not process variables in metadata extraction.Literal
      return {};
  }
}

/**
 * Create a literal object
 * @param store
 * @param literal
 */
const createLiteral = (store: N3.Store, literal: N3.Literal): Literal => {
  const item: Literal = { '@value': literal.value };

  if (literal.datatype) {
    item['@type'] = literal.datatype.id;
  }
  if (literal.language) {
    item['@language'] = literal.language;
  }

  return item;
};

/**
 * Create an object, and recursively add objects for all
 * @param store
 * @param namedNode
 * @param processedIds
 */
const createObject = (store: N3.Store, namedNode: N3.NamedNode | N3.BlankNode, processedIds: string[]) => {
  const item: any = namedNode.termType === 'NamedNode' ? { '@id': namedNode.id } : {};
  const quads = store.getQuads(namedNode.id, null, null, null);

  for (const quad of quads) {
    if (quad.predicate.id === RDF.type) {
      item['@type'] = quad.object.id;
    } else {
      // Check for circular dereferencing
      if (!quad.object.id || !processedIds.includes(quad.object.id)) {
        const newProcessedIds = processedIds.concat(quad.object.id);
        const object = retrieveFullObject(store, quad.object, true, newProcessedIds);

        item[quad.predicate.id] = item[quad.predicate.id] ? [ ...item[quad.predicate.id], object ] : [ object ];
      } else {
        console.error(`circular dependency discovered for ${quad.object.id}`);
        const object = { '@id': quad.object.id };

        item[quad.predicate.id] = item[quad.predicate.id] ? [ ...item[quad.predicate.id], object ] : [ object ];
      }
    }
  }

  return item;
};

/**
 * Extract the tree context and the namespaces required for a view
 * @param treeContext
 * @returns {Record<string, any>}
 */
export function makeViewContext(treeContext: string | Record<string, any> | undefined): Record<string, any> {
  let viewContext: Record<string, any> = {};

  if (!treeContext) {
    viewContext = { '@vocab': TREE.namespace };
  } else if (typeof treeContext === 'string') {
    viewContext = { '@vocab': treeContext };
  } else {
    viewContext = treeContext;
    viewContext.ldes = LDES.namespace;
    viewContext.void = VOID.namespace;
  }

  return viewContext;
}

export function writeJSONLDToTurtleSync(jsonLD: string, path: string): void {
  const textStream = require('streamify-string')(jsonLD);
  const stream = rdfParser.parse(textStream, { contentType: 'application/ld+json' });
  const resultStore = new N3.Store();

  resultStore.import(stream).on('end', () => {
    const writer = new Writer();
    let stringResult: string;

    writer.addQuads(resultStore.getQuads(null, null, null, null));

    writer.end((error, result) => {
      stringResult = String(result);
      fs.writeFileSync(path, stringResult);
    });
  });
}
