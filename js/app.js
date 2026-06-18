/* ========================================
   To-Do List Life Dashboard
   Single-file JavaScript application
   ======================================== */

// ========================================
// Storage Service
// ========================================
class StorageService {
    static KEY = 'todoLifeDashboard';

    /**
     * Returns the default application state
     */
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

    /**
     * Loads state from localStorage
     * Returns default state if localStorage is empty or contains invalid data
     * Validates: Requirements 7.5, 9.3
     */
    static load() {
        try {
            const stored = localStorage.getItem(this.KEY);
            
            // Return default state if nothing is stored
            if (!stored) {
                console.log('No stored state found, using defaults');
                return this.getDefaultState();
            }

            // Attempt to parse stored JSON
            const state = JSON.parse(stored);
            
            // Validate that state has expected structure
            if (!state || typeof state !== 'object') {
                console.error('Invalid state structure, using defaults');
                return this.getDefaultState();
            }

            // Return parsed state (with defaults merged for any missing keys)
            return {
                ...this.getDefaultState(),
                ...state
            };
        } catch (error) {
            // Handle JSON parse errors gracefully
            console.error('Failed to parse stored state, using defaults:', error);
            return this.getDefaultState();
        }
    }

    /**
     * Saves state to localStorage
     * Handles QuotaExceededError gracefully
     * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 9.1, 9.2
     */
    static save(state) {
        try {
            const serialized = JSON.stringify(state);
            localStorage.setItem(this.KEY, serialized);
        } catch (error) {
            // Handle quota exceeded errors
            if (error.name === 'QuotaExceededError') {
                console.error('Storage quota exceeded - unable to save state');
                // Could notify user here that storage is full
                // Application continues with in-memory state
            } else {
                // Log other errors but don't crash
                console.error('Failed to save state to localStorage:', error);
            }
        }
    }

    /**
     * Clears all stored data
     */
    static clear() {
        try {
            localStorage.removeItem(this.KEY);
            console.log('Storage cleared successfully');
        } catch (error) {
            console.error('Failed to clear storage:', error);
        }
    }
}

// ========================================
// State Manager
// ========================================
/**
 * Centralized state management for the application
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 9.1, 9.2, 9.3, 10.4, 10.5, 12.3, 12.4, 13.3, 13.4
 */
