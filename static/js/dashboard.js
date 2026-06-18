// Dashboard Admin - JavaScript
const API_BASE = '/api';

// Charts globales
let chartCategoria, chartGrades, chartTendencia;
let chartTendenciaTemporal, chartNiveles, chartTopRutas, chartMetricasPromedio;
let tablaAnalisis;

// Vista actual
let vistaActual = 'cards';

// Variables de paginación
let paginaActual = 1;
const analisisPorPagina = 12;
let totalAnalisis = 0;
let analisisCache = [];

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Iniciando Dashboard Admin...');
    console.log('✅ XLSX library status:', typeof XLSX !== 'undefined' ? 'Loaded' : 'NOT LOADED');
    cargarCategorias();  // Cargar categorías primero
    cargarTipos5W();     // Cargar tipos de 5W
    cargarMeses();       // Cargar meses disponibles
    cargarNiveles();    // Cargar niveles (Básico/Intermedio/Sostenible)
    cargarEstadisticas();
    cargarAnalisis();
    cargarMejoresYPeores();  // Cargar mejores y peores análisis
    initCharts();
    setupUploadArea();
});

// ============================================================================
// Aplicar Filtros - Recarga estadísticas y análisis
// ============================================================================

function aplicarFiltros() {
    console.log('🔄 Aplicando filtros...');
    cargarEstadisticas();  // Recargar estadísticas con filtros
    cargarAnalisis();      // Recargar lista/cards
    cargarMejoresYPeores(); // Recargar mejores y peores
    if (vistaActual === 'tabla') {
        cargarTablaCompleta();  // Si estamos en vista tabla, recargarla también
    }
    // Recargar gráficas adicionales
    cargarGraficasAdicionales();
}

// ============================================================================
// Estadísticas
// ============================================================================

async function cargarEstadisticas() {
    try {
        // Obtener filtros activos
    const categoria = document.getElementById('filter-categoria')?.value || '';
    const tipo5w = document.getElementById('filter-tipo-5w')?.value || '';
    const mes = document.getElementById('filter-mes')?.value || '';
    const nivel = document.getElementById('filter-nivel')?.value || '';
        
        // Construir parámetros de query
        const params = new URLSearchParams();
        if (categoria) params.append('categoria', categoria);
        if (tipo5w) params.append('tipo_5w', tipo5w);
    if (mes) params.append('mes', mes);
    if (nivel) params.append('nivel', nivel);
        
        const queryString = params.toString();
        const url = `${API_BASE}/estadisticas${queryString ? '?' + queryString : ''}`;
        
        const response = await axios.get(url);
        const stats = response.data.data;
        
        // Actualizar contadores con datos filtrados
        document.getElementById('stat-total').textContent = stats.total || 0;
        document.getElementById('stat-promedio').textContent = (stats.promedio_score || 0).toFixed(1);
        document.getElementById('stat-coherencia').textContent = (stats.coherencia_media || 0).toFixed(1);
        document.getElementById('stat-causa').textContent = (stats.causa_media || 0).toFixed(1);
        
        // Actualizar gráficos con datos filtrados
        actualizarChartCategoria(stats.por_categoria || []);
        actualizarChartGrades(stats.por_grade || []);
        
        // Mostrar indicador de filtros activos
        mostrarIndicadorFiltros(stats.filtros_activos, stats.total);
        
        // Cargar tendencia con filtros
        cargarTendencia();
        
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
        mostrarNotificacion('Error cargando estadísticas', 'error');
    }
}

function mostrarIndicadorFiltros(filtros, total) {
    let indicador = document.getElementById('filtros-activos-badge');
    
    // Si no existe, crear el indicador
    if (!indicador) {
        const statsHeader = document.querySelector('.stats-header');
        if (statsHeader) {
            indicador = document.createElement('div');
            indicador.id = 'filtros-activos-badge';
            indicador.style.cssText = 'margin-top: 10px; padding: 8px 12px; background: #e3f2fd; border-radius: 4px; font-size: 13px; color: #1976d2;';
            statsHeader.appendChild(indicador);
        }
    }
    
    if (!indicador) return;
    
    // Construir texto del indicador
    const filtrosActivos = [];
    if (filtros.mes) {
        const [year, month] = filtros.mes.split('-');
        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        filtrosActivos.push(`${meses[parseInt(month) - 1]} ${year}`);
    }
    if (filtros.tipo_5w) filtrosActivos.push(`Tipo: ${filtros.tipo_5w}`);
    if (filtros.categoria) filtrosActivos.push(`Categoría: ${filtros.categoria}`);
    if (filtros.nivel) {
        filtrosActivos.push(`Nivel: ${filtros.nivel}`);
    }
    
    if (filtrosActivos.length > 0) {
        indicador.innerHTML = `📊 Mostrando: ${filtrosActivos.join(' | ')} - <strong>${total} análisis</strong>`;
        indicador.style.display = 'block';
    } else {
        indicador.innerHTML = `📊 Mostrando todos los análisis - <strong>${total} total</strong>`;
        indicador.style.display = 'block';
    }
}

function mostrarMejores(mejores) {
    const container = document.getElementById('mejores-list');
    container.innerHTML = mejores.map(a => `
        <div class="mini-item" onclick="verDetalle(${a.id})">
            <div>
                <strong>${a.ruta}</strong> - ${a.categoria}
            </div>
            <div class="grade-badge grade-${a.grade.toLowerCase().charAt(0)}">
                ${a.grade} (${a.score.toFixed(1)})
            </div>
        </div>
    `).join('');
}

function mostrarPeores(peores) {
    const container = document.getElementById('peores-list');
    container.innerHTML = peores.map(a => `
        <div class="mini-item" onclick="verDetalle(${a.id})">
            <div>
                <strong>${a.ruta}</strong> - ${a.categoria}
            </div>
            <div class="grade-badge grade-${a.grade.toLowerCase().charAt(0)}">
                ${a.grade} (${a.score.toFixed(1)})
            </div>
        </div>
    `).join('');
}

async function cargarMejoresYPeores() {
    try {
        // Cargar mejores análisis (orden descendente por score, modo individual)
        const mejoresResponse = await axios.get(`${API_BASE}/graficas/top-rutas?orden=mas&limit=5&tipo=individual`);
        const mejores = mejoresResponse.data.data || [];
        
        if (mejores.length > 0) {
            mostrarMejores(mejores);
        } else {
            document.getElementById('mejores-list').innerHTML = '<p style="text-align:center;color:#999;">No hay análisis evaluados</p>';
        }
        
        // Cargar peores análisis (orden ascendente por score, modo individual)
        const peoresResponse = await axios.get(`${API_BASE}/graficas/top-rutas?orden=menos&limit=5&tipo=individual`);
        const peores = peoresResponse.data.data || [];
        
        if (peores.length > 0) {
            mostrarPeores(peores);
        } else {
            document.getElementById('peores-list').innerHTML = '<p style="text-align:center;color:#999;">No hay análisis evaluados</p>';
        }
    } catch (error) {
        console.error('Error cargando mejores/peores:', error);
        document.getElementById('mejores-list').innerHTML = '<p style="text-align:center;color:#f44;">Error al cargar</p>';
        document.getElementById('peores-list').innerHTML = '<p style="text-align:center;color:#f44;">Error al cargar</p>';
    }
}

// ============================================================================
// Categorías
// ============================================================================

