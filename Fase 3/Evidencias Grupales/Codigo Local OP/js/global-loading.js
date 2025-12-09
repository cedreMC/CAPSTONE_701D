/**
 * Sistema Global de Loading
 * Se integra automáticamente con todas las páginas del proyecto
 */

(function() {
    'use strict';

    // ===== CONFIGURACIÓN =====
    const CONFIG = {
        loadingDelay: 300, // Milisegundos antes de mostrar el loading
        minLoadingTime: 500 // Tiempo mínimo que se muestra el loading
    };

    // ===== ESTADO GLOBAL =====
    let loadingTimeout = null;
    let loadingStartTime = null;
    let activeRequests = 0;

    // ===== INICIALIZACIÓN =====
    function init() {
        createLoadingOverlay();
        interceptFetch();
        interceptPageLoad();
    }

    // ===== CREAR OVERLAY DE LOADING =====
    function createLoadingOverlay() {
        if (document.getElementById('global-loading-overlay')) {
            return; // Ya existe
        }

        const overlay = document.createElement('div');
        overlay.id = 'global-loading-overlay';
        overlay.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <div class="loading-text">Cargando...</div>
                <div class="loading-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    // ===== MOSTRAR/OCULTAR LOADING =====
    function showLoading() {
        activeRequests++;
        
        if (activeRequests === 1) {
            // Primera solicitud, programar mostrar loading
            loadingTimeout = setTimeout(() => {
                const overlay = document.getElementById('global-loading-overlay');
                if (overlay) {
                    loadingStartTime = Date.now();
                    overlay.classList.add('active');
                }
            }, CONFIG.loadingDelay);
        }
    }

    function hideLoading() {
        activeRequests = Math.max(0, activeRequests - 1);
        
        if (activeRequests === 0) {
            // Última solicitud completada
            clearTimeout(loadingTimeout);
            
            if (loadingStartTime) {
                const elapsed = Date.now() - loadingStartTime;
                const remaining = Math.max(0, CONFIG.minLoadingTime - elapsed);
                
                setTimeout(() => {
                    const overlay = document.getElementById('global-loading-overlay');
                    if (overlay) {
                        overlay.classList.remove('active');
                    }
                    loadingStartTime = null;
                }, remaining);
            } else {
                // Si nunca se mostró, ocultar inmediatamente
                const overlay = document.getElementById('global-loading-overlay');
                if (overlay) {
                    overlay.classList.remove('active');
                }
            }
        }
    }

    // ===== INTERCEPTAR FETCH =====
    function interceptFetch() {
        const originalFetch = window.fetch;
        
        window.fetch = function(...args) {
            showLoading();
            
            return originalFetch.apply(this, args)
                .finally(() => {
                    hideLoading();
                });
        };
    }

    // ===== INTERCEPTAR CARGA DE PÁGINA =====
    function interceptPageLoad() {
        if (document.readyState === 'loading') {
            showLoading();
            
            window.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => {
                    hideLoading();
                }, 100);
            });
        }
    }


    // ===== API PÚBLICA =====
    window.GlobalLoading = {
        show: showLoading,
        hide: hideLoading
    };

    // ===== INICIALIZAR AL CARGAR =====
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();


