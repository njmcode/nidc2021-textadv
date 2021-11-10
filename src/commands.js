/* eslint-disable no-param-reassign */
import nlp from 'compromise';

const COMMANDS = {
  n: 'n',
  e: 'e',
  w: 'w',
  s: 's',
  up: 'up',
  down: 'down',
  in: 'in',
  out: 'out',
  look: 'look',
  examine: 'examine',
  get: 'get',
  drop: 'drop',
  inventory: 'inventory',
  help: 'help'
};

export const ALIASES = {
  [COMMANDS.n]: ['north', 'go north'],
  [COMMANDS.e]: ['east', 'go east'],
  [COMMANDS.w]: ['west', 'go west'],
  [COMMANDS.s]: ['south', 'go south'],
  [COMMANDS.up]: ['u', 'go up', 'ascend'],
  [COMMANDS.down]: ['d', 'go down', 'descend'],
  [COMMANDS.in]: ['enter', 'go in', 'get in'],
  [COMMANDS.out]: ['leave', 'go out', 'get out', 'exit'],
  [COMMANDS.look]: ['look around', 'where', 'where am i', 'whereami'],
  [COMMANDS.examine]: ['look at', 'inspect', 'x', 'ex', 'search', 'check'],
  [COMMANDS.get]: ['g', 'take', 'pick up', 'obtain', 'acquire', 'grab'],
  [COMMANDS.drop]: ['put down', 'toss', 'remove', 'discard'],
  [COMMANDS.inventory]: [
    'inv',
    'carrying',
    'equipment',
    'items',
    'gear'
  ],
  [COMMANDS.help]: [
    'instructions',
    'howto',
    'how to play',
    '?',
    'commands',
    'verbs',
    'words',
    'controls'
  ]
};

const setupCommands = (config) => {
  const commands = { ...COMMANDS };
  const aliases = { ...ALIASES };

  if (config.commands) {
    Object.entries(config.commands).forEach(([cmd, aliasList]) => {
      commands[cmd] = cmd;
      aliases[cmd] = aliasList;
    });
  }

  const baseCommandMap = Object.entries(aliases).reduce(
    (obj, [baseCmd, aliasList]) => {
      obj[baseCmd] = baseCmd;
      aliasList.forEach((alias) => { obj[alias] = baseCmd; });
      return obj;
    },
    {}
  );

  // Let compromise know about our new verbs
  nlp.extend((_Doc, world) => {
    // Blow away the NLP built-in dict
    // TODO: surely there's a way to use it?

    // world.words = {};

    const ext = Object.keys(baseCommandMap).reduce((obj, k) => {
      obj[k] = 'Verb';
      return obj;
    }, {});

    world.addWords(ext);
  });

  return {
    commands, aliases, baseCommandMap, nlp
  };
};

export default setupCommands;
