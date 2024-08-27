const express = require('express');
const cors = require('cors');
const path = require('path');
const { readFromExcel, initializeWorkbook, writeToFile } = require('./service/excelManipulation.services');

const app = express();


app.use(express.json());
app.use(cors());

// Serve static files from the client directory
app.use(express.static(path.join(__dirname, '../client')));

let workbook;
let worksheet;
let dataList = [];

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


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});


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

app.post('/ADD_TODO', async (req, res) => {
    console.log('POST /ADD_TODO endpoint hit with body:', req.body);
    const { name, priority } = req.body;

    if (!name || priority === undefined) {
        return res.status(400).json({ message: 'Please provide both name and priority.' });
    }

    const newEntry = { name, priority };
    dataList.push(newEntry);
    worksheet.addRow([name, priority]);

    try {
        await writeToFile(workbook);
        res.status(201).json(newEntry);
    } catch (error) {
        console.error('Error saving the entry:', error);
        res.status(500).json({ message: 'Error saving the entry.', error });
    }
});

// Update an existing todo by name
app.post('/UPDATE_TODO_BY_ID/:name', async (req, res) => {
    const { name } = req.params;
    const { newName, newPriority } = req.body;

    if (!newName || newPriority === undefined) {
        return res.status(400).json({ message: 'Please provide both new name and new priority.' });
    }

    try {
        const entryIndex = dataList.findIndex(e => e.name === name);
        if (entryIndex === -1) {
            return res.status(404).json({ message: 'Entry not found in dataList.' });
        }

        dataList[entryIndex] = { name: newName, priority: newPriority };

        let entryUpdated = false;
        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            if (row.getCell(1).value === name) {
                row.getCell(1).value = newName;
                row.getCell(2).value = newPriority;
                entryUpdated = true;
            }
        });

        if (!entryUpdated) {
            return res.status(404).json({ message: 'Entry not found in worksheet.' });
        }

        await writeToFile(workbook);

        res.status(200).json({ name: newName, priority: newPriority });
    } catch (error) {
        console.error('Error updating the entry:', error);
        res.status(500).json({ message: 'Error updating the entry.', error });
    }
});

// Delete an entry by name
app.post('/DELETE_TODO_BY_ID/:name', async (req, res) => {
    const { name } = req.params;

    
    const entryIndex = dataList.findIndex(e => e.name === name);
    if (entryIndex === -1) {
        return res.status(404).json({ message: 'Entry not found in dataList.' });
    }
    dataList.splice(entryIndex, 1);

    try {
        const rowsToDelete = [];
        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            if (row.getCell(1).value === name) {
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

const PORT  = process.env.PORT || 3000;

initialize().then(() => {
    app.listen( PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
});