class StateManager {
    /**
     * Initializes StateManager with storage service
     * @param {StorageService} storage - The storage service for persistence
     */
    constructor(storage) {
        this.storage = storage;
        
        // Initialize state with default schema
        this.state = {
            timer: {
                duration: 25,        // minutes
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
        
        // Subscription registry: key -> array of callbacks
        this.subscribers = {
            timer: [],
            tasks: [],
            links: [],
            preferences: []
        };
    }

    /**
     * Gets the current state value for a given key
     * @param {string} key - The state key to retrieve (timer, tasks, links, preferences)
     * @returns {*} The current value for the key
     */
    getState(key) {
        return this.state[key];
    }

    /**
     * Sets a new state value for a given key and triggers subscribers
     * Automatically persists to storage after updating state
     * @param {string} key - The state key to update
     * @param {*} value - The new value for the key
     */
    setState(key, value) {
        // Update state
        this.state[key] = value;
        
        // Notify all subscribers for this key
        if (this.subscribers[key]) {
            this.subscribers[key].forEach(callback => {
                try {
                    callback(value);
                } catch (error) {
                    console.error(`Error in subscriber callback for key "${key}":`, error);
                }
            });
        }
        
        // Auto-save to storage after state change
        this.saveState();
    }

    /**
     * Subscribes a callback to state changes for a specific key
     * The callback will be invoked whenever setState is called for that key
     * @param {string} key - The state key to subscribe to
     * @param {Function} callback - The callback function to invoke on state changes
     * @returns {Function} Unsubscribe function to remove the subscription
     */
    subscribe(key, callback) {
        // Initialize subscriber array if it doesn't exist
        if (!this.subscribers[key]) {
            this.subscribers[key] = [];
        }
        
        // Add callback to subscribers list
        this.subscribers[key].push(callback);
        
        // Return unsubscribe function
        return () => {
            const index = this.subscribers[key].indexOf(callback);
            if (index > -1) {
                this.subscribers[key].splice(index, 1);
            }
        };
    }

    /**
     * Loads state from storage service and restores application state
     * Called on initialization to restore persisted data
     * Validates: Requirements 7.5, 9.3, 10.5, 12.4, 13.4
     */
    loadState() {
        try {
            // Load state from storage service
            const loadedState = this.storage.load();
            
            // Merge loaded state with current state (preserving any runtime-only data)
            this.state = {
                ...this.state,
                ...loadedState
            };
            
            console.log('State loaded successfully from storage');
        } catch (error) {
            console.error('Failed to load state from storage:', error);
            // Continue with default state if load fails
        }
    }

    /**
     * Saves current state to storage service
     * Called automatically after setState to persist changes
     * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 9.1, 9.2, 10.4, 12.3, 13.3
     */
    saveState() {
        try {
            this.storage.save(this.state);
        } catch (error) {
            console.error('Failed to save state to storage:', error);
            // Don't throw - allow application to continue with in-memory state
        }
    }
}

// ========================================
// Clock Component
// ========================================
/**
 * Real-time clock component that displays time in HH:MM:SS format
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 16.3
 */
class ClockComponent {
    /**
     * Initializes ClockComponent with DOM element
     * @param {HTMLElement} element - The DOM element to render the clock into
     */
    constructor(element) {
        this.element = element;
        this.intervalId = null;
    }

    /**
     * Starts the clock by setting up a 1-second interval
     * Validates: Requirements 1.2, 16.3
     */
    init() {
        // Render immediately to avoid initial delay
        this.render();
        
        // Start interval to update every second (1000ms)
        this.intervalId = setInterval(() => {
            this.render();
        }, 1000);
    }

    /**
     * Clears the interval on cleanup to prevent memory leaks
     */
    destroy() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    /**
     * Updates the DOM with the formatted current time
     * Validates: Requirements 1.1, 1.2, 16.3
     */
    render() {
        const time = this.getCurrentTime();
        const formattedTime = `${this.padZero(time.hours)}:${this.padZero(time.minutes)}:${this.padZero(time.seconds)}`;
        this.element.textContent = formattedTime;
    }

    /**
     * Returns the current time as an object with hours, minutes, seconds
     * Validates: Requirements 1.3
     * @returns {{hours: number, minutes: number, seconds: number}} Current time in 24-hour format
     */
    getCurrentTime() {
        const now = new Date();
        return {
            hours: now.getHours(),      // 24-hour format (0-23)
            minutes: now.getMinutes(),  // 0-59
            seconds: now.getSeconds()   // 0-59
        };
    }

    /**
     * Pads single-digit values with leading zeros
     * Validates: Requirements 1.4
     * @param {number} value - The value to pad
     * @returns {string} Padded string (e.g., "05" for 5, "15" for 15)
     */
    padZero(value) {
        return value.toString().padStart(2, '0');
    }
}

// ========================================
// Greeting Component
// ========================================
/**
 * Displays date and time-appropriate greeting with optional user name
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 13.1, 13.2, 13.3, 13.4
 */
class GreetingComponent {
    /**
     * Initializes GreetingComponent with DOM element and state manager
     * @param {HTMLElement} element - The DOM element to render the greeting into
     * @param {StateManager} stateManager - The state manager for accessing preferences
     */
    constructor(element, stateManager) {
        this.element = element;
        this.stateManager = stateManager;
        this.unsubscribe = null;
    }

    /**
     * Initializes the component by subscribing to userName changes
     * Sets up automatic re-rendering when user name is updated
     */
    init() {
        // Subscribe to preferences changes to update greeting when userName changes
        this.unsubscribe = this.stateManager.subscribe('preferences', () => {
            this.render();
        });
        
        // Initial render
        this.render();
    }

    /**
     * Updates the greeting text in the DOM based on current time and user name
     * Combines time-based greeting with formatted date and optional user name
     */
    render() {
        const greetingText = this.getGreetingText();
        const formattedDate = this.getFormattedDate();
        const preferences = this.stateManager.getState('preferences');
        const userName = preferences?.userName;
        
        // Build greeting message with optional user name
        let message = greetingText;
        if (userName) {
            message += `, ${userName}`;
        }
        
        // Update DOM
        this.element.innerHTML = `
            <div class="greeting-text">${message}</div>
            <div class="date-text">${formattedDate}</div>
        `;
    }

    /**
     * Returns time-based greeting based on current hour
     * @returns {string} Greeting text (Good morning/afternoon/evening/night)
     * 
     * Time ranges:
     * - Morning: 05:00-11:59
     * - Afternoon: 12:00-16:59
     * - Evening: 17:00-20:59
     * - Night: 21:00-04:59
     */
    getGreetingText() {
        const now = new Date();
        const hours = now.getHours();
        
        if (hours >= 5 && hours <= 11) {
            return 'Good morning';
        } else if (hours >= 12 && hours <= 16) {
            return 'Good afternoon';
        } else if (hours >= 17 && hours <= 20) {
            return 'Good evening';
        } else {
            // 21:00-04:59
            return 'Good night';
        }
    }

    /**
     * Returns formatted date string in readable format
     * @returns {string} Formatted date (e.g., "Monday, January 15, 2024")
     */
    getFormattedDate() {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        return now.toLocaleDateString('en-US', options);
    }

    /**
     * Cleanup method to unsubscribe from state changes
     * Should be called when component is destroyed
     */
    destroy() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
    }
}

// ========================================
// Timer Component (Pomodoro)
// ========================================
/**
 * Pomodoro timer component with countdown functionality
 * Validates: Requirements 3.1, 3.6
 */
class TimerComponent {
    /**
     * Initializes TimerComponent with DOM element and state manager
     * @param {HTMLElement} element - The DOM element to render the timer into
     * @param {StateManager} stateManager - The state manager for accessing timer state
     */
    constructor(element, stateManager) {
        this.element = element;
        this.stateManager = stateManager;
        this.intervalId = null;
        
        // Initialize DOM references (will be set in init)
        this.displayElement = null;
        this.startButton = null;
        this.stopButton = null;
        this.resetButton = null;
    }

