# ---- Frontend Stage ----
FROM node:20 AS frontend-build
WORKDIR /app/frontend

COPY frontend/package.json frontend/yarn.lock ./
RUN yarn install --frozen-lockfile

COPY frontend/ ./
RUN yarn run build

# ---- Backend Stage ----
FROM python:3.11-slim AS backend-build

ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

RUN apt-get update && \
    python3 --version && \
    python3 -m pip install --no-cache-dir --upgrade pip poetry && \
    python3 -m pip --version && \
    poetry --version


WORKDIR /opt/app
COPY ./pyproject.toml ./poetry.lock ./
RUN poetry install --no-root --no-interaction --no-ansi

# ---- Fullstack Image ----
FROM python:3.11-slim AS fullstack-image
ARG VERSION=local-dev

COPY --from=backend-build /opt/venv /opt/venv
COPY --from=frontend-build /app/frontend/dist /opt/app/frontend/dist

ENV PATH="/opt/venv/bin:$PATH" PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 VERSION=${VERSION}
RUN echo $VERSION

WORKDIR /opt/app
COPY ./src/ ./src

ENV PYTHONPATH=/opt/app

EXPOSE 8000  

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
