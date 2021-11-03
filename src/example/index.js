/* eslint-disable no-param-reassign */
import Engine from '..';
import 'normalize.css';
import './index.scss';

const pub = () => ({
  id: 'pub',
  summary: 'A cosy pub.',
  description: 'This firelit drinking den is empty of people. A cellar door leads downstairs. The kitchen is east.',
  to: {
    down: 'cellar',
    e: 'kitchen'
  }
});

const cellar = () => ({
  id: 'cellar',
  summary: 'A musty wine cellar.',
  description: 'In the gloom and dust, you can make out rack upon rack of wine bottles. Firelight glows from an overhead hatch.',
  to: {
    up: 'pub'
  }
});

const kitchen = () => ({
  id: 'kitchen',
  summary: 'A well-stocked kitchen.',
  description: 'The shelves of the small kitchen are almost bursting with fresh meat and produce. The west door leads to the pub.',
  to: {
    w: 'pub'
  }
});

const myGame = new Engine({
  entities: [pub, cellar, kitchen]
});
myGame.start();
