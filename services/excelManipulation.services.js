const ExcelJS = require('exceljs');

// Function to read data from Excel
async function readFromExcel(workbook) {
    try {
        const worksheet = workbook.getWorksheet('Data');
        if (worksheet) {
            const userList = [];
            worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
                if (rowNumber === 1) return; // Skip header row
                const entryObject = {
                    id: row.getCell(1).value,
                    name: row.getCell(2).value,
                    priority: row.getCell(3).value
                };
                userList.push(entryObject);
            });
            return userList;
        } else {
            return [];
        }
    } catch (error) {
        console.error('Error reading from file:', error);
        return [];
    }
}

// Function to add or get the worksheet
function addWorksheet(workbook) {
    let worksheet = workbook.getWorksheet('Data');
    if (!worksheet) {
        worksheet = workbook.addWorksheet('Data');
    }
    return worksheet;
}

// Function to initialize the workbook and worksheet
async function initializeWorkbook() {
    const workbook = new ExcelJS.Workbook();
    try {
        await workbook.xlsx.readFile('personlist.xlsx');
    } catch (error) {
        console.log('File does not exist, creating a new one.');
    }
    const worksheet = addWorksheet(workbook);
    worksheet.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Name', key: 'name', width: 32 },
        { header: 'Priority', key: 'priority', width: 15 }
    ];
    worksheet.getRow(1).font = { bold: true };
    return { workbook, worksheet };
}

// Function to write data to Excel
async function writeToFile(workbook) {
    try {
        await workbook.xlsx.writeFile('personlist.xlsx');
    } catch (error) {
        console.error('Error writing to file:', error);
        throw error;
    }
}

module.exports = {
    readFromExcel,
    addWorksheet,
    initializeWorkbook,
    writeToFile
};
