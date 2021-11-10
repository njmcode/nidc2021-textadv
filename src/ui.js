const defaultSelectors = {
  inputForm: '.game-input',
  inputField: '.game-typed-input',
  output: '.game-output'
};

const CSS_CLASS_HIDE_FORM = 'hidden';

const UI = (selectors = {}) => {
  const sels = {
    ...defaultSelectors,
    ...selectors
  };

  const els = Object.entries(sels).reduce((obj, [k, s]) => {
    const el = document.querySelector(s);
    if (!el) throw new Error(`No DOM element found for selector: ${s}`);

    // eslint-disable-next-line no-param-reassign
    obj[k] = el;
    return obj;
  }, {});

  const getInput = () => els.inputField.value.trim();

  const onSubmit = (cb) => {
    els.inputForm.addEventListener('submit', (e) => {
      e.preventDefault();

      cb(getInput());
    });
  };

  const clearInput = () => {
    els.inputField.value = '';
  };

  const clearOutput = () => {
    els.output.innerHTML = '';
  };

  const hideInput = () => {
    els.inputForm.classList.add(CSS_CLASS_HIDE_FORM);
  };

  const showInput = () => {
    els.inputForm.classList.remove(CSS_CLASS_HIDE_FORM);
  };

  const writeOutput = (outputText, cssClass) => {
    const pEl = document.createElement('p');
    pEl.innerHTML = outputText;
    if (cssClass) pEl.classList.add(cssClass);
    els.output.appendChild(pEl);
  };

  const scrollToBottom = () => {
    window.scrollTo(0, document.body.scrollHeight);
  };

  return {
    els,
    onSubmit,
    getInput,
    clearInput,
    hideInput,
    showInput,
    clearOutput,
    writeOutput,
    scrollToBottom
  };
};

export default UI;
