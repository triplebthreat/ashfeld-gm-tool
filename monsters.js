// ============================================================
// monsters.js — SRD 5.1 monster appendix, CR 0–5
// ============================================================
// Curated for a level 1–5 arc (Ashfeld: forest, fey, undead,
// cultists). Stats from the SRD (CC-BY-4.0). Add entries freely —
// shape below. Used by: combat setup autofill (datalist), combat
// bar stat-block panel, 📖 Bestiary browser.
//
//   { name, cr, ac, acNote?, hp, hpDice, speed,
//     abl: [STR,DEX,CON,INT,WIS,CHA],
//     atk: [{ n, hit, dmg, t, note? }],   // quick-roll attacks
//     traits: ['Name — effect', ...] }
// ============================================================

function abilityMod(score) { return Math.floor((score - 10) / 2); }

const XP_BY_CR = { '0': 10, '1/8': 25, '1/4': 50, '1/2': 100, '1': 200, '2': 450, '3': 700, '4': 1100, '5': 1800, '6': 2300, '7': 2900, '8': 3900, '9': 5000, '10': 5900 };

function crValue(cr) {
  if (String(cr).includes('/')) { const [a, b] = String(cr).split('/'); return a / b; }
  return Number(cr);
}

const MONSTERS = [
  // ── CR 0 ──
  { name: 'Commoner', cr: '0', ac: 10, hp: 4, hpDice: '1d8', speed: '30 ft.', abl: [10,10,10,10,10,10],
    atk: [{ n: 'Club', hit: 2, dmg: '1d4', t: 'bludgeoning' }], traits: [] },
  { name: 'Rat', cr: '0', ac: 10, hp: 1, hpDice: '1d4-1', speed: '20 ft.', abl: [2,11,9,2,10,4],
    atk: [{ n: 'Bite', hit: 0, dmg: '1d1', t: 'piercing' }], traits: ['Keen Smell — advantage on smell-based Perception'] },
  { name: 'Raven', cr: '0', ac: 12, hp: 1, hpDice: '1d4-1', speed: '10 ft., fly 50 ft.', abl: [2,14,8,2,12,6],
    atk: [{ n: 'Beak', hit: 4, dmg: '1d1', t: 'piercing' }], traits: ['Mimicry — imitates simple sounds (Insight DC 10)'] },

  // ── CR 1/8 ──
  { name: 'Bandit', cr: '1/8', ac: 12, acNote: 'leather', hp: 11, hpDice: '2d8+2', speed: '30 ft.', abl: [11,12,12,10,10,10],
    atk: [{ n: 'Scimitar', hit: 3, dmg: '1d6+1', t: 'slashing' }, { n: 'Light Crossbow', hit: 3, dmg: '1d8+1', t: 'piercing', note: '80/320 ft.' }], traits: [] },
  { name: 'Cultist', cr: '1/8', ac: 12, acNote: 'leather', hp: 9, hpDice: '2d8', speed: '30 ft.', abl: [11,12,10,10,11,10],
    atk: [{ n: 'Scimitar', hit: 3, dmg: '1d6+1', t: 'slashing' }], traits: ['Dark Devotion — advantage vs. charmed/frightened'] },
  { name: 'Guard', cr: '1/8', ac: 16, acNote: 'chain shirt, shield', hp: 11, hpDice: '2d8+2', speed: '30 ft.', abl: [13,12,12,10,11,10],
    atk: [{ n: 'Spear', hit: 3, dmg: '1d6+1', t: 'piercing', note: 'or 1d8+1 two-handed' }], traits: [] },
  { name: 'Kobold', cr: '1/8', ac: 12, hp: 5, hpDice: '2d6-2', speed: '30 ft.', abl: [7,15,9,8,7,8],
    atk: [{ n: 'Dagger', hit: 4, dmg: '1d4+2', t: 'piercing' }, { n: 'Sling', hit: 4, dmg: '1d4+2', t: 'bludgeoning', note: '30/120 ft.' }],
    traits: ['Pack Tactics — advantage if ally within 5 ft of target', 'Sunlight Sensitivity — disadvantage in sunlight'] },
  { name: 'Giant Rat', cr: '1/8', ac: 12, hp: 7, hpDice: '2d6', speed: '30 ft.', abl: [7,15,11,2,10,4],
    atk: [{ n: 'Bite', hit: 4, dmg: '1d4+2', t: 'piercing' }], traits: ['Pack Tactics — advantage if ally within 5 ft of target'] },
  { name: 'Mastiff', cr: '1/8', ac: 12, hp: 5, hpDice: '1d8+1', speed: '40 ft.', abl: [13,14,12,3,12,7],
    atk: [{ n: 'Bite', hit: 3, dmg: '1d6+1', t: 'piercing', note: 'DC 11 STR or knocked prone' }], traits: ['Keen Hearing and Smell'] },
  { name: 'Twig Blight', cr: '1/8', ac: 13, acNote: 'natural', hp: 4, hpDice: '1d6+1', speed: '20 ft.', abl: [6,13,12,4,8,3],
    atk: [{ n: 'Claws', hit: 3, dmg: '1d4+1', t: 'piercing' }],
    traits: ['False Appearance — indistinguishable from a dead shrub while motionless', 'Vulnerable to fire'] },

  // ── CR 1/4 ──
  { name: 'Goblin', cr: '1/4', ac: 15, acNote: 'leather, shield', hp: 7, hpDice: '2d6', speed: '30 ft.', abl: [8,14,10,10,8,8],
    atk: [{ n: 'Scimitar', hit: 4, dmg: '1d6+2', t: 'slashing' }, { n: 'Shortbow', hit: 4, dmg: '1d6+2', t: 'piercing', note: '80/320 ft.' }],
    traits: ['Nimble Escape — Disengage or Hide as a bonus action'] },
  { name: 'Skeleton', cr: '1/4', ac: 13, acNote: 'armor scraps', hp: 13, hpDice: '2d8+4', speed: '30 ft.', abl: [10,14,15,6,8,5],
    atk: [{ n: 'Shortsword', hit: 4, dmg: '1d6+2', t: 'piercing' }, { n: 'Shortbow', hit: 4, dmg: '1d6+2', t: 'piercing' }],
    traits: ['Vulnerable to bludgeoning', 'Immune to poison; can\'t be exhausted/poisoned'] },
  { name: 'Zombie', cr: '1/4', ac: 8, hp: 22, hpDice: '3d8+9', speed: '20 ft.', abl: [13,6,16,3,6,5],
    atk: [{ n: 'Slam', hit: 3, dmg: '1d6+1', t: 'bludgeoning' }],
    traits: ['Undead Fortitude — on drop to 0 HP (not radiant/crit): CON save DC 5+damage, on success drops to 1 HP instead'] },
  { name: 'Wolf', cr: '1/4', ac: 13, acNote: 'natural', hp: 11, hpDice: '2d8+2', speed: '40 ft.', abl: [12,15,12,3,12,6],
    atk: [{ n: 'Bite', hit: 4, dmg: '2d4+2', t: 'piercing', note: 'DC 11 STR or knocked prone' }],
    traits: ['Pack Tactics — advantage if ally within 5 ft of target', 'Keen Hearing and Smell'] },
  { name: 'Needle Blight', cr: '1/4', ac: 12, acNote: 'natural', hp: 11, hpDice: '2d8+2', speed: '30 ft.', abl: [12,12,13,4,8,3],
    atk: [{ n: 'Claws', hit: 3, dmg: '2d4+1', t: 'piercing' }, { n: 'Needles', hit: 3, dmg: '2d4+1', t: 'piercing', note: '30/60 ft.' }],
    traits: [] },
  { name: 'Sprite', cr: '1/4', ac: 15, acNote: 'leather', hp: 2, hpDice: '1d4', speed: '10 ft., fly 40 ft.', abl: [3,18,10,14,13,11],
    atk: [{ n: 'Longsword (tiny)', hit: 2, dmg: '1d1', t: 'slashing' }, { n: 'Shortbow', hit: 6, dmg: '1d1', t: 'piercing', note: 'DC 10 CON or poisoned 1 min (fail by 5+: unconscious)' }],
    traits: ['Invisibility — turns invisible until it attacks', 'Heart Sight — touch reveals emotional state/alignment'] },
  { name: 'Giant Wolf Spider', cr: '1/4', ac: 13, hp: 11, hpDice: '2d8+2', speed: '40 ft., climb 40 ft.', abl: [12,16,13,3,12,4],
    atk: [{ n: 'Bite', hit: 3, dmg: '1d6+1', t: 'piercing', note: 'DC 11 CON: 2d6 poison, half on save' }],
    traits: ['Spider Climb', 'Web Sense'] },
  { name: 'Boar', cr: '1/4', ac: 11, hp: 11, hpDice: '2d8+2', speed: '40 ft.', abl: [13,11,12,2,9,5],
    atk: [{ n: 'Tusk', hit: 3, dmg: '1d6+1', t: 'slashing', note: 'Charge: +1d6 and DC 11 STR or prone after 20 ft. straight move' }],
    traits: ['Relentless (1/short rest) — drops to 1 HP instead of 0 if damage ≤ 7'] },
  { name: 'Swarm of Ravens', cr: '1/4', ac: 12, hp: 24, hpDice: '7d8-7', speed: '10 ft., fly 50 ft.', abl: [6,14,8,3,12,6],
    atk: [{ n: 'Beaks', hit: 4, dmg: '2d6', t: 'piercing', note: '1d6 if swarm is at half HP or below' }],
    traits: ['Swarm — can occupy other creatures\' space; can\'t regain HP or gain temp HP', 'Resistant to bludgeoning/piercing/slashing'] },

  // ── CR 1/2 ──
  { name: 'Hobgoblin', cr: '1/2', ac: 18, acNote: 'chain mail, shield', hp: 11, hpDice: '2d8+2', speed: '30 ft.', abl: [13,12,12,10,10,9],
    atk: [{ n: 'Longsword', hit: 3, dmg: '1d8+1', t: 'slashing' }, { n: 'Longbow', hit: 3, dmg: '1d8+1', t: 'piercing', note: '150/600 ft.' }],
    traits: ['Martial Advantage — +2d6 damage once/turn if ally within 5 ft of target'] },
  { name: 'Orc', cr: '1/2', ac: 13, acNote: 'hide', hp: 15, hpDice: '2d8+6', speed: '30 ft.', abl: [16,12,16,7,11,10],
    atk: [{ n: 'Greataxe', hit: 5, dmg: '1d12+3', t: 'slashing' }, { n: 'Javelin', hit: 5, dmg: '1d6+3', t: 'piercing', note: '30/120 ft.' }],
    traits: ['Aggressive — bonus action move toward a hostile it can see'] },
  { name: 'Scout', cr: '1/2', ac: 13, acNote: 'leather', hp: 16, hpDice: '3d8+3', speed: '30 ft.', abl: [11,14,12,11,13,11],
    atk: [{ n: 'Shortsword (×2)', hit: 4, dmg: '1d6+2', t: 'piercing', note: 'Multiattack: two melee or two ranged' }, { n: 'Longbow (×2)', hit: 4, dmg: '1d8+2', t: 'piercing', note: '150/600 ft.' }],
    traits: ['Keen Hearing and Sight'] },
  { name: 'Thug', cr: '1/2', ac: 11, acNote: 'leather', hp: 32, hpDice: '5d8+10', speed: '30 ft.', abl: [15,11,14,10,10,11],
    atk: [{ n: 'Mace (×2)', hit: 4, dmg: '1d6+2', t: 'bludgeoning', note: 'Multiattack' }, { n: 'Heavy Crossbow', hit: 2, dmg: '1d10', t: 'piercing' }],
    traits: ['Pack Tactics — advantage if ally within 5 ft of target'] },
  { name: 'Black Bear', cr: '1/2', ac: 11, hp: 19, hpDice: '3d8+6', speed: '40 ft., climb 30 ft.', abl: [15,10,14,2,12,7],
    atk: [{ n: 'Bite', hit: 3, dmg: '1d6+2', t: 'piercing', note: 'Multiattack: bite + claws' }, { n: 'Claws', hit: 3, dmg: '2d4+2', t: 'slashing' }],
    traits: ['Keen Smell'] },
  { name: 'Worg', cr: '1/2', ac: 13, acNote: 'natural', hp: 26, hpDice: '4d10+4', speed: '50 ft.', abl: [16,13,13,7,11,8],
    atk: [{ n: 'Bite', hit: 5, dmg: '2d6+3', t: 'piercing', note: 'DC 13 STR or knocked prone' }],
    traits: ['Keen Hearing and Smell'] },
  { name: 'Shadow', cr: '1/2', ac: 12, hp: 16, hpDice: '3d8+3', speed: '40 ft.', abl: [6,14,13,6,10,8],
    atk: [{ n: 'Strength Drain', hit: 4, dmg: '2d6+2', t: 'necrotic', note: 'Target\'s STR reduced by 1d4; dies at STR 0' }],
    traits: ['Amorphous', 'Shadow Stealth — Hide as bonus action in dim light/darkness', 'Sunlight Weakness — disadvantage on everything in sunlight'] },
  { name: 'Vine Blight', cr: '1/2', ac: 12, acNote: 'natural', hp: 26, hpDice: '4d8+8', speed: '10 ft.', abl: [15,8,14,5,10,3],
    atk: [{ n: 'Constrict', hit: 4, dmg: '2d6+2', t: 'bludgeoning', note: 'Large or smaller: grappled (escape DC 12), restrained while grappled' }],
    traits: ['False Appearance — tangle of vines', 'Entangling Plants (recharge 5-6) — 15 ft radius, DC 12 STR or restrained'] },

  // ── CR 1 ──
  { name: 'Bugbear', cr: '1', ac: 16, acNote: 'hide, shield', hp: 27, hpDice: '5d8+5', speed: '30 ft.', abl: [15,14,13,8,11,9],
    atk: [{ n: 'Morningstar', hit: 4, dmg: '2d8+2', t: 'piercing' }, { n: 'Javelin', hit: 4, dmg: '2d6+2', t: 'piercing' }],
    traits: ['Brute — extra weapon die (already included)', 'Surprise Attack — +2d6 vs surprised targets'] },
  { name: 'Dire Wolf', cr: '1', ac: 14, acNote: 'natural', hp: 37, hpDice: '5d10+10', speed: '50 ft.', abl: [17,15,15,3,12,7],
    atk: [{ n: 'Bite', hit: 5, dmg: '2d6+3', t: 'piercing', note: 'DC 13 STR or knocked prone' }],
    traits: ['Pack Tactics — advantage if ally within 5 ft of target', 'Keen Hearing and Smell'] },
  { name: 'Ghoul', cr: '1', ac: 12, hp: 22, hpDice: '5d8', speed: '30 ft.', abl: [13,15,10,7,10,6],
    atk: [{ n: 'Claws', hit: 4, dmg: '2d4+2', t: 'slashing', note: 'Non-elf: DC 10 CON or paralyzed 1 min (repeat save each turn)' }, { n: 'Bite', hit: 2, dmg: '2d6+2', t: 'piercing' }],
    traits: ['Immune to poison; can\'t be charmed/exhausted/poisoned'] },
  { name: 'Giant Spider', cr: '1', ac: 14, acNote: 'natural', hp: 26, hpDice: '4d10+4', speed: '30 ft., climb 30 ft.', abl: [14,16,12,2,11,4],
    atk: [{ n: 'Bite', hit: 5, dmg: '1d8+3', t: 'piercing', note: 'DC 11 CON: 2d8 poison, half on save; 0 HP → paralyzed instead' },
          { n: 'Web (recharge 5-6)', hit: 5, dmg: '0d1', t: '—', note: 'Restrained (escape DC 12; web AC 10, 5 HP, vulnerable fire)' }],
    traits: ['Spider Climb', 'Web Sense', 'Web Walker'] },
  { name: 'Specter', cr: '1', ac: 12, hp: 22, hpDice: '5d8', speed: '0 ft., fly 50 ft. (hover)', abl: [1,14,11,10,10,11],
    atk: [{ n: 'Life Drain', hit: 4, dmg: '3d6', t: 'necrotic', note: 'DC 10 CON or HP max reduced by damage taken until long rest' }],
    traits: ['Incorporeal Movement — through objects (1d10 force if ends turn inside)', 'Resistant to most physical; immune necrotic/poison', 'Sunlight Sensitivity'] },
  { name: 'Brown Bear', cr: '1', ac: 11, hp: 34, hpDice: '4d10+12', speed: '40 ft., climb 30 ft.', abl: [19,10,16,2,13,7],
    atk: [{ n: 'Bite', hit: 5, dmg: '1d8+4', t: 'piercing', note: 'Multiattack: bite + claws' }, { n: 'Claws', hit: 5, dmg: '2d6+4', t: 'slashing' }],
    traits: ['Keen Smell'] },
  { name: 'Dryad', cr: '1', ac: 11, acNote: '16 with barkskin', hp: 22, hpDice: '5d8', speed: '30 ft.', abl: [10,12,11,14,15,18],
    atk: [{ n: 'Club', hit: 2, dmg: '1d4', t: 'bludgeoning', note: '+6 to hit / 1d8+4 with shillelagh' }],
    traits: ['Fey Charm — DC 14 WIS or charmed 24h', 'Tree Stride — teleport between trees', 'Speak with Beasts and Plants', 'Innate: entangle, goodberry, barkskin'] },
  { name: 'Imp', cr: '1', ac: 13, hp: 10, hpDice: '3d4+3', speed: '20 ft., fly 40 ft.', abl: [6,17,13,11,12,14],
    atk: [{ n: 'Sting', hit: 5, dmg: '1d4+3', t: 'piercing', note: 'DC 11 CON: 3d6 poison, half on save' }],
    traits: ['Shapechanger — rat/raven/spider', 'Invisibility at will', 'Magic Resistance', 'Resistant to cold + nonmagical/nonsilvered weapons'] },
  { name: 'Animated Armor', cr: '1', ac: 18, acNote: 'natural', hp: 33, hpDice: '6d8+6', speed: '25 ft.', abl: [14,11,13,1,3,1],
    atk: [{ n: 'Slam (×2)', hit: 4, dmg: '1d6+2', t: 'bludgeoning', note: 'Multiattack' }],
    traits: ['False Appearance — normal suit of armor', 'Antimagic Susceptibility', 'Immune to poison/psychic; blindsight 60 ft.'] },
  { name: 'Spy', cr: '1', ac: 12, hp: 27, hpDice: '6d8', speed: '30 ft.', abl: [10,15,10,12,14,16],
    atk: [{ n: 'Shortsword (×2)', hit: 4, dmg: '1d6+2', t: 'piercing', note: 'Multiattack' }, { n: 'Hand Crossbow', hit: 4, dmg: '1d6+2', t: 'piercing' }],
    traits: ['Cunning Action — Dash/Disengage/Hide as bonus action', 'Sneak Attack — +2d6 once/turn with advantage or ally adjacent'] },

  // ── CR 2 ──
  { name: 'Bandit Captain', cr: '2', ac: 15, acNote: 'studded leather', hp: 65, hpDice: '10d8+20', speed: '30 ft.', abl: [15,16,14,14,11,14],
    atk: [{ n: 'Scimitar (×2)', hit: 5, dmg: '1d6+3', t: 'slashing', note: 'Multiattack: 2 scimitar + 1 dagger' }, { n: 'Dagger', hit: 5, dmg: '1d4+3', t: 'piercing' }],
    traits: ['Parry (reaction) — +2 AC vs one melee attack'] },
  { name: 'Cult Fanatic', cr: '2', ac: 13, acNote: 'leather', hp: 33, hpDice: '6d8+6', speed: '30 ft.', abl: [11,14,12,10,13,14],
    atk: [{ n: 'Dagger (×2)', hit: 4, dmg: '1d4+2', t: 'piercing', note: 'Multiattack' },
          { n: 'Inflict Wounds (spell)', hit: 4, dmg: '3d10', t: 'necrotic' },
          { n: 'Spiritual Weapon (bonus)', hit: 4, dmg: '1d8+2', t: 'force' }],
    traits: ['Dark Devotion — advantage vs. charmed/frightened', 'Spells: command, hold person (DC 11), shield of faith'] },
  { name: 'Berserker', cr: '2', ac: 13, acNote: 'hide', hp: 67, hpDice: '9d8+27', speed: '30 ft.', abl: [16,12,17,9,11,9],
    atk: [{ n: 'Greataxe', hit: 5, dmg: '1d12+3', t: 'slashing' }],
    traits: ['Reckless — advantage on attacks; attacks against it have advantage until its next turn'] },
  { name: 'Ghast', cr: '2', ac: 13, hp: 36, hpDice: '8d8', speed: '30 ft.', abl: [16,17,10,11,10,8],
    atk: [{ n: 'Claws', hit: 5, dmg: '2d6+3', t: 'slashing', note: 'Non-undead: DC 10 CON or paralyzed 1 min' }, { n: 'Bite', hit: 3, dmg: '2d8+3', t: 'piercing' }],
    traits: ['Stench — 5 ft: DC 10 CON or poisoned until start of next turn', 'Turn Defiance — nearby ghouls get advantage vs turning'] },
  { name: 'Ogre', cr: '2', ac: 11, acNote: 'hide', hp: 59, hpDice: '7d10+21', speed: '40 ft.', abl: [19,8,16,5,7,7],
    atk: [{ n: 'Greatclub', hit: 6, dmg: '2d8+4', t: 'bludgeoning' }, { n: 'Javelin', hit: 6, dmg: '2d6+4', t: 'piercing' }],
    traits: [] },
  { name: "Will-o'-Wisp", cr: '2', ac: 19, hp: 22, hpDice: '9d4', speed: '0 ft., fly 50 ft. (hover)', abl: [1,28,10,13,14,11],
    atk: [{ n: 'Shock', hit: 4, dmg: '2d8', t: 'lightning' }],
    traits: ['Consume Life — bonus action vs a 0-HP creature: DC 10 CON or dies; wisp gains 3d6 HP', 'Invisibility (Ephemeral)', 'Incorporeal', 'Variable Illumination'] },
  { name: 'Ankheg', cr: '2', ac: 14, acNote: 'natural (11 while prone)', hp: 39, hpDice: '6d10+6', speed: '30 ft., burrow 10 ft.', abl: [17,11,13,1,13,6],
    atk: [{ n: 'Bite', hit: 5, dmg: '2d6+3', t: 'slashing', note: '+1d6 acid; Large or smaller grappled (escape DC 13)' },
          { n: 'Acid Spray (recharge 6)', hit: 0, dmg: '3d6', t: 'acid', note: '30-ft line, DC 13 DEX half' }],
    traits: ['Tremorsense 60 ft.'] },
  { name: 'Ettercap', cr: '2', ac: 13, acNote: 'natural', hp: 44, hpDice: '8d8+8', speed: '30 ft., climb 30 ft.', abl: [14,15,13,7,12,8],
    atk: [{ n: 'Bite', hit: 4, dmg: '1d8+2', t: 'piercing', note: 'DC 11 CON: 1d8 poison and poisoned 1 min' }, { n: 'Claws', hit: 4, dmg: '2d4+2', t: 'slashing' },
          { n: 'Web (recharge 5-6)', hit: 4, dmg: '0d1', t: '—', note: 'Restrained (escape DC 11)' }],
    traits: ['Spider Climb', 'Web Sense', 'Web Walker'] },
  { name: 'Awakened Tree', cr: '2', ac: 13, acNote: 'natural', hp: 59, hpDice: '7d12+14', speed: '20 ft.', abl: [19,6,15,10,10,7],
    atk: [{ n: 'Slam', hit: 6, dmg: '3d6+4', t: 'bludgeoning' }],
    traits: ['False Appearance — normal tree while motionless', 'Vulnerable to fire; resistant to bludgeoning/piercing'] },
  { name: 'Priest', cr: '2', ac: 13, acNote: 'chain shirt', hp: 27, hpDice: '5d8+5', speed: '25 ft.', abl: [10,10,12,13,16,13],
    atk: [{ n: 'Mace', hit: 2, dmg: '1d6', t: 'bludgeoning' },
          { n: 'Guiding Bolt (spell)', hit: 5, dmg: '4d6', t: 'radiant', note: 'Next attack vs target has advantage' },
          { n: 'Spirit Guardians (conc.)', hit: 0, dmg: '3d8', t: 'radiant', note: '15 ft radius, DC 13 WIS half' }],
    traits: ['Divine Eminence — bonus +1d6... (see SRD); spells: cure wounds, sanctuary, dispel magic'] },

  // ── CR 3 ──
  { name: 'Owlbear', cr: '3', ac: 13, acNote: 'natural', hp: 59, hpDice: '7d10+21', speed: '40 ft.', abl: [20,12,17,3,12,7],
    atk: [{ n: 'Beak', hit: 7, dmg: '1d10+5', t: 'piercing', note: 'Multiattack: beak + claws' }, { n: 'Claws', hit: 7, dmg: '2d8+5', t: 'slashing' }],
    traits: ['Keen Sight and Smell'] },
  { name: 'Green Hag', cr: '3', ac: 17, acNote: 'natural', hp: 82, hpDice: '11d8+33', speed: '30 ft.', abl: [18,12,16,13,14,14],
    atk: [{ n: 'Claws', hit: 6, dmg: '2d8+4', t: 'slashing' }],
    traits: ['Illusory Appearance — disguise as any Medium humanoid', 'Invisible Passage — invisible until she attacks', 'Mimicry — voices (Insight DC 14)', 'Amphibious'] },
  { name: 'Wight', cr: '3', ac: 14, acNote: 'studded leather', hp: 45, hpDice: '6d8+18', speed: '30 ft.', abl: [15,14,16,10,13,15],
    atk: [{ n: 'Longsword (×2)', hit: 4, dmg: '1d8+2', t: 'slashing', note: 'Multiattack: 2 longsword or 1 + life drain' },
          { n: 'Life Drain', hit: 4, dmg: '1d6+2', t: 'necrotic', note: 'DC 13 CON or HP max reduced; slain humanoids rise as zombies next midnight' }],
    traits: ['Sunlight Sensitivity', 'Resistant to necrotic + nonmagical/nonsilvered weapons'] },
  { name: 'Werewolf', cr: '3', ac: 11, acNote: '12 in wolf/hybrid form', hp: 58, hpDice: '9d8+18', speed: '30 ft. (40 as wolf)', abl: [15,13,14,10,11,10],
    atk: [{ n: 'Bite (wolf/hybrid)', hit: 4, dmg: '1d8+2', t: 'piercing', note: 'Humanoid: DC 12 CON or cursed with lycanthropy' },
          { n: 'Claws (hybrid)', hit: 4, dmg: '2d4+2', t: 'slashing' }, { n: 'Spear (human)', hit: 4, dmg: '1d6+2', t: 'piercing' }],
    traits: ['Shapechanger', 'Immune to nonmagical/nonsilvered bludgeoning, piercing, slashing'] },
  { name: 'Knight', cr: '3', ac: 18, acNote: 'plate', hp: 52, hpDice: '8d8+16', speed: '30 ft.', abl: [16,11,14,11,11,15],
    atk: [{ n: 'Greatsword (×2)', hit: 5, dmg: '2d6+3', t: 'slashing', note: 'Multiattack' }],
    traits: ['Brave — advantage vs frightened', 'Leadership — allies +1d4 to attacks/saves', 'Parry (reaction) — +2 AC'] },
  { name: 'Veteran', cr: '3', ac: 17, acNote: 'splint', hp: 58, hpDice: '9d8+18', speed: '30 ft.', abl: [16,13,14,10,11,10],
    atk: [{ n: 'Longsword (×2)', hit: 5, dmg: '1d8+3', t: 'slashing', note: 'Multiattack; +shortsword if both longswords hit... (see SRD)' },
          { n: 'Shortsword', hit: 5, dmg: '1d6+3', t: 'piercing' }, { n: 'Heavy Crossbow', hit: 3, dmg: '1d10+1', t: 'piercing' }],
    traits: [] },
  { name: 'Phase Spider', cr: '3', ac: 13, acNote: 'natural', hp: 32, hpDice: '5d10+5', speed: '30 ft., climb 30 ft.', abl: [15,15,12,6,10,6],
    atk: [{ n: 'Bite', hit: 4, dmg: '1d10+2', t: 'piercing', note: 'DC 11 CON: 4d8 poison, half on save; 0 HP → stable but poisoned/paralyzed 1 hr' }],
    traits: ['Ethereal Jaunt — bonus action shift to/from Ethereal Plane', 'Spider Climb', 'Web Walker'] },

  // ── CR 4 ──
  { name: 'Ghost', cr: '4', ac: 11, hp: 45, hpDice: '10d8', speed: '0 ft., fly 40 ft. (hover)', abl: [7,13,10,10,12,17],
    atk: [{ n: 'Withering Touch', hit: 5, dmg: '4d6+3', t: 'necrotic' }],
    traits: ['Horrifying Visage — 60 ft: DC 13 WIS or frightened 1 min (fail by 5+: age 1d4×10 years)',
             'Possession (recharge 6) — DC 13 CHA or possessed', 'Incorporeal Movement', 'Etherealness'] },
  { name: 'Banshee', cr: '4', ac: 12, hp: 58, hpDice: '13d8', speed: '0 ft., fly 40 ft. (hover)', abl: [1,14,10,12,11,17],
    atk: [{ n: 'Corrupting Touch', hit: 4, dmg: '3d6+2', t: 'necrotic' }],
    traits: ['Wail (1/day) — 30 ft: DC 13 CON or drop to 0 HP; success: 3d6 psychic', 'Horrifying Visage — DC 13 WIS or frightened 1 min', 'Incorporeal Movement', 'Detect Life 5 miles'] },
  { name: 'Ettin', cr: '4', ac: 12, acNote: 'natural', hp: 85, hpDice: '10d10+30', speed: '40 ft.', abl: [21,8,17,6,10,8],
    atk: [{ n: 'Battleaxe', hit: 7, dmg: '2d8+5', t: 'slashing', note: 'Multiattack: battleaxe + morningstar' }, { n: 'Morningstar', hit: 7, dmg: '2d8+5', t: 'piercing' }],
    traits: ['Two Heads — advantage on Perception and saves vs blinded/charmed/deafened/frightened/stunned/unconscious', 'Wakeful — one head always awake'] },

  // ── CR 5 ──
  { name: 'Troll', cr: '5', ac: 15, acNote: 'natural', hp: 84, hpDice: '8d10+40', speed: '30 ft.', abl: [18,13,20,7,9,7],
    atk: [{ n: 'Bite', hit: 7, dmg: '1d6+4', t: 'piercing', note: 'Multiattack: bite + 2 claws' }, { n: 'Claws (×2)', hit: 7, dmg: '2d6+4', t: 'slashing' }],
    traits: ['Regeneration — regains 10 HP at start of turn unless it took acid or fire damage; dies only if it starts turn at 0 HP without regen', 'Keen Smell'] },
  { name: 'Hill Giant', cr: '5', ac: 13, acNote: 'natural', hp: 105, hpDice: '10d12+40', speed: '40 ft.', abl: [21,8,19,5,9,6],
    atk: [{ n: 'Greatclub (×2)', hit: 8, dmg: '3d8+5', t: 'bludgeoning', note: 'Multiattack' }, { n: 'Rock', hit: 8, dmg: '3d10+5', t: 'bludgeoning', note: '60/240 ft.' }],
    traits: [] },
  { name: 'Wraith', cr: '5', ac: 13, hp: 67, hpDice: '9d8+27', speed: '0 ft., fly 60 ft. (hover)', abl: [6,16,16,12,14,15],
    atk: [{ n: 'Life Drain', hit: 6, dmg: '4d8+3', t: 'necrotic', note: 'DC 14 CON or HP max reduced by damage taken until long rest' }],
    traits: ['Create Specter — turns a slain humanoid into a specter under its command', 'Incorporeal Movement', 'Sunlight Sensitivity', 'Resistant to most physical; immune necrotic/poison'] },
];

