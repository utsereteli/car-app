import * as feather from 'feather-icons';
import $ from 'jquery';
import {
    db,
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    onSnapshot
} from './firebase.js';
import './styles.css';

// Initialize Feather Icons
feather.replace();

// Ensure dark mode icons are visible after initialization
setTimeout(() => {
    updateDarkModeIcons();
}, 200);

// ============================================================================
// Configuration
// ============================================================================

const FIELDS_CONFIG = [
    {
        key: 'marca',
        label: 'მარკა',
        filterId: 'filterMarca',
        modalId: 'marca',
        datalistId: 'marcaListModal',
        sortKey: 'marca',
        shortLabel: 'მარკა'
    },
    {
        key: 'modeli',
        label: 'მოდელი',
        filterId: 'filterModeli',
        modalId: 'modeli',
        datalistId: 'modeliListModal',
        sortKey: 'modeli',
        shortLabel: 'მოდელი'
    },
    {
        key: 'weli',
        label: 'წელი',
        filterId: 'filterWeli',
        modalId: 'weli',
        datalistId: 'WeliListModal',
        sortKey: 'weli',
        shortLabel: 'წელი'
    },
    {
        key: 'motc',
        label: 'ძრავის მოცულობა',
        filterId: 'filterMotc',
        modalId: 'motc',
        datalistId: 'motcListModal',
        sortKey: 'motc',
        shortLabel: 'ძრ. მოცულობა'
    },
    {
        key: 'turbo',
        label: 'ტურბინა',
        filterId: 'filterTurbo',
        modalId: 'turbo',
        datalistId: 'turboListModal',
        sortKey: 'turbo',
        shortLabel: 'ტურბინა'
    },
    {
        key: 'filterD',
        label: 'ძრავის ფილტრი',
        filterId: 'filterFilterD',
        modalId: 'filterD',
        datalistId: 'filterDListModal',
        sortKey: 'filterD',
        shortLabel: 'ძრ. ფილტრი'
    },
    {
        key: 'filterK',
        label: 'კაროპკის ფილტრი',
        filterId: 'filterFilterK',
        modalId: 'filterK',
        datalistId: 'filterKListModal',
        sortKey: 'filterK',
        shortLabel: 'კარ. ფილტრი'
    },
    {
        key: 'karobkis',
        label: 'კარობკის ზეთი',
        filterId: 'filterKarobkis',
        modalId: 'karobkis',
        datalistId: 'karobkisListModal',
        sortKey: 'karobkis',
        shortLabel: 'კარ. ზეთი'
    },
    {
        key: 'zeti',
        label: 'ძრავის ზეთი',
        filterId: 'filterZeti',
        modalId: 'zeti',
        datalistId: 'zetiListModal',
        sortKey: 'zeti',
        shortLabel: 'ძრ. ზეთი'
    }
];

const COLLECTION_NAME = 'cars';
const CSV_FILENAME = 'cars.csv';

// ============================================================================
// State Management
// ============================================================================

let cars = [];
// Sort state: null = unsorted, 'asc' = ascending, 'desc' = descending
let currentSort = { key: '', state: null };
// Column visibility state - load from localStorage or default to all visible
let columnVisibility = {};
const loadColumnVisibility = () => {
    const saved = localStorage.getItem('columnVisibility');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            FIELDS_CONFIG.forEach(field => {
                columnVisibility[field.key] = parsed[field.key] !== undefined ? parsed[field.key] : true;
            });
        } catch (e) {
            // If parsing fails, use defaults
            FIELDS_CONFIG.forEach(field => {
                columnVisibility[field.key] = true;
            });
        }
    } else {
        // Default: all columns visible
        FIELDS_CONFIG.forEach(field => {
            columnVisibility[field.key] = true;
        });
    }
};

const saveColumnVisibility = () => {
    localStorage.setItem('columnVisibility', JSON.stringify(columnVisibility));
};

// Load column visibility on initialization
loadColumnVisibility();

// ============================================================================
// Dark Mode Management
// ============================================================================

/**
 * Loads dark mode preference from localStorage
 */
const loadDarkMode = () => {
    const saved = localStorage.getItem('darkMode');
    if (saved === 'true') {
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
    } else if (saved === 'false') {
        document.documentElement.classList.remove('dark');
        document.body.classList.remove('dark');
    } else {
        // Default: check system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.classList.add('dark');
            document.body.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
            document.body.classList.remove('dark');
        }
    }
    updateDarkModeIcons();
    updateStatusBarStyle();
};

/**
 * Saves dark mode preference to localStorage
 */
const saveDarkMode = (isDark) => {
    localStorage.setItem('darkMode', isDark.toString());
};

/**
 * Toggles dark mode
 */
