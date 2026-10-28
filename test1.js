console.table(
  [...document.querySelectorAll('button, a, input[type="button"]')]
    .filter(el => /refresh|reload|search|availability/i.test(
      (el.innerText || "") + " " +
      (el.title || "") + " " +
      (el.getAttribute("aria-label") || "")
    ))
    .map(el => ({
      tag: el.tagName,
      text: el.innerText?.trim(),
      title: el.title,
      id: el.id
    }))
);
