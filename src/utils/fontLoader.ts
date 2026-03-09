/**
 * Lazy font loader — loads Google Fonts on demand instead of eagerly in index.html.
 * 
 * System fonts (Arial, Impact, Georgia, Courier New) are never loaded.
 * Inter is loaded eagerly in index.html since it's the UI font.
 * All other Google Fonts are loaded on demand.
 */

// Map from font label → Google Fonts family parameter string
// Only includes fonts that need to be fetched from Google Fonts
const GOOGLE_FONT_SPECS: Record<string, string> = {
  'Roboto': 'Roboto:ital,wght@0,400;0,700;1,400;1,700',
  'Open Sans': 'Open+Sans:ital,wght@0,400;0,700;1,400;1,700',
  'Lato': 'Lato:ital,wght@0,400;0,700;1,400;1,700',
  'Montserrat': 'Montserrat:ital,wght@0,400;0,700;1,400;1,700',
  'Poppins': 'Poppins:ital,wght@0,400;0,700;1,400;1,700',
  'Nunito': 'Nunito:ital,wght@0,400;0,700;1,400;1,700',
  'Raleway': 'Raleway:ital,wght@0,400;0,700;1,400;1,700',
  'Oswald': 'Oswald:wght@400;700',
  'DM Sans': 'DM+Sans:ital,wght@0,400;0,700;1,400;1,700',
  'Quicksand': 'Quicksand:wght@400;700',
  'Rubik': 'Rubik:ital,wght@0,400;0,700;1,400;1,700',
  'Work Sans': 'Work+Sans:ital,wght@0,400;0,700;1,400;1,700',
  'Outfit': 'Outfit:wght@400;700',
  'Playfair Display': 'Playfair+Display:ital,wght@0,400;0,700;1,400;1,700',
  'Merriweather': 'Merriweather:ital,wght@0,400;0,700;1,400;1,700',
  'Lora': 'Lora:ital,wght@0,400;0,700;1,400;1,700',
  'EB Garamond': 'EB+Garamond:ital,wght@0,400;0,700;1,400;1,700',
  'Cormorant Garamond': 'Cormorant+Garamond:ital,wght@0,400;0,700;1,400;1,700',
  'Libre Baskerville': 'Libre+Baskerville:ital,wght@0,400;0,700;1,400',
  'Bebas Neue': 'Bebas+Neue',
  'Abril Fatface': 'Abril+Fatface',
  'Alfa Slab One': 'Alfa+Slab+One',
  'Permanent Marker': 'Permanent+Marker',
  'Righteous': 'Righteous',
  'Comfortaa': 'Comfortaa:wght@400;700',
  'Fredoka': 'Fredoka:wght@400;700',
  'Pacifico': 'Pacifico',
  'Lobster': 'Lobster',
  'Dancing Script': 'Dancing+Script:wght@400;700',
  'Satisfy': 'Satisfy',
  'Great Vibes': 'Great+Vibes',
  'Sacramento': 'Sacramento',
  'Caveat': 'Caveat:wght@400;700',
  'Kalam': 'Kalam:wght@400;700',
  'Indie Flower': 'Indie+Flower',
  'Fira Code': 'Fira+Code:wght@400;700',
  'Source Code Pro': 'Source+Code+Pro:ital,wght@0,400;0,700;1,400;1,700',
  'Space Mono': 'Space+Mono:ital,wght@0,400;0,700;1,400;1,700',
  'JetBrains Mono': 'JetBrains+Mono:ital,wght@0,400;0,700;1,400;1,700',
};

// Track what's been loaded
let allFontsLoaded = false;
const loadedFonts = new Set<string>();

/**
 * Load ALL Google Fonts at once (used when font picker opens).
 * Uses a single <link> tag for efficiency.
 */
export function loadAllFonts(): void {
  if (allFontsLoaded) return;
  allFontsLoaded = true;

  const families = Object.values(GOOGLE_FONT_SPECS).join('&family=');
  const url = `https://fonts.googleapis.com/css2?family=${families}&display=swap`;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url;
  link.dataset.fontLoader = 'all';
  document.head.appendChild(link);

  // Mark all as loaded
  for (const name of Object.keys(GOOGLE_FONT_SPECS)) {
    loadedFonts.add(name);
  }
}

/**
 * Extract the primary font family name from a CSS font-family string.
 * e.g., '"Open Sans", sans-serif' → 'Open Sans'
 */
function extractFamilyName(cssValue: string): string {
  const first = cssValue.split(',')[0].trim();
  return first.replace(/^["']|["']$/g, '');
}

/**
 * Load specific fonts by their CSS font-family values.
 * Used when loading a project that uses non-Inter fonts.
 */
export function loadFontsForFamilies(cssFamilies: string[]): void {
  if (allFontsLoaded) return;

  const needed: string[] = [];
  for (const css of cssFamilies) {
    const name = extractFamilyName(css);
    if (name === 'Inter' || loadedFonts.has(name) || !GOOGLE_FONT_SPECS[name]) continue;
    needed.push(name);
    loadedFonts.add(name);
  }

  if (needed.length === 0) return;

  const families = needed.map((n) => GOOGLE_FONT_SPECS[n]).join('&family=');
  const url = `https://fonts.googleapis.com/css2?family=${families}&display=swap`;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url;
  link.dataset.fontLoader = 'partial';
  document.head.appendChild(link);
}
