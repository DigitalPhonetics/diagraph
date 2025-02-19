FROM ubuntu:22.04
ENV DEBIAN_FRONTEND=noninteractive

RUN apt update && apt install -y nodejs npm

ADD ./adviser/dialog_designer_ui/package.json /dialog_designer_ui/package.json

# Install NPM dependencies
ADD ./adviser/dialog_designer_ui/postinstall.mjs /dialog_designer_ui/postinstall.mjs
WORKDIR /dialog_designer_ui
RUN npm install

# Dependencies for tinymce
RUN npm run tinymce-postinstall
