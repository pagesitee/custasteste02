// Objeto global para armazenar os índices
let ipcaIndices = {};
let tiposIndices = ['IPCA-E'];
let indiceAtual = 'IPCA-E';
let hasUnsavedChanges = false;

// Função para carregar índices do Firestore
function carregarIndices() {
    db.collection("indices").doc("dados_indices").get()
        .then((doc) => {
            if (doc.exists) {
                const data = doc.data();
                ipcaIndices = data.ipcaIndices || {};
                tiposIndices = data.tiposIndices || ['IPCA-E'];
                console.log("Índices carregados com sucesso");
                atualizarSelectTipos();
                carregarTabela();
            } else {
                console.log("Nenhum dado encontrado, usando padrão");
                ipcaIndices = {};
                tiposIndices = ['IPCA-E'];
                atualizarSelectTipos();
            }
        })
        .catch((error) => {
            console.error("Erro ao carregar índices:", error);
            ipcaIndices = {};
            tiposIndices = ['IPCA-E'];
            atualizarSelectTipos();
        });
}

// Função para salvar índices no Firestore
function salvarIndices() {
    return db.collection("indices").doc("dados_indices").set({
        ipcaIndices: ipcaIndices,
        tiposIndices: tiposIndices
    })
    .then(() => {
        console.log("Índices salvos com sucesso");
        return true;
    })
    .catch((error) => {
        console.error("Erro ao salvar índices:", error);
        return false;
    });
}

// Atualizar select de tipos de índices
function atualizarSelectTipos() {
    const tipoIndiceSelect = document.getElementById('tipo-indice');
    tipoIndiceSelect.innerHTML = '';
    tiposIndices.forEach(tipo => {
        const option = document.createElement('option');
        option.value = tipo;
        option.textContent = tipo;
        tipoIndiceSelect.appendChild(option);
    });
    
    // Atualizar visibilidade do botão de excluir
    document.getElementById('delete-tipo').style.display = tiposIndices.length > 1 ? 'inline-block' : 'none';
}

// Adicionar novo tipo de índice
function adicionarNovoTipo() {
    const novoTipo = document.getElementById('novo-tipo-indice').value.trim();
    if (!novoTipo) {
        alert('Digite um nome para o novo tipo de índice');
        return;
    }
    
    if (tiposIndices.includes(novoTipo)) {
        alert('Este tipo de índice já existe');
        return;
    }
    
    tiposIndices.push(novoTipo);
    ipcaIndices[novoTipo] = {};
    
    salvarIndices().then((salvou) => {
        if (salvou) {
            atualizarSelectTipos();
            document.getElementById('tipo-indice').value = novoTipo;
            indiceAtual = novoTipo;
            document.getElementById('novo-tipo-indice').value = '';
            limparTabela();
            hasUnsavedChanges = true;
            alert(`Tipo de índice "${novoTipo}" adicionado com sucesso!`);
        } else {
            alert('Erro ao salvar o novo tipo de índice');
        }
    });
}

// Excluir tipo de índice atual
function excluirTipoAtual() {
    if (tiposIndices.length <= 1) {
        alert('Não é possível excluir o único tipo de índice disponível');
        return;
    }
    
    showConfirmation(`Tem certeza que deseja excluir o tipo de índice "${indiceAtual}"? Esta ação não pode ser desfeita.`, function() {
        // Encontrar um novo índice para selecionar
        const novoIndice = tiposIndices.find(tipo => tipo !== indiceAtual);
        
        // Remover da lista e dos dados
        tiposIndices = tiposIndices.filter(tipo => tipo !== indiceAtual);
        delete ipcaIndices[indiceAtual];
        
        // Salvar e atualizar
        salvarIndices().then((salvou) => {
            if (salvou) {
                indiceAtual = novoIndice;
                document.getElementById('tipo-indice').value = novoIndice;
                atualizarSelectTipos();
                carregarTabela();
                hasUnsavedChanges = true;
                alert(`Tipo de índice excluído com sucesso!`);
            } else {
                alert('Erro ao excluir o tipo de índice');
            }
        });
    });
}

// Limpar tabela
function limparTabela() {
    document.getElementById('table-body').innerHTML = '';
}

// Carregar tabela com dados do índice atual
function carregarTabela() {
    limparTabela();
    const indices = ipcaIndices[indiceAtual] || {};
    
    for (const year in indices) {
        adicionarLinhaAno(year, indices[year]);
    }
}

// Adicionar linha de ano na tabela
function adicionarLinhaAno(year, monthsData) {
    const row = document.createElement('tr');
    row.id = `year-${year}`;
    
    const yearCell = document.createElement('td');
    yearCell.textContent = year;
    row.appendChild(yearCell);
    
    for (let month = 1; month <= 12; month++) {
        const monthCell = document.createElement('td');
        monthCell.contentEditable = true;
        monthCell.textContent = (monthsData[month] || 0).toFixed(2).replace('.', ',');
        monthCell.addEventListener('blur', validateCell);
        row.appendChild(monthCell);
    }
    
    const actionCell = document.createElement('td');
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Excluir';
    deleteBtn.className = 'btn btn-danger btn-sm';
    deleteBtn.addEventListener('click', () => {
        showConfirmation(`Tem certeza que deseja excluir o ano ${year}?`, function() {
            row.remove();
            delete ipcaIndices[indiceAtual][year];
            hasUnsavedChanges = true;
        });
    });
    actionCell.appendChild(deleteBtn);
    row.appendChild(actionCell);
    
    document.getElementById('table-body').appendChild(row);
}

