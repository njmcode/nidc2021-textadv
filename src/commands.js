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
  [COMMANDS.in]: ['enter', 'go in'],
  [COMMANDS.out]: ['leave', 'go out', 'exit'],
  [COMMANDS.look]: ['look around', 'where', 'where am i', 'whereami'],
  [COMMANDS.examine]: ['look at', 'inspect', 'x', 'ex', 'search'],
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

export default COMMANDS;
