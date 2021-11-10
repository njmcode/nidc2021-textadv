/* eslint-disable no-param-reassign */
import nlp from 'compromise';

const setupEntities = (config) => {
  const baseNounMap = {};

  let startLocationId;

  const entities = config.entities.reduce((obj, ent, idx) => {
    const entObj = ent(() => entities[entObj.id]);
    if (!entObj.id) {
      console.error(entObj);
      throw new Error('Missing entity id');
    }

    entObj.is = (id) => entObj.id === id;
    entObj.exists = true;
    entObj.meta = {
      visitCount: 0,
      isInitialState: true,
      isExamined: false
    };

    if (entObj.nouns) {
      entObj.nouns.forEach((noun) => {
        if (noun in baseNounMap) {
          throw new Error(`Duplicate noun '${noun}' found for entity '${entObj.id}'`);
        }

        baseNounMap[noun] = entObj.id;
      });
    }

    if (!entObj.data) entObj.data = {};
    if (!entObj.things) entObj.things = [];
    if (!entObj.tags) entObj.tags = [];
    entObj.things = new Set(entObj.things);
    entObj.tags = new Set(entObj.tags);

    obj[entObj.id] = entObj;

    if (idx === 0) {
      startLocationId = config.startLocationId || entObj.id;
    }

    return obj;
  }, {});

  nlp.extend((_Doc, world) => {
    const extraNouns = Object.keys(baseNounMap).reduce((obj, k) => {
      obj[k] = 'Noun';
      return obj;
    }, {});

    world.addWords(extraNouns);
  });

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