const toggleDarkMode = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    document.body.classList.toggle('dark');
    saveDarkMode(isDark);
    
    // Update icons immediately
    updateDarkModeIcons();
    // Update status bar style
    updateStatusBarStyle();
    
    // Re-render all icons after dark mode toggle
    setTimeout(() => {
        feather.replace();
        // Ensure icons are updated after re-render
        updateDarkModeIcons();
    }, 100);
};

/**
 * Updates status bar style for iOS based on dark mode
 */
const updateStatusBarStyle = () => {
    const isDark = document.documentElement.classList.contains('dark');
    let statusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    
    if (!statusBarMeta) {
        // Create meta tag if it doesn't exist
        statusBarMeta = document.createElement('meta');
        statusBarMeta.setAttribute('name', 'apple-mobile-web-app-status-bar-style');
        document.head.appendChild(statusBarMeta);
    }
    
    // Dark mode: black status bar (white text on dark background)
    // Light mode: default status bar (black text on white background)
    statusBarMeta.setAttribute('content', isDark ? 'black' : 'default');
};

/**
 * Updates dark mode toggle button icons
 */
const updateDarkModeIcons = () => {
    const isDark = document.documentElement.classList.contains('dark');
    const toggleBtn = document.querySelector('#darkModeToggle');
    
    if (!toggleBtn) return;
    
    // Find icons by their parent span elements
    const iconSpans = toggleBtn.querySelectorAll('span[data-feather]');
    let moonSpan = null;
    let sunSpan = null;
    
    iconSpans.forEach(span => {
        if (span.getAttribute('data-feather') === 'moon') {
            moonSpan = span;
        } else if (span.getAttribute('data-feather') === 'sun') {
            sunSpan = span;
        }
    });
    
    if (moonSpan && sunSpan) {
        // Dark mode-ში: მზე ჩანს, მთვარე დამალული
        // Light mode-ში: მთვარე ჩანს, მზე დამალული
        if (isDark) {
            moonSpan.classList.add('hidden');
            sunSpan.classList.remove('hidden');
        } else {
            moonSpan.classList.remove('hidden');
            sunSpan.classList.add('hidden');
        }
        
        // Re-render icons to ensure they're visible
        setTimeout(() => {
            feather.replace();
        }, 10);
    }
};

// Load dark mode on initialization
loadDarkMode();

// Listen for system theme changes
if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('darkMode')) {
            if (e.matches) {
                document.documentElement.classList.add('dark');
                document.body.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
                document.body.classList.remove('dark');
            }
            updateDarkModeIcons();
            updateStatusBarStyle();
            feather.replace();
        }
    });
}

const columnLabels = [];

// ============================================================================
// Data Loading
// ============================================================================

/**
 * Loads cars from Firestore database
 */
async function loadCars() {
    try {
        showLoader();
        const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
        cars = [];
        querySnapshot.forEach((docSnapshot) => {
            cars.push({ id: docSnapshot.id, ...docSnapshot.data() });
        });
        hideLoader();
        render();
        // Hide page loader and show main content
        hidePageLoader();
    } catch (error) {
        console.error('შეცდომა მონაცემების ჩატვირთვისას:', error);
        hideLoader();
        hidePageLoader();
        showNotification(
            'მონაცემების ჩატვირთვა ვერ მოხერხდა. გთხოვთ, სცადოთ თავიდან.',
            'error'
        );
    }
}

/**
 * Sets up real-time listener for cars collection
 */
onSnapshot(collection(db, COLLECTION_NAME), (snapshot) => {
    cars = [];
    snapshot.forEach((docSnapshot) => {
        cars.push({ id: docSnapshot.id, ...docSnapshot.data() });
    });
    render();
});

// ============================================================================
// UI Helpers
// ============================================================================

/**
 * Shows the loading spinner
 */
function showLoader() {
    $('#loader').removeClass('hidden');
    $('#tableContainer').addClass('min-h-[400px]');
}

/**
 * Hides the loading spinner
 */
function hideLoader() {
    $('#loader').addClass('hidden');
    $('#tableContainer').removeClass('min-h-[400px]');
}

/**
 * Hides the full page loader and shows main content
 */
function hidePageLoader() {
    // Hide splash screen first
    $('#splash-screen').fadeOut(300, () => {
        $('#splash-screen').addClass('hidden');
    });
    
    // Then hide page loader and show content
    $('#pageLoader').fadeOut(300, () => {
        $('#pageLoader').addClass('hidden');
        $('#mainContent').removeClass('hidden');
    });
}

/**
 * Shows an error notification
 * @param {string} message - Error message to display
 * @param {string} type - Type of notification (error, warning, success)
 */
