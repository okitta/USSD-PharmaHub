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
        // New session, prompt language choice
        sessions[sessionId] = { stage: 'choose language' };
        res.send('CON እባኮነ ቋንቋ ይምረጡ:\n1. አማርኛ\n2. English');
    }else {
        // Existing session
        const stage = sessions[sessionId].stage;
        // Handle language selection
        const userInput = req.body.text;
        if(stage === 'choose language'){
            if(userInput){
                switch (userInput) {
                    case '1':
                        // Set session language to Amharic
                        // console.log(userInput)
                        sessions[sessionId].language = 'Amharic';
                        // Proceed to main menu
                        sessions[sessionId].stage = 'amharic';
                        res.send('CON እንኳን ወደ አገልግሎት መስመራችን በደህና መጡ። እባኮነ አንዱን ይጫኑ።\n1. መድሃኒት ፍለጋ፣\n2. የተደጋጋሚ አገልግሎት \n3. ስለኛ መረጃ');
                        break;
                    case '2':
                        // Set session language to English
                        sessions[sessionId].language = 'English';
                        // Proceed to main menu
                        sessions[sessionId].stage = 'menu';
                        res.send('CON Welcome to our services. Please select an option:\n1. Search Medicine\n2. Subscription Medicines\n3. Contact Us');
                        break;
                    default:
                        
                        // Invalid selection, prompt again
                        res.send('CON Invalid selection. Please choose a language:\n1. Amharic\n2. English');
                        break;
                }
            }
        }
            // Existing session
            // const stage = sessions[sessionId].stage;
            // console.log('check')
            else if (stage === 'menu') {
                // Handle menu selection
                const userInput = req.body.text;
                if(userInput){
                    switch (userInput[userInput.length-1]) {
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
                            res.send('END Contact Information:\nEmail: pharmahub@gmail.com\nPhone Number: +251936731722\nCall Center Number: 9944\n');
                            break;
                        default:
                            res.send('CON Invalid selection. Please try again.\nWhich one of our services are you going to use?\n1. Search Medicine\n2. Subscription Medicines\n3. Contact Us');
                    }
                }
            }else if (stage === 'search') {
                // Handle medicine search
                const userInput = req.body.text;
                if(userInput){
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
                            response += `${index + 1}. ${medicine.name[0]} ${medicine.price} ${medicine.location}\n`;
                        });
                
                        sessions[sessionId].filteredMedicines = filteredMedicines;
                        // sessions[sessionId].currentPage = currentPage;
                        sessions[sessionId].stage = 'confirm';
                        res.send(response);
                    }
                }
            }else if (stage === 'confirm') {
                // Handle confirmation
                const userInput = parseInt(req.body.text);
                if(userInput){
                    const totalMedicines = sessions[sessionId].filteredMedicines.length;
                    const currentPage = sessions[sessionId].currentPage || 1;
                    const pageSize = 5;
                
                    if (userInput >= 1 && userInput <= totalMedicines) {
                        // User selected a medicine
                        const selectedMedicineIndex = (currentPage - 1) * pageSize + userInput - 1;
                        const selectedMedicine = sessions[sessionId].filteredMedicines[selectedMedicineIndex];
                        const response = `CON Medicine Details:\nName: ${selectedMedicine.name[0]}\nPrice: ${selectedMedicine.price}\nLocation: ${selectedMedicine.location}\nExpiration Date: ${selectedMedicine.expiration_date}\nPhone Number: ${selectedMedicine.phone_number}\n\nDo you want to proceed with this medicine?\n1. Yes\n2. No`;
                        sessions[sessionId].selectedMedicine = selectedMedicine;
                        sessions[sessionId].stage = 'confirmation';
                        res.send(response);
                    } 
                }
            }else if (stage === 'confirmation') {
                const userInput = req.body.text;
                if(userInput){
                    const user = userInput.split('*');
                    if (parseInt(user[user.length-1]) === 1) {
                        // User confirms the selection
                        const selectedMedicine = sessions[sessionId].selectedMedicine;
                        const response = `END Transaction Completed.`;
                        delete sessions[sessionId]; // Clear session data
                        res.send(response);
                    } else if (parseInt(user[user.length-1]) === 2) {
                        // User cancels the selection
                        delete sessions[sessionId]; // Clear session data
                        res.send('END Transaction Cancelled.');
                    } else {
                        // Invalid input
                        res.send('CON Invalid selection. Please try again.\nDo you want to proceed with this medicine?\n1. Yes\n2. No');
                    }
                }
            
            }        
            else if (stage === 'subscription') {
                // Handle subscription
                const userInput = req.body.text;
                // console.log(req.body.text)
                if(userInput){
                    
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
                                response += `${index + 1}. ${medicine.name[0]} ${medicine.price} ${medicine.location}\n`;
                            });
                    
                            sessions[sessionId].filteredMedicines = filteredMedicines;
                            // sessions[sessionId].currentPage = currentPage;
                            sessions[sessionId].stage = 'frequency';
                            res.send(response);
                        }            
                    } 
                }
            } else if(stage === 'frequency') {
                // If a medicine is already selected, treat the user input as the subscription frequency
                const userInput = req.body.text;
                if(userInput){
                    const user = userInput.split('*');
                    const frequency = user;
            
                    // For demonstration purposes, let's just confirm the frequency and proceed
                    const response = `CON Insert Frequency (days)`;
                    sessions[sessionId].subscriptionFrequency = frequency;
                    sessions[sessionId].stage = 'subscriptionConfirm';
                    res.send(response);
                }
            }else if (stage === 'subscriptionConfirm') {
                // Handle confirmation
                const userInput = parseInt(req.body.text);
                // console.log(userInput);
                if(userInput){
                    const totalMedicines = sessions[sessionId].filteredMedicines.length;
                    const currentPage = sessions[sessionId].currentPage || 1;
                    const pageSize = 5;
                
                    if (userInput >= 1 && userInput <= totalMedicines) {
                        // User selected a medicine
                        const selectedMedicineIndex = (currentPage - 1) * pageSize + userInput - 1;
                        const selectedMedicine = sessions[sessionId].filteredMedicines[selectedMedicineIndex];
                        const response = `CON Medicine Details:\nName: ${selectedMedicine.name[0]}\nPrice: ${selectedMedicine.price}\nLocation: ${selectedMedicine.location}\nExpiration Date: ${selectedMedicine.expiration_date}\nPhone Number: ${selectedMedicine.phone_number}\n\nDo you want to proceed with this subscription?\n1. Yes\n2. No`;
                        sessions[sessionId].selectedMedicine = selectedMedicine;
                        sessions[sessionId].stage = 'subscriptionconfirmation';
                        res.send(response);
                    }
                }
            }
            else if (stage === 'subscriptionconfirmation') {
                // Handle subscription confirmation
                // console.log(req.body.text)
                const userInput = req.body.text;
                if(userInput){

                    const user = userInput.split('*');
        
                    // console.log(userInput);
                
                    if (parseInt(user[user.length-1]) === 1) {
                        const medicine = sessions[sessionId].selectedMedicine;
                        const response = `END Transaction Completed.`;
                        delete sessions[sessionId]; // Clear session data
                        res.send(response);
                    } else if (parseInt(user[user.length-1]) === 2) {
                        delete sessions[sessionId]; // Clear session data
                        res.send('END Transaction cancelled.');
                    } else {
                        res.send('CON Invalid selection. Please try again.\nDo you want to proceed with this medicine?\n1. Yes\n2. No');
                    }
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
                    res.send('CON Invalid input.');
                }
            }

            // From Here Amharci Version
            /** 
             * 
             * 
             * 
             * 
             * 
             * 
             * 
             * 
            */


            else if (stage === 'amharic') {
                // Handle menu selection
                const userInput = req.body.text;
                // console.log(userInput)
                if(userInput){
                    switch (userInput[userInput.length - 1]) {
                        case '1':
                            sessions[sessionId].stage = 'search_amh';
                            res.send('CON የሚፈልጉትን መድሃኒት ይፈልጉ:');
                            break;
                        case '2':
                            // Handle subscription medicines
                            sessions[sessionId].stage = 'subscription_amh';
                            res.send('CON በተደጋጋሚ የሚያስፈልጎትን መድሃኒት ይፈልጉ:');
                            break;
                        case '3':
                            // Handle contact us
                            sessions[sessionId].stage = 'contactUs_amh';
                            res.send('END ስለኛ መረጃ:\nኢሜይል: pharmahub@gmail.com\nስልክ ቁጥር: +251936731722\nየጥሪ ማዕከል: 9944\n');
                            break;
                        default:
                            res.send('CON የተሳሳተ ቁጥር አስገብተዋል. እባኮ ትክክለኛውን ቁጥር ያስገቡ .\n እንኳን ወደ አገልግሎት መስመራችን በደህና መጡ። እባኮነ አንዱን ይጫኑ።\n1. መድሃኒት ፍለጋ፣\n2. የተደጋጋሚ አገልግሎት \n3. ስለኛ መረጃ');
                    }
                }
            }else if (stage === 'search_amh') {
                // Handle medicine search
                const userInput = req.body.text;
                // console.log(req.body.text);

                if(userInput){
                    const user = userInput.split('*');
                    const userInputLowerCase = user[user.length-1].toLowerCase();
                    // const currentPage = sessions[sessionId].currentPage || 1;
                    // const pageSize = 5;
                
                    // Load medicine details from JSON file (assuming synchronous read for simplicity)
                    const medicineData = require('./medicine.json');
                    const filteredMedicines = [];
                    // console.log(userInputLowerCase)
                
                    // Search for the medicine in the medicineData
                    medicineData.forEach(medicine => {
                        // console.log(medicine.name);
                        if (medicine.name.toLowerCase().includes(userInputLowerCase)) {
                            filteredMedicines.push(medicine);
                        }
                    });
                
                    const totalMedicines = filteredMedicines.length;
                
                    if (totalMedicines === 0) {
                        res.send('END መድሃኒቱ አልተገኘም. እባኮን በድጋሚ ይሞክሩ.');
                    } else {
                        const displayedMedicines = filteredMedicines.slice(1, totalMedicines);
                
                        let response = 'CON መድሃኒቱ ተገኝቷል:\n';
                        displayedMedicines.forEach((medicine, index) => {
                            med_name = medicine.name.split(' ')
                            response += `${index + 1}. ${med_name[0]} ${medicine.price} ${medicine.location}\n`;
                        });
                
                        sessions[sessionId].filteredMedicines = filteredMedicines;
                        // sessions[sessionId].currentPage = currentPage;
                        sessions[sessionId].stage = 'confirm_amh';
                        res.send(response);
                    }
                }
            }else if (stage === 'confirm_amh') {
                // Handle confirmation
                const userInput = parseInt(req.body.text);
                // console.log(userInput)
                if(userInput){
                    const totalMedicines = sessions[sessionId].filteredMedicines.length;
                    const currentPage = sessions[sessionId].currentPage || 1;
                    const pageSize = 5;
                
                    if (userInput >= 1 && userInput <= totalMedicines) {
                        // User selected a medicine
                        const selectedMedicineIndex = (currentPage - 1) * pageSize + userInput - 1;
                        const selectedMedicine = sessions[sessionId].filteredMedicines[selectedMedicineIndex];
                        const response = `CON የትዛዙ ሙሉ መረጃ:\nመድሃኒት ስም: ${selectedMedicine.name[0]}\nዋጋ: ${selectedMedicine.price}\nቦታ: ${selectedMedicine.location}\nምርቱ ሚያበቃበት ቀን: ${selectedMedicine.expiration_date}\nስልክ ቁጥር: ${selectedMedicine.phone_number}\n\nይህንን መድሃኒት ማዘዝ ይፈልጋሉ?\n1. አዎ\n2. አልፈልግም`;
                        sessions[sessionId].selectedMedicine = selectedMedicine;
                        sessions[sessionId].stage = 'confirmation_amh';
                        res.send(response);
                    }
                }
            }else if (stage === 'confirmation_amh') {
                // Handle confirmation
                
                const userInput = req.body.text;
                if(userInput){
                    const user = userInput.split('*');
                    const userInputNumber = parseInt(user[user.length-1]);
                    if (userInputNumber === 1) {
                        // User confirms the selection
                        const selectedMedicine = sessions[sessionId].selectedMedicine;
                        const response = `END ትዛዙ በተሳካ መልኩ ተጠናቋል`;
                        delete sessions[sessionId]; // Clear session data
                        res.send(response);
                    } else if (userInputNumber === 2) {
                        // User cancels the selection
                        delete sessions[sessionId]; // Clear session data
                        res.send('END ትዕዛዙ ተቋርጧል።');
                    } else {
                        // Invalid input
                        res.send('CON የተሳሳተ ቁጥር አስገብተዋል. እባኮ ትክክለኛውን ቁጥር ያስገቡ።\nይህንን መድሃኒት ማዘዝ ይፈልጋሉ?\n1. አዎ\n2. አልፈልግም');
                    }
                }
            
            }        
            else if (stage === 'subscription_amh') {

                const userInput = req.body.text;
                // console.log(req.body.text)
                if(userInput){

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
                            res.send('END አገልግሎቱ አልተገኘም. እባኮን በድጋሚ ይሞክሩ.');
                        } else {
                            const displayedMedicines = filteredMedicines.slice(1, totalMedicines);
                    
                            let response = 'CON አገልግሎቱ ተገኝቷል:\n';
                            displayedMedicines.forEach((medicine, index) => {
                                med_name = medicine.name.split(' ')
                                response += `${index + 1}. ${med_name[0]} ${medicine.price} ${medicine.location}\n`;
                            });
                    
                            sessions[sessionId].filteredMedicines = filteredMedicines;
                            // sessions[sessionId].currentPage = currentPage;
                            sessions[sessionId].stage = 'frequency_amh';
                            res.send(response);
                        }            
                    } 
                }
            } else if(stage === 'frequency_amh') {
                // If a medicine is already selected, treat the user input as the subscription frequency
                const userInput = req.body.text;
                if(userInput){
                    const user = userInput.split('*');
                    const frequency = user;
            
                    // For demonstration purposes, let's just confirm the frequency and proceed
                    const response = `CON ድግግሞሽ አስገባ (በቀናት)`;
                    sessions[sessionId].subscriptionFrequency = frequency;
                    sessions[sessionId].stage = 'subscriptionConfirm_amh';
                    res.send(response);
                }
            }else if (stage === 'subscriptionConfirm_amh') {
                // Handle confirmation
                const userInput = parseInt(req.body.text);
                if(userInput){
                    const totalMedicines = sessions[sessionId].filteredMedicines.length;
                    const currentPage = sessions[sessionId].currentPage || 1;
                    const pageSize = 5;
                
                    if (userInput >= 1 && userInput <= totalMedicines) {
                        // User selected a medicine
                        const selectedMedicineIndex = (currentPage - 1) * pageSize + userInput - 1;
                        const selectedMedicine = sessions[sessionId].filteredMedicines[selectedMedicineIndex];
                        const response = `CON የትዛዙ ሙሉ መረጃ:\nመድሃኒት ስም: ${selectedMedicine.name[0]}\nዋጋ: ${selectedMedicine.price}\nቦታ: ${selectedMedicine.location}\nምርቱ ሚያበቃበት ቀን: ${selectedMedicine.expiration_date}\nስልክ ቁጥር: ${selectedMedicine.phone_number}\n\nይህንን መድሃኒት ማዘዝ ይፈልጋሉ?\n1. አዎ\n2. አልፈልግም`;
                        sessions[sessionId].selectedMedicine = selectedMedicine;
                        sessions[sessionId].stage = 'subscriptionconfirmation_amh';
                        res.send(response);
                    }
                }
                // console.log(userInput);
            }
            else if (stage === 'subscriptionconfirmation_amh') {
                // Handle subscription confirmation
                // console.log(req.body.text)
                const userInput = req.body.text;
                if(userInput){
                    const user = userInput.split('*');
        
                    // console.log(userInput);
                
                    if (parseInt(user[user.length-1]) === 1) {
                        const medicine = sessions[sessionId].selectedMedicine;
                        const response = `END ትዛዙ በተሳካ መልኩ ተጠናቋል በዚህ ድግግሞሽ ይደርሶታል: ${parseInt(user[user.length-2])} ቀናት`;
                        delete sessions[sessionId]; // Clear session data
                        res.send(response);
                    } else if (parseInt(user[user.length-1]) === 2) {
                        delete sessions[sessionId]; // Clear session data
                        res.send('END ትዕዛዙ ተቋርጧል።');
                    } else {
                        res.send('CON የተሳሳተ ቁጥር አስገብተዋል. እባኮ ትክክለኛውን ቁጥር ያስገቡ።\nይህንን አገልግሎት ማዘዝ ይፈልጋሉ?\n1. አዎ\n2. አልፈልግም');
                    }
                }
            } 
            else if (stage === 'contactUs_amh') {
                // Handle contact us option
                const userInput = stringify(req.body.text);
                if(userInput){
                    if (userInput === '*') {
                        // User wants to go back to the main menu
                        delete sessions[sessionId];
                        res.send('CON እባኮ ትክክለኛውን ቁጥር ያስገቡ .\n እንኳን ወደ አገልግሎት መስመራችን በደህና መጡ። እባኮነ አንዱን ይጫኑ።\n1. መድሃኒት ፍለጋ፣\n2. የተደጋጋሚ አገልግሎት \n3. ስለኛ መረጃ');
                    } else {
                        // Invalid input, prompt user to go back or exit
                        res.send('CON የተሳሳተ ቁጥር አስገብተዋል።');
                    }
                }
            }

        }
    }
);

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
