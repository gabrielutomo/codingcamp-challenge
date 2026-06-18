/* ========================================
   TasksComponent CRUD Tests (Tasks 5.1-5.4)
   Testing: addTask, editTask, toggleTask, deleteTask,
            isDuplicate, showDuplicateError
   Requirements: 5.1-5.6, 6.1-6.4, 7.1-7.4, 11.1, 11.2
   ======================================== */

class MockElement {
    constructor() {
        this.textContent = '';
        this.innerHTML = '';
        this.children = new Map();
        this.childElements = [];
        this.eventListeners = new Map();
        this.classList = {
            classes: new Set(),
            add(cls) { this.classes.add(cls); },
            remove(cls) { this.classes.delete(cls); },
            contains(cls) { return this.classes.has(cls); }
        };
    }

    querySelector(selector) {
        if (selector.startsWith('[data-task-id="')) {
            const id = selector.match(/data-task-id="([^"]+)"/)?.[1];
            return this.childElements.find(el => el.getAttribute?.('data-task-id') === id) || null;
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
        this.state = {
            tasks: [],
            ...initialState
        };
        this.subscribers = { tasks: [] };
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
        return () => {
            const index = this.subscribers[key].indexOf(callback);
            if (index > -1) {
                this.subscribers[key].splice(index, 1);
            }
        };
    }
}

class TasksComponent {
    constructor(element, stateManager) {
        this.element = element;
        this.stateManager = stateManager;
        this.unsubscribe = null;
        this.taskInput = null;
        this.addButton = null;
        this.listContainer = null;
        this.errorElement = null;
        this.duplicateErrorTimeout = null;
    }

    init() {
        this.taskInput = this.element.querySelector('[data-task-input]');
        this.addButton = this.element.querySelector('[data-task-add]');
        this.listContainer = this.element.querySelector('[data-task-list]');
        this.errorElement = this.element.querySelector('[data-task-error]');
        this.unsubscribe = this.stateManager.subscribe('tasks', () => this.render());
        this.render();
    }

    generateTaskId() {
        return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }

    addTask(description) {
        const trimmed = description.trim();
        if (!trimmed || trimmed.length > 500) return;
        if (this.isDuplicate(trimmed)) {
            this.showDuplicateError();
            return;
        }
        const tasks = this.stateManager.getState('tasks') || [];
        this.stateManager.setState('tasks', [...tasks, {
            id: this.generateTaskId(),
            description: trimmed,
            completed: false,
            createdAt: Date.now()
        }]);
    }

    editTask(id, newDescription) {
        const trimmed = newDescription.trim();
        if (!trimmed || trimmed.length > 500) return;
        const tasks = this.stateManager.getState('tasks') || [];
        const normalized = trimmed.toLowerCase();
        if (tasks.some(t => t.id !== id && t.description.trim().toLowerCase() === normalized)) {
            this.showDuplicateError();
            return;
        }
        this.stateManager.setState('tasks', tasks.map(task =>
            task.id === id ? { ...task, description: trimmed } : task
        ));
    }

    toggleTask(id) {
        const tasks = this.stateManager.getState('tasks') || [];
        this.stateManager.setState('tasks', tasks.map(task =>
            task.id === id ? { ...task, completed: !task.completed } : task
        ));
    }

    deleteTask(id) {
        const tasks = this.stateManager.getState('tasks') || [];
        this.stateManager.setState('tasks', tasks.filter(task => task.id !== id));
    }

    isDuplicate(description) {
        const normalized = description.trim().toLowerCase();
        if (!normalized) return false;
        const tasks = this.stateManager.getState('tasks') || [];
        return tasks.some(task => task.description.trim().toLowerCase() === normalized);
    }

    showDuplicateError() {
        if (this.errorElement) {
            this.errorElement.textContent = 'This task already exists!';
        }
        if (this.duplicateErrorTimeout) {
            clearTimeout(this.duplicateErrorTimeout);
        }
        this.duplicateErrorTimeout = setTimeout(() => {
            if (this.errorElement) {
                this.errorElement.textContent = '';
            }
        }, 3000);
    }

    render() {
        const tasks = this.stateManager.getState('tasks') || [];
        if (!this.listContainer) return;
        this.listContainer.innerHTML = '';
        if (tasks.length === 0) {
            this.listContainer.innerHTML = '<li class="empty-state">No tasks yet. Add one above!</li>';
        }
    }
}

console.log('========================================');
console.log('Running TasksComponent CRUD Tests (Tasks 5.1-5.4)');
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

test('addTask() creates task with id, description, completed, createdAt (Req 5.1)', () => {
    const element = new MockElement();
    const listContainer = new MockElement();
    element.addChild('[data-task-list]', listContainer);
    const stateManager = new MockStateManager();
    const tasks = new TasksComponent(element, stateManager);
    tasks.init();

    tasks.addTask('Buy milk');

    const result = stateManager.getState('tasks');
    assertEqual(result.length, 1);
    assert(result[0].id, 'Should have id');
    assertEqual(result[0].description, 'Buy milk');
    assertEqual(result[0].completed, false);
    assert(result[0].createdAt, 'Should have createdAt');
});

