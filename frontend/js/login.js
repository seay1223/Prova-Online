document.addEventListener('DOMContentLoaded', function() {
    // Credenciais pré-definidas
    const CREDENCIAIS = {
        aluno: {
            email: "aluno@escola.com",
            senha: "aluno123",
            tipo: "aluno"
        },
        professor: {
            email: "professor@escola.com", 
            senha: "aluno123",
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

            // Verificar credenciais - ALUNO
            if (email === CREDENCIAIS.aluno.email && password === CREDENCIAIS.aluno.senha) {
                // Login bem-sucedido
                showSuccess('Login realizado com sucesso! Redirecionando...');
                
                // Salvar no localStorage
                localStorage.setItem('usuarioLogado', JSON.stringify({
                    email: email,
                    tipo: CREDENCIAIS.aluno.tipo
                }));
                
                // Redirecionar após 1 segundo
                setTimeout(() => {
                    window.location.href = '/aluno';
                }, 1000);
                return;
            }
            
            // Verificar credenciais - PROFESSOR
            if (email === CREDENCIAIS.professor.email && password === CREDENCIAIS.professor.senha) {
                // Login bem-sucedido
                showSuccess('Login realizado com sucesso! Redirecionando...');
                
                // Salvar no localStorage
                localStorage.setItem('usuarioLogado', JSON.stringify({
                    email: email,
                    tipo: CREDENCIAIS.professor.tipo
                }));
                
                // Redirecionar após 1 segundo
                setTimeout(() => {
                    window.location.href = '/professor';
                }, 1000);
                return;
            }
            
            // Credenciais inválidas
            showError('E-mail ou senha incorretos. Use: aluno@escola.com / aluno123');
        });
    }
    
    // Verificar se já está logado e redirecionar apropriadamente
    const usuarioLogado = localStorage.getItem('usuarioLogado');
    if (usuarioLogado && window.location.pathname === '/login') {
        const usuario = JSON.parse(usuarioLogado);
        if (usuario.tipo === 'aluno') {
            window.location.href = '/aluno';
        } else if (usuario.tipo === 'professor') {
            window.location.href = '/professor';
        }
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
        
        if (errorMsg) errorMsg.remove();
        if (successMsg) successMsg.remove();
    }
});