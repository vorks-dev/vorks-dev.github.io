import data from "./articles.json" with { type: "json" };

/**
 * @typedef {Object} Article
 * @property {string} id
 * @property {string} slug
 * @property {string} title
 * @property {string} date ISO 8601 date string
 * @property {string[]} tags
 * @property {string[]} authors
 */

/**
 * @typedef {Object} ArticlesFile
 * @property {string} format
 * @property {number} version
 * @property {string} lastChanged ISO 8601 date string
 * @property {string} range.from ISO 8601 date string
 * @property {string} range.to ISO 8601 date string
 * @property {Article[]} articles
 * @property {{ path: string } | null} [previous]
 */

/**
 * @typedef {Object} ArticlesHandler
 * @property {(id: string, file: ArticlesFile) => Promise<Article|null>} getById
 * @property {(slug: string, file: ArticlesFile) => Promise<Article|null>} getBySlug
 * @property {(count?: number, file?: ArticlesFile) => Promise<Article[]>} getLatest
 * @property {(from: string, to: string, file?: ArticlesFile) => Promise<Article[]>} getByDate
 * @property {(tags: string[], file?: ArticlesFile) => Promise<Article[]>} getByTags
 * @property {(authors: string[], file?: ArticlesFile) => Promise<Article[]>} getByAuthors
 */

export async function init() {
    await loadCache();
}

/**
 * Finds the first Article with the given ID.
 * 
 * @param {string} id
 * @param {ArticlesFile} [file=data]
 * @returns {Promise<Article | null>}
 */
export async function getById(id, file = data) {
    const handler = getHandler(file);
    return handler.getById(id, file);
}

/**
 * Finds the first Article with the given Slug.
 * 
 * @param {string} slug
 * @param {ArticlesFile} [file=data]
 * @returns {Promise<Article | null>}
 */
export async function getBySlug(slug, file = data) {
    const handler = getHandler(file);
    return handler.getBySlug(slug, file);
}

/**
 * Finds the latest Articles.
 * 
 * @param {number} [count=1] How many articles should be retrieved
 * @param {ArticlesFile} [file=data]
 * @returns {Promise<Article[]>}
 */
export async function getLatest(count = 1, file = data) {
    const handler = getHandler(file);
    return handler.getLatest(count, file);
}

/**
 * Finds all articles for the given range.
 * 
 * @param {string} from ISO 8601 date string
 * @param {string} to ISO 8601 date string
 * @param {ArticlesFile} [file=data]
 * @returns {Promise<Article[]>}
 */
export async function getByDate(from, to, file = data) {
    const handler = getHandler(file);
    return handler.getByDate(from, to, file);
}

/**
 * Finds all articles that have all of the given tags.
 * 
 * @param {string[]} tags
 * @param {ArticlesFile} [file=data]
 * @returns {Promise<Article[]>}
 */
export async function getByTags(tags, file = data) {
    const handler = getHandler(file);
    return handler.getByTags(tags, file);
}

/**
 * Finds all articles that have all of the given authors.
 * 
 * @param {string[]} authors
 * @param {ArticlesFile} file
 * @returns {Promise<Article[]>}
 */
export async function getByAuthors(authors, file = data) {
    const handler = getHandler(file);
    return handler.getByAuthors(authors, file);
}

/**
 * Gets the the previous and next article for a given article ID.
 * 
 * @param {string} id
 * @param {ArticlesFile} file
 * @returns {Promise<{ previous?: Article, next?: Article }>}
 */
export async function getAdjacent(id, file = data) {
    const handler = getHandler(file);
    return handler.getAdjacent(id, file);
}


