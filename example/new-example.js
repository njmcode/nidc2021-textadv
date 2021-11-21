/* eslint-disable no-param-reassign */
import Engine from '../lib/index.modern';
import 'normalize.css';
import './index.scss';

// Utility for color spans
const ct = (color, text) => `<span style="color:${color};">${text}</span>`;

const bomb = (getThis) => ({
  id: 'bomb',
  nouns: ['bomb', 'time bomb', 'explosives', 'counter'],
  description: [
    'A large pack of explosives with a wire attached to a timer. It is counting down!',
    () => `The counter shows the number ${ct('salmon', getThis().data.remaining)}...`
  ],
  data: {
    remaining: 14
  }
});

const basement = () => ({
  id: 'basement',
  summary: 'A dingy basement with no way up. Oh, and a ticking bomb.',
  description: [
    'You are trapped in a dank basement with no visible means to get to the surface.',
    'Debris and rubbish is strewn about the floor, and a sturdy wooden door sits in the east wall.',
    `In the corner, you can see a ticking ${ct('salmon', 'time bomb!')}`
  ],
  things: ['bomb', 'debris', 'wire', 'door'],
  to: {
    e: 'storage',
    in: 'storage'
  },
  onGoTo: ({ game }) => {
    // Print game intro
    if (!game.location.meta.visitCount) {
      game.print([
        '<strong>SECONDS TO LIVE</strong><br>by njmcode',
        '---'
      ], 'info');
    }
  },
  onLook: ({ game }) => () => {
    game.print('The bomb counter is active.');
  }
});

const wire = () => ({
  id: 'wire',
  nouns: ['wire', 'wires', 'bomb wire', 'red wire', 'red', 'timer'],
  description: 'A single red wire runs between the timer and the explosive. Amateur stuff, but effective.'
});

const debris = () => ({
  id: 'debris',
  nouns: ['debris', 'rubbish', 'rubble', 'stuff', 'floor'],
  description: 'Broken glass, twisted rebar, smashed concrete, dust and other detritus.'
});

const crowbar = () => ({
  id: 'crowbar',
  tags: ['item'],
  nouns: ['crowbar', 'bar', 'rusty crowbar'],
  summary: 'a crowbar',
  initial: 'There is a crowbar sticking up from amongst the debris on the floor.',
  description: 'Rusted, but still sturdy.'
});

const door = (getThis) => ({
  id: 'door',
  nouns: ['door', 'sturdy door', 'east door'],
  data: {
    isSealed: true
  },
  description: () => (getThis().data.isSealed
    ? 'It\'s sealed shut. The timbers seem a little rotten. With the right help, you could probably get it open.'
    : 'It has been forced open.')
});

const storage = () => ({
  id: 'storage',
  summary: 'A cramped old storage room.',
  description: 'This claustrophobic storage room smells of must. Bits of broken timber lie strewn about. The west door leads out to the basement.',
  things: ['toolbox', 'door'],
  to: {
    w: 'basement',
    out: 'basement'
  },
  onGoTo: ({ game }) => {
    // Can't enter here while door is sealed
    if (game.entity('door').data.isSealed) {
      game.print("The door won't budge!");
      return false;
    }
    return true;
  }
});

const toolbox = () => ({
  id: 'toolbox',
  tags: ['item'],
  nouns: ['toolbox', 'tool box', 'box', 'toolkit', 'tool case'],
  summary: 'a toolbox',
  description: 'A small metal case with a carry-handle. It is unlocked.'
});

const wirecutters = () => ({
  id: 'wirecutters',
  tags: ['item'],
  nouns: ['wire cutters', 'wirecutters', 'cutters', 'pliers'],
  summary: 'a pair of wire cutters',
  description: 'Probably from an electrician\'s tool box.'
});

Engine.start({
  entities: [basement, door, bomb, wire, debris, crowbar, storage, toolbox, wirecutters],
  commands: {
    pull: ['pull', 'pull out', 'remove', 'tamper with', 'disconnect', 'yank', 'tear'],
    defuse: ['defuse', 'stop', 'disarm', 'disable'],
    cut: ['cut', 'snip', 'sever'],
    force: ['force', 'open', 'force open', 'pry open', 'pry', 'jam', 'hit', 'kick', 'kick down', 'break', 'break down', 'smash', 'break']
  },
  onTurn: ({ game }) => {
    // Bomb timer
    const bombEnt = game.entity('bomb');

    if (bombEnt.data.remaining === 0) {
      game.print([
        'The bomb explodes, blowing you and the entire building to smithereens.',
        `${ct('salmon', 'Game Over.')}`
      ]);
      game.end();
    } else {
      game.print(`<em>${ct('salmon', bombEnt.data.remaining % 2 ? 'Tock...' : 'Tick...')}</em>`);
      bombEnt.data.remaining -= 1;
    }
  },
  onCommand: ({
    game, command, subject
  }) => {
    if (command.examine) {
      // Find crowbar in debris
      if (subject.is('debris') && !subject.meta.isExamined) {
        return () => {
          game.print('Sifting through the rubble, you uncover a rusty crowbar.');
          game.location.things.add('crowbar');
        };
      }

      // Find cutters in toolbox
      if (subject.is('toolbox') && !subject.meta.isExamined) {
        return () => {
          game.print('As you inspect the tool case, something falls out to the floor.');
          game.location.things.add('wirecutters');
        };
      }
    }

    // Handle generic solutions
    if (command.defuse && (subject.is('bomb') || subject.is('wire'))) {
      game.print('How are you going to do that?');
      return false;
    }

    // Handle lack of finesse
    if (command.pull && subject.is('wire')) {
      game.print('You pull out the wire.');
      game.pause(2000);
      game.print('You breathe a sigh of relief.');
      game.pause(2000);
      game.print([
        '...before the bomb explodes, obliterating everything around it... including you.',
        `${ct('salmon', 'Game Over.')}`
      ]);
      game.end();
    }

    // Force door open with crowbar
    if (command.force && subject.is('door')) {
      if (!subject.data.isSealed) {
        game.print('It is already forced open.');
      } else if (game.inventory.has('crowbar')) {
        game.print('You jam the crowbar between the door and frame, forcing it open with some effort.');
        subject.data.isSealed = false;
      } else {
        game.print("It's stuck. You'll need something to force it open with.");
      }
      return false;
    }

    // Cut the wire
    if (command.cut && subject.is('wire')) {
      if (game.inventory.has('wirecutters')) {
        game.print('You snip the wire.');
        game.pause(1000 + ((Math.random() * 3) * 1000));
        game.print([
          `...The timer stops at ${game.entity('bomb').data.remaining}!`,
          `${ct('lightgreen', 'Well done!')}`
        ]);
        game.end();
      } else {
        game.print('You will need some kind of tool to cut it.');
      }
      return false;
    }

    return true;
  }
});
