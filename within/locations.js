const front = () => ({
  id: 'front',
  summary: 'Outside the front door, bathed in yellow lantern light.',
  description: [
    'The front door is stained from weather and neglect, despite the small porch roof that crowds its upper corners. Night insects dance around the lanterns flanking the door. Jaundiced light envelops the porch, but does not penetrate the eastern shadows.',
    'Beyond the aged brickwork of the west wall is an overgrown driveway.'
  ],
  tags: ['outdoors'],
  to: {
    e: 'grounds',
    w: 'driveway',
    n: 'porch',
    in: 'porch'
  }
});

const porch = (getThis) => ({
  id: 'porch',
  summary: 'In the cramped and mouldy porch.',
  description: 'Porch TBD',
  to: {
    s: 'front',
    out: 'front'
  },
  data: {
    isDoorBlocked: true
  },
  onGoTo: ({ game, stopGoTo }) => {
    if (getThis().data.isDoorBlocked) {
      game.print('The door groans and creaks, but refuses to yield.');
      stopGoTo();
    }
  }
});

const grounds = () => ({
  id: 'grounds',
  summary: 'Waste ground, completely reclaimed by long grasses.',
  description: [
    'The waste ground is enough for a whole other house, but nature has reclaimed it, burying it under weeds and grasses. Your feet struggle to find secure purchase: a ditch here, a mound there.',
    'Wan street light barely illuminates the area from beyond the metal fence. To the east, the side of the house is featureless and decaying. Only the glow of the front porch draws your interest.',
  ],
  tags: ['outdoors'],
  to: {
    w: 'front'
  }
});

const driveway = () => ({
  id: 'driveway',
  summary: 'An overgrown driveway with a broken-down car.',
  description: [
    'The saloon car in the driveway is as run-down as the house itself. Suspension low to the weed-infested concrete, its windows are opaque with dirt.',
    'To the north, the garage door has also malfunctioned. Darkness envelops the concrete visible beneath the gap.',
    'The front wall of the house leads east to the porch.'
  ],
  tags: ['outdoors'],
  to: {
    e: 'front',
    n: 'garage',
    in: 'garage'
  }
});

const garage = (getThis) => ({
  id: 'garage',
  summary: 'A musty and cold garage, filled with junk.',
  description: [
    'Garage TBD'
  ],
  to: {
    s: 'driveway',
    out: 'driveway'
  },
  data: {
    isDoorBlocked: true
  },
  onGoTo: ({ game, stopGoTo }) => {
    if (getThis().data.isDoorBlocked) {
      game.print('The gap beneath the garage door is too tight to fit through.');
      stopGoTo();
    }
  }
});

export default [
  front,
  porch,
  grounds,
  driveway,
  garage
];
