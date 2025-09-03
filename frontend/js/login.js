document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const tipoAluno = document.getElementById('tipoAluno');
    const tipoProfessor = document.getElementById('tipoProfessor');
    const turmaGroup = document.getElementById('turmaGroup');
    const turmaSelect = document.getElementById('turma');

    // Mostrar/ocultar campo de turma baseado no tipo de usuário
    if (tipoAluno && tipoProfessor && turmaGroup) {
        tipoAluno.addEventListener('change', function() {
            if (this.checked) {
                turmaGroup.style.display = 'block';
                turmaSelect.setAttribute('required', 'required');
            }
        });

        tipoProfessor.addEventListener('change', function() {
            if (this.checked) {
                turmaGroup.style.display = 'none';
                turmaSelect.removeAttribute('required');
            }
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            removeMessages();

            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value.trim();
            const tipoElement = document.querySelector('input[name="tipo"]:checked');
            const tipo = tipoElement ? tipoElement.value : null;
            const turma = tipo === 'aluno' ? document.getElementById('turma').value : null;

            if (!email || !password || !tipo) {
                showError('Por favor, preencha todos os campos e selecione o tipo de usuário.');
                return;
            }

            if (tipo === 'aluno' && !turma) {
                showError('Por favor, selecione sua turma.');
                return;
            }

            if (!isValidEmail(email)) {
                showError('Por favor, insira um e-mail válido.');
                return;
            }

            try {
                // Fazer a requisição para a API de login (URL CORRIGIDA)
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email: email,
                        senha: password,
                        tipo: tipo,
                        turma: turma
                    })
                });

                const data = await response.json();

                if (data.success) {
                    // Salva no localStorage
                    localStorage.setItem('userData', JSON.stringify(data.user));
                    localStorage.setItem('authToken', data.token);

                    showSuccess('Login realizado com sucesso! Redirecionando...');

                    setTimeout(() => {
                        // Redireciona para a página correta
                        if (tipo === 'aluno') {
                            window.location.href = '/aluno';
                        } else {
                            window.location.href = '/professor';
                        }
                    }, 1500);
                } else {
                    showError(data.message || 'Email, senha ou turma incorretos. Por favor, tente novamente.');
                }
            } catch (error) {
                console.error('Erro no login:', error);
                showError('Erro de conexão. Tente novamente.');
            }
        });
    }

    // Funções auxiliares
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    function showError(mensagem) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message message';
        errorDiv.textContent = mensagem;
        loginForm.prepend(errorDiv);
    }

    function showSuccess(mensagem) {
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message message';
        successDiv.textContent = mensagem;
        loginForm.prepend(successDiv);
    }

    function removeMessages() {
        const messages = document.querySelectorAll('.message');
        messages.forEach(msg => msg.remove());
    }
});