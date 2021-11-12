/* eslint-disable no-param-reassign */
import nlp from 'compromise';
import { arrayToObject } from './utils';

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

  // Add custom commands and aliases to our lists
  if (config.commands) {
    Object.entries(config.commands).forEach(([cmd, aliasList]) => {
      commands[cmd] = cmd;
      aliases[cmd] = aliasList;
    });
  }

  // For every command alias, create a map entry
  // pointing to the base command for that alias
  // (e.g. { 'get':'get', 'take':'get', 'pick up':'get' })
  const baseCommandMap = arrayToObject(
    Object.keys(aliases),
    (obj, k) => {
      aliases[k].forEach((alias) => { obj[alias] = k; });
      return k;
    }
  );

  // Let compromise know about our new commands
  nlp.extend((_Doc, world) => {
    // TODO: fix collisions with existing verbs that are
    // defined as something else (e.g. 'me')
    // world.words = {};

    const ext = arrayToObject(
      Object.keys(baseCommandMap),
      () => 'Verb'
    );
    world.addWords(ext);
  });

  return {
    commands, aliases, baseCommandMap, nlp
  };
};

export default setupCommands;
