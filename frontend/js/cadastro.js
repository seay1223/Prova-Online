// frontend/js/login.js
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const tipoAluno = document.getElementById('tipoAluno');
    const tipoProfessor = document.getElementById('tipoProfessor');
    const turmaGroupAluno = document.getElementById('turmaGroupAluno');
    const turmaAluno = document.getElementById('turmaAluno');
    const turmaGroupProfessor = document.getElementById('turmaGroupProfessor');
    const turmaProfessor = document.getElementById('turmaProfessor');
    
    // Mostrar/ocultar campo de turma baseado no tipo de usuário
    if (tipoAluno && tipoProfessor && turmaGroupAluno && turmaGroupProfessor) {
        tipoAluno.addEventListener('change', function() {
            if (this.checked) {
                turmaGroupAluno.style.display = 'block';
                turmaAluno.setAttribute('required', 'required');
                turmaGroupProfessor.style.display = 'none';
                turmaProfessor.removeAttribute('required');
            }
        });
        
        tipoProfessor.addEventListener('change', function() {
            if (this.checked) {
                turmaGroupProfessor.style.display = 'block';
                turmaProfessor.setAttribute('required', 'required');
                turmaGroupAluno.style.display = 'none';
                turmaAluno.removeAttribute('required');
            }
        });
    }
    
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            removeMessages();
            
            const cpf = document.getElementById('cpf').value.trim().replace(/\D/g, '');
            const password = document.getElementById('password').value.trim();
            const tipoElement = document.querySelector('input[name="tipo"]:checked');
            const tipo = tipoElement ? tipoElement.value : null;
            
            // Obter a turma correta baseada no tipo de usuário
            let turma = null;
            if (tipo === 'aluno') {
                turma = document.getElementById('turmaAluno').value;
            } else if (tipo === 'professor') {
                turma = document.getElementById('turmaProfessor').value;
            }
            
            if (!cpf || !password || !tipo) {
                showError('Por favor, preencha todos os campos e selecione o tipo de usuário.');
                return;
            }
            
            if (!turma) {
                if (tipo === 'aluno') {
                    showError('Por favor, selecione sua turma.');
                } else {
                    showError('Por favor, selecione a turma para acessar.');
                }
                return;
            }
            
            if (!isValidCPF(cpf)) {
                showError('Por favor, insira um CPF válido.');
                return;
            }
            
            try {
                // Fazer a requisição para a API de login
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        cpf: cpf,
                        senha: password,
                        tipo: tipo,
                        turma: turma
                    })
                });
                
                // Verificar se a resposta é OK antes de tentar converter para JSON
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Erro na autenticação');
                }
                
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
                    showError(data.message || 'CPF, senha ou turma incorretos. Por favor, tente novamente.');
                }
            } catch (error) {
                console.error('Erro no login:', error);
                showError(error.message || 'Erro de conexão. Tente novamente.');
            }
        });
    }
    
    // Funções auxiliares
    function isValidCPF(cpf) {
        // Remove caracteres não numéricos
        cpf = cpf.replace(/\D/g, '');
        
        // Verifica se tem 11 dígitos
        if (cpf.length !== 11) return false;
        
        // Verifica se todos os dígitos são iguais (ex: 111.111.111-11)
        if (/^(\d)\1+$/.test(cpf)) return false;
        
        // Validação do CPF (algoritmo de verificação)
        let soma = 0;
        let resto;
        
        for (let i = 1; i <= 9; i++) 
            soma = soma + parseInt(cpf.substring(i-1, i)) * (11 - i);
        
        resto = (soma * 10) % 11;
        
        if ((resto === 10) || (resto === 11)) resto = 0;
        if (resto !== parseInt(cpf.substring(9, 10))) return false;
        
        soma = 0;
        for (let i = 1; i <= 10; i++) 
            soma = soma + parseInt(cpf.substring(i-1, i)) * (12 - i);
        
        resto = (soma * 10) % 11;
        
        if ((resto === 10) || (resto === 11)) resto = 0;
        if (resto !== parseInt(cpf.substring(10, 11))) return false;
        
        return true;
    }
    
    function showError(mensagem) {
        removeMessages(); // Remover mensagens existentes antes de adicionar uma nova
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message message';
        errorDiv.textContent = mensagem;
        loginForm.prepend(errorDiv);
    }
    
    function showSuccess(mensagem) {
        removeMessages(); // Remover mensagens existentes antes de adicionar uma nova
        
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