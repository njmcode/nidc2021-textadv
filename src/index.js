/* eslint-disable no-param-reassign */
import nlp from 'compromise';

import COMMANDS, { ALIASES } from './commands';
import TAGS from './tags';
import MESSAGES from './messages';

/**

BUGS:

- 'use key' not recognized as verb
- 'me' not recognized as noun

* */

class Engine {
  static TAGS = TAGS;

  constructor(config) {
    // TODO: sanitize/validate entries
    this.config = config;

    // Temp instance vars until class is refactored
    this.MESSAGES = { ...MESSAGES };
    this.COMMANDS = { ...COMMANDS };
    this.ALIASES = Object.entries(ALIASES).reduce((obj, [k, v]) => {
      obj[k] = v;
      return obj;
    }, {});

    // Add custom commands + aliases
    if (this.config.commands) {
      Object.entries(this.config.commands).forEach(([cmd, aliases]) => {
        this.COMMANDS[cmd] = cmd;
        this.ALIASES[cmd] = aliases;
      });
    }

    // Build alias->command map
    this.validCommands = Object.entries(this.ALIASES).reduce(
      (obj, [baseCmd, aliases]) => {
        obj[baseCmd] = baseCmd;
        aliases.forEach((alias) => { obj[alias] = baseCmd; });
        return obj;
      },
      {}
    );
    console.log('validCommands', this.validCommands);

    // Let compromise know about our new verbs
    nlp.extend((_Doc, world) => {
      // Blow away the NLP built-in dict
      // TODO: surely there's a way to use it?
      // world.words = {};

      const extraVerbs = Object.keys(this.validCommands).reduce((obj, k) => {
        obj[k] = 'Verb';
        return obj;
      }, {});

      world.addWords(extraVerbs);
    });

    // Hook up the DOM
    this.els = {
      inputForm: document.querySelector('.game-input'),
      inputField: document.querySelector('.game-typed-input'),
      output: document.querySelector('.game-output')
    };

    this.els.inputForm.addEventListener('submit', (e) => {
      e.preventDefault();

      if (!this.state.isActive) return;

      const inputText = this.els.inputField.value.trim();
      if (!inputText) return;

      this.print(inputText.trim(), 'input');
      this.els.inputField.value = '';

      this.afterCommand = null;
      this.shouldUpdateTurn = true;

      this.parse(inputText.toLowerCase());

      if (!this.state.isActive) return;

      if (typeof this.afterCommand === 'function') {
        this.afterCommand();
        this.afterCommand = null;
      }

      if (!this.state.isActive) return;

      if (this.shouldUpdateTurn) {
        this.state.turnCount += 1;
        if (typeof this.config.onTurn === 'function') {
          this.config.onTurn({ game: this, turnCount: this.state.turnCount });
        }
      }
    });

    console.info('Engine: ready to start');
  }

