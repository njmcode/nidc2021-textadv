/* eslint-disable no-param-reassign */
import nlp from 'compromise';
import { arrayToObject } from './utils';

const setupEntities = (config) => {
  const baseNounMap = {};
  let startLocationId;

  // Iterate the defined game entities and set up
  // metadata, self-reference functions, and lists
  // for tags/things etc
  // TODO: validate and seal these objects
  const entities = config.entities.reduce((obj, ent, idx) => {
    const entObj = ent(() => entities[entObj.id]);

    if (!entObj.id) {
      console.error(entObj);
      throw new Error('Missing entity id');
    }

    // Decorate the entity with metadata & author utils
    entObj.is = (id) => entObj.id === id;
    entObj.exists = true;
    entObj.meta = {
      visitCount: 0,
      isInitialState: true,
      isExamined: false
    };

    if (!entObj.data) entObj.data = {};
    if (!entObj.things) entObj.things = [];
    if (!entObj.tags) entObj.tags = [];
    // 'things' and 'tags' are converted to Sets
    // to ensure uniqueness and provide a built-in API
    // for authors (add, delete, has etc)
    entObj.things = new Set(entObj.things);
    entObj.tags = new Set(entObj.tags);

    // Validate entity nouns and add them to our global list
    if (entObj.nouns) {
      entObj.nouns.forEach((noun) => {
        if (noun in baseNounMap) {
          throw new Error(`Duplicate noun '${noun}' found for entity '${entObj.id}'`);
        }

        baseNounMap[noun] = entObj.id;
      });
    }

    obj[entObj.id] = entObj;

    // Use the first-defined entity as the start location
    // if the config hasn't explicitly defined one
    if (idx === 0) {
      startLocationId = config.startLocationId || entObj.id;
    }

    return obj;
  }, {});

  // Tell nlp about our new nouns
  nlp.extend((_Doc, world) => {
    const extraNouns = arrayToObject(
      Object.keys(baseNounMap),
      () => 'Noun'
    );
    world.addWords(extraNouns);
  });

  // Returns the first entity containing the given noun, that is also
  // in one of the fromLists, and passes the filterFn.
  // Used by commands to determine target of 'get', 'examine' etc
  const getSubject = (noun, fromLists, filterFn = () => true) => {
    if (!(noun in baseNounMap)) return false;
    if (!(fromLists instanceof Array)) fromLists = [fromLists];

    const nounSubject = entities[baseNounMap[noun]];

    let validSubject = false;
    fromLists.forEach((list) => {
      if (list.has(nounSubject.id) && filterFn(nounSubject)) {
        validSubject = nounSubject;
      }
    });

    return validSubject;
  };

  return {
    entities,
    baseNounMap,
    startLocationId,
    getSubject
  };
};

export default setupEntities;