function showNotification(message, type = 'error') {
    const bgGradient = type === 'error' ? 'bg-gradient-to-r from-rose-500 to-pink-500' : 
                      type === 'warning' ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 
                      'bg-gradient-to-r from-emerald-400 to-teal-500';
    
    const notification = $(`
        <div class="fixed top-4 right-4 ${bgGradient} text-white px-6 py-4 rounded-xl shadow-2xl z-50 flex items-center gap-3 animate-slide-in backdrop-blur-sm border border-white/20">
            <span class="font-medium">${message}</span>
            <button class="notification-close text-white hover:text-white/80 hover:bg-white/20 rounded-lg p-1 transition-all duration-300">×</button>
        </div>
    `);
    
    $('body').append(notification);
    
    notification.find('.notification-close').on('click', () => {
        notification.fadeOut(300, () => notification.remove());
    });
    
    setTimeout(() => {
        notification.fadeOut(300, () => notification.remove());
    }, 5000);
}

// ============================================================================
// Datalist Management
// ============================================================================

/**
 * Populates a datalist element with unique values
 * @param {string} id - The datalist element ID
 * @param {Array} arr - Array of values to populate
 */
function populateDatalist(id, arr) {
    const uniqueValues = [...new Set(arr)];
    const options = uniqueValues
        .map(value => `<option value="${value}">`)
        .join('');
    $(id).html(options);
}

/**
 * Populates all filter datalists with current car data
 */
function populateFilterDatalists() {
    FIELDS_CONFIG.forEach(field => {
        const values = cars
            .map(car => car[field.key])
            .filter(v => v !== null && v !== undefined && v !== '');
        populateDatalist(`#${field.datalistId}`, values);
    });
}

// ============================================================================
// Filter Management
// ============================================================================

/**
 * Sets options for a filter dropdown
 * @param {string} id - The filter element ID
 * @param {Array} arr - Array of values
 * @param {string} defaultText - Default option text
 */
function setFilterOptions(id, arr, defaultText) {
    const currentValue = $(id).val();
    const uniqueValues = [...new Set(
        arr.filter(v => v !== null && v !== undefined && v !== '')
    )];

    let html = `<option value="">${defaultText}</option>`;

    if (uniqueValues.length > 0) {
        uniqueValues.forEach(value => {
            html += `<option value="${value}">${value}</option>`;
        });
    }

    $(id).html(html);

    // Keep current value if it still exists in the options, otherwise clear
    if (currentValue !== '' && uniqueValues.includes(currentValue)) {
        $(id).val(currentValue);
    } else {
        $(id).val('');
    }
}

/**
 * Gets filtered cars based on filter values
 * @param {Object} filterValues - Object with filter key-value pairs
 * @returns {Array} Filtered cars array
 */
function getFilteredCars(filterValues) {
    return cars.filter(car => {
        return FIELDS_CONFIG.every(field => {
            const filterValue = filterValues[field.key];
            if (filterValue === '') return true;
            const carValue = car[field.key];
            if (carValue === null || carValue === undefined) return false;
            return carValue.toString() === filterValue;
        });
    });
}

/**
 * Populates all filter dropdowns with appropriate values based on current filter selections
 */
function populateFilters() {
    // Get all current filter values
    const filterValues = {};
    FIELDS_CONFIG.forEach(field => {
        filterValues[field.key] = $(`#${field.filterId}`).val();
    });
    
    // Filter cars based on all selected filters (except the current field being populated)
    FIELDS_CONFIG.forEach(field => {
        let values = [];
        
        // For marca, always show all available marcas regardless of other filters
        if (field.key === 'marca') {
            values = [...new Set(
                cars
                    .map(car => car[field.key])
                    .filter(v => v !== null && v !== undefined && v !== '')
            )].sort();
        } else {
            // For other fields, filter cars based on all other filters (excluding current field)
            let carsToUse = cars.filter(car => {
                return FIELDS_CONFIG.every(otherField => {
                    // Skip the current field we're populating
                    if (otherField.key === field.key) return true;
                    
                    const filterValue = filterValues[otherField.key];
                    if (filterValue === '') return true;
                    
                    const carValue = car[otherField.key];
                    if (carValue === null || carValue === undefined) return false;
                    return carValue.toString() === filterValue;
                });
            });
            
            // Get unique values for this field from filtered cars
            values = [...new Set(
                carsToUse
                    .map(car => car[field.key])
                    .filter(v => v !== null && v !== undefined && v !== '')
            )].sort();
        }
        
        // Get current value before updating options
        const currentValue = $(`#${field.filterId}`).val();
        
        // Set filter options
        setFilterOptions(
            `#${field.filterId}`,
            values,
            `${field.label} (ყველა)`
        );
        
        // If current value is no longer valid, clear it
        if (currentValue !== '' && !values.includes(currentValue)) {
            $(`#${field.filterId}`).val('');
        }
    });
}

/**
 * Gets filtered and searched cars
 * @returns {Array} Filtered cars array
 */
