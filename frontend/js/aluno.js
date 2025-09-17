console.log("aluno.js carregado - versão sem URL única");
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

  // Buscar provas do aluno
  getProvas: async function () {
    try {
      console.log("Buscando provas do aluno...");
      const response = await fetch("/api/aluno/provas", {
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status} ao buscar provas`);
      }

      const data = await response.json();
      console.log("Provas recebidas:", data);
      return data;
    } catch (error) {
      console.error("Erro ao buscar provas:", error);
      return [];
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
  console.log("=== PÁGINA DO ALUNO - SEM URL ÚNICA ===");

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
  carregarProvas();
}

// Redirecionar para login
function redirectToLogin() {
  alert("Você precisa estar logado como aluno para acessar esta página!");
  window.location.href = "/login";
}

// Atualizar informações do usuário
function updateUserInfo(user) {
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
      carregarProvas();
    });
  }
}

// Carregar provas
async function carregarProvas() {
  console.log("Carregando provas...");
  showLoading("Carregando suas provas...");

  try {
    const provas = await serverService.getProvas();
    hideLoading();

    if (provas.length === 0) {
      showNoExamsMessage();
      return;
    }

    exibirProvas(provas);
  } catch (error) {
    console.error("Erro ao carregar provas:", error);
    hideLoading();
    showError("Erro ao carregar provas. Tente novamente.");
  }
}

// Exibir provas
function exibirProvas(provas) {
  const container =
    document.getElementById("provasContainer") ||
    document.getElementById("provas-container");

  if (!container) {
    console.warn("Container de provas não encontrado");
    return;
  }

  container.innerHTML = "";

  provas.forEach((prova) => {
    const provaElement = criarElementoProva(prova);
    container.appendChild(provaElement);
  });
}

// Criar elemento de prova
function criarElementoProva(prova) {
  const card = document.createElement("div");
  card.className = "prova-card";

  // Verificar se a prova expirou
  const agora = new Date();
  const dataLimite = new Date(prova.data_limite);
  const expirada = agora > dataLimite;

  if (expirada) {
    card.classList.add("expirada");
  }

  card.innerHTML = `
        <div class="prova-header">
            <h3 class="prova-titulo">${prova.titulo}</h3>
            <div class="status-badges">
                ${expirada ? '<span class="badge-expirada">Expirada</span>' : ''}
                ${!expirada ? '<span class="badge-disponivel">Disponível</span>' : ''}
            </div>
        </div>
        
        <div class="prova-info">
            <p><strong>Disciplina:</strong> ${prova.disciplina}</p>
            <p><strong>Data limite:</strong> ${formatDate(prova.data_limite)}</p>
            <p><strong>Tempo:</strong> ${prova.tempo_limite || "N/A"} minutos</p>
            ${prova.descricao ? `<p><strong>Descrição:</strong> ${prova.descricao}</p>` : ''}
        </div>
        
        <div class="prova-actions">
            ${
              !expirada
                ? `
                <a href="/prova/${prova.id}" class="btn-iniciar-prova">
                    🚀 Iniciar Prova
                </a>
            `
                : `
                <p class="info-expirada">⏰ Prazo para realização expirado</p>
            `
            }
        </div>
    `;

  return card;
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
                <button onclick="carregarProvas()" class="btn-recarregar">
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
                <button onclick="carregarProvas()" class="btn-tentar-novamente">
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
        
        .badge-expirada, .badge-disponivel {
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
        
        .prova-actions {
            text-align: center;
            padding-top: 16px;
            border-top: 1px solid #eee;
        }
        
        .btn-iniciar-prova {
            display: inline-block;
            padding: 12px 24px;
            background: #4CAF50;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            transition: background 0.2s ease;
        }
        
        .btn-iniciar-prova:hover {
            background: #45a049;
        }
        
        .info-expirada {
            padding: 12px;
            background: #ffebee;
            color: #c62828;
            border-radius: 6px;
            border: 1px solid #ef9a9a;
            font-weight: 500;
            text-align: center;
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
        
        @media (max-width: 768px) {
            .prova-header {
                flex-direction: column;
            }
            
            .prova-card {
                padding: 16px;
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
        
        .prova-card.expirada::before {
            background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
        }
    `;

  document.head.appendChild(styles);
}

// Funções globais
window.carregarProvas = carregarProvas;
window.sair = async function () {
  if (confirm("Tem certeza que deseja sair?")) {
    await serverService.clearAuthData();
    window.location.href = "/login";
  }
};

console.log("aluno.js sem URL única inicializado com sucesso");