//----- ArticlesHandler -----//
/** @type {ArticlesHandler} */
const jsonHandlerV1 = {
    async getById(id, file) {
        let result = file.articles.find(a => a.id === id);
        if(!result && file.previous?.path) result = await this.getById(id, await getFile(file.previous));
        return result;
    },

    async getBySlug(slug, file) {
        let result = file.articles.find(a => a.slug === slug);
        if(!result && file.previous?.path) result = await this.getBySlug(slug, await getFile(file.previous));
        return result;
    },

    async getLatest(count = 1, file) {
        const extracted = file.articles.slice(0, count);
        const remaining = count - extracted.length;

        if (remaining > 0 && file.previous?.path) {
            const prevArticles = await this.getLatest(remaining, await getFile(file.previous));
            extracted.push(...prevArticles);
        }

        return extracted;
    },

    async getByDate(from, to, file) {
        const start = new Date(from);
        const end = new Date(to);

        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            throw new TypeError("Invalid ISO date string");
        }
        if (start > end) {
            throw new RangeError("Start date must be before end date");
        }

        const fileFrom = new Date(file.range.from);
        const fileTo = new Date(file.range.to);

        const result = [];

        if (start <= fileTo && end >= fileFrom) {
            for (const a of file.articles) {
                const articleDate = new Date(a.date);
                if (articleDate >= start && articleDate <= end) {
                    result.push(a);
                }
            }
        }

        if (file.previous?.path && start < fileFrom) {
            const prev = await this.getByDate(from, to, await getFile(file.previous));
            result.push(...prev);
        }

        return result;
    },

    async getByTags(tags, file) {
        const result = [];
        
        for(const a of file.articles) {
            const allIncluded = tags.every(tag => a.tags.includes(tag));
            if(allIncluded) result.push(a);
        }

        if(file.previous?.path) {
            const prev = await this.getByTags(tags, await getFile(file.previous));
            result.push(...prev);
        }

        return result;
    },

    async getByAuthors(tags, file) {
        const result = [];
        
        for(const a of file.articles) {
            const allIncluded = tags.every(tag => a.authors.includes(tag));
            if(allIncluded) result.push(a);
        }

        if(file.previous?.path) {
            const prev = await this.getByAuthors(tags, await getFile(file.previous));
            result.push(...prev);
        }

        return result;
    },

    async getAdjacent(id, file) {
        const index = file.articles.findIndex(a => a.id === id);
        if (index === -1) {
            if (!file.previous?.path) return { previous: undefined, next: undefined };
            return this.getAdjacent(id, await getFile(file.previous));
        }

        const result = {
            next: index > 0 ? file.articles[index - 1] : undefined,
            previous: undefined
        };

        if (index + 1 < file.articles.length) {
            result.previous = file.articles[index + 1];
        }
        else if (file.previous?.path) {
            const previousFile = await getFile(file.previous);
            result.previous = previousFile.articles[0];
        }

        return result;
    }
}


//----- Mapping API to ArticlesHandler -----//
const handlers = {
    "article-collection@1": jsonHandlerV1
};

function getHandler(file) {
    const fileFormat = `${file.format}@${file.version}`;
    const handler = handlers[fileFormat];
    if(!handler) throw new Error(`Unsupported file format ${fileFormat}`);
    return handler;
}

/**
 * 
 * @param {string} formatVersion must match the "format@version" pattern
 * @param {ArticlesHandler} handler 
 */
export function registerHandler(formatVersion, handler) {
    const requiredMethods = ["getById", "getBySlug", "getLatest", "getByDate", "getByTags", "getByAuthors"];

    if (typeof formatVersion !== "string" || !formatVersion.includes("@")) {
        throw new TypeError(`Invalid formatVersion: ${formatVersion}`);
    }

    if (!handler) {
        throw new TypeError("Handler must be an object implementing ArticlesHandler");
    }

    for (const method of requiredMethods) {
        if (typeof handler[method] !== "function") {
            throw new TypeError(`Handler is missing method: ${method}`);
        }
    }

    if(handlers[formatVersion]) console.warn(`Handler for ${formatVersion} is being overwritten`);
    handlers[formatVersion] = handler;
}


//----- Internal File Logic -----//
const cache = new Map();

async function getFile({ path, lastChanged }) {
    if (!path) return null;

    let result = cache.get(path);
    if (!result || new Date(lastChanged) > new Date(result.lastChanged)) {
        result = await loadFile(path);
    }

    return result;
}

async function loadFile(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();

    cache.set(url, data);
    saveCacheEntry(url, data);

    return data;
}


//----- IDB Setup for cross-session Caching -----//
function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open("article-cache", 1);
        req.onupgradeneeded = () => {
            req.result.createObjectStore("files");
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function saveCacheEntry(key, value) {
    const db = await openDB();
    const tx = db.transaction("files", "readwrite");
    tx.objectStore("files").put(value, key);
}

async function loadCache() {
    const db = await openDB();
    const tx = db.transaction("files", "readonly");
    const store = tx.objectStore("files");

    return new Promise(resolve => {
        const req = store.getAllKeys();
        req.onsuccess = async () => {
            for (const key of req.result) {
                const val = await new Promise(r => {
                    const g = store.get(key);
                    g.onsuccess = () => r(g.result);
                });
                cache.set(key, val);
            }
            resolve();
        };
    });
}
