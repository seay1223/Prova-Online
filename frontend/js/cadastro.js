document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('cadastroForm');
    const tipoAluno = document.getElementById('tipoAluno');
    const tipoProfessor = document.getElementById('tipoProfessor');
    const turmaGroup = document.getElementById('turmaGroup');
    const turmaSelect = document.getElementById('turma');
    const submitButton = form.querySelector('.btn-login');

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

    // Adicionar evento de submit ao formulário
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Obter valores do formulário
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const userTypeElement = document.querySelector('input[name="tipo"]:checked');
        const userType = userTypeElement ? userTypeElement.value : null;
        const turma = userType === 'aluno' ? document.getElementById('turma').value : null;

        // Validações básicas
        if (!email || !password || !userType) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        if (userType === 'aluno' && !turma) {
            alert('Por favor, selecione sua turma.');
            return;
        }

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert('Por favor, insira um email válido.');
            return;
        }

        // Validar força da senha
        if (password.length < 6) {
            alert('A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        try {
            // Mostrar indicador de carregamento
            submitButton.disabled = true;
            submitButton.textContent = 'Cadastrando...';

            // Enviar dados para o backend
            const response = await fetch('/api/cadastro-credenciais', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    senha: password,
                    tipo: userType,
                    turma: turma
                })
            });

            const data = await response.json();

            if (data.success) {
                alert('Cadastro realizado com sucesso!');
                window.location.href = '/login';
            } else {
                alert(data.message || 'Erro ao cadastrar. Tente novamente.');
            }

        } catch (error) {
            console.error('Erro:', error);
            alert('Erro de conexão. Tente novamente.');
        } finally {
            // Restaurar botão
            submitButton.disabled = false;
            submitButton.textContent = 'Cadastrar';
        }
    });
});