window.deskBeforeElement =
  document.querySelector('input[name="desk"]');

window.deskBeforeValues = [
  ...document.querySelectorAll('input[name="desk"]')
].map(el => ({
  name: el.closest("label")?.innerText.match(/23\.D\d+/)?.[0],
  value: el.value,
  disabled: el.disabled
}));

console.log("Snapshot saved:", deskBeforeValues.length);
