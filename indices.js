// Variáveis globais
let ipcaIndices = {};
let tiposIndices = ['IPCA-E'];
let indiceAtual = 'IPCA-E';
let hasUnsavedChanges = false;

// Função para carregar índices do Firestore
function carregarIndices() {
    return db.collection("indices").doc("dados_indices").get()
        .then((doc) => {
            if (doc.exists) {
                const data = doc.data();
                ipcaIndices = data.ipcaIndices || {};
                tiposIndices = data.tiposIndices || ['IPCA-E'];
                console.log("Índices carregados:", ipcaIndices);
                return true;
            } else {
                console.log("Nenhum dado encontrado, iniciando com padrão");
                ipcaIndices = { 'IPCA-E': {} };
                tiposIndices = ['IPCA-E'];
                return false;
            }
        })
        .catch((error) => {
            console.error("Erro ao carregar:", error);
            return false;
        });
}

// Função para salvar índices no Firestore
function salvarIndices() {
    return db.collection("indices").doc("dados_indices").set({
        ipcaIndices: ipcaIndices,
        tiposIndices: tiposIndices
    }, { merge: true })
    .then(() => {
        console.log("Dados salvos com sucesso");
        hasUnsavedChanges = false;
        return true;
    })
    .catch((error) => {
        console.error("Erro ao salvar:", error);
        return false;
    });
}

// Atualiza o select de tipos de índices
function atualizarSelectTipos() {
    const select = document.getElementById('tipo-indice');
    select.innerHTML = '';
    
    tiposIndices.forEach(tipo => {
        const option = document.createElement('option');
        option.value = tipo;
        option.textContent = tipo;
        select.appendChild(option);
    });
    
    // Mostra/oculta botão de excluir
    document.getElementById('delete-tipo').style.display = 
        tiposIndices.length > 1 ? 'block' : 'none';
}

// Adiciona novo tipo de índice
function adicionarNovoTipo() {
    const input = document.getElementById('novo-tipo-indice');
    const novoTipo = input.value.trim();
    
    if (!novoTipo) {
        alert("Digite um nome para o novo índice");
        return;
    }
    
    if (tiposIndices.includes(novoTipo)) {
        alert("Este tipo de índice já existe");
        return;
    }
    
    tiposIndices.push(novoTipo);
    ipcaIndices[novoTipo] = {};
    
    salvarIndices().then(success => {
        if (success) {
            input.value = '';
            indiceAtual = novoTipo;
            atualizarSelectTipos();
            carregarTabela();
            alert(`Índice ${novoTipo} adicionado!`);
        }
    });
}

// Remove tipo de índice
function excluirTipoAtual() {
    if (tiposIndices.length <= 1) {
        alert("Não é possível excluir o último tipo de índice");
        return;
    }
    
    showConfirmation(`Excluir o índice ${indiceAtual}?`, () => {
        const novoIndice = tiposIndices.find(t => t !== indiceAtual);
        
        tiposIndices = tiposIndices.filter(t => t !== indiceAtual);
        delete ipcaIndices[indiceAtual];
        indiceAtual = novoIndice;
        
        salvarIndices().then(success => {
            if (success) {
                atualizarSelectTipos();
                carregarTabela();
            }
        });
    });
}

// Limpa a tabela
function limparTabela() {
    document.getElementById('table-body').innerHTML = '';
}

// Carrega dados na tabela
function carregarTabela() {
    limparTabela();
    const tbody = document.getElementById('table-body');
    const dados = ipcaIndices[indiceAtual] || {};
    
    Object.keys(dados).sort().reverse().forEach(ano => {
        adicionarLinhaAno(ano, dados[ano]);
    });
}

// Adiciona linha de ano na tabela
function adicionarLinhaAno(ano, meses) {
    const row = document.createElement('tr');
    row.id = `row-${ano}`;
    
    // Célula do ano
    const anoCell = document.createElement('td');
    anoCell.textContent = ano;
    row.appendChild(anoCell);
    
    // Células dos meses (1-12)
    for (let i = 1; i <= 12; i++) {
        const cell = document.createElement('td');
        cell.contentEditable = true;
        cell.textContent = (meses[i] || 0).toFixed(2).replace('.', ',');
        cell.addEventListener('blur', () => atualizarValor(ano, i, cell));
        row.appendChild(cell);
    }
    
    // Célula de ações
    const acoesCell = document.createElement('td');
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-danger btn-sm';
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Excluir';
    deleteBtn.addEventListener('click', () => {
        showConfirmation(`Excluir o ano ${ano}?`, () => {
            delete ipcaIndices[indiceAtual][ano];
            row.remove();
            hasUnsavedChanges = true;
        });
    });
    acoesCell.appendChild(deleteBtn);
    row.appendChild(acoesCell);
    
    document.getElementById('table-body').appendChild(row);
}

