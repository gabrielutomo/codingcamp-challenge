/* ========================================
   StorageService Unit Tests
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

// Import StorageService (in a real test environment, this would be properly imported)
// For now, we'll copy the class definition
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
                console.log('No stored state found, using defaults');
                return this.getDefaultState();
            }

            const state = JSON.parse(stored);
            
            if (!state || typeof state !== 'object') {
                console.error('Invalid state structure, using defaults');
                return this.getDefaultState();
            }

            return {
                ...this.getDefaultState(),
                ...state
            };
        } catch (error) {
            console.error('Failed to parse stored state, using defaults:', error);
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
            console.log('Storage cleared successfully');
        } catch (error) {
            console.error('Failed to clear storage:', error);
        }
    }
}

// Test Suite
console.log('========================================');
console.log('Running StorageService Tests');
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

// Test 1: Load returns default state when localStorage is empty
test('load() returns default state when localStorage is empty', () => {
    const state = StorageService.load();
    const defaultState = StorageService.getDefaultState();
    assertEqual(state, defaultState);
});

// Test 2: Save and load state successfully
test('save() and load() work correctly with valid state', () => {
    const testState = {
        timer: { duration: 45, isCustom: true, isRunning: false, remainingSeconds: 2700 },
        tasks: [{ id: '1', description: 'Test task', completed: false }],
        links: [{ id: '1', name: 'Google', url: 'https://google.com' }],
        preferences: { theme: 'light', soundEnabled: false, userName: 'John' }
    };
    
    StorageService.save(testState);
    const loaded = StorageService.load();
    
    assertEqual(loaded.timer.duration, 45);
    assertEqual(loaded.tasks.length, 1);
    assertEqual(loaded.tasks[0].description, 'Test task');
    assertEqual(loaded.preferences.theme, 'light');
});

// Test 3: Load handles invalid JSON gracefully
test('load() returns default state when localStorage contains invalid JSON', () => {
    localStorage.setItem(StorageService.KEY, 'invalid json {{{');
    const state = StorageService.load();
    const defaultState = StorageService.getDefaultState();
    assertEqual(state, defaultState);
});

// Test 4: Load handles non-object data gracefully
test('load() returns default state when stored data is not an object', () => {
    localStorage.setItem(StorageService.KEY, '"just a string"');
    const state = StorageService.load();
    const defaultState = StorageService.getDefaultState();
    assertEqual(state, defaultState);
});

// Test 5: Load merges with default state for missing keys
test('load() merges partial state with defaults', () => {
    const partialState = {
        tasks: [{ id: '1', description: 'Task 1', completed: false }]
    };
    localStorage.setItem(StorageService.KEY, JSON.stringify(partialState));
    
    const state = StorageService.load();
    
    // Should have the stored tasks
    assertEqual(state.tasks.length, 1);
    assertEqual(state.tasks[0].description, 'Task 1');
    
    // Should have default timer values
    assertEqual(state.timer.duration, 25);
    assertEqual(state.preferences.theme, 'dark');
});

// Test 6: Clear removes data from localStorage
test('clear() removes data from localStorage', () => {
    const testState = StorageService.getDefaultState();
    StorageService.save(testState);
    
    assert(localStorage.getItem(StorageService.KEY) !== null, 'State should be saved');
    
    StorageService.clear();
    
    assert(localStorage.getItem(StorageService.KEY) === null, 'State should be cleared');
});

// Test 7: Storage key constant is correct
test('Storage key constant is "todoLifeDashboard"', () => {
    assertEqual(StorageService.KEY, 'todoLifeDashboard');
});

// Test 8: Default state has correct structure
test('getDefaultState() returns correct structure', () => {
    const defaultState = StorageService.getDefaultState();
    
    assert(defaultState.timer, 'Should have timer object');
    assert(defaultState.tasks, 'Should have tasks array');
    assert(defaultState.links, 'Should have links array');
    assert(defaultState.preferences, 'Should have preferences object');
    
    assertEqual(defaultState.timer.duration, 25);
    assertEqual(defaultState.timer.remainingSeconds, 1500);
    assertEqual(defaultState.preferences.theme, 'dark');
    assertEqual(defaultState.preferences.soundEnabled, true);
    assertEqual(defaultState.preferences.userName, null);
});

// Test 9: Save handles QuotaExceededError gracefully (simulated)
test('save() handles errors gracefully', () => {
    // Override setItem to throw an error
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = () => {
        const error = new Error('Quota exceeded');
        error.name = 'QuotaExceededError';
        throw error;
    };
    
    // Should not throw
    try {
        StorageService.save({ test: 'data' });
        assert(true, 'Should handle error gracefully');
    } catch (error) {
        assert(false, 'Should not throw error');
    }
    
    // Restore original setItem
    localStorage.setItem = originalSetItem;
});

// Test 10: Multiple save/load cycles preserve data
test('Multiple save/load cycles preserve data correctly', () => {
    const state1 = StorageService.getDefaultState();
    state1.tasks.push({ id: '1', description: 'Task 1', completed: false });
    StorageService.save(state1);
    
    const loaded1 = StorageService.load();
    assertEqual(loaded1.tasks.length, 1);
    
    loaded1.tasks.push({ id: '2', description: 'Task 2', completed: true });
    StorageService.save(loaded1);
    
    const loaded2 = StorageService.load();
    assertEqual(loaded2.tasks.length, 2);
    assertEqual(loaded2.tasks[1].description, 'Task 2');
    assertEqual(loaded2.tasks[1].completed, true);
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
