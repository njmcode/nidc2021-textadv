/* eslint-disable no-param-reassign */
/* eslint-disable import/prefer-default-export */

// Returns arr with any and all exclArray items removed
export const arrayExclude = (arr, exclArray) => arr.filter((i) => !exclArray.includes(i));

// Retunrs an object with arr values as keys, and return value
// of assignmentCallback as values (takes (obj, key) as args)
// e.g.
// arrayToObject(
//   ['foo', 'bar'],
//   (_obj, k) => `shazam_${k}`
// )
// -> { 'foo': 'shazam_foo', 'bar': 'shazam_bar' }
export const arrayToObject = (arr, assignmentCallback) => arr.reduce((obj, k) => {
  obj[k] = assignmentCallback(obj, k);
  return obj;
}, {});
