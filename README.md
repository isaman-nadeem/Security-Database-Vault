This repository contains a Flask-based web application designed to act as an encrypted vault for storing users and their respective records. 
The application utilizes a local SQLite database and symmetric encryption to ensure data privacy.

To interact with the API endpoints or access the vault data, you must authenticate using the master key.  

Master Password: You can access the vault and unlock the session by sending the password 1234 in the JSON payload to the login endpoint.

Encryption Key: The password 1234 is also used to derive the Fernet cipher key. This cipher automatically encrypts and decrypts all record titles and record data within the database.

Core Features : 
SQLite Database: Automatically initializes a vault.db database containing users and records tables.  
Data Encryption: Employs the cryptography.fernet module to securely encrypt sensitive record information before insertion into the database.  
Session Management: Uses Flask sessions, secured by a randomly generated 24-byte secret key, to maintain the unlocked state.  
Relational Integrity: Deleting a user automatically cascades the deletion to remove all associated records from the database. 

Setup and Execution ::: 
Ensure you have Flask and cryptography installed in your Python environment.  
Run the Python script to start the server.  
The application will initialize the database and start in debug mode on port 5000.  
The web interface can be accessed at the root route (/).