function getFiltered() {
    const searchTerm = $('#searchInput').val().toLowerCase().trim();
    const filterValues = {};

    FIELDS_CONFIG.forEach(field => {
        filterValues[field.key] = $(`#${field.filterId}`).val();
    });

    return cars.filter(car => {
        const matchesFilters = FIELDS_CONFIG.every(field => {
            const value = filterValues[field.key];
            if (value === '') return true;
            const carValue = car[field.key];
            if (carValue === null || carValue === undefined) return false;
            return carValue.toString() === value;
        });

        const matchesSearch = searchTerm === '' ||
            FIELDS_CONFIG.some(field => {
                const carValue = car[field.key];
                if (carValue === null || carValue === undefined) return false;
                return carValue.toString().toLowerCase().includes(searchTerm);
            });

        return matchesFilters && matchesSearch;
    });
}

// ============================================================================
// Rendering
// ============================================================================

/**
 * Sorts cars array based on current sort settings
 * @param {Array} carsArray - Array of cars to sort
 * @returns {Array} Sorted cars array
 */
function sortCars(carsArray) {
    if (!currentSort.key || currentSort.state === null) return carsArray;

    return [...carsArray].sort((a, b) => {
        const aValue = a[currentSort.key];
        const bValue = b[currentSort.key];
        
        // Handle null/undefined values
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        
        const aStr = aValue.toString();
        const bStr = bValue.toString();
        const comparison = aStr.localeCompare(bStr);
        return currentSort.state === 'asc' ? comparison : -comparison;
    });
}

/**
 * Renders the cars table
 */
