window.afterApply = deskSnapshot();

console.log("AFTER APPLY:", {
  count: afterApply.count,
  enabled: afterApply.enabled
});

console.log(
  "Changed:",
  JSON.stringify(beforeApply.desks) !==
  JSON.stringify(afterApply.desks)
);

console.log(
  "Same DOM element:",
  document.querySelector('input[name="desk"]') ===
  undefined
);
