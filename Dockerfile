FROM ubuntu:jammy as base

##
## Install dependencies
##
RUN apt update && DEBIAN_FRONTEND=noninteractive  apt install -y build-essential python3 python3-pip libpq-dev postgresql postgresql-contrib 

# install django dependencies
WORKDIR /django_code/adviser/
ENV PYTHONUNBUFFERED=1
ADD ./adviser/requirements_server.txt /django_code/adviser/requirements_server.txt
RUN pip3 install -U -r requirements_server.txt

# setup database, superuser and tutorialgraph
CMD ["sh", "/django_code/adviser/apps/diagraph/dialog_designer_server/entrypoint.sh"]

