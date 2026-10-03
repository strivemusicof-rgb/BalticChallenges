/**
 * First-line text filter for user content. It is deliberately conservative: it blocks a short list of
 * slurs and explicit terms (EN/LV/LT/EE) and link spam. Anything subtler goes through user reports.
 */
const BLOCKED_TERMS = [
  // English
  'nigger', 'nigga', 'faggot', 'retard', 'kike', 'spic', 'chink', 'tranny',
  'cunt', 'motherfucker', 'whore', 'slut', 'porn',
  // Latvian
  'pidars', 'pizda', 'mauka', 'pimpis',
  // Lithuanian
  'pyderas', 'kurva', 'bybis', 'pyzda',
  // Estonian
  'türa', 'litapea', 'pede',
  // Russian (common in the region)
  'блядь', 'сука', 'хуй', 'пизда', 'пидор', 'ебать',
];

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', $: 's' };

function normalize(text: string): string {
  return text
    .toLocaleLowerCase()
    .replace(/[013457@$]/g, (ch) => LEET[ch] ?? ch)
    .replace(/(.)\1+/g, '$1');
}

// Repeated letters are collapsed on both sides so "fuuuck"-style stretching still matches.
const WORD_PATTERNS = BLOCKED_TERMS.map((term) => normalize(term)).map(
  (term) => new RegExp(`(^|[^\\p{L}])${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}])`, 'u'),
);

const URL_PATTERN = /\b(?:https?:\/\/|www\.)\S+/gi;
const MAX_LINKS = 2;

export type TextVerdict = { ok: true } | { ok: false; reason: 'blocked_term' | 'link_spam' };

export function checkText(text: string): TextVerdict {
  const normalized = normalize(text);
  if (WORD_PATTERNS.some((pattern) => pattern.test(normalized))) return { ok: false, reason: 'blocked_term' };
  if ((text.match(URL_PATTERN)?.length ?? 0) > MAX_LINKS) return { ok: false, reason: 'link_spam' };
  return { ok: true };
}
