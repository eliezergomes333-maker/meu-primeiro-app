const daysContainer = document.getElementById('daysContainer');
const btnSemanaAnterior = document.getElementById('btnSemanaAnterior');
const btnProximaSemana = document.getElementById('btnProximaSemana');
const tituloSemana = document.getElementById('tituloSemana');
const inputEscolherData = document.getElementById('inputEscolherData');

let tarefas = [];
let dataAtualVisivel = new Date(); // Controla qual semana está na tela

// === CONFIGURAÇÃO DO BANCO DE DADOS NA NUVEM (GITHUB) ===
// As credenciais ficam no arquivo config.js (que não vai para o GitHub)
const GITHUB_TOKEN = CONFIG.GITHUB_TOKEN;
const GIST_ID = CONFIG.GIST_ID;

// === RELÓGIO EM TEMPO REAL ===
function atualizarRelogio() {
    const relogioContainer = document.getElementById('relogioContainer');
    if (!relogioContainer) return;

    const agora = new Date();
    const opcoes = { 
        timeZone: 'America/Sao_Paulo',
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit'
    };
    
    // Formata a data e hora para o formato brasileiro
    let dataFormatada = agora.toLocaleString('pt-BR', opcoes);
    // Capitaliza a primeira letra
    dataFormatada = dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1);
    
    relogioContainer.innerText = dataFormatada;
}

// Inicia o relógio e atualiza a cada segundo
setInterval(atualizarRelogio, 1000);
atualizarRelogio();

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
// LÓGICA DO CALENDÁRIO E DATAS
// ==========================================

// Pega a segunda-feira da semana da data fornecida
function obterSegundaFeira(data) {
    const d = new Date(data);
    const dia = d.getDay();
    const diff = d.getDate() - dia + (dia === 0 ? -6 : 1); // ajusta se for domingo
    return new Date(d.setDate(diff));
}

// Formata para salvar no banco: YYYY-MM-DD
function formatarDataIso(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

// Formata para mostrar na tela: "Segunda, 25/05"
function formatarDataExibicao(data) {
    const opcoesDia = { weekday: 'long' };
    let nomeDia = data.toLocaleDateString('pt-BR', opcoesDia);
    nomeDia = nomeDia.charAt(0).toUpperCase() + nomeDia.split('-')[0].slice(1);
    
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    return `${nomeDia}, ${dia}/${mes}`;
}

// Migrar dados antigos (Ex: "Segunda") para datas reais
function migrarTarefasAntigas() {
    let alterou = false;
    const segundaFeira = obterSegundaFeira(new Date());
    
    const mapaDias = { "Segunda": 0, "Terça": 1, "Quarta": 2, "Quinta": 3, "Sexta": 4, "Sábado": 5, "Domingo": 6 };
    
    tarefas.forEach(tarefa => {
        if (mapaDias[tarefa.dia] !== undefined) {
            const novaData = new Date(segundaFeira);
            novaData.setDate(segundaFeira.getDate() + mapaDias[tarefa.dia]);
            tarefa.dia = formatarDataIso(novaData);
            alterou = true;
        }
    });
    
    if (alterou) salvarBancoDeDados();
}

// ==========================================
// A Lógica do Kanban com Datas
// ==========================================
function renderizarTarefas() {
    migrarTarefasAntigas();
    daysContainer.innerHTML = ''; 

    const segundaFeira = obterSegundaFeira(dataAtualVisivel);
    const domingo = new Date(segundaFeira);
    domingo.setDate(segundaFeira.getDate() + 6);
    
    // Atualiza o título da semana
    tituloSemana.innerText = `Semana de ${String(segundaFeira.getDate()).padStart(2, '0')}/${String(segundaFeira.getMonth()+1).padStart(2, '0')} a ${String(domingo.getDate()).padStart(2, '0')}/${String(domingo.getMonth()+1).padStart(2, '0')}`;
    
    // Sincroniza o input de data
    inputEscolherData.value = formatarDataIso(dataAtualVisivel);

    // Gera as 7 colunas da semana
    for (let i = 0; i < 7; i++) {
        const dataColuna = new Date(segundaFeira);
        dataColuna.setDate(segundaFeira.getDate() + i);
        const dataIsoString = formatarDataIso(dataColuna);
        
        const dayBlock = document.createElement('div');
        dayBlock.className = 'day-block';

        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        dayHeader.innerText = formatarDataExibicao(dataColuna);
        dayBlock.appendChild(dayHeader);

        // Eventos de Drag and Drop para a Coluna (Recebedora)
        dayBlock.addEventListener('dragover', (e) => {
            e.preventDefault(); // Necessário para permitir o drop
        });

        dayBlock.addEventListener('dragenter', (e) => {
            e.preventDefault();
            dayBlock.classList.add('drag-over');
        });

        dayBlock.addEventListener('dragleave', (e) => {
            // Remove a classe se o mouse sair da coluna
            if (!dayBlock.contains(e.relatedTarget)) {
                dayBlock.classList.remove('drag-over');
            }
        });

        dayBlock.addEventListener('drop', (e) => {
            e.preventDefault();
            dayBlock.classList.remove('drag-over');
            
            const idTarefa = e.dataTransfer.getData('text/plain');
            const tarefaMovida = tarefas.find(t => t.id === idTarefa);
            
            if (tarefaMovida && tarefaMovida.dia !== dataIsoString) {
                tarefaMovida.dia = dataIsoString;
                renderizarTarefas();
                salvarBancoDeDados();
            }
        });

        const tarefasDoDia = tarefas.filter(tarefa => tarefa.dia === dataIsoString);

        const ul = document.createElement('ul');
        ul.className = 'task-list';

        if (tarefasDoDia.length > 0) {
            tarefasDoDia.forEach(tarefa => {
                const li = document.createElement('li');
                li.className = `task-item ${tarefa.concluida ? 'completed' : ''}`;
                
                // Torna a tarefa arrastável
                li.setAttribute('draggable', 'true');
                
                // Eventos de Drag para a Tarefa
                li.addEventListener('dragstart', (e) => {
                    li.classList.add('dragging');
                    e.dataTransfer.setData('text/plain', tarefa.id);
                });
                
                li.addEventListener('dragend', () => {
                    li.classList.remove('dragging');
                });

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
        input.id = `input-${dataIsoString}`; 
        
        input.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                adicionarTarefa(dataIsoString);
            }
        });

        const btn = document.createElement('button');
        btn.className = 'column-btn';
        btn.innerHTML = '<i class="fas fa-plus"></i>';
        btn.onclick = () => adicionarTarefa(dataIsoString);

        inputArea.appendChild(input);
        inputArea.appendChild(btn);

        dayBlock.appendChild(inputArea);

        daysContainer.appendChild(dayBlock);
    }
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

// ==========================================
// EVENTOS DOS BOTÕES DO CALENDÁRIO
// ==========================================
btnSemanaAnterior.addEventListener('click', () => {
    dataAtualVisivel.setDate(dataAtualVisivel.getDate() - 7);
    renderizarTarefas();
});

btnProximaSemana.addEventListener('click', () => {
    dataAtualVisivel.setDate(dataAtualVisivel.getDate() + 7);
    renderizarTarefas();
});

inputEscolherData.addEventListener('change', (e) => {
    if (e.target.value) {
        // Usa UTC para evitar problemas de fuso horário ao criar a data do input
        const [ano, mes, dia] = e.target.value.split('-');
        dataAtualVisivel = new Date(ano, mes - 1, dia);
        renderizarTarefas();
    }
});

// Ao iniciar, puxamos os dados da nuvem!
carregarBancoDeDados();