// Creature types (applied at load so entries above stay compact)
const MONSTER_TYPES = {
  'Commoner': 'humanoid', 'Rat': 'beast', 'Raven': 'beast',
  'Bandit': 'humanoid', 'Cultist': 'humanoid', 'Guard': 'humanoid', 'Kobold': 'humanoid',
  'Giant Rat': 'beast', 'Mastiff': 'beast', 'Twig Blight': 'plant',
  'Goblin': 'humanoid', 'Skeleton': 'undead', 'Zombie': 'undead', 'Wolf': 'beast',
  'Needle Blight': 'plant', 'Sprite': 'fey', 'Giant Wolf Spider': 'beast', 'Boar': 'beast',
  'Swarm of Ravens': 'beast',
  'Hobgoblin': 'humanoid', 'Orc': 'humanoid', 'Scout': 'humanoid', 'Thug': 'humanoid',
  'Black Bear': 'beast', 'Worg': 'monstrosity', 'Shadow': 'undead', 'Vine Blight': 'plant',
  'Bugbear': 'humanoid', 'Dire Wolf': 'beast', 'Ghoul': 'undead', 'Giant Spider': 'beast',
  'Specter': 'undead', 'Brown Bear': 'beast', 'Dryad': 'fey', 'Imp': 'fiend',
  'Animated Armor': 'construct', 'Spy': 'humanoid',
  'Bandit Captain': 'humanoid', 'Cult Fanatic': 'humanoid', 'Berserker': 'humanoid',
  'Ghast': 'undead', 'Ogre': 'giant', "Will-o'-Wisp": 'undead', 'Ankheg': 'monstrosity',
  'Ettercap': 'monstrosity', 'Awakened Tree': 'plant', 'Priest': 'humanoid',
  'Owlbear': 'monstrosity', 'Green Hag': 'fey', 'Wight': 'undead', 'Werewolf': 'humanoid',
  'Knight': 'humanoid', 'Veteran': 'humanoid', 'Phase Spider': 'monstrosity',
  'Ghost': 'undead', 'Banshee': 'undead', 'Ettin': 'giant',
  'Troll': 'giant', 'Hill Giant': 'giant', 'Wraith': 'undead',
};
MONSTERS.forEach(m => { m.type = MONSTER_TYPES[m.name] || 'monstrosity'; });
MONSTERS.sort((a, b) => crValue(a.cr) - crValue(b.cr) || a.name.localeCompare(b.name));

