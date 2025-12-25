import * as articles from "./articles.js";
import { initRouter, getLocation, setLocation, getBase } from "/router.js";
import { marked } from "https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js";
import { replaceIcons } from "/icons.js"
import * as DataManager from "https://datamanager.js.org/datamanager.js"

const settings = {};
window.settings = settings;

window.onload = async () => {
    initStorage();
    setDarkmode(settings.darkmode, false);
    replaceIcons();
    await articles.init();
    document.getElementById('themeToggleButton').addEventListener('click', () => {
        settings.darkmode = !settings.darkmode;
        setDarkmode(settings.darkmode);
        DataManager.storage.set('settings', settings);
    });
    window.addEventListener('routechange', retrieveArticle);
    initRouter('/blog/');
}


//----- THEMES -----//
function setDarkmode(on, animate = true) {
    const icon = document.getElementById('themeToggleIcon');

    icon.classList.toggle('sun-icon', on);
    icon.classList.toggle('moon-icon', !on);
    replaceIcons();

    const root = document.documentElement;
    if(animate) root.classList.add('theme-transition');

    requestAnimationFrame(() => {
        root.style.setProperty('--background-color', `var(--${on ? 'dark' : 'bright'}-color)`);
        root.style.setProperty('--font-color', `var(--${on ? 'bright' : 'dark'}-color)`);
    });

    setTimeout(() => {
        root.classList.remove('theme-transition');
    }, 200);
}

window.getLocation = getLocation;
window.getBase = getBase;

//----- URL Logic -----//
async function retrieveArticle({ detail: path }) {
    const base = getBase();
    const route = path.slice(base.length).replace(/\/$/, '');

    const [id, slug] = route.split('/');

    const currentArticle = /^[0-9a-f]{6}$/.test(id)
        ? await articles.getById(id)
        : await articles.getBySlug(slug ?? id);

    render(currentArticle);
    if(currentArticle) {
        const canonicalURL = `${base}${currentArticle.id}/${currentArticle.slug}/`;
        if(getLocation() != canonicalURL) setLocation(canonicalURL, false);
    }
}

function render(article) {
    if(!article) {
        document.getElementById('article').style.display = 'none';
        if(getLocation() === getBase()) renderArticleGrid();
        else renderNotFound();
        return;
    }

    document.getElementById('article').style.display = 'block'
    document.getElementById('overview').style.display = 'none';
    document.getElementById('not-found').style.display = 'none';

    setArticleMeta(article);

    document.getElementById('title').textContent = article.title;
    const articleDate = new Date(article.date);
    document.getElementById('published').dateTime = articleDate.toISOString().split("T")[0];
    document.getElementById('published').textContent = articleDate.toLocaleDateString(undefined, {year: 'numeric', month: 'long', day: '2-digit'});
    if(article.changes.length > 0) document.getElementById('edited').textContent = '- edited';
    //document.getElementById('author').textContent = article.authors.join(', ');
    document.getElementById('article-body').innerHTML = (article.content.format === "markdown") ? marked.parse(article.content.body) : "";
    
    renderArticleNavigation(article);
}

function setArticleMeta(article) {
    const canonicalURL = `${window.origin}${getBase()}${article.id}/${article.slug}/`;
    document.title = `vorks.blog | ${article.title}`;

    meta.setTag('description', article.summary);
    meta.setCanonical(canonicalURL);
    meta.setRobots('index, follow');

    meta.setTag('og:type', 'article', true);
    meta.setTag('og:title', article.title, true);
    meta.setTag('og:description', article.summary, true);
    meta.setTag('og:url', canonicalURL, true);
    meta.setTag('og:image', article.imageUrl || 'https://vorks-dev.github.io/social-card.png', true);

    meta.setTag('article:published_time', article.date, true);
    meta.setTag('article:modified_time', article.changes[0]?.date || article.date);

    meta.setTag('twitter:card', 'summary_large_image');
    meta.setTag('twitter:title', article.title);
    meta.setTag('twitter:description', article.summary);
    meta.setTag('twitter:image', article.imageUrl || 'https://vorks-dev.github.io/social-card.png');

    meta.setJsonLd('schema-article', {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": article.title,
        "description": article.summary,
        "image": article.imageUrl ? [article.imageUrl] : [],
        "datePublished": article.date,
        "dateModified": article.changes[0]?.date || article.date,
        "publisher": {
            "@type": "Organization",
            "name": "vorks.",
            "logo": {
                "@type": "ImageObject",
                "url": "https://vorks-dev.github.io/logo.svg"
            }
        },
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": canonicalURL
        }
    });

    meta.setJsonLd('schema-breadcrumbs', {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": "vorks.blog",
                "item": `${window.origin}/blog/`
            },
            {
                "@type": "ListItem",
                "position": 2,
                "name": article.title,
                "item": canonicalURL
            }
        ]
    })
}

async function renderArticleNavigation(article) {
    const adjacent = await articles.getAdjacent(article.id);

    document.getElementById('previous').classList.toggle('empty', !adjacent.previous);
    document.getElementById('next').classList.toggle('empty', !adjacent.next);

    if(adjacent.previous) {
        document.getElementById('previous').href = `/blog/${adjacent.previous.id}/`;
        document.getElementById('previousText').textContent = adjacent.previous.title;
    }
    if(adjacent.next) {
        document.getElementById('next').href = `/blog/${adjacent.next.id}/`;
        document.getElementById('nextText').textContent = adjacent.next.title;
    }
}

