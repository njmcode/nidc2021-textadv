/* eslint-disable no-param-reassign */
import setupCommands from './commands';
import setupEntities from './entities';
import MESSAGES from './messages';
import uiHelper from './ui';
import queueHelper from './queue';
import {
  getVisibleEntities,
  getEntitiesWithInitial,
  getSummaryListText
} from './helpers';
import { arrayExclude } from './utils';
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

      let onGoToResult = true;

      if (typeof config.onGoTo === 'function') {
        onGoToResult = config.onGoTo({
          game: API, destination
        });
      }

      // FIXME: turn tracking may not be intuitive here

      if (onGoToResult === false || !gameState.isActive) return;

      if (typeof destination.onGoTo === 'function') {
        onGoToResult = destination.onGoTo({
          game: API
        });
      }

      if (onGoToResult === false || !gameState.isActive) return;

      gameState.currentLocationId = locationId;
      API.location.meta.visitCount += 1;
      API.look();

      if (!skipTurn) API.doTurn();

      if (typeof onGoToResult === 'function') {
        onGoToResult();
      }
    },

    get inventory() {
      return gameState.inventory;
    },

    get location() {
      return entities[gameState.currentLocationId];
    },

    look(forceFullDescription = false) {
      const loc = API.location;
      const isFullLook = forceFullDescription || loc.meta.visitCount === 1;

      let onLookResult = true;

      const lookCallbacks = [config.onLook, loc.onLook];

      for (let i = 0; i < 2; i++) {
        const fn = lookCallbacks[i];
        if (typeof fn === 'function') {
          onLookResult = fn({
            game: API,
            isFullLook
          });

          if (onLookResult === false || !gameState.isActive) return;
        }
      }

      API.print(isFullLook ? loc.description : loc.summary);

      if (loc.things.size === 0) {
        if (typeof onLookResult === 'function') {
          onLookResult();
        }
        return;
      }

      let visibleEnts = getVisibleEntities(loc, entities);

      if (isFullLook) {
        // Print any 'initial' entries for
        // unmolested items on full LOOK
        const entsWithInitial = getEntitiesWithInitial(visibleEnts);

        if (entsWithInitial.length > 0) {
          entsWithInitial.forEach((i) => {
            API.print(i.initial);
          });

          visibleEnts = arrayExclude(visibleEnts, entsWithInitial);
        }
      }

      if (visibleEnts.length === 0) {
        if (typeof onLookResult === 'function') {
          onLookResult();
        }
        return;
      }

      const listText = `${
        gameMessages.LOCATION_ITEMS_PREFIX
      }${getSummaryListText(visibleEnts, API)}.`;

      API.print(listText);

      if (typeof onLookResult === 'function') {
        onLookResult();
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

    if (!shouldUpdateTurn) return;

    API.doTurn();

    if (typeof config.onTurn === 'function') {
      config.onTurn({ game: API, turnCount: gameState.turnCount });
    }
  });

  // Start the game
  UI.clearOutput();
  API.goTo(gameState.currentLocationId, true);
};

export default {
  start
};
