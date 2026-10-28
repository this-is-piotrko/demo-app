window.deskSnapshot = () => {
  const desks = [...document.querySelectorAll(
    'input[type="radio"][name="desk"]'
  )];

  return {
    timestamp: new Date().toLocaleTimeString(),
    count: desks.length,
    enabled: desks.filter(d => !d.disabled).length,
    desks: desks.map(d => ({
      name: d.closest("label")?.innerText.match(/23\.D\d+/)?.[0],
      value: d.value,
      disabled: d.disabled
    }))
  };
};

window.beforeApply = deskSnapshot();

console.log("BEFORE APPLY:", {
  count: beforeApply.count,
  enabled: beforeApply.enabled
});
