let base;

// Compute base from current path if not provided
function getBaseFromPath() {
    const parts = window.location.pathname.split('/');
    return parts.length > 1 ? `/${parts[1]}/` : '/';
}

// Initialize the router
export function initRouter({ customBase } = {}) {
    base = customBase || getBaseFromPath();

    // Hook history methods to trigger locationchange
    const hookHistoryMethods = () => {
        const origPush = history.pushState;
        const origReplace = history.replaceState;

        history.pushState = function (...args) {
            origPush.apply(this, args);
            window.dispatchEvent(new Event('locationchange'));
        };

        history.replaceState = function (...args) {
            origReplace.apply(this, args);
            window.dispatchEvent(new Event('locationchange'));
        };

        window.addEventListener('popstate', () => {
            window.dispatchEvent(new Event('locationchange'));
        });
    };

    // Handle URL normalization and dispatch routechange
    const handleLocationChange = () => {
        const { pathname, hash } = window.location;
        const normalized = pathname.toLowerCase();
        const path = normalized.endsWith('/') ? normalized : `${normalized}/`;

        if (window.location.pathname !== path) {
            window.history.replaceState(null, '', path);
        }

        window.dispatchEvent(new CustomEvent('routechange', { detail: path }));

        if (!hash) {
            window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
        }
    };

    // Intercept internal link clicks
    const setupLinkHandler = () => {
        document.addEventListener('click', (e) => {
            const anchor = e.target.closest('a');
            if (!anchor) return;

            const href = anchor.getAttribute('href');
            if (e.metaKey || e.ctrlKey || e.shiftKey || anchor.target === '_blank') return;
            setLocation(href, true, e);
        });
    };

    hookHistoryMethods();
    window.addEventListener('locationchange', handleLocationChange);
    setupLinkHandler();
    handleLocationChange(); //handle initial load
}

export function getLocation() {
    return window.location.pathname;
}

/**
 * 
 * @param {string} href
 * @param {boolean} writeHistory Whether browser-history should be written for this navigation process
 * @param {Event} e Possibly a click-event that needs intercepting
 */
export function setLocation(href, writeHistory = true, e) {
    if (!href || href.startsWith('http') || href.startsWith('//')) return;

    if (href.startsWith(base)) {
        if(writeHistory) window.history.pushState(null, '', href);
        else window.history.replaceState(null, '', href);
        e?.preventDefault();
    }
}

export function getBase() {
    return base;
}
