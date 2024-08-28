const express = require('express');
const cors = require('cors');
const path = require('path');
const { readFromExcel, initializeWorkbook, writeToFile } = require('./services/excelManipulation.services');

const app = express();

app.use(express.json());
app.use(cors());

// Serve static files from the client directory
app.use(express.static(path.join(__dirname, '../client')));

let workbook;
let worksheet;
let dataList = [];

// Initialize the workbook and read the initial data
async function initialize() {
    try {
        const result = await initializeWorkbook();
        workbook = result.workbook;
        worksheet = result.worksheet;
        dataList = await readFromExcel(workbook);
        console.log('Initialization complete.');
    } catch (error) {
        console.error('Error initializing workbook:', error);
    }
}

// Serve the index.html file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Fetch all TODOs
app.post('/GET_ALL_TODOS', async (req, res) => {
    console.log('POST /GET_ALL_TODOS endpoint hit');
    try {
        dataList = await readFromExcel(workbook);
        res.json(dataList);
    } catch (error) {
        console.error('Error fetching todos:', error);
        res.status(500).json({ message: 'Error fetching todos.', error });
    }
});

// Add a new TODO
app.post('/ADD_TODO', async (req, res) => {
    console.log('POST /ADD_TODO endpoint hit with body:', req.body);
    const { name, priority } = req.body;

    if (!name || priority === undefined) {
        return res.status(400).json({ message: 'Please provide both name and priority.' });
    }

    // Determine the new ID based on the highest existing ID
    const newId = dataList.length > 0 ? Math.max(...dataList.map(e => e.id)) + 1 : 1;
    const newEntry = { id: newId, name, priority };
    dataList.push(newEntry);
    worksheet.addRow([newId, name, priority]);

    try {
        await writeToFile(workbook);
        res.status(201).json(newEntry);
    } catch (error) {
        console.error('Error saving the entry:', error);
        res.status(500).json({ message: 'Error saving the entry.', error });
    }
});
app.post('/UPDATE_TODO_BY_ID/:id', async (req, res) => {
    const { id } = req.params; // Extract ID from URL parameters
    const { newName, newPriority } = req.body;

    if (!newName || newPriority === undefined) {
        return res.status(400).json({ message: 'Please provide both new name and new priority.' });
    }

    try {
        const entryIndex = dataList.findIndex(e => e.id === parseInt(id));
        if (entryIndex === -1) {
            return res.status(404).json({ message: 'Entry not found in dataList.' });
        }

        dataList[entryIndex] = { id: parseInt(id), name: newName, priority: newPriority };

        let entryUpdated = false;
        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            if (row.getCell(1).value === parseInt(id)) {
                row.getCell(2).value = newName;
                row.getCell(3).value = newPriority;
                entryUpdated = true;
            }
        });

        if (!entryUpdated) {
            return res.status(404).json({ message: 'Entry not found in worksheet.' });
        }

        await writeToFile(workbook);

        res.status(200).json({ id: parseInt(id), name: newName, priority: newPriority });
    } catch (error) {
        console.error('Error updating the entry:', error);
        res.status(500).json({ message: 'Error updating the entry.', error });
    }
});

// Delete an entry by ID
app.post('/DELETE_TODO_BY_ID/:id', async (req, res) => {
    const { id } = req.params; // Extract ID from URL parameters

    const entryIndex = dataList.findIndex(e => e.id === parseInt(id));
    if (entryIndex === -1) {
        return res.status(404).json({ message: 'Entry not found in dataList.' });
    }
    dataList.splice(entryIndex, 1);

    try {
        const rowsToDelete = [];
        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            if (row.getCell(1).value === parseInt(id)) {
                rowsToDelete.push(rowNumber);
            }
        });

        if (rowsToDelete.length > 0) {
            rowsToDelete.reverse().forEach(rowNumber => {
                worksheet.spliceRows(rowNumber, 1);
            });
        } else {
            return res.status(404).json({ message: 'Entry not found in worksheet.' });
        }

        await writeToFile(workbook);
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting the entry:', error);
        res.status(500).json({ message: 'Error deleting the entry.', error });
    }
});

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

initialize().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on ${BASE_URL}`);
    });
});
