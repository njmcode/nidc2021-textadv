# nidc-2021-textadv

**A lightweight JavaScript library for text parser games and interactive fiction.**

Heavily inspred by [_Graphic Adventure Creator_](https://en.wikipedia.org/wiki/_Graphic_Adventure_Creator_), [_Inform7_](http://inform7.com/), and more.

As seen at [Northern Ireland Developer Conference 2021](https://youtu.be/1x88oL_M7O4?t=1949).

```text
A dank dungeon. To the north is a tavern.
You can see a rusty sword.

> GET SWORD

Taken.

> EXAMINE IT

A worn but useable shortsword.

> N

A lively tavern. A dungeon lies to the south.
> ...
```

## Overview

This project's goal is to make JavaScript-centric text game authoring (a little) easier. Game code is human-readable and logical, but there are [way better tools for non-coders](https://itsfoss.com/create-interactive-fiction/) out there. Fair warning. :)

## Contents

- Quickstart
- Game commands
- About entities
- Creating the game map
- Adding scenery
- Adding items
- Usable items and other game logic
  - Location triggers
  - Locks and keys
  - Which thing?
  - Adding and removing things
- Dynamic text
- Other recipes
  - Un-droppable items
  - Timed events
  - Items with amounts
  - 'Examine myself' / player state
  - Per-location aesthetics
  - 'Exits are...'
  - Dark areas
  - Basic NPCs
- API
- TODO

---

## Quickstart

This project requires [Node](https://nodejs.org) v12.18 or later.

Using the library externally of this repo requires `compromise` as a dependency.

- Clone the repo.
- From the repo root, `npm install`.
- Run `npm run serve:example` then visit `localhost:1234` to see the example game running.
- Edit the example at `/example`. Changes are watched, and will refresh the browser when saved.
- Code for the library is in `/src`. Running `npm run build:lib` will build the library in various formats to `/lib`.

The project is written in vanilla JavaScript and HTML, with modular architecture and SCSS support via [`parceljs`](https://parceljs.org/). Library module bundling courtesy of [`microbundle`](https://github.com/developit/microbundle).

## Game commands

`N`, `S`, `E`, `W`, `UP`, `DOWN`, `IN`, and `OUT` move to available locations.

`GET` and `DROP` handle inventory items; `INVENTORY` lists what you're carrying. `EXAMINE` describes items and nearby scenery. Try abbreviations like `INV` and `EX` (or even `X`) too.

`LOOK` fully describes the current location.

`HELP` lists the available commands, including per-game custom ones not mentioned here.

---

## About entities

The game engine is based on **entities**. An entity represents a location, an inventory item, a piece of scenery, etc.

An entity is simply a plain JavaScript function that returns an object.

Entities are passed to the game engine via the `start()` command.

```javascript
const someEntity = () => ({
  // ...
});

const anotherEntity = () => ({
  // ...
});

Engine.start({
  entities: [someEntity, anotherEntity]
});
```

## Creating the game map

Entities connect together to create the game world.

An entity's `to` object describes which entities it is connected to.

The first entity given to the game engine is the starting location, unless overridden by the `startLocationId` option.

First-time visits to an entity (or using the `LOOK` command) use its `description`. Subsequent visits use its `summary` for brevity.

```javascript
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

Engine.start({
  entities: [pub, cellar, kitchen]
});
```

```text
This firelit drinking den is empty of people. A cellar door leads downstairs. The kitchen is east.

> DOWN

In the gloom and dust, you can make out rack upon rack of wine bottles. Firelight glows from an overhead hatch.

> UP

A cosy pub.

> E

The shelves of the small kitchen are almost bursting with fresh meat and produce. The west door leads to the pub.

> W

A cosy pub.
```

## Adding scenery

Entities can provide additional text and flavour for a location.

Provide `nouns` so the entity can be referred to in-game. Then add its `id` to the `things` array of one or more locations.

An entity added in this way is silent unless `EXAMINE`d, at which point its `description` is printed.

```javascript
// Location
const bedroom = () => ({
  id: 'bedroom',
  summary: 'A stately bedroom.',
  description: 'This opulent room has a large four-poster bed which dominates the space.',
  things: ['bed']
});

// Scenery
const bed = () => ({
  id: 'bed',
  nouns: ['bed', 'four-poster bed'],
  description: 'The frame is exquisitely carved, while the bedclothes are made of the finest linen.'
});

// ...
```

```text
This opulent room has a large four-poster bed which dominates the space.

> EXAMINE BED

The frame is exquisitely carved, while the bedclothes are made of the finest linen.
```

## Adding items

Entities can be treated as items for the player to collect and use.

Add the `item` tag to the entity, and provide a `nouns` array to help the player refer to it in-game. Then add its `id` to the `things` array of a location.

The game reports `You can see...` when describing the location, using the item's `summary`.

If `initial` is defined on the item, the game prints it instead, if the item has not been picked up or moved by the player.

The item responds to `GET` and `DROP` commands. If the item is `EXAMINE`d, its `description` is printed.

The player can start the game with an item if its `id` is included in the `startInventory` option.

For making items usable, see the following section.

**Note** - items are intended to be unique. The game engine may behave unexpectedly if an item is somehow in more than one place at once. Be careful with your inventory setup and game logic.

```javascript
// Item entity
const tankard = () => ({
  id: 'tankard',
  tags: ['item'],
  nouns: ['tankard', 'drink', 'mug'],
  summary: 'a tankard',
  initial: 'There is a drinking tankard perched on the bar.',
  description: 'This pewter drinking mug smells of old beer.'
});

// Location entity containing item
const tavern = () => ({
  id: 'tavern',
  summary: 'A quiet tavern.',
  description: 'The tavern is quite cosy, and has only a few people drinking.',
  things: ['tankard']
});

Engine.start({
  entities: [tavern, tankard]
});
```

```text
The tavern is quite cosy, and has only a few people drinking.
There is a drinking tankard perched on the bar.

> EXAMINE TANKARD

This pewter drinking mug smells of old beer.

> GET MUG

Taken.

> INVENTORY

You are carrying a tankard.

> LOOK

The tavern is quite cosy, and has only a few people drinking.

> DROP TANKARD

Dropped.

> LOOK

The tavern is quite cosy, and has only a few people drinking.
You can see a tankard.
```

## Usable items and other game logic

The engine has no built-in commands for using items, but authors can easily add their own, along with logic for how items behave.

### Location triggers

Something may happen if the player enters a location while holding a certain item.

A location's `onGoTo` callback can be used for this purpose.

```javascript
const entryway = () => ({
  id: 'entryway',
  summary: 'The entrance to a cursed temple.',
  description: 'The temple entrance is adorned with fearsome markings, depicting an idol statue repelling a horde of snakes. The entrance proceeds north to the temple itself.',
  things: ['idol'],
  to: {
    n: 'temple'
  }
});

const idol = () => ({
  id: 'idol',
  tags: ['item'],
  nouns: ['idol', 'statue', 'totem'],
  summary: 'a small statue',
  description: 'The statue is well-worn, but radiates a calming, protective aura.'
});

const temple = () => ({
  id: 'temple',
  summary: 'A foreboding, ruined temple.',
  description: 'Within the crumbling chamber, the floor rattles under your feet. A mural on the far wall depicts a large snake, almost staring at you. The exit is south.',
  to: {
    s: 'entryway'
  },
  onGoTo: ({ game }) => {
    // Returning this function lets the game
    // describe the location as normal first.
    return () => {
      // 'Kill' the player if they enter the
      // temple while not holding the idol
      if (!game.inventory.has('idol')) {
        game.print('The floor crumbles beneath you, sending you crashing to the bottom of a deep pit. Smothered in agony and darkness, you feel the slithery bodies of a hundred poisonous snakes envelop your body. Your adventure ends here.');

        game.end();
      }
    };
  }
});

// ...
```

```text
The temple entrance is adorned with fearsome markings, depicting an idol statue repelling a horde of snakes. The entrance proceeds north to the temple itself.
You can see a small statue.

> GET STATUE

Taken.

> N

Within the crumbling chamber, the floor rattles under your feet. A mural on the far wall depicts a large snake, almost staring at you. The exit is south.

> S

The entrance to a cursed temple.

> DROP IDOL

Dropped.

> N

A foreboding, ruined temple.

The floor crumbles beneath you, sending you crashing to the bottom of a deep pit. Smothered in agony and darkness, you feel the slithery bodies of a hundred poisonous snakes envelop your body. Your adventure ends here.

---
```

### Locks and keys

Locked doors are a staple of adventure games.

The global `onCommand` callback is fired whenever the player attempts a valid action, and can prevent the action from happening.

Custom commands are possible with the `commands` option.

Lastly, custom entity `data` can be used for game logic.

```javascript
// Location with boolean data for lock status
const hallway = () => ({
  id: 'hallway',
  summary: 'A hallway.',
  description: 'You are in a hallway. A red door is south.',
  things: ['key'],
  // State for the locked door
  data: {
    isDoorLocked: true
  },
  to: {
    s: 'apartment'
  }
});

const apartment = () => ({
  id: 'apartment',
  summary: 'An apartment.',
  description: 'A small, cramped apartment. The exit is north.',
  to: {
    n: 'hallway'
  }
});

// Key item
const key = () => ({
  id: 'key',
  tags: ['item'],
  nouns: ['key', 'door key'],
  summary: 'a key',
  description: 'A simple door key.'
});

Engine.start({
  entities: [hallway, apartment, key],
  // Define a new 'unlock' command
  commands: {
    unlock: ['unlock', 'open', 'access']
  },
  onCommand: ({ game, command }) => {
    if (game.location.is('hallway')) {
      // Block the player if the door is locked
      if (command.s && game.location.data.isDoorLocked) {
        game.print('The door is locked.');

        // Stop the 's' command from executing
        return false;
      }

      // Handle unlocking with the key
      // using our custom command
      if (command.unlock) {
        if (game.location.data.isDoorLocked) {
          if (game.inventory.has('key')) {
            game.location.data.isDoorLocked = false;
            game.print('You unlock it.');
          } else {
            game.print('You do not have the key.');
          }
        } else {
          game.print('It is already unlocked.');
        }

        // Prevent the 'bad command' message
        return false;
      }
    }
  }
});
```

```text
You are in a hallway. A red door is south.
You can see a key.

> S

The door is locked.

> UNLOCK DOOR

You do not have the key.

> GET KEY

Taken.

> UNLOCK DOOR

You unlock it.

> UNLOCK DOOR

It's already unlocked.

> S

A small, cramped apartment. The exit is north.
```

### Which thing?

The `onCommand` callback exposes the `subject` entity of commands such as `GET`, `EXAMINE`, etc.

```javascript
const lab = () => ({
  id: 'lab',
  summary: 'A sealed lab with two buttons.',
  description: 'You are in a sterile laboratory. In front of you are two buttons: one red, one blue.',
  things: ['redButton', 'blueButton']
});

const redButton = () => ({
  id: 'redButton',
  nouns: ['red', 'red button'],
  description: 'A red button. A label above reads DO NOT PRESS.'
});

const blueButton = () => ({
  id: 'blueButton',
  nouns: ['blue', 'blue button'],
  description: 'A blue button. Nothing special.'
});

Engine.start({
  entities: [lab, redButton, blueButton],
  commands: {
    push: ['push', 'press', 'hit', 'activate']
  },
  onCommand: ({ game, command, subject }) => {
    if (command.push) {
      if (subject.is('redButton')) {
        game.print('The entire lab explodes in a white-hot ball of fire. Nothing can survive - including you.');
        game.end();
      } else {
        game.print('Nothing appears to happen.');
      }

      // Prevent the 'bad command' message
      return false;
    }
  }
});
```

```text
You are in a sterile laboratory. In front of you are two buttons: one red, one blue.

> EXAMINE RED BUTTON

A red button. A label above reads DO NOT PRESS.

> EX BLUE

A blue button. Nothing special.

> PRESS BLUE

Nothing appears to happen.

> HIT RED

The entire lab explodes in a white-hot ball of fire. Nothing can survive - including you.

---
```

### Adding and removing things

Entities can be added and removed to locations (and the player's inventory) via game logic.

This allows for 'discovering' items, using consumables, etc.

If the `onCommand` callback returns a function, that function is executed after the command's default behaviour.

```javascript
const library = () => ({
  id: 'library',
  summary: 'A dusty library.',
  description: 'The library is candle-lit and strewn with cobwebs and dust.',
  things: ['book']
});

const book = () => ({
  id: 'book',
  tags: ['item'],
  nouns: ['book', 'tome'],
  summary: 'a large book',
  description: 'It is leather-bound and filled with dense manuscript.',
  data: {
    hasKey: true
  }
});

const key = () => ({
  id: 'key',
  tags: ['item'],
  nouns: ['key', 'old key', 'iron key'],
  summary: 'an old key',
  description: 'An ancient-looking, rusted iron key.',
});

Engine.start({
  entities: [library, book, key],
  onCommand: ({
    game, command, subject
  }) => {
    if (
      command.examine
      && subject.is('book')
      && subject.data.hasKey
    ) {
      // This function will execute after the
      // normal EXAMINE behaviour.
      return () => {
        game.print('As you open the book, something falls out, clattering to the floor.');
        subject.data.hasKey = false;
        game.location.things.add('key');
      };
    }
  }
});
```

```text
The library is candle-lit and strewn with cobwebs and dust.
You can see a large book.

> EXAMINE BOOK

It is leather-bound and filled with dense manuscript.
As you open the book, something falls out, clattering to the floor.

> LOOK

The library is candle-lit and strewn with cobwebs and dust.
You can see a large book, an old key.

> EX BOOK

It is leather-bound and filled with dense manuscript.

> GET KEY

Taken.
```

## Dynamic text

Text used for `summary`, `description` and other `print()` commands can be more than simple strings.

Using a function instead allows for dynamic text that uses game and entity state.

Entity declaration functions receive a function as an optional parameter. When called, it returns a reference to the entity itself.

```javascript
// Data-driven item description
const mirror = (getThis) => ({
  id: 'mirror',
  tags: ['item'],
  nouns: ['mirror', 'looking glass'],
  summary: 'a mirror',
  data: {
    condition: 'pristine' // e.g. could be 'cracked' later
  },
  // Text using getThis() *must* be declared as a function
  description: () =>
    `An ornate-looking mirror. It is ${getThis().data.condition}.`
});
```

```text
You see a mirror.

> EXAMINE MIRROR

An ornate-looking mirror. It is pristine.
```

Text defined as functions also receives a reference to the game engine as a parameter, which can be used for other dynamic text.

```javascript
// Description changes based on player inventory
const shrine = () => ({
  id: 'crypt',
  summary: 'A sinister crypt.',
  description: (game) => `The ${game.inventory.has('cursedBook') ? 'bloodstained and warped ' : ''}walls of the crypt feel like they are closing in.`
});
```

As a convenience, these text elements may also be defined as arrays. The engine prints one paragraph for each item in the array, if the item exists.

```javascript
const dungeon = () => ({
  id: 'dungeon',
  summary: 'A dank dungeon.',
  // Description as array, will print one paragraph per item
  description: [
    'It is dark.',
    'Damp.',
    'And cold.',
    // Engine won't output null, undefined, or empty strings
    (game) => (game.inventory.has('whiskey') ? 'At least you have booze.' : null)
  ]
});
```

## Other recipes

### Un-droppable items

```javascript
// Entities without an `item` tag can still be in
// the player's inventory, but can not be dropped.
const note = () => ({
  id: 'note',
  noun: ['note', 'decree', 'important note'],
  summary: 'an important note',
  description: 'This note is of vital importance and must be kept safe!'
  // note no `tags: ['item']` property
});

Engine.start({
  //...
  startInventory: ['note'],
  //...
});
```

```text
You are carrying an important note.

> DROP NOTE

Sorry, that's not possible.
```

### Timed events

```javascript
// The game has a concept of 'turns'. Most valid commands
// will increase the game's turn count, even if they fail
// (e.g trying to go in a bad direction). Others, such as
// LOOKing and checking INVENTORY, won't count as a turn,
// nor will invalid or mis-spelled commands.

// We can use the global onTurn callback and custom entity
// data to set up timed events.
const timeBomb = (getThis) => ({
  id: 'timeBomb',
  nouns: ['bomb', 'time bomb', 'explosives'],
  description: () => `It is wired and counting down! The counter shows the number ${getThis().data.remaining}...`,
  data: {
    remaining: 4
  }
});

const basement = () => ({
  id: 'basement',
  summary: 'A dingy basement with no exits.',
  description: 'You are trapped in a dank basement with no visible means of escape. In the corner, you can see a ticking time bomb.',
  things: ['timeBomb']
});

Engine.start({
  entities: [basement, timeBomb],
  onTurn: ({ game }) => {
    const bomb = game.entity('timeBomb');

    if (bomb.data.remaining === 0) {
      game.print('The bomb explodes, blowing you and the entire building to smithereens. Game Over.');
      game.end();
    } else {
      game.print('The bomb continues to tick...');
      bomb.data.remaining -= 1;
    }
  }
});
```

### Items with amounts

```javascript
// Create an undroppable item with data for its amount.
// No need for nouns or description, as we'll never EXAMINE it.
const moneyTracker = (getThis) => ({
  id: 'moneyTracker',
  summary: () => `${getThis().data.amount} gold coin(s)`,
  data: {
    amount: 10 // starting amount
  }
});

// An item to add money to the bag.
// We could also add to the moneyTracker in other ways,
// e.g. custom logic for puzzle solving, quest rewards etc.
const coinAdder = (getThis) => ({
  id: 'coinAdder',
  tags: ['item'],
  nouns: ['coins', 'gold coins', 'money'],
  summary: () => `${getThis().data.amount} gold coin(s)`,
  description: 'The root of all evil, some say.',
  data: {
    amount: 20
  }
});

const storeroom = () => ({
  id: 'storeroom',
  summary: 'A small storage area.',
  description: 'A claustrophobic back room used for storage and book-keeping.',
  things: ['coinAdder']
});

Engine.start({
  entities: [storeroom, moneyTracker, coinAdder],
  startInventory: ['moneyTracker'],
  // onTurn fires after every valid turn,
  // after all commands have been executed
  onTurn: ({ game }) => {
    if (game.inventory.has('coinAdder')) {
      // Immediately remove the 'adder object' from
      // the player's inventory, and manually update
      // their gold count
      game.inventory.delete('coinAdder');
      // game.entity() gives us direct access to that object
      game.entity('moneyTracker').data.amount += game.entity('coinAdder').data.amount;
    }
  }
});
```

```text
A claustrophobic back room used for storage and book-keeping.
You can see 20 gold coins.

> INVENTORY

You are carrying 10 gold coin(s).

> TAKE MONEY

Taken.

> INV

You are carrying 30 gold coin(s).
```

### 'Examine myself' / player state

```javascript
// Entities with no 'item' tag won't be reported in
// location descriptions or inventory lists, but can
// still be EXAMINEd.

// We create a non-item entity to act as the 'player',
// and add it to the starting inventory.

// This method could also be used to track player state or
// other global data - health, attributes, etc.
const player = () => ({
  id: 'player',
  nouns: ['myself', 'moi', 'player'],
  description: 'As good-looking as ever.',
});

Engine.start({
  // ...
  startInventory: ['player'],
  // ...
});
```

```text
> INVENTORY

You are carrying nothing.

> EXAMINE MYSELF

As good-looking as ever.
```

### Per-location aesthetics

```javascript
// Use the *global* onGoTo callback (which is called
// before any location-specific ones) to add a hook for CSS
// to target.

Engine.start({
  // ...
  onGoTo: ({ game }) => {
    // Set <body> tag data attribute once we arrive at our location
    return () => {
      document.querySelector('body').dataset.location = game.location.id;
    };
  },
  // ...
});
```

```css
body[data-location="dungeon"] {
  background-color: #113;
  color: #a83;
}

body[data-location="field"] {
  background-color: #348b2e;
  color: skyblue;
}

/* etc */
```

### 'Exits are...'

```javascript
// Less-evocative, but more convenient exit descriptions
// using the global onLook() callback

const pub = () => ({
  id: 'pub',
  summary: 'A cosy pub.',
  description: 'This firelit drinking den is empty of people.',
  to: {
    down: 'cellar',
    e: 'kitchen'
  }
});

const cellar = () => ({
  // ...
});

const kitchen = () => ({
  // ...
});

Engine.start({
  entities: [pub, cellar, kitchen],
  onLook: ({ game }) => {
    // Will execute after the normal LOOK behaviour
    return () => {
      if (!game.location.to) return;

      // List all 'to' commands in the current location
      const exitList = Object.keys(game.location.to)
        .map((k) => k.toUpperCase())
        .join(', ');

      game.print(`Exits are: ${exitList}.`);
    };
  }
});
```

```text
This firelit drinking den is empty of people.
Exits are: DOWN, E.

>
```

### Dark areas

```javascript
const warehouse = () => ({
  id: 'warehouse',
  summary: 'A large warehouse.',
  description: 'The warehouse is lined with crates and barrels, from wall to wall. A small staircase leads down to the basement.',
  to: {
    down: 'basement'
  },
  things: ['torch']
});

const torch = () => ({
  id: 'torch',
  tags: ['item'],
  nouns: ['torch', 'light', 'lantern'],
  summary: 'a torch',
  description: 'A self-powering, perpetually-lit torch. Cool!'
});

const basement = () => ({
  id: 'basement',
  summary: 'A damp and dark basement.',
  description: 'No natural light reaches this basement area, which carries the stench of decay. The stairs lead back up.',
  to: {
    up: 'warehouse'
  },
  onGoTo: ({ game }) => {
    // Teleport the player to the dark place if they try
    // to enter the basement without a light source
    const hasLight = (
      game.inventory.has('torch')
      || game.entity('basement').things.has('torch')
    );

    if (!hasLight) {
      game.goTo('darkPlace');
      return false; // stop navigation to this entity
    }
  }
});

const darkPlace = () => ({
  id: 'darkPlace',
  summary: 'Darkness.',
  description: 'It\'s too dark to see. Light is visible upstairs.',
  to: {
    up: 'warehouse'
  }
});

Engine.start({
  entities: [warehouse, torch, basement, darkPlace]
});
```

### Basic NPCs

**Note** - more complex dialogue trees and AI are clearly possible, but beyond the scope of this README (and the library itself) right now.

```javascript
const jail = () => ({
  id: 'jail',
  summary: 'A filty jail.',
  description: 'This dingy, filth-encrusted jail has seen many rot away over the years.',
  things: ['sharuga']
});

// The 'present' tag will force a non-item
// entity to be described as if it were one
// (`You can see...` etc).
const sharuga = () => ({
  id: 'sharuga',
  tags: ['present'],
  nouns: ['sharuga', 'barbarian', 'woman', 'prisoner'],
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

Engine.start({
  entities: [jail, sharuga],
  commands: {
    talk: ['talk to', 'ask', 'chat with']
  },
  onCommand: ({
    game, command, subject
  }) => {
    // Make any entity with data.quotes say
    // something random when asked
    if (command.talk && subject.exists && subject.data.quotes) {
      const rndQuote = subject.data.quotes[
        Math.floor(Math.random() * subject.data.quotes.length)
      ];
      game.print(`${subject.summary} says, "${rndQuote}"`);
      // stop 'talk' from being treated as a bad command
      return false;
    }
  }
});
```

## API

```javascript
// Defining a game entity

const someEntity = (getThis) => {
  /**
   * getThis() - [function]
   * Can be called within this entity to return a 'live' reference to itself.
   * See the docs for game.entity() in 'onGoTo' below.
  **/

  // Entity functions must return an object.
  return {
    // Unique ID for this entity
    id: 'someEntityId',

    // Behaviour hints for this entity
    tags: [
      // Can not be picked up, dropped etc (override default 'item' behaviour)
      'fixed',
      // Ignored by the game engine + player commands, functionally non-existent
      'invisible',
      // Can be picked up, dropped etc (also implies 'present')
      'item',
      // Reported by location/inventory
      'present',
      // Not reported by location/inventory (override default 'item' behaviour)
      'silent'
    ],

    // List of entity IDs 'contained' by this one,
    // functionally most useful for locations
    things: [],

    // For locations, connections to other locations
    // { command: locationId }
    to: {
      n: 'someOtherEntityId'
    },

    // Additional data that may be used in custom game logic
    data: {
      someValue: 'foo'
    },

    // Description. For locations, printed on first visit and LOOK.
    // For other entities, used in EXAMINE.
    description:
      /*

      May be a basic string:
      'This is an entity.',

      Or a function returning a string
      ...using getThis():
      () => `This is a ${getThis().data.someValue}.`,

      ...or referencing the game instance itself:
      (game) => `This has ${game.state.turnCount} turns.`,

      Or an array of any of the above
      (game will print each item as a separate paragraph)

      */
      [
        'This is an description',
        () => `This is a description of ${getThis().data.someValue}.`,
        (game) => `This is a description after ${game.state.turnCount} turns.`,
      ],

    // Summary. For locations, printed on repeat visits.
    // For entities with `item` or `present` tags,
    // used for 'You can see...' reporting.
    // Follows the same rules as `description`, but
    // array usage not recommended here for items.
    summary: 'This is a summary',

    // An initial description for entities with
    // 'item' or 'present' tags.
    // Follows the same rules as `description`.
    // If defined, will be printed during the LOOK command
    // instead of the item being listed in 'You can see...',
    // provided the item hasn't been 'moved' from its
    // original state (i.e. picked up by the player).
    initial: 'This is an initial description',

    // Locations will trigger this callback every time,
    // *just before* they are visited via navigation
    // or game.goTo().
    onGoTo: ({ game }) => {
      // 'game' is the game instance

      // Aliases (synonyms) for the base COMMANDS
      game.ALIASES

      // An object of base commands understood by the game
      game.COMMANDS

      // Clears the screen of output
      game.clear()

      // Increments the turn counter
      game.doTurn()

      // Immediately ends the game (WIP)
      game.end()

      // Returns the given 'live' entity object
      const entity = game.entity(entityId)

      entity.data
      entity.exists
      entity.is(entityId)

      // `true` if this entity has been EXAMINEd at least once
      entity.meta.isExamined
      // `true` if this entity has not been the subject
      // of a successful GET or DROP by the player yet
      // (see entity.initial)
      entity.meta.isInitialState
      // Number of times this entity has been visited as a location
      entity.meta.visitCount

      // Entity arrays are converted to Sets by the engine.
      // Use Set methods (add, has, delete) to manipulate the following
      entity.tags
      entity.things

      // Visits the given entity as a location
      game.goTo(entityId, skipTurn = false)

      // A Set of entity IDs in the player's inventory.
      // Use Set methods (add, has, delete) to manipulate
      game.inventory

      // Points to the current location entity
      // (i.e. the location being moved *FROM*, not this one).
      // If read inside the 'afterGoTo' callback,
      // will point to this one.
      game.location

      // Prints the current location's description / summary
      game.look(forceDescription = false)

      // An object of game message consts
      game.MESSAGES

      // Stops any game input/output for the given
      // duration, in ms
      game.pause(pauseTime);

      // Output game text
      game.print(textFuncOrArray, cssClass)

      // Turn count of game (mutable)
      game.state.turnCount

      // An object of tag consts
      game.TAGS

      // If called, prevents the turn count from being
      // incremented and the onTurn global callback firing
      // for this location change.
      noTurn();

      // Prevents the location change from being executed.
      return false;

      // Calls the provided function after the location
      // change has been executed
      return callbackFn;
    },

    // Called **just before** this location is described
    // (including the items present in it),
    // either via navigating to it, or via the LOOK command.
    onLook: ({ game, isFullLook }) => {
      // `game` is as described above in onGoTo

      // true if the location is about to be fully described
      // (i.e. is a first visit, or LOOK has been used)
      isFullLook;

      // Prevents the location and its items from being
      // described at all.
      return false;

      // Calls the provided function after the location and
      // its items have been described
      return callbackFn;
    }
  }
};

// Creating and configuring the game
Engine.start({
  // Array of game entity functions (NOT just ids!)
  entities: [someEntity],

  // ID of starting location entity.
  // Defaults to first entity given above
  startLocationId: 'someEntityId',

  // Array of entity IDs to be present
  // in the player's inventory at game start
  startInventory: [],

  // Custom commands for the engine.
  // Key is the base command, value is an
  // array of aliases
  commands: {
    mycommand: ['my command', 'my only command']
  },

  // Called when ANY command is successfully executed
  onCommand: ({ game, command, subject, noTurn }) => {
    // 'game' is as described earlier above.

    // The value of the command used will be true, the rest false
    command.n
    command.s
    command.examine
    command.mycommand
    // ...

    // Actual key of command used (e.g. 'examine')
    command._raw

    // 'subject' is the entity referred to by the given command
    // (e.g. 'TAKE LAMP' will return the entity for the lamp).
    // See docs for game.entity() as described above.
    // If no subject was found or needed for this command,
    // subject.exists will be false.
    subject.exists
    subject.is(entityId)
    // ...

    // If called, prevents the turn count from being
    // incremented and the onTurn global callback firing
    // for this command.
    noTurn();

    // Prevents the default command from being executed.
    // Will stop navigation to other locations, EXAMINE descriptions,
    // etc.
    // Custom commands should always fall back to returning false,
    // to prevent them being interpreted as bad input.
    return false;

    // Calls the provided function after the default command
    // has been executed.
    return callbackFn;
  },

  // As for entity.onGoTo, but is called on *every*
  // location change, before the logic of the location
  // being moved to.
  onGoTo: ({ game, destination }) => {
    // 'destination' is the entity being moved to
    // ...
  },

  // As for entity.onLook, but is called on *every*
  // description of a location, before the logic of
  // the location itsef.
  onLook: ({ game, isFullLook }) => {
    // ...
  },

  // Called after every valid turn, after all commands have run
  // and the turn count has updated. If the turn has been suppressed
  // (see above) or an entered command does not constitute a 'turn'
  // (e.g. HELP), this will not fire.
  onTurn: ({ game, turnCount }) => {
    // ...
  }
});
```

## TODO

- [ ] Bug: 'me' not recognizable as noun (compromise config issue)
- [ ] State save and load (serlialization, data safety etc)
- [ ] Proper game.end() behaviour
- [ ] 'wait' command
- [ ] 'it' usage
- [ ] 'and' + other separator usage
- [ ] Command history + clear
- [ ] Utility functions (rnd in array, print list, etc)
- [ ] Configurable message overrides
