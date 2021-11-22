# LDES-Announcements
[![npm](https://img.shields.io/npm/v/@treecg/ldes-announcements)](https://www.npmjs.com/package/@treecg/ldes-announcements)

This library handles parsing and creating LDES announcements.
Such announcements can be sent to a [Solid](https://solidproject.org/TR/protocol) inbox (like [https://tree.linkeddatafragments.org/announcements/](https://tree.linkeddatafragments.org/inbox/)), where they can be curated.

## How to extract (parse) announcements

```javascript
const LDESannouncements = require('@treecg/ldes-announcements');
const rdfParser = require("rdf-parse").default;
const streamifyString = require('streamify-string');
const storeStream = require("rdf-store-stream").storeStream;

const announcementText = `
@prefix : <https://tree.linkeddatafragments.org/announcements/1636985640000/ExampleViewAnnouncement.ttl#> .
@prefix as: <https://www.w3.org/ns/activitystreams#> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix ldes: <https://w3id.org/ldes#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix tree: <https://w3id.org/tree#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

<https://smartdata.dev-vlaanderen.be/base/gemeente> tree:view :view .

:announcement rdf:type as:Announce ;
as:actor <https://github.com/woutslabbinck> ;
as:object :view .

:bucketizerConfiguration rdf:type ldes:BucketizerConfiguration ;
ldes:bucketizer ldes:SubstringBucketizer ;
ldes:pageSize "100"^^xsd:positiveInteger ;
tree:path rdfs:label .

:view dct:issued "2021-10-15T00:00:00.000Z"^^xsd:dateTime ;
dct:isVersionOf <https://woutslabbinck.github.io/blabla/blabla/root.ttl> ;
rdf:type tree:Node ;
ldes:configuration :bucketizerConfiguration .
`
// convert string (text/turtle) into N3 Store
const textStream = streamifyString(announcementText);
const quadStream = rdfParser.parse(textStream,{contentType: 'text/turtle'});
const store = await storeStream(quadStream);

// use extractAnnouncementsMetadata to parse the announcement
const announcements = await LDESannouncements.extractAnnouncementsMetadata(store);
```
The variable `announcements` contains four Maps where the announcements Map (`announcements.announcements`) contains the announcement and in this case the views map will contain the view corresponding to the announcement.

```javascript
// Extract announcement and view, which are objects from the interfaces defined in src/util/Interfaces.ts
const announcement = announcements.announcements.get('https://tree.linkeddatafragments.org/announcements/1636985640000/ExampleViewAnnouncement.ttl#announcement');
const view = announcements.views.get('https://tree.linkeddatafragments.org/announcements/1636985640000/ExampleViewAnnouncement.ttl#view');

// print out the view (in JSON-LD representation)
console.log(JSON.stringify(view));
```
import { extractAnnouncementsMetadata } from './lib/Extraction';
import { fetchAllAnnouncements, postAnnouncement } from './lib/LDPCommunication';
import { AnnouncementConfig, createViewAnnouncement } from './lib/Writer';
### Parsing from URI
It is easier when the document is hosted, because then no parsing to a store is required

```javascript
const LDESannouncements = require('@treecg/ldes-announcements');
const rdfRetrieval = require('@dexagod/rdf-retrieval');

const store = await rdfRetrieval.getResourceAsStore('https://tree.linkeddatafragments.org/announcements/1636985640000/ExampleViewAnnouncement.ttl');
const announcements = await LDESannouncements.extractAnnouncementsMetadata(store);

// Extract announcement and view, which are objects from the interfaces defined in src/util/Interfaces.ts
const announcement = announcements.announcements.get('https://tree.linkeddatafragments.org/announcements/1636985640000/ExampleViewAnnouncement.ttl#announcement');
const view = announcements.views.get('https://tree.linkeddatafragments.org/announcements/1636985640000/ExampleViewAnnouncement.ttl#view');

// print out the view (in JSON-LD representation)
console.log(JSON.stringify(view));
```

### Parsing from an announcement LDES containing multiple announcements

```javascript
const LDESannouncements = require('@treecg/ldes-announcements');

const store = await LDESannouncements.fetchAllAnnouncements('https://tree.linkeddatafragments.org/announcements/');
const announcements = await LDESannouncements.extractAnnouncementsMetadata(store);

// print all ids, time created and original LDES from the view announcements
announcements.views.forEach(value => {
    console.log(`View ID: ${value['@id']} | Created at: ${value['dct:issued']['@value']}`);
    console.log(`Original LDES: ${value['@reverse'].view['@id']}`);
});
```
## How to create announcements

```javascript
const LDESannouncements = require('@treecg/ldes-announcements');
const rdfParser = require("rdf-parse").default;
const streamifyString = require('streamify-string');
const storeStream = require("rdf-store-stream").storeStream;

// The root string MUST contain all the information of a root node according to the TREE Hypermedia specification (https://w3id.org/tree/specification)
// It can also contain information of a retention policy as defined in the Linked Data Event Streams specification (https://w3id.org/ldes/specification)
const root = `
<https://example.org/output/root.ttl> a <https://w3id.org/tree#Node>.
`;

const announcementConfig = {
    bucketizer: 'substring',
    creatorName: 'woutslabbinck',
    creatorURL: 'https://github.com/woutslabbinck',
    originalLDESURL: 'https://smartdata.dev-vlaanderen.be/base/gemeente',
    pageSize: "100",
    propertyPath: 'http://www.w3.org/2000/01/rdf-schema#label',
    viewId: 'https://example.org/output/root.ttl'
};

// convert string (text/turtle) into N3 Store
const textStream = streamifyString(root);
const quadStream = rdfParser.parse(textStream,{contentType: 'text/turtle'});
const store = await storeStream(quadStream);

// Create an announcement with a view using the store and the announcement configuration
const announcement = await LDESannouncements.createViewAnnouncement(store, announcementConfig);
console.log(JSON.stringify(announcement));
```
### Sending announcements to an inbox

![img](./img/LDES%20Write-Writing%20to%20container.png)
```javascript
const LDESannouncements = require('@treecg/ldes-announcements');
const rdfParser = require("rdf-parse").default;
const streamifyString = require('streamify-string');
const storeStream = require("rdf-store-stream").storeStream;

// The root string MUST contain all the information of a root node according to the TREE Hypermedia specification (https://w3id.org/tree/specification)
// It can also contain information of a retention policy as defined in the Linked Data Event Streams specification (https://w3id.org/ldes/specification)
const root = `
<https://example.org/output/root.ttl> a <https://w3id.org/tree#Node>.
`;

const announcementConfig = {
bucketizer: 'substring',
creatorName: 'woutslabbinck',
creatorURL: 'https://github.com/woutslabbinck',
originalLDESURL: 'https://smartdata.dev-vlaanderen.be/base/gemeente',
pageSize: "100",
propertyPath: 'http://www.w3.org/2000/01/rdf-schema#label',
viewId: 'https://example.org/output/root.ttl'
};

// convert string (text/turtle) into N3 Store
const textStream = streamifyString(root);
const quadStream = rdfParser.parse(textStream,{contentType: 'text/turtle'});
const store = await storeStream(quadStream);
// Create an announcement with a view using the store and the announcement configuration

const announcement = await LDESannouncements.createViewAnnouncement(store, announcementConfig);

// The URL of the root container of an LDES in LDP (Linked Data Platform, see https://www.w3.org/TR/ldp/)
const announcementInbox = 'https://tree.linkeddatafragments.org/announcements/'
// Using the protocol shown in the figure, POST to the LDP Container
const response = await LDESannouncements.postAnnouncement(announcement, announcementInbox);
```

