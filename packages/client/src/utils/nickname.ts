const ADJECTIVES = [
  'Swift', 'Cosmic', 'Clever', 'Neon', 'Brave', 'Silent', 'Mighty', 'Zen',
  'Hyper', 'Laser', 'Pixel', 'Sonic', 'Golden', 'Shadow', 'Turbo', 'Epic',
  'Nova', 'Mystic', 'Vivid', 'Quantum', 'Frost', 'Solar', 'Blazing', 'Iron'
];

const NOUNS = [
  'Fox', 'Falcon', 'Panda', 'Tiger', 'Wolf', 'Owl', 'Dragon', 'Hawk',
  'Otter', 'Lynx', 'Raven', 'Viper', 'Badger', 'Dolphin', 'Eagle', 'Gecko',
  'Cobra', 'Leopard', 'Panther', 'Phoenix', 'Bear', 'Shark', 'Jaguar', 'Koala'
];

export function generateRandomNickname(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(10 + Math.random() * 89); // 2-digit number (10-99)
  return `${adj}${noun}${num}`;
}
