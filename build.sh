#!/bin/bash
set -e  # Exit on error
BASEDIR=$(dirname "$0")

##
# Example usage:
# ./build.sh --push          # Uses version from .env and pushes to DEV registry
# ./build.sh --push --prod   # Uses version from .env and pushes to PROD registry
# ./build.sh --tag <tag> --push # Uses a specific tag and pushes
##

# Load environment variables
source $BASEDIR/docker-repos.env

# Default values
IMAGETAG="latest"
DOCKER_REGISTRY=${DOCKER_REPO%/*}
DOCKER_REPO_NAME=${DOCKER_REPO##*/}

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

# Display registry and repo details
echo "🛠 Registry: $DOCKER_REGISTRY"
echo "🛠 Repo: $DOCKER_REPO_NAME"
echo "🛠 Tag: $IMAGETAG"

WINPTY=""
if [[ "$(uname)" == *"MINGW"* ]]; then
  WINPTY="winpty"
fi

# Build the image if not skipped
if [ "$SKIP_BUILD" != "true" ]; then
  echo "🔨 Building Docker image..."
  build_args="--build-arg VERSION=$IMAGETAG"
  docker build -t ${DOCKER_REPO_NAME}:$IMAGETAG $build_args -f $BASEDIR/Dockerfile .
fi

# Tagging the image
echo "🏷 Tagging image..."
docker tag ${DOCKER_REPO_NAME}:${IMAGETAG} $DOCKER_REGISTRY/${DOCKER_REPO_NAME}:latest
docker tag ${DOCKER_REPO_NAME}:${IMAGETAG} $DOCKER_REGISTRY/${DOCKER_REPO_NAME}:${IMAGETAG}

# Push the image if requested
if [ "$PUSH_IMAGE" == "true" ] && [ "$IMAGETAG" != "latest" ]; then
  if [ "$CI" != "true" ]; then
    echo "🔑 Logging in to registry: $DOCKER_REGISTRY"
    $WINPTY docker login $DOCKER_REGISTRY
  fi

  echo "🚀 Pushing image: $DOCKER_REPO_NAME:${IMAGETAG} to $DOCKER_REGISTRY"
  docker push $DOCKER_REGISTRY/${DOCKER_REPO_NAME}:${IMAGETAG}
  docker push $DOCKER_REGISTRY/${DOCKER_REPO_NAME}:latest
else
  echo "❗ Image was not pushed. Use --push and --tag <tag> to push to the registry."
fi
