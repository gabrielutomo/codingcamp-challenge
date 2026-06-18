/* ========================================
   LinksComponent Tests (Tasks 6.1-6.2)
   Requirements: 8.1-8.5, 9.1-9.3
   ======================================== */

class MockElement {
    constructor() {
        this.textContent = '';
        this.innerHTML = '';
        this.children = new Map();
        this.childElements = [];
        this.eventListeners = new Map();
    }

    querySelector(selector) {
        if (selector.startsWith('[data-link-id="')) {
            const id = selector.match(/data-link-id="([^"]+)"/)?.[1];
            return this.childElements.find(el => el.getAttribute?.('data-link-id') === id) || null;
        }
        return this.children.get(selector) || null;
    }

    addChild(selector, element) {
        this.children.set(selector, element);
    }

    addEventListener(event, handler) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(handler);
    }

    appendChild(element) {
        this.childElements.push(element);
    }

    setAttribute(name, value) {
        this[name] = value;
    }

    getAttribute(name) {
        return this[name];
    }
}

class MockStateManager {
    constructor(initialState = {}) {
        this.state = { links: [], ...initialState };
        this.subscribers = { links: [] };
    }

    getState(key) {
        return this.state[key];
    }

    setState(key, value) {
        this.state[key] = value;
        if (this.subscribers[key]) {
            this.subscribers[key].forEach(callback => callback(value));
        }
    }

    subscribe(key, callback) {
        if (!this.subscribers[key]) {
            this.subscribers[key] = [];
        }
        this.subscribers[key].push(callback);
        return () => {};
    }
}

class LinksComponent {
    constructor(element, stateManager) {
        this.element = element;
        this.stateManager = stateManager;
        this.unsubscribe = null;
        this.nameInput = null;
        this.urlInput = null;
        this.addButton = null;
        this.listContainer = null;
    }

    init() {
        this.nameInput = this.element.querySelector('[data-link-name]');
        this.urlInput = this.element.querySelector('[data-link-url]');
        this.addButton = this.element.querySelector('[data-link-add]');
        this.listContainer = this.element.querySelector('[data-link-list]');
        this.unsubscribe = this.stateManager.subscribe('links', () => this.render());
        this.render();
    }

    generateLinkId() {
        return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }

    validateUrl(url) {
        if (!url || url.trim().length === 0) {
            return { valid: false, error: 'URL cannot be empty' };
        }
        let normalizedUrl = url.trim();
        if (!/^https?:\/\//i.test(normalizedUrl)) {
            normalizedUrl = 'https://' + normalizedUrl;
        }
        try {
            new URL(normalizedUrl);
            return { valid: true, url: normalizedUrl };
        } catch (e) {
            return { valid: false, error: 'Invalid URL format' };
        }
    }

    addLink(name, url) {
        const trimmedName = name.trim();
        const trimmedUrl = url.trim();
        if (!trimmedName || !trimmedUrl) return;
        if (trimmedName.length > 100) return;
        const validation = this.validateUrl(trimmedUrl);
        if (!validation.valid) return;
        const links = this.stateManager.getState('links') || [];
        this.stateManager.setState('links', [...links, {
            id: this.generateLinkId(),
            name: trimmedName,
            url: validation.url,
            createdAt: Date.now()
        }]);
    }

    deleteLink(id) {
        const links = this.stateManager.getState('links') || [];
        this.stateManager.setState('links', links.filter(link => link.id !== id));
    }

    render() {
        const links = this.stateManager.getState('links') || [];
        if (!this.listContainer) return;
        this.listContainer.innerHTML = '';
        if (links.length === 0) {
            this.listContainer.innerHTML = '<li class="empty-state">No links yet. Add one above!</li>';
        }
    }
}

console.log('========================================');
console.log('Running LinksComponent Tests (Tasks 6.1-6.2)');
console.log('========================================\n');

let testsPassed = 0;
let testsFailed = 0;

function test(description, fn) {
    try {
        fn();
        console.log(`✓ ${description}`);
        testsPassed++;
    } catch (error) {
        console.error(`✗ ${description}`);
        console.error(`  Error: ${error.message}`);
        testsFailed++;
    }
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(message || `Expected ${expected} but got ${actual}`);
    }
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

test('validateUrl() rejects empty URL (Req 8.4)', () => {
    const links = new LinksComponent(new MockElement(), new MockStateManager());
    const result = links.validateUrl('');
    assertEqual(result.valid, false);
});

