/* eslint-disable no-param-reassign */
import nlp from 'compromise';
import { isSubjectMoveable, getListableInventory, getSummaryListText } from './helpers';
import TAGS from './tags';
import { arrayToObject } from './utils';

const parse = ({
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
}) => {
  // Get verbs and nouns from input
  const parsed = nlp(inputText.toLowerCase());

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
    let onCommandResult = true;

    const command = arrayToObject(
      Object.keys(commands),
      (_obj, k) => baseCommand === k
    );
    command._base = baseCommand;

    // Pass authoring tools to custom command callback
    onCommandResult = config.onCommand({
      command,
      subject: subject || { is: () => false, exists: false },
      game: API,
      noTurn: API.noTurn
    });

    if (onCommandResult === false || !gameState.isActive) return;

    if (typeof onCommandResult === 'function') {
      afterCommand(onCommandResult);
    }
  }

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
      if (!isSubjectMoveable(subject)) {
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

      if (!isSubjectMoveable(subject)) {
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

      const invItems = getListableInventory(entities, API);
      const invText = getSummaryListText(invItems, API);

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

export default parse;
