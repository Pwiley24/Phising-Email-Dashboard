# Email Queue Proof of Concept
 
## Artifacts
 
- **Kibana instance running on Docker**
  - Purpose: Simulate the ORTSOC Kibana instance
- **SMTP server running on a Linux Virtual Machine**
  - Purpose: Simulate an email sensor collecting data from clients
- **`mock_rt.py`**
  - Purpose: Fake mock RTIR website for proof-of-concept
- **`rt_sync.py`**
  - Purpose: Syncing script to create tickets for each email logged in Kibana and update their status in the Kibana queue
- **`send_test.py`**
  - Purpose: Simulate emails being sent to the SMTP server
- **`smtp_to_es.py`**
  - Purpose: Send simulated emails to the Kibana instance running on Docker
## Proof of Concept
 
### 1. Start Elastic on your local device
 
Start the Docker container and open Kibana in a browser.
 
```powershell
docker start elk
```
 
- Kibana: <http://localhost:5601>
- Elasticsearch API: <http://localhost:9200>
Allow 2 to 3 minutes for both to finish starting.
 
### 2. Start the mock RTIR website
 
On the same local device:
 
```powershell
python mock_rt.py
```
 
The mock RTIR website is then available at <http://localhost:8080>.
 
### 3. Start the SMTP server on the Virtual Machine
 
The VM connects to the Elasticsearch instance on your local device.
 
1. Navigate to the folder with the appropriate scripts:
```bash
cd ~/smtp-poc
```
 
2. Run the script, setting `ES_URL` to your local device's IP address (replace `<PC_IP>`):
```bash
ES_URL=http://<PC_IP>:9200 python3 smtp_to_es.py
```
 
   The script should print that it is listening on port 2525.
 
### 4. Start the Kibana/RTIR sync script
 
On the local device hosting Kibana, in PowerShell:
 
```powershell
$env:RT_URL = "http://localhost:8080"
$env:RT_TOKEN = "mock-token"
python rt_sync.py
```
 
Start this **before** sending emails. The script only creates tickets for emails received in the last 10 minutes.
 
### 5. Send test emails from the Virtual Machine
 
In a second terminal on the VM:
 
```bash
cd ~/smtp-poc
python3 send_test.py
```
 
### 6. View the results
 
1. **Kibana:** Navigate to the Kibana dashboard page and select the phishing dashboard to view the new emails. Filter using the KQL search bar at the top.
2. **Mock RTIR:** To view and edit the alert email, navigate to <http://localhost:8080> and select any of the options:
   - **take**: assigns the ticket (sets the owner and marks it open)
   - **resolve**: closes the ticket as resolved
   - **reject**: closes the ticket as rejected
3. **Back in Kibana:** Return to the dashboard to see the synced changes to the email, such as the assignee, or its removal from the queue once resolved or rejected. Changes appear within about a minute, after the next sync.
 
