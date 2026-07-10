// Taxonomie éditoriale du média. Les 899 articles source sont tous en « Divers » :
// on reconstruit une vraie navigation thématique, chaque rubrique avec sa couleur signature.
export interface Category {
  slug: string;
  name: string;
  short: string;
  tagline: string;
  color: string;   // couleur signature (accent)
  ink: string;     // couleur de texte lisible sur l'accent
  emoji: string;
}

export const CATEGORIES: Category[] = [
  { slug: 'maison',    name: 'Maison & Déco',        short: 'Maison',    tagline: 'Aménager, équiper, sublimer chez soi',        color: '#FF6A1A', ink: '#1A0A00', emoji: '🏠' },
  { slug: 'cuisine',   name: 'Cuisine & Gourmandises',short: 'Cuisine',  tagline: 'Bien manger, cuisiner, conserver',            color: '#FF1F6D', ink: '#2A0011', emoji: '🍳' },
  { slug: 'auto-moto', name: 'Auto & Moto',          short: 'Auto·Moto', tagline: 'Rouler, entretenir, s’équiper',          color: '#7B2BFF', ink: '#12002E', emoji: '🏍️' },
  { slug: 'tech',      name: 'Tech & Numérique',      short: 'Tech',     tagline: 'Gadgets, logiciels et vie connectée',         color: '#23E5FF', ink: '#00232A', emoji: '💻' },
  { slug: 'voyage',    name: 'Voyage & Évasion',      short: 'Voyage',   tagline: 'Partir, explorer, s’évader',             color: '#12C46B', ink: '#00230F', emoji: '✈️' },
  { slug: 'argent',    name: 'Argent & Assurance',    short: 'Argent',   tagline: 'Assurer, économiser, décider',                color: '#F5B301', ink: '#231800', emoji: '💶' },
  { slug: 'mode',      name: 'Mode & Style',          short: 'Mode',     tagline: 'Style, accessoires et bonnes coupes',         color: '#E4007C', ink: '#2A0018', emoji: '👗' },
  { slug: 'loisirs',   name: 'Loisirs & Sorties',     short: 'Loisirs',  tagline: 'Jeux, sport, culture et sorties',             color: '#FF3B3B', ink: '#2A0000', emoji: '🎯' },
  { slug: 'bien-etre', name: 'Bien-être & Santé',     short: 'Bien-être',tagline: 'Prendre soin de soi et des siens',            color: '#00C2A8', ink: '#002420', emoji: '🌿' },
  { slug: 'famille',   name: 'Famille & Enfants',     short: 'Famille',  tagline: 'Petits et grands, au quotidien',              color: '#CBFF2E', ink: '#1A2200', emoji: '👨‍👩‍👧' },
];

export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug);
const MAP = new Map(CATEGORIES.map((c) => [c.slug, c]));

export function getCategory(slug: string | undefined): Category {
  return (slug && MAP.get(slug)) || CATEGORIES[0];
}
