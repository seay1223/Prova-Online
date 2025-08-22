// Adicionando interatividade aos botões
document.querySelectorAll(".card-btn").forEach((button) => {
  button.addEventListener("click", function () {
    const cardTitle = this.parentElement.querySelector("h3").textContent;
    alert(`Você clicou em: ${cardTitle}`);
    // Aqui você pode redirecionar para a página apropriada
  });
});

document.querySelector(".logout-btn").addEventListener("click", function () {
  if (confirm("Tem certeza que deseja sair?")) {
    alert("Logout realizado com sucesso!");

  }
});
