/* eslint-disable no-param-reassign */
import Engine from '../lib/index.modern';

import locations from './locations';
import globalLogic from './global-logic';

import 'normalize.css';
import './index.scss';

Engine.start({
  entities: [
    ...locations
  ],
  ...globalLogic
});
