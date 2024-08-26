document.addEventListener('DOMContentLoaded', () => {
    const apiUrl = 'http://localhost:3000/entries';

    
    const inputField = document.getElementById('todo-input');
    const prioritySelect = document.getElementById('priority-select');
    const submitButton = document.getElementById('submit');
    const updateInputField = document.getElementById('update-input');
    const updatePrioritySelect = document.getElementById('update-priority-select');
    const updateSubmitButton = document.getElementById('update-submit');
    const cancelUpdateButton = document.getElementById('cancel-update');

    
    let currentEntryName = '';
    let isUpdating = false;

   
    const searchInput = document.getElementById('search-input');
    const filterSelect = document.getElementById('filter-select');

    function checkFormValidity() {
        const isInputNotEmpty = inputField.value.trim() !== '';
        const isPrioritySelected = prioritySelect.value !== '';
        submitButton.disabled = !(isInputNotEmpty && isPrioritySelected);
    }

    inputField.addEventListener('input', checkFormValidity);
    prioritySelect.addEventListener('change', checkFormValidity);

    async function fetchEntries() {
        try {
            const response = await fetch(apiUrl);
            if (response.ok) {
                const entries = await response.json();
                displayEntries(entries);
            } else {
                console.error('Failed to fetch entries:', response.statusText);
            }
        } catch (error) {
            console.error('Error fetching entries:', error);
        }
    }

    function displayEntries(entries) {
        const searchText = searchInput.value.toLowerCase();
        const selectedPriority = filterSelect.value;
        const filteredEntries = entries
            .filter(entry => {
                const matchesSearch = entry.name.toLowerCase().includes(searchText);
                const matchesPriority = !selectedPriority || entry.priority === selectedPriority;
                return matchesSearch && matchesPriority;
            });

        const container = document.getElementById('todo-list');
        container.innerHTML = ''; 
        filteredEntries.forEach(entry => {
            const entryDiv = document.createElement('li');
            entryDiv.dataset.name = entry.name;
            entryDiv.className = 'entry-item';
            entryDiv.innerHTML = `
                ${entry.name}: ${entry.priority}
                <button class="update-button">Update</button>
                <button class="delete-button">Delete</button>`;
            container.appendChild(entryDiv);
        });

        
        document.querySelectorAll('.update-button').forEach(button => {
            button.addEventListener('click', handleUpdateClick);
        });
        document.querySelectorAll('.delete-button').forEach(button => {
            button.addEventListener('click', handleDelete);
        });
    }

    function handleUpdateClick(event) {
        const name = event.target.parentElement.dataset.name;
        currentEntryName = name;
        isUpdating = true;

      
        const entry = document.querySelector(`li[data-name="${name}"]`);
        updateInputField.value = name;
        updatePrioritySelect.value = entry.textContent.split(': ')[1].trim();

        document.getElementById('todo-form').style.display = 'none';
        document.getElementById('update-form-container').style.display = 'block';
        updateInputField.focus();
    }

    async function handleUpdate(event) {
        event.preventDefault();
        const newName = updateInputField.value.trim();
        const newPriority = updatePrioritySelect.value;

        if (newName && newPriority) {
            try {
                const response = await fetch(`http://localhost:3000/entries/${currentEntryName}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ newName, newPriority })
                });
                if (response.ok) {
                    fetchEntries(); // Refresh 
                    cancelUpdate();
                } else {
                    console.error('Failed to update entry:', response.statusText);
                }
            } catch (error) {
                console.error('Error updating entry:', error);
            }
        }
    }

    async function handleDelete(event) {
        const name = event.target.parentElement.dataset.name;

        try {
            const response = await fetch(`http://localhost:3000/entries/${name}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                fetchEntries(); 
            } else {
                console.error('Failed to delete entry:', response.statusText);
            }
        } catch (error) {
            console.error('Error deleting entry:', error);
        }
    }

    document.getElementById('todo-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const name = inputField.value.trim();
        const priority = prioritySelect.value;

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, priority })
            });
            if (response.ok) {
                fetchEntries();
                inputField.value = '';
                // prioritySelect.value = ''; 
                checkFormValidity();
            } else {
                console.error('Failed to add entry:', response.statusText);
            }
        } catch (error) {
            console.error('Error adding entry:', error);
        }
    });

    searchInput.addEventListener('input', () => fetchEntries());
    filterSelect.addEventListener('change', () => fetchEntries());

    document.getElementById('update-form').addEventListener('submit', handleUpdate);

    cancelUpdateButton.addEventListener('click', cancelUpdate);

    function cancelUpdate() {
        isUpdating = false;
        document.getElementById('todo-form').style.display = 'block';
        document.getElementById('update-form-container').style.display = 'none';
        updateInputField.value = '';
        // updatePrioritySelect.value = '';
        checkFormValidity();
    }

   
    fetchEntries();
});
