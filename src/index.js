/* eslint-disable no-param-reassign */
import nlp from 'compromise';

/**

BUGS:

- 'use key' not recognized as verb
- 'me' not recognized as noun

* */

class Engine {
  COMMANDS = {
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

  ALIASES = {
    [this.COMMANDS.n]: ['north', 'go north'],
    [this.COMMANDS.e]: ['east', 'go east'],
    [this.COMMANDS.w]: ['west', 'go west'],
    [this.COMMANDS.s]: ['south', 'go south'],
    [this.COMMANDS.up]: ['u', 'go up', 'ascend'],
    [this.COMMANDS.down]: ['d', 'go down', 'descend'],
    [this.COMMANDS.in]: ['enter', 'go in'],
    [this.COMMANDS.out]: ['leave', 'go out', 'exit'],
    [this.COMMANDS.look]: ['look around', 'where', 'where am i', 'whereami'],
    [this.COMMANDS.examine]: ['look at', 'inspect', 'x', 'ex', 'search'],
    [this.COMMANDS.get]: ['g', 'take', 'pick up', 'obtain', 'acquire', 'grab'],
    [this.COMMANDS.drop]: ['put down', 'toss', 'remove', 'discard'],
    [this.COMMANDS.inventory]: [
      'inv',
      'carrying',
      'equipment',
      'items',
      'gear'
    ],
    [this.COMMANDS.help]: [
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

  TAGS = {
    SILENT: 'silent',
    INVISIBLE: 'invisible',
    FIXED: 'fixed',
    QUIET: 'quiet',
    SCENERY: 'scenery'
  };

  MESSAGES = {
    LOCATION_ITEMS_PREFIX: 'You can see ',
    INV_PREFIX: 'You are carrying ',
    INV_NONE: 'You are carrying nothing.',
    FAIL_UNKNOWN: 'Sorry, I don\'t understand.',
    FAIL_UNHANDLED: 'Sorry, I can\'t do that.',
    FAIL_NO_EXIT: 'You can\'t go that way.',
    FAIL_EXAMINE: 'Sorry, I can\'t see that.',
    FAIL_GET: "Sorry, I can't get that.",
    FAIL_GET_OWNED: 'You already seem to have that.',
    FAIL_DROP: "Sorry, I can't drop that.",
    FAIL_DROP_OWNED: "You don't seem to have that.",
    OK_GET: 'Taken.',
    OK_DROP: 'Dropped.'
  };

  constructor(config) {
    this.config = config;

    // TODO: sanitize/validate entries

    if (this.config.commands) {
      Object.entries(this.config.commands).forEach(([cmd, aliases]) => {
        this.COMMANDS[cmd] = cmd;
        this.ALIASES[cmd] = aliases;
      });
    }

    this.validCommands = Object.entries(this.ALIASES).reduce(
      (obj, [baseCmd, aliases]) => {
        obj[baseCmd] = baseCmd;
        aliases.forEach((alias) => { obj[alias] = baseCmd; });
        return obj;
      },
      {}
    );
    console.log('validCommands', this.validCommands);

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
        visitCount: 0
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
    this.goTo(this.config.startLocationId || this._defaultStartId, true);
  };

  get location() {
    return this.entities[this.state.currentLocationId];
  }

  get inventory() {
    return this.state.inventory;
  }

  look = (forceFullDescription = false) => {
    if (forceFullDescription || !this.location.meta.isRead) {
      this.print(this.location.description);
    } else {
      this.print(this.location.summary);
    }

    if (this.location.things.size > 0) {
      const visibleEnts = [...this.location.things]
        .map((h) => this.entities[h])
        .filter(
          (i) => !i.tags.has(this.TAGS.INVISIBLE)
            && !i.tags.has(this.TAGS.SCENERY)
            && !i.tags.has(this.TAGS.SILENT)
        );

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
      (i) => !i.tags.has(this.TAGS.INVISIBLE)
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
        return;
      }

      case this.COMMANDS.get: {
        if (
          !subject
          || subject.tags.has(this.TAGS.SCENERY)
          || subject.tags.has(this.TAGS.FIXED)
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
        this.print(this.MESSAGES.OK_GET);
        return;
      }

      case this.COMMANDS.drop: {
        if (!subject || !this.state.inventory.has(subject.id)) {
          this.print(this.MESSAGES.FAIL_DROP_OWNED);
          noTurn();
          return;
        }

        if (subject.tags.has(this.TAGS.FIXED)) {
          this.print(this.MESSAGES.FAIL_DROP);
          noTurn();
          return;
        }

        this.state.inventory.delete(subject.id);
        this.location.things.add(subject.id);
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
            (i) => !i.tags.has(this.TAGS.INVISIBLE) && !i.tags.has(this.TAGS.SILENT)
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

    this.state.currentLocationId = locationId;
    this.location.meta.visitCount += 1;
    this.look();
    if (!skipTurn) this.doTurn();

    if (typeof this.config.onLocationVisit === 'function') {
      this.config.onLocationVisit({ game: this, here: this.location });
    }

    if (!this.state.isActive) return;

    if (typeof this.location.onLocationVisit === 'function') {
      this.location.onLocationVisit({ game: this, here: this.location });
    }
  };

  end = () => {
    this.state.isActive = false;
    this.els.inputForm.classList.add('hidden');
  };
}

export default Engine;
