FROM ubuntu:jammy
ENV PYTHONUNBUFFERED=1

RUN apt update && DEBIAN_FRONTEND=noninteractive  apt install -y build-essential python3 python3-pip libpq-dev postgresql postgresql-contrib 
ENV PYTHONUNBUFFERED=1
WORKDIR /
COPY ./adviser/requirements_adviser.txt /django_code/requirements_adviser.txt
RUN echo $(ls -a)
WORKDIR /django_code
RUN echo $(ls -a)/
RUN pip install -U torch>=1.10 torchvision --extra-index-url https://download.pytorch.org/whl/cpu
RUN pip install -v -U -r ./requirements_adviser.txt

COPY ./adviser /django_code
RUN echo $(ls -a)

