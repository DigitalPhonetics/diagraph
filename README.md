# diagraph
DIAGRAPH: An open-source graphic interface for dialog flow design

## Live Demo

http://193.196.53.250:8082

## User Guide

You can find information on how to use diagraph [here](https://github.com/DigitalPhonetics/diagraph/wiki).


## Installation

1. Install [Docker](https://www.docker.com) or a compatible alternative
2. Clone the repository
3. Open a terminal and navigate to the main folder (containing `docker-compose.yml`)
4. (RECOMMENDED) change the secret keys, usernames and passwords in the `config.env` file
5. Run `DOCKER_BUILDKIT=1 docker-compose up --build`
    5.1 For Mac M1 chip users: execute `export DOCKER_DEFAULT_PLATFORM=linux/amd64` in terminal before running step 5
6. Wait until the build has finished (this takes a while), and then wait until the running containers outputs several `trying to regiser component [...]` messages (this may take a few additional seconds/minutes after the build). NOTE: Depending on your machine / virtual machine limits, the chat responses might take a second to a few to appear. 
7. Open your browser and navigate to `localhost:8000`. There, you can create a new user and then use the system as descibed [here](https://github.com/DigitalPhonetics/diagraph/wiki).
