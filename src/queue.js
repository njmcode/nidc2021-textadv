// Basic queue setup for handling game output.
// add() pushes items onto the queue.
//
// If the item is for printing text,
// it will be immediately flushed and printed.
// { outputText cssClass }
//
// If the item is for pausing the game,
// it will prevent any further output until
// the time has passed.
// { pauseTime }
const queueHelper = ({ UI, gameState }) => {
  const outputQueue = [];
  let isFlushing = false;

  const flushOutputQueue = () => {
    if (isFlushing) return;

    if (outputQueue.length === 0) {
      isFlushing = false;
      if (gameState.isActive) UI.showInput();
      return;
    }

    isFlushing = true;

    const output = outputQueue.shift();

    if ('pauseTime' in output) {
      setTimeout(() => {
        isFlushing = false;
        flushOutputQueue();
      }, output.pauseTime);

      return;
    }

    const { outputText, cssClass } = output;

    UI.writeOutput(outputText, cssClass);
    UI.scrollToBottom();

    isFlushing = false;

    flushOutputQueue();
  };

  const add = (output) => {
    outputQueue.push(output);
    flushOutputQueue();
  };

  return {
    add
  };
};

export default queueHelper;