function render() {
    populateFilters();
    populateFilterDatalists();
    renderActiveFilters();
    renderColumnVisibilityMenu();

    let filteredCars = getFiltered();
    filteredCars = sortCars(filteredCars);

    // Update records count
    $('#recordsCountNumber').text(filteredCars.length);

    if (filteredCars.length === 0) {
        $('#carList').html('');
        $('#noDataMessage').removeClass('hidden');
    } else {
        $('#noDataMessage').addClass('hidden');
        const html = filteredCars.map(car => {
            const cells = FIELDS_CONFIG.map((field, idx) => {
                const isVisible = columnVisibility[field.key] !== false;
                const value = car[field.key];
                const displayValue = value === null || value === undefined ? '' : value;
                return `<td class="py-3 px-4 whitespace-nowrap text-slate-700 dark:text-slate-200 ${!isVisible ? 'hidden' : ''}" data-label="${columnLabels[idx]}" data-column="${field.key}">
                    ${displayValue}
                </td>`;
            }).join('');

            return `
                <tr class="border-b border-slate-200 dark:border-slate-700 md:hover:bg-gradient-to-r md:hover:from-blue-50/50 md:hover:to-indigo-50/50 md:dark:hover:from-slate-700/50 md:dark:hover:to-slate-600/50 transition-all duration-300">
                    ${cells}
                    <td class="py-3 px-4 text-center flex gap-2 justify-center whitespace-nowrap" data-label="${columnLabels[8]}">
                        <button class="editBtn p-2.5 bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-500 dark:from-blue-500 dark:via-blue-600 dark:to-indigo-600 text-white rounded-xl hover:from-blue-500 hover:via-blue-600 hover:to-indigo-600 dark:hover:from-blue-600 dark:hover:via-blue-700 dark:hover:to-indigo-700 transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 flex items-center justify-center" data-id="${car.id}" title="რედაქტირება">
                            <span data-feather="edit-2" class="w-4 h-4"></span>
                        </button>
                        <button class="deleteBtn p-2.5 bg-gradient-to-r from-rose-400 via-rose-500 to-pink-500 dark:from-rose-500 dark:via-rose-600 dark:to-pink-600 text-white rounded-xl hover:from-rose-500 hover:via-rose-600 hover:to-pink-600 dark:hover:from-rose-600 dark:hover:via-rose-700 dark:hover:to-pink-700 transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 flex items-center justify-center" data-id="${car.id}" title="წაშლა">
                            <span data-feather="trash-2" class="w-4 h-4"></span>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        $('#carList').html(html);
    }

    feather.replace();
    updateSortIcons();
}

/**
 * Renders active filter badges
 */
function renderActiveFilters() {
    let html = '';
    FIELDS_CONFIG.forEach(field => {
        const value = $(`#${field.filterId}`).val();
        if (value) {
            html += `
                <span class="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-xl border border-blue-200/50 dark:border-blue-700/50 flex items-center gap-2 shadow-sm hover:shadow-md transition-all duration-300">
                    <span class="text-sm font-medium">${field.label}: ${value}</span>
                    <button data-id="#${field.filterId}" class="removeFilter text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-100/50 dark:hover:bg-blue-800/50 rounded-lg p-1 transition-all duration-300">
                        <span data-feather="x" class="w-3.5 h-3.5"></span>
                    </button>
                </span>
            `;
        }
    });

    $('#activeFilters').html(html);
    
    // Show/hide active filters section based on whether there are any filters
    if (html === '') {
        $('#activeFilters').addClass('hidden');
    } else {
        $('#activeFilters').removeClass('hidden');
    }
    
    feather.replace();
}

// ============================================================================
// Event Handlers Setup
// ============================================================================

/**
 * Sets up all event listeners
 */
function setupEventListeners() {
    // Filter change handlers - when any filter changes, update dependent filters
    FIELDS_CONFIG.forEach(field => {
        $(`#${field.filterId}`)
            .off('change')
            .on('change', () => {
                const currentValue = $(`#${field.filterId}`).val();
                
                // If a filter is cleared, we need to check if other filters are still valid
                // If a filter is set, we need to update dependent filters
                
                // Get all current filter values
                const allFilterValues = {};
                FIELDS_CONFIG.forEach(f => {
                    allFilterValues[f.key] = $(`#${f.filterId}`).val();
                });
                
                // Update the changed filter value
                allFilterValues[field.key] = currentValue;
                
                // For each other filter, check if its current value is still valid
                FIELDS_CONFIG.forEach(otherField => {
                    if (otherField.key === field.key) return; // Skip the changed field
                    
                    const otherValue = allFilterValues[otherField.key];
                    if (otherValue === '') return; // Skip empty filters
                    
                    // Check if this value is still valid with the new filter combination
                    const isValid = cars.some(car => {
                        return FIELDS_CONFIG.every(f => {
                            const filterVal = allFilterValues[f.key];
                            if (filterVal === '') return true;
                            const carVal = car[f.key];
                            if (carVal === null || carVal === undefined) return false;
                            return carVal.toString() === filterVal;
                        });
                    });
                    
                    // If value is no longer valid, clear it
                    if (!isValid) {
                        $(`#${otherField.filterId}`).val('');
                    }
                });
                
                // Re-render to update filters and table
                render();
            });
    });
    
    // Search input listener
    $('#searchInput').on('input', () => {
        render();
    });
}

// ============================================================================
// Modal Management
// ============================================================================

/**
 * Opens the add car modal
 */
function openAddModal() {
    $('#modalTitle').text('დამატება');
    $('#editIndex').val('');
    $('#modal input').val('');
    $('#modal').removeClass('hidden');
}

/**
 * Closes the modal
 */
function closeModal() {
    $('#modal').addClass('hidden');
}

/**
 * Saves a car (add or update)
 */
async function saveCar() {
    const carData = {};
    let hasEmpty = false;

    FIELDS_CONFIG.forEach(field => {
        const value = $(`#${field.modalId}`).val().trim();
        carData[field.key] = value;
        if (!value) hasEmpty = true;
    });

    if (hasEmpty) {
        showNotification('ყველა ველი აუცილებელია!', 'warning');
        return;
    }

    const saveBtn = $('#saveCar');
    const originalText = saveBtn.html();
    saveBtn.prop('disabled', true).html(`
        <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        <span>შენახვა...</span>
    `);

    try {
        const docId = $('#editIndex').val();
        if (docId === '') {
            await addDoc(collection(db, COLLECTION_NAME), carData);
            showNotification('მონაცემი წარმატებით დაემატა!', 'success');
        } else {
            await updateDoc(doc(db, COLLECTION_NAME, docId), carData);
            showNotification('მონაცემი წარმატებით განახლდა!', 'success');
        }
        closeModal();
    } catch (error) {
        console.error('შეცდომა შენახვისას:', error);
        showNotification('მონაცემების შენახვა ვერ მოხერხდა. გთხოვთ, სცადოთ თავიდან.', 'error');
    } finally {
        saveBtn.prop('disabled', false).html(originalText);
    }
}

/**
 * Opens the edit modal for a car
 * @param {string} carId - The car document ID
 */
function openEditModal(carId) {
    const car = cars.find(c => c.id === carId);
    if (!car) return;

    $('#modalTitle').text('რედაქტირება');
    $('#editIndex').val(carId);
    FIELDS_CONFIG.forEach(field => {
        $(`#${field.modalId}`).val(car[field.key]);
    });
    $('#modal').removeClass('hidden');
}

/**
 * Deletes a car
 * @param {string} carId - The car document ID
 */
async function deleteCar(carId) {
    if (!confirm('წაშლა გინდა?')) return;

    try {
        await deleteDoc(doc(db, COLLECTION_NAME, carId));
        showNotification('მონაცემი წარმატებით წაიშალა!', 'success');
    } catch (error) {
        console.error('შეცდომა წაშლისას:', error);
        showNotification('მონაცემის წაშლა ვერ მოხერხდა. გთხოვთ, სცადოთ თავიდან.', 'error');
    }
}

// ============================================================================
// Sorting
// ============================================================================

/**
 * Updates sort icons in table headers
 */
function updateSortIcons() {
    $('th[data-sort]').each(function() {
        const sortKey = $(this).data('sort');
        const $icon = $(this).find('.sort-icon');
        
        if (currentSort.key === sortKey && currentSort.state !== null) {
            // Active sort column
                if (currentSort.state === 'asc') {
                $icon.find('.arrow-up').removeClass('opacity-30').addClass('opacity-100 text-blue-500');
                $icon.find('.arrow-down').removeClass('opacity-100 text-blue-500').addClass('opacity-30');
            } else if (currentSort.state === 'desc') {
                $icon.find('.arrow-up').removeClass('opacity-100 text-blue-500').addClass('opacity-30');
                $icon.find('.arrow-down').removeClass('opacity-30').addClass('opacity-100 text-blue-500');
            }
        } else {
            // Default state - both arrows visible but dimmed
            $icon.find('.arrow-up, .arrow-down')
                .removeClass('opacity-100 text-blue-500')
                .addClass('opacity-30');
        }
    });
    
    // Replace feather icons after updating
    feather.replace();
}

/**
 * Handles table column sorting
 * @param {string} sortKey - The field key to sort by
 */
function handleSort(sortKey) {
    if (currentSort.key === sortKey) {
        // Cycle through states: null -> 'asc' -> 'desc' -> null
        if (currentSort.state === null) {
            currentSort.state = 'asc';
        } else if (currentSort.state === 'asc') {
            currentSort.state = 'desc';
        } else {
            currentSort.state = null;
            currentSort.key = '';
        }
    } else {
        // New column - start with ascending
        currentSort = { key: sortKey, state: 'asc' };
    }
    updateSortIcons();
    render();
}

// ============================================================================
// CSV Export
// ============================================================================

/**
 * Escapes a CSV field value
 * @param {string} value - The value to escape
 * @returns {string} Escaped CSV value
 */
function escapeCSVField(value) {
    if (value === null || value === undefined) {
        return '';
    }
    
    const stringValue = String(value);
    
    // If value contains comma, quote, or newline, wrap in quotes and escape internal quotes
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
        return '"' + stringValue.replace(/"/g, '""') + '"';
    }
    
    return stringValue;
}

/**
 * Exports filtered cars to CSV
 */
function exportToCSV() {
    const filteredCars = getFiltered();
    if (filteredCars.length === 0) {
        showNotification('არ არის მონაცემები ექსპორტისთვის.', 'warning');
        return;
    }

    // Create headers with proper escaping
    const headers = FIELDS_CONFIG.map(field => escapeCSVField(field.label)).join(',');
    
    // Create rows with proper escaping
    const rows = filteredCars.map(car => {
        return FIELDS_CONFIG.map(field => escapeCSVField(car[field.key])).join(',');
    });

    // Combine headers and rows
    const csv = [headers, ...rows].join('\n');
    
    // Add UTF-8 BOM for proper encoding recognition (especially for Excel)
    const BOM = '\uFEFF';
    const csvWithBOM = BOM + csv;
    
    // Create blob with UTF-8 encoding
    const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = CSV_FILENAME;
    link.click();
}

// ============================================================================
// UI Rendering
// ============================================================================

/**
 * Renders table header (thead)
 */
function renderThead() {
    const theadHtml = `
        <tr class="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700">
            ${FIELDS_CONFIG.map(field => {
                const isVisible = columnVisibility[field.key] !== false;
                return `
                <th class="py-4 px-4 cursor-pointer whitespace-nowrap hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 dark:hover:from-slate-600/50 dark:hover:to-slate-500/50 transition-all duration-300 font-semibold text-slate-700 dark:text-slate-200 bg-gradient-to-br from-slate-50/80 to-blue-50/80 dark:from-slate-700/80 dark:to-slate-600/80 ${!isVisible ? 'hidden' : ''}" data-sort="${field.sortKey}" data-label="${field.shortLabel}" data-column="${field.key}">
                    <div class="flex items-center gap-2">
                        <span>${field.label}</span>
                        <span class="sort-icon flex flex-col">
                            <span class="arrow-up opacity-30" data-feather="chevron-up" style="width: 12px; height: 12px;"></span>
                            <span class="arrow-down opacity-30" data-feather="chevron-down" style="width: 12px; height: 12px;"></span>
                        </span>
                    </div>
                </th>
            `;
            }).join('')}
            <th class="py-4 px-4 text-center whitespace-nowrap font-semibold text-slate-700 dark:text-slate-200 bg-gradient-to-br from-slate-50/80 to-blue-50/80 dark:from-slate-700/80 dark:to-slate-600/80" data-label="ქმედება">
                ქმედება
            </th>
        </tr>
    `;
    
    $('table thead').html(theadHtml);
    
    // Initialize columnLabels after rendering
    columnLabels.length = 0;
    document.querySelectorAll('table thead th').forEach(th => {
        const label = th.getAttribute('data-label');
        if (label) {
            columnLabels.push(label);
        }
    });
    
    // Replace feather icons
    feather.replace();
}

/**
 * Renders filter dropdowns
 */
function renderFilters() {
    const filtersHtml = FIELDS_CONFIG.map(field =>
        `<select id="${field.filterId}" class="p-3.5 border border-slate-200 dark:border-slate-600 rounded-xl w-full bg-white/90 dark:bg-slate-700/90 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400/50 dark:focus:ring-blue-500/50 focus:border-blue-400 dark:focus:border-blue-500 transition-all duration-300 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 font-medium">
            <option value="">${field.label} (ყველა)</option>
        </select>`
    ).join('');

    $('.filters-container').html(filtersHtml);
}

/**
 * Renders modal form fields
 */
function renderModalFields() {
    const fieldsHtml = FIELDS_CONFIG.map(field =>
        `<div class="mb-5">
            <label class="block text-sm font-bold bg-gradient-to-r from-slate-700 to-slate-600 dark:from-slate-200 dark:to-slate-300 bg-clip-text text-transparent mb-2.5 tracking-wide">${field.label}:</label>
            <input id="${field.modalId}" class="w-full border border-slate-200/60 dark:border-slate-600/60 p-3.5 h-[48px] rounded-xl bg-white/95 dark:bg-slate-700/95 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400/40 dark:focus:ring-blue-500/40 focus:border-blue-500/60 dark:focus:border-blue-500/60 transition-all duration-300 shadow-sm hover:shadow-md hover:border-blue-300/60 dark:hover:border-blue-600/60 placeholder-slate-400/70 dark:placeholder-slate-400/70 font-medium backdrop-blur-sm" list="${field.datalistId}" placeholder="შეიყვანეთ ${field.label.toLowerCase()}...">
            <datalist id="${field.datalistId}"></datalist>
        </div>`
    ).join('');

    $('.modal-fields-container').html(fieldsHtml);
}

/**
 * Clears all filters and search
 */
function clearAllFilters() {
    FIELDS_CONFIG.forEach(field => {
        $(`#${field.filterId}`).val('');
    });
    $('#searchInput').val('');
    render();
}

/**
 * Renders column visibility menu
 */
function renderColumnVisibilityMenu() {
    const optionsHtml = FIELDS_CONFIG.map(field => {
        const isVisible = columnVisibility[field.key] !== false;
        return `
            <label class="flex items-center gap-2.5 cursor-pointer hover:bg-gradient-to-r hover:from-blue-50/60 hover:to-indigo-50/60 dark:hover:from-slate-700/60 dark:hover:to-slate-600/60 p-2 rounded-xl transition-all duration-300 border border-transparent hover:border-slate-200/50 dark:hover:border-slate-600/50 hover:shadow-sm">
                <div class="custom-checkbox">
                    <input type="checkbox" data-column="${field.key}" ${isVisible ? 'checked' : ''}>
                    <span class="checkmark"></span>
                </div>
                <span class="text-sm font-medium text-slate-700 dark:text-slate-200 select-none">${field.label}</span>
            </label>
        `;
    }).join('');
    
    $('#columnVisibilityOptions').html(optionsHtml);
}

/**
 * Toggles column visibility
 * @param {string} columnKey - The column key to toggle
 */
function toggleColumnVisibility(columnKey) {
    columnVisibility[columnKey] = !columnVisibility[columnKey];
    saveColumnVisibility(); // Save to localStorage
    renderThead();
    render();
}

// ============================================================================
// Event Listeners
// ============================================================================

$(document).on('click', '.removeFilter', function() {
    const id = $(this).data('id');
    $(id).val('');
    render();
});

$('#openAddModal').click(openAddModal);
$('#closeModal').click(closeModal);
$('#saveCar').click(saveCar);

$(document).on('click', '.editBtn', function() {
    const carId = $(this).data('id');
    openEditModal(carId);
});

$(document).on('click', '.deleteBtn', function() {
    const carId = $(this).data('id');
    deleteCar(carId);
});

// Use event delegation for sortable headers (they are dynamically created)
$(document).on('click', 'th[data-sort]', function(e) {
    e.preventDefault();
    e.stopPropagation();
    const sortKey = $(this).attr('data-sort') || $(this).data('sort');
    if (sortKey) {
        handleSort(sortKey);
    }
});

$('#exportCSV').click(exportToCSV);
$('#clearAllFilters').click(clearAllFilters);

// Dark mode toggle
$('#darkModeToggle').click(toggleDarkMode);

// Column visibility toggle button
$('#columnVisibilityBtn').click(function(e) {
    e.stopPropagation();
    $('#columnVisibilityMenu').toggleClass('hidden');
});

// Close column visibility menu when clicking outside
$(document).click(function(e) {
    if (!$(e.target).closest('#columnVisibilityBtn, #columnVisibilityMenu').length) {
        $('#columnVisibilityMenu').addClass('hidden');
    }
});

// Column visibility checkbox change
$(document).on('change', '#columnVisibilityOptions input[type="checkbox"]', function() {
    const columnKey = $(this).data('column');
    toggleColumnVisibility(columnKey);
});

// ============================================================================
// Initialization
// ============================================================================

renderThead();
renderFilters();
renderModalFields();
renderColumnVisibilityMenu();
setupEventListeners();
updateDarkModeIcons(); // Update dark mode icons after initialization
updateStatusBarStyle(); // Update status bar style after initialization
loadCars();

// ============================================================================
// Service Worker Registration (PWA)
// ============================================================================

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('Service Worker registered:', registration);
            })
            .catch((error) => {
                console.log('Service Worker registration failed:', error);
            });
    });
}

