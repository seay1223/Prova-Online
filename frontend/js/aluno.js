console.log("aluno.js carregado - versão com links únicos por ID");
console.log("=== DEBUG SESSION ===");
console.log("Window location:", window.location.href);
console.log("Path:", window.location.pathname);

// Teste imediato da sessão
fetch("/api/auth/check", {
  credentials: "include",
  headers: { Accept: "application/json" },
})
  .then((response) => response.json())
  .then((data) => console.log("Sessão atual:", data))
  .catch((error) => console.error("Erro ao verificar sessão:", error));

// Serviço para comunicação com a API
window.serverService = {
  // Buscar dados do usuário ATUAL da sessão
  getUserData: async function () {
    try {
      console.log("Buscando dados do usuário via /api/auth/check...");
      const response = await fetch("/api/auth/check", {
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        console.log("Usuário não autenticado ou sessão inválida");
        return null;
      }

      const data = await response.json();
      console.log("Dados do usuário recebidos:", data);

      if (data.isAuthenticated && data.user) {
        return data.user;
      }

      return null;
    } catch (error) {
      console.error("Erro ao buscar dados do usuário:", error);
      return null;
    }
  },

  // Buscar provas do aluno com links únicos
  getProvasComLinks: async function () {
    try {
      console.log("Buscando provas do aluno com links únicos...");
      const response = await fetch("/api/aluno/provas-com-links", {
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status} ao buscar provas`);
      }

      const data = await response.json();
      console.log("Provas com links recebidas:", data);
      return data;
    } catch (error) {
      console.error("Erro ao buscar provas:", error);
      return [];
    }
  },

  // Gerar URL única do aluno
  // No objeto serverService, corrija a função:
  getUrlUnica: async function () {
    try {
      console.log("Gerando URL única do aluno...");
      const response = await fetch("/api/aluno/url-unica", {
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      console.log("Resposta da URL única:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Erro na resposta:", errorText);
        throw new Error(`Erro HTTP ${response.status} ao gerar URL única`);
      }

      const data = await response.json();
      console.log("URL única recebida:", data);
      return data;
    } catch (error) {
      console.error("Erro ao gerar URL única:", error);
      return null;
    }
  },

  // Limpar dados de autenticação
  clearAuthData: async function () {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  },
};

// Função principal quando o documento carrega
document.addEventListener("DOMContentLoaded", async function () {
  console.log("=== PÁGINA DO ALUNO - LINKS ÚNICOS ===");

  await checkAuthentication();
  setupEventListeners();
  addStyles();
});

// Função para verificar autenticação
async function checkAuthentication() {
  console.log("Verificando autenticação via sessão...");
  showLoading("Verificando autenticação...");

  const user = await serverService.getUserData();

  hideLoading();

  if (!user) {
    console.log("Falha na autenticação. Redirecionando para login.");
    redirectToLogin();
    return;
  }

  if (user.tipo !== "aluno") {
    alert("Acesso restrito a alunos.");
    window.location.href = "/dashboard.html";
    return;
  }

  updateUserInfo(user);
  carregarProvasComLinks();
}

// Redirecionar para login
function redirectToLogin() {
  alert("Você precisa estar logado como aluno para acessar esta página!");
  window.location.href = "/login";
}

// Atualizar informações do usuário
async function updateUserInfo(user) {
  const userName = user.nome || "Aluno";
  const userCpf = user.cpf || "";
  const userTurma = user.turma || "";
  const formattedCpf = formatCPF(userCpf);

  const nameElement =
    document.getElementById("userName") ||
    document.getElementById("nomeAluno") ||
    document.querySelector(".user-name");

  const cpfElement =
    document.getElementById("userCpf") || document.querySelector(".user-cpf");

  const turmaElement =
    document.getElementById("userTurma") ||
    document.querySelector(".user-turma");

  if (nameElement) nameElement.textContent = userName;
  if (cpfElement) cpfElement.textContent = `CPF: ${formattedCpf}`;
  if (turmaElement) turmaElement.textContent = `Turma: ${userTurma}`;

  // Atualizar info do header
  const userInfo = document.getElementById("userInfo");
  if (userInfo) {
    userInfo.textContent = `${userName} (${userTurma})`;
  }

  // Gerar e exibir URL única
  await exibirUrlUnica(user.id);
}

// Função para exibir URL única
async function exibirUrlUnica(alunoId) {
  try {
    console.log("Solicitando URL única para aluno:", alunoId);
    const urlUnicaData = await serverService.getUrlUnica();

    if (!urlUnicaData) {
      console.warn("Não foi possível obter URL única");
      return;
    }

    // Criar ou atualizar seção de URL única
    let urlSection = document.getElementById("urlUnicaSection");

    if (!urlSection) {
      urlSection = document.createElement("div");
      urlSection.id = "urlUnicaSection";
      urlSection.className = "url-unica-section";

      // Inserir após a seção de boas-vindas
      const welcomeSection = document.querySelector(".welcome-section");
      if (welcomeSection) {
        welcomeSection.parentNode.insertBefore(
          urlSection,
          welcomeSection.nextSibling
        );
      }
    }

    urlSection.innerHTML = `
            <div class="url-unica-card">
                <h3>🌐 Sua URL de Acesso Exclusivo</h3>
                <p class="url-descricao">Use este link para acessar diretamente sua área:</p>
                
                <div class="url-container">
                    <input type="text" value="${urlUnicaData.url_unica}" 
                           readonly class="url-input" id="urlUnicaInput">
                    <button onclick="copiarUrlUnica()" class="btn-copiar-url">
                        📋 Copiar URL
                    </button>
                </div>
                
                <div class="url-actions">
                    <button onclick="abrirUrlUnica()" class="btn-abrir-url">
                        🔗 Abrir em Nova Guia
                    </button>
                    <button onclick="compartilharUrlUnica()" class="btn-compartilhar">
                        📤 Compartilhar
                    </button>
                </div>
                
                <div class="url-info">
                    <p>⭐ <strong>Vantagens da URL única:</strong></p>
                    <ul>
                        <li>Acesso rápido e direto à sua área</li>
                        <li>Maior segurança com identificação única</li>
                        <li>Link personalizado somente para você</li>
                    </ul>
                </div>
            </div>
        `;
  } catch (error) {
    console.error("Erro ao exibir URL única:", error);

    // Exibir mensagem de erro amigável para o usuário
    const urlSection =
      document.getElementById("urlUnicaSection") ||
      document.createElement("div");
    urlSection.id = "urlUnicaSection";
    urlSection.className = "url-unica-section";
    urlSection.innerHTML = `
            <div class="url-unica-card erro">
                <h3>⚠️ Erro ao gerar URL única</h3>
                <p>Não foi possível gerar sua URL de acesso exclusiva neste momento.</p>
                <button onclick="exibirUrlUnica('${alunoId}')" class="btn-tentar-novamente">
                    🔄 Tentar Novamente
                </button>
            </div>
        `;

    // Inserir na página se ainda não existir
    if (!document.getElementById("urlUnicaSection")) {
      const welcomeSection = document.querySelector(".welcome-section");
      if (welcomeSection) {
        welcomeSection.parentNode.insertBefore(
          urlSection,
          welcomeSection.nextSibling
        );
      }
    }
  }
}

// Função para copiar URL única
function copiarUrlUnica() {
  const input = document.getElementById("urlUnicaInput");
  if (!input) return;

  input.select();
  input.setSelectionRange(0, 99999);

  try {
    navigator.clipboard.writeText(input.value);
    mostrarMensagem("✅ URL copiada para a área de transferência!", "success");
  } catch (error) {
    document.execCommand("copy");
    mostrarMensagem("✅ URL copiada!", "success");
  }
}

// Função para abrir URL única
function abrirUrlUnica() {
  const input = document.getElementById("urlUnicaInput");
  if (!input) return;

  window.open(input.value, "_blank");
}

// Função para compartilhar URL única
async function compartilharUrlUnica() {
  const input = document.getElementById("urlUnicaInput");
  if (!input) return;

  try {
    if (navigator.share) {
      await navigator.share({
        title: "Minha Área do Aluno - PROVA-ONLINE",
        text: "Acesse minha área exclusiva no sistema PROVA-ONLINE",
        url: input.value,
      });
    } else {
      copiarUrlUnica();
      mostrarMensagem("✅ URL copiada! Cole para compartilhar.", "success");
    }
  } catch (error) {
    console.log("Compartilhamento cancelado");
  }
}

// Formatar CPF
function formatCPF(cpf) {
  if (!cpf || cpf.length !== 11) return cpf;
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

// Configurar event listeners
function setupEventListeners() {
  // Logout
  const logoutBtn =
    document.querySelector(".logout-btn") ||
    document.getElementById("btnLogout") ||
    document.querySelector("[data-logout]");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async function () {
      if (confirm("Tem certeza que deseja sair?")) {
        await serverService.clearAuthData();
        window.location.href = "/login";
      }
    });
  }

  // Atualizar
  const refreshBtn = document.getElementById("refreshBtn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", function () {
      carregarProvasComLinks();
    });
  }
}

// Carregar provas com links únicos
async function carregarProvasComLinks() {
  console.log("Carregando provas com links únicos...");
  showLoading("Carregando suas provas...");

  try {
    const provas = await serverService.getProvasComLinks();
    hideLoading();

    if (provas.length === 0) {
      showNoExamsMessage();
      return;
    }

    exibirProvasComLinks(provas);
  } catch (error) {
    console.error("Erro ao carregar provas:", error);
    hideLoading();
    showError("Erro ao carregar provas. Tente novamente.");
  }
}

// Exibir provas com links únicos
function exibirProvasComLinks(provas) {
  const container =
    document.getElementById("provasContainer") ||
    document.getElementById("provas-container");

  if (!container) {
    console.warn("Container de provas não encontrado");
    return;
  }

  container.innerHTML = "";

  provas.forEach((prova) => {
    const provaElement = criarElementoProvaComLink(prova);
    container.appendChild(provaElement);
  });
}

// Criar elemento de prova com link único
function criarElementoProvaComLink(prova) {
  const card = document.createElement("div");
  card.className = "prova-card";

  // Verificar se a prova expirou
  const agora = new Date();
  const dataLimite = new Date(prova.data_limite);
  const expirada = agora > dataLimite;
  const utilizada = prova.utilizado;

  if (expirada) {
    card.classList.add("expirada");
  }
  if (utilizada) {
    card.classList.add("realizada");
  }

  card.innerHTML = `
        <div class="prova-header">
            <h3 class="prova-titulo">${prova.titulo}</h3>
            <div class="status-badges">
                ${
                  expirada ? '<span class="badge-expirada">Expirada</span>' : ""
                }
                ${
                  utilizada
                    ? '<span class="badge-realizada">Realizada</span>'
                    : ""
                }
                ${
                  !expirada && !utilizada
                    ? '<span class="badge-disponivel">Disponível</span>'
                    : ""
                }
            </div>
        </div>
        
        <div class="prova-info">
            <p><strong>Disciplina:</strong> ${prova.disciplina}</p>
            <p><strong>Data limite:</strong> ${formatDate(
              prova.data_limite
            )}</p>
            <p><strong>Tempo:</strong> ${
              prova.tempo_limite || "N/A"
            } minutos</p>
            ${
              prova.descricao
                ? `<p><strong>Descrição:</strong> ${prova.descricao}</p>`
                : ""
            }
        </div>
        
        ${
          prova.link_unico
            ? `
            <div class="link-unico-section">
                <h4>🔗 Seu Link de Acesso Único</h4>
                <div class="link-container">
                    <input type="text" value="${
                      window.location.origin
                    }/acesso-unico/${prova.link_unico}" 
                           readonly class="link-input" id="link-${prova.id}">
                    <button onclick="copiarLink('${
                      prova.id
                    }')" class="btn-copiar">
                        📋 Copiar
                    </button>
                </div>
                
                ${
                  !expirada && !utilizada
                    ? `
                    <a href="/acesso-unico/${prova.link_unico}" class="btn-acessar-prova" target="_blank">
                        🚀 Iniciar Prova
                    </a>
                `
                    : ""
                }
                
                ${
                  utilizada
                    ? `
                    <p class="info-realizada">✅ Você já realizou esta prova</p>
                `
                    : ""
                }
                
                ${
                  expirada && !utilizada
                    ? `
                    <p class="info-expirada">⏰ Prazo para realização expirado</p>
                `
                    : ""
                }
            </div>
        `
            : `
            <div class="link-unico-section">
                <p class="gerando-link">⏳ Gerando seu link de acesso único...</p>
            </div>
        `
        }
    `;

  return card;
}

// Função para copiar link
function copiarLink(provaId) {
  const input = document.getElementById(`link-${provaId}`);
  if (!input) return;

  input.select();
  input.setSelectionRange(0, 99999);

  try {
    navigator.clipboard.writeText(input.value);
    mostrarMensagem("✅ Link copiado para a área de transferência!", "success");
  } catch (error) {
    document.execCommand("copy");
    mostrarMensagem("✅ Link copiado!", "success");
  }
}

// Funções auxiliares
function formatDate(dateString) {
  if (!dateString) return "Data não disponível";
  const options = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  return new Date(dateString).toLocaleString("pt-BR", options);
}

function showNoExamsMessage() {
  const container =
    document.getElementById("provasContainer") ||
    document.getElementById("provas-container");

  if (container) {
    container.innerHTML = `
            <div class="no-results">
                <div class="no-results-icon">📚</div>
                <h3>Nenhuma prova disponível</h3>
                <p>Você não tem nenhuma prova atribuída no momento.</p>
                <button onclick="carregarProvasComLinks()" class="btn-recarregar">
                    🔄 Recarregar
                </button>
            </div>
        `;
  }
}

function showLoading(message) {
  hideLoading();

  const loading = document.createElement("div");
  loading.id = "loadingOverlay";
  loading.innerHTML = `
        <div class="loading-content">
            <div class="spinner"></div>
            <p>${message}</p>
        </div>
    `;

  Object.assign(loading.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
    background: "rgba(255,255,255,0.95)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: "10000",
  });

  document.body.appendChild(loading);
}

function hideLoading() {
  const loading = document.getElementById("loadingOverlay");
  if (loading) loading.remove();
}

function showError(message) {
  const container =
    document.getElementById("provasContainer") ||
    document.getElementById("provas-container");

  if (container) {
    container.innerHTML = `
            <div class="error-container">
                <div class="error-icon">⚠️</div>
                <h3>Erro ao carregar</h3>
                <p>${message}</p>
                <button onclick="carregarProvasComLinks()" class="btn-tentar-novamente">
                    🔄 Tentar Novamente
                </button>
        </div>
        `;
  }
}

function mostrarMensagem(mensagem, tipo) {
  const mensagensAntigas = document.querySelectorAll(".mensagem-flutuante");
  mensagensAntigas.forEach((msg) => msg.remove());

  const mensagemDiv = document.createElement("div");
  mensagemDiv.className = `mensagem-flutuante ${tipo}`;
  mensagemDiv.textContent = mensagem;
  mensagemDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 4px;
        color: white;
        font-weight: bold;
        z-index: 1000;
        ${
          tipo === "success"
            ? "background-color: #4CAF50;"
            : "background-color: #f44336;"
        }
    `;

  document.body.appendChild(mensagemDiv);

  setTimeout(() => {
    mensagemDiv.remove();
  }, 3000);
}

function addStyles() {
  if (document.querySelector("#aluno-styles")) return;

  const styles = document.createElement("style");
  styles.id = "aluno-styles";
  styles.textContent = `
        .prova-card {
            background: white;
            border-radius: 12px;
            padding: 24px;
            margin: 16px 0;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            border: 1px solid #e0e0e0;
            transition: all 0.3s ease;
        }
        
        .prova-card:hover {
            box-shadow: 0 6px 20px rgba(0,0,0,0.15);
            transform: translateY(-2px);
        }
        
        .prova-card.expirada {
            opacity: 0.7;
            background-color: #f8f9fa;
        }
        
        .prova-card.realizada {
            border-left: 4px solid #4CAF50;
        }
        
        .prova-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 16px;
            gap: 12px;
        }
        
        .prova-titulo {
            margin: 0;
            color: #2c3e50;
            font-size: 20px;
            font-weight: 600;
            flex: 1;
        }
        
        .status-badges {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }
        
        .badge-expirada, .badge-realizada, .badge-disponivel {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 500;
        }
        
        .badge-expirada {
            background: #ffebee;
            color: #c62828;
            border: 1px solid #ef5350;
        }
        
        .badge-realizada {
            background: #e8f5e9;
            color: #2e7d32;
            border: 1px solid #66bb6a;
        }
        
        .badge-disponivel {
            background: #e3f2fd;
            color: #1565c0;
            border: 1px solid #42a5f5;
        }
        
        .prova-info {
            margin-bottom: 20px;
        }
        
        .prova-info p {
            margin: 8px 0;
            color: #546e7a;
            line-height: 1.5;
        }
        
        .link-unico-section {
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
            border: 1px solid #e9ecef;
        }
        
        .link-unico-section h4 {
            margin: 0 0 12px 0;
            color: #2c3e50;
            font-size: 16px;
        }
        
        .link-container {
            display: flex;
            gap: 8px;
            margin-bottom: 16px;
        }
        
        .link-input {
            flex: 1;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 14px;
            background: white;
        }
        
        .btn-copiar {
            padding: 12px 16px;
            background: #2196F3;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            transition: background 0.2s ease;
        }
        
        .btn-copiar:hover {
            background: #1976D2;
        }
        
        .btn-acessar-prova {
            display: inline-block;
            padding: 12px 24px;
            background: #4CAF50;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            transition: background 0.2s ease;
        }
        
        .btn-acessar-prova:hover {
            background: #45a049;
        }
        
        .info-realizada, .info-expirada, .gerando-link {
            padding: 12px;
            border-radius: 6px;
            margin: 0;
            font-weight: 500;
        }
        
        .info-realizada {
            background: #e8f5e9;
            color: #2e7d32;
            border: 1px solid #c8e6c9;
        }
        
        .info-expirada {
            background: #ffebee;
            color: #c62828;
            border: 1px solid #ef9a9a;
        }
        
        .gerando-link {
            background: #fff3e0;
            color: #ef6c00;
            border: 1px solid #ffcc80;
        }
        
        .no-results, .error-container {
            text-align: center;
            padding: 40px 20px;
            color: #666;
        }
        
        .no-results-icon, .error-icon {
            font-size: 48px;
            margin-bottom: 16px;
        }
        
        .btn-recarregar, .btn-tentar-novamente {
            padding: 12px 24px;
            background: #2196F3;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            margin-top: 16px;
        }
        
        .loading-content {
            text-align: center;
            padding: 30px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }
        
        .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #3498db;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 16px auto;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        /* Estilos para a seção de URL única */
        .url-unica-section {
            margin: 20px 0;
        }
        
        .url-unica-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 25px;
            border-radius: 15px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        }
        
        .url-unica-card h3 {
            margin: 0 0 15px 0;
            font-size: 22px;
            font-weight: 600;
        }
        
        .url-descricao {
            margin: 0 0 20px 0;
            opacity: 0.9;
            font-size: 15px;
        }
        
        .url-container {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }
        
        .url-input {
            flex: 1;
            padding: 12px 15px;
            border: 2px solid rgba(255,255,255,0.3);
            border-radius: 8px;
            background: rgba(255,255,255,0.1);
            color: white;
            font-size: 14px;
            backdrop-filter: blur(10px);
        }
        
        .url-input::placeholder {
            color: rgba(255,255,255,0.7);
        }
        
        .btn-copiar-url, .btn-abrir-url, .btn-compartilhar {
            padding: 12px 20px;
            border: none;
            border-radius: 8px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
            white-space: nowrap;
        }
        
        .btn-copiar-url {
            background: rgba(255,255,255,0.2);
            color: white;
            border: 2px solid rgba(255,255,255,0.3);
        }
        
        .btn-copiar-url:hover {
            background: rgba(255,255,255,0.3);
        }
        
        .btn-abrir-url {
            background: #4CAF50;
            color: white;
        }
        
        .btn-abrir-url:hover {
            background: #45a049;
            transform: translateY(-2px);
        }
        
        .btn-compartilhar {
            background: #2196F3;
            color: white;
        }
        
        .btn-compartilhar:hover {
            background: #1976D2;
            transform: translateY(-2px);
        }
        
        .url-actions {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        
        .url-info {
            background: rgba(255,255,255,0.1);
            padding: 15px;
            border-radius: 8px;
            border: 1px solid rgba(255,255,255,0.2);
        }
        
        .url-info p {
            margin: 0 0 10px 0;
            font-weight: 600;
        }
        
        .url-info ul {
            margin: 0;
            padding-left: 20px;
        }
        
        .url-info li {
            margin: 5px 0;
            opacity: 0.9;
        }
        
        @media (max-width: 768px) {
            .prova-header {
                flex-direction: column;
            }
            
            .link-container {
                flex-direction: column;
            }
            
            .prova-card {
                padding: 16px;
            }
            
            .url-container {
                flex-direction: column;
            }
            
            .url-actions {
                flex-direction: column;
            }
            
            .btn-copiar-url, .btn-abrir-url, .btn-compartilhar {
                width: 100%;
            }
        }
        
        /* Melhorias nos cards de prova */
        .prova-card {
            position: relative;
            overflow: hidden;
        }
        
        .prova-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 4px;
            height: 100%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        
        .prova-card.realizada::before {
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
        }
        
        .prova-card.expirada::before {
            background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
        }
    `;

  document.head.appendChild(styles);
}

// Funções globais
window.copiarLink = copiarLink;
window.carregarProvasComLinks = carregarProvasComLinks;
window.copiarUrlUnica = copiarUrlUnica;
window.abrirUrlUnica = abrirUrlUnica;
window.compartilharUrlUnica = compartilharUrlUnica;
window.sair = async function () {
  if (confirm("Tem certeza que deseja sair?")) {
    await serverService.clearAuthData();
    window.location.href = "/login";
  }
};

console.log("aluno.js com links únicos inicializado com sucesso");
