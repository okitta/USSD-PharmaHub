const express = require('express');
const bodyParser = require('body-parser');
const { stringify } = require('querystring');
const { log } = require('console');

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: false }));

// Store session data
const sessions = {};

// Handle initial USSD request
app.post('/ussd', (req, res) => {
    const sessionId = req.body.sessionId;

    if (!sessions[sessionId]) {
        // New session
        sessions[sessionId] = { stage: 'menu' };
        res.send('CON Which one of our services are you going to use?\n1. Search Medicine\n2. Subscription Medicines\n3. Contact Us');
    } else {
        // Existing session
        const stage = sessions[sessionId].stage;

        if (stage === 'menu') {
            // Handle menu selection
            const userInput = req.body.text;
            switch (userInput) {
                case '1':
                    sessions[sessionId].stage = 'search';
                    res.send('CON Enter the name of the medicine you are looking for:');
                    break;
                case '2':
                    // Handle subscription medicines
                    sessions[sessionId].stage = 'subscription';
                    res.send('CON Enter the name of the medicine you are subscribing for:');
                    break;
                case '3':
                    // Handle contact us
                    sessions[sessionId].stage = 'contactUs';
                    res.send('END Contact Information:\nEmail: example@example.com\nPhone Number: +1234567890\nCall Center Number: 1234\n\nPress * to go back to the main menu');
                    break;
                default:
                    res.send('CON Invalid selection. Please try again.\nWhich one of our services are you going to use?\n1. Search Medicine\n2. Subscription Medicines\n3. Contact Us');
            }
        }else if (stage === 'search') {
            // Handle medicine search
            const userInput = req.body.text;
            const user = userInput.split('*');
            // console.log(userInput,user,req.body.text);
            const userInputLowerCase = user[user.length-1].toLowerCase();
            // const currentPage = sessions[sessionId].currentPage || 1;
            // const pageSize = 5;
        
            // Load medicine details from JSON file (assuming synchronous read for simplicity)
            const medicineData = require('./medicine.json');
            const filteredMedicines = [];
            // console.log(userInputLowerCase)
        
            // Search for the medicine in the medicineData
            medicineData.forEach(medicine => {
                if (medicine.name.toLowerCase().includes(userInputLowerCase)) {
                    // console.log(`${medicine.name}`);
                    filteredMedicines.push(medicine);
                }
            });
        
            const totalMedicines = filteredMedicines.length;
        
            if (totalMedicines === 0) {
                res.send('END Medicine not found. Please try again.');
            } else {
                const displayedMedicines = filteredMedicines.slice(1, totalMedicines);
        
                let response = 'CON Medicine Found:\n';
                displayedMedicines.forEach((medicine, index) => {
                    response += `${index + 1}. ${medicine.name} ${medicine.price} ${medicine.location}\n`;
                });
        
                sessions[sessionId].filteredMedicines = filteredMedicines;
                // sessions[sessionId].currentPage = currentPage;
                sessions[sessionId].stage = 'confirm';
                res.send(response);
            }
        }else if (stage === 'confirm') {
            // Handle confirmation
            const userInput = parseInt(req.body.text);
            const totalMedicines = sessions[sessionId].filteredMedicines.length;
            const currentPage = sessions[sessionId].currentPage || 1;
            const pageSize = 5;
        
            if (userInput >= 1 && userInput <= totalMedicines) {
                // User selected a medicine
                const selectedMedicineIndex = (currentPage - 1) * pageSize + userInput - 1;
                const selectedMedicine = sessions[sessionId].filteredMedicines[selectedMedicineIndex];
                const response = `CON Medicine Details:\nName: ${selectedMedicine.name}\nPrice: ${selectedMedicine.price}\nLocation: ${selectedMedicine.location}\nExpiration Date: ${selectedMedicine.expiration_date}\nPhone Number: ${selectedMedicine.phone_number}\n\nDo you want to proceed with this medicine?\n1. Yes\n2. No`;
                sessions[sessionId].selectedMedicine = selectedMedicine;
                sessions[sessionId].stage = 'confirmation';
                res.send(response);
            }
        }else if (stage === 'confirmation') {
            // Handle confirmation
            const userInput = parseInt(req.body.text);
        
            if (userInput === 1) {
                // User confirms the selection
                const selectedMedicine = sessions[sessionId].selectedMedicine;
                const response = `END Your medicine has been ordered with medicine details:\nName: ${selectedMedicine.name}\nPrice: ${selectedMedicine.price}\nLocation: ${selectedMedicine.location}\nExpiration Date: ${selectedMedicine.expiration_date}\nPhone Number: ${selectedMedicine.phone_number}`;
                delete sessions[sessionId]; // Clear session data
                res.send(response);
            } else if (userInput === 2) {
                // User cancels the selection
                delete sessions[sessionId]; // Clear session data
                res.send('END Transaction cancelled.');
            } else {
                // Invalid input
                res.send('CON Invalid selection. Please try again.\nDo you want to proceed with this medicine?\n1. Yes\n2. No');
            }
        }        
        else if (stage === 'subscription') {
            // Handle subscription
            const userInput = req.body.text;
            console.log(req.body.text)
            const user = userInput.split('*');
            const userInputLowerCase = user[user.length-1].toLowerCase();


            // Check if the session already has a selected medicine
            const selectedMedicine = sessions[sessionId].selectedMedicine;
        
            if (!selectedMedicine) {
                // If no medicine is selected yet, treat the user input as the medicine name;
        
                // Load medicine details from JSON file (assuming synchronous read for simplicity)
                const medicineData = require('./medicine.json');
                const medicine = medicineData.find(m => m.name.toLowerCase() === userInputLowerCase);
        
                const filteredMedicines = [];
            // console.log(userInputLowerCase)
        
            // Search for the medicine in the medicineData
                medicineData.forEach(medicine => {
                    if (medicine.name.toLowerCase().includes(userInputLowerCase)) {
                        // console.log(`${medicine.name}`);
                        filteredMedicines.push(medicine);
                    }
                });
            
                const totalMedicines = filteredMedicines.length;
            
                if (totalMedicines === 0) {
                    res.send('END Medicine not found. Please try again.');
                } else {
                    const displayedMedicines = filteredMedicines.slice(1, totalMedicines);
            
                    let response = 'CON Medicine Found:\n';
                    displayedMedicines.forEach((medicine, index) => {
                        response += `${index + 1}. ${medicine.name} ${medicine.price} ${medicine.location}\n`;
                    });
            
                    sessions[sessionId].filteredMedicines = filteredMedicines;
                    // sessions[sessionId].currentPage = currentPage;
                    sessions[sessionId].stage = 'frequency';
                    res.send(response);
                }            
            } 
        } else if(stage === 'frequency') {
            // If a medicine is already selected, treat the user input as the subscription frequency
            const userInput = req.body.text;
            const user = userInput.split('*');
            const frequency = user;
    
            // For demonstration purposes, let's just confirm the frequency and proceed
            const response = `CON Insert Frequency (days)`;
            sessions[sessionId].subscriptionFrequency = frequency;
            sessions[sessionId].stage = 'subscriptionConfirm';
            res.send(response);
        }else if (stage === 'subscriptionConfirm') {
            // Handle confirmation
            const userInput = parseInt(req.body.text);
            // console.log(userInput);
            const totalMedicines = sessions[sessionId].filteredMedicines.length;
            const currentPage = sessions[sessionId].currentPage || 1;
            const pageSize = 5;
        
            if (userInput >= 1 && userInput <= totalMedicines) {
                // User selected a medicine
                const selectedMedicineIndex = (currentPage - 1) * pageSize + userInput - 1;
                const selectedMedicine = sessions[sessionId].filteredMedicines[selectedMedicineIndex];
                const response = `CON Medicine Details:\nName: ${selectedMedicine.name}\nPrice: ${selectedMedicine.price}\nLocation: ${selectedMedicine.location}\nExpiration Date: ${selectedMedicine.expiration_date}\nPhone Number: ${selectedMedicine.phone_number}\n\nDo you want to proceed with this subscription?\n1. Yes\n2. No`;
                sessions[sessionId].selectedMedicine = selectedMedicine;
                sessions[sessionId].stage = 'subscriptionconfirmation';
                res.send(response);
            }
        }
        else if (stage === 'subscriptionconfirmation') {
            // Handle subscription confirmation
            // console.log(req.body.text)
            const userInput = req.body.text;
            const user = userInput.split('*');

            // console.log(userInput);
        
            if (parseInt(user[user.length-1]) === 1) {
                const medicine = sessions[sessionId].selectedMedicine;
                const response = `END Your Subscription Details:\nName: ${medicine.name}\nPrice: ${medicine.price}\nLocation: ${medicine.location}\nExpiration Date: ${medicine.expiration_date}\nPhone Number: ${medicine.phone_number}\nFrequency: ${parseInt(user[user.length-2])}`;
                delete sessions[sessionId]; // Clear session data
                res.send(response);
            } else if (parseInt(user[user.length-1]) === 2) {
                delete sessions[sessionId]; // Clear session data
                res.send('END Transaction cancelled.');
            } else {
                res.send('CON Invalid selection. Please try again.\nDo you want to proceed with this medicine?\n1. Yes\n2. No');
            }
        } 
        else if (stage === 'contactUs') {
            // Handle contact us option
            const userInput = stringify(req.body.text);
            if (userInput === '*') {
                // User wants to go back to the main menu
                delete sessions[sessionId];
                res.send('CON Which one of our services are you going to use?\n1. Search Medicine\n2. Subscription Medicines\n3. Contact Us');
            } else {
                // Invalid input, prompt user to go back or exit
                res.send('CON Invalid input. Press * to go back to the main menu');
            }
        }
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