// ============================================================================
// PWA Install Prompt
// ============================================================================

let deferredPrompt = null;
const INSTALL_PROMPT_DISMISSED_KEY = 'installPromptDismissed';
const INSTALL_PROMPT_DISMISSED_TIME_KEY = 'installPromptDismissedTime';
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

/**
 * Checks if the app is already installed
 */
function isAppInstalled() {
    // Check if running in standalone mode (installed)
    if (window.matchMedia('(display-mode: standalone)').matches) {
        return true;
    }
    // Check if navigator.standalone is true (iOS)
    if (window.navigator.standalone === true) {
        return true;
    }
    return false;
}

/**
 * Checks if install prompt was recently dismissed
 */
function wasPromptRecentlyDismissed() {
    const dismissedTime = localStorage.getItem(INSTALL_PROMPT_DISMISSED_TIME_KEY);
    if (!dismissedTime) return false;
    
    const timeDiff = Date.now() - parseInt(dismissedTime, 10);
    return timeDiff < DISMISS_DURATION;
}

/**
 * Shows the install prompt
 */
function showInstallPrompt() {
    // Don't show if already installed
    if (isAppInstalled()) {
        return;
    }
    
    // Don't show if recently dismissed
    if (wasPromptRecentlyDismissed()) {
        return;
    }
    
    // Don't show if user explicitly dismissed (unless time expired)
    const dismissed = localStorage.getItem(INSTALL_PROMPT_DISMISSED_KEY);
    if (dismissed === 'true' && wasPromptRecentlyDismissed()) {
        return;
    }
    
    $('#installPrompt').removeClass('hidden');
    feather.replace();
}