async function cargarCategorias() {
    try {
        const response = await axios.get(`${API_BASE}/categorias`);
        const categorias = response.data.data;
        
        // Actualizar ambos selects de categoría
        const selects = ['filter-categoria', 'filter-categoria-tabla'];
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                // Guardar opción seleccionada
                const valorActual = select.value;
                
                // Limpiar y agregar opción "Todas"
                select.innerHTML = '<option value="">Todas las categorías</option>';
                
                // Agregar categorías dinámicamente
                categorias.forEach(cat => {
                    const option = document.createElement('option');
                    option.value = cat.nombre;
                    option.textContent = `${cat.nombre} (${cat.count})`;
                    select.appendChild(option);
                });
                
                // Restaurar selección
                select.value = valorActual;
            }
        });
        
    } catch (error) {
        console.error('Error cargando categorías:', error);
    }
        // Also ensure niveles are loaded for table select if available
        // cargarNiveles will handle nivel selects population
}

async function cargarNiveles() {
    try {
        const response = await axios.get(`${API_BASE}/niveles`);
        const niveles = response.data.data || [];

        // Populate both selects: main filters and table filters
        const selects = ['filter-nivel', 'filter-nivel-tabla'];
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (!select) return;
            const current = select.value;
            if (!niveles || niveles.length === 0) {
                select.innerHTML = '<option value="">Todos los Niveles</option>';
                select.disabled = false;
            } else {
                select.innerHTML = '<option value="">Todos los Niveles</option>';
                niveles.forEach(n => {
                    const opt = document.createElement('option');
                    opt.value = n.valor;
                    opt.textContent = `${n.nombre} (${n.count})`;
                    select.appendChild(opt);
                });
            }
            select.value = current;
        });

    } catch (error) {
        console.error('Error cargando niveles:', error);
    }
}

async function cargarTipos5W() {
    try {
        const response = await axios.get(`${API_BASE}/tipos-5w`);
        const tipos = response.data.data;
        
    // Actualizar ambos selects de tipo 5W
    const selects = ['filter-tipo-5w', 'filter-tipo-5w-tabla'];
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                // Guardar opción seleccionada
                const valorActual = select.value;
                
                // Limpiar y agregar opción "Todos"
                if (tipos.length === 0) {
                    select.innerHTML = '<option value="">Todos los Tipos de 5W</option>';
                    select.disabled = false;
                } else {
                    select.innerHTML = '<option value="">Todos los Tipos de 5W</option>';
                    select.disabled = false;
                    
                    // Agregar tipos dinámicamente
                    tipos.forEach(tipo => {
                        const option = document.createElement('option');
                        option.value = tipo.nombre;
                        option.textContent = `${tipo.nombre} (${tipo.count})`;
                        select.appendChild(option);
                    });
                }
                
                // Restaurar selección
                select.value = valorActual;
            }
        });

        
    } catch (error) {
        console.error('Error cargando tipos de 5W:', error);
    }
}

async function cargarMeses() {
    try {
        const response = await axios.get(`${API_BASE}/meses`);
        const meses = response.data.data;
        
        // Actualizar ambos selects de mes
        const selects = ['filter-mes', 'filter-mes-tabla'];
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                // Guardar opción seleccionada
                const valorActual = select.value;
                
                // Limpiar y agregar opción "Todos"
                if (meses.length === 0) {
                    select.innerHTML = '<option value="">Todos los Meses</option>';
                    select.disabled = false;
                } else {
                    select.innerHTML = '<option value="">Todos los Meses</option>';
                    select.disabled = false;
                    
                    // Agregar meses dinámicamente
                    meses.forEach(mes => {
                        const option = document.createElement('option');
                        option.value = mes.valor;  // YYYY-MM para filtro
                        option.textContent = `${mes.nombre} (${mes.count})`;  // "Enero 2025 (50)"
                        select.appendChild(option);
                    });
                }
                
                // Restaurar selección
                select.value = valorActual;
            }
        });
        
    } catch (error) {
        console.error('Error cargando meses:', error);
    }
}

// ============================================================================
// Análisis
// ============================================================================

async function cargarAnalisis() {
    const loading = document.getElementById('loading');
    const listContainer = document.getElementById('analisis-list');
    
    loading.style.display = 'block';
    listContainer.innerHTML = '';
    
    try {
        const categoria = document.getElementById('filter-categoria')?.value || '';
        const tipo5w = document.getElementById('filter-tipo-5w')?.value || '';
        const mes = document.getElementById('filter-mes')?.value || '';
        const nivel = document.getElementById('filter-nivel')?.value || '';
        const params = new URLSearchParams();
        
        if (categoria && categoria !== '') {
            params.append('categoria', categoria);
            console.log('🔍 Filtrando por categoría:', categoria);
        }
        
        if (tipo5w && tipo5w !== '') {
            params.append('tipo_5w', tipo5w);
            console.log('🔍 Filtrando por tipo 5W:', tipo5w);
        }
        
        if (mes && mes !== '') {
            params.append('mes', mes);
            console.log('🔍 Filtrando por mes:', mes);
        }
        if (nivel && nivel !== '') {
            params.append('nivel', nivel);
            console.log('🔍 Filtrando por nivel:', nivel);
        }
        
        if (!categoria && !tipo5w && !mes) {
            console.log('📋 Mostrando todos los análisis (sin filtros)');
        }
        
        params.append('limit', '1000'); // Obtener todos para paginar en frontend
        
        console.log('🌐 URL:', `${API_BASE}/analisis?${params}`);
        const response = await axios.get(`${API_BASE}/analisis?${params}`);
        analisisCache = response.data.data;
        totalAnalisis = analisisCache.length;
        console.log('📊 Análisis recibidos:', totalAnalisis);
        
        loading.style.display = 'none';
        
        if (totalAnalisis === 0) {
            listContainer.innerHTML = '<p style="text-align: center; padding: 40px; color: #999;">No hay análisis para mostrar</p>';
            return;
        }
        
        // Resetear a página 1 cuando se cargan nuevos datos
        paginaActual = 1;
        mostrarPaginaAnalisis();
        
    } catch (error) {
        console.error('Error cargando análisis:', error);
        loading.style.display = 'none';
        mostrarNotificacion('Error cargando análisis', 'error');
    }
}

function mostrarPaginaAnalisis() {
    const listContainer = document.getElementById('analisis-list');
    const inicio = (paginaActual - 1) * analisisPorPagina;
    const fin = inicio + analisisPorPagina;
    const analisisPagina = analisisCache.slice(inicio, fin);
    
    listContainer.innerHTML = analisisPagina.map(a => renderAnalisisCard(a)).join('');
    
    // Actualizar controles de paginación
    actualizarPaginacion();
}

