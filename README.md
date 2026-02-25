# Reservation System

Reservation Calender Application based on Reactjs, Python (FastAPI) and PostgreSQL database


# Backend development

## Installing backend dependencies

Install Python packages

```shell
$ pip install virtualenv
$ python -m virtualenv .venv
$ source .venv/bin/activate
$ pip install poetry==1.3.1
$ poetry install
```

# Frontend development

## Installing frontend dependencies

```shell
$ npm install -g yarn
$ cd frontend
$ yarn install
```

## Running frontend in standalone/development mode

```shell
$ cd frontend
$ yarn dev
```

# Deployment to Minikube Using Terraform

## 1. Prerequisites

Install the following tools:

- Minikube (v1.30+)
- kubectl
- Terraform (v1.5+)
- Helm (v3+)
- Docker (optional, for local image builds)

Verify installation:

```bash
minikube version
kubectl version --client
terraform version
helm version
```

## 2. Start minikube

```bash
minikube start --cpus=4 --memory=8192
minikube addons enable ingress
```

## 3. Deployment

```bash
cd k8s/
terraform init
terraform plan
terraform apply
```

## 4. Access the App

```bash
kubectl port-forward -n reservation-app svc/reservation-api 8080:80
```

Then open: http://localhost:8080