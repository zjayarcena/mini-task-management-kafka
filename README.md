# mini-task-management-kafka

bin\windows\zookeeper-server-start.bat config\zookeeper.properties

bin\windows\kafka-server-start.bat config\server.properties

bin\windows\kafka-topics.bat --create --topic task.created --bootstrap-server localhost:9092
bin\windows\kafka-topics.bat --create --topic task.updated --bootstrap-server localhost:9092
bin\windows\kafka-topics.bat --create --topic task.completed --bootstrap-server localhost:9092
bin\windows\kafka-topics.bat --create --topic task.overdue --bootstrap-server localhost:9092

bin\windows\kafka-topics.bat --list --bootstrap-server localhost:9092

# to install the requirements
pip install -r requirements.txt

# run the python files
python app.py
python notification_service.py
python overdue_checker.py