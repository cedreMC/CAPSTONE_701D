/**
 * Script para cargar automáticamente los componentes globales en el head
 * Este script debe incluirse antes del cierre de </head>
 */

(function() {
    'use strict';

    // Verificar si ya se cargaron los componentes
    if (document.getElementById('global-components-loaded')) {
        return;
    }

    // Crear marca para evitar cargas duplicadas
    const marker = document.createElement('meta');
    marker.id = 'global-components-loaded';
    marker.name = 'global-components';
    document.head.appendChild(marker);

    // Cargar CSS de loading
    if (!document.querySelector('link[href*="loading.css"]')) {
        const loadingCSS = document.createElement('link');
        loadingCSS.rel = 'stylesheet';
        loadingCSS.href = 'style/loading.css';
        document.head.appendChild(loadingCSS);
    }

    // Cargar script de loading global
    if (!document.querySelector('script[src*="global-loading.js"]')) {
        const loadingScript = document.createElement('script');
        loadingScript.src = '../js/global-loading.js';
        loadingScript.async = true;
        document.head.appendChild(loadingScript);
    }
})();

