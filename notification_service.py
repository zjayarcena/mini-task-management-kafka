from kafka import KafkaConsumer
import json

consumer = KafkaConsumer(
    "task.created",
    "task.updated",
    "task.completed",
    "task.overdue",
    bootstrap_servers="localhost:9092",
    value_deserializer=lambda v: json.loads(v.decode("utf-8"))
)

for msg in consumer:
    task = msg.value

    if msg.topic == "task.created":
        print("🆕 New:", task["title"])
    elif msg.topic == "task.updated":
        print("🔄 Updated:", task["title"], task["status"])
    elif msg.topic == "task.completed":
        print("✅ Completed:", task["title"])
    elif msg.topic == "task.overdue":
        print("⚠️ Overdue:", task["title"], "→", task["assigned_to"])
