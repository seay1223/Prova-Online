document.addEventListener('DOMContentLoaded', function() {
    console.log('=== SISTEMA DE LOGIN INICIADO ===');
    
    const loginForm = document.getElementById('loginForm');
    const tipoAluno = document.getElementById('tipoAluno');
    const tipoProfessor = document.getElementById('tipoProfessor');
    const turmaGroupAluno = document.getElementById('turmaGroupAluno');
    const turmaAluno = document.getElementById('turmaAluno');
    const turmaGroupProfessor = document.getElementById('turmaGroupProfessor');
    const turmaProfessor = document.getElementById('turmaProfessor');
    
    // Inicializar estado dos campos de turma
    if (turmaGroupAluno && turmaGroupProfessor) {
        if (tipoAluno && tipoAluno.checked) {
            turmaGroupAluno.style.display = 'block';
            turmaGroupProfessor.style.display = 'none';
        } else if (tipoProfessor && tipoProfessor.checked) {
            turmaGroupAluno.style.display = 'none';
            turmaGroupProfessor.style.display = 'block';
        }
    }
    
    // Mostrar/ocultar campo de turma baseado no tipo de usuário
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
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            removeMessages();
            
            const cpf = document.getElementById('cpf').value.trim().replace(/\D/g, '');
            const password = document.getElementById('password').value.trim();
            const tipoElement = document.querySelector('input[name="tipo"]:checked');
            const tipo = tipoElement ? tipoElement.value : null;
            
            // Obter a turma correta baseada no tipo de usuário
            let turma = null;
            if (tipo === 'aluno') {
                turma = document.getElementById('turmaAluno') ? document.getElementById('turmaAluno').value : null;
            } else if (tipo === 'professor') {
                turma = document.getElementById('turmaProfessor') ? document.getElementById('turmaProfessor').value : null;
            }
            
            // Log para depuração
            console.log('=== DADOS DO FORMULÁRIO ===');
            console.log('CPF:', cpf);
            console.log('Senha:', password);
            console.log('Tipo:', tipo);
            console.log('Turma:', turma);
            
            // Validações
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
            
            // Primeiro tenta autenticar via localStorage (mais rápido)
            try {
                const usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
                const usuarioLocal = usuarios.find(user => 
                    user.cpf === cpf && 
                    user.senha === password && 
                    user.tipo === tipo && 
                    user.turma === turma
                );
                
                if (usuarioLocal) {
                    handleLoginSuccess(usuarioLocal, tipo);
                    return;
                }
            } catch (error) {
                console.warn('Erro ao verificar localStorage:', error);
            }
            
            // Se não encontrou no localStorage, tenta autenticar via servidor
            authenticateWithServer(cpf, password, tipo, turma);
        });
    }
    
    // Função para autenticar via servidor
    function authenticateWithServer(cpf, password, tipo, turma) {
        fetch('/api/usuarios/login', {
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
        })
        .then(response => response.json())
        .then(data => {
            if (data.success && data.usuario) {
                // Adicionar usuário ao localStorage para futuros logins
                const usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
                const usuarioExistenteIndex = usuarios.findIndex(user => user.cpf === cpf);
                
                if (usuarioExistenteIndex === -1) {
                    usuarios.push(data.usuario);
                    localStorage.setItem('usuarios', JSON.stringify(usuarios));
                }
                
                handleLoginSuccess(data.usuario, tipo);
            } else {
                showError(data.message || 'CPF, senha, tipo de usuário ou turma incorretos.');
            }
        })
        .catch(error => {
            console.error('Erro na autenticação:', error);
            showError('Erro ao conectar com o servidor. Tente novamente.');
        });
    }
    
    // Função para tratar login bem-sucedido
    function handleLoginSuccess(usuario, tipo) {
        console.log('Login bem-sucedido:', usuario);
        
        // Salvar dados do usuário logado - CORREÇÃO AQUI
        localStorage.setItem('usuarioLogado', JSON.stringify(usuario));
        
        // Também salva em userData para compatibilidade
        localStorage.setItem('userData', JSON.stringify({
            id: usuario.id || usuario.cpf,
            nome: usuario.nome,
            cpf: usuario.cpf,
            tipo: usuario.tipo,
            turma: usuario.turma
        }));
        
        showSuccess('Login realizado com sucesso! Redirecionando...');
        
        setTimeout(() => {
            // Redireciona para a página correta
            if (tipo === 'aluno') {
                window.location.href = '/aluno';
            } else {
                window.location.href = '/professor';
            }
        }, 1500);
    }
    
    // Funções auxiliares
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
    
    // Adicionar link para cadastro se não existir
    if (!document.querySelector('.register-link')) {
        const registerLink = document.createElement('div');
        registerLink.className = 'register-link';
        registerLink.style.cssText = 'text-align: center; margin-top: 20px;';
        registerLink.innerHTML = '<p>Não tem uma conta? <a href="/cadastro" style="color: #2196f3; text-decoration: none;">Cadastre-se</a></p>';
        
        if (loginForm) {
            loginForm.appendChild(registerLink);
        }
    }
});