const CREATURE_TYPES = ['aberration','beast','celestial','construct','dragon','elemental','fey','fiend','giant','humanoid','monstrosity','ooze','plant','undead'];

// SRD entries + the user's custom monsters (stored in save data)
function allMonsters() {
  return MONSTERS.concat(DB.getCustomMonsters())
    .sort((a, b) => crValue(a.cr) - crValue(b.cr) || a.name.localeCompare(b.name));
}

function findMonsterByName(name) {
  const q = String(name || '').trim().toLowerCase();
  return allMonsters().find(m => m.name.toLowerCase() === q);
}

// ── DICE ─────────────────────────────────────────────────────

function rollDiceExpr(expr) {
  // supports "XdY", "XdY+Z", "XdY-Z"
  const m = String(expr).match(/^(\d+)d(\d+)([+-]\d+)?$/);
  if (!m) return { total: 0, detail: '?' };
  const n = +m[1], sides = +m[2], mod = m[3] ? +m[3] : 0;
  const rolls = Array.from({ length: n }, () => Math.floor(Math.random() * sides) + 1);
  const total = Math.max(0, rolls.reduce((a, b) => a + b, 0) + mod);
  return { total, detail: `[${rolls.join(', ')}]${mod ? (mod > 0 ? ' + ' + mod : ' − ' + Math.abs(mod)) : ''}` };
}

