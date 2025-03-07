export type Escaper = (match: string) => string;

/** escapeHTML borrowed from https://github.com/feathers-studio/hyperactive/blob/bbd67beace6744c4b8b48637a96c2daed416ebde/hyper/util.ts */
export const HTML: Escaper = (() => {
  const escapables = {
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
  };

  const toEscape = /[<>&]/g;

  return s =>
    s.replace(toEscape, r => escapables[r as keyof typeof escapables] || r);
})();

export function MarkdownV2(text: string) {
  const specialCharacters = [
    '_',
    '*',
    '[',
    ']',
    '(',
    ')',
    '~',
    '>',
    '#',
    '+',
    '-',
    '=',
    '|',
    '{',
    '}',
    '.',
    '!',
  ];

  let escapedText = text;

  for (const char of specialCharacters) {
    const regex = new RegExp(`\\${char}`, 'g'); // double escape for regex pattern
    escapedText = escapedText.replace(regex, `\\${char}`);
  }

  return escapedText;
}
