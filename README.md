> An interactive web app to visualize qubit state evolution through quantum gates, built with React + TypeScript and deployed via a full CI/CD pipeline on AWS.

---

## 🔭 What is this?

**QuantumSim** is a quantum computing education tool that lets you:
- Apply quantum gates (Pauli-X, Hadamard, Pauli-Z) to a qubit
- Visualize state evolution on a **Bloch sphere**, **wave function**, and **probability plane**
- Switch between **Learning mode** and **Explore mode**
- Chat with a **Gemini-powered AI assistant** for real-time explanations

This project was built as part of a **Cloud DevOps** course and demonstrates a production-grade deployment pipeline — from containerization to infrastructure-as-code.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| AI Integration | Google Gemini API (`@google/genai`) |
| Math Engine | math.js (complex number / matrix ops) |
| Animations | Motion (Framer Motion) |
| Containerization | Docker (nginx:alpine) |
| CI/CD | Jenkins (5-stage pipeline) |
| Security Scanning | Trivy |
| Infrastructure | Terraform (AWS EC2, ECR, ECS) |
| Configuration Mgmt | Ansible |

---

## 🚀 CI/CD Pipeline

The Jenkins pipeline automates the full deployment lifecycle:

```
Clone → Install & Build → Docker Build → Security Scan (Trivy) → Deploy
```

```groovy
// Jenkinsfile summary
stage('Docker Build')    → builds quantum-sim:latest
stage('Security Scan')   → trivy image quantum-sim:latest
stage('Deploy')          → docker run -d -p 80:80 quantum-sim:latest
```

---

## ☁️ Infrastructure (Terraform)

Provisioned on **AWS (us-east-1)**:
- `aws_instance` — EC2 t2.micro Jenkins server
- `aws_ecr_repository` — Container registry (`quantum-sim`)
- `aws_ecs_cluster` — ECS cluster (`quantum-cluster`)

---

## ⚙️ Ansible Configuration

Automated server setup via `playbook.yml`:
- Installs **Java 11**, **Jenkins**, **Docker**, **Node.js**
- Starts and enables Jenkins + Docker services

---

## 🐳 Docker

```dockerfile
FROM nginx:alpine
COPY dist/ /usr/share/nginx/html
EXPOSE 80
```

Serves the pre-built Vite output via nginx.

---

## 🖥️ Run Locally

**Prerequisites:** Node.js

```bash
git clone https://github.com/Zahraaabidha/cloud_devops.git
cd cloud_devops
npm install
```

Add your Gemini API key to `.env.local`:
```env
GEMINI_API_KEY=your_key_here
```

```bash
npm run dev       # starts at http://localhost:3000
npm run build     # production build → /dist
```

---

## 📁 Project Structure

```
cloud_devops/
├── src/
│   ├── App.tsx              # Main simulator + pages
│   └── components/
│       └── LoadingScreen.tsx
├── public/                  # Static assets
├── Dockerfile               # nginx container
├── Jenkinsfile              # 5-stage CI/CD pipeline
├── ansible/
│   └── playbook.yml         # Server provisioning
├── terraform/
│   └── main.tf              # AWS infra (EC2, ECR, ECS)
└── dist/                    # Pre-built frontend output
```

---

## 🔐 Security

- **Trivy** vulnerability scanning runs on every Docker image build as part of the Jenkins pipeline
- API keys managed via `.env` — never committed (see `.gitignore`)

---

## 📌 Key Concepts Demonstrated

- Containerized deployment with Docker + nginx
- Jenkins declarative pipeline (Clone → Build → Scan → Deploy)
- Infrastructure as Code with Terraform on AWS
- Automated server configuration with Ansible
- DevSecOps: Trivy image scanning integrated into CI/CD

---

*Built by [Aabidha](https://github.com/Zahraaabidha) · Cloud DevOps Project · SRM Institute of Science and Technology*
