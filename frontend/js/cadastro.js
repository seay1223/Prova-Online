document.addEventListener('DOMContentLoaded', function() {
    const cadastroForm = document.getElementById('cadastroForm');
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
    
    // Adicionar máscara de CPF
    const cpfInput = document.getElementById('cpf');
    if (cpfInput) {
        cpfInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 11) value = value.slice(0, 11);
            
            if (value.length <= 11) {
                value = value.replace(/(\d{3})(\d)/, '$1.$2');
                value = value.replace(/(\d{3})(\d)/, '$1.$2');
                value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
            }
            
            e.target.value = value;
        });
    }
    
    // Manipular envio do formulário
    if (cadastroForm) {
        cadastroForm.addEventListener('submit', function(e) {
            e.preventDefault();
            removeMessages();
            
            const nome = document.getElementById('nome').value.trim();
            const cpf = document.getElementById('cpf').value.trim().replace(/\D/g, '');
            const password = document.getElementById('password').value.trim();
            const tipoElement = document.querySelector('input[name="tipo"]:checked');
            const tipo = tipoElement ? tipoElement.value : null;
            const turma = tipo === 'aluno' ? document.getElementById('turma').value : null;
            const terms = document.getElementById('terms').checked;
            
            console.log('=== DADOS DO CADASTRO ===');
            console.log('Nome:', nome);
            console.log('CPF:', cpf);
            console.log('Tipo:', tipo);
            console.log('Turma:', turma);
            console.log('Termos aceitos:', terms);
            
            // Validações
            if (!nome || !cpf || !password || !tipo || !terms) {
                showError('Por favor, preencha todos os campos obrigatórios.');
                return;
            }
            
            if (tipo === 'aluno' && !turma) {
                showError('Por favor, selecione sua turma.');
                return;
            }
            
            if (!isValidCPF(cpf)) {
                showError('Por favor, insira um CPF válido.');
                return;
            }
            
            // Preparar os dados para envio
            const userData = {
                nome: nome,
                cpf: cpf,
                senha: password,
                tipo: tipo,
                turma: turma
            };
            
            console.log('Enviando dados para cadastro:', userData);
            
            // Enviar requisição para a API de cadastro
            fetch('/api/cadastro', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            })
            .then(async response => {
                console.log('Status da resposta:', response.status);
                
                // Obter o corpo da resposta como texto
                const responseText = await response.text();
                console.log('Resposta do servidor (texto bruto):', responseText);
                
                // Verificar se a resposta está vazia
                if (!responseText.trim()) {
                    throw new Error('Resposta vazia do servidor');
                }
                
                // Tentar analisar como JSON
                try {
                    const data = JSON.parse(responseText);
                    
                    if (!response.ok) {
                        throw new Error(data.message || 'Erro no cadastro');
                    }
                    
                    return data;
                } catch (parseError) {
                    console.error('Erro ao analisar JSON:', parseError);
                    throw new Error('Resposta inválida do servidor: ' + responseText);
                }
            })
            .then(data => {
                console.log('Resposta da API:', data);
                
                if (data.success) {
                    showSuccess('Cadastro realizado com sucesso! Redirecionando para login...');
                    
                    // Redireciona para a página de login após um breve delay
                    setTimeout(() => {
                        window.location.href = '/login';
                    }, 2000);
                } else {
                    showError(data.message || 'Erro ao cadastrar usuário.');
                }
            })
            .catch(error => {
                console.error('Erro na requisição:', error);
                showError(error.message || 'Erro ao conectar com o servidor. Tente novamente.');
            });
        });
    }
    
    // Funções auxiliares
    function isValidCPF(cpf) {
        cpf = cpf.replace(/\D/g, '');
        
        if (cpf.length !== 11) return false;
        if (/^(\d)\1{10}$/.test(cpf)) return false;
        
        let soma = 0;
        for (let i = 0; i < 9; i++) {
            soma += parseInt(cpf.charAt(i)) * (10 - i);
        }
        
        let resto = 11 - (soma % 11);
        if (resto === 10 || resto === 11) resto = 0;
        if (resto !== parseInt(cpf.charAt(9))) return false;
        
        soma = 0;
        for (let i = 0; i < 10; i++) {
            soma += parseInt(cpf.charAt(i)) * (11 - i);
        }
        
        resto = 11 - (soma % 11);
        if (resto === 10 || resto === 11) resto = 0;
        if (resto !== parseInt(cpf.charAt(10))) return false;
        
        return true;
    }
    
    function showError(mensagem) {
        removeMessages();
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message message';
        errorDiv.textContent = mensagem;
        errorDiv.style.cssText = 'background-color: #ffebee; color: #c62828; padding: 12px; border-radius: 4px; margin-bottom: 16px; border: 1px solid #ef5350;';
        
        if (cadastroForm) {
            cadastroForm.prepend(errorDiv);
        } else {
            document.body.prepend(errorDiv);
        }
        
        // Remover automaticamente após 5 segundos
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }
    
    function showSuccess(mensagem) {
        removeMessages();
        
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message message';
        successDiv.textContent = mensagem;
        successDiv.style.cssText = 'background-color: #e8f5e9; color: #2e7d32; padding: 12px; border-radius: 4px; margin-bottom: 16px; border: 1px solid #66bb6a;';
        
        if (cadastroForm) {
            cadastroForm.prepend(successDiv);
        } else {
            document.body.prepend(successDiv);
        }
        
        // Remover automaticamente após 5 segundos
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 5000);
    }
    
    function removeMessages() {
        const messages = document.querySelectorAll('.message');
        messages.forEach(msg => {
            if (msg.parentNode) {
                msg.parentNode.removeChild(msg);
            }
        });
    }
});