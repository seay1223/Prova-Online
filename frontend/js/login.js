document.addEventListener('DOMContentLoaded', function() {
    console.log('=== LOGIN PAGE LOADED ===');
    
    window.disableSessionCheck = true;
    
    const loginForm = document.getElementById('loginForm');
    const tipoAluno = document.getElementById('tipoAluno');
    const tipoProfessor = document.getElementById('tipoProfessor');
    const turmaGroupAluno = document.getElementById('turmaGroupAluno');
    const turmaAluno = document.getElementById('turmaAluno');
    const turmaGroupProfessor = document.getElementById('turmaGroupProfessor');
    const turmaProfessor = document.getElementById('turmaProfessor');
    
    // Configuração inicial dos campos de turma
    if (turmaGroupAluno && turmaGroupProfessor) {
        if (tipoAluno && tipoAluno.checked) {
            turmaGroupAluno.style.display = 'block';
            turmaGroupProfessor.style.display = 'none';
        } else if (tipoProfessor && tipoProfessor.checked) {
            turmaGroupAluno.style.display = 'none';
            turmaGroupProfessor.style.display = 'block';
        }
    }
    
    // Event listeners para alternar entre aluno e professor
    if (tipoAluno && tipoProfessor && turmaGroupAluno && turmaGroupProfessor) {
        tipoAluno.addEventListener('change', function() {
            if (this.checked) {
                turmaGroupAluno.style.display = 'block';
                if (turmaAluno) turmaAluno.setAttribute('required', 'required');
                turmaGroupProfessor.style.display = 'none';
                if (turmaProfessor) turmaProfessor.removeAttribute('required');
            }
        });
        
        tipoProfessor.addEventListener('change', function() {
            if (this.checked) {
                turmaGroupProfessor.style.display = 'block';
                if (turmaProfessor) turmaProfessor.setAttribute('required', 'required');
                turmaGroupAluno.style.display = 'none';
                if (turmaAluno) turmaAluno.removeAttribute('required');
            }
        });
    }
    
    // Formatação do CPF
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
    
    // Submissão do formulário de login
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            removeMessages();
            
            const cpf = document.getElementById('cpf').value.trim().replace(/\D/g, '');
            const password = document.getElementById('password').value.trim();
            const tipoElement = document.querySelector('input[name="tipo"]:checked');
            const tipo = tipoElement ? tipoElement.value : null;
            
            let turma = null;
            if (tipo === 'aluno') {
                turma = document.getElementById('turmaAluno') ? document.getElementById('turmaAluno').value : null;
            } else if (tipo === 'professor') {
                turma = document.getElementById('turmaProfessor') ? document.getElementById('turmaProfessor').value : null;
            }
            
            if (!cpf || !password || !tipo) {
                showError('Por favor, preencha todos os campos e selecione o tipo de usuário.');
                return;
            }
            
            if (!turma) {
                if (tipo === 'aluno') {
                    showError('Por favor, selecione sua turma.');
                } else {
                    showError('Por favor, selecione a turma para dar aula.');
                }
                return;
            }
            
            if (!isValidCPF(cpf)) {
                showError('Por favor, insira um CPF válido.');
                return;
            }
            
            const loginData = {
                cpf: cpf,
                senha: password,
                tipo: tipo,
                turma: turma
            };
            
            console.log('Enviando dados para a API:', loginData);
            
            fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(loginData),
                credentials: 'include'
            })
            .then(async response => {
                const responseText = await response.text();
                
                if (!response.ok) {
                    try {
                        const errorData = JSON.parse(responseText);
                        throw new Error(errorData.message || 'Erro na autenticação');
                    } catch (e) {
                        throw new Error(responseText || 'Erro na autenticação');
                    }
                }
                
                try {
                    const data = JSON.parse(responseText);
                    
                    if (data.success) {
                        showSuccess('Login realizado com sucesso! Redirecionando...');

                        // Armazenar informações do usuário no sessionStorage para uso posterior
                        sessionStorage.setItem('lastLogin', Date.now().toString());
                        sessionStorage.setItem('userData', JSON.stringify(data.user));

                        setTimeout(() => {
                            window.location.replace(data.redirectUrl || '/dashboard.html');
                        }, 1000);
                    } else {
                        showError(data.message || 'CPF, senha ou tipo de usuário incorretos.');
                    }
                } catch (e) {
                    throw new Error('Resposta inválida do servidor');
                }
            })
            .catch(error => {
                console.error('Erro na requisição:', error);
                showError(error.message || 'Erro ao conectar com o servidor. Tente novamente.');
            });
        });
    }
    
    // Função para validar CPF
    function isValidCPF(cpf) {
        cpf = cpf.replace(/\D/g, '');
        if (cpf.length !== 11) return false;
        if (/^(\d)\1+$/.test(cpf)) return false;
        
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
    
    // Funções para exibir mensagens
    function showError(mensagem) {
        removeMessages();
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message message';
        errorDiv.textContent = mensagem;
        errorDiv.style.cssText = 'background-color: #ffebee; color: #c62828; padding: 12px; border-radius: 4px; margin-bottom: 16px; border: 1px solid #ef5350;';
        
        if (loginForm) {
            loginForm.prepend(errorDiv);
        } else {
            document.body.prepend(errorDiv);
        }
        
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
        
        if (loginForm) {
            loginForm.prepend(successDiv);
        } else {
            document.body.prepend(successDiv);
        }
        
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
    
    function checkAuthenticationStatus() {
        if (window.disableSessionCheck) {
            console.log('❌ Verificação de sessão desativada nesta página');
            return;
        }
    }
    
    // Adicionar link de cadastro se não existir
    if (!document.querySelector('.register-link')) {
        const registerLink = document.createElement('div');
        registerLink.className = 'register-link';
        registerLink.style.cssText = 'text-align: center; margin-top: 20px;';
        registerLink.innerHTML = '<p>Não tem uma conta? <a href="cadastro.html" style="color: #2196f3; text-decoration: none;">Cadastre-se</a></p>';
        
        if (loginForm) {
            loginForm.appendChild(registerLink);
        }
    }
});

// Função auxiliar para obter o ID do usuário logado (para uso em outras páginas)
function getUserId() {
    try {
        const userData = sessionStorage.getItem('userData');
        if (userData) {
            const user = JSON.parse(userData);
            return user.id;
        }
        
        // Fallback: verificar se há sessão ativa
        return fetch('/api/auth/check', {
            credentials: 'include'
        })
        .then(response => response.json())
        .then(data => {
            if (data.isAuthenticated && data.user) {
                sessionStorage.setItem('userData', JSON.stringify(data.user));
                return data.user.id;
            }
            return null;
        })
        .catch(error => {
            console.error('Erro ao verificar autenticação:', error);
            return null;
        });
    } catch (error) {
        console.error('Erro ao obter ID do usuário:', error);
        return null;
    }
}