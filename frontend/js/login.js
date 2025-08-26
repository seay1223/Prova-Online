// frontend/js/login.js

document.addEventListener('DOMContentLoaded', function() {
    // Credenciais para alunos e professores
    const CREDENCIAIS = {
        aluno1: {
            email: "aluno1@escola.com",
            senha: "123456",
            tipo: "aluno"
        },
        aluno2: {
            email: "aluno2@escola.com",
            senha: "123456",
            tipo: "aluno"
        },
        aluno3: {
            email: "aluno3@escola.com",
            senha: "123456",
            tipo: "aluno"
        },
        professor1: {
            email: "professor1@escola.com",
            senha: "123456",
            tipo: "professor"
        },
        professor2: {
            email: "professor2@escola.com",
            senha: "123456",
            tipo: "professor"
        },
        professor3: {
            email: "professor3@escola.com",
            senha: "123456",
            tipo: "professor"
        }
    };

    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            // Validação básica
            if (!email || !password) {
                showError('Por favor, preencha todos os campos.');
                return;
            }
            
            if (!isValidEmail(email)) {
                showError('Por favor, insira um e-mail válido.');
                return;
            }

            // Verificar credenciais
            let credencialValida = null;
            
            // Verificar alunos
            if (email.startsWith('aluno') && email.endsWith('@escola.com')) {
                const numeroAluno = email.match(/aluno(\d)@escola\.com/);
                if (numeroAluno && numeroAluno[1] && CREDENCIAIS[`aluno${numeroAluno[1]}`]) {
                    const aluno = CREDENCIAIS[`aluno${numeroAluno[1]}`];
                    if (password === aluno.senha) {
                        credencialValida = aluno;
                    }
                }
            }
            
            // Verificar professores
            if (email.startsWith('professor') && email.endsWith('@escola.com')) {
                const numeroProfessor = email.match(/professor(\d)@escola\.com/);
                if (numeroProfessor && numeroProfessor[1] && CREDENCIAIS[`professor${numeroProfessor[1]}`]) {
                    const professor = CREDENCIAIS[`professor${numeroProfessor[1]}`];
                    if (password === professor.senha) {
                        credencialValida = professor;
                    }
                }
            }

            // Se as credenciais são válidas
            if (credencialValida) {
                // Gerar ID único e link
                const idUnico = gerarIdUnico(email);
                const linkUnico = gerarLinkUnico(credencialValida.tipo, idUnico);
                
                // Login bem-sucedido
                showSuccess('Login realizado com sucesso! Gerando seu link único...');
                
                // Salvar no localStorage
                localStorage.setItem('usuarioLogado', JSON.stringify({
                    email: email,
                    tipo: credencialValida.tipo,
                    idUnico: idUnico,
                    linkUnico: linkUnico
                }));
                
                // Mostrar o link único para o usuário
                setTimeout(() => {
                    const linkDiv = document.createElement('div');
                    linkDiv.className = 'link-unico-message';
                    linkDiv.style.marginTop = '20px';
                    linkDiv.style.padding = '15px';
                    linkDiv.style.backgroundColor = '#e3f2fd';
                    linkDiv.style.borderRadius = '5px';
                    linkDiv.style.border = '1px solid #bbdefb';
                    
                    linkDiv.innerHTML = `
                        <h3 style="margin-bottom: 10px; color: #1976d2;">Seu Link Único de Acesso:</h3>
                        <input type="text" id="linkUnicoInput" value="${linkUnico}" 
                               style="width: 100%; padding: 8px; border: 1px solid #90caf9; border-radius: 4px; margin-bottom: 10px;" readonly>
                        <button onclick="copiarLink()" style="background: #1976d2; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer;">
                            Copiar Link
                        </button>
                    `;
                    
                    loginForm.parentNode.appendChild(linkDiv);
                    
                    // Adicionar botão para redirecionar
                    const redirectButton = document.createElement('button');
                    redirectButton.textContent = 'Ir para o Dashboard';
                    redirectButton.style.background = '#4caf50';
                    redirectButton.style.color = 'white';
                    redirectButton.style.border = 'none';
                    redirectButton.style.padding = '10px 20px';
                    redirectButton.style.borderRadius = '4px';
                    redirectButton.style.marginTop = '15px';
                    redirectButton.style.cursor = 'pointer';
                    redirectButton.onclick = function() {
                        window.location.href = `/${credencialValida.tipo}`;
                    };
                    
                    loginForm.parentNode.appendChild(redirectButton);
                }, 1500);
                
                return;
            }
            
            // Credenciais inválidas
            showError('E-mail ou senha incorretos. Use: aluno1@escola.com a aluno3@escola.com ou professor1@escola.com a professor3@escola.com com senha 123456');
        });
    }
    
    // Verificar se já está logado e redirecionar apropriadamente
    const usuarioLogado = localStorage.getItem('usuarioLogado');
    if (usuarioLogado && window.location.pathname === '/login') {
        const usuario = JSON.parse(usuarioLogado);
        window.location.href = `/${usuario.tipo}`;
    }
    
    // Função para validar e-mail
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    // Função para mostrar erro
    function showError(mensagem) {
        // Remover mensagens anteriores
        removeMessages();
        
        // Criar elemento de erro
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.color = '#ff3860';
        errorDiv.style.backgroundColor = '#ffe6ea';
        errorDiv.style.padding = '10px';
        errorDiv.style.borderRadius = '5px';
        errorDiv.style.marginBottom = '15px';
        errorDiv.style.border = '1px solid #ff3860';
        errorDiv.textContent = mensagem;
        
        // Inserir antes do formulário
        loginForm.parentNode.insertBefore(errorDiv, loginForm);
    }
    
    // Função para mostrar sucesso
    function showSuccess(mensagem) {
        // Remover mensagens anteriores
        removeMessages();
        
        // Criar elemento de sucesso
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.style.color = '#23d160';
        successDiv.style.backgroundColor = '#e6fffa';
        successDiv.style.padding = '10px';
        successDiv.style.borderRadius = '5px';
        successDiv.style.marginBottom = '15px';
        successDiv.style.border = '1px solid #23d160';
        successDiv.textContent = mensagem;
        
        // Inserir antes do formulário
        loginForm.parentNode.insertBefore(successDiv, loginForm);
    }
    
    // Função para remover mensagens
    function removeMessages() {
        const errorMsg = document.querySelector('.error-message');
        const successMsg = document.querySelector('.success-message');
        const linkMsg = document.querySelector('.link-unico-message');
        
        if (errorMsg) errorMsg.remove();
        if (successMsg) successMsg.remove();
        if (linkMsg) linkMsg.remove();
    }
});

// Função global para copiar o link (chamada pelo botão)
function copiarLink() {
    const linkInput = document.getElementById('linkUnicoInput');
    linkInput.select();
    document.execCommand('copy');
    alert('Link copiado para a área de transferência!');
}