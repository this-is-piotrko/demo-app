const deskAfterElement =
  document.querySelector('input[name="desk"]');

const deskAfterValues = [
  ...document.querySelectorAll('input[name="desk"]')
].map(el => ({
  name: el.closest("label")?.innerText.match(/23\.D\d+/)?.[0],
  value: el.value,
  disabled: el.disabled
}));

console.log("DOM replaced:",
  deskBeforeElement !== deskAfterElement
);

console.log("Desk data changed:",
  JSON.stringify(deskBeforeValues) !==
  JSON.stringify(deskAfterValues)
);

console.log("Before:", deskBeforeValues.length);
console.log("After:", deskAfterValues.length);
