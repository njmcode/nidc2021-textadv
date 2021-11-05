/* eslint-disable no-param-reassign */
import Engine from '..';
import 'normalize.css';
import './index.scss';

// Utility for color spans
const ct = (color, text) => `<span style="color:${color};">${text}</span>`;

// Shared function for a unique crowbar description when first revealed.
// TODO: solve for this more generally in the engine
const doCrowbarInitial = (game) => {
  if (!game.location.things.has('crowbar') || !game.entity('crowbar').tags.has('silent')) return;
  game.print('There is a crowbar sticking up from amongst the debris on the floor.');
};

const bomb = (getThis) => ({
  id: 'bomb',
  nouns: ['bomb', 'time bomb', 'explosives'],
  tags: ['scenery'],
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
  summary: 'A dingy basement with no way up.',
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
  onGoTo: ({ game, afterGoTo }) => {
    // Print game intro
    if (!game.location.meta.visitCount) {
      game.print([
        '<strong>SECONDS TO LIVE</strong><br>by njmcode',
        '---'
      ], 'info');
    }

    // Describe the crowbar if it's here but not moved
    afterGoTo(() => {
      doCrowbarInitial(game);
    });
  }
});

const wire = () => ({
  id: 'wire',
  nouns: ['wire', 'wires', 'bomb wire', 'red wire', 'red', 'timer'],
  description: 'A single red wire runs between the timer and the explosive. Amateur stuff, but effective.',
  tags: ['scenery']
});

const debris = () => ({
  id: 'debris',
  nouns: ['debris', 'rubbish', 'rubble', 'stuff', 'floor'],
  tags: ['scenery'],
  description: 'Broken glass, twisted rebar, smashed concrete, dust and other detritus.',
  data: {
    isExamined: false
  }
});

const crowbar = () => ({
  id: 'crowbar',
  nouns: ['crowbar', 'bar', 'rusty crowbar'],
  summary: 'a crowbar',
  tags: ['silent'],
  description: 'Rusted, but still sturdy.'
});

const door = (getThis) => ({
  id: 'door',
  nouns: ['door', 'sturdy door', 'east door'],
  tags: ['scenery'],
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
  onGoTo: ({ game, stopGoTo }) => {
    // Can't enter here while door is sealed
    if (game.entity('door').data.isSealed) {
      game.print("The door won't budge!");
      stopGoTo();
    }
  }
});

const toolbox = () => ({
  id: 'toolbox',
  nouns: ['toolbox', 'tool box', 'box', 'toolkit', 'tool case'],
  summary: 'a toolbox',
  description: 'A small metal case with a carry-handle. It is unlocked.',
  data: {
    isExamined: false
  }
});

const wirecutters = () => ({
  id: 'wirecutters',
  nouns: ['wire cutters', 'cutters', 'pliers'],
  summary: 'a pair of wire cutters',
  description: 'Probably from an electrician\'s tool box.'
});

const newGame = new Engine({
  entities: [basement, door, bomb, wire, debris, crowbar, storage, toolbox, wirecutters],
  commands: {
    pull: ['pull', 'remove', 'tamper', 'disconnect', 'yank', 'tear'],
    defuse: ['defuse', 'stop', 'disarm', 'disable'],
    cut: ['cut', 'snip', 'sever'],
    force: ['force', 'open', 'force open', 'pry open', 'pry', 'jam', 'hit', 'kick', 'smash', 'break']
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
    game, command, subject, stopCommand, afterCommand
  }) => {
    // Special crowbar handling
    if (command.look && game.location.is('basement')) {
      afterCommand(() => {
        doCrowbarInitial(game);
      });
    }
    if (command.get && subject.is('crowbar')) {
      subject.tags.delete('silent');
    }

    if (command.examine) {
      // Find crowbar in debris
      if (subject.is('debris') && !subject.data.isExamined) {
        afterCommand(() => {
          game.print('Sifting through the rubble, you uncover a rusty crowbar.');
          game.location.things.add('crowbar');
        });
      }

      // Find cutters in toolbox
      if (subject.is('toolbox') && !subject.data.isExamined) {
        afterCommand(() => {
          game.print('As you inspect the tool case, something falls out to the floor.');
          game.location.things.add('wirecutters');
        });
      }
    }

    // Handle generic solutions
    if (command.defuse && (subject.is('bomb') || subject.is('wire'))) {
      game.print('How are you going to do that?');
      stopCommand();
    }

    // Handle lack of finesse
    if (command.pull && subject.is('wire')) {
      game.print([
        'You pull out the wire.',
        'There is a moment of relief, before the bomb explodes, obliterating everything around it... including you.',
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
      stopCommand();
    }

    // Cut the wire
    if (command.cut && subject.is('wire')) {
      if (game.inventory.has('wirecutters')) {
        game.print([
          'You snip the wire.',
          `...The timer stops at ${game.entity('bomb').data.remaining}!`,
          `${ct('lightgreen', 'Well done!')}`
        ]);
        game.end();
      } else {
        game.print('You will need some kind of tool to cut it.');
      }
      stopCommand();
    }
  }
});

newGame.start();