  start = () => {
    this.state = {
      turnCount: 0,
      isActive: true,
      currentLocationId: null,
      inventory: new Set(this.config.startInventory || []),
      lastSubject: null
    };

    this.validNouns = {};
    this.afterCommand = null;

    this.entities = this.config.entities.reduce((obj, ent, idx) => {
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

      if (idx === 0 && this.config.startLocationId === undefined) {
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

    this.els.output.innerHTML = '';
    this.state.currentLocationId = this.config.startLocationId || this._defaultStartId;
    // Trigger any state logic in the first location
    this.goTo(this.state.currentLocationId, true);
  };

  get location() {
    return this.entities[this.state.currentLocationId];
  }

  get inventory() {
    return this.state.inventory;
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
          this.MESSAGES.LOCATION_ITEMS_PREFIX
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
    this.els.output.appendChild(pEl);

    window.scrollTo(0, document.body.scrollHeight);
  };

  entity = (id) => {
    if (!this.entities[id]) {
      throw new Error(`Game logic error: no entity id '${id}'`);
    }

    return this.entities[id];
  };

  doTurn = () => {
    this.state.turnCount += 1;
  };

  parse = (inputText) => {
    const parsed = nlp(inputText);

    console.group('parse');
    console.log('parsed', parsed);
    console.log('TAGS', parsed.out('tags'));
    console.log('VERBS', parsed.verbs().out('array'));
    console.log('NOUNS', parsed.nouns().out('array'));
    console.groupEnd('parse');

    const verb = parsed.verbs().out('array')[0];
    const noun = parsed.nouns().out('array')[0];

    const noTurn = () => {
      this.shouldUpdateTurn = false;
    };

    if (!(verb in this.validCommands)) {
      this.print(this.MESSAGES.FAIL_UNKNOWN);
      noTurn();
      return;
    }

    const baseCommand = this.validCommands[verb];

    // Build list of potential subjects from:
    // - Current location 'has'
    // - Player inventory

    const subject = this.getSubject(
      noun,
      [this.location.things, this.state.inventory],
      (i) => !i.tags.has(TAGS.INVISIBLE)
    );

    if (typeof this.config.onCommand === 'function') {
      let shouldStopCommand = false;

      const stopCommand = (suppressTurn = false) => {
        shouldStopCommand = true;
        if (suppressTurn) noTurn();
      };

      const afterCommand = (cb) => { this.afterCommand = cb; };

      const command = Object.keys(this.COMMANDS).reduce((obj, k) => {
        obj[k] = baseCommand === k;
        return obj;
      }, {});
      command._base = baseCommand;

      this.config.onCommand({
        command,
        subject: subject || { is: () => false, exists: false },
        game: this,
        stopCommand,
        afterCommand,
        noTurn
      });
      if (shouldStopCommand) return;
    }

    if (!this.state.isActive) return;

    if (this.location.to && baseCommand in this.location.to) {
      this.goTo(this.location.to[baseCommand]);
      return;
    }

    switch (baseCommand) {
      case this.COMMANDS.n:
      case this.COMMANDS.s:
      case this.COMMANDS.e:
      case this.COMMANDS.w:
      case this.COMMANDS.up:
      case this.COMMANDS.down:
      case this.COMMANDS.in:
      case this.COMMANDS.out: {
        if (!this.location.to || !(baseCommand in this.location.to)) {
          this.print(this.MESSAGES.FAIL_NO_EXIT);
          return;
        }

        this.goTo(this.location.to[baseCommand]);
        return;
      }

      case this.COMMANDS.look: {
        this.look(true);
        noTurn();
        return;
      }

      case this.COMMANDS.examine: {
        if (!subject) {
          this.print(this.MESSAGES.FAIL_EXAMINE);
          noTurn();
          return;
        }

        this.print(subject.description);
        subject.meta.isExamined = true;
        return;
      }

      case this.COMMANDS.get: {
        if (
          !subject
          || subject.tags.has(TAGS.SCENERY)
          || subject.tags.has(TAGS.FIXED)
        ) {
          this.print(this.MESSAGES.FAIL_GET);
          noTurn();
          return;
        }

        if (this.state.inventory.has(subject.id)) {
          this.print(this.MESSAGES.FAIL_GET_OWNED);
          noTurn();
          return;
        }

        this.location.things.delete(subject.id);
        this.state.inventory.add(subject.id);
        subject.meta.isInitialState = false;
        this.print(this.MESSAGES.OK_GET);
        return;
      }

      case this.COMMANDS.drop: {
        if (!subject || !this.state.inventory.has(subject.id)) {
          this.print(this.MESSAGES.FAIL_DROP_OWNED);
          noTurn();
          return;
        }

        if (subject.tags.has(TAGS.FIXED)) {
          this.print(this.MESSAGES.FAIL_DROP);
          noTurn();
          return;
        }

        this.state.inventory.delete(subject.id);
        this.location.things.add(subject.id);
        subject.meta.isInitialState = false;
        this.print(this.MESSAGES.OK_DROP);
        return;
      }

      case this.COMMANDS.inventory: {
        if (this.state.inventory.size === 0) {
          this.print(this.MESSAGES.INV_NONE);
          noTurn();
          return;
        }

        const invText = [...this.state.inventory]
          .map((i) => this.entities[i])
          .filter(
            (i) => !i.tags.has(TAGS.INVISIBLE) && !i.tags.has(TAGS.SILENT)
          )
          .map((i) => this.dyntext(i.summary))
          .join(', ');
        this.print(`${this.MESSAGES.INV_PREFIX}${invText}.`);
        noTurn();
        return;
      }

      case this.COMMANDS.help: {
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
        this.print(this.MESSAGES.FAIL_UNHANDLED);
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

    if (typeof this.config.onGoTo === 'function') {
      this.config.onGoTo({
        game: this, destination, stopGoTo, afterGoTo
      });
    }

    // FIXME: turn tracking may not be intuitive here

    if (!this.state.isActive || _shouldStopChange) return;

    if (typeof destination.onGoTo === 'function') {
      destination.onGoTo({
        game: this, stopGoTo, afterGoTo
      });
    }

    if (!this.state.isActive || _shouldStopChange) return;

    this.state.currentLocationId = locationId;
    this.location.meta.visitCount += 1;
    this.look();
    if (!skipTurn) this.doTurn();

    if (typeof _afterLocationChangeCallback === 'function') {
      _afterLocationChangeCallback();
    }
  };

  end = () => {
    this.state.isActive = false;
    this.els.inputForm.classList.add('hidden');
  };
}

export default Engine;