// ── STAT BLOCK PANEL (right context panel) ───────────────────

function renderPanelMonster(name) {
  const mon = findMonsterByName(name);
  if (!mon) return;
  App.panelView = 'monster';
  App.panelId = name;

  const mods = mon.abl.map(abilityMod);
  const fmtMod = v => (v >= 0 ? '+' : '') + v;

  document.getElementById('panel-header').innerHTML = `
    <div class="panel-type">${mon.custom ? 'Custom ' : ''}Monster — ${escHtml(mon.type || '')} — CR ${escHtml(mon.cr)} (${XP_BY_CR[mon.cr] || '?'} XP)</div>
    <div class="panel-name">👹 ${escHtml(mon.name)}</div>
    <div class="panel-sub">AC ${mon.ac}${mon.acNote ? ' (' + escHtml(mon.acNote) + ')' : ''} · HP ${mon.hp} (${escHtml(mon.hpDice)}) · ${escHtml(mon.speed)}</div>
  `;

  const body = document.getElementById('panel-body');
  body.innerHTML = `
    <div class="mon-abilities">
      ${['STR','DEX','CON','INT','WIS','CHA'].map((k, i) =>
        `<div class="mon-abl"><div class="mon-abl-k">${k}</div><div class="mon-abl-v">${mon.abl[i]} (${fmtMod(mods[i])})</div></div>`).join('')}
    </div>
    <div class="section">
      <div class="section-label">Attacks</div>
      <div id="mon-attacks">
        ${mon.atk.map((a, i) => `
          <div class="mon-attack">
            <div class="mon-attack-info">
              <span class="mon-attack-name">${escHtml(a.n)}</span>
              <span class="mon-attack-stats">${a.hit ? (a.hit >= 0 ? '+' : '') + a.hit + ' to hit · ' : ''}${escHtml(a.dmg)} ${escHtml(a.t)}</span>
              ${a.note ? `<div class="mon-attack-note">${escHtml(a.note)}</div>` : ''}
            </div>
            <div class="mon-attack-btns">
              ${a.hit ? `<button class="mon-roll-btn" data-kind="atk" data-i="${i}">🎯</button>` : ''}
              <button class="mon-roll-btn" data-kind="dmg" data-i="${i}">💥</button>
            </div>
          </div>`).join('')}
      </div>
    </div>
    ${mon.traits.length ? `
    <div class="section">
      <div class="section-label">Traits</div>
      ${mon.traits.map(t => `<div class="mon-trait">${escHtml(t)}</div>`).join('')}
    </div>` : ''}
    <div class="section">
      <div class="section-label">Rolls</div>
      <div id="mon-roll-log" class="mon-roll-log"><span style="color:var(--text-muted)">Click 🎯 to attack, 💥 for damage.</span></div>
    </div>
  `;

  body.querySelectorAll('.mon-roll-btn').forEach(btn => btn.addEventListener('click', () => {
    const a = mon.atk[+btn.dataset.i];
    const log = document.getElementById('mon-roll-log');
    let line;
    if (btn.dataset.kind === 'atk') {
      const die = Math.floor(Math.random() * 20) + 1;
      const total = die + a.hit;
      const crit = die === 20 ? ' — CRIT!' : die === 1 ? ' — natural 1' : '';
      line = `<b>${escHtml(a.n)}</b>: <b>${total}</b> to hit (d20 ${die} ${a.hit >= 0 ? '+' : ''}${a.hit})${crit}`;
    } else {
      const r = rollDiceExpr(a.dmg);
      line = `<b>${escHtml(a.n)}</b> damage: <b>${r.total}</b> ${escHtml(a.t)} ${r.detail}`;
    }
    const div = document.createElement('div');
    div.className = 'mon-roll-line';
    div.innerHTML = line;
    if (log.firstChild?.tagName !== 'DIV') log.innerHTML = '';
    log.prepend(div);
    while (log.children.length > 8) log.lastChild.remove();
  }));
}

