FROM ubuntu:jammy as base


##
## Install NPM dependencies
##
FROM base as install_npm_dependencies
RUN apt update && apt install -y nodejs npm


# install dependencies for dialog designer ui
RUN mkdir -p /tmp/dialog_designer_ui
ADD ./adviser/apps/diagraph/dialog_designer_ui/package.json /tmp/dialog_designer_ui/package.json
RUN cd /tmp/dialog_designer_ui && npm install
RUN mkdir -p /apps/dialog_designer_ui_dependencies 
RUN cp -a /tmp/dialog_designer_ui/node_modules /apps/dialog_designer_ui_dependencies/


#
# build NPM apps
#
FROM install_npm_dependencies as build_apps

# build dialog designer ui
COPY ./adviser/apps/diagraph/dialog_designer_ui /apps/dialog_designer_ui_code/
RUN cp -a /apps/dialog_designer_ui_dependencies/node_modules /apps/dialog_designer_ui_code/
RUN cd /apps/dialog_designer_ui_code && npm run build 
RUN mkdir -p /django_static/dialog_designer_ui && cp -a /apps/dialog_designer_ui_code/build /django_static/dialog_designer_ui


#
# setup django
#
FROM build_apps as django_deps
RUN apt update && DEBIAN_FRONTEND=noninteractive  apt install -y build-essential python3 python3-pip libpq-dev postgresql postgresql-contrib 
ENV PYTHONUNBUFFERED=1
ADD ./adviser/requirements_server.txt /django_code/adviser/requirements_server.txt
RUN pip3 install -U -r /django_code/adviser/requirements_server.txt

# add dialog designer app to static files
FROM django_deps
ADD ./adviser /django_code/adviser
RUN mkdir -p /django_static/dialog_designer_ui
COPY --from=build_apps /django_static/dialog_designer_ui/ /django_static/dialog_designer_ui/
RUN mkdir -p /django_static/templates/dialog_designer_ui
COPY --from=build_apps /django_static/dialog_designer_ui/build/index.html /django_static/templates/dialog_designer_ui/index.html
RUN cp /django_code/adviser/resolveDjangoUrls.py /django_static/templates/dialog_designer_ui/
RUN cd /django_static/templates/dialog_designer_ui/ && python3 resolveDjangoUrls.py


# add chat app to static files
COPY ./adviser/apps/diagraph/data/static /django_static/data/static

# setup database, superuser and tutorialgraph
CMD ["sh", "/django_code/adviser/apps/diagraph/dialog_designer_server/entrypoint.sh"]