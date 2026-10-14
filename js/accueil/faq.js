(() => {
  const questions = [...document.querySelectorAll('.l26-faq-item')];
  questions.forEach(question => {
    question.addEventListener('toggle', () => {
      if (!question.open) return;
      questions.forEach(other => {
        if (other !== question) other.open = false;
      });
    });
  });
})();
