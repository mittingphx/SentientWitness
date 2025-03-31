// Random name generator for guest users

const adjectives = [
  "Sleepy", "Frustrated", "Enthusiastic", "Curious", "Dizzy", 
  "Hungry", "Sarcastic", "Grumpy", "Clever", "Witty",
  "Philosophical", "Mischievous", "Brave", "Timid", "Whimsical",
  "Inquisitive", "Adventurous", "Dramatic", "Forgetful", "Energetic",
  "Thoughtful", "Suspicious", "Confused", "Giggly", "Focused",
  "Determined", "Quirky", "Artistic", "Skeptical", "Jubilant",
  "Anxious", "Laid-back", "Eccentric", "Meticulous", "Cheerful"
];

const animals = [
  "Owl", "Alligator", "Penguin", "Fox", "Koala", 
  "Octopus", "Kangaroo", "Hedgehog", "Platypus", "Narwhal",
  "Panda", "Capybara", "Sloth", "Dolphin", "Axolotl",
  "Raccoon", "Chameleon", "Armadillo", "Wombat", "Lemur",
  "Walrus", "Llama", "Quokka", "Meerkat", "Otter",
  "Mongoose", "Alpaca", "Manatee", "Opossum", "Lynx",
  "Squirrel", "Tapir", "Bison", "Badger", "Pangolin"
];

/**
 * Generate a random funny name combining an adjective and an animal
 */
export function generateFunnyName(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  return `${adjective} ${animal}`;
}

/**
 * Generate multiple unique funny names
 */
export function generateMultipleFunnyNames(count: number): string[] {
  const names: string[] = [];
  const usedCombinations = new Set<string>();
  
  while (names.length < count && names.length < adjectives.length * animals.length) {
    const name = generateFunnyName();
    if (!usedCombinations.has(name)) {
      usedCombinations.add(name);
      names.push(name);
    }
  }
  
  return names;
}

/**
 * Generate a specific funny name based on a seed
 * (useful for generating consistent names for the same user/session)
 */
export function generateSeededFunnyName(seed: string): string {
  // Simple hash function for the seed
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0; // Convert to 32-bit integer
  }
  
  // Use the hash to select adjective and animal
  const adjectiveIndex = Math.abs(hash) % adjectives.length;
  const animalIndex = Math.abs(hash >> 8) % animals.length;
  
  return `${adjectives[adjectiveIndex]} ${animals[animalIndex]}`;
}