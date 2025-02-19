FROM ubuntu:jammy as base

##
## Install dependencies
##
RUN apt update && apt install -y nodejs npm

# install dependencies for dialog designer ui
WORKDIR /dialog_designer_ui
ADD ./adviser/dialog_designer_ui/package.json /dialog_designer_ui/package.json
RUN npm install
