// user-display.js - Exibir informações do usuário logado

class UserDisplay {
    constructor() {
        this.userData = null;
        this.init();
    }

    init() {
        this.loadUserData();
        this.displayUserInfo();
    }

    loadUserData() {
        try {
            // Tentar carregar do localStorage
            const userDataStr = localStorage.getItem('userData');
            if (userDataStr) {
                this.userData = JSON.parse(userDataStr);
            }
            
            // Se não encontrou no localStorage, verificar se serverService está disponível
            if (!this.userData && typeof serverService !== 'undefined') {
                this.userData = serverService.userData;
            }
        } catch (error) {
            console.error('Erro ao carregar dados do usuário:', error);
        }
    }

    displayUserInfo() {
        if (!this.userData) {
            console.log('Nenhum dado de usuário disponível');
            return;
        }

        // Exibir nome do usuário
        const userNameElement = document.getElementById('user-name');
        if (userNameElement && this.userData.nome) {
            userNameElement.textContent = this.userData.nome;
        }

        // Exibir CPF do usuário
        const userCpfElement = document.getElementById('user-cpf');
        if (userCpfElement && this.userData.cpf) {
            userCpfElement.textContent = this.formatCPF(this.userData.cpf);
        }

        // Exibir avatar com iniciais
        const userAvatarElement = document.getElementById('user-avatar');
        if (userAvatarElement && this.userData.nome) {
            userAvatarElement.textContent = this.getInitials(this.userData.nome);
        }

        // Atualizar título da página se for professor
        if (this.userData.tipo === 'professor') {
            this.updatePageTitle('Professor');
        }
    }

    formatCPF(cpf) {
        if (!cpf) return '';
        
        // Remover caracteres não numéricos
        cpf = cpf.replace(/\D/g, '');
        
        // Formatar CPF: 000.000.000-00
        if (cpf.length === 11) {
            return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        }
        
        return cpf;
    }

    getInitials(name) {
        if (!name) return 'U';
        
        const names = name.split(' ');
        if (names.length === 1) {
            return names[0].charAt(0).toUpperCase();
        }
        
        return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
    }

    updatePageTitle(userType) {
        const titleElement = document.querySelector('h1');
        if (titleElement && userType) {
            const currentTitle = titleElement.textContent;
            if (!currentTitle.includes(userType)) {
                titleElement.textContent = currentTitle.replace('Área do', `Área do ${userType}`);
            }
        }
    }

    getUserData() {
        return this.userData;
    }

    isProfessor() {
        return this.userData && this.userData.tipo === 'professor';
    }

    isStudent() {
        return this.userData && this.userData.tipo === 'aluno';
    }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    window.userDisplay = new UserDisplay();
    
    // Verificar se está logado como professor
    setTimeout(() => {
        if (window.userDisplay.isProfessor()) {
            console.log('Usuário é professor');
        } else if (window.userDisplay.isStudent()) {
            console.log('Usuário é aluno, redirecionando...');
            window.location.href = '/aluno';
        } else {
            console.log('Usuário não autenticado, redirecionando para login...');
            window.location.href = '/login';
        }
    }, 100);
});