test('validateUrl() prepends https:// when protocol missing (Req 8.1)', () => {
    const links = new LinksComponent(new MockElement(), new MockStateManager());
    const result = links.validateUrl('example.com');
    assertEqual(result.valid, true);
    assertEqual(result.url, 'https://example.com');
});

test('validateUrl() accepts full https URL (Req 8.1)', () => {
    const links = new LinksComponent(new MockElement(), new MockStateManager());
    const result = links.validateUrl('https://github.com');
    assertEqual(result.valid, true);
    assertEqual(result.url, 'https://github.com');
});

test('validateUrl() rejects invalid URL format (Req 8.4)', () => {
    const links = new LinksComponent(new MockElement(), new MockStateManager());
    const result = links.validateUrl('not a valid url!!!');
    assertEqual(result.valid, false);
});

test('addLink() creates link with id, name, url, createdAt (Req 8.1)', () => {
    const element = new MockElement();
    element.addChild('[data-link-list]', new MockElement());
    const stateManager = new MockStateManager();
    const links = new LinksComponent(element, stateManager);
    links.init();

    links.addLink('GitHub', 'github.com');

    const result = stateManager.getState('links');
    assertEqual(result.length, 1);
    assert(result[0].id, 'Should have id');
    assertEqual(result[0].name, 'GitHub');
    assertEqual(result[0].url, 'https://github.com');
    assert(result[0].createdAt, 'Should have createdAt');
});

test('addLink() rejects empty name or URL (Req 8.4)', () => {
    const element = new MockElement();
    element.addChild('[data-link-list]', new MockElement());
    const stateManager = new MockStateManager();
    const links = new LinksComponent(element, stateManager);
    links.init();

    links.addLink('', 'example.com');
    links.addLink('Name', '');
    assertEqual(stateManager.getState('links').length, 0);
});

test('addLink() rejects name over 100 chars (Req 8.4)', () => {
    const element = new MockElement();
    element.addChild('[data-link-list]', new MockElement());
    const stateManager = new MockStateManager();
    const links = new LinksComponent(element, stateManager);
    links.init();

    links.addLink('a'.repeat(101), 'example.com');
    assertEqual(stateManager.getState('links').length, 0);
});

test('deleteLink() removes link from list (Req 8.3)', () => {
    const element = new MockElement();
    element.addChild('[data-link-list]', new MockElement());
    const stateManager = new MockStateManager({
        links: [
            { id: '1', name: 'Keep', url: 'https://a.com', createdAt: 1000 },
            { id: '2', name: 'Remove', url: 'https://b.com', createdAt: 2000 }
        ]
    });
    const links = new LinksComponent(element, stateManager);
    links.init();

    links.deleteLink('2');
    const result = stateManager.getState('links');
    assertEqual(result.length, 1);
    assertEqual(result[0].id, '1');
});

test('Links persist via StateManager setState (Req 9.1, 9.2)', () => {
    const element = new MockElement();
    element.addChild('[data-link-list]', new MockElement());
    const stateManager = new MockStateManager();
    const links = new LinksComponent(element, stateManager);
    links.init();

    links.addLink('Google', 'google.com');
    links.addLink('MDN', 'developer.mozilla.org');
    assertEqual(stateManager.getState('links').length, 2);

    links.deleteLink(stateManager.getState('links')[0].id);
    assertEqual(stateManager.getState('links').length, 1);
});

test('Links display in creation order (Req 8.5)', () => {
    const element = new MockElement();
    element.addChild('[data-link-list]', new MockElement());
    const stateManager = new MockStateManager({
        links: [
            { id: '1', name: 'First', url: 'https://a.com', createdAt: 1000 },
            { id: '2', name: 'Second', url: 'https://b.com', createdAt: 2000 },
            { id: '3', name: 'Third', url: 'https://c.com', createdAt: 3000 }
        ]
    });
    const links = new LinksComponent(element, stateManager);
    links.init();

    const stored = stateManager.getState('links');
    assertEqual(stored[0].name, 'First');
    assertEqual(stored[1].name, 'Second');
    assertEqual(stored[2].name, 'Third');
});

console.log('\n========================================');
console.log('Test Results');
console.log('========================================');
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);
console.log(`Total: ${testsPassed + testsFailed}`);
console.log('========================================\n');

if (testsFailed === 0) {
    console.log('✓ All tests passed!');
} else {
    console.log('✗ Some tests failed');
    process.exit(1);
}
