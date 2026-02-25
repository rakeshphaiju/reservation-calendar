#!/bin/bash
set -e  # Exit on error
BASEDIR=$(dirname "$0")

##
# Example usage:
# ./build.sh --push
# ./build.sh --tag v1.0.0 --push
# ./build.sh --ci --push
##

# Load environment variables
if [ -f "$BASEDIR/docker-repos.env" ]; then
  source "$BASEDIR/docker-repos.env"
else
  echo "❌ Error: docker-repos.env file not found in $BASEDIR"
  exit 1
fi

# Default values
IMAGETAG="latest"
PUSH_IMAGE=false
SKIP_BUILD=false
CI=false

# Parse command-line arguments
while [[ "$#" -gt 0 ]]; do
  case $1 in
    -t|--tag) IMAGETAG="$2"; shift ;;
    -p|--push) PUSH_IMAGE=true ;;
    -s|--skip-build) SKIP_BUILD=true ;;
    --ci) CI=true ;;
    *) echo "❌ Unknown parameter: $1"; exit 1 ;;
  esac
  shift
done

# Validate Docker repository and tag
if [ -z "$DOCKER_REPO" ]; then
  echo "❌ Error: DOCKER_REPO is not set in docker-repos.env"
  exit 1
fi

DOCKER_REGISTRY=${DOCKER_REPO%/*}
DOCKER_REPO_NAME=${DOCKER_REPO##*/}

# CI incremental tag + SHA tag
if [ "$CI" == "true" ]; then
  BUILD_NUMBER=${GITHUB_RUN_NUMBER:-0}
  INCREMENTAL_TAG="build-${BUILD_NUMBER}"
fi

echo "🛠 Registry: $DOCKER_REGISTRY"
echo "🛠 Repo: $DOCKER_REPO_NAME"
echo "🛠 Tag: $IMAGETAG"
[ "$CI" == "true" ] && echo " CI Incremental Tag: $INCREMENTAL_TAG" 

# Build the image if not skipped
if [ "$SKIP_BUILD" != "true" ]; then
  echo "🔨 Building Docker image..."
  build_args="--build-arg VERSION=$IMAGETAG"
  docker build -t "${DOCKER_REPO_NAME}:$IMAGETAG" $build_args -f "$BASEDIR/Dockerfile" .
fi

# Tagging the image
echo " Tagging image..."
docker tag "${DOCKER_REPO_NAME}:${IMAGETAG}" "$DOCKER_REGISTRY/${DOCKER_REPO_NAME}:latest"
docker tag "${DOCKER_REPO_NAME}:${IMAGETAG}" "$DOCKER_REGISTRY/${DOCKER_REPO_NAME}:${IMAGETAG}"

if [ "$CI" == "true" ]; then
  docker tag "${DOCKER_REPO_NAME}:${IMAGETAG}" "$DOCKER_REGISTRY/${DOCKER_REPO_NAME}:${INCREMENTAL_TAG}"
fi

# Push the image if requested
if [ "$PUSH_IMAGE" == "true" ]; then
  if [ "$CI" != "true" ]; then
    echo "🔑 Logging in to registry: $DOCKER_REGISTRY"
    docker login "$DOCKER_REGISTRY"
  fi

  echo "Pushing: ${DOCKER_REPO_NAME}:${IMAGETAG}"
  docker push "$DOCKER_REGISTRY/${DOCKER_REPO_NAME}:${IMAGETAG}"
  docker push "$DOCKER_REGISTRY/${DOCKER_REPO_NAME}:latest"

  if [ "$CI" == "true" ]; then
    echo "Pushing incremental tag: $INCREMENTAL_TAG"
    docker push "$DOCKER_REGISTRY/${DOCKER_REPO_NAME}:${INCREMENTAL_TAG}"
  fi
else
  echo "❗ Image was not pushed. Use --push and optionally --tag <tag>."
fi
