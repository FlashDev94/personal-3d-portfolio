/**
 * Lightweight SplitText alternative — wraps each character in a span.
 * Avoids GSAP Club plugin dependency.
 */
export type SplitResult = {
  chars: HTMLElement[];
  words: HTMLElement[];
  revert: () => void;
};

export function splitChars(el: HTMLElement): SplitResult {
  const original = el.innerHTML;
  const text = el.textContent ?? "";
  const chars: HTMLElement[] = [];
  const words: HTMLElement[] = [];

  el.setAttribute("aria-label", text.trim());
  el.textContent = "";

  const parts = text.split(/(\s+)/);
  for (const part of parts) {
    if (/^\s+$/.test(part)) {
      el.appendChild(document.createTextNode(part));
      continue;
    }
    const word = document.createElement("span");
    word.className = "split-word";
    word.style.display = "inline-block";
    word.style.whiteSpace = "nowrap";
    for (const ch of part) {
      const span = document.createElement("span");
      span.className = "split-char";
      span.style.display = "inline-block";
      span.style.willChange = "transform, opacity, filter";
      span.textContent = ch;
      word.appendChild(span);
      chars.push(span);
    }
    el.appendChild(word);
    words.push(word);
  }

  return {
    chars,
    words,
    revert: () => {
      el.innerHTML = original;
      el.removeAttribute("aria-label");
    },
  };
}
