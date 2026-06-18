/* ========================================
   StateManager Unit Tests
   ======================================== */

// Mock localStorage for testing
class MockLocalStorage {
    constructor() {
        this.store = {};
    }

    getItem(key) {
        return this.store[key] || null;
    }

    setItem(key, value) {
        this.store[key] = value.toString();
    }

    removeItem(key) {
        delete this.store[key];
    }

    clear() {
        this.store = {};
    }
}

// Setup global localStorage mock
global.localStorage = new MockLocalStorage();

// Mock StorageService
class StorageService {
    static KEY = 'todoLifeDashboard';

    static getDefaultState() {
        return {
            timer: {
                duration: 25,
                isCustom: false,
                isRunning: false,
                remainingSeconds: 1500
            },
            tasks: [],
            links: [],
            preferences: {
                theme: 'dark',
                soundEnabled: true,
                userName: null
            }
        };
    }

    static load() {
        try {
            const stored = localStorage.getItem(this.KEY);
            
            if (!stored) {
                return this.getDefaultState();
            }

            const state = JSON.parse(stored);
            
            if (!state || typeof state !== 'object') {
                return this.getDefaultState();
            }

            return {
                ...this.getDefaultState(),
                ...state
            };
        } catch (error) {
            return this.getDefaultState();
        }
    }

    static save(state) {
        try {
            const serialized = JSON.stringify(state);
            localStorage.setItem(this.KEY, serialized);
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                console.error('Storage quota exceeded - unable to save state');
            } else {
                console.error('Failed to save state to localStorage:', error);
            }
        }
    }

    static clear() {
        try {
            localStorage.removeItem(this.KEY);
        } catch (error) {
            console.error('Failed to clear storage:', error);
        }
    }
}

// StateManager class (copied from app.js for testing)
class StateManager {
    constructor(storage) {
        this.storage = storage;
        
        this.state = {
            timer: {
                duration: 25,
                isCustom: false,
                isRunning: false,
                remainingSeconds: 1500
            },
            tasks: [],
            links: [],
            preferences: {
                theme: 'dark',
                soundEnabled: true,
                userName: null
            }
        };
        
        this.subscribers = {
            timer: [],
            tasks: [],
            links: [],
            preferences: []
        };
    }

    getState(key) {
        return this.state[key];
    }