    /**
     * Initializes the timer component by setting up DOM references and initial render
     * Validates: Requirements 3.1, 3.6, 12.2, 12.3, 12.4
     */
    init() {
        // Get DOM references for timer controls
        this.displayElement = this.element.querySelector('[data-timer-display]');
        this.startButton = this.element.querySelector('[data-timer-start]');
        this.stopButton = this.element.querySelector('[data-timer-stop]');
        this.resetButton = this.element.querySelector('[data-timer-reset]');
        
        // Get DOM references for duration controls
        this.presetButtons = this.element.querySelectorAll('[data-duration]');
        this.customInput = this.element.querySelector('[data-duration-input]');
        this.customSetButton = this.element.querySelector('[data-duration-set]');
        
        // Get DOM reference for sound toggle
        this.soundToggle = this.element.querySelector('[data-sound-toggle]');
        
        // Set up event listeners for preset duration buttons
        this.presetButtons.forEach(button => {
            button.addEventListener('click', () => {
                const duration = parseInt(button.getAttribute('data-duration'), 10);
                this.setDuration(duration, false); // false = not custom
            });
        });
        
        // Set up event listener for custom duration set button
        if (this.customSetButton) {
            this.customSetButton.addEventListener('click', () => {
                const customDuration = parseInt(this.customInput.value, 10);
                if (this.validateCustomDuration(customDuration)) {
                    this.setDuration(customDuration, true); // true = custom
                }
            });
        }
        
        // Set up event listener for Enter key in custom input
        if (this.customInput) {
            this.customInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const customDuration = parseInt(this.customInput.value, 10);
                    if (this.validateCustomDuration(customDuration)) {
                        this.setDuration(customDuration, true);
                    }
                }
            });
        }
        
        // Set up event listener for sound toggle
        if (this.soundToggle) {
            this.soundToggle.addEventListener('change', (e) => {
                this.toggleSound(e.target.checked);
            });
        }
        
        // Set up event listeners for timer controls
        if (this.startButton) {
            this.startButton.addEventListener('click', () => this.start());
        }
        if (this.stopButton) {
            this.stopButton.addEventListener('click', () => this.stop());
        }
        if (this.resetButton) {
            this.resetButton.addEventListener('click', () => this.reset());
        }
        
        // Subscribe to timer state changes to update UI
        this.stateManager.subscribe('timer', () => {
            this.render();
            this.updateDurationUI();
        });
        
        // Subscribe to preferences changes to update sound toggle UI
        this.stateManager.subscribe('preferences', () => {
            this.updateSoundToggleUI();
        });
        
        // Initial render and UI update
        this.render();
        this.updateDurationUI();
        this.updateSoundToggleUI();
    }

    /**
     * Starts the timer countdown
     * Begins counting down from current remainingSeconds using 1-second interval
     * Validates: Requirements 3.2, 16.3
     */
    start() {
        // Get current timer state
        const timerState = this.stateManager.getState('timer');
        
        // Don't start if already running or if time is at 0
        if (timerState.isRunning || timerState.remainingSeconds <= 0) {
            return;
        }
        
        // Clear any existing interval to prevent duplicates
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        // Update state to running
        this.stateManager.setState('timer', {
            ...timerState,
            isRunning: true
        });
        
        // Start interval to tick every second
        this.intervalId = setInterval(() => {
            this.tick();
        }, 1000);
    }

    /**
     * Stops (pauses) the timer countdown
     * Validates: Requirements 3.3
     */
    stop() {
        // Get current timer state
        const timerState = this.stateManager.getState('timer');
        
        // Clear the interval
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        // Update state to not running
        this.stateManager.setState('timer', {
            ...timerState,
            isRunning: false
        });
    }

    /**
     * Resets the timer to its configured duration
     * Validates: Requirements 3.4
     */
    reset() {
        // Get current timer state
        const timerState = this.stateManager.getState('timer');
        
        // Stop the timer if running
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        // Reset to duration (convert minutes to seconds)
        const durationInSeconds = timerState.duration * 60;
        
        // Update state with reset values
        this.stateManager.setState('timer', {
            ...timerState,
            isRunning: false,
            remainingSeconds: durationInSeconds
        });
        
        // Re-render to show reset time
        this.render();
    }

    /**
     * Sets the timer duration and updates state
     * Blocks duration changes while timer is running
     * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
     * @param {number} minutes - The duration in minutes (1-180)
     * @param {boolean} isCustom - Whether this is a custom duration
     */
    setDuration(minutes, isCustom = false) {
        // Get current timer state
        const timerState = this.stateManager.getState('timer');
        
        // Block duration changes while timer is running
        if (timerState.isRunning) {
            console.warn('Cannot change duration while timer is running');
            return;
        }
        
        // Validate duration range (1-180 minutes)
        if (minutes < 1 || minutes > 180) {
            console.error('Duration must be between 1 and 180 minutes');
            return;
        }
        
        // Calculate remaining seconds
        const remainingSeconds = minutes * 60;
        
        // Update state with new duration
        this.stateManager.setState('timer', {
            ...timerState,
            duration: minutes,
            isCustom: isCustom,
            remainingSeconds: remainingSeconds
        });
        
        // Clear custom input after setting
        if (this.customInput && isCustom) {
            this.customInput.value = '';
        }
    }
    
    /**
     * Validates custom duration input
     * @param {number} duration - The duration to validate
     * @returns {boolean} Whether the duration is valid
     */
    validateCustomDuration(duration) {
        if (isNaN(duration)) {
            console.error('Duration must be a number');
            return false;
        }
        
        if (duration < 1 || duration > 180) {
            console.error('Duration must be between 1 and 180 minutes');
            return false;
        }
        
        return true;
    }
    
    /**
     * Updates the duration UI to reflect current state
     * Highlights the active preset button or shows custom duration
     */
    updateDurationUI() {
        const timerState = this.stateManager.getState('timer');
        const currentDuration = timerState?.duration || 25;
        const isCustom = timerState?.isCustom || false;
        
        // Update preset button active states
        this.presetButtons.forEach(button => {
            const buttonDuration = parseInt(button.getAttribute('data-duration'), 10);
            
            if (!isCustom && buttonDuration === currentDuration) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
        
        // If custom duration, clear all preset active states
        if (isCustom) {
            this.presetButtons.forEach(button => {
                button.classList.remove('active');
            });
        }
    }

    /**
     * Decrements the timer by one second and checks for completion
     * Auto-stops when reaching 00:00 and plays notification if enabled
     * Validates: Requirements 3.5, 3.6
     */
    tick() {
        // Get current timer state
        const timerState = this.stateManager.getState('timer');
        
        // Decrement seconds (guard against negative values)
        let newRemainingSeconds = timerState.remainingSeconds - 1;
        if (newRemainingSeconds < 0) {
            newRemainingSeconds = 0;
        }
        
        // Check if timer has reached 00:00
        if (newRemainingSeconds === 0) {
            // Stop the timer
            if (this.intervalId) {
                clearInterval(this.intervalId);
                this.intervalId = null;
            }
            
            // Update state
            this.stateManager.setState('timer', {
                ...timerState,
                isRunning: false,
                remainingSeconds: 0
            });
            
            // Play notification if sound is enabled
            const preferences = this.stateManager.getState('preferences');
            if (preferences?.soundEnabled) {
                this.playNotification();
            }
        } else {
            // Update state with decremented time
            this.stateManager.setState('timer', {
                ...timerState,
                remainingSeconds: newRemainingSeconds
            });
        }
        
        // Re-render to show updated time
        this.render();
    }

    /**
     * Updates the DOM with the formatted remaining time
     * Displays time in MM:SS format
     * Validates: Requirements 3.1
     */
    render() {
        // Get current timer state
        const timerState = this.stateManager.getState('timer');
        const remainingSeconds = timerState?.remainingSeconds || 0;
        
        // Convert seconds to minutes and seconds
        const minutes = Math.floor(remainingSeconds / 60);
        const seconds = remainingSeconds % 60;
        
        // Format as MM:SS with zero padding
        const formattedTime = `${this.padZero(minutes)}:${this.padZero(seconds)}`;
        
        // Update display element if it exists
        if (this.displayElement) {
            this.displayElement.textContent = formattedTime;
        }
    }

    /**
     * Pads single-digit values with leading zeros
     * @param {number} value - The value to pad
     * @returns {string} Padded string (e.g., "05" for 5, "15" for 15)
     */
    padZero(value) {
        return value.toString().padStart(2, '0');
    }

    /**
     * Toggles sound notifications on or off
     * Persists the preference to localStorage
     * Validates: Requirements 12.2, 12.3
     * @param {boolean} enabled - Whether sound is enabled
     */
    toggleSound(enabled) {
        const preferences = this.stateManager.getState('preferences');
        
        // Update preferences state with new sound setting
        this.stateManager.setState('preferences', {
            ...preferences,
            soundEnabled: enabled
        });
    }

    /**
     * Updates the sound toggle UI to reflect current state
     * Validates: Requirements 12.4
     */
    updateSoundToggleUI() {
        const preferences = this.stateManager.getState('preferences');
        const soundEnabled = preferences?.soundEnabled !== false; // Default to true
        
        if (this.soundToggle) {
            this.soundToggle.checked = soundEnabled;
        }
    }

    /**
     * Plays notification sound when timer completes
     * Uses Web Audio API to generate a simple beep
     * Handles errors gracefully without breaking timer functionality
     * Validates: Requirements 12.1
     */
    playNotification() {
        try {
            // Create audio context
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create oscillator for beep sound
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            // Connect nodes
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Configure beep: 800Hz frequency, sine wave
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            // Configure volume envelope: fade in, hold, fade out
            const now = audioContext.currentTime;
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01); // Fade in
            gainNode.gain.linearRampToValueAtTime(0.3, now + 0.2);  // Hold
            gainNode.gain.linearRampToValueAtTime(0, now + 0.3);    // Fade out
            
            // Play beep for 300ms
            oscillator.start(now);
            oscillator.stop(now + 0.3);
            
            // Clean up audio context after sound finishes
            oscillator.onended = () => {
                audioContext.close();
            };
        } catch (error) {
            // Silently fail - don't break timer functionality
            // Audio playback may fail due to browser autoplay restrictions
            console.error('Failed to play notification sound:', error);
        }
    }
}

