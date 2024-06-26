import PinyinMatch from 'pinyin-match';
import type { CSSProperties } from 'react';

const HighlightStyle: CSSProperties = { backgroundColor: '#ffc069', padding: 0 };

export const Highlighter = (
  t: string,
  b: number,
  e: number,
  highlightStyle: CSSProperties = HighlightStyle,
) => {
  return (
    <span>
      {t.substring(0, b)}
      <b style={highlightStyle}>{t.substring(b, e + 1)}</b>
      {t.substring(e + 1)}
    </span>
  );
};
const PinYinHighlighter = (
  text?: string,
  keyWord?: string,
  highlightStyle: CSSProperties = HighlightStyle,
) => {
  if (keyWord && text) {
    const b = text.indexOf(keyWord);
    if (b > -1) {
      return Highlighter(text, b, b + keyWord.length - 1, highlightStyle);
    } else {
      const e = PinyinMatch.match(text, keyWord);
      if (e && Array.isArray(e)) {
        return Highlighter(text, e[0], e[1], highlightStyle);
      }
    }
  }
  return text;
};
export default PinYinHighlighter;