    setState(key, value) {
        this.state[key] = value;
        
        if (this.subscribers[key]) {
            this.subscribers[key].forEach(callback => {
                try {
                    callback(value);
                } catch (error) {
                    console.error(`Error in subscriber callback for key "${key}":`, error);
                }
            });
        }
        
        this.saveState();
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

    loadState() {
        try {
            const loadedState = this.storage.load();
            
            this.state = {
                ...this.state,
                ...loadedState
            };
            
            console.log('State loaded successfully from storage');
        } catch (error) {
            console.error('Failed to load state from storage:', error);
        }
    }

    saveState() {
        try {
            this.storage.save(this.state);
        } catch (error) {
            console.error('Failed to save state to storage:', error);
        }
    }
}

// Test Suite
console.log('========================================');
console.log('Running StateManager Tests');
console.log('========================================\n');

let testsPassed = 0;
let testsFailed = 0;

function test(description, fn) {
    try {
        localStorage.clear();
        fn();
        console.log(`✓ ${description}`);
        testsPassed++;
    } catch (error) {
        console.error(`✗ ${description}`);
        console.error(`  Error: ${error.message}`);
        testsFailed++;
    }
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

function assertEqual(actual, expected, message) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(message || `Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
    }
}

// Test 1: Constructor initializes with storage service
test('Constructor accepts storage service', () => {
    const stateManager = new StateManager(StorageService);
    assert(stateManager.storage === StorageService, 'Storage service should be set');
});

// Test 2: Constructor initializes with default state schema
test('Constructor initializes with default state schema', () => {
    const stateManager = new StateManager(StorageService);
    
    assert(stateManager.state.timer, 'Should have timer state');
    assert(stateManager.state.tasks, 'Should have tasks state');
    assert(stateManager.state.links, 'Should have links state');
    assert(stateManager.state.preferences, 'Should have preferences state');
    
    assertEqual(stateManager.state.timer.duration, 25);
    assertEqual(stateManager.state.timer.isCustom, false);
    assertEqual(stateManager.state.timer.isRunning, false);
    assertEqual(stateManager.state.timer.remainingSeconds, 1500);
    assertEqual(stateManager.state.preferences.theme, 'dark');
    assertEqual(stateManager.state.preferences.soundEnabled, true);
    assertEqual(stateManager.state.preferences.userName, null);
});

// Test 3: getState returns correct state value
test('getState(key) returns current state value', () => {
    const stateManager = new StateManager(StorageService);
    
    const timer = stateManager.getState('timer');
    assertEqual(timer.duration, 25);
    
    const tasks = stateManager.getState('tasks');
    assertEqual(tasks, []);
    
    const preferences = stateManager.getState('preferences');
    assertEqual(preferences.theme, 'dark');
});

// Test 4: setState updates state correctly
test('setState(key, value) updates state', () => {
    const stateManager = new StateManager(StorageService);
    
    const newTasks = [{ id: '1', description: 'Test task', completed: false }];
    stateManager.setState('tasks', newTasks);
    
    const tasks = stateManager.getState('tasks');
    assertEqual(tasks.length, 1);
    assertEqual(tasks[0].description, 'Test task');
});

// Test 5: setState triggers subscribers
test('setState triggers subscribed callbacks', () => {
    const stateManager = new StateManager(StorageService);
    
    let callbackInvoked = false;
    let receivedValue = null;
    
    stateManager.subscribe('tasks', (value) => {
        callbackInvoked = true;
        receivedValue = value;
    });
    
    const newTasks = [{ id: '1', description: 'Test task', completed: false }];
    stateManager.setState('tasks', newTasks);
    
    assert(callbackInvoked, 'Callback should be invoked');
    assertEqual(receivedValue, newTasks);
});

// Test 6: Multiple subscribers all receive updates
test('setState triggers all subscribed callbacks', () => {
    const stateManager = new StateManager(StorageService);
    
    let callback1Invoked = false;
    let callback2Invoked = false;
    
    stateManager.subscribe('tasks', () => { callback1Invoked = true; });
    stateManager.subscribe('tasks', () => { callback2Invoked = true; });
    
    stateManager.setState('tasks', [{ id: '1', description: 'Test', completed: false }]);
    
    assert(callback1Invoked, 'First callback should be invoked');
    assert(callback2Invoked, 'Second callback should be invoked');
});

// Test 7: subscribe returns unsubscribe function
test('subscribe() returns unsubscribe function', () => {
    const stateManager = new StateManager(StorageService);
    
    let callbackInvoked = false;
    
    const unsubscribe = stateManager.subscribe('tasks', () => {
        callbackInvoked = true;
    });
    
    // Unsubscribe before setState
    unsubscribe();
    
    stateManager.setState('tasks', [{ id: '1', description: 'Test', completed: false }]);
    
    assert(!callbackInvoked, 'Callback should not be invoked after unsubscribe');
});

// Test 8: setState auto-saves to storage
test('setState automatically persists to storage', () => {
    const stateManager = new StateManager(StorageService);
    
    const newTasks = [{ id: '1', description: 'Test task', completed: false }];
    stateManager.setState('tasks', newTasks);
    
    // Check that data was saved to localStorage
    const stored = localStorage.getItem(StorageService.KEY);
    assert(stored !== null, 'State should be saved to localStorage');
    
    const parsed = JSON.parse(stored);
    assertEqual(parsed.tasks.length, 1);
    assertEqual(parsed.tasks[0].description, 'Test task');
});

// Test 9: loadState restores from storage
test('loadState() restores state from storage', () => {
    // Save some state first
    const savedState = {
        timer: { duration: 45, isCustom: true, isRunning: false, remainingSeconds: 2700 },
        tasks: [{ id: '1', description: 'Saved task', completed: false }],
        links: [{ id: '1', name: 'Google', url: 'https://google.com' }],
        preferences: { theme: 'light', soundEnabled: false, userName: 'John' }
    };
    StorageService.save(savedState);
    
    // Create new StateManager and load state
    const stateManager = new StateManager(StorageService);
    stateManager.loadState();
    
    // Verify state was restored
    const timer = stateManager.getState('timer');
    assertEqual(timer.duration, 45);
    assertEqual(timer.isCustom, true);
    
    const tasks = stateManager.getState('tasks');
    assertEqual(tasks.length, 1);
    assertEqual(tasks[0].description, 'Saved task');
    
    const preferences = stateManager.getState('preferences');
    assertEqual(preferences.theme, 'light');
    assertEqual(preferences.userName, 'John');
});

// Test 10: loadState handles empty storage gracefully
test('loadState() handles empty storage gracefully', () => {
    const stateManager = new StateManager(StorageService);
    
    // Should not throw
    stateManager.loadState();
    
    // Should still have default state
    const timer = stateManager.getState('timer');
    assertEqual(timer.duration, 25);
});

// Test 11: saveState persists current state
test('saveState() persists current state to storage', () => {
    const stateManager = new StateManager(StorageService);
    
    // Modify state directly (bypassing setState)
    stateManager.state.tasks = [{ id: '1', description: 'Test', completed: false }];
    
    // Manually save
    stateManager.saveState();
    
    // Verify it was saved
    const stored = localStorage.getItem(StorageService.KEY);
    const parsed = JSON.parse(stored);
    assertEqual(parsed.tasks.length, 1);
});

// Test 12: Subscriber error handling doesn't break other subscribers
test('Subscriber errors do not break other subscribers', () => {
    const stateManager = new StateManager(StorageService);
    
    let callback1Invoked = false;
    let callback2Invoked = false;
    
    // First callback throws an error
    stateManager.subscribe('tasks', () => {
        callback1Invoked = true;
        throw new Error('Subscriber error');
    });
    
    // Second callback should still be invoked
    stateManager.subscribe('tasks', () => {
        callback2Invoked = true;
    });
    
    stateManager.setState('tasks', []);
    
    assert(callback1Invoked, 'First callback should be invoked');
    assert(callback2Invoked, 'Second callback should still be invoked despite first error');
});

// Test 13: Subscribe to non-existent key initializes subscribers array
test('subscribe() initializes subscribers array for new keys', () => {
    const stateManager = new StateManager(StorageService);
    
    let callbackInvoked = false;
    
    // Subscribe to a custom key that wasn't in the initial subscribers object
    stateManager.subscribe('customKey', () => {
        callbackInvoked = true;
    });
    
    // Manually call setState with custom key
    stateManager.state.customKey = 'test';
    if (stateManager.subscribers.customKey) {
        stateManager.subscribers.customKey.forEach(cb => cb('test'));
    }
    
    assert(callbackInvoked, 'Callback should be invoked for custom key');
});

// Test 14: Full workflow - load, modify, save, reload
test('Full workflow: load -> modify -> save -> reload preserves data', () => {
    // Initial state manager
    const stateManager1 = new StateManager(StorageService);
    stateManager1.setState('tasks', [{ id: '1', description: 'Task 1', completed: false }]);
    stateManager1.setState('preferences', { theme: 'light', soundEnabled: false, userName: 'Alice' });
    
    // New state manager loads the saved state
    const stateManager2 = new StateManager(StorageService);
    stateManager2.loadState();
    
    const tasks = stateManager2.getState('tasks');
    const preferences = stateManager2.getState('preferences');
    
    assertEqual(tasks.length, 1);
    assertEqual(tasks[0].description, 'Task 1');
    assertEqual(preferences.theme, 'light');
    assertEqual(preferences.userName, 'Alice');
});

// Test 15: State isolation between different keys
test('setState only updates specified key, not others', () => {
    const stateManager = new StateManager(StorageService);
    
    const originalTimer = stateManager.getState('timer');
    
    stateManager.setState('tasks', [{ id: '1', description: 'Test', completed: false }]);
    
    const timerAfter = stateManager.getState('timer');
    
    // Timer should remain unchanged
    assertEqual(originalTimer, timerAfter);
});

// Print results
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
