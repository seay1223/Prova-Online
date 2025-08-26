// frontend/js/linksUnicos.js

// Função para gerar um identificador único baseado no email
function gerarIdUnico(email) {
    // Converter email para hash simples
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
        hash = ((hash << 5) - hash) + email.charCodeAt(i);
        hash |= 0; // Converte para inteiro de 32 bits
    }
    
    // Adicionar timestamp para garantir unicidade
    const timestamp = Date.now().toString(36);
    
    // Retornar o ID único (hash + timestamp)
    return Math.abs(hash).toString(36) + timestamp;
}

// Função para gerar link único baseado no tipo de usuário e ID
function gerarLinkUnico(tipo, idUnico) {
    const baseURL = window.location.origin;
    return `${baseURL}/${tipo}/acesso?token=${idUnico}`;
}

// Função para validar token de acesso
function validarTokenAcesso(token) {
    const usuario = JSON.parse(localStorage.getItem('usuarioLogado') || 'null');
    if (usuario && usuario.idUnico === token) {
        return { valid: true, user: usuario };
    }
    return { valid: false };
}

// Função para verificar se o usuário tem permissão de acesso à página
function verificarPermissaoAcesso(tipoPermitido) {
    const usuario = JSON.parse(localStorage.getItem('usuarioLogado') || 'null');
    
    if (!usuario) {
        window.location.href = '/login';
        return false;
    }
    
    if (usuario.tipo !== tipoPermitido) {
        window.location.href = `/${usuario.tipo}`;
        return false;
    }
    
    return true;
}

// Função para obter parâmetros da URL
function obterParametroURL(nome) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(nome);
}

// Exportar funções para uso em outros arquivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        gerarIdUnico, 
        gerarLinkUnico, 
        validarTokenAcesso, 
        verificarPermissaoAcesso,
        obterParametroURL
    };
}