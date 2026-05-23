const daysContainer = document.getElementById('daysContainer');

const ORDEM_DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
let tarefas = [];

// === CONFIGURAÇÃO DO BANCO DE DADOS NA NUVEM (GITHUB) ===
const GITHUB_TOKEN = 'COLOQUE_SEU_TOKEN_AQUI';
const GIST_ID = '1a770279fd1bd8196cfe36e757a3b170';

// Função para buscar os dados na nuvem quando o app abre
async function carregarBancoDeDados() {
    try {
        daysContainer.innerHTML = "<p style='text-align: center; width: 100%; color: #2ecc71; margin-top: 50px;'>⏳ Sincronizando com a nuvem...</p>";
        
        const resposta = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
            headers: {
                'Authorization': `Bearer ${GITHUB_TOKEN}`
            }
        });
        
        const dados = await resposta.json();
        const conteudoDoArquivo = dados.files['db.json'].content;
        
        tarefas = JSON.parse(conteudoDoArquivo) || [];
        renderizarTarefas();
    } catch (erro) {
        console.error("Erro ao carregar do GitHub:", erro);
        alert("Erro ao conectar no banco de dados da nuvem.");
        // Se der erro de internet, tenta pegar do localStorage como plano B
        tarefas = JSON.parse(localStorage.getItem('bancoDeTarefasKanban')) || [];
        renderizarTarefas();
    }
}

// Função para enviar os dados para a nuvem sempre que algo mudar
async function salvarBancoDeDados() {
    // Continua salvando no LocalStorage como backup local
    localStorage.setItem('bancoDeTarefasKanban', JSON.stringify(tarefas));
    
    try {
        await fetch(`https://api.github.com/gists/${GIST_ID}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                files: {
                    'db.json': {
                        content: JSON.stringify(tarefas, null, 2)
                    }
                }
            })
        });
        console.log("Salvo na nuvem com sucesso!");
    } catch (erro) {
        console.error("Erro ao salvar no GitHub:", erro);
        alert("Não foi possível sincronizar com a nuvem. Seus dados estão salvos apenas neste computador no momento.");
    }
}

// ==========================================
// A Lógica do Kanban continua igual!
// ==========================================
function renderizarTarefas() {
    daysContainer.innerHTML = ''; 

    ORDEM_DIAS.forEach(diaDaSemana => {
        const dayBlock = document.createElement('div');
        dayBlock.className = 'day-block';

        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        dayHeader.innerText = diaDaSemana;
        dayBlock.appendChild(dayHeader);

        const tarefasDoDia = tarefas.filter(tarefa => tarefa.dia === diaDaSemana);

        const ul = document.createElement('ul');
        ul.className = 'task-list';

        if (tarefasDoDia.length > 0) {
            tarefasDoDia.forEach(tarefa => {
                const li = document.createElement('li');
                li.className = `task-item ${tarefa.concluida ? 'completed' : ''}`;

                li.innerHTML = `
                    <span class="task-content">${tarefa.texto}</span>
                    <div class="task-actions">
                        <button class="btn-icon btn-check" onclick="atualizarTarefa('${tarefa.id}')" title="Concluir/Desfazer">
                            <i class="fas fa-check-circle"></i>
                        </button>
                        <button class="btn-icon btn-delete" onclick="deletarTarefa('${tarefa.id}')" title="Apagar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
                ul.appendChild(li);
            });
        } else {
            const msg = document.createElement('p');
            msg.className = 'empty-msg';
            msg.innerText = "Nada planejado";
            ul.appendChild(msg);
        }
        
        dayBlock.appendChild(ul);

        const inputArea = document.createElement('div');
        inputArea.className = 'column-input-area';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'column-input';
        input.placeholder = '+ Nova tarefa...';
        input.id = `input-${diaDaSemana}`; 
        
        input.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                adicionarTarefa(diaDaSemana);
            }
        });

        const btn = document.createElement('button');
        btn.className = 'column-btn';
        btn.innerHTML = '<i class="fas fa-plus"></i>';
        btn.onclick = () => adicionarTarefa(diaDaSemana);

        inputArea.appendChild(input);
        inputArea.appendChild(btn);

        dayBlock.appendChild(inputArea);

        daysContainer.appendChild(dayBlock);
    });
}

function adicionarTarefa(diaDaSemana) {
    const inputId = `input-${diaDaSemana}`;
    const inputElement = document.getElementById(inputId);
    const texto = inputElement.value.trim();

    if (texto !== '') {
        const novaTarefa = {
            id: Date.now().toString(),
            texto: texto,
            dia: diaDaSemana, 
            concluida: false
        };

        tarefas.push(novaTarefa);
        renderizarTarefas(); // Atualiza a tela primeiro pra ser rápido
        salvarBancoDeDados(); // Depois manda pra nuvem escondido
    } else {
        alert("Por favor, digite uma tarefa!");
    }
}

function atualizarTarefa(id) {
    const tarefa = tarefas.find(t => t.id === id);
    if (tarefa) {
        tarefa.concluida = !tarefa.concluida;
        renderizarTarefas();
        salvarBancoDeDados();
    }
}

function deletarTarefa(id) {
    tarefas = tarefas.filter(t => t.id !== id);
    renderizarTarefas();
    salvarBancoDeDados();
}

// Ao iniciar, puxamos os dados da nuvem!
carregarBancoDeDados();