// ── BESTIARY BROWSER ─────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('bestiary-btn').addEventListener('click', openBestiary);
});

function openBestiary() {
  const all = allMonsters();
  const crs = [...new Set(all.map(m => m.cr))].sort((a, b) => crValue(a) - crValue(b));
  const types = [...new Set(all.map(m => m.type))].sort();

  openModal('Bestiary', `
    <div class="bestiary-filters">
      <input class="field-edit" id="bestiary-search" placeholder="Search…">
      <select class="field-edit" id="bestiary-cr">
        <option value="">CR: any</option>
        ${crs.map(cr => `<option value="${escAttr(cr)}">CR ${escHtml(cr)}</option>`).join('')}
      </select>
      <select class="field-edit" id="bestiary-type">
        <option value="">Type: any</option>
        ${types.map(t => `<option value="${escAttr(t)}">${escHtml(t)}</option>`).join('')}
      </select>
      <button class="btn" id="bestiary-add" title="Create a custom monster">+ New</button>
    </div>
    <div id="bestiary-list" class="bestiary-list"></div>
  `, [{ label: 'Close', primary: true, onClick: closeModal }]);

  const listEl = document.getElementById('bestiary-list');
  const render = () => {
    const query = document.getElementById('bestiary-search').value.toLowerCase();
    const crF = document.getElementById('bestiary-cr').value;
    const typeF = document.getElementById('bestiary-type').value;
    listEl.innerHTML = allMonsters()
      .filter(m => (!query || m.name.toLowerCase().includes(query)) &&
                   (!crF || String(m.cr) === crF) &&
                   (!typeF || m.type === typeF))
      .map(m => `
        <div class="bestiary-item" data-name="${escAttr(m.name)}">
          <span class="bestiary-cr">CR ${m.cr}</span>
          <span class="item-name">${escHtml(m.name)}${m.custom ? ' <span class="bestiary-custom">custom</span>' : ''}</span>
          <span class="item-sub">${escHtml(m.type)} · AC ${m.ac} · ${m.hp} HP</span>
          ${m.custom ? `<button class="bestiary-edit" data-name="${escAttr(m.name)}" title="Edit">✎</button>
                        <button class="item-delete" style="display:flex" data-name="${escAttr(m.name)}" title="Delete">×</button>` : ''}
        </div>`).join('') || '<div class="party-empty">No matches.</div>';

    listEl.querySelectorAll('.bestiary-item').forEach(el => el.addEventListener('click', e => {
      if (e.target.classList.contains('bestiary-edit') || e.target.classList.contains('item-delete')) return;
      closeModal();
      renderPanelMonster(el.dataset.name);
    }));
    listEl.querySelectorAll('.bestiary-edit').forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      openMonsterEditor(b.dataset.name);
    }));
    listEl.querySelectorAll('.item-delete').forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      if (confirm(`Delete custom monster "${b.dataset.name}"?`)) {
        DB.deleteCustomMonster(b.dataset.name);
        render();
      }
    }));
  };
  render();
  ['bestiary-search', 'bestiary-cr', 'bestiary-type'].forEach(id =>
    document.getElementById(id).addEventListener('input', render));
  document.getElementById('bestiary-add').addEventListener('click', () => openMonsterEditor());
  setTimeout(() => document.getElementById('bestiary-search').focus(), 50);
}

