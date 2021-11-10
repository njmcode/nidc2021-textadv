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
  if (
    game.location.tags.has('outdoors')
    && Math.random() < OUTDOOR_AMBIENCE_CHANCE
  ) {
    game.print(rndArray(OUTDOOR_AMBIENCES));
  }
};

export default {
  onTurn
};
