import logging

# Configure the logging
logging.basicConfig(
    format="%(asctime)s.%(msecs)03d %(levelname)s - %(message)s",
    datefmt="%d-%m-%yT%H:%M:%S",
)

# Gets or creates a logger
logger = logging.getLogger(__name__)

# set log level
logger.setLevel(logging.INFO)
