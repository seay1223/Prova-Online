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
    
    // Configuração inicial dos grupos de turma
    function setupTurmaGroups() {
        if (turmaGroupAluno && turmaGroupProfessor) {
            if (tipoAluno && tipoAluno.checked) {
                turmaGroupAluno.style.display = 'block';
                turmaGroupProfessor.style.display = 'none';
            } else if (tipoProfessor && tipoProfessor.checked) {
                turmaGroupAluno.style.display = 'none';
                turmaGroupProfessor.style.display = 'block';
            }
        }
    }
    
    // Inicializar grupos de turma
    setupTurmaGroups();
    
    // Event listeners para mudança de tipo de usuário
    if (tipoAluno && tipoProfessor) {
        tipoAluno.addEventListener('change', function() {
            if (this.checked) {
                turmaGroupAluno.style.display = 'block';
                turmaGroupProfessor.style.display = 'none';
                if (turmaAluno) turmaAluno.setAttribute('required', 'required');
                if (turmaProfessor) turmaProfessor.removeAttribute('required');
            }
        });
        
        tipoProfessor.addEventListener('change', function() {
            if (this.checked) {
                turmaGroupProfessor.style.display = 'block';
                turmaGroupAluno.style.display = 'none';
                if (turmaProfessor) turmaProfessor.setAttribute('required', 'required');
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
    
    // Função principal de login
    async function handleLogin(loginData) {
        console.log('📤 Enviando dados para login:', {
            cpf: loginData.cpf,
            tipo: loginData.tipo,
            turma: loginData.turma,
            senha: '***'
        });
        
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(loginData),
                credentials: 'include'
            });
            
            console.log('📥 Resposta do servidor - Status:', response.status);
            
            const responseText = await response.text();
            console.log('📥 Resposta do servidor - Texto:', responseText);
            
            if (!response.ok) {
                let errorMessage = 'Erro na autenticação';
                
                try {
                    const errorData = JSON.parse(responseText);
                    errorMessage = errorData.message || errorMessage;
                    
                    // Mensagens específicas para cada tipo de erro
                    if (response.status === 401) {
                        if (errorData.message === 'Senha incorreta') {
                            errorMessage = 'Senha incorreta. Verifique sua senha e tente novamente.';
                        } else if (errorData.message === 'Usuário não encontrado') {
                            errorMessage = 'Usuário não encontrado. Verifique o CPF e tipo de usuário.';
                        } else if (errorData.message.includes('Turma incorreta')) {
                            errorMessage = errorData.message;
                        }
                    } else if (response.status === 400) {
                        errorMessage = errorData.message || 'Dados inválidos enviados';
                    }
                } catch (e) {
                    errorMessage = responseText || 'Erro de conexão com o servidor';
                }
                
                throw new Error(errorMessage);
            }
            
            // Processar resposta de sucesso
            const data = JSON.parse(responseText);
            
            if (data.success) {
                return {
                    success: true,
                    data: data,
                    message: data.message || 'Login realizado com sucesso!'
                };
            } else {
                throw new Error(data.message || 'Erro no login');
            }
            
        } catch (error) {
            console.error('❌ Erro na requisição de login:', error);
            throw error;
        }
    }
    
    // Salvar dados do usuário no sessionStorage
    function saveUserData(userData, token, turma) {
        sessionStorage.setItem('lastLogin', Date.now().toString());
        sessionStorage.setItem('userData', JSON.stringify(userData));
        sessionStorage.setItem('userType', userData.tipo);
        sessionStorage.setItem('userClass', userData.turma || turma);
        sessionStorage.setItem('userToken', token || '');
        sessionStorage.setItem('isAuthenticated', 'true');
        sessionStorage.setItem('loginTime', Date.now().toString());
        
        console.log('💾 Dados do usuário salvos:', userData);
    }
    
    // Submissão do formulário de login
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            removeMessages();
            
            // Obter dados do formulário
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
            
            // Validações básicas
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
            
            // Mostrar loading
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Entrando...';
            submitBtn.disabled = true;
            
            try {
                console.log('🔄 Iniciando processo de login...');
                
                // Tentar fazer login
                const loginResult = await handleLogin(loginData);
                
                if (loginResult.success) {
                    showSuccess('Login realizado com sucesso! Redirecionando para sua área exclusiva...');
                    
                    // Salvar dados do usuário
                    saveUserData(loginResult.data.user, loginResult.data.token, turma);
                    
                    console.log('✅ Login bem-sucedido!', loginResult.data.user);
                    
                    // Verificar se há redirect na URL
                    const urlParams = new URLSearchParams(window.location.search);
                    const redirectParam = urlParams.get('redirect');
                    
                    if (redirectParam && redirectParam.startsWith('/')) {
                        console.log(`🎯 Redirecionando para URL específica: ${redirectParam}`);
                        setTimeout(() => {
                            window.location.href = redirectParam;
                        }, 1500);
                    } else {
                        // SEMPRE redirecionar para /url (página de URL única)
                        console.log('🎯 Redirecionando para página de URL única: /url');
                        setTimeout(() => {
                            window.location.href = '/url';
                        }, 1500);
                    }
                }
                
            } catch (error) {
                console.error('❌ Erro no processo de login:', error);
                
                // Mensagens de erro mais amigáveis
                let userMessage = error.message;
                
                if (error.message.includes('Failed to fetch') || error.message.includes('Network Error')) {
                    userMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
                } else if (error.message.includes('Senha incorreta')) {
                    userMessage = 'Senha incorreta. Verifique sua senha.';
                } else if (error.message.includes('Usuário não encontrado')) {
                    userMessage = 'Usuário não encontrado. Verifique o CPF e tipo de conta.';
                    // Sugerir criar conta
                    showSuggestion('Este usuário não existe. <a href="/cadastro" style="color: #1976d2; text-decoration: underline;">Clique aqui para criar uma conta</a>');
                }
                
                showError(userMessage);
                
            } finally {
                // Restaurar botão
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }
    
    // Validação de CPF
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
    
    // Exibir mensagem de erro
    function showError(mensagem) {
        removeMessages();
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message message';
        errorDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 18px;">❌</span>
                <span>${mensagem}</span>
            </div>
        `;
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
        }, 8000);
    }
    
    // Exibir mensagem de sucesso
    function showSuccess(mensagem) {
        removeMessages();
        
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message message';
        successDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 18px;">✅</span>
                <span>${mensagem}</span>
            </div>
        `;
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
    
    // Exibir sugestão
    function showSuggestion(mensagem) {
        const suggestionDiv = document.createElement('div');
        suggestionDiv.className = 'suggestion-message';
        suggestionDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 16px;">💡</span>
                <span>${mensagem}</span>
            </div>
        `;
        suggestionDiv.style.cssText = 'background-color: #e3f2fd; color: #1565c0; padding: 10px; border-radius: 4px; margin-top: 8px; border: 1px solid #90caf9;';
        
        const errorDiv = document.querySelector('.error-message');
        if (errorDiv) {
            errorDiv.appendChild(suggestionDiv);
        }
    }
    
    // Remover mensagens existentes
    function removeMessages() {
        const messages = document.querySelectorAll('.message, .suggestion-message');
        messages.forEach(msg => {
            if (msg.parentNode) {
                msg.parentNode.removeChild(msg);
            }
        });
    }
    
    // Adicionar link de cadastro
    function addRegisterLink() {
        if (!document.querySelector('.register-link')) {
            const registerLink = document.createElement('div');
            registerLink.className = 'register-link';
            registerLink.style.cssText = 'text-align: center; margin-top: 20px; padding-top: 15px; border-top: 1px solid #e0e0e0;';
            registerLink.innerHTML = `
                <p style="margin: 0; color: #666;">
                    Não tem uma conta? 
                    <a href="/cadastro" style="color: #2196f3; text-decoration: none; font-weight: bold;">
                        Cadastre-se aqui
                    </a>
                </p>
            `;
            
            if (loginForm) {
                loginForm.appendChild(registerLink);
            }
        }
    }
    
    // Verificar se há parâmetros de erro na URL
    function checkUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const error = urlParams.get('error');
        
        if (error) {
            showError(decodeURIComponent(error));
        }
        
        const success = urlParams.get('success');
        if (success) {
            showSuccess(decodeURIComponent(success));
        }
    }
    
    // Inicializar componentes
    addRegisterLink();
    checkUrlParams();
    
    console.log('✅ Login page inicializada com sucesso!');
});

// Verificar se página existe
function checkPageExists(url) {
    return fetch(url, { method: 'HEAD' })
        .then(response => response.status !== 404)
        .catch(() => false);
}

// Obter ID do usuário
function getUserId() {
    try {
        const userData = sessionStorage.getItem('userData');
        if (userData) {
            const user = JSON.parse(userData);
            return user.id;
        }
        return null;
    } catch (error) {
        console.error('Erro ao obter ID do usuário:', error);
        return null;
    }
}