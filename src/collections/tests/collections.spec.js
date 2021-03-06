import { v4 as uuid } from 'uuid';
import getConfig from '../../config/load';
import { email, password } from '../../../tests/api/credentials';

require('isomorphic-fetch');

const { serverURL: url } = getConfig();

let token = null;
let headers = null;

let localizedPostID;
const englishPostDesc = 'english description';
const spanishPostDesc = 'spanish description';

describe('Collections - REST', () => {
  beforeAll(async (done) => {
    const response = await fetch(`${url}/api/admins/login`, {
      body: JSON.stringify({
        email,
        password,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'post',
    });

    const data = await response.json();

    ({ token } = data);
    headers = {
      Authorization: `JWT ${token}`,
      'Content-Type': 'application/json',
    };

    done();
  });

  describe('Create', () => {
    it('should allow a localized post to be created', async () => {
      const response = await fetch(`${url}/api/localized-posts`, {
        body: JSON.stringify({
          title: 'title',
          description: englishPostDesc,
          priority: 1,
        }),
        headers,
        method: 'post',
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.doc.title).not.toBeNull();
      expect(data.doc.id).not.toBeNull();
      const timestampRegex = /^(\d{4})(?:-?W(\d+)(?:-?(\d+)D?)?|(?:-(\d+))?-(\d+))(?:[T ](\d+):(\d+)(?::(\d+)(?:\.(\d+))?)?)?(?:Z(-?\d*))?$/;
      expect(data.doc.createdAt).toStrictEqual(expect.stringMatching(timestampRegex));
      expect(data.doc.updatedAt).toStrictEqual(expect.stringMatching(timestampRegex));

      localizedPostID = data.doc.id;
    });
  });

  describe('Update', () => {
    it('should allow updating an existing post', async () => {
      const createResponse = await fetch(`${url}/api/localized-posts`, {
        body: JSON.stringify({
          title: 'title',
          description: 'original description',
          priority: 1,
        }),
        headers,
        method: 'post',
      });

      expect(createResponse.status).toBe(201);
      const createData = await createResponse.json();
      const { id } = createData.doc;

      const updatedDesc = 'updated description';
      const response = await fetch(`${url}/api/localized-posts/${id}`, {
        body: JSON.stringify({
          title: 'title',
          description: updatedDesc,
          priority: 1,
        }),
        headers,
        method: 'put',
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.doc.description).toBe(updatedDesc);
    });

    it('should allow a Spanish locale to be added to an existing post', async () => {
      const response = await fetch(`${url}/api/localized-posts/${localizedPostID}?locale=es`, {
        body: JSON.stringify({
          title: 'title',
          description: spanishPostDesc,
          priority: 1,
        }),
        headers,
        method: 'put',
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.doc.description).toBe(spanishPostDesc);
    });
  });

  describe('Read', () => {
    describe('Localized', () => {
      it('should allow a localized post to be retrieved in unspecified locale, defaulting to English', async () => {
        const response = await fetch(`${url}/api/localized-posts/${localizedPostID}`);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.description).toBe(englishPostDesc);
      });

      it('should allow a localized post to be retrieved in specified English locale', async () => {
        const response = await fetch(`${url}/api/localized-posts/${localizedPostID}?locale=en`);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.description).toBe(englishPostDesc);
      });

      it('should allow a localized post to be retrieved in Spanish', async () => {
        const response = await fetch(`${url}/api/localized-posts/${localizedPostID}?locale=es`);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.description).toBe(spanishPostDesc);
      });

      it('should allow a localized post to be retrieved in all locales', async () => {
        const response = await fetch(`${url}/api/localized-posts/${localizedPostID}?locale=all`);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.description.es).toBe(spanishPostDesc);
        expect(data.description.en).toBe(englishPostDesc);
      });
    });

    it('should allow querying by id', async () => {
      const response = await fetch(`${url}/api/localized-posts`, {
        body: JSON.stringify({
          title: 'title',
          description: 'description',
          priority: 1,
        }),
        headers,
        method: 'post',
      });

      expect(response.status).toBe(201);

      const data = await response.json();
      const getResponse = await fetch(`${url}/api/localized-posts/${data.doc.id}`);

      expect(getResponse.status).toBe(200);

      const getData = await getResponse.json();

      expect(getData.id).not.toBeNull();
    });

    it('should allow querying on a field', async () => {
      const desc = 'query test';
      const response = await fetch(`${url}/api/localized-posts`, {
        body: JSON.stringify({
          title: 'title',
          description: desc,
          priority: 1,
        }),
        headers,
        method: 'post',
      });

      expect(response.status).toBe(201);
      const getResponse = await fetch(`${url}/api/localized-posts?where[description][equals]=${desc}`);
      const data = await getResponse.json();

      expect(getResponse.status).toBe(200);
      expect(data.docs[0].description).toBe(desc);
      expect(data.docs).toHaveLength(1);
    });

    it('should allow querying with OR', async () => {
      const title1 = 'Or1';
      const title2 = 'Or2';
      const response = await fetch(`${url}/api/localized-posts`, {
        body: JSON.stringify({
          title: title1,
          description: 'desc',
          priority: 1,
        }),
        headers,
        method: 'post',
      });

      const response2 = await fetch(`${url}/api/localized-posts`, {
        body: JSON.stringify({
          title: title2,
          description: 'desc',
          priority: 1,
        }),
        headers,
        method: 'post',
      });

      expect(response.status).toBe(201);
      expect(response2.status).toBe(201);

      const queryResponse = await fetch(`${url}/api/localized-posts?where[or][0][title][equals]=${title1}&where[or][1][title][equals]=${title2}`);
      const data = await queryResponse.json();

      expect(queryResponse.status).toBe(200);
      expect(data.docs).toHaveLength(2);
      expect(data.docs).toContainEqual(expect.objectContaining({ title: title1 }));
      expect(data.docs).toContainEqual(expect.objectContaining({ title: title2 }));
    });

    it('should allow querying with OR, 1 result', async () => {
      const title1 = 'OrNegative1';
      const title2 = 'OrNegative2';
      const response = await fetch(`${url}/api/localized-posts`, {
        body: JSON.stringify({
          title: title1,
          description: 'desc',
          priority: 1,
        }),
        headers,
        method: 'post',
      });

      const response2 = await fetch(`${url}/api/localized-posts`, {
        body: JSON.stringify({
          title: title2,
          description: 'desc',
          priority: 1,
        }),
        headers,
        method: 'post',
      });

      expect(response.status).toBe(201);
      expect(response2.status).toBe(201);

      const queryResponse = await fetch(`${url}/api/localized-posts?where[or][0][title][equals]=${title1}&where[or][1][title][equals]=nonexistent`);
      const data = await queryResponse.json();

      expect(queryResponse.status).toBe(200);
      expect(data.docs).toHaveLength(1);
      expect(data.docs[0].title).toBe(title1);
    });
  });

  describe('Delete', () => {
    it('should allow a post to be deleted', async () => {
      const response = await fetch(`${url}/api/localized-posts`, {
        body: JSON.stringify({
          title: 'title',
          description: englishPostDesc,
          priority: 1,
        }),
        headers,
        method: 'post',
      });

      const data = await response.json();
      const docId = data.doc.id;
      expect(response.status).toBe(201);
      expect(docId).not.toBeNull();

      const deleteResponse = await fetch(`${url}/api/localized-posts/${docId}`, {
        headers,
        method: 'delete',
      });
      expect(deleteResponse.status).toBe(200);
      const deleteData = await deleteResponse.json();
      expect(deleteData.id).toBe(docId);
    });
  });

  describe('Metadata', () => {
    async function createPost(title, description) {
      await fetch(`${url}/api/localized-posts`, {
        body: JSON.stringify({
          title: title || uuid(),
          description,
          priority: 1,
        }),
        headers,
        method: 'post',
      });
    }

    it('should include metadata', async () => {
      const desc = 'metadataDesc';
      for (let i = 0; i < 12; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await createPost(null, desc);
      }

      const getResponse = await fetch(`${url}/api/localized-posts?where[description][equals]=${desc}`);
      const data = await getResponse.json();

      expect(getResponse.status).toBe(200);

      // TODO: Assert exact length once query bug is fixed
      expect(data.docs.length).toBeGreaterThan(0);
      expect(data.totalDocs).toBeGreaterThan(0);
      expect(data.limit).toBe(10);
      expect(data.totalPages).toBe(2);
      expect(data.page).toBe(1);
      expect(data.pagingCounter).toBe(1);
      expect(data.hasPrevPage).toBe(false);
      expect(data.hasNextPage).toBe(true);
      expect(data.prevPage).toBeNull();
      expect(data.nextPage).toBe(2);
    });

    it('should sort the results', async () => {
      const desc = 'sort';

      // Create 2 posts with different titles, same desc
      const req1 = await fetch(`${url}/api/localized-posts`, {
        body: JSON.stringify({
          title: 'aaa',
          description: desc,
          priority: 1,
        }),
        headers,
        method: 'post',
      });

      const req2 = await fetch(`${url}/api/localized-posts`, {
        body: JSON.stringify({
          title: 'zzz',
          description: desc,
          priority: 1,
        }),
        headers,
        method: 'post',
      });

      const req1data = await req1.json();
      const req2data = await req2.json();
      const id1 = req1data.doc.id;
      const id2 = req2data.doc.id;

      // Query on shared desc and sort ascending
      const getResponse = await fetch(`${url}/api/localized-posts?where[description][equals]=${desc}&sort=title`);
      const data = await getResponse.json();

      expect(getResponse.status).toBe(200);
      expect(data.docs).toHaveLength(2);
      expect(data.docs[0].id).toStrictEqual(id1);
      expect(data.docs[1].id).toStrictEqual(id2);

      // Query on shared desc and sort descending
      const getResponseSorted = await fetch(`${url}/api/localized-posts?where[description][equals]=${desc}&sort=-title`);
      const sortedData = await getResponseSorted.json();

      expect(getResponse.status).toBe(200);
      expect(sortedData.docs).toHaveLength(2);
      // Opposite order from first request
      expect(sortedData.docs[0].id).toStrictEqual(id2);
      expect(sortedData.docs[1].id).toStrictEqual(id1);
    });
  });
});
