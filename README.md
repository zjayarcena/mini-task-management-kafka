# mini-task-management-kafka

# Step 1 - Terminal 1
bin\windows\zookeeper-server-start.bat config\zookeeper.properties

# Step 2 - Terminal 2
bin\windows\kafka-server-start.bat config\server.properties

# Step 3 - Terminal 3
bin\windows\kafka-topics.bat --create --topic task.created --bootstrap-server localhost:9092
bin\windows\kafka-topics.bat --create --topic task.updated --bootstrap-server localhost:9092
bin\windows\kafka-topics.bat --create --topic task.completed --bootstrap-server localhost:9092
bin\windows\kafka-topics.bat --create --topic task.overdue --bootstrap-server localhost:9092

# Step 4 (optional) - Terminal 3 (Run after)
bin\windows\kafka-topics.bat --list --bootstrap-server localhost:9092

# to install the requirements
pip install -r requirements.txt

# run the python files
python app.py
python notification_service.py
python overdue_checker.py