// ========================================
// Tasks Component
// ========================================
/**
 * Task management component with CRUD operations and persistence
 * Validates: Requirements 5.6, 7.1, 7.2, 7.3, 7.4, 7.5
 */
class TasksComponent {
    /**
     * Initializes TasksComponent with DOM element and state manager
     * @param {HTMLElement} element - The DOM element to render the tasks into
     * @param {StateManager} stateManager - The state manager for accessing tasks state
     */
    constructor(element, stateManager) {
        this.element = element;
        this.stateManager = stateManager;
        this.unsubscribe = null;
        
        // Initialize DOM references (will be set in init)
        this.taskInput = null;
        this.addButton = null;
        this.listContainer = null;
        this.errorElement = null;
        this.duplicateErrorTimeout = null;
    }

    /**
     * Initializes the tasks component by setting up DOM references and initial render
     * Subscribes to task state changes for automatic re-rendering
     * Validates: Requirements 7.5
     */
    init() {
        // Get DOM references for task controls
        this.taskInput = this.element.querySelector('[data-task-input]');
        this.addButton = this.element.querySelector('[data-task-add]');
        this.listContainer = this.element.querySelector('[data-task-list]');
        this.errorElement = this.element.querySelector('[data-task-error]');
        
        if (this.addButton) {
            this.addButton.addEventListener('click', () => this.handleAddTask());
        }
        
        if (this.taskInput) {
            this.taskInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleAddTask();
                }
            });
        }
        
        if (this.listContainer) {
            this.listContainer.addEventListener('click', (e) => {
                const actionBtn = e.target.closest('[data-action]');
                if (!actionBtn) return;
                
                const taskItem = actionBtn.closest('[data-task-id]');
                if (!taskItem) return;
                
                const taskId = taskItem.getAttribute('data-task-id');
                const action = actionBtn.getAttribute('data-action');
                
                switch (action) {
                    case 'toggle':
                        this.toggleTask(taskId);
                        break;
                    case 'edit':
                        this.handleEditTask(taskId);
                        break;
                    case 'delete':
                        this.deleteTask(taskId);
                        break;
                    case 'save':
                        this.handleSaveEdit(taskId);
                        break;
                    case 'cancel':
                        this.render();
                        break;
                }
            });
            
            this.listContainer.addEventListener('keydown', (e) => {
                if (e.key !== 'Enter') return;
                const input = e.target.closest('[data-edit-input]');
                if (!input) return;
                
                const taskItem = input.closest('[data-task-id]');
                if (taskItem) {
                    this.handleSaveEdit(taskItem.getAttribute('data-task-id'));
                }
            });
        }
        
        // Subscribe to tasks state changes to update UI
        this.unsubscribe = this.stateManager.subscribe('tasks', () => {
            this.render();
        });
        
        // Initial render
        this.render();
    }

    /**
     * Handles add task from input field
     */
    handleAddTask() {
        const description = this.taskInput?.value?.trim() || '';
        if (!description) return;
        
        if (this.isDuplicate(description)) {
            this.showDuplicateError();
            return;
        }
        
        this.addTask(description);
        if (this.taskInput) {
            this.taskInput.value = '';
        }
    }

    /**
     * Generates a unique task ID using timestamp and random string
     * @returns {string} Unique task identifier
     */
    generateTaskId() {
        return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }

    /**
     * Creates a new task and persists to state
     * Validates: Requirements 5.1, 7.1
     * @param {string} description - Task description text
     */
    addTask(description) {
        const trimmed = description.trim();
        if (!trimmed) return;
        
        if (trimmed.length > 500) {
            console.error('Task description must be 500 characters or less');
            return;
        }
        
        if (this.isDuplicate(trimmed)) {
            this.showDuplicateError();
            return;
        }
        
        const tasks = this.stateManager.getState('tasks') || [];
        const newTask = {
            id: this.generateTaskId(),
            description: trimmed,
            completed: false,
            createdAt: Date.now()
        };
        
        this.stateManager.setState('tasks', [...tasks, newTask]);
    }

    /**
     * Updates an existing task description
     * Validates: Requirements 5.2, 7.2
     * @param {string} id - Task ID to edit
     * @param {string} newDescription - New description text
     */
    editTask(id, newDescription) {
        const trimmed = newDescription.trim();
        if (!trimmed || trimmed.length > 500) return;
        
        const tasks = this.stateManager.getState('tasks') || [];
        const normalized = trimmed.toLowerCase();
        const isDup = tasks.some(
            t => t.id !== id && t.description.trim().toLowerCase() === normalized
        );
        
        if (isDup) {
            this.showDuplicateError();
            return;
        }
        
        this.stateManager.setState('tasks', tasks.map(task =>
            task.id === id ? { ...task, description: trimmed } : task
        ));
    }

    /**
     * Toggles task completion status with visual animation
     * Validates: Requirements 5.3, 5.5, 11.1, 11.2, 7.3
     * @param {string} id - Task ID to toggle
     */
    toggleTask(id) {
        const tasks = this.stateManager.getState('tasks') || [];
        this.stateManager.setState('tasks', tasks.map(task =>
            task.id === id ? { ...task, completed: !task.completed } : task
        ));
    }

    /**
     * Removes a task from the list
     * Validates: Requirements 5.4, 7.4
     * @param {string} id - Task ID to delete
     */
    deleteTask(id) {
        const tasks = this.stateManager.getState('tasks') || [];
        this.stateManager.setState('tasks', tasks.filter(task => task.id !== id));
    }

    /**
     * Checks if a task description already exists (case-insensitive)
     * Validates: Requirements 6.1
     * @param {string} description - Description to check
     * @returns {boolean} Whether a duplicate exists
     */
    isDuplicate(description) {
        const normalized = description.trim().toLowerCase();
        if (!normalized) return false;
        
        const tasks = this.stateManager.getState('tasks') || [];
        return tasks.some(task => task.description.trim().toLowerCase() === normalized);
    }

    /**
     * Shows duplicate task error message and auto-clears after 3 seconds
     * Validates: Requirements 6.2, 6.3, 6.4
     */
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

    /**
     * Switches a task item into inline edit mode
     * @param {string} id - Task ID to edit
     */
    handleEditTask(id) {
        const tasks = this.stateManager.getState('tasks') || [];
        const task = tasks.find(t => t.id === id);
        if (!task || !this.listContainer) return;
        
        const taskItem = this.listContainer.querySelector(`[data-task-id="${id}"]`);
        if (!taskItem) return;
        
        taskItem.innerHTML = '';
        
        const content = document.createElement('div');
        content.className = 'task-content task-edit-mode';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'task-edit-input';
        input.maxLength = 500;
        input.setAttribute('data-edit-input', '');
        input.value = task.description;
        content.appendChild(input);
        
        const actions = document.createElement('div');
        actions.className = 'task-actions';
        
        const saveBtn = document.createElement('button');
        saveBtn.className = 'task-save';
        saveBtn.setAttribute('data-action', 'save');
        saveBtn.setAttribute('aria-label', 'Save edit');
        saveBtn.textContent = 'Save';
        
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'task-cancel';
        cancelBtn.setAttribute('data-action', 'cancel');
        cancelBtn.setAttribute('aria-label', 'Cancel edit');
        cancelBtn.textContent = 'Cancel';
        
        actions.appendChild(saveBtn);
        actions.appendChild(cancelBtn);
        
        taskItem.appendChild(content);
        taskItem.appendChild(actions);
        input.focus();
    }

    /**
     * Saves inline edit for a task
     * @param {string} id - Task ID being edited
     */
    handleSaveEdit(id) {
        const taskItem = this.listContainer?.querySelector(`[data-task-id="${id}"]`);
        const input = taskItem?.querySelector('[data-edit-input]');
        if (!input) return;
        
        this.editTask(id, input.value);
    }

    /**
     * Renders the complete task list to the DOM in creation order
     * Displays tasks with their completion status and action buttons
     * Validates: Requirements 5.6, 7.5
     */
    render() {
        // Get current tasks from state
        const tasks = this.stateManager.getState('tasks') || [];
        
        // Clear the list container
        if (!this.listContainer) {
            return;
        }
        
        this.listContainer.innerHTML = '';
        
        // If no tasks, show empty state message
        if (tasks.length === 0) {
            this.listContainer.innerHTML = '<li class="empty-state">No tasks yet. Add one above!</li>';
            return;
        }
        
        // Render each task (already in creation order from state)
        tasks.forEach(task => {
            const taskElement = this.createTaskElement(task);
            this.listContainer.appendChild(taskElement);
        });
    }
    
    /**
     * Creates a DOM element for a single task
     * @param {Object} task - Task object with { id, description, completed, createdAt }
     * @returns {HTMLElement} The task list item element
     */
    createTaskElement(task) {
        const li = document.createElement('li');
        li.className = 'task-item';
        li.setAttribute('data-task-id', task.id);
        
        if (task.completed) {
            li.classList.add('completed');
        }
        
        // Create task content structure
        li.innerHTML = `
            <div class="task-content">
                <button class="task-toggle" data-action="toggle" aria-label="Toggle completion">
                    <span class="checkbox ${task.completed ? 'checked' : ''}"></span>
                </button>
                <span class="task-description">${this.escapeHtml(task.description)}</span>
            </div>
            <div class="task-actions">
                <button class="task-edit" data-action="edit" aria-label="Edit task">Edit</button>
                <button class="task-delete" data-action="delete" aria-label="Delete task">Delete</button>
            </div>
        `;
        
        return li;
    }
    
    /**
     * Escapes HTML characters to prevent XSS attacks
     * @param {string} text - The text to escape
     * @returns {string} Escaped HTML-safe text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Cleanup method to unsubscribe from state changes
     * Should be called when component is destroyed
     */
    destroy() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
    }
}

