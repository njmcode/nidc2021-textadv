/* eslint-disable no-param-reassign */
import { rndArray } from './utils';

const OUTDOOR_AMBIENCE_CHANCE = 0.2;
const OUTDOOR_AMBIENCES = [
  'The tall trees to the rear of the property rustle in the wind.',
  'A brief flurry of bird wings can be heard somewhere overhead.',
  'You hear a creak of timber.',
  'The weeds and grasses sway in the night air.',
  'You hear a door or window slam shut somewhere.',
  'A sudden, sharp wind chills the back of your neck.'
];

const onTurn = ({ game }) => {
  // Randomly describe outdoor ambience
  if (
    game.location.tags.has('outdoors')
    && Math.random() < OUTDOOR_AMBIENCE_CHANCE
  ) {
    game.print(rndArray(OUTDOOR_AMBIENCES));
  }
};

const onCommand = ({
  game, command, subject, afterCommand
}) => {
  // Certain items reveal others after examining them
  // TODO: make this a library built-in?
  if (
    command.examine
    && subject.exists
    && subject.data.revealOnExamine
  ) {
    const { entity, message } = subject.data.revealOnExamine;
    const tgtEnt = game.entity(entity);

    if (tgtEnt.tags.has('invisible')) {
      afterCommand(() => {
        tgtEnt.tags.delete('invisible');
        if (message) game.print(message);
      });
    }
  }
};

export default {
  onTurn,
  onCommand
};