/**
 * Hides the install prompt
 */
function hideInstallPrompt() {
    $('#installPrompt').addClass('hidden');
}

/**
 * Handles the install button click
 */
async function handleInstallClick() {
    if (!deferredPrompt) {
        showNotification('ინსტალაცია ამჟამად მიუწვდომელია. გთხოვთ, სცადოთ მოგვიანებით.', 'warning');
        return;
    }
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
        showNotification('აპლიკაცია წარმატებით დაინსტალირდა!', 'success');
    } else {
        showNotification('ინსტალაცია გაუქმდა.', 'warning');
    }
    
    // Clear the deferred prompt
    deferredPrompt = null;
    hideInstallPrompt();
}

/**
 * Handles the dismiss button click
 */
function handleDismissInstall() {
    localStorage.setItem(INSTALL_PROMPT_DISMISSED_KEY, 'true');
    localStorage.setItem(INSTALL_PROMPT_DISMISSED_TIME_KEY, Date.now().toString());
    hideInstallPrompt();
}

// Listen for the beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the default browser install prompt
    e.preventDefault();
    
    // Store the event for later use
    deferredPrompt = e;
    
    // Show our custom install prompt after a short delay
    setTimeout(() => {
        showInstallPrompt();
    }, 2000);
});

// Listen for app installed event
window.addEventListener('appinstalled', () => {
    // Clear any stored dismissal state
    localStorage.removeItem(INSTALL_PROMPT_DISMISSED_KEY);
    localStorage.removeItem(INSTALL_PROMPT_DISMISSED_TIME_KEY);
    
    // Hide the prompt if visible
    hideInstallPrompt();
    
    // Clear the deferred prompt
    deferredPrompt = null;
    
    console.log('PWA was installed');
});

// Set up event listeners for install prompt buttons
$(document).ready(() => {
    $('#installBtn').on('click', handleInstallClick);
    $('#dismissInstall').on('click', handleDismissInstall);
    
    // Check if we should show the prompt on page load
    // (in case the event was missed or page was refreshed)
    if (deferredPrompt) {
        setTimeout(() => {
            showInstallPrompt();
        }, 2000);
    }
});
