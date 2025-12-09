export const initialItems = [
  {
    id: '1',
    imageUri: 'https://via.placeholder.com/150/0000FF/808080?text=Blue+Shirt',
    type: 'top',
    tags: ['casual', 'blue', 'work'],
    lastWorn: null,
    refreshCycle: 7,
  },
  {
    id: '2',
    imageUri: 'https://via.placeholder.com/150/FF0000/FFFFFF?text=Red+Dress',
    type: 'dress',
    tags: ['fancy', 'red', 'night out'],
    lastWorn: null,
    refreshCycle: 14,
  },
  {
    id: '3',
    imageUri: 'https://via.placeholder.com/150/000000/FFFFFF?text=Black+Jeans',
    type: 'bottom',
    tags: ['casual', 'black', 'everyday'],
    lastWorn: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    refreshCycle: 3,
  },
];