// ========================================
// Links Component (Quick Links)
// ========================================
/**
 * Quick links management with persistence
 * Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2, 9.3
 */
class LinksComponent {
    /**
     * @param {HTMLElement} element - The links section DOM element
     * @param {StateManager} stateManager - Centralized state manager
     */
    constructor(element, stateManager) {
        this.element = element;
        this.stateManager = stateManager;
        this.unsubscribe = null;
        this.nameInput = null;
        this.urlInput = null;
        this.addButton = null;
        this.listContainer = null;
    }

    /**
     * Sets up DOM references, event listeners, and initial render
     */
    init() {
        this.nameInput = this.element.querySelector('[data-link-name]');
        this.urlInput = this.element.querySelector('[data-link-url]');
        this.addButton = this.element.querySelector('[data-link-add]');
        this.listContainer = this.element.querySelector('[data-link-list]');

        if (this.addButton) {
            this.addButton.addEventListener('click', () => this.handleAddLink());
        }

        if (this.urlInput) {
            this.urlInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleAddLink();
                }
            });
        }

        if (this.listContainer) {
            this.listContainer.addEventListener('click', (e) => {
                const deleteBtn = e.target.closest('[data-action="delete-link"]');
                if (!deleteBtn) return;

                const linkItem = deleteBtn.closest('[data-link-id]');
                if (linkItem) {
                    this.deleteLink(linkItem.getAttribute('data-link-id'));
                }
            });
        }

        this.unsubscribe = this.stateManager.subscribe('links', () => {
            this.render();
        });

        this.render();
    }

    /**
     * Handles add link from input fields
     */
    handleAddLink() {
        const name = this.nameInput?.value?.trim() || '';
        const url = this.urlInput?.value?.trim() || '';
        this.addLink(name, url);

        if (this.nameInput) this.nameInput.value = '';
        if (this.urlInput) this.urlInput.value = '';
    }

    /**
     * Generates a unique link ID
     * @returns {string} Unique link identifier
     */
    generateLinkId() {
        return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }

    /**
     * Validates and normalizes a URL
     * @param {string} url - Raw URL input
     * @returns {{valid: boolean, url?: string, error?: string}}
     */
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

    /**
     * Creates a new link and persists to state
     * Validates: Requirements 8.1, 8.4, 9.1
     * @param {string} name - Display name for the link
     * @param {string} url - Target URL
     */
    addLink(name, url) {
        const trimmedName = name.trim();
        const trimmedUrl = url.trim();

        if (!trimmedName || !trimmedUrl) {
            console.error('Both name and URL are required');
            return;
        }

        if (trimmedName.length > 100) {
            console.error('Link name must be 100 characters or less');
            return;
        }

        const validation = this.validateUrl(trimmedUrl);
        if (!validation.valid) {
            console.error(validation.error);
            return;
        }

        const links = this.stateManager.getState('links') || [];
        const newLink = {
            id: this.generateLinkId(),
            name: trimmedName,
            url: validation.url,
            createdAt: Date.now()
        };

        this.stateManager.setState('links', [...links, newLink]);
    }

    /**
     * Removes a link from the list
     * Validates: Requirements 8.3, 9.2
     * @param {string} id - Link ID to delete
     */
    deleteLink(id) {
        const links = this.stateManager.getState('links') || [];
        this.stateManager.setState('links', links.filter(link => link.id !== id));
    }

    /**
     * Renders the full links list in creation order
     * Validates: Requirements 8.2, 8.5
     */
    render() {
        const links = this.stateManager.getState('links') || [];

        if (!this.listContainer) return;

        this.listContainer.innerHTML = '';

        if (links.length === 0) {
            this.listContainer.innerHTML = '<li class="empty-state">No links yet. Add one above!</li>';
            return;
        }

        links.forEach(link => {
            const li = document.createElement('li');
            li.className = 'link-item';
            li.setAttribute('data-link-id', link.id);

            const anchor = document.createElement('a');
            anchor.className = 'link-anchor';
            anchor.href = link.url;
            anchor.textContent = link.name;
            anchor.target = '_blank';
            anchor.rel = 'noopener noreferrer';

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'link-delete';
            deleteBtn.setAttribute('data-action', 'delete-link');
            deleteBtn.setAttribute('aria-label', 'Delete link');
            deleteBtn.textContent = 'Delete';

            li.appendChild(anchor);
            li.appendChild(deleteBtn);
            this.listContainer.appendChild(li);
        });
    }

    destroy() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
    }
}