// Adicionar novo ano
function addNewYear() {
    const currentYear = new Date().getFullYear();
    let newYear = currentYear;
    
    while (document.getElementById(`year-${newYear}`)) {
        newYear--;
    }
    
    // Adiciona ano vazio
    if (!ipcaIndices[indiceAtual]) {
        ipcaIndices[indiceAtual] = {};
    }
    
    ipcaIndices[indiceAtual][newYear] = {};
    for (let i = 1; i <= 12; i++) {
        ipcaIndices[indiceAtual][newYear][i] = 0;
    }
    
    adicionarLinhaAno(newYear, ipcaIndices[indiceAtual][newYear]);
    hasUnsavedChanges = true;
}

// Validar célula editada
function validateCell(e) {
    const value = e.target.textContent.replace(',', '.');
    if (isNaN(value)) {
        e.target.textContent = '0,00';
        alert('Digite um valor numérico válido');
    } else {
        e.target.textContent = parseFloat(value).toFixed(2).replace('.', ',');
        hasUnsavedChanges = true;
        
        // Atualizar dados na memória
        const row = e.target.parentElement;
        const year = row.cells[0].textContent;
        const monthIndex = Array.from(row.cells).indexOf(e.target);
        const month = monthIndex; // A primeira célula é o ano
        
        if (!ipcaIndices[indiceAtual][year]) {
            ipcaIndices[indiceAtual][year] = {};
        }
        ipcaIndices[indiceAtual][year][month] = parseFloat(value);
    }
}

// Mostrar confirmação
function showConfirmation(message, callback) {
    document.getElementById('confirm-message').textContent = message;
    const confirmModal = document.getElementById('confirm-modal');
    
    document.getElementById('confirm-action').onclick = function() {
        callback();
        confirmModal.style.display = 'none';
    };
    
    document.getElementById('confirm-cancel').onclick = function() {
        confirmModal.style.display = 'none';
    };
    
    confirmModal.style.display = 'block';
}

// Importar dados do Excel
function importData() {
    const excelData = prompt('Cole aqui os dados copiados do Excel (formato: Ano;Jan;Fev;Mar;Abr;Mai;Jun;Jul;Ago;Set;Out;Nov;Dez)');
    if (!excelData) return;
    
    try {
        const lines = excelData.split('\n');
        const newData = {};
        
        // Pula o cabeçalho se existir
        const startLine = lines[0].startsWith('Ano') ? 1 : 0;
        
        for (let i = startLine; i < lines.length; i++) {
            const cells = lines[i].split(';');
            if (cells.length >= 13) {
                const year = cells[0].trim();
                newData[year] = {};
                
                for (let month = 1; month <= 12; month++) {
                    const value = parseFloat(cells[month].replace(',', '.'));
                    newData[year][month] = isNaN(value) ? 0 : value;
                }
            }
        }
        
        // Atualiza a tabela com os novos dados
        ipcaIndices[indiceAtual] = newData;
        limparTabela();
        carregarTabela();
        hasUnsavedChanges = true;
        alert('Dados importados com sucesso!');
    } catch (e) {
        alert('Erro ao importar dados. Verifique o formato e tente novamente.');
        console.error(e);
    }
}

// Exportar dados para Excel
function exportData() {
    let csvContent = "Ano;Jan;Fev;Mar;Abr;Mai;Jun;Jul;Ago;Set;Out;Nov;Dez\n";
    
    document.querySelectorAll('#table-body tr').forEach(row => {
        const rowData = [row.cells[0].textContent];
        for (let i = 1; i <= 12; i++) {
            rowData.push(row.cells[i].textContent);
        }
        csvContent += rowData.join(';') + "\n";
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `indices_${indiceAtual}.csv`;
    link.click();
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Carrega os índices ao iniciar
    carregarIndices();
    
    // Configura os event listeners
    document.getElementById('add-year').addEventListener('click', addNewYear);
    document.getElementById('save-data').addEventListener('click', function() {
        salvarIndices().then((salvou) => {
            if (salvou) {
                hasUnsavedChanges = false;
                alert('Dados salvos com sucesso!');
            } else {
                alert('Erro ao salvar os dados. Tente novamente.');
            }
        });
    });
    document.getElementById('import-data').addEventListener('click', importData);
    document.getElementById('export-data').addEventListener('click', exportData);
    document.getElementById('add-tipo-indice').addEventListener('click', adicionarNovoTipo);
    document.getElementById('delete-tipo').addEventListener('click', excluirTipoAtual);
    document.getElementById('tipo-indice').addEventListener('change', function() {
        indiceAtual = this.value;
        carregarTabela();
    });
    document.getElementById('back-btn').addEventListener('click', function() {
        if (hasUnsavedChanges) {
            showConfirmation('Você tem alterações não salvas. Deseja realmente sair?', function() {
                window.location.href = 'index.html';
            });
        } else {
            window.location.href = 'index.html';
        }
    });

    // Verificar se há alterações não salvas ao sair da página
    window.addEventListener('beforeunload', function(e) {
        if (hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = 'Você tem alterações não salvas. Deseja realmente sair?';
        }
    });
});