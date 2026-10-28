(() => {
  const desk = [...document.querySelectorAll('input[name="desk"]')]
    .find(el =>
      el.closest("label")?.innerText.includes("23.D049")
    );

  const book = document.querySelector(
    'form[method="post"] button[name="book"]'
  );

  if (!desk || !book) {
    console.log("Desk or Book button not found");
    return;
  }

  console.log("Before:", {
    deskChecked: desk.checked,
    bookDisabled: book.disabled
  });

  desk.click();

  setTimeout(() => {
    console.log("After:", {
      deskChecked: desk.checked,
      bookDisabled: book.disabled
    });
  }, 300);
})();
