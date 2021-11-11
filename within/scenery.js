const car = () => ({
  id: 'car',
  nouns: ['car', 'saloon', 'vehicle', 'wreck', 'breakdown'],
  tags: ['scenery'],
  description: [
    'The silver bodywork of the vehicle is corroded and dented. Dirt and grime makes the windows impossible to see through.',
    'The doors and rear boot are all locked.'
  ],
  data: {
    revealOnExamine: {
      entity: 'jack',
      message: 'Beneath the car, you can make out a rusted car jack.'
    }
  }
});

export default [
  car
];
