export type CategorieModeles = Record<string, string[]>

export const MARQUES_MODELES: Record<string, CategorieModeles> = {
  'Louis Vuitton': {
    'Sacs': [
      'Neverfull MM', 'Neverfull GM', 'Neverfull PM',
      'Speedy 25', 'Speedy 30', 'Speedy 35', 'Speedy Bandoulière 25', 'Speedy Bandoulière 30',
      'Alma BB', 'Alma PM', 'Alma MM',
      'Pochette Métis', 'Pochette Accessoires',
      'Capucines BB', 'Capucines MM', 'Capucines PM',
      'Twist MM', 'Twist PM',
      'Favorite MM', 'Favorite PM',
      'Montaigne BB', 'Montaigne MM',
      'On the Go GM', 'On the Go MM', 'On the Go PM',
      'Keepall 45', 'Keepall 50', 'Keepall 55',
      'Vavin PM', 'Vavin MM',
      'Blossom PM',
      'Félicie Pochette',
      'Multi Pochette Accessoires',
    ],
    'Objets': [
      'Cadenas LV',
      'Portefeuille Zippy',
      'Portefeuille Sarah',
      'Portefeuille Victorine',
      'Porte-cartes',
      'Ceinture',
      'Foulard',
      'Écharpe',
      'Chapeau',
      'Porte-clés',
    ],
  },
  'Chanel': {
    'Sacs': [
      'Classic Flap Small', 'Classic Flap Medium', 'Classic Flap Jumbo', 'Classic Flap Maxi',
      'Boy Bag Small', 'Boy Bag Medium', 'Boy Bag Large',
      '2.55 Small', '2.55 Medium', '2.55 Large',
      'Mini Flap',
      'WOC (Wallet on Chain)',
      'Gabrielle Small', 'Gabrielle Large',
      'Deauville',
      'GST (Grand Shopping Tote)',
      'PST (Petit Shopping Tote)',
      'Coco Handle Small', 'Coco Handle Medium',
      'Vanity Case',
      '19 Bag Small', '19 Bag Medium', '19 Bag Large',
      'Trendy CC Small', 'Trendy CC Medium',
      'Hobo Handbag',
    ],
    'Objets': [
      'Portefeuille',
      'Porte-cartes',
      'Ceinture',
      'Foulard',
      'Bijoux',
    ],
  },
  'Hermès': {
    'Sacs': [
      'Birkin 25', 'Birkin 30', 'Birkin 35', 'Birkin 40',
      'Kelly 25', 'Kelly 28', 'Kelly 32', 'Kelly 35',
      'Constance 18', 'Constance 24',
      'Evelyne TPM', 'Evelyne PM', 'Evelyne GM',
      'Picotin 18', 'Picotin 22',
      'Garden Party 30', 'Garden Party 36',
      'Lindy 26', 'Lindy 30',
      'Bolide 27', 'Bolide 31',
      'Jige Elan 29',
      'Roulis 18', 'Roulis 23',
      'Halzan 25', 'Halzan 31',
    ],
    'Objets': [
      'Carré soie',
      'Ceinture',
      'Portefeuille',
      'Agenda',
      'Bracelet',
      'Collier',
    ],
    'Chaussures': [
      'Oran Sandales',
    ],
  },
  'Dior': {
    'Sacs': [
      'Lady Dior Mini', 'Lady Dior Small', 'Lady Dior Medium', 'Lady Dior Large',
      'Saddle Bag Mini', 'Saddle Bag Medium',
      'Book Tote Small', 'Book Tote Medium', 'Book Tote Large',
      'Dior Caro Small', 'Dior Caro Medium',
      '30 Montaigne Box',
      'Diorama Small', 'Diorama Medium',
      'Miss Dior Mini',
      'Dio(r)evolution',
      'Bobby East-West',
      'Toujours Tote',
      'Dior Double',
    ],
    'Objets': [
      'Portefeuille',
      'Porte-cartes',
      'Ceinture',
      'Foulard',
    ],
  },
  'Gucci': {
    'Sacs': [
      'Dionysus Mini', 'Dionysus Small', 'Dionysus Medium',
      'GG Marmont Mini', 'GG Marmont Small', 'GG Marmont Medium',
      'Ophidia Mini', 'Ophidia Small', 'Ophidia Medium',
      'Soho Disco',
      'Bamboo 1947 Mini', 'Bamboo 1947 Small',
      'Jackie 1961 Mini', 'Jackie 1961 Small', 'Jackie 1961 Medium',
      'Horsebit 1955 Mini', 'Horsebit 1955 Small',
      'Blondie',
      'Sylvie Mini', 'Sylvie Small',
      'Padlock Small', 'Padlock Medium',
    ],
    'Objets': [
      'Portefeuille',
      'Ceinture',
      'Foulard',
    ],
  },
  'Prada': {
    'Sacs': [
      'Re-Edition 2000', 'Re-Edition 2005',
      'Galleria Small', 'Galleria Medium', 'Galleria Large',
      'Saffiano Lux Tote',
      'Cleo Small', 'Cleo Medium',
      'Nylon Backpack',
      'Tessuto Gaufré',
      'Cahier',
      'Double Bag Small', 'Double Bag Medium',
      'Spectrum Bag',
      'Chain Hobo',
    ],
    'Objets': [
      'Portefeuille',
      'Porte-cartes',
      'Ceinture',
    ],
  },
  'Bottega Veneta': {
    'Sacs': [
      'Pouch Mini', 'Pouch Medium',
      'Jodie Mini', 'Jodie Small', 'Jodie Large',
      'Cassette Small', 'Cassette Medium',
      'Arco 33', 'Arco 48',
      'BV Angle Small',
      'Loop Small',
      'Padded Cassette',
      'Intrecciato Tote Small', 'Intrecciato Tote Large',
    ],
    'Objets': [
      'Portefeuille',
      'Ceinture',
    ],
  },
  'Saint Laurent': {
    'Sacs': [
      'Sac de Jour Mini', 'Sac de Jour Small', 'Sac de Jour Medium',
      'Le 5 à 7 Hobo', 'Le 5 à 7 Mini',
      'Loulou Small', 'Loulou Medium',
      'Niki Baby', 'Niki Medium', 'Niki Large',
      'Sunset Small', 'Sunset Medium',
      'Kate 99', 'Kate Tassel',
      'Jamie',
      'Cabas Rive Gauche',
      'Toy Loulou',
      'Chain Wallet',
    ],
    'Objets': [
      'Portefeuille',
      'Ceinture',
    ],
  },
  'Balenciaga': {
    'Sacs': [
      'City Mini', 'City Small', 'City Medium',
      'Hourglass Mini', 'Hourglass Small', 'Hourglass Medium',
      'Le Cagole Mini', 'Le Cagole Small', 'Le Cagole Medium',
      'Neo Classic Mini', 'Neo Classic Small', 'Neo Classic City',
      'Papier A6', 'Papier A4',
      'Triangle Duffle',
      'Motorcycle Bag',
    ],
    'Objets': [
      'Portefeuille',
      'Ceinture',
    ],
  },
  'Celine': {
    'Sacs': [
      'Luggage Mini', 'Luggage Micro', 'Luggage Nano',
      'Classic Box Small', 'Classic Box Medium',
      'Triomphe Chain Small', 'Triomphe Chain Medium',
      'Cabas Phantom Small', 'Cabas Phantom Large',
      'Ava Mini', 'Ava Medium',
      'Tilly Small',
      '16 Mini', '16 Small', '16 Medium',
      'Bucket Cuir Triomphe',
      'Big Bag Mini', 'Big Bag Medium',
    ],
    'Objets': [
      'Portefeuille',
      'Ceinture',
    ],
  },
  'Fendi': {
    'Sacs': [
      'Baguette Mini', 'Baguette Small', 'Baguette Medium',
      'Peekaboo Mini', 'Peekaboo XS', 'Peekaboo Small',
      'FF Tote Small', 'FF Tote Medium',
      'Kan I Mini', 'Kan I Small',
      'Nano Fendigraphy',
      'First Small', 'First Medium',
      'Sunshine Small', 'Sunshine Medium',
      'Mon Trésor',
    ],
    'Objets': [
      'Portefeuille',
      'Porte-cartes',
    ],
  },
  'Loewe': {
    'Sacs': [
      'Puzzle Mini', 'Puzzle Small', 'Puzzle Medium', 'Puzzle Large',
      'Hammock Small', 'Hammock Medium',
      'Gate Small', 'Gate Medium',
      'Flamenco Clutch',
      'Basket Bag Small', 'Basket Bag Large',
      'Elephant Pocket',
      'Amazona 19', 'Amazona 28',
      'Cubi',
    ],
    'Objets': [
      'Portefeuille',
    ],
  },
  'Givenchy': {
    'Sacs': [
      'Antigona Mini', 'Antigona Small', 'Antigona Medium',
      'Pandora Small', 'Pandora Medium',
      '4G Small', '4G Medium',
      'Bond Hobo Small',
      'ID93 Small',
      'Voyageur Small',
    ],
    'Objets': [
      'Portefeuille',
    ],
  },
  'Valentino': {
    'Sacs': [
      'Rockstud Spike Small', 'Rockstud Spike Medium',
      'VLogo Chain Small', 'VLogo Chain Medium',
      'Roman Stud Small', 'Roman Stud Medium',
      'Candystud',
      'VSLING Small', 'VSLING Medium',
      'Garavani Atelier 03',
    ],
    'Objets': [
      'Portefeuille',
      'Ceinture',
    ],
  },
  'Burberry': {
    'Sacs': [
      'TB Bag Small', 'TB Bag Medium',
      'Lola Small', 'Lola Medium',
      'Title Bag Small',
      'Olympia Mini', 'Olympia Small',
    ],
    'Objets': [
      'Foulard',
      'Ceinture',
      'Portefeuille',
    ],
  },
  'Alexander McQueen': {
    'Sacs': [
      'The Bundle Small', 'The Bundle Medium',
      'Jewelled Hobo Small',
      'Legend Satchel',
      'Jewelled Satchel Small',
    ],
    'Objets': [
      'Ceinture',
    ],
  },
  'Mulberry': {
    'Sacs': [
      'Bayswater Small', 'Bayswater Classic',
      'Alexa Small', 'Alexa Medium',
      'Lily Small',
      'Amberley',
    ],
    'Objets': [
      'Portefeuille',
    ],
  },
  'Longchamp': {
    'Sacs': [
      'Le Pliage XS', 'Le Pliage S', 'Le Pliage M', 'Le Pliage L', 'Le Pliage XL',
      'Le Pliage Cuir XS', 'Le Pliage Cuir S', 'Le Pliage Cuir M',
      'Roseau Small', 'Roseau Medium',
    ],
    'Objets': [
      'Portefeuille',
    ],
  },
}

export const MARQUES = Object.keys(MARQUES_MODELES).sort()

/** Retourne la liste plate de tous les modèles d'une marque (toutes catégories confondues) */
export function getModeles(marque: string): string[] {
  const categories = MARQUES_MODELES[marque]
  if (!categories) return []
  return Object.values(categories).flat()
}

/** Retourne les modèles groupés par catégorie pour affichage dans le Combobox */
export function getModelesGroupes(marque: string): { label: string; items: string[] }[] {
  const categories = MARQUES_MODELES[marque]
  if (!categories) return []
  return Object.entries(categories).map(([label, items]) => ({ label, items }))
}