function actualizarPaginacion() {
    const totalPaginas = Math.ceil(totalAnalisis / analisisPorPagina);
    const paginacionContainer = document.getElementById('paginacion-cards');
    
    if (totalPaginas <= 1) {
        if (paginacionContainer) paginacionContainer.innerHTML = '';
        return;
    }
    
    let html = '<div class="paginacion">';
    html += `<span class="pag-info">Página ${paginaActual} de ${totalPaginas} (${totalAnalisis} análisis)</span>`;
    
    // Botón anterior
    if (paginaActual > 1) {
        html += `<button class="btn btn-sm btn-secondary" onclick="cambiarPagina(${paginaActual - 1})">← Anterior</button>`;
    }
    
    // Números de página
    const rangoInicio = Math.max(1, paginaActual - 2);
    const rangoFin = Math.min(totalPaginas, paginaActual + 2);
    
    if (rangoInicio > 1) {
        html += `<button class="btn btn-sm btn-secondary" onclick="cambiarPagina(1)">1</button>`;
        if (rangoInicio > 2) html += '<span>...</span>';
    }
    
    for (let i = rangoInicio; i <= rangoFin; i++) {
        const esActual = i === paginaActual ? 'btn-primary' : 'btn-secondary';
        html += `<button class="btn btn-sm ${esActual}" onclick="cambiarPagina(${i})">${i}</button>`;
    }
    
    if (rangoFin < totalPaginas) {
        if (rangoFin < totalPaginas - 1) html += '<span>...</span>';
        html += `<button class="btn btn-sm btn-secondary" onclick="cambiarPagina(${totalPaginas})">${totalPaginas}</button>`;
    }
    
    // Botón siguiente
    if (paginaActual < totalPaginas) {
        html += `<button class="btn btn-sm btn-secondary" onclick="cambiarPagina(${paginaActual + 1})">Siguiente →</button>`;
    }
    
    html += '</div>';
    
    if (paginacionContainer) {
        paginacionContainer.innerHTML = html;
    }
}

