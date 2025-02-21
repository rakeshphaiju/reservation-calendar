# ---- Frontend Stage ----
FROM node:20 AS frontend-build
WORKDIR /app/frontend

# Copy package files and install dependencies using Yarn
COPY frontend/package.json frontend/yarn.lock ./
RUN yarn install

# Build the React app
COPY frontend/ ./
RUN yarn build

# ---- Backend Stage ----
FROM python:3.9-slim as backend-build
# virtualenv
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

RUN apt-get update
RUN python3 --version
RUN python3 -m pip install --no-cache-dir --upgrade pip
RUN python3 -m pip install --no-cache-dir --upgrade poetry
RUN python3 -m pip --version
RUN poetry --version

COPY ./pyproject.toml ./poetry.lock ./
RUN poetry install --no-root -vvv --no-interaction --no-ansi


# Set the working directory in the container
WORKDIR /opt/app

# Copy the current directory contents into the container at /app
COPY ./src/ ./src

ENV PYTHONPATH=/opt/app

EXPOSE 8000

# CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]