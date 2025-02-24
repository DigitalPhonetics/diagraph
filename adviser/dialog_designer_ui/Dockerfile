FROM node:23 AS deps
ENV NODE_OPTIONS=--openssl-legacy-provider

WORKDIR /code

COPY ./adviser/dialog_designer_ui/package.json /code/package.json
COPY ./adviser/dialog_designer_ui/postinstall.mjs /code/postinstall.mjs
COPY ./adviser/dialog_designer_ui/tsconfig.json /code/tsconfig.json
# COPY ./adviser/dialog_designer_ui/config-overrides.js /code/config-overrides.js

RUN npm install
RUN npm install react-app-rewired
RUN npm run tinymce-postinstall


FROM deps
ENV NODE_OPTIONS=--openssl-legacy-provider
WORKDIR /code
COPY ./adviser/dialog_designer_ui /code
COPY --from=deps /code .