function cambiarPagina(nuevaPagina) {
    paginaActual = nuevaPagina;
    mostrarPaginaAnalisis();
    // Scroll al inicio de la lista
    document.getElementById('analisis-list').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderAnalisisCard(analisis) {
    const eval_data = analisis.evaluacion || {};
    const score = eval_data.score || 0;
    const grade = eval_data.grade || 'N/A';
    const gradeClass = grade.toLowerCase().charAt(0);
    const nivel = eval_data.nivel_analisis || '';
    
    // Determinar clase CSS del badge de nivel (5 niveles)
    let nivelBadgeClass = '';
    let nivelEmoji = '';
    if (nivel === 'Excelente') {
        nivelBadgeClass = 'badge-nivel badge-nivel-excelente';
        nivelEmoji = '⭐';
    } else if (nivel === 'Bueno') {
        nivelBadgeClass = 'badge-nivel badge-nivel-bueno';
        nivelEmoji = '🟢';
    } else if (nivel === 'Intermedio') {
        nivelBadgeClass = 'badge-nivel badge-nivel-intermedio';
        nivelEmoji = '🟡';
    } else if (nivel === 'Básico') {
        nivelBadgeClass = 'badge-nivel badge-nivel-basico';
        nivelEmoji = '🟠';
    } else if (nivel === 'Crítico') {
        nivelBadgeClass = 'badge-nivel badge-nivel-critico';
        nivelEmoji = '🔴';
    }
    
    return `
        <div class="analisis-card" data-id="${analisis.id}">
            <div class="analisis-header">
                <div class="analisis-meta">
                    <span class="badge badge-${analisis.categoria.toLowerCase()}">${analisis.categoria}</span>
                    ${analisis.tipo_5w ? `<span class="badge badge-info" style="margin-left: 5px;">${analisis.tipo_5w}</span>` : ''}
                    ${nivel ? `<span class="${nivelBadgeClass}" style="margin-left: 5px;">${nivelEmoji} ${nivel}</span>` : ''}
                    <strong>Ruta: ${analisis.ruta}</strong>
                    ${analisis.fecha ? `<span>📅 ${analisis.fecha}</span>` : ''}
                </div>
                <div class="grade-badge grade-${gradeClass}">
                    ${grade}<br><small>${score.toFixed(1)}</small>
                </div>
            </div>
            
            <div class="analisis-body">
                <div class="problema">
                    🔴 ${analisis.problema}
                </div>
                <div class="causa-raiz">
                    🎯 <strong>Causa Raíz:</strong> ${analisis.causa_raiz}
                </div>
            </div>
            
            ${eval_data.score ? `
                <div class="scores-row">
                    <div class="score-item">
                        <div class="label">Coherencia</div>
                        <div class="value">${(eval_data.chain_coherence || 0).toFixed(0)}</div>
                    </div>
                    <div class="score-item">
                        <div class="label">Causa Raíz</div>
                        <div class="value">${(eval_data.root_cause_alignment || 0).toFixed(0)}</div>
                    </div>
                    <div class="score-item">
                        <div class="label">Plan Acción</div>
                        <div class="value">${(eval_data.action_plan_alignment || 0).toFixed(0)}</div>
                    </div>
                </div>
                
                <div class="feedback-section">
                    ${eval_data.strengths && eval_data.strengths.length > 0 ? `
                        <details>
                            <summary style="cursor: pointer; font-weight: 600; margin-bottom: 10px;">✅ Fortalezas (${eval_data.strengths.length})</summary>
                            <ul class="feedback-list">
                                ${eval_data.strengths.map(s => `<li>${s}</li>`).join('')}
                            </ul>
                        </details>
                    ` : ''}
                    
                    ${eval_data.weaknesses && eval_data.weaknesses.length > 0 ? `
                        <details>
                            <summary style="cursor: pointer; font-weight: 600; margin: 10px 0;">❌ Áreas de Mejora (${eval_data.weaknesses.length})</summary>
                            <ul class="feedback-list">
                                ${eval_data.weaknesses.map(w => `<li>${w}</li>`).join('')}
                            </ul>
                        </details>
                    ` : ''}
                    
                    ${eval_data.suggestions && eval_data.suggestions.length > 0 ? `
                        <details>
                            <summary style="cursor: pointer; font-weight: 600; margin: 10px 0;">💡 Sugerencias (${eval_data.suggestions.length})</summary>
                            <ul class="feedback-list">
                                ${eval_data.suggestions.map(sg => `<li>${sg}</li>`).join('')}
                            </ul>
                        </details>
                    ` : ''}
                    
                    ${eval_data.tips && eval_data.tips.length > 0 ? `
                        <details>
                            <summary style="cursor: pointer; font-weight: 600; margin: 10px 0;">🎯 Tips (${eval_data.tips.length})</summary>
                            <ul class="feedback-list">
                                ${eval_data.tips.map(t => `<li>${t}</li>`).join('')}
                            </ul>
                        </details>
                    ` : ''}
                </div>
            ` : '<p style="color: #999; text-align: center;">⚠️ Sin evaluación</p>'}
            
            <div class="analisis-actions">
                ${!eval_data.score ? `<button class="btn btn-info btn-sm" onclick="evaluarAnalisis(${analisis.id})">🤖 Evaluar con IA</button>` : ''}
                <button class="btn btn-primary btn-sm" onclick="verDetalle(${analisis.id})">👁️ Ver Detalle</button>
                <button class="btn btn-danger btn-sm" onclick="eliminarAnalisis(${analisis.id})">🗑️ Eliminar</button>
            </div>
        </div>
    `;
}

function filtrarPorRuta() {
    const busqueda = document.getElementById('filter-ruta').value.toLowerCase();
    const cards = document.querySelectorAll('.analisis-card');
    
    cards.forEach(card => {
        const texto = card.textContent.toLowerCase();
        card.style.display = texto.includes(busqueda) ? 'block' : 'none';
    });
}

// ============================================================================
// CRUD Análisis
// ============================================================================

async function crearAnalisis(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    data.auto_evaluar = formData.get('auto_evaluar') === 'on';
    
    try {
        mostrarNotificacion('Creando análisis...', 'info');
        
        const response = await axios.post(`${API_BASE}/analisis`, data);
        
        if (response.data.success) {
            mostrarNotificacion('✅ Análisis creado exitosamente', 'success');
            cerrarModal('modal-nuevo');
            form.reset();
            cargarAnalisis();
            cargarEstadisticas();
        }
        
    } catch (error) {
        console.error('Error creando análisis:', error);
        mostrarNotificacion('❌ Error creando análisis', 'error');
    }
}

async function evaluarAnalisis(id) {
    if (!confirm('¿Evaluar este análisis con IA? Puede tomar unos segundos.')) return;
    
    try {
        mostrarNotificacion('🤖 Evaluando con IA...', 'info');
        
        const response = await axios.post(`${API_BASE}/analisis/${id}/evaluar`);
        
        if (response.data.success) {
            mostrarNotificacion('✅ Evaluación completada', 'success');
            cargarAnalisis();
            cargarEstadisticas();
        }
        
    } catch (error) {
        console.error('Error evaluando:', error);
        mostrarNotificacion('❌ Error en evaluación IA', 'error');
    }
}

async function eliminarAnalisis(id) {
    if (!confirm('¿Eliminar este análisis? Esta acción no se puede deshacer.')) return;
    
    try {
        const response = await axios.delete(`${API_BASE}/analisis/${id}`);
        
        if (response.data.success) {
            mostrarNotificacion('✅ Análisis eliminado', 'success');
            cargarAnalisis();
            cargarEstadisticas();
        }
        
    } catch (error) {
        console.error('Error eliminando:', error);
        mostrarNotificacion('❌ Error eliminando análisis', 'error');
    }
}

function verDetalle(id) {
    // Abrir modal con detalle completo
    verDetalleCompleto(id);
}

// ============================================================================
// Importar Excel
// ============================================================================

async function importarExcel(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const data = {
        categoria: formData.get('categoria') || undefined,
        limite: formData.get('limite') ? parseInt(formData.get('limite')) : undefined,
        auto_evaluar: formData.get('auto_evaluar') === 'on'
    };
    
    try {
        mostrarNotificacion('📥 Importando desde Excel...', 'info');
        
        const response = await axios.post(`${API_BASE}/importar`, data);
        
        if (response.data.success) {
            const result = response.data.data;
            mostrarNotificacion(
                `✅ Importados ${result.importados} de ${result.total_procesados} registros`, 
                'success'
            );
            cerrarModal('modal-importar');
            form.reset();
            cargarAnalisis();
            cargarEstadisticas();
        }
        
    } catch (error) {
        console.error('Error importando:', error);
        mostrarNotificacion('❌ Error importando Excel', 'error');
    }
}

// ============================================================================
// Gráficos
// ============================================================================

function initCharts() {
    // Chart por Categoría - Comparación de Score Promedio
    const ctxCat = document.getElementById('chartCategoria').getContext('2d');
    chartCategoria = new Chart(ctxCat, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Score Promedio (%)',
                data: [],
                backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']
            }]
        },
        options: {
            indexAxis: 'y',  // Barras horizontales
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                title: {
                    display: true,
                    text: '🏆 Comparación de Cohesión por Categoría',
                    font: { size: 14, weight: 'bold' }
                }
            },
            scales: {
                x: { 
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            }
        }
    });
    
    // Chart por Grades
    const ctxGrade = document.getElementById('chartGrades').getContext('2d');
    chartGrades = new Chart(ctxGrade, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Cantidad',
                data: [],
                backgroundColor: '#3b82f6'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: { beginAtZero: true }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
    
    // Chart Desglose Detallado - Métricas por Categoría
    const ctxTrend = document.getElementById('chartTendencia').getContext('2d');
    chartTendencia = new Chart(ctxTrend, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Coherencia (%)',
                    data: [],
                    backgroundColor: '#10b981',
                    borderColor: '#059669',
                    borderWidth: 1
                },
                {
                    label: 'Causa Raíz (%)',
                    data: [],
                    backgroundColor: '#3b82f6',
                    borderColor: '#2563eb',
                    borderWidth: 1
                },
                {
                    label: 'Plan de Acción (%)',
                    data: [],
                    backgroundColor: '#f59e0b',
                    borderColor: '#d97706',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    display: true,
                    position: 'top',
                    labels: {
                        padding: 10,
                        font: { size: 11 }
                    }
                },
                title: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y || 0;
                            return `${label}: ${value.toFixed(1)}%`;
                        }
                    }
                }
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        },
                        font: { size: 10 }
                    }
                },
                x: {
                    ticks: {
                        font: { size: 10 }
                    }
                }
            }
        }
    });
    
    // Cargar datos iniciales del desglose
    cargarTendencia();
    
    // ========================================================================
    // Inicializar Nuevas Gráficas Adicionales
    // ========================================================================
    
    // 1. Tendencia Temporal (línea con doble eje)
    const ctxTemporal = document.getElementById('chartTendenciaTemporal').getContext('2d');
    chartTendenciaTemporal = new Chart(ctxTemporal, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Análisis Evaluados',
                    data: [],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    yAxisID: 'y',
                    tension: 0.4
                },
                {
                    label: 'Score Promedio (%)',
                    data: [],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    yAxisID: 'y1',
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Cantidad de Análisis Evaluados'
                    },
                    beginAtZero: true
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Score Promedio (%)'
                    },
                    beginAtZero: true,
                    max: 100,
                    grid: {
                        drawOnChartArea: false,
                    },
                }
            }
        }
    });
    
    // 2. Distribución por Niveles (dona)
    const ctxNiveles = document.getElementById('chartNiveles').getContext('2d');
    chartNiveles = new Chart(ctxNiveles, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                // Colores para 5 niveles: Excelente, Bueno, Intermedio, Básico, Crítico
                backgroundColor: [
                    '#10b981',  // Verde (Excelente)
                    '#3b82f6',  // Azul (Bueno)
                    '#f59e0b',  // Amarillo (Intermedio)
                    '#ef4444',  // Rojo (Básico)
                    '#7c2d12'   // Rojo oscuro (Crítico)
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
    
    // 3. Top Rutas (horizontal bar)
    const ctxRutas = document.getElementById('chartTopRutas').getContext('2d');
    chartTopRutas = new Chart(ctxRutas, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Cantidad de Problemas',
                data: [],
                backgroundColor: '#ef4444',
                borderColor: '#dc2626',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Número de Problemas'
                    }
                }
            }
        }
    });
    
    // 4. Métricas Promedio (radar)
    const ctxMetricas = document.getElementById('chartMetricasPromedio').getContext('2d');
    chartMetricasPromedio = new Chart(ctxMetricas, {
        type: 'radar',
        data: {
            labels: ['Coherencia', 'Causa Raíz', 'Plan de Acción'],
            datasets: [{
                label: 'Promedio (%)',
                data: [0, 0, 0],
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                borderColor: '#3b82f6',
                borderWidth: 2,
                pointBackgroundColor: '#3b82f6',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#3b82f6'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        stepSize: 20,
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
    
    // Cargar datos de las nuevas gráficas
    cargarGraficasAdicionales();
}

function actualizarChartCategoria(data) {
    if (!data || data.length === 0) {
        console.log('⚠️ No hay datos de categorías');
        chartCategoria.data.labels = ['Sin evaluaciones'];
        chartCategoria.data.datasets[0].data = [0];
        chartCategoria.data.datasets[0].backgroundColor = ['#e5e7eb'];
        chartCategoria.update();
        return;
    }
    
    // data ahora es un array de objetos con { categoria, count, avg_score }
    const labels = data.map(item => item.categoria);
    const scores = data.map(item => item.avg_score || 0);
    const counts = data.map(item => item.count || 0);
    
    // Colores diferentes para cada categoría
    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];
    const bgColors = labels.map((_, idx) => colors[idx % colors.length]);
    
    console.log('📊 Comparando scores por categoría:', 
                labels.map((l, i) => `${l}: ${scores[i].toFixed(1)}% (${counts[i]} análisis)`));
    
    chartCategoria.data.labels = labels.map((l, i) => `${l} (${counts[i]})`);
    chartCategoria.data.datasets[0].data = scores;
    chartCategoria.data.datasets[0].backgroundColor = bgColors;
    chartCategoria.update();
}

function actualizarChartGrades(data) {
    if (!data || data.length === 0) {
        console.log('⚠️ No hay datos de grades');
        chartGrades.data.labels = ['Sin evaluaciones'];
        chartGrades.data.datasets[0].data = [1];
        chartGrades.update();
        return;
    }
    
    // data es un array de objetos con { grade, count }
    const labels = data.map(item => item.grade);
    const values = data.map(item => item.count);
    
    console.log('📊 Actualizando gráfico de grades:', labels);
    chartGrades.data.labels = labels;
    chartGrades.data.datasets[0].data = values;
    chartGrades.update();
}

async function cargarTendencia() {
    try {
        // Obtener filtros activos
        const categoria = document.getElementById('filter-categoria')?.value || '';
        const tipo5w = document.getElementById('filter-tipo-5w')?.value || '';
        const mes = document.getElementById('filter-mes')?.value || '';
        const nivel = document.getElementById('filter-nivel')?.value || '';
        
        // Construir parámetros
        const params = new URLSearchParams();
    if (categoria) params.append('categoria', categoria);
    if (tipo5w) params.append('tipo_5w', tipo5w);
    if (mes) params.append('mes', mes);
    if (nivel) params.append('nivel', nivel);
        
        const queryString = params.toString();
        const url = `${API_BASE}/metricas/desglose${queryString ? '?' + queryString : ''}`;
        
        const response = await axios.get(url);
        const desglose = response.data.data;
        
        if (!desglose || desglose.length === 0) {
            console.log('⚠️ No hay desglose de métricas disponible aún');
            chartTendencia.data.labels = ['Sin datos'];
            chartTendencia.data.datasets[0].data = [0];
            chartTendencia.data.datasets[1].data = [0];
            chartTendencia.data.datasets[2].data = [0];
            chartTendencia.update();
            return;
        }
        
        // Extraer datos por categoría
        const labels = desglose.map(d => `${d.categoria} (${d.total})`);
        const coherencia = desglose.map(d => d.coherencia);
        const causaRaiz = desglose.map(d => d.causa_raiz);
        const planAccion = desglose.map(d => d.plan_accion);
        
        console.log('� Actualizando desglose detallado:', {
            categorias: labels,
            promedios: desglose.map(d => ({
                cat: d.categoria,
                coh: d.coherencia,
                causa: d.causa_raiz,
                plan: d.plan_accion
            }))
        });
        
        chartTendencia.data.labels = labels;
        chartTendencia.data.datasets[0].data = coherencia;
        chartTendencia.data.datasets[1].data = causaRaiz;
        chartTendencia.data.datasets[2].data = planAccion;
        chartTendencia.update();
        
    } catch (error) {
        console.error('Error cargando desglose de métricas:', error);
    }
}

// ============================================================================
// Gráficas Adicionales
// ============================================================================

async function cargarGraficasAdicionales() {
    await Promise.all([
        cargarTendenciaTemporal(),
        cargarDistribucionNiveles(),
        cargarTopRutas(),
        cargarMetricasPromedio()
    ]);
}

async function cargarTendenciaTemporal() {
    try {
        const categoria = document.getElementById('filter-categoria')?.value || '';
        const tipo5w = document.getElementById('filter-tipo-5w')?.value || '';
        const nivel = document.getElementById('filter-nivel')?.value || '';
        
        const params = new URLSearchParams();
        if (categoria) params.append('categoria', categoria);
        if (tipo5w) params.append('tipo_5w', tipo5w);
        if (nivel) params.append('nivel', nivel);
        
        const url = `${API_BASE}/graficas/tendencia-temporal${params.toString() ? '?' + params : ''}`;
        const response = await axios.get(url);
        const data = response.data.data;
        
        if (!data || data.length === 0) {
            chartTendenciaTemporal.data.labels = ['Sin datos'];
            chartTendenciaTemporal.data.datasets[0].data = [0];
            chartTendenciaTemporal.data.datasets[1].data = [0];
            chartTendenciaTemporal.update();
            return;
        }
        
        chartTendenciaTemporal.data.labels = data.map(d => d.mes_nombre);
        // Usar solo análisis evaluados, no el total
        chartTendenciaTemporal.data.datasets[0].data = data.map(d => d.evaluados);
        chartTendenciaTemporal.data.datasets[1].data = data.map(d => d.score_promedio);
        chartTendenciaTemporal.update();
        
        console.log('📅 Tendencia temporal actualizada:', data.length, 'meses', '| Total evaluados:', data.reduce((sum, d) => sum + d.evaluados, 0));
    } catch (error) {
        console.error('Error cargando tendencia temporal:', error);
    }
}

async function cargarDistribucionNiveles() {
    try {
        const categoria = document.getElementById('filter-categoria')?.value || '';
        const tipo5w = document.getElementById('filter-tipo-5w')?.value || '';
        const mes = document.getElementById('filter-mes')?.value || '';
        
        const params = new URLSearchParams();
        if (categoria) params.append('categoria', categoria);
        if (tipo5w) params.append('tipo_5w', tipo5w);
        if (mes) params.append('mes', mes);
        
        const url = `${API_BASE}/graficas/distribucion-niveles${params.toString() ? '?' + params : ''}`;
        const response = await axios.get(url);
        const data = response.data.data;
        
        if (!data || data.length === 0) {
            chartNiveles.data.labels = ['Sin evaluaciones'];
            chartNiveles.data.datasets[0].data = [1];
            chartNiveles.data.datasets[0].backgroundColor = ['#e5e7eb'];
            chartNiveles.update();
            return;
        }
        
        // Mapeo de colores por nivel
        const coloresPorNivel = {
            'Excelente': '#10b981',  // Verde
            'Bueno': '#3b82f6',      // Azul
            'Intermedio': '#f59e0b', // Amarillo
            'Básico': '#ef4444',     // Rojo
            'Crítico': '#7c2d12'     // Rojo oscuro
        };
        
        chartNiveles.data.labels = data.map(d => `${d.nivel} (${d.score_promedio}%)`);
        chartNiveles.data.datasets[0].data = data.map(d => d.count);
        chartNiveles.data.datasets[0].backgroundColor = data.map(d => coloresPorNivel[d.nivel] || '#999');
        chartNiveles.update();
        
        console.log('🎯 Distribución de niveles actualizada:', data);
    } catch (error) {
        console.error('Error cargando distribución de niveles:', error);
    }
}

async function cargarTopRutas() {
    try {
        const categoria = document.getElementById('filter-categoria')?.value || '';
        const tipo5w = document.getElementById('filter-tipo-5w')?.value || '';
        const mes = document.getElementById('filter-mes')?.value || '';
        
        const params = new URLSearchParams();
        if (categoria) params.append('categoria', categoria);
        if (tipo5w) params.append('tipo_5w', tipo5w);
        if (mes) params.append('mes', mes);
        params.append('orden', 'mas'); // Top con más problemas
        
        const url = `${API_BASE}/graficas/top-rutas${params.toString() ? '?' + params : ''}`;
        const response = await axios.get(url);
        const data = response.data.data;
        
        if (!data || data.length === 0) {
            chartTopRutas.data.labels = ['Sin datos'];
            chartTopRutas.data.datasets[0].data = [0];
            chartTopRutas.update();
            return;
        }
        
        chartTopRutas.data.labels = data.map(d => d.ruta);
        chartTopRutas.data.datasets[0].data = data.map(d => d.problemas);
        chartTopRutas.update();
        
        console.log('🚚 Top rutas actualizado:', data);
    } catch (error) {
        console.error('Error cargando top rutas:', error);
    }
}

async function cargarMetricasPromedio() {
    try {
        const categoria = document.getElementById('filter-categoria')?.value || '';
        const tipo5w = document.getElementById('filter-tipo-5w')?.value || '';
        const mes = document.getElementById('filter-mes')?.value || '';
        const nivel = document.getElementById('filter-nivel')?.value || '';
        
        const params = new URLSearchParams();
        if (categoria) params.append('categoria', categoria);
        if (tipo5w) params.append('tipo_5w', tipo5w);
        if (mes) params.append('mes', mes);
        if (nivel) params.append('nivel', nivel);
        
        const url = `${API_BASE}/graficas/metricas-promedio${params.toString() ? '?' + params : ''}`;
        const response = await axios.get(url);
        const data = response.data.data;
        
        chartMetricasPromedio.data.datasets[0].data = [
            data.coherencia || 0,
            data.causa_raiz || 0,
            data.plan_accion || 0
        ];
        chartMetricasPromedio.update();
        
        console.log('📊 Métricas promedio actualizadas:', data);
    } catch (error) {
        console.error('Error cargando métricas promedio:', error);
    }
}

// ============================================================================
// Modales
// ============================================================================

function mostrarModalNuevo() {
    document.getElementById('modal-nuevo').style.display = 'block';
}

function mostrarModalImportar() {
    document.getElementById('modal-importar').style.display = 'block';
}

function cerrarModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Cerrar modal al hacer clic fuera
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

// ============================================================================
// Notificaciones
// ============================================================================

function mostrarNotificacion(mensaje, tipo = 'info') {
    // Crear notificación toast
    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    toast.textContent = mensaje;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${tipo === 'success' ? '#10b981' : tipo === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Agregar animaciones CSS para toast
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ============================================================================
// Vista Tabs
// ============================================================================

function cambiarVista(vista) {
    vistaActual = vista;
    
    // Actualizar tabs
    document.querySelectorAll('.view-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-view="${vista}"]`).classList.add('active');
    
    // Actualizar contenido
    document.querySelectorAll('.view-content').forEach(content => {
        content.classList.remove('active');
    });
    
    if (vista === 'cards') {
        document.getElementById('vista-cards').classList.add('active');
    } else if (vista === 'tabla') {
        document.getElementById('vista-tabla').classList.add('active');
        cargarTablaCompleta();
    }
}

// ============================================================================
// Tabla Completa
// ============================================================================

function cargarTablaCompleta() {
    const categoria = document.getElementById('filter-categoria-tabla')?.value || '';
    const tipo5w = document.getElementById('filter-tipo-5w-tabla')?.value || '';
    const mes = document.getElementById('filter-mes-tabla')?.value || '';
    const nivel = document.getElementById('filter-nivel-tabla')?.value || '';
    
    // Construir URL con parámetros dinámicos
    const params = new URLSearchParams({ limit: '1000' });
    if (categoria) params.append('categoria', categoria);
    if (tipo5w) params.append('tipo_5w', tipo5w);
    if (mes) params.append('mes', mes);
    if (nivel) params.append('nivel', nivel);
    
    axios.get(`${API_BASE}/analisis?${params.toString()}`)
        .then(response => {
            const analisis = response.data.data;
            
            // Limpiar tbody
            const tbody = document.querySelector('#tabla-analisis tbody');
            tbody.innerHTML = '';
            
            // Llenar con datos
            analisis.forEach(a => {
                const eval_data = a.evaluacion || {};
                
                // Generar badge de nivel con colores
                const nivel = eval_data.nivel_analisis || 'Sin evaluar';
                const nivelClass = nivel.toLowerCase().replace(' ', '-');
                const nivelEmoji = {
                    'excelente': '⭐',
                    'bueno': '🟢',
                    'intermedio': '🟡',
                    'básico': '🟠',
                    'critico': '🔴',
                    'sin-evaluar': '⚪'
                }[nivelClass] || '⚪';
                
                const row = tbody.insertRow();
                row.innerHTML = `
                    <td>${a.id}</td>
                    <td><span class="badge badge-${a.categoria.toLowerCase()}">${a.categoria}</span></td>
                    <td><span class="badge badge-info">${a.tipo_5w || 'N/A'}</span></td>
                    <td><span class="badge badge-nivel badge-nivel-${nivelClass}">${nivelEmoji} ${nivel}</span></td>
                    <td><strong>${a.ruta}</strong></td>
                    <td>${a.fecha || 'N/A'}</td>
                    <td><strong>${(eval_data.score || 0).toFixed(1)}</strong></td>
                    <td><span class="grade-badge grade-${(eval_data.grade || 'f').toLowerCase().charAt(0)}">${eval_data.grade || 'N/A'}</span></td>
                    <td>${(eval_data.chain_coherence || 0).toFixed(0)}</td>
                    <td>${(eval_data.root_cause_alignment || 0).toFixed(0)}</td>
                    <td>${(eval_data.action_plan_alignment || 0).toFixed(0)}</td>
                    <td class="col-problema">${truncarTexto(a.problema, 100)}</td>
                    <td class="col-texto">${truncarTexto(a.por_que_1, 80)}</td>
                    <td class="col-texto">${truncarTexto(a.por_que_2, 80)}</td>
                    <td class="col-texto">${truncarTexto(a.por_que_3, 80)}</td>
                    <td class="col-texto">${truncarTexto(a.causa_raiz, 100)}</td>
                    <td class="col-texto">${truncarTexto(a.plan_accion, 100)}</td>
                    <td class="col-texto">${formatearListaCompleta(eval_data.strengths)}</td>
                    <td class="col-texto">${formatearListaCompleta(eval_data.weaknesses)}</td>
                    <td class="col-texto">${formatearListaCompleta(eval_data.suggestions)}</td>
                    <td class="col-texto">${formatearListaCompleta(eval_data.tips)}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="verDetalleCompleto(${a.id})">👁️ Ver</button>
                        ${!eval_data.score ? `<button class="btn btn-sm btn-info" onclick="evaluarAnalisis(${a.id})">🤖 Evaluar</button>` : ''}
                        <button class="btn btn-sm btn-danger" onclick="eliminarAnalisis(${a.id})">🗑️</button>
                    </td>
                `;
            });
            
            // Destruir instancia previa de forma segura
            if ($.fn.DataTable.isDataTable('#tabla-analisis')) {
                $('#tabla-analisis').DataTable().destroy();
            }

            // Si no hay filas mostrar mensaje y salir sin inicializar DataTable
            if (analisis.length === 0) {
                tbody.innerHTML = `<tr><td colspan="22" style="text-align:center;padding:40px;color:#999;">
                    No hay análisis para mostrar. Importa un Excel para comenzar.
                </td></tr>`;
                return;
            }

            // Inicializar DataTable
            tablaAnalisis = $('#tabla-analisis').DataTable({
                pageLength: 25,
                order: [[0, 'desc']],
                language: {
                    search: 'Buscar:',
                    lengthMenu: 'Mostrar _MENU_ registros',
                    info: 'Mostrando _START_ a _END_ de _TOTAL_ registros',
                    infoEmpty: 'Mostrando 0 a 0 de 0 registros',
                    infoFiltered: '(filtrado de _MAX_ registros totales)',
                    paginate: {
                        first: 'Primero',
                        last: 'Último',
                        next: 'Siguiente',
                        previous: 'Anterior'
                    },
                    zeroRecords: 'No se encontraron registros'
                },
                scrollX: true,
                autoWidth: true,
                columns: [
                    null, null, null, null, null, null, null, null, null, null, null,
                    { width: '250px' }, { width: '250px' }, { width: '250px' },
                    { width: '250px' }, { width: '250px' }, { width: '250px' },
                    { width: '250px' }, { width: '250px' }, { width: '250px' },
                    { width: '250px' },
                    { orderable: false, searchable: false, width: '150px' }
                ]
            });
        })
        .catch(error => {
            console.error('Error cargando tabla:', error);
            mostrarNotificacion('Error cargando tabla completa', 'error');
        });
}

function truncarTexto(texto, max) {
    if (!texto) return 'N/A';
    return texto.length > max ? texto.substring(0, max) + '...' : texto;
}

function formatearLista(lista) {
    if (!lista || lista.length === 0) return 'N/A';
    return lista.slice(0, 2).join('; ') + (lista.length > 2 ? '...' : '');
}

function formatearListaCompleta(lista) {
    if (!lista || lista.length === 0) return 'N/A';
    // Mostrar todos los items con viñetas
    return lista.map((item, idx) => `${idx + 1}. ${item}`).join('\n');
}

function verDetalleCompleto(id) {
    axios.get(`${API_BASE}/analisis/${id}`)
        .then(response => {
            const a = response.data.data;
            const eval_data = a.evaluacion || {};
            
            const contenido = `
                <div class="detalle-header">
                    <div>
                        <div class="detalle-meta">
                            <span class="badge badge-${a.categoria.toLowerCase()}">${a.categoria}</span>
                            <strong>Ruta: ${a.ruta}</strong>
                            ${a.fecha ? `<span>📅 ${a.fecha}</span>` : ''}
                        </div>
                        <h2 style="margin-top: 15px;">Análisis Detallado #${a.id}</h2>
                    </div>
                    <div class="detalle-score">
                        <div class="detalle-score-big">${(eval_data.score || 0).toFixed(1)}</div>
                        <span class="grade-badge grade-${(eval_data.grade || 'f').toLowerCase().charAt(0)}" style="font-size: 24px; padding: 8px 16px;">
                            ${eval_data.grade || 'N/A'}
                        </span>
                    </div>
                </div>
                
                <div class="metrics-grid">
                    <div class="metric-box">
                        <div class="metric-value">${(eval_data.chain_coherence || 0).toFixed(0)}</div>
                        <div class="metric-label">Coherencia</div>
                    </div>
                    <div class="metric-box">
                        <div class="metric-value">${(eval_data.root_cause_alignment || 0).toFixed(0)}</div>
                        <div class="metric-label">Causa Raíz</div>
                    </div>
                    <div class="metric-box">
                        <div class="metric-value">${(eval_data.action_plan_alignment || 0).toFixed(0)}</div>
                        <div class="metric-label">Plan Acción</div>
                    </div>
                </div>
                
                <div class="detalle-body">
                    <div class="detalle-section">
                        <h4>🔴 Problema Inicial</h4>
                        <p>${a.problema}</p>
                    </div>
                    
                    <div class="detalle-section">
                        <h4>❓ ¿Por qué 1?</h4>
                        <p>${a.por_que_1}</p>
                    </div>
                    
                    <div class="detalle-section">
                        <h4>❓ ¿Por qué 2?</h4>
                        <p>${a.por_que_2}</p>
                    </div>
                    
                    <div class="detalle-section">
                        <h4>❓ ¿Por qué 3?</h4>
                        <p>${a.por_que_3}</p>
                    </div>
                    
                    ${a.por_que_4 ? `
                        <div class="detalle-section">
                            <h4>❓ ¿Por qué 4?</h4>
                            <p>${a.por_que_4}</p>
                        </div>
                    ` : ''}
                    
                    <div class="detalle-section">
                        <h4>🎯 Causa Raíz</h4>
                        <p>${a.causa_raiz}</p>
                    </div>
                    
                    <div class="detalle-section">
                        <h4>📝 Plan de Acción</h4>
                        <p>${a.plan_accion}</p>
                    </div>
                    
                    ${eval_data.strengths && eval_data.strengths.length > 0 ? `
                        <div class="detalle-section feedback-strengths" style="border-left: 4px solid #10b981;">
                            <h4 style="color: #10b981;">✅ Fortalezas</h4>
                            <ul class="feedback-list-detalle">
                                ${eval_data.strengths.map(s => `<li style="border-left-color: #10b981;">${s}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    
                    ${eval_data.weaknesses && eval_data.weaknesses.length > 0 ? `
                        <div class="detalle-section feedback-weaknesses" style="border-left: 4px solid #ef4444;">
                            <h4 style="color: #ef4444;">❌ Debilidades</h4>
                            <ul class="feedback-list-detalle">
                                ${eval_data.weaknesses.map(w => `<li style="border-left-color: #ef4444;">${w}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    
                    ${eval_data.suggestions && eval_data.suggestions.length > 0 ? `
                        <div class="detalle-section feedback-suggestions" style="border-left: 4px solid #f59e0b;">
                            <h4 style="color: #f59e0b;">💡 Sugerencias de Mejora</h4>
                            <ul class="feedback-list-detalle">
                                ${eval_data.suggestions.map(sg => `<li style="border-left-color: #f59e0b;">${sg}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    
                    ${eval_data.tips && eval_data.tips.length > 0 ? `
                        <div class="detalle-section feedback-tips" style="border-left: 4px solid #8b5cf6;">
                            <h4 style="color: #8b5cf6;">🎯 Tips Prácticos</h4>
                            <ul class="feedback-list-detalle">
                                ${eval_data.tips.map(t => `<li style="border-left-color: #8b5cf6;">${t}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    
                    ${eval_data.detail ? `
                        <div class="detalle-section">
                            <h4>📄 Análisis Detallado IA</h4>
                            <p>${eval_data.detail}</p>
                        </div>
                    ` : ''}
                </div>
            `;
            
            document.getElementById('detalle-content').innerHTML = contenido;
            document.getElementById('modal-detalle').style.display = 'block';
        })
        .catch(error => {
            console.error('Error cargando detalle:', error);
            mostrarNotificacion('Error cargando detalle completo', 'error');
        });
}

async function exportarTablaExcel() {
    mostrarNotificacion('📊 Preparando exportación a Excel...', 'info');
    
    try {
        // Obtener filtros actuales
        const categoria = document.getElementById('filter-categoria-tabla')?.value || '';
        const tipo5w = document.getElementById('filter-tipo-5w-tabla')?.value || '';
        const mes = document.getElementById('filter-mes-tabla')?.value || '';
        const nivel = document.getElementById('filter-nivel-tabla')?.value || '';
        
        // Construir URL con filtros
        const params = new URLSearchParams();
        if (categoria) params.append('categoria', categoria);
        if (tipo5w) params.append('tipo_5w', tipo5w);
        if (mes) params.append('mes', mes);
        if (nivel) params.append('nivel', nivel);
        
        // Descargar archivo directamente desde el servidor
        const url = `${API_BASE}/exportar-excel?${params.toString()}`;
        
        // Crear enlace temporal para descargar
        const a = document.createElement('a');
        a.href = url;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        mostrarNotificacion('✅ Descargando archivo Excel...', 'success');
        
    } catch (error) {
        console.error('Error exportando a Excel:', error);
        mostrarNotificacion('❌ Error al exportar a Excel', 'error');
    }
}

// ============================================================================
// Upload de Archivos
// ============================================================================

function setupUploadArea() {
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('excel-file');
    
    if (!uploadArea || !fileInput) return;
    
    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            mostrarInfoArchivo(fileInput);
        }
    });
}

function mostrarInfoArchivo(input) {
    const file = input.files[0];
    if (!file) return;
    
    const fileInfo = document.getElementById('file-info');
    const fileName = document.getElementById('file-name');
    const fileSize = document.getElementById('file-size');
    const btnImportar = document.getElementById('btn-importar');
    
    fileName.textContent = file.name;
    fileSize.textContent = (file.size / 1024).toFixed(2) + ' KB';
    fileInfo.style.display = 'block';
    btnImportar.disabled = false;
}

// Actualizar función de importar
async function importarExcel(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    // Verificar que hay archivo
    const file = document.getElementById('excel-file').files[0];
    if (!file) {
        mostrarNotificacion('❌ Selecciona un archivo Excel', 'error');
        return;
    }
    
    try {
        mostrarNotificacion('📥 Importando desde Excel...', 'info');
        
        const response = await axios.post(`${API_BASE}/importar`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        
        if (response.data.success) {
            const result = response.data.data;
            
            // Mensaje principal
            mostrarNotificacion(response.data.message || `✅ Importados ${result.importados} de ${result.total_procesados} registros`, 'success');
            
            // Mensaje adicional según si está evaluando en background o no
            if (result.evaluando_background) {
                setTimeout(() => {
                    mostrarNotificacion(
                        `⚡ Evaluación en progreso... Los resultados aparecerán progresivamente. Refresca la página en unos minutos.`, 
                        'info'
                    );
                }, 2000);
                
                // Auto-refrescar cada 30 segundos si está evaluando
                const refreshInterval = setInterval(() => {
                    cargarAnalisis();
                    cargarEstadisticas();
                    if (vistaActual === 'tabla') {
                        cargarTablaCompleta();
                    }
                }, 30000); // 30 segundos
                
                // Detener después de 10 minutos
                setTimeout(() => clearInterval(refreshInterval), 600000);
                
            } else if (result.sin_evaluar > 0) {
                setTimeout(() => {
                    mostrarNotificacion(
                        `💡 Tip: Usa el botón "🤖 Evaluar Todos Pendientes" para que la IA analice los ${result.sin_evaluar} registros importados`, 
                        'info'
                    );
                }, 2000);
            }
            
            cerrarModal('modal-importar');
            form.reset();
            document.getElementById('file-info').style.display = 'none';
            document.getElementById('btn-importar').disabled = true;
            // Refrescar todo incluyendo los dropdowns de filtros
            cargarCategorias();
            cargarTipos5W();
            cargarMeses();
            cargarNiveles();
            cargarAnalisis();
            cargarEstadisticas();
            if (vistaActual === 'tabla') {
                cargarTablaCompleta();
            }
        }
        
    } catch (error) {
        console.error('Error importando:', error);
        mostrarNotificacion('❌ Error importando Excel', 'error');
    }
}

// ============================================================================
// Evaluar Todos los Pendientes
// ============================================================================

async function evaluarTodosPendientes() {
    try {
        const confirmacion = confirm('¿Deseas evaluar TODOS los análisis sin evaluación? Esto puede tomar varios minutos.');
        if (!confirmacion) return;
        
        mostrarNotificacion('🔍 Buscando análisis pendientes...', 'info');
        
        // Obtener todos los análisis
        const response = await axios.get(`${API_BASE}/analisis?limit=10000`);
        const analisis = response.data.data;
        
        // Filtrar los que no tienen evaluación o tienen score 0
        const pendientes = analisis.filter(a => !a.evaluacion || !a.evaluacion.score || a.evaluacion.score === 0);
        
        if (pendientes.length === 0) {
            mostrarNotificacion('✅ No hay análisis pendientes de evaluar', 'info');
            return;
        }
        
        console.log(`📊 Encontrados ${pendientes.length} análisis pendientes`);
        mostrarNotificacion(`🤖 Iniciando evaluación de ${pendientes.length} análisis...`, 'info');
        
        const btnEvaluar = document.getElementById('btn-evaluar-todos');
        if (btnEvaluar) {
            btnEvaluar.disabled = true;
            btnEvaluar.textContent = `⏳ Evaluando 0/${pendientes.length}...`;
        }
        
        let evaluados = 0;
        let errores = 0;
        
        // Evaluar uno por uno
        for (let i = 0; i < pendientes.length; i++) {
            try {
                console.log(`🔄 Evaluando análisis ${pendientes[i].id}...`);
                await axios.post(`${API_BASE}/analisis/${pendientes[i].id}/evaluar`);
                evaluados++;
                
                if (btnEvaluar) {
                    btnEvaluar.textContent = `⏳ Evaluando ${evaluados}/${pendientes.length}...`;
                }
                
                // Actualizar vista cada 10 evaluaciones
                if (evaluados % 10 === 0) {
                    console.log(`✅ Progreso: ${evaluados}/${pendientes.length}`);
                    cargarEstadisticas();
                    if (vistaActual === 'cards') {
                        cargarAnalisis();
                    } else {
                        cargarTablaCompleta();
                    }
                }
            } catch (error) {
                console.error(`❌ Error evaluando análisis ${pendientes[i].id}:`, error);
                errores++;
            }
            
            // Pequeña pausa para no saturar (100ms)
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Restaurar botón
        if (btnEvaluar) {
            btnEvaluar.disabled = false;
            btnEvaluar.textContent = '🤖 Evaluar Todos Pendientes';
        }
        
        // Notificar resultado
        const mensaje = errores > 0 
            ? `✅ Completado: ${evaluados} exitosos, ${errores} errores`
            : `✅ ¡Perfecto! ${evaluados} análisis evaluados exitosamente`;
        
        mostrarNotificacion(mensaje, 'success');
        console.log(`🎉 Evaluación completada: ${evaluados}/${pendientes.length}`);
        
        // Recargar todo
        cargarEstadisticas();
        cargarAnalisis();
        if (vistaActual === 'tabla') {
            cargarTablaCompleta();
        }
        
    } catch (error) {
        console.error('❌ Error en evaluación masiva:', error);
        mostrarNotificacion('❌ Error en evaluación masiva: ' + error.message, 'error');
        
        const btnEvaluar = document.getElementById('btn-evaluar-todos');
        if (btnEvaluar) {
            btnEvaluar.disabled = false;
            btnEvaluar.textContent = '🤖 Evaluar Todos Pendientes';
        }
    }
}