// Atualiza valor quando editado
function atualizarValor(ano, mes, cell) {
    const valor = parseFloat(cell.textContent.replace(',', '.')) || 0;
    
    if (!ipcaIndices[indiceAtual][ano]) {
        ipcaIndices[indiceAtual][ano] = {};
    }
    
    ipcaIndices[indiceAtual][ano][mes] = valor;
    cell.textContent = valor.toFixed(2).replace('.', ',');
    hasUnsavedChanges = true;
}

// Adiciona novo ano
function adicionarAno() {
    const currentYear = new Date().getFullYear();
    let novoAno = currentYear;
    
    // Encontra o primeiro ano disponível
    while (ipcaIndices[indiceAtual] && ipcaIndices[indiceAtual][novoAno]) {
        novoAno--;
    }
    
    if (!ipcaIndices[indiceAtual]) {
        ipcaIndices[indiceAtual] = {};
    }
    
    ipcaIndices[indiceAtual][novoAno] = {};
    adicionarLinhaAno(novoAno, {});
    hasUnsavedChanges = true;
}

// Mostra modal de confirmação
function showConfirmation(message, callback) {
    const modal = document.getElementById('confirm-modal');
    document.getElementById('confirm-message').textContent = message;
    
    document.getElementById('confirm-action').onclick = function() {
        callback();
        modal.style.display = 'none';
    };
    
    document.getElementById('confirm-cancel').onclick = 
    document.getElementById('confirm-close').onclick = function() {
        modal.style.display = 'none';
    };
    
    modal.style.display = 'block';
}

// Importa dados do Excel
function importarDados() {
    const dados = prompt("Cole os dados no formato: Ano;Jan;Fev;Mar;Abr;Mai;Jun;Jul;Ago;Set;Out;Nov;Dez");
    if (!dados) return;
    
    try {
        const linhas = dados.split('\n');
        const novosDados = {};
        
        linhas.forEach(linha => {
            const valores = linha.split(';');
            if (valores.length >= 13) {
                const ano = valores[0].trim();
                novosDados[ano] = {};
                
                for (let i = 1; i <= 12; i++) {
                    novosDados[ano][i] = parseFloat(valores[i].replace(',', '.')) || 0;
                }
            }
        });
        
        ipcaIndices[indiceAtual] = novosDados;
        carregarTabela();
        hasUnsavedChanges = true;
        alert("Dados importados com sucesso!");
    } catch (e) {
        alert("Formato inválido! Use o formato especificado.");
        console.error(e);
    }
}

// Exporta dados para CSV
function exportarDados() {
    let csv = "Ano;Jan;Fev;Mar;Abr;Mai;Jun;Jul;Ago;Set;Out;Nov;Dez\n";
    const dados = ipcaIndices[indiceAtual] || {};
    
    Object.keys(dados).sort().reverse().forEach(ano => {
        const meses = dados[ano];
        const valores = [ano];
        
        for (let i = 1; i <= 12; i++) {
            valores.push((meses[i] || 0).toFixed(2).replace('.', ','));
        }
        
        csv += valores.join(';') + "\n";
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `indices-${indiceAtual}.csv`;
    link.click();
}

// Inicialização quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    // Carrega os dados iniciais
    carregarIndices().then(() => {
        atualizarSelectTipos();
        carregarTabela();
    });
    
    // Configura os eventos
    document.getElementById('add-year').addEventListener('click', adicionarAno);
    document.getElementById('save-data').addEventListener('click', () => {
        salvarIndices().then(success => {
            if (success) {
                alert("Dados salvos com sucesso!");
            }
        });
    });
    document.getElementById('add-tipo-indice').addEventListener('click', adicionarNovoTipo);
    document.getElementById('delete-tipo').addEventListener('click', excluirTipoAtual);
    document.getElementById('tipo-indice').addEventListener('change', function() {
        indiceAtual = this.value;
        carregarTabela();
    });
    document.getElementById('import-data').addEventListener('click', importarDados);
    document.getElementById('export-data').addEventListener('click', exportarDados);
    document.getElementById('back-btn').addEventListener('click', function() {
        if (hasUnsavedChanges) {
            showConfirmation("Há alterações não salvas. Deseja sair?", () => {
                window.location.href = 'index.html';
            });
        } else {
            window.location.href = 'index.html';
        }
    });
    
    // Verifica alterações não salvas ao sair
    window.addEventListener('beforeunload', function(e) {
        if (hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = 'Há alterações não salvas. Deseja realmente sair?';
        }
    });
});
