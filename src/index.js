/* eslint-disable no-param-reassign */
import uiHelper from './ui';
import setupCommands from './commands';
import setupEntities from './entities';
import MESSAGES from './messages';
import TAGS from './tags';

const start = (config) => {
  const UI = uiHelper();

  const {
    commands, aliases, baseCommandMap, nlp
  } = setupCommands(config);
  const { entities, startLocationId, getSubject } = setupEntities(config);

  const gameMessages = { ...MESSAGES };

  let gameState;

  const startGame = () => {
    gameState = {
      turnCount: 0,
      isActive: true,
      currentLocationId: startLocationId,
      inventory: new Set(config.startInventory || []),
      lastSubject: null
    };

    UI.clearOutput();
  };

  const API = {
    ALIASES: aliases,

    COMMANDS: commands,

    doTurn() {
      gameState.turnCount += 1;
    },

    dyntext(text) {
      return (typeof text === 'function' ? text(API) : text);
    },

    end() {
      gameState.isActive = false;
      UI.hideInput();
    },

    entity(id) {
      if (!entities[id]) {
        throw new Error(`Game logic error: no entity '${id}' found`);
      }
      return entities[id];
    },

    goTo(entityId, skipTurn = false) {

    },

    get inventory() {
      return gameState.inventory;
    },

    get location() {
      return entities[gameState.currentLocationId];
    },

    look(forceFullDescription = false) {
      const isFullLook = forceFullDescription || API.location.meta.visitCount === 1;

      if (isFullLook) {
        API.print(API.location.description);
      } else {
        API.print(API.location.summary);
      }

      if (API.location.things.size > 0) {
        let visibleEnts = [...API.location.things]
          .map((h) => entities[h])
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
              API.print(i.initial);
            });
          }

          visibleEnts = visibleEnts.filter((i) => !specialInitialEnts.includes(i));
        }

        if (visibleEnts.length > 0) {
          const listText = `${
            gameMessages.LOCATION_ITEMS_PREFIX
          }${visibleEnts.map((i) => API.dyntext(i.summary)).join(', ')}.`;

          API.print(listText);
        }
      }
    },

    MESSAGES: gameMessages,

    print(outputText, cssClass) {
      if (!outputText) return;

      if (outputText instanceof Array) {
        outputText.forEach((ot) => API.print(ot, cssClass));
        return;
      }

      UI.writeOutput(API.dyntext(outputText), cssClass);
      UI.scrollToBottom();
    },

    get state() {
      return gameState;
    },

    TAGS
  };

  class Engine {
    constructor() {
      UI.onSubmit((inputText) => {
        if (!gameState.isActive) return;
        if (!inputText) return;

        API.print(inputText, 'input');
        UI.clearInput();

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

      startGame();

      // temp instance ref until we can clean up the public API
      this.state = gameState;
      this.afterCommand = null;

      // Trigger any state logic in the first location
      this.goTo(gameState.currentLocationId, true);

      return this;
    };

    // eslint-disable-next-line class-methods-use-this
    get location() {
      return API.location;
    }

    // eslint-disable-next-line class-methods-use-this
    get inventory() {
      return API.inventory;
    }

    // eslint-disable-next-line class-methods-use-this
    look = (forceFullDescription = false) => {
      API.look(forceFullDescription);
    };

    // eslint-disable-next-line class-methods-use-this
    dyntext = (text) => API.dyntext(text);

    // eslint-disable-next-line class-methods-use-this
    print = (outputText, cssClass) => {
      API.print(outputText, cssClass);
    };

    // eslint-disable-next-line class-methods-use-this
    entity = (id) => API.entity(id);

    // eslint-disable-next-line class-methods-use-this
    doTurn = () => {
      API.doTurn();
    };

    parse = (inputText) => {
      const parsed = nlp(inputText);

      const verb = parsed.verbs().out('array')[0];
      const noun = parsed.nouns().out('array')[0];

      const noTurn = () => {
        this.shouldUpdateTurn = false;
      };

      if (!(verb in baseCommandMap)) {
        API.print(gameMessages.FAIL_UNKNOWN);
        noTurn();
        return;
      }

      const baseCommand = baseCommandMap[verb];

      // Build list of potential subjects from:
      // - Current location 'has'
      // - Player inventory

      const subject = getSubject(
        noun,
        [API.location.things, API.inventory],
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

      if (API.location.to && baseCommand in API.location.to) {
        this.goTo(API.location.to[baseCommand]);
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
          if (!API.location.to || !(baseCommand in API.location.to)) {
            API.print(gameMessages.FAIL_NO_EXIT);
            return;
          }

          API.goTo(API.location.to[baseCommand]);
          return;
        }

        case commands.look: {
          API.look(true);
          noTurn();
          return;
        }

        case commands.examine: {
          if (!subject) {
            API.print(gameMessages.FAIL_EXAMINE);
            noTurn();
            return;
          }

          API.print(subject.description);
          subject.meta.isExamined = true;
          return;
        }

        case commands.get: {
          if (
            !subject
            || subject.tags.has(TAGS.SCENERY)
            || subject.tags.has(TAGS.FIXED)
          ) {
            API.print(gameMessages.FAIL_GET);
            noTurn();
            return;
          }

          if (API.inventory.has(subject.id)) {
            API.print(gameMessages.FAIL_GET_OWNED);
            noTurn();
            return;
          }

          API.location.things.delete(subject.id);
          API.inventory.add(subject.id);
          subject.meta.isInitialState = false;
          API.print(gameMessages.OK_GET);
          return;
        }

        case commands.drop: {
          if (!subject || !API.inventory.has(subject.id)) {
            API.print(gameMessages.FAIL_DROP_OWNED);
            noTurn();
            return;
          }

          if (subject.tags.has(TAGS.FIXED)) {
            API.print(gameMessages.FAIL_DROP);
            noTurn();
            return;
          }

          API.inventory.delete(subject.id);
          API.location.things.add(subject.id);
          subject.meta.isInitialState = false;
          API.print(gameMessages.OK_DROP);
          return;
        }

        case commands.inventory: {
          if (API.inventory.size === 0) {
            API.print(gameMessages.INV_NONE);
            noTurn();
            return;
          }

          const invText = [...API.inventory]
            .map((i) => entities[i])
            .filter(
              (i) => !i.tags.has(TAGS.INVISIBLE) && !i.tags.has(TAGS.SILENT)
            )
            .map((i) => API.dyntext(i.summary))
            .join(', ');

          API.print(`${gameMessages.INV_PREFIX}${invText}.`);
          noTurn();
          return;
        }

        case commands.help: {
          API.print(
            `Basic commands: ${Object.values(commands).join(
              ', '
            )}. Try other words too!`,
            'info'
          );
          noTurn();
          return;
        }

        default: {
          API.print(gameMessages.FAIL_UNHANDLED);
          noTurn();
        }
      }
    };

    goTo = (locationId, skipTurn = false) => {
      const destination = API.entity(locationId);

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
      API.location.meta.visitCount += 1;
      API.look();
      if (!skipTurn) API.doTurn();

      if (typeof _afterLocationChangeCallback === 'function') {
        _afterLocationChangeCallback();
      }
    };

    // eslint-disable-next-line class-methods-use-this
    end() {
      API.end();
    }
  }

  return new Engine().start();
};

export default {
  start
};
