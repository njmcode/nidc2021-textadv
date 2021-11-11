/* eslint-disable no-param-reassign */
import Engine from '../lib/index.modern';

import locations from './locations';
import items from './items';
import scenery from './scenery';
import globalLogic from './global-logic';

import 'normalize.css';
import './index.scss';

Engine.start({
  entities: [
    ...locations,
    ...items,
    ...scenery
  ],
  ...globalLogic
});
