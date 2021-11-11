/* eslint-disable no-param-reassign */
import setupCommands from './commands';
import setupEntities from './entities';
import MESSAGES from './messages';
import uiHelper from './ui';
import queueHelper from './queue';
import TAGS from './tags';
import parse from './parse';

const start = (config) => {
  const {
    commands, aliases, baseCommandMap
  } = setupCommands(config);
  const { entities, startLocationId, getSubject } = setupEntities(config);

  const gameMessages = { ...MESSAGES };

  const gameState = {
    turnCount: 0,
    isActive: true,
    currentLocationId: startLocationId,
    inventory: new Set(config.startInventory || []),
    lastSubject: null
  };

  const UI = uiHelper();
  const Queue = queueHelper({ UI, gameState });

  let afterCommandCallback;
  let shouldUpdateTurn;

  const API = {
    ALIASES: aliases,

    COMMANDS: commands,

    clear() {
      UI.clearOutput();
    },

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

    goTo(locationId, skipTurn = false) {
      const destination = API.entity(locationId);

      let shouldStopChange = false;
      let afterLocationChangeCallback = null;

      const stopGoTo = () => {
        shouldStopChange = true;
      };

      const afterGoTo = (cb) => {
        afterLocationChangeCallback = cb;
      };

      if (typeof config.onGoTo === 'function') {
        config.onGoTo({
          game: API, destination, stopGoTo, afterGoTo
        });
      }

      // FIXME: turn tracking may not be intuitive here

      if (!gameState.isActive || shouldStopChange) return;

      if (typeof destination.onGoTo === 'function') {
        destination.onGoTo({
          game: API, stopGoTo, afterGoTo
        });
      }

      if (!gameState.isActive || shouldStopChange) return;

      gameState.currentLocationId = locationId;
      API.location.meta.visitCount += 1;
      API.look();

      if (!skipTurn) API.doTurn();

      if (typeof afterLocationChangeCallback === 'function') {
        afterLocationChangeCallback();
      }
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
          // Print any 'initial' entries for
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

    noTurn() {
      shouldUpdateTurn = false;
    },

    pause(pauseTime = 0) {
      // TODO: add indefinite pause + 'continue' option
      UI.hideInput();
      Queue.add({ pauseTime });
    },

    print(outputText, cssClass) {
      if (!outputText) return;

      if (outputText instanceof Array) {
        outputText.forEach((ot) => API.print(ot, cssClass));
        return;
      }

      Queue.add({ outputText: API.dyntext(outputText), cssClass });
    },

    get state() {
      return gameState;
    },

    TAGS
  };

  // Setup input-parse-output loop
  UI.onSubmit((inputText) => {
    if (!inputText) return;
    if (!gameState.isActive) return;

    afterCommandCallback = null;
    shouldUpdateTurn = true;

    API.print(inputText, 'input');
    UI.clearInput();

    const afterCommand = (cb) => {
      afterCommandCallback = cb;
    };

    parse({
      inputText,
      API,
      baseCommandMap,
      entities,
      commands,
      gameState,
      getSubject,
      config,
      gameMessages,
      afterCommand
    });

    if (!gameState.isActive) return;

    if (typeof afterCommandCallback === 'function') {
      afterCommandCallback();
      afterCommandCallback = null;
    }

    if (!gameState.isActive) return;

    if (shouldUpdateTurn) {
      API.doTurn();

      if (typeof config.onTurn === 'function') {
        config.onTurn({ game: API, turnCount: gameState.turnCount });
      }
    }
  });

  // Start the game
  UI.clearOutput();
  API.goTo(gameState.currentLocationId, true);
};

export default {
  start
};