// ========================================
// Theme Component
// ========================================
/**
 * Light/dark theme toggle with persistence
 * Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 13.2
 */
class ThemeComponent {
    /**
     * @param {HTMLElement} element - The preferences aside DOM element
     * @param {StateManager} stateManager - Centralized state manager
     */
    constructor(element, stateManager) {
        this.element = element;
        this.stateManager = stateManager;
        this.unsubscribe = null;
        this.toggleButton = null;
        this.themeIcon = null;
        this.userNameInput = null;
        this.userNameSaveButton = null;
    }

    /**
     * Applies saved theme, wires toggle and user name controls
     */
    init() {
        this.toggleButton = this.element.querySelector('[data-theme-toggle]');
        this.themeIcon = this.element.querySelector('.theme-icon');
        this.userNameInput = this.element.querySelector('[data-user-name]');
        this.userNameSaveButton = this.element.querySelector('[data-user-name-save]');

        const preferences = this.stateManager.getState('preferences');
        this.applyTheme(preferences?.theme || 'dark');

        if (this.userNameInput && preferences?.userName) {
            this.userNameInput.value = preferences.userName;
        }

        if (this.toggleButton) {
            this.toggleButton.addEventListener('click', () => this.toggleTheme());
        }

        if (this.userNameSaveButton) {
            this.userNameSaveButton.addEventListener('click', () => this.saveUserName());
        }

        if (this.userNameInput) {
            this.userNameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.saveUserName();
                }
            });
        }

        this.unsubscribe = this.stateManager.subscribe('preferences', (prefs) => {
            this.applyTheme(prefs?.theme || 'dark');
            if (this.userNameInput && prefs?.userName) {
                this.userNameInput.value = prefs.userName;
            }
        });
    }

    /**
     * Switches between light and dark themes
     * Validates: Requirements 10.1, 10.4
     */
    toggleTheme() {
        const preferences = this.stateManager.getState('preferences');
        const currentTheme = preferences?.theme || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        this.stateManager.setState('preferences', {
            ...preferences,
            theme: newTheme
        });
    }

    /**
     * Applies theme to document root and updates toggle icon
     * Validates: Requirements 10.2, 10.5, 10.6
     * @param {string} theme - 'light' or 'dark'
     */
    applyTheme(theme) {
        const resolvedTheme = theme === 'light' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', resolvedTheme);

        if (this.themeIcon) {
            this.themeIcon.textContent = resolvedTheme === 'dark' ? '☀️' : '🌙';
        }
    }

    /**
     * Saves user name to preferences
     * Validates: Requirements 13.2, 13.3
     */
    saveUserName() {
        const preferences = this.stateManager.getState('preferences');
        const userName = this.userNameInput?.value?.trim() || null;

        this.stateManager.setState('preferences', {
            ...preferences,
            userName: userName || null
        });
    }

    destroy() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
    }
}

