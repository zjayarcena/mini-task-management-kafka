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

# In-memory storage for tasks and users
tasks = []
users = [
    {"id": 1, "username": "user1"},
    {"id": 2, "username": "user2"},
    {"id": 3, "username": "user3"}
]

# Task Management Endpoints
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
        producer.send("task.deleted", {
            "id": task_id,
            "title": task_to_delete["title"],
            "deleted_at": datetime.now().isoformat()
        })
        
        return jsonify({
            "message": "Task deleted successfully",
            "task": task_to_delete
        }), 200
    
    return jsonify({"error": "Task not found"}), 404

# User Management Endpoints
@app.route("/users", methods=["GET"])
def get_users():
    return jsonify(users)

@app.route("/users", methods=["POST"])
def create_user():
    data = request.json
    username = data.get("username", "").strip()
    
    if not username:
        return jsonify({"error": "Username is required"}), 400
    
    # Check if user already exists
    if any(u["username"].lower() == username.lower() for u in users):
        return jsonify({"error": "User already exists"}), 400
    
    user = {
        "id": len(users) + 1,
        "username": username,
        "created_at": datetime.now().isoformat()
    }
    
    users.append(user)
    producer.send("user.created", user)
    
    return jsonify(user), 201

@app.route("/users/<int:user_id>", methods=["DELETE"])
def delete_user(user_id):
    global users
    
    # Find the user to delete
    user_to_delete = None
    for user in users:
        if user["id"] == user_id:
            user_to_delete = user
            break
    
    if user_to_delete:
        # Remove the user from the list
        users = [u for u in users if u["id"] != user_id]
        
        # Remove tasks assigned to this user or reassign them
        for task in tasks:
            if task["assigned_to"] == user_to_delete["username"]:
                task["assigned_to"] = ""  # Or could set to "Unassigned"
        
        # Send Kafka event
        producer.send("user.deleted", {
            "id": user_id,
            "username": user_to_delete["username"],
            "deleted_at": datetime.now().isoformat()
        })
        
        return jsonify({
            "message": "User deleted successfully",
            "user": user_to_delete
        }), 200
    
    return jsonify({"error": "User not found"}), 404

# User-specific tasks endpoint
@app.route("/users/<username>/tasks", methods=["GET"])
def get_user_tasks(username):
    user_tasks = [task for task in tasks if task["assigned_to"].lower() == username.lower()]
    return jsonify(user_tasks)

if __name__ == "__main__":
    app.run(debug=True)