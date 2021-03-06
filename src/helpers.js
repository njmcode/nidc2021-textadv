import TAGS from './tags';

export const getVisibleEntities = (loc, entities) => [...loc.things]
  .map((h) => entities[h])
  .filter(
    (i) => (i.tags.has(TAGS.ITEM) || i.tags.has(TAGS.PRESENT))
    && (!i.tags.has(TAGS.INVISIBLE) && !i.tags.has(TAGS.SILENT))
  );

export const getEntitiesWithInitial = (ents) => ents.filter(
  (i) => i.meta.isInitialState && i.initial
);

export const getListableInventory = (entities, API) => [...API.inventory]
  .map((i) => entities[i])
  .filter(
    (i) => !i.tags.has(TAGS.INVISIBLE) && !i.tags.has(TAGS.SILENT)
  );

export const getSummaryListText = (ents, API) => ents.map((i) => API.dyntext(i.summary)).join(', ');

export const isSubjectMoveable = (subject) => (
  subject
    && subject.tags.has(TAGS.ITEM)
    && !subject.tags.has(TAGS.FIXED)
    && !subject.tags.has(TAGS.INVISIBLE)
);
