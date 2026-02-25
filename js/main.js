// Configurações
const CONFIG = {
    IMGBB_API_KEY: '842858fd782df13d60f19471d8cd74ce', // Substitua pela sua chave padrão
    WHATSAPP_NUMBER: '258853405441', // Número com código do país (258 para Moçambique)
    WHATSAPP_MESSAGE_TEMPLATE: (data) => {
        return `*NOVA SOLICITAÇÃO DE ORÇAMENTO - A42Construções*
        
👤 *CLIENTE*
Nome: ${data.clientName}
Email: ${data.clientEmail}
Telefone: ${data.clientPhone}
Tipo: ${data.clientRole}

🏗️ *PROJETO*
Tipo: ${data.projectType}
Categoria: ${data.projectCategory}
Área: ${data.projectArea} m²
Localização: ${data.projectLocation}

📋 *DETALHES ESPECÍFICOS*
${data.specificDetails}

💰 *ORÇAMENTO*
Faixa: ${data.budgetRange}
Prazo: ${data.projectTimeline}

📎 *LINKS DE REFERÊNCIA*
${data.referenceLinks || 'Nenhum link fornecido'}

🖼️ *IMAGENS ENVIADAS*
${data.imageUrls.length > 0 ? data.imageUrls.map((url, i) => `${i+1}. ${url}`).join('\n') : 'Nenhuma imagem enviada'}

📝 *DESCRIÇÃO*
${data.projectDescription}

⏰ *DATA/HORA*
${new Date().toLocaleString('pt-BR')}`;
    }
};

// Classe para gerenciar uploads para ImageBB
class ImageBBUploader {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.uploadedUrls = [];
    }

    async uploadImage(file, customKey = null) {
        const key = customKey || this.apiKey || CONFIG.IMGBB_API_KEY;
        
        if (!key) {
            throw new Error('Chave da API ImageBB não fornecida');
        }

        const formData = new FormData();
        formData.append('key', key);
        formData.append('image', file);
        formData.append('name', file.name.replace(/\.[^/.]+$/, '')); // Remove extensão para o nome

        try {
            const response = await fetch('https://api.imgbb.com/1/upload', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                return {
                    success: true,
                    url: data.data.url,
                    display_url: data.data.display_url,
                    thumb_url: data.data.thumb.url,
                    medium_url: data.data.medium?.url,
                    delete_url: data.data.delete_url
                };
            } else {
                throw new Error(data.error?.message || 'Erro no upload');
            }
        } catch (error) {
            console.error('Erro no upload para ImageBB:', error);
            throw error;
        }
    }

    async uploadMultipleFiles(files, customKey = null, onProgress = null) {
        const results = [];
        const total = files.length;

        for (let i = 0; i < files.length; i++) {
            try {
                const file = files[i];
                
                // Validar tamanho (máximo 32MB)
                if (file.size > 32 * 1024 * 1024) {
                    throw new Error(`Arquivo ${file.name} excede 32MB`);
                }

                // Validar tipo
                if (!file.type.startsWith('image/')) {
                    throw new Error(`Arquivo ${file.name} não é uma imagem`);
                }

                const result = await this.uploadImage(file, customKey);
                results.push({
                    ...result,
                    originalName: file.name,
                    size: file.size,
                    type: file.type
                });

                if (onProgress) {
                    onProgress({
                        current: i + 1,
                        total,
                        file: file.name,
                        url: result.url
                    });
                }

            } catch (error) {
                results.push({
                    error: true,
                    message: error.message,
                    originalName: files[i].name
                });
            }
        }

        return results;
    }
}

// Classe para envio via WhatsApp
class WhatsAppSender {
    constructor(phoneNumber) {
        this.phoneNumber = phoneNumber.replace(/\D/g, '');
    }

    sendMessage(message) {
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://api.whatsapp.com/send?phone=${this.phoneNumber}&text=${encodedMessage}`;
        
        // Abrir em nova aba
        window.open(whatsappUrl, '_blank');
        
        // Opção para fallback se não abrir
        setTimeout(() => {
            const confirm = window.confirm('O WhatsApp não abriu? Clique OK para copiar a mensagem e enviar manualmente.');
            if (confirm) {
                navigator.clipboard.writeText(message).then(() => {
                    alert('Mensagem copiada! Cole no WhatsApp.');
                });
            }
        }, 2000);
    }
}

