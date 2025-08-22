document.addEventListener('DOMContentLoaded', function() {
    // Verificar se o usuário está logado
    if (!localStorage.getItem('usuarioLogado')) {
        window.location.href = '/login';
        return;
    }

    // Adicionar interatividade aos botões - SEM ALERTS
    document.querySelectorAll(".card-btn").forEach((button) => {
        button.addEventListener("click", function () {
            const cardTitle = this.parentElement.querySelector("h3").textContent;
            
            // Redirecionar para a página apropriada baseada no cardTitle
            switch(cardTitle) {
                case "Ver Provas":
                    window.location.href = "/provas";
                    break;
                case "Fazer Provas":
                    window.location.href = "/fazer-prova";
                    break;
                case "Ver Notas":
                    window.location.href = "/notas";
                    break;
                default:
                    // Apenas log no console sem mostrar alert para o usuário
                    console.log("Botão clicado:", cardTitle);
            }
        });
    });

    // Logout
    document.querySelector(".logout-btn").addEventListener("click", function () {
        if (confirm("Tem certeza que deseja sair?")) {
            localStorage.removeItem('usuarioLogado');
            window.location.href = "/login";
        }
    });

    // Carregar informações do usuário
    const usuario = JSON.parse(localStorage.getItem('usuarioLogado'));
    if (usuario && usuario.email) {
        const userInfoElement = document.querySelector('.user-info span');
        if (userInfoElement) {
            userInfoElement.textContent = usuario.email;
        }
    }
});