// ========================================
// Application Initialization
// ========================================
function initApp() {
    // Initialize StorageService and StateManager
    const stateManager = new StateManager(StorageService);
    
    // Load state from localStorage
    stateManager.loadState();
    
    // Initialize Clock Component
    const clockElement = document.querySelector('[data-clock-display]');
    if (clockElement) {
        const clockComponent = new ClockComponent(clockElement);
        clockComponent.init();
    }
    
    // Initialize Greeting Component
    const greetingElement = document.querySelector('[data-component="greeting"]');
    if (greetingElement) {
        const greetingComponent = new GreetingComponent(greetingElement, stateManager);
        greetingComponent.init();

        // Update greeting every minute for date/time-of-day changes
        setInterval(() => {
            greetingComponent.render();
        }, 60000);
    }
    
    // Initialize Timer Component
    const timerElement = document.querySelector('[data-component="timer"]');
    if (timerElement) {
        const timerComponent = new TimerComponent(timerElement, stateManager);
        timerComponent.init();
    }
    
    // Initialize Tasks Component
    const tasksElement = document.querySelector('[data-component="tasks"]');
    if (tasksElement) {
        const tasksComponent = new TasksComponent(tasksElement, stateManager);
        tasksComponent.init();
    }

    // Initialize Links Component
    const linksElement = document.querySelector('[data-component="links"]');
    if (linksElement) {
        const linksComponent = new LinksComponent(linksElement, stateManager);
        linksComponent.init();
    }

    // Initialize Theme Component
    const themeElement = document.querySelector('[data-component="theme"]');
    if (themeElement) {
        const themeComponent = new ThemeComponent(themeElement, stateManager);
        themeComponent.init();
    }

    console.log('To-Do List Life Dashboard - Initialized');
}

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', initApp);