test('addTask() rejects empty description (Req 5.1)', () => {
    const element = new MockElement();
    element.addChild('[data-task-list]', new MockElement());
    const stateManager = new MockStateManager();
    const tasks = new TasksComponent(element, stateManager);
    tasks.init();

    tasks.addTask('   ');
    assertEqual(stateManager.getState('tasks').length, 0);
});

test('addTask() rejects description over 500 chars (Req 5.1)', () => {
    const element = new MockElement();
    element.addChild('[data-task-list]', new MockElement());
    const stateManager = new MockStateManager();
    const tasks = new TasksComponent(element, stateManager);
    tasks.init();

    tasks.addTask('a'.repeat(501));
    assertEqual(stateManager.getState('tasks').length, 0);
});

test('editTask() updates task description (Req 5.2)', () => {
    const element = new MockElement();
    element.addChild('[data-task-list]', new MockElement());
    const stateManager = new MockStateManager({
        tasks: [{ id: '1', description: 'Old', completed: false, createdAt: 1000 }]
    });
    const tasks = new TasksComponent(element, stateManager);
    tasks.init();

    tasks.editTask('1', 'New description');
    assertEqual(stateManager.getState('tasks')[0].description, 'New description');
});

test('toggleTask() toggles completion status (Req 5.3)', () => {
    const element = new MockElement();
    element.addChild('[data-task-list]', new MockElement());
    const stateManager = new MockStateManager({
        tasks: [{ id: '1', description: 'Task', completed: false, createdAt: 1000 }]
    });
    const tasks = new TasksComponent(element, stateManager);
    tasks.init();

    tasks.toggleTask('1');
    assertEqual(stateManager.getState('tasks')[0].completed, true);

    tasks.toggleTask('1');
    assertEqual(stateManager.getState('tasks')[0].completed, false);
});

test('deleteTask() removes task from list (Req 5.4)', () => {
    const element = new MockElement();
    element.addChild('[data-task-list]', new MockElement());
    const stateManager = new MockStateManager({
        tasks: [
            { id: '1', description: 'Keep', completed: false, createdAt: 1000 },
            { id: '2', description: 'Remove', completed: false, createdAt: 2000 }
        ]
    });
    const tasks = new TasksComponent(element, stateManager);
    tasks.init();

    tasks.deleteTask('2');
    const result = stateManager.getState('tasks');
    assertEqual(result.length, 1);
    assertEqual(result[0].id, '1');
});

test('isDuplicate() is case-insensitive (Req 6.1)', () => {
    const element = new MockElement();
    element.addChild('[data-task-list]', new MockElement());
    const stateManager = new MockStateManager({
        tasks: [{ id: '1', description: 'Buy Milk', completed: false, createdAt: 1000 }]
    });
    const tasks = new TasksComponent(element, stateManager);
    tasks.init();

    assert(tasks.isDuplicate('buy milk'));
    assert(tasks.isDuplicate('  BUY MILK  '));
    assert(!tasks.isDuplicate('Buy eggs'));
});

test('addTask() prevents duplicate and shows error (Req 6.2, 6.3)', () => {
    const element = new MockElement();
    const errorElement = new MockElement();
    element.addChild('[data-task-list]', new MockElement());
    element.addChild('[data-task-error]', errorElement);
    const stateManager = new MockStateManager({
        tasks: [{ id: '1', description: 'Existing', completed: false, createdAt: 1000 }]
    });
    const tasks = new TasksComponent(element, stateManager);
    tasks.init();

    tasks.addTask('existing');
    assertEqual(stateManager.getState('tasks').length, 1);
    assertEqual(errorElement.textContent, 'This task already exists!');
});

test('showDuplicateError() clears after 3 seconds (Req 6.4)', () => {
    const element = new MockElement();
    const errorElement = new MockElement();
    element.addChild('[data-task-list]', new MockElement());
    element.addChild('[data-task-error]', errorElement);
    const stateManager = new MockStateManager();
    const tasks = new TasksComponent(element, stateManager);
    tasks.init();

    let timeoutCallback;
    const originalSetTimeout = global.setTimeout;
    global.setTimeout = (fn, ms) => {
        assertEqual(ms, 3000);
        timeoutCallback = fn;
        return 1;
    };

    tasks.showDuplicateError();
    assertEqual(errorElement.textContent, 'This task already exists!');

    timeoutCallback();
    assertEqual(errorElement.textContent, '');

    global.setTimeout = originalSetTimeout;
});

test('Tasks persist via StateManager setState (Req 7.1-7.4)', () => {
    const element = new MockElement();
    element.addChild('[data-task-list]', new MockElement());
    const stateManager = new MockStateManager();
    const tasks = new TasksComponent(element, stateManager);
    tasks.init();

    tasks.addTask('Task 1');
    tasks.addTask('Task 2');
    assertEqual(stateManager.getState('tasks').length, 2);

    tasks.toggleTask(stateManager.getState('tasks')[0].id);
    assertEqual(stateManager.getState('tasks')[0].completed, true);

    tasks.deleteTask(stateManager.getState('tasks')[1].id);
    assertEqual(stateManager.getState('tasks').length, 1);
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
