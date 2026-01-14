import time
import requests
from datetime import datetime
from kafka import KafkaProducer
import json

producer = KafkaProducer(
    bootstrap_servers="localhost:9092",
    value_serializer=lambda v: json.dumps(v).encode("utf-8")
)

while True:
    try:
        tasks = requests.get("http://127.0.0.1:5000/tasks").json()
        now = datetime.now()

        for task in tasks:
            if task["status"] != "DONE":
                due = datetime.fromisoformat(task["due_date"])
                if due < now and not task["overdue"]:
                    task["overdue"] = True
                    producer.send("task.overdue", task)

    except:
        pass

    time.sleep(30)
