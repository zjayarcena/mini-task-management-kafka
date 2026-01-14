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
        today = datetime.now().date()

        for task in tasks:
            if task["status"] != "DONE":
                due = datetime.strptime(task["due_date"], "%Y-%m-%d").date()
                if due < today:
                    producer.send("task.overdue", task)
    except:
        pass

    time.sleep(30)