// ── CUSTOM MONSTER EDITOR ────────────────────────────────────

function openMonsterEditor(existingName, presetName) {
  const existing = existingName ? findMonsterByName(existingName) : null;
  const m = existing || { name: presetName || '', type: 'humanoid', cr: '1', ac: 12, acNote: '', hp: 10, hpDice: '', speed: '30 ft.', abl: [10,10,10,10,10,10], atk: [], traits: [] };
  const crOptions = ['0','1/8','1/4','1/2','1','2','3','4','5','6','7','8','9','10'];

  const ablInputs = ['STR','DEX','CON','INT','WIS','CHA'].map((k, i) => `
    <div class="form-group" style="margin-bottom:0">
      <label class="form-label">${k}</label>
      <input class="field-edit me-abl" type="number" value="${m.abl[i]}">
    </div>`).join('');

  openModal(existing ? `Edit — ${m.name}` : 'New Custom Monster', `
    <div class="form-row">
      <div class="form-group"><label class="form-label">Name</label>
        <input class="field-edit" id="me-name" value="${escAttr(m.name)}" ${existing ? 'readonly title="Names are fixed — delete and recreate to rename"' : ''}></div>
      <div class="form-group"><label class="form-label">Type</label>
        <select class="field-edit" id="me-type">${CREATURE_TYPES.map(t => `<option value="${t}"${t === m.type ? ' selected' : ''}>${t}</option>`).join('')}</select></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">CR</label>
        <select class="field-edit" id="me-cr">${crOptions.map(c => `<option value="${c}"${c === String(m.cr) ? ' selected' : ''}>${c}</option>`).join('')}</select></div>
      <div class="form-group"><label class="form-label">Speed</label>
        <input class="field-edit" id="me-speed" value="${escAttr(m.speed)}"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">AC (+ note)</label>
        <div style="display:flex;gap:6px">
          <input class="field-edit" id="me-ac" type="number" value="${m.ac}" style="width:70px">
          <input class="field-edit" id="me-acnote" value="${escAttr(m.acNote || '')}" placeholder="natural armor">
        </div></div>
      <div class="form-group"><label class="form-label">HP (+ dice)</label>
        <div style="display:flex;gap:6px">
          <input class="field-edit" id="me-hp" type="number" value="${m.hp}" style="width:70px">
          <input class="field-edit" id="me-hpdice" value="${escAttr(m.hpDice || '')}" placeholder="4d8+8">
        </div></div>
    </div>
    <div class="section-label" style="margin-top:8px">Ability Scores</div>
    <div class="me-abl-grid">${ablInputs}</div>
    <div class="section-label" style="margin-top:14px">Attacks</div>
    <div class="cs-row cs-header-row" style="grid-template-columns:1fr 52px 76px 90px 1fr 24px">
      <span class="cs-h">Name</span><span class="cs-h">To hit</span><span class="cs-h">Damage</span><span class="cs-h">Type</span><span class="cs-h">Note</span><span></span>
    </div>
    <div id="me-attacks"></div>
    <button class="add-item-btn" id="me-add-atk" style="display:block">+ Add attack</button>
    <div class="form-group" style="margin-top:14px">
      <label class="form-label">Traits (one per line, "Name — effect")</label>
      <textarea class="field-edit" id="me-traits" rows="4">${escHtml((m.traits || []).join('\n'))}</textarea>
    </div>
  `, [
    { label: 'Cancel', onClick: () => { closeModal(); openBestiary(); } },
    { label: existing ? 'Save Changes' : 'Create Monster', primary: true, onClick: () => {
        const name = document.getElementById('me-name').value.trim();
        if (!name) { alert('Name required.'); return; }
        if (!existing && findMonsterByName(name)) { alert(`"${name}" already exists — pick another name.`); return; }
        const abl = [...document.querySelectorAll('.me-abl')].map(i2 => parseInt(i2.value) || 10);
        const atk = [...document.querySelectorAll('.me-atk-row')].map(row => ({
          n: row.querySelector('.me-atk-n').value.trim(),
          hit: parseInt(row.querySelector('.me-atk-hit').value) || 0,
          dmg: row.querySelector('.me-atk-dmg').value.trim() || '1d4',
          t: row.querySelector('.me-atk-t').value.trim() || 'bludgeoning',
          note: row.querySelector('.me-atk-note').value.trim(),
        })).filter(a => a.n);
        DB.saveCustomMonster({
          name,
          type: document.getElementById('me-type').value,
          cr: document.getElementById('me-cr').value,
          ac: parseInt(document.getElementById('me-ac').value) || 10,
          acNote: document.getElementById('me-acnote').value.trim(),
          hp: parseInt(document.getElementById('me-hp').value) || 1,
          hpDice: document.getElementById('me-hpdice').value.trim() || '?',
          speed: document.getElementById('me-speed').value.trim() || '30 ft.',
          abl, atk,
          traits: document.getElementById('me-traits').value.split('\n').map(s => s.trim()).filter(Boolean),
        });
        closeModal();
        openBestiary();
      }},
  ]);

  const addAtkRow = (a) => {
    const div = document.createElement('div');
    div.className = 'cs-row me-atk-row';
    div.style.gridTemplateColumns = '1fr 52px 76px 90px 1fr 24px';
    div.innerHTML = `
      <input class="field-edit me-atk-n" placeholder="Bite" value="${escAttr(a?.n || '')}">
      <input class="field-edit me-atk-hit" type="number" value="${a?.hit ?? 4}">
      <input class="field-edit me-atk-dmg" placeholder="2d6+3" value="${escAttr(a?.dmg || '')}">
      <input class="field-edit me-atk-t" placeholder="slashing" value="${escAttr(a?.t || '')}">
      <input class="field-edit me-atk-note" placeholder="rider note" value="${escAttr(a?.note || '')}">
      <button class="item-delete" style="display:flex" title="Remove">×</button>
    `;
    div.querySelector('.item-delete').addEventListener('click', () => div.remove());
    document.getElementById('me-attacks').appendChild(div);
  };
  (m.atk || []).forEach(addAtkRow);
  if (!m.atk?.length) addAtkRow();
  document.getElementById('me-add-atk').addEventListener('click', () => addAtkRow());
}
