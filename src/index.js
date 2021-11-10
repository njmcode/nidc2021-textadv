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

  const gameState = {
    turnCount: 0,
    isActive: true,
    currentLocationId: startLocationId,
    inventory: new Set(config.startInventory || []),
    lastSubject: null
  };

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

  const parseInput = (inputText) => {
    // Get verbs and nouns from input
    const parsed = nlp(inputText);

    const verb = parsed.verbs().out('array')[0];
    const noun = parsed.nouns().out('array')[0];

    // Get base command
    if (!(verb in baseCommandMap)) {
      API.print(gameMessages.FAIL_UNKNOWN);
      API.noTurn();
      return;
    }
    const baseCommand = baseCommandMap[verb];

    // Get subject
    const subject = getSubject(
      noun,
      [API.location.things, API.inventory],
      (i) => !i.tags.has(TAGS.INVISIBLE)
    );

    // Handle custom commands first
    if (typeof config.onCommand === 'function') {
      let shouldStopCommand = false;

      const stopCommand = (suppressTurn = false) => {
        shouldStopCommand = true;
        if (suppressTurn) API.noTurn();
      };

      const afterCommand = (cb) => { afterCommandCallback = cb; };

      const command = Object.keys(commands).reduce((obj, k) => {
        obj[k] = baseCommand === k;
        return obj;
      }, {});
      command._base = baseCommand;

      config.onCommand({
        command,
        subject: subject || { is: () => false, exists: false },
        game: API,
        stopCommand,
        afterCommand,
        noTurn: API.noTurn
      });

      if (shouldStopCommand) return;
    }

    if (!gameState.isActive) return;

    // Handle location connections
    if (API.location.to && baseCommand in API.location.to) {
      API.goTo(API.location.to[baseCommand]);
      return;
    }

    // Built-in command handling
    switch (baseCommand) {
      case commands.n:
      case commands.s:
      case commands.e:
      case commands.w:
      case commands.up:
      case commands.down:
      case commands.in:
      case commands.out: {
        // Fall-through if earlier logic fails
        API.print(gameMessages.FAIL_NO_EXIT);
        return;
      }

      case commands.look: {
        API.look(true);
        API.noTurn();
        return;
      }

      case commands.examine: {
        if (!subject) {
          API.print(gameMessages.FAIL_EXAMINE);
          API.noTurn();
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
          API.noTurn();
          return;
        }

        if (API.inventory.has(subject.id)) {
          API.print(gameMessages.FAIL_GET_OWNED);
          API.noTurn();
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
          API.noTurn();
          return;
        }

        if (subject.tags.has(TAGS.FIXED)) {
          API.print(gameMessages.FAIL_DROP);
          API.noTurn();
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
          API.noTurn();
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
        API.noTurn();
        return;
      }

      case commands.help: {
        API.print(
          `Basic commands: ${Object.values(commands).join(
            ', '
          )}. Try other words too!`,
          'info'
        );
        API.noTurn();
        return;
      }

      default: {
        API.print(gameMessages.FAIL_UNHANDLED);
        API.noTurn();
      }
    }
  };

  // Setup input-parse-output loop
  UI.onSubmit((inputText) => {
    if (!inputText) return;
    if (!gameState.isActive) return;

    afterCommandCallback = null;
    shouldUpdateTurn = true;

    API.print(inputText, 'input');
    UI.clearInput();

    parseInput(inputText.toLowerCase());

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