async function renderArticleGrid() {
    const canonicalURL = `${window.origin}/blog/`;
    document.getElementById('overview').style.display = 'block';
    document.getElementById('not-found').style.display = 'none';
    document.title = 'vorks.blog'

    meta.setTag('description', 'Articles about software development by vorks.');
    meta.setTag('og:type', 'website', true);
    meta.setTag('og:title', 'vorks.blog', true);
    meta.setTag('og:description', 'Articles about software development by vorks.', true);
    meta.setTag('og:url', canonicalURL, true);
    meta.setTag('og:image', 'https://vorks-dev.github.io/social-card.png', true);
    meta.setTag('twitter:card', 'summary');

    meta.setCanonical(canonicalURL);
    meta.setRobots('index, follow');
    meta.setJsonLd('schema-blog', {
        "@context": "https://schema.org",
        "@type": "Blog",
        "name": "vorks.blog",
        "url": canonicalURL
    });
    meta.removeArticleMeta();
    
    const articleGrid = document.getElementById('latestArticles');
    articleGrid.innerHTML = "";

    const articleList = await articles.getLatest(12);
    for(const article of articleList) {
        const shell = document.createElement('article');
        const anchor = document.createElement('a');
        anchor.href = `/blog/${article.id}/`;
        anchor.ariaLabel = `Read full article: ${article.title}`;

        const date = document.createElement('time');
        date.ariaLabel = 'Published on';
        const articleDate = new Date(article.date);
        date.dateTime = articleDate.toISOString().split("T")[0];
        date.textContent = articleDate.toLocaleDateString(undefined, {year: 'numeric', month: 'numeric', day: '2-digit'});
        shell.appendChild(date);
        
        const title = document.createElement('h1');
        title.textContent = article.title;
        shell.appendChild(title);

        const summary = document.createElement('p');
        summary.textContent = article.summary;
        shell.appendChild(summary);

        const action = document.createElement('span');
        action.innerHTML = 'Read more <i class="chevron-right-icon"></i>';
        action.className = 'articleOpener';
        action.ariaHidden = 'true';
        shell.appendChild(action);

        anchor.appendChild(shell);
        articleGrid.appendChild(anchor);
    }

    replaceIcons();
}

function renderNotFound() {
    document.getElementById('overview').style.display = 'none';
    document.getElementById('not-found').style.display = 'block';
    document.title = 'vorks.blog | Not Found';

    meta.setTag('description', 'Articles about software development by vorks.');
    meta.setTag('og:type', 'website', true);
    meta.setTag('og:title', 'vorks.blog', true);
    meta.setTag('og:description', 'Articles about software development by vorks.', true);
    meta.setTag('og:image', 'https://vorks-dev.github.io/social-card.png', true);
    meta.setRobots('noindex, nofollow');
    meta.removeJsonLd('schema-blog');
    meta.removeArticleMeta();
}

function initStorage() {
    DataManager.storage.prefix = 'blog';
    DataManager.storage.templates = {
        settings: {
            lang: 'en',
            darkmode: true
        }
    }
    DataManager.storage.defaults = ['settings'];
    const initData = DataManager.storage.init();
    Object.assign(settings, initData.content.settings);
}


//----- Metadata Helpers -----//
const meta = {
    setTag(key, content, isProperty = false) {
        if(!content) return;
        const attr = isProperty ? 'property' : 'name';
        let tag = document.head.querySelector(`meta[${attr}="${key}"]`);
        if(!tag) {
            tag = document.createElement('meta');
            tag.setAttribute(attr, key);
            document.head.appendChild(tag);
        }
        tag.setAttribute('content', content);
    },

    setCanonical(url) {
        if(!url) return;
        let link = document.head.querySelector('link[rel="canonical"]');
        if(!link) {
            link = document.createElement('link');
            link.setAttribute('rel', 'canonical');
            document.head.appendChild(link);
        }
        link.setAttribute('href', url);
    }, 

    setRobots(content = 'index, follow') {
        meta.setTag('robots', content);
    },

    setJsonLd(id, data) {
        if(!id || !data) return;
        let script = document.head.querySelector(`script[type="application/ld+json"]#${id}`);
        if(!script) {
            script = document.createElement('script');
            script.type = 'application/ld+json';
            script.id = id;
            document.head.appendChild(script);
        }
        script.textContent = JSON.stringify(data, null, 4);
    },

    removeJsonLd(id) {
        const script = document.getElementById('id');
        if(script) script.remove();
    },

    removeArticleMeta() {
        const articleProps = [
            'article:author',
            'article:published_time',
            'article:modified_time',
            'article:section',
            'article:tag'
        ];

        articleProps.forEach(p => {
            const tag = document.querySelector(`meta[property="${p}"]`);
            if(tag) tag.remove();
        })

        meta.removeJsonLd('schema-article');
        meta.removeJsonLd('schema-breadcrumbs');
    }
}