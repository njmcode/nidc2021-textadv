/* eslint-disable no-param-reassign */
import Engine from '..';
import 'normalize.css';
import './index.scss';

const jail = () => ({
  id: 'jail',
  summary: 'A filty jail.',
  description: 'This dingy, filth-encrusted jail has seen many rot away over the years.',
  things: ['sharuga']
});

const sharuga = () => ({
  id: 'sharuga',
  nouns: ['sharuga', 'barbarian', 'woman', 'prisoner'],
  tags: ['fixed'],
  summary: 'Sharuga',
  description: 'An imposing yet strangely elegant warrior woman with red facial tattoos.',
  data: {
    quotes: [
      'Do you have any grog?',
      'When I get out of here...',
      'Oh, the ladies of Waterdeep...',
      '...f*** my life.'
    ]
  }
});

const newGame = new Engine({
  entities: [jail, sharuga],
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
  }
});

newGame.start();
