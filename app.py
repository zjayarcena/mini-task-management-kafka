from flask import Flask, request, jsonify
from flask_cors import CORS
from kafka import KafkaProducer
import json
from datetime import datetime

app = Flask(__name__)
CORS(app)

producer = KafkaProducer(
    bootstrap_servers="localhost:9092",
    value_serializer=lambda v: json.dumps(v).encode("utf-8")
)

tasks = []

@app.route("/tasks", methods=["GET"])
def get_tasks():
    return jsonify(tasks)

@app.route("/tasks", methods=["POST"])
def create_task():
    data = request.json

    task = {
        "id": len(tasks) + 1,
        "title": data["title"],
        "assigned_to": data.get("assigned_to", ""),
        "status": "TODO",
        "due_date": data["due_date"],
        "overdue": False,
        "created_at": datetime.now().isoformat()
    }

    tasks.append(task)
    producer.send("task.created", task)

    return jsonify(task)

@app.route("/tasks/<int:task_id>", methods=["PUT"])
def update_task(task_id):
    status = request.json["status"]

    for task in tasks:
        if task["id"] == task_id:
            task["status"] = status
            producer.send("task.updated", task)

            if status == "DONE":
                task["overdue"] = False
                producer.send("task.completed", task)

            return jsonify(task)

    return jsonify({"error": "Not found"}), 404

@app.route("/tasks/<int:task_id>", methods=["DELETE"])
def delete_task(task_id):
    global tasks
    
    # Find the task to delete
    task_to_delete = None
    for task in tasks:
        if task["id"] == task_id:
            task_to_delete = task
            break
    
    if task_to_delete: 
        # Remove the task from the list
        tasks = [task for task in tasks if task["id"] != task_id]
        
        # Send Kafka event
        producer.send("task. deleted", {
            "id":  task_id,
            "title": task_to_delete["title"],
            "deleted_at": datetime.now().isoformat()
        })
        
        return jsonify({
            "message": "Task deleted successfully",
            "task":  task_to_delete
        }), 200
    
    return jsonify({"error":  "Task not found"}), 404

if __name__ == "__main__":
    app.run(debug=True)
