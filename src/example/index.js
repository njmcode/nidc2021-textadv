/* eslint-disable no-param-reassign */

import 'normalize.css';
import './index.scss';

import Engine from '..';

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
  description: 'In the gloom and dust, you can make out rack upon rack of wine bottles. Firelight glows from an overhead hatch. To the east there is a mysterious locked door with an unusually shaped key hole.',
  to: {
    up: 'pub',
    e: 'mysteriousRoom'
  }
});

const mysteriousRoom = () => ({
  id: 'mysteriousRoom',
  summary: 'A mysterious room, to be sure.',
  data: {
    hasOwlHelmet: false
  },
  description: this.data.hasOwlHelmet ? 'This room is eerily neat and well decorated.' : 'Before you can discover what is in the room, you are overcome with chills and an extremely unsettling feeling, the likes of which you have never felt. Your mind is bombarded by quick mental flashes of strangers suffering, more rapid which each passing second. You feel as if you\'re body, instinctively, needs to get away. You can not focus.',
  to: {
    w: 'cellar'
  }
});

const goldRing = () => ({
  id: 'goldRing',
  nouns: ['gold ring', 'ring', 'owl ring', 'mysterious ring', 'ring key', 'key ring'],
  summary: 'a gold ring',
  description: 'It is unusually shaped, as if it could fit into something. You wipe the blood off and notice a mysterious emblem of an owl head with tentacles.',
});

const deadBody = () => ({
  id: 'deadBody',
  nouns: ['dead body', 'body'],
  tags: ['scenery'],
  summary: 'a Dead Body',
  description: 'On a shelf, you can make out what seems to be the motionless remains of some poor soul that has quite recently met a violent fate. It is dripping dark red fluid to the shelves below.',
  data: {
    hasGoldRing: true
  }
});

const drunkCook = () => ({
  id: 'drunkCook',
  nouns: ['drunk cook', 'cook', 'drunk', 'old man'],
  tags: ['fixed'],
  summary: 'the Drunk Cook',
  description: 'A hiccupping old man is slouched against furniture. Muttering and giggling, he fiddles with a large bloody knife.',
  data: {
    quotes: [
      '...*hiccup*...',
      '...Ha Ha Ha Ha Ha Ha...',
      '...No more yelling for \'im, aye? Ha-HA! No...no more yelling.',
      'Cook \'im...yes, cook \'im, I will. Hehehehe...',
      'He dirtied my knife. I love this knife...',
      '...YOU WANT A TASTE? YOU WANT A TASTE OF MY KNIFE?!'
    ]
  }
});

const kitchen = () => ({
  id: 'kitchen',
  summary: 'A well-stocked kitchen.',
  description: 'The shelves of the small kitchen are almost bursting with fresh meat and produce...oh, and a dead body. The west door leads to the pub.',
  things: ['deadBody', 'drunkCook'],
  to: {
    w: 'pub'
  }
});

const myGame = new Engine({
  entities: [pub, cellar, kitchen, goldRing, deadBody, drunkCook, mysteriousRoom],
  commands: {
    talk: ['talk to', 'ask', 'chat with']
  },
  onCommand: ({
    game, command, subject, stopCommand
  }) => {
    // Make any entity with data.quotes say
    // something random when asked
    if (command.talk && subject.exists && subject.data.quotes) {
      const rndQuote = subject.data.quotes[
        Math.floor(Math.random() * subject.data.quotes.length)
      ];
      game.print(`${subject.summary} says, "${rndQuote}"`);
      stopCommand();
    }

    if (
      command.examine
      && subject.exists && subject.is('deadBody')
      && subject.data.hasGoldRing
    ) {
      // Lets the default EXAMINE behaviour happen first
      afterCommand(() => {
        game.print('Amongst the bloody mess, you spot an object with a slightly different shine.');
        subject.data.hasGoldRing = false;
        game.location.things.add('goldRing');
      });
    }
  }
});
myGame.start();
