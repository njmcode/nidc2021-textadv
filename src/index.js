/* eslint-disable no-param-reassign */
import nlp from 'compromise';

import COMMANDS, { ALIASES } from './commands';
import TAGS from './tags';
import MESSAGES from './messages';

const start = (config) => {
  // Set up verbs
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

  const gameMessages = {
    ...MESSAGES
  };

  // Hook up the DOM
  const gameEls = {
    inputForm: document.querySelector('.game-input'),
    inputField: document.querySelector('.game-typed-input'),
    output: document.querySelector('.game-output')
  };

  let gameState;

  class Engine {
    constructor() {
      gameEls.inputForm.addEventListener('submit', (e) => {
        e.preventDefault();

        if (!gameState.isActive) return;

        const inputText = gameEls.inputField.value.trim();
        if (!inputText) return;

        this.print(inputText.trim(), 'input');
        gameEls.inputField.value = '';

        this.afterCommand = null;
        this.shouldUpdateTurn = true;

        this.parse(inputText.toLowerCase());

        if (!gameState.isActive) return;

        if (typeof this.afterCommand === 'function') {
          this.afterCommand();
          this.afterCommand = null;
        }

        if (!gameState.isActive) return;

        if (this.shouldUpdateTurn) {
          gameState.turnCount += 1;
          if (typeof config.onTurn === 'function') {
            config.onTurn({ game: this, turnCount: gameState.turnCount });
          }
        }
      });
    }

    start = () => {
      console.log('Starting...');

      gameState = {
        turnCount: 0,
        isActive: true,
        currentLocationId: null,
        inventory: new Set(config.startInventory || []),
        lastSubject: null
      };
      // temp instance ref until we can clean up the public API
      this.state = gameState;

      this.validNouns = {};
      this.afterCommand = null;

      this.entities = config.entities.reduce((obj, ent, idx) => {
        const entObj = ent(() => this.entities[entObj.id]);
        if (!entObj.id) {
          console.error(entObj);
          throw new Error('Missing entity id');
        }

        entObj.is = (id) => entObj.id === id;
        entObj.exists = true;
        entObj.meta = {
          visitCount: 0,
          isInitialState: true,
          isExamined: false
        };

        if (entObj.nouns) {
          entObj.nouns.forEach((noun) => {
            if (noun in this.validNouns) {
              throw new Error(`Duplicate noun '${noun}' found for entity '${entObj.id}'`);
            }

            this.validNouns[noun] = entObj.id;
          });
        }

        if (!entObj.data) entObj.data = {};
        if (!entObj.things) entObj.things = [];
        if (!entObj.tags) entObj.tags = [];
        entObj.things = new Set(entObj.things);
        entObj.tags = new Set(entObj.tags);

        obj[entObj.id] = entObj;

        if (idx === 0 && config.startLocationId === undefined) {
          this._defaultStartId = entObj.id;
        }

        return obj;
      }, {});

      console.log('validNouns', this.validNouns);

      nlp.extend((_Doc, world) => {
        const extraNouns = Object.keys(this.validNouns).reduce((obj, k) => {
          obj[k] = 'Noun';
          return obj;
        }, {});

        world.addWords(extraNouns);
      });

      gameEls.output.innerHTML = '';
      gameState.currentLocationId = config.startLocationId || this._defaultStartId;
      // Trigger any state logic in the first location
      this.goTo(gameState.currentLocationId, true);

      return this;
    };

    get location() {
      return this.entities[gameState.currentLocationId];
    }

    // eslint-disable-next-line class-methods-use-this
    get inventory() {
      return gameState.inventory;
    }

    look = (forceFullDescription = false) => {
      const isFullLook = forceFullDescription || this.location.meta.visitCount === 1;
      if (isFullLook) {
        this.print(this.location.description);
      } else {
        this.print(this.location.summary);
      }

      if (this.location.things.size > 0) {
        let visibleEnts = [...this.location.things]
          .map((h) => this.entities[h])
          .filter(
            (i) => !i.tags.has(TAGS.INVISIBLE)
              && !i.tags.has(TAGS.SCENERY)
              && !i.tags.has(TAGS.SILENT)
          );

        if (isFullLook) {
          // Print any 'initial' for
          // unmolested items on full LOOK
          const specialInitialEnts = visibleEnts.filter(
            (i) => i.meta.isInitialState && i.initial
          );

          if (specialInitialEnts.length > 0) {
            specialInitialEnts.forEach((i) => {
              this.print(i.initial);
            });
          }

          visibleEnts = visibleEnts.filter((i) => !specialInitialEnts.includes(i));
        }

        if (visibleEnts.length > 0) {
          const listText = `${
            gameMessages.LOCATION_ITEMS_PREFIX
          }${visibleEnts.map((i) => this.dyntext(i.summary)).join(', ')}.`;
          this.print(listText);
        }
      }
    };

    dyntext = (text) => (typeof text === 'function' ? text(this) : text);

    print = (outputText, cssClass) => {
      if (!outputText) return;

      if (outputText instanceof Array) {
        outputText.forEach((ot) => this.print(ot, cssClass));
        return;
      }

      const pEl = document.createElement('p');
      pEl.innerHTML = this.dyntext(outputText);

      if (cssClass) pEl.classList.add(cssClass);
      gameEls.output.appendChild(pEl);

      window.scrollTo(0, document.body.scrollHeight);
    };

    entity = (id) => {
      if (!this.entities[id]) {
        throw new Error(`Game logic error: no entity id '${id}'`);
      }

      return this.entities[id];
    };

    // eslint-disable-next-line class-methods-use-this
    doTurn = () => {
      gameState.turnCount += 1;
    };

    parse = (inputText) => {
      const parsed = nlp(inputText);

      const verb = parsed.verbs().out('array')[0];
      const noun = parsed.nouns().out('array')[0];

      const noTurn = () => {
        this.shouldUpdateTurn = false;
      };

      if (!(verb in baseCommandMap)) {
        this.print(gameMessages.FAIL_UNKNOWN);
        noTurn();
        return;
      }

      const baseCommand = baseCommandMap[verb];

      // Build list of potential subjects from:
      // - Current location 'has'
      // - Player inventory

      const subject = this.getSubject(
        noun,
        [this.location.things, gameState.inventory],
        (i) => !i.tags.has(TAGS.INVISIBLE)
      );

      if (typeof config.onCommand === 'function') {
        let shouldStopCommand = false;

        const stopCommand = (suppressTurn = false) => {
          shouldStopCommand = true;
          if (suppressTurn) noTurn();
        };

        const afterCommand = (cb) => { this.afterCommand = cb; };

        const command = Object.keys(commands).reduce((obj, k) => {
          obj[k] = baseCommand === k;
          return obj;
        }, {});
        command._base = baseCommand;

        config.onCommand({
          command,
          subject: subject || { is: () => false, exists: false },
          game: this,
          stopCommand,
          afterCommand,
          noTurn
        });
        if (shouldStopCommand) return;
      }

      if (!gameState.isActive) return;

      if (this.location.to && baseCommand in this.location.to) {
        this.goTo(this.location.to[baseCommand]);
        return;
      }

      switch (baseCommand) {
        case commands.n:
        case commands.s:
        case commands.e:
        case commands.w:
        case commands.up:
        case commands.down:
        case commands.in:
        case commands.out: {
          if (!this.location.to || !(baseCommand in this.location.to)) {
            this.print(gameMessages.FAIL_NO_EXIT);
            return;
          }

          this.goTo(this.location.to[baseCommand]);
          return;
        }

        case commands.look: {
          this.look(true);
          noTurn();
          return;
        }

        case commands.examine: {
          if (!subject) {
            this.print(gameMessages.FAIL_EXAMINE);
            noTurn();
            return;
          }

          this.print(subject.description);
          subject.meta.isExamined = true;
          return;
        }

        case commands.get: {
          if (
            !subject
            || subject.tags.has(TAGS.SCENERY)
            || subject.tags.has(TAGS.FIXED)
          ) {
            this.print(gameMessages.FAIL_GET);
            noTurn();
            return;
          }

          if (gameState.inventory.has(subject.id)) {
            this.print(gameMessages.FAIL_GET_OWNED);
            noTurn();
            return;
          }

          this.location.things.delete(subject.id);
          gameState.inventory.add(subject.id);
          subject.meta.isInitialState = false;
          this.print(gameMessages.OK_GET);
          return;
        }

        case commands.drop: {
          if (!subject || !gameState.inventory.has(subject.id)) {
            this.print(gameMessages.FAIL_DROP_OWNED);
            noTurn();
            return;
          }

          if (subject.tags.has(TAGS.FIXED)) {
            this.print(gameMessages.FAIL_DROP);
            noTurn();
            return;
          }

          gameState.inventory.delete(subject.id);
          this.location.things.add(subject.id);
          subject.meta.isInitialState = false;
          this.print(gameMessages.OK_DROP);
          return;
        }

        case commands.inventory: {
          if (gameState.inventory.size === 0) {
            this.print(gameMessages.INV_NONE);
            noTurn();
            return;
          }

          const invText = [...gameState.inventory]
            .map((i) => this.entities[i])
            .filter(
              (i) => !i.tags.has(TAGS.INVISIBLE) && !i.tags.has(TAGS.SILENT)
            )
            .map((i) => this.dyntext(i.summary))
            .join(', ');
          this.print(`${gameMessages.INV_PREFIX}${invText}.`);
          noTurn();
          return;
        }

        case commands.help: {
          this.print(
            `Basic commands: ${Object.values(this.COMMANDS).join(
              ', '
            )}. Try other words too!`,
            'info'
          );
          noTurn();
          return;
        }

        default: {
          this.print(gameMessages.FAIL_UNHANDLED);
          noTurn();
        }
      }
    };

    getSubject = (noun, fromLists, filterFn = () => true) => {
      if (!(noun in this.validNouns)) return false;
      if (!(fromLists instanceof Array)) fromLists = [fromLists];

      const nounSubject = this.entities[this.validNouns[noun]];

      let validSubject = false;
      fromLists.forEach((list) => {
        if (list.has(nounSubject.id) && filterFn(nounSubject)) {
          validSubject = nounSubject;
        }
      });

      return validSubject;
    };

    goTo = (locationId, skipTurn = false) => {
      if (!(locationId in this.entities)) {
        throw new Error(`goTo(): unknown entity ID '${locationId}'`);
      }

      const destination = this.entity(locationId);

      let _shouldStopChange = false;
      let _afterLocationChangeCallback = null;

      const stopGoTo = () => {
        _shouldStopChange = true;
      };

      const afterGoTo = (cb) => {
        _afterLocationChangeCallback = cb;
      };

      if (typeof config.onGoTo === 'function') {
        config.onGoTo({
          game: this, destination, stopGoTo, afterGoTo
        });
      }

      // FIXME: turn tracking may not be intuitive here

      if (!gameState.isActive || _shouldStopChange) return;

      if (typeof destination.onGoTo === 'function') {
        destination.onGoTo({
          game: this, stopGoTo, afterGoTo
        });
      }

      if (!gameState.isActive || _shouldStopChange) return;

      gameState.currentLocationId = locationId;
      this.location.meta.visitCount += 1;
      this.look();
      if (!skipTurn) this.doTurn();

      if (typeof _afterLocationChangeCallback === 'function') {
        _afterLocationChangeCallback();
      }
    };

    // eslint-disable-next-line class-methods-use-this
    end = () => {
      gameState.isActive = false;
      gameEls.inputForm.classList.add('hidden');
    };
  }

  return new Engine().start();
};

export default {
  start
};