// Form Handler Principal
document.addEventListener('DOMContentLoaded', function() {
    const budgetForm = document.getElementById('budget-form');
    const fileUploadArea = document.getElementById('file-upload-area');
    const fileInput = document.getElementById('reference-files');
    const filePreview = document.getElementById('file-preview');
    const imgbbKeyInput = document.getElementById('imgbb-key-user');
    const submitBtn = budgetForm?.querySelector('button[type="submit"]');
    
    let selectedFiles = [];
    let uploader = new ImageBBUploader(CONFIG.IMGBB_API_KEY);

    // Upload Area Handlers
    if (fileUploadArea) {
        fileUploadArea.addEventListener('click', () => fileInput.click());

        fileUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileUploadArea.classList.add('dragover');
        });

        fileUploadArea.addEventListener('dragleave', () => {
            fileUploadArea.classList.remove('dragover');
        });

        fileUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            fileUploadArea.classList.remove('dragover');
            handleFiles(e.dataTransfer.files);
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            handleFiles(e.target.files);
        });
    }

    function handleFiles(files) {
        const newFiles = Array.from(files);
        
        // Filtrar apenas imagens
        const imageFiles = newFiles.filter(file => file.type.startsWith('image/'));
        
        if (imageFiles.length !== newFiles.length) {
            alert('Apenas imagens são suportadas para upload. Outros tipos de arquivo serão ignorados.');
        }

        // Limitar número de arquivos (opcional)
        const MAX_FILES = 10;
        if (selectedFiles.length + imageFiles.length > MAX_FILES) {
            alert(`Máximo de ${MAX_FILES} imagens permitidas.`);
            return;
        }

        selectedFiles = [...selectedFiles, ...imageFiles];
        updateFilePreview();
        
        // Atualizar o input files
        const dataTransfer = new DataTransfer();
        selectedFiles.forEach(file => dataTransfer.items.add(file));
        fileInput.files = dataTransfer.files;
    }

    function updateFilePreview() {
        if (!filePreview) return;

        filePreview.innerHTML = '';
        
        selectedFiles.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const previewItem = document.createElement('div');
                previewItem.className = 'file-preview-item';
                previewItem.innerHTML = `
                    <img src="${e.target.result}" alt="${file.name}">
                    <span class="remove-file" data-index="${index}">&times;</span>
                    <span class="file-size">${(file.size / 1024).toFixed(1)}KB</span>
                `;
                
                previewItem.querySelector('.remove-file').addEventListener('click', () => {
                    removeFile(index);
                });
                
                filePreview.appendChild(previewItem);
            };
            reader.readAsDataURL(file);
        });
    }

    function removeFile(index) {
        selectedFiles.splice(index, 1);
        
        // Atualizar o input files
        const dataTransfer = new DataTransfer();
        selectedFiles.forEach(file => dataTransfer.items.add(file));
        fileInput.files = dataTransfer.files;
        
        updateFilePreview();
    }

    // Form Submit Handler
    if (budgetForm) {
        budgetForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Validação básica
            if (!this.checkValidity()) {
                this.reportValidity();
                return;
            }

            // Desabilitar botão durante processo
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
            }

            // Criar overlay de progresso
            const progressOverlay = createProgressOverlay();
            document.body.appendChild(progressOverlay);

            try {
                // Coletar dados do formulário
                const formData = collectFormData();
                
                // Fazer upload das imagens
                let uploadedUrls = [];
                if (selectedFiles.length > 0) {
                    progressOverlay.querySelector('.progress-status').textContent = 
                        `Enviando ${selectedFiles.length} imagem(ns) para ImageBB...`;
                    
                    const customKey = imgbbKeyInput?.value || CONFIG.IMGBB_API_KEY;
                    
                    uploader = new ImageBBUploader(customKey);
                    
                    const uploadResults = await uploader.uploadMultipleFiles(
                        selectedFiles, 
                        customKey,
                        (progress) => {
                            progressOverlay.querySelector('.progress-bar-fill').style.width = 
                                `${(progress.current / progress.total) * 100}%`;
                            progressOverlay.querySelector('.progress-status').textContent = 
                                `Enviando ${progress.current} de ${progress.total}: ${progress.file}`;
                        }
                    );
                    
                    // Filtrar resultados bem-sucedidos
                    uploadedUrls = uploadResults
                        .filter(r => !r.error)
                        .map(r => r.url);
                    
                    // Mostrar erros se houver
                    const errors = uploadResults.filter(r => r.error);
                    if (errors.length > 0) {
                        console.warn('Erros no upload:', errors);
                        alert(`${errors.length} imagem(ns) não puderam ser enviadas. Verifique o console.`);
                    }
                }

                // Adicionar URLs das imagens aos dados
                formData.imageUrls = uploadedUrls;

                // Criar mensagem para WhatsApp
                const message = CONFIG.WHATSAPP_MESSAGE_TEMPLATE(formData);
                
                // Enviar para WhatsApp
                progressOverlay.querySelector('.progress-status').textContent = 'Abrindo WhatsApp...';
                
                const sender = new WhatsAppSender(CONFIG.WHATSAPP_NUMBER);
                sender.sendMessage(message);

                // Salvar cópia local (opcional)
                saveLocalBackup(formData, uploadedUrls);

                // Mostrar sucesso
                setTimeout(() => {
                    progressOverlay.remove();
                    showSuccessMessage();
                    budgetForm.reset();
                    selectedFiles = [];
                    updateFilePreview();
                }, 2000);

            } catch (error) {
                console.error('Erro no processamento:', error);
                progressOverlay.remove();
                alert('Erro ao processar solicitação: ' + error.message);
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = 'Enviar Solicitação de Orçamento';
                }
            }
        });
    }

    function collectFormData() {
        // Coletar valores básicos
        const projectType = document.getElementById('project-type')?.value;
        const projectCategory = document.getElementById('project-category')?.value;
        
        // Coletar detalhes específicos baseado no tipo de projeto
        let specificDetails = '';
        
        if (projectType === 'residential') {
            specificDetails = `
Quartos: ${document.getElementById('rooms')?.value || '0'}
Banheiros: ${document.getElementById('bathrooms')?.value || '0'}
Pavimentos: ${document.getElementById('floors')?.value || '1'}
Garagem: ${document.getElementById('garage')?.value || '0'}
Serviços: ${getCheckedValues('residential-services')}
            `;
        } else if (projectType === 'commercial') {
            specificDetails = `
Tipo Comercial: ${document.getElementById('commercial-type')?.value}
Ambientes: ${document.getElementById('commercial-rooms')?.value}
Banheiros: ${document.getElementById('bathrooms-commercial')?.value}
Estacionamento: ${document.getElementById('parking-spots')?.value}
Serviços: ${getCheckedValues('commercial-services')}
            `;
        } else if (projectType === 'wall') {
            specificDetails = `
Comprimento: ${document.getElementById('wall-length')?.value}m
Altura: ${document.getElementById('wall-height')?.value}m
Tipo: ${document.getElementById('wall-type')?.value}
Fundação: ${document.getElementById('wall-foundation')?.value}
Características: ${getCheckedValues('wall-features')}
            `;
        }

        return {
            clientName: document.getElementById('client-name')?.value,
            clientEmail: document.getElementById('client-email')?.value,
            clientPhone: document.getElementById('client-phone')?.value,
            clientRole: document.getElementById('client-role')?.value,
            projectType: projectType,
            projectCategory: projectCategory,
            projectArea: document.getElementById('project-area')?.value,
            projectLocation: document.getElementById('project-location')?.value,
            projectDescription: document.getElementById('project-description')?.value,
            projectTimeline: document.getElementById('project-timeline')?.value,
            budgetRange: document.getElementById('budget-range')?.value,
            referenceLinks: document.getElementById('reference-links')?.value,
            specificDetails: specificDetails,
            imageUrls: []
        };
    }

    function getCheckedValues(name) {
        const checkboxes = document.querySelectorAll(`input[name="${name}"]:checked`);
        return Array.from(checkboxes).map(cb => cb.value).join(', ') || 'Nenhum';
    }

    function createProgressOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'progress-overlay';
        overlay.innerHTML = `
            <div class="progress-container">
                <h3><i class="fas fa-cloud-upload-alt"></i> Processando sua solicitação</h3>
                <div class="progress-bar">
                    <div class="progress-bar-fill" style="width: 0%"></div>
                </div>
                <p class="progress-status">Preparando arquivos...</p>
            </div>
        `;
        return overlay;
    }

    function showSuccessMessage() {
        const msg = document.createElement('div');
        msg.className = 'success-message';
        msg.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <h3>Solicitação Enviada com Sucesso!</h3>
            <p>Seus dados foram enviados para nosso WhatsApp. Entraremos em contato em breve.</p>
        `;
        document.body.appendChild(msg);
        
        setTimeout(() => msg.remove(), 5000);
    }

    function saveLocalBackup(formData, imageUrls) {
        // Salvar no localStorage como backup
        const backup = {
            ...formData,
            timestamp: new Date().toISOString(),
            imageUrls: imageUrls
        };
        
        const backups = JSON.parse(localStorage.getItem('budget_backups') || '[]');
        backups.push(backup);
        localStorage.setItem('budget_backups', JSON.stringify(backups.slice(-10))); // Manter últimos 10
    }
});

// Dynamic Fields (código existente mantido)
document.addEventListener('DOMContentLoaded', function() {
    const projectType = document.getElementById('project-type');
    const projectCategory = document.getElementById('project-category');
    
    const categories = {
        residential: [
            {value: 'house', label: 'Casa'},
            {value: 'apartment', label: 'Apartamento'},
            {value: 'duplex', label: 'Duplex'},
            {value: 'townhouse', label: 'Sobrado'},
            {value: 'country-house', label: 'Casa de Campo'},
            {value: 'other-residential', label: 'Outro'}
        ],
        commercial: [
            {value: 'store', label: 'Loja/Comércio'},
            {value: 'office', label: 'Escritório'},
            {value: 'restaurant', label: 'Restaurante/Bar'},
            {value: 'hotel', label: 'Hotel/Pousada'},
            {value: 'clinic', label: 'Clínica Médica'},
            {value: 'gym', label: 'Academia'},
            {value: 'other-commercial', label: 'Outro'}
        ],
        industrial: [
            {value: 'factory', label: 'Fábrica'},
            {value: 'warehouse', label: 'Armazém/Galpão'},
            {value: 'industrial-shed', label: 'Galpão Industrial'},
            {value: 'other-industrial', label: 'Outro'}
        ],
        reform: [
            {value: 'residential-reform', label: 'Reforma Residencial'},
            {value: 'commercial-reform', label: 'Reforma Comercial'},
            {value: 'expansion', label: 'Ampliação'},
            {value: 'facade', label: 'Reforma de Fachada'},
            {value: 'other-reform', label: 'Outro'}
        ],
        wall: [
            {value: 'boundary-wall', label: 'Muro de Vedação'},
            {value: 'retaining-wall', label: 'Muro de Arrimo'},
            {value: 'decoration-wall', label: 'Muro Decorativo'},
            {value: 'security-wall', label: 'Muro de Segurança'},
            {value: 'other-wall', label: 'Outro'}
        ],
        other: [
            {value: 'other-project', label: 'Outro Tipo de Projeto'}
        ]
    };
    
    if (projectType) {
        projectType.addEventListener('change', function() {
            // Hide all dynamic fields
            document.querySelectorAll('.dynamic-fields').forEach(field => {
                field.style.display = 'none';
            });
            
            // Clear and populate category dropdown
            if (projectCategory) {
                projectCategory.innerHTML = '<option value="">Selecione...</option>';
                
                if (this.value && categories[this.value]) {
                    categories[this.value].forEach(category => {
                        const option = document.createElement('option');
                        option.value = category.value;
                        option.textContent = category.label;
                        projectCategory.appendChild(option);
                    });
                    
                    // Show relevant dynamic fields
                    if (this.value === 'residential') {
                        document.getElementById('residential-fields').style.display = 'block';
                    } else if (this.value === 'commercial') {
                        document.getElementById('commercial-fields').style.display = 'block';
                    } else if (this.value === 'wall') {
                        document.getElementById('wall-fields').style.display = 'block';
                    }
                } else {
                    projectCategory.innerHTML = '<option value="">Selecione o tipo primeiro</option>';
                }
            }
        });